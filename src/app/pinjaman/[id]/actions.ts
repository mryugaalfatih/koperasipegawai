"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return { supabase, profileId: profile.id as string };
}

export async function postInstallmentPayment(loanId: string, formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const rawInstallmentId = clean(formData.get("installment_id"));

  if (!rawInstallmentId) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20wajib%20dipilih.`);
  }

  const installmentIds = rawInstallmentId.split(",").map((s) => s.trim()).filter(Boolean);
  if (!installmentIds.length) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20wajib%20dipilih.`);
  }

  const principalPaidTotal = numberValue(formData.get("principal_paid"));
  const interestPaidTotal = numberValue(formData.get("interest_paid"));
  const penaltyPaidTotal = numberValue(formData.get("penalty_paid"));
  const paymentMethod = String(formData.get("payment_method") ?? "kas");
  const totalPaid = principalPaidTotal + interestPaidTotal + penaltyPaidTotal;

  if (totalPaid <= 0) {
    redirect(`/pinjaman/${loanId}?error=Nominal%20pembayaran%20harus%20lebih%20dari%200.`);
  }

  // Fetch installments ordered by installment_no ASC
  const { data: installments } = await supabase
    .from("loan_installments")
    .select("id, installment_no, paid_amount, principal_paid, interest_paid, principal_due, interest_due")
    .in("id", installmentIds)
    .eq("loan_id", loanId)
    .order("installment_no", { ascending: true });

  if (!installments || installments.length === 0) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20tidak%20ditemukan.`);
  }

  // Calculate total due across selected installments
  const totalPrincipalDue = installments.reduce(
    (sum, inst) => sum + Math.max(Number(inst.principal_due ?? 0) - Number(inst.principal_paid ?? 0), 0),
    0
  );
  const totalInterestDue = installments.reduce(
    (sum, inst) => sum + Math.max(Number(inst.interest_due ?? 0) - Number(inst.interest_paid ?? 0), 0),
    0
  );

  if (principalPaidTotal > totalPrincipalDue + 1) {
    redirect(`/pinjaman/${loanId}?error=Pembayaran%20pokok%20melebihi%20total%20tagihan%20pokok%20angsuran%20yang%20dipilih.`);
  }
  if (interestPaidTotal > totalInterestDue + 1) {
    redirect(`/pinjaman/${loanId}?error=Pembayaran%20jasa%20melebihi%20total%20tagihan%20jasa%20angsuran%20yang%20dipilih.`);
  }

  const paymentDate = clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10);
  let remPrincipal = principalPaidTotal;
  let remInterest = interestPaidTotal;
  let remPenalty = penaltyPaidTotal;

  const installmentNoList: number[] = [];

  for (const inst of installments) {
    installmentNoList.push(inst.installment_no);
    const sisaP = Math.max(Number(inst.principal_due ?? 0) - Number(inst.principal_paid ?? 0), 0);
    const sisaI = Math.max(Number(inst.interest_due ?? 0) - Number(inst.interest_paid ?? 0), 0);

    const pAlloc = Math.min(remPrincipal, sisaP);
    const iAlloc = Math.min(remInterest, sisaI);
    const penAlloc = remPenalty; // Put penalty on first/current installment
    remPenalty = 0;

    remPrincipal -= pAlloc;
    remInterest -= iAlloc;

    if (pAlloc > 0 || iAlloc > 0 || penAlloc > 0) {
      // Insert payment record for this installment
      const { error: paymentError } = await supabase.from("loan_payments").insert({
        loan_id: loanId,
        installment_id: inst.id,
        payment_date: paymentDate,
        principal_paid: pAlloc,
        interest_paid: iAlloc,
        penalty_paid: penAlloc,
        created_by: profileId,
      });

      if (paymentError) {
        redirect(`/pinjaman/${loanId}?error=${encodeURIComponent(paymentError.message)}`);
      }

      // Update installment tracking
      const newPrincipalPaid = Number(inst.principal_paid ?? 0) + pAlloc;
      const newInterestPaid = Number(inst.interest_paid ?? 0) + iAlloc;

      const pDue = Number(inst.principal_due ?? 0);
      const iDue = Number(inst.interest_due ?? 0);

      const isPrincipalFullyPaid = newPrincipalPaid >= pDue - 5;
      const isInterestFullyPaid = newInterestPaid >= iDue - 5;
      const isFullyPaid = isPrincipalFullyPaid && isInterestFullyPaid;

      // Snap to exact due amount if fully paid to eliminate rounding leftovers (e.g., 1 rupiah)
      const finalPrincipalPaid = isPrincipalFullyPaid ? pDue : newPrincipalPaid;
      const finalInterestPaid = isInterestFullyPaid ? iDue : newInterestPaid;
      const nextPaidAmount = Math.max(
        Number(inst.paid_amount ?? 0) + pAlloc + iAlloc + penAlloc,
        finalPrincipalPaid + finalInterestPaid
      );

      await supabase
        .from("loan_installments")
        .update({
          paid_amount: nextPaidAmount,
          principal_paid: finalPrincipalPaid,
          interest_paid: finalInterestPaid,
          paid_at: isFullyPaid ? new Date().toISOString() : null,
        })
        .eq("id", inst.id);
    }
  }

  // Automatic Journal Creation for Installment Payment
  try {
    const { data: memberData } = await supabase
      .from("loans")
      .select("members(branch_id)")
      .eq("id", loanId)
      .single();

    const branchId = (memberData?.members as unknown as { branch_id: string } | null)?.branch_id;

    if (branchId) {
      const cashCode = paymentMethod === "bank" ? "1002" : "1001";
      const [{ data: fundAccount }, { data: receivableAccount }, { data: interestAccount }, { data: penaltyAccount }] = await Promise.all([
        supabase.from("accounts").select("id").eq("code", cashCode).single(),
        supabase.from("accounts").select("id").eq("code", "1101").single(),
        supabase.from("accounts").select("id").eq("code", "4101").single(),
        supabase.from("accounts").select("id").eq("code", "4103").single(),
      ]);

      if (fundAccount && receivableAccount) {
        const paymentLabel = principalPaidTotal > 0 && interestPaidTotal > 0
          ? "Pokok + Bunga"
          : principalPaidTotal > 0
          ? "Pokok Saja"
          : "Bunga Saja";

        const instDesc = installmentNoList.length > 1
          ? `#${installmentNoList[0]} s/d #${installmentNoList[installmentNoList.length - 1]} (${installmentNoList.length} Bulan)`
          : `#${installmentNoList[0]}`;

        const entryNo = `KM-ANGS-${Date.now().toString().slice(-8)}`;
        const { data: journal } = await supabase
          .from("journal_entries")
          .insert({
            branch_id: branchId,
            entry_no: entryNo,
            entry_date: paymentDate,
            memo: `Angsuran ${instDesc} (${paymentLabel}) via ${paymentMethod === "bank" ? "Transfer" : "Tunai"}: Pokok ${principalPaidTotal.toLocaleString('id-ID')}, Bunga ${interestPaidTotal.toLocaleString('id-ID')}`,
            source_type: "loan_payments",
            source_id: loanId,
            created_by: profileId,
            status: "draft",
          })
          .select("id")
          .single();

        if (journal) {
          const lines = [
            { journal_entry_id: journal.id, account_id: fundAccount.id, debit: totalPaid, credit: 0 },
          ];

          if (principalPaidTotal > 0) {
            lines.push({ journal_entry_id: journal.id, account_id: receivableAccount.id, debit: 0, credit: principalPaidTotal });
          }
          if (interestPaidTotal > 0 && interestAccount) {
            lines.push({ journal_entry_id: journal.id, account_id: interestAccount.id, debit: 0, credit: interestPaidTotal });
          }
          if (penaltyPaidTotal > 0 && penaltyAccount) {
            lines.push({ journal_entry_id: journal.id, account_id: penaltyAccount.id, debit: 0, credit: penaltyPaidTotal });
          }

          await supabase.from("journal_lines").insert(lines);
        }

        // Record Cash Transaction (Kas Masuk)
        const ctDescription = paymentMethod === "bank"
          ? `Angsuran ${instDesc} via Transfer Bank (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`
          : `Angsuran ${instDesc} via Kas Tunai (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`;

        await supabase.from("cash_transactions").insert({
          branch_id: branchId,
          direction: "in",
          amount: totalPaid,
          source_type: paymentMethod === "bank" ? "kas_bank" : "kas_tunai",
          source_id: loanId,
          description: ctDescription,
          transaction_date: paymentDate,
          created_by: profileId,
        });
      }
    }
  } catch (err) {
    console.error("Auto journal error on installment payment:", err);
  }

  revalidatePath("/pinjaman");
  revalidatePath(`/pinjaman/${loanId}`);
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect(`/pinjaman/${loanId}?paid=1`);
}
