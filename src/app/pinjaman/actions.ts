"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (text === "") return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

async function writeAuditLog(
  supabase: SupabaseClient,
  profileId: string,
  action: string,
  tableName: string,
  recordId: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    actor_id: profileId,
    action,
    table_name: tableName,
    record_id: recordId,
    metadata,
  });
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

export async function createLoan(formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const memberId = clean(formData.get("member_id"));
  const productId = clean(formData.get("product_id"));
  const principal = numberValue(formData.get("principal"));
  const tenorMonths = numberValue(formData.get("tenor_months"));

  if (!memberId || !productId || principal <= 0 || tenorMonths <= 0) {
    redirect("/pinjaman?error=Anggota,%20produk,%20plafon,%20dan%20tenor%20wajib%20valid.");
  }

  const { data: product } = await supabase
    .from("loan_products")
    .select("annual_rate, admin_fee_percent, default_interest_method, allow_method_override")
    .eq("id", productId)
    .single();

  if (!product) {
    redirect("/pinjaman?error=Produk%20pinjaman%20tidak%20ditemukan.");
  }

  const requestedMethod = clean(formData.get("interest_method"));
  const interestMethod = product.allow_method_override && requestedMethod ? requestedMethod : product.default_interest_method;
  const annualRate = numberValue(formData.get("annual_rate"), Number(product.annual_rate ?? 0));

  const { data: loan, error } = await supabase
    .from("loans")
    .insert({
      member_id: memberId,
      product_id: productId,
      principal,
      tenor_months: tenorMonths,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      interest_method: interestMethod,
      annual_rate_snapshot: annualRate,
      admin_fee_percent_snapshot: product.admin_fee_percent,
    })
    .select("id")
    .single();

  if (error || !loan) {
    redirect(`/pinjaman?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "loan.submitted", "loans", loan.id, {
    principal,
    tenor_months: tenorMonths,
    interest_method: interestMethod,
  });

  revalidatePath("/pinjaman");
  revalidatePath("/audit");
  redirect("/pinjaman?saved=pengajuan");
}

export async function updateLoan(loanId: string, formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const memberId = clean(formData.get("member_id"));
  const productId = clean(formData.get("product_id"));
  const principal = numberValue(formData.get("principal"));
  const tenorMonths = numberValue(formData.get("tenor_months"));

  if (!memberId || !productId || principal <= 0 || tenorMonths <= 0) {
    redirect(`/pinjaman?error=Anggota,%20produk,%20plafon,%20dan%20tenor%20wajib%20valid.`);
  }

  const { data: product } = await supabase
    .from("loan_products")
    .select("annual_rate, admin_fee_percent, default_interest_method, allow_method_override")
    .eq("id", productId)
    .single();

  if (!product) {
    redirect(`/pinjaman?error=Produk%20pinjaman%20tidak%20ditemukan.`);
  }

  const requestedMethod = clean(formData.get("interest_method"));
  const interestMethod = product.allow_method_override && requestedMethod ? requestedMethod : product.default_interest_method;
  const annualRate = numberValue(formData.get("annual_rate"), Number(product.annual_rate ?? 0));

  const { error } = await supabase
    .from("loans")
    .update({
      member_id: memberId,
      product_id: productId,
      principal,
      tenor_months: tenorMonths,
      interest_method: interestMethod,
      annual_rate_snapshot: annualRate,
      admin_fee_percent_snapshot: product.admin_fee_percent,
    })
    .eq("id", loanId);

  if (error) {
    redirect(`/pinjaman?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "loan.updated", "loans", loanId, {
    principal,
    tenor_months: tenorMonths,
    interest_method: interestMethod,
  });

  revalidatePath("/pinjaman");
  revalidatePath(`/pinjaman/${loanId}`);
  revalidatePath("/audit");
  redirect("/pinjaman?saved=updated");
}

export async function deleteLoan(loanId: string) {
  const { supabase, profileId } = await requireUser();

  // Safety: only allow deletion of non-disbursed loans
  const { data: loan } = await supabase
    .from("loans")
    .select("status")
    .eq("id", loanId)
    .single();

  if (!loan) {
    redirect("/pinjaman?error=Pinjaman%20tidak%20ditemukan.");
  }

  if (loan.status === "disbursed" || loan.status === "closed") {
    redirect("/pinjaman?error=Pinjaman%20yang%20sudah%20dicairkan%20tidak%20dapat%20dihapus.");
  }

  // Delete related installments first (if any draft ones exist)
  await supabase.from("loan_installments").delete().eq("loan_id", loanId);

  const { error } = await supabase.from("loans").delete().eq("id", loanId);

  if (error) {
    redirect(`/pinjaman?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "loan.deleted", "loans", loanId, {
    previous_status: loan.status,
  });

  revalidatePath("/pinjaman");
  revalidatePath("/kas");
  revalidatePath("/audit");
  redirect("/pinjaman?saved=deleted");
}

export async function approveLoan(loanId: string) {
  const { supabase, profileId } = await requireUser();

  const { error } = await supabase
    .from("loans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", loanId);

  if (error) {
    redirect(`/pinjaman?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "loan.approved", "loans", loanId, {
    status: "approved",
  });

  revalidatePath("/pinjaman");
  revalidatePath(`/pinjaman/${loanId}`);
  revalidatePath("/audit");
  redirect("/pinjaman?saved=approved");
}

export async function disburseLoan(loanId: string, formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const fundSource = String(formData.get("fund_source") ?? "kas");
  const { data: loan } = await supabase
    .from("loans")
    .select("id, principal, tenor_months, interest_method, annual_rate_snapshot")
    .eq("id", loanId)
    .single();

  if (!loan) {
    redirect("/pinjaman?error=Pinjaman%20tidak%20ditemukan.");
  }

  const principal = Number(loan.principal);

  // Validate fund source balance before disbursement
  const cashCode = fundSource === "bank" ? "1002" : "1001";
  const cashLabel = fundSource === "bank" ? "Bank" : "Kas";

  const { data: fundAccount } = await supabase
    .from("accounts")
    .select("id")
    .eq("code", cashCode)
    .single();

  if (!fundAccount) {
    redirect(`/pinjaman?error=Akun%20${cashLabel}%20(${cashCode})%20belum%20tersedia%20di%20COA.`);
  }

  // Calculate current balance: sum(debit) - sum(credit) for asset accounts
  const { data: balanceData } = await supabase
    .from("journal_lines")
    .select("debit, credit")
    .eq("account_id", fundAccount.id);

  const currentBalance = (balanceData ?? []).reduce(
    (sum, line) => sum + Number(line.debit ?? 0) - Number(line.credit ?? 0),
    0
  );

  if (currentBalance < principal) {
    const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    redirect(
      `/pinjaman?error=${encodeURIComponent(`Saldo ${cashLabel} tidak mencukupi. Saldo saat ini: ${fmt.format(currentBalance)}, dibutuhkan: ${fmt.format(principal)}.`)}`
    );
  }

  const tenor = Number(loan.tenor_months);
  const monthlyRate = Number(loan.annual_rate_snapshot ?? 0) / 100 / 12;
  const startDate = new Date();

  const installments = Array.from({ length: tenor }, (_, index) => {
    const installmentNo = index + 1;

    if (loan.interest_method === "annuity") {
      const monthlyPayment = monthlyRate === 0
        ? principal / tenor
        : principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -tenor)));
      const remainingBefore = principal - (principal / tenor) * index;
      const interestDue = remainingBefore * monthlyRate;
      const principalDue = Math.max(monthlyPayment - interestDue, 0);

      return {
        loan_id: loanId,
        installment_no: installmentNo,
        due_date: addMonths(startDate, installmentNo),
        principal_due: principalDue,
        interest_due: interestDue,
      };
    }

    return {
      loan_id: loanId,
      installment_no: installmentNo,
      due_date: addMonths(startDate, installmentNo),
      principal_due: principal / tenor,
      interest_due: principal * monthlyRate,
    };
  });

  const { error: installmentError } = await supabase.from("loan_installments").insert(installments);

  if (installmentError) {
    redirect(`/pinjaman?error=${encodeURIComponent(installmentError.message)}`);
  }

  const { error } = await supabase
    .from("loans")
    .update({
      status: "disbursed",
      disbursed_at: new Date().toISOString(),
    })
    .eq("id", loanId);

  if (error) {
    redirect(`/pinjaman?error=${encodeURIComponent(error.message)}`);
  }

  // Automatic Journal Creation for Loan Disbursement
  try {
    const { data: memberData } = await supabase
      .from("loans")
      .select("members(branch_id)")
      .eq("id", loanId)
      .single();

    const branchId = (memberData?.members as unknown as { branch_id: string } | null)?.branch_id;

    if (branchId) {
      const { data: receivableAccount } = await supabase.from("accounts").select("id").eq("code", "1101").single();

      if (fundAccount && receivableAccount) {
        const entryNo = `KK-PINJ-${Date.now().toString().slice(-8)}`;
        const { data: journal } = await supabase
          .from("journal_entries")
          .insert({
            branch_id: branchId,
            entry_no: entryNo,
            entry_date: new Date().toISOString().slice(0, 10),
            memo: `Pencairan Pinjaman via ${fundSource === "bank" ? "Transfer Bank" : "Kas Tunai"} (${principal.toLocaleString('id-ID')})`,
            source_type: "loans",
            source_id: loanId,
            created_by: profileId,
            status: "draft",
          })
          .select("id")
          .single();

        if (journal) {
          await supabase.from("journal_lines").insert([
            { journal_entry_id: journal.id, account_id: receivableAccount.id, debit: principal, credit: 0 },
            { journal_entry_id: journal.id, account_id: fundAccount.id, debit: 0, credit: principal },
          ]);
        }

        // Record Cash Transaction (Kas Keluar)
        const ctDescription = fundSource === "bank"
          ? `Pencairan Pinjaman via Transfer Bank (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`
          : `Pencairan Pinjaman via Kas Tunai (No. Kontrak: KP-${loanId.slice(0, 8).toUpperCase()})`;

        await supabase.from("cash_transactions").insert({
          branch_id: branchId,
          direction: "out",
          amount: principal,
          source_type: fundSource === "bank" ? "kas_bank" : "kas_tunai",
          source_id: loanId,
          description: ctDescription,
          transaction_date: new Date().toISOString().slice(0, 10),
          created_by: profileId,
        });
      }
    }
  } catch (err) {
    console.error("Auto journal error on disbursement:", err);
  }

  await writeAuditLog(supabase, profileId, "loan.disbursed", "loans", loanId, {
    principal,
    tenor_months: tenor,
    installment_count: installments.length,
  });

  revalidatePath("/pinjaman");
  revalidatePath(`/pinjaman/${loanId}`);
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  revalidatePath("/audit");
  redirect("/pinjaman?saved=disbursed");
}

