"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function money(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function makeEntryNo(prefix = "JU") {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${String(now.getTime()).slice(-6)}`;
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

async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, branch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  let branchId = profile.branch_id as string | null;

  if (!branchId) {
    const { data: branch } = await supabase.from("branches").select("id").order("created_at").limit(1).single();
    branchId = (branch?.id as string | undefined) ?? null;
  }

  if (!branchId) {
    redirect("/kas-jurnal?error=Cabang%20belum%20tersedia.%20Buat%20cabang%20di%20konfigurasi.");
  }

  return { supabase, profileId: profile.id as string, branchId };
}

export async function postCashTransaction(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const direction = clean(formData.get("direction"));
  const amount = money(formData.get("amount"));
  const counterAccountId = clean(formData.get("counter_account_id"));
  const transactionDate = clean(formData.get("transaction_date")) ?? new Date().toISOString().slice(0, 10);
  const description = clean(formData.get("description")) ?? "Transaksi kas manual";

  if (!["in", "out"].includes(direction ?? "") || amount <= 0 || !counterAccountId) {
    redirect("/kas-jurnal?error=Jenis%20kas,%20akun%20lawan,%20dan%20nominal%20wajib%20valid.");
  }

  const { data: cashAccount } = await supabase.from("accounts").select("id").eq("code", "1001").single();

  if (!cashAccount) {
    redirect("/kas-jurnal?error=Akun%20Kas%201001%20belum%20ada.%20Jalankan%20seed%20COA.");
  }

  const { data: cashTransaction, error: cashError } = await supabase
    .from("cash_transactions")
    .insert({
      branch_id: branchId,
      direction,
      amount,
      source_type: "manual_cash",
      description,
      transaction_date: transactionDate,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (cashError || !cashTransaction) {
    redirect(`/kas-jurnal?error=${encodeURIComponent(cashError?.message ?? "Transaksi kas gagal disimpan.")}`);
  }

  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      branch_id: branchId,
      entry_no: makeEntryNo(direction === "in" ? "KM" : "KK"),
      entry_date: transactionDate,
      memo: description,
      source_type: "cash_transactions",
      source_id: cashTransaction.id,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    redirect(`/kas-jurnal?error=${encodeURIComponent(journalError?.message ?? "Jurnal kas gagal dibuat.")}`);
  }

  const lines =
    direction === "in"
      ? [
          { journal_entry_id: journal.id, account_id: cashAccount.id, debit: amount, credit: 0 },
          { journal_entry_id: journal.id, account_id: counterAccountId, debit: 0, credit: amount },
        ]
      : [
          { journal_entry_id: journal.id, account_id: counterAccountId, debit: amount, credit: 0 },
          { journal_entry_id: journal.id, account_id: cashAccount.id, debit: 0, credit: amount },
        ];

  const { error: linesError } = await supabase.from("journal_lines").insert(lines);

  if (linesError) {
    redirect(`/kas-jurnal?error=${encodeURIComponent(linesError.message)}`);
  }

  await writeAuditLog(supabase, profileId, "cash.transaction.posted", "cash_transactions", cashTransaction.id, {
    direction,
    amount,
    journal_id: journal.id,
  });

  revalidatePath("/kas-jurnal");
  revalidatePath("/audit");
  redirect("/kas-jurnal?saved=kas");
}

export async function postManualJournal(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const debitAccountId = clean(formData.get("debit_account_id"));
  const creditAccountId = clean(formData.get("credit_account_id"));
  const amount = money(formData.get("amount"));
  const entryDate = clean(formData.get("entry_date")) ?? new Date().toISOString().slice(0, 10);
  const memo = clean(formData.get("memo")) ?? "Jurnal umum manual";

  if (!debitAccountId || !creditAccountId || debitAccountId === creditAccountId || amount <= 0) {
    redirect("/kas-jurnal?error=Akun%20debit,%20akun%20kredit,%20dan%20nominal%20wajib%20valid.");
  }

  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      branch_id: branchId,
      entry_no: makeEntryNo(),
      entry_date: entryDate,
      memo,
      source_type: "manual_journal",
      created_by: profileId,
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    redirect(`/kas-jurnal?error=${encodeURIComponent(journalError?.message ?? "Jurnal gagal disimpan.")}`);
  }

  const { error: linesError } = await supabase.from("journal_lines").insert([
    { journal_entry_id: journal.id, account_id: debitAccountId, debit: amount, credit: 0 },
    { journal_entry_id: journal.id, account_id: creditAccountId, debit: 0, credit: amount },
  ]);

  if (linesError) {
    redirect(`/kas-jurnal?error=${encodeURIComponent(linesError.message)}`);
  }

  await writeAuditLog(supabase, profileId, "journal.posted", "journal_entries", journal.id, {
    amount,
    source_type: "manual_journal",
  });

  revalidatePath("/kas-jurnal");
  revalidatePath("/audit");
  redirect("/kas-jurnal?saved=jurnal");
}
