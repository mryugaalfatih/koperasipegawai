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
  const totalPaid = principalPaid + interestPaid + penaltyPaid;

  if (totalPaid <= 0) {
    redirect(`/pinjaman/${loanId}?error=Nominal%20pembayaran%20harus%20lebih%20dari%200.`);
  }

  const { data: installment } = await supabase
    .from("loan_installments")
    .select("paid_amount")
    .eq("id", installmentId)
    .eq("loan_id", loanId)
    .single();

  if (!installment) {
    redirect(`/pinjaman/${loanId}?error=Angsuran%20tidak%20ditemukan.`);
  }

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

  const nextPaidAmount = Number(installment.paid_amount ?? 0) + totalPaid;
  const { error: installmentError } = await supabase
    .from("loan_installments")
    .update({
      paid_amount: nextPaidAmount,
      paid_at: new Date().toISOString(),
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
      const [{ data: cashAccount }, { data: receivableAccount }, { data: interestAccount }, { data: penaltyAccount }] = await Promise.all([
        supabase.from("accounts").select("id").eq("code", "1001").single(),
        supabase.from("accounts").select("id").eq("code", "1101").single(),
        supabase.from("accounts").select("id").eq("code", "4101").single(),
        supabase.from("accounts").select("id").eq("code", "4103").single(),
      ]);

      if (cashAccount && receivableAccount) {
        const entryNo = `KM-ANGS-${Date.now().toString().slice(-8)}`;
        const { data: journal } = await supabase
          .from("journal_entries")
          .insert({
            branch_id: branchId,
            entry_no: entryNo,
            entry_date: clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10),
            memo: `Pembayaran Angsuran Pinjaman (Pokok: ${principalPaid.toLocaleString('id-ID')}, Bunga: ${interestPaid.toLocaleString('id-ID')})`,
            source_type: "loan_payments",
            source_id: loanId,
            created_by: profileId,
          })
          .select("id")
          .single();

        if (journal) {
          const lines = [
            { journal_entry_id: journal.id, account_id: cashAccount.id, debit: totalPaid, credit: 0 },
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

