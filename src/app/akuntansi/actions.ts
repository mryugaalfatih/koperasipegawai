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
    redirect("/akuntansi?error=Cabang%20belum%20tersedia.");
  }

  return { supabase, profileId: profile.id as string, branchId };
}

export async function postManualJournal(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const entryDate = clean(formData.get("entry_date")) ?? new Date().toISOString().slice(0, 10);
  const memo = clean(formData.get("memo")) ?? "Jurnal umum manual";
  const debitAccountId = clean(formData.get("debit_account_id"));
  const creditAccountId = clean(formData.get("credit_account_id"));
  const amount = money(formData.get("amount"));

  if (!debitAccountId || !creditAccountId || debitAccountId === creditAccountId || amount <= 0) {
    redirect("/akuntansi?error=Akun%20debit,%20kredit,%20dan%20nominal%20jurnal%20wajib%20valid.");
  }

  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      branch_id: branchId,
      entry_no: makeEntryNo("JU"),
      entry_date: entryDate,
      memo,
      source_type: "manual",
      created_by: profileId,
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    redirect(`/akuntansi?error=${encodeURIComponent(journalError?.message ?? "Jurnal manual gagal dibuat.")}`);
  }

  const { error: linesError } = await supabase.from("journal_lines").insert([
    { journal_entry_id: journal.id, account_id: debitAccountId, debit: amount, credit: 0 },
    { journal_entry_id: journal.id, account_id: creditAccountId, debit: 0, credit: amount },
  ]);

  if (linesError) {
    redirect(`/akuntansi?error=${encodeURIComponent(linesError.message)}`);
  }

  await writeAuditLog(supabase, profileId, "journal.manual.posted", "journal_entries", journal.id, {
    debit_account_id: debitAccountId,
    credit_account_id: creditAccountId,
    amount,
  });

  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect("/akuntansi?saved=jurnal");
}
