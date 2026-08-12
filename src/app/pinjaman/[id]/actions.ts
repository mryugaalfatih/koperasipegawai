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
  const installmentId = clean(formData.get("installment_id"));

  if (!installmentId) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20wajib%20dipilih.`);
  }

  const principalPaid = numberValue(formData.get("principal_paid"));
  const interestPaid = numberValue(formData.get("interest_paid"));
  const penaltyPaid = numberValue(formData.get("penalty_paid"));
  const paymentMethod = String(formData.get("payment_method") ?? "kas");
  const totalPaid = principalPaid + interestPaid + penaltyPaid;

  if (totalPaid <= 0) {
    redirect(`/pinjaman/${loanId}?error=Nominal%20pembayaran%20harus%20lebih%20dari%200.`);
  }

  // Fetch installment with current tracking
  const { data: installment } = await supabase
    .from("loan_installments")
    .select("installment_no, paid_amount, principal_paid, interest_paid, principal_due, interest_due")
    .eq("id", installmentId)
    .eq("loan_id", loanId)
    .single();

  if (!installment) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20tidak%20ditemukan.`);
  }

  // Validate: don't overpay principal or interest
  const currentPrincipalPaid = Number(installment.principal_paid ?? 0);
  const currentInterestPaid = Number(installment.interest_paid ?? 0);
  const principalDue = Number(installment.principal_due ?? 0);
  const interestDue = Number(installment.interest_due ?? 0);

  const newPrincipalPaid = currentPrincipalPaid + principalPaid;
  const newInterestPaid = currentInterestPaid + interestPaid;

  if (newPrincipalPaid > principalDue + 1) { // +1 for rounding tolerance
    redirect(`/pinjaman/${loanId}?error=Pembayaran%20pokok%20melebihi%20tagihan%20pokok.`);
  }
  if (newInterestPaid > interestDue + 1) {
    redirect(`/pinjaman/${loanId}?error=Pembayaran%20jasa%20melebihi%20tagihan%20jasa.`);
  }

  // Insert payment record
  const { error: paymentError } = await supabase.from("loan_payments").insert({
    loan_id: loanId,
    installment_id: installmentId,
    payment_date: clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10),
    principal_paid: principalPaid,
    interest_paid: interestPaid,
    penalty_paid: penaltyPaid,
    created_by: profileId,
  });

  if (paymentError) {
    redirect(`/pinjaman/${loanId}?error=${encodeURIComponent(paymentError.message)}`);
  }

  // Update installment tracking (denormalized for fast reads)
  const nextPaidAmount = Number(installment.paid_amount ?? 0) + totalPaid;
  const isPrincipalFullyPaid = newPrincipalPaid >= principalDue - 1;
  const isInterestFullyPaid = newInterestPaid >= interestDue - 1;
  const isFullyPaid = isPrincipalFullyPaid && isInterestFullyPaid;

  const { error: installmentError } = await supabase
    .from("loan_installments")
    .update({
      paid_amount: nextPaidAmount,
      principal_paid: newPrincipalPaid,
      interest_paid: newInterestPaid,
      // Only mark paid_at when FULLY paid (both principal + interest)
      paid_at: isFullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", installmentId);

  if (installmentError) {
    redirect(`/pinjaman/${loanId}?error=${encodeURIComponent(installmentError.message)}`);
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
        const paymentLabel = principalPaid > 0 && interestPaid > 0
          ? "Pokok + Bunga"
          : principalPaid > 0
          ? "Pokok Saja"
          : "Bunga Saja";

        const entryNo = `KM-ANGS-${Date.now().toString().slice(-8)}`;
        const { data: journal } = await supabase
          .from("journal_entries")
          .insert({
            branch_id: branchId,
            entry_no: entryNo,
            entry_date: clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10),
            memo: `Angsuran (${paymentLabel}) via ${paymentMethod === "bank" ? "Transfer" : "Tunai"}: Pokok ${principalPaid.toLocaleString('id-ID')}, Bunga ${interestPaid.toLocaleString('id-ID')}`,
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

          if (principalPaid > 0) {
            lines.push({ journal_entry_id: journal.id, account_id: receivableAccount.id, debit: 0, credit: principalPaid });
          }
          if (interestPaid > 0 && interestAccount) {
            lines.push({ journal_entry_id: journal.id, account_id: interestAccount.id, debit: 0, credit: interestPaid });
          }
          if (penaltyPaid > 0 && penaltyAccount) {
            lines.push({ journal_entry_id: journal.id, account_id: penaltyAccount.id, debit: 0, credit: penaltyPaid });
          }

          await supabase.from("journal_lines").insert(lines);
        }

        // Record Cash Transaction (Kas Masuk)
        const paymentDate = clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10);
        const ctDescription = paymentMethod === "bank"
          ? `Angsuran #${installment.installment_no} via Transfer Bank (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`
          : `Angsuran #${installment.installment_no} via Kas Tunai (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`;

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
