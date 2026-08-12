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
      status: "draft",
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

export async function approveJournal(journalId: string) {
  const { supabase, profileId } = await requireProfile();

  const { error } = await supabase
    .from("journal_entries")
    .update({ status: "approved" })
    .eq("id", journalId);

  if (error) {
    redirect(`/akuntansi?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "journal.approved", "journal_entries", journalId, { status: "approved" });

  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect("/akuntansi?saved=approved");
}

export async function rejectJournal(journalId: string) {
  const { supabase, profileId } = await requireProfile();

  const { error } = await supabase
    .from("journal_entries")
    .update({ status: "rejected" })
    .eq("id", journalId);

  if (error) {
    redirect(`/akuntansi?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "journal.rejected", "journal_entries", journalId, { status: "rejected" });

  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect("/akuntansi?saved=rejected");
}

export async function updateJournalLines(journalId: string, formData: FormData) {
  const { supabase, profileId } = await requireProfile();
  const memo = clean(formData.get("memo"));
  const linesJson = clean(formData.get("lines"));

  if (!linesJson) {
    redirect(`/akuntansi?error=Data%20baris%20jurnal%20tidak%20valid.`);
  }

  let lines: { account_id: string; debit: number; credit: number }[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    redirect(`/akuntansi?error=Format%20baris%20jurnal%20tidak%20valid.`);
  }

  // Validate debit = credit
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 1) {
    redirect(`/akuntansi?error=Total%20debit%20dan%20kredit%20harus%20balance.`);
  }

  // Delete old lines
  const { error: deleteError } = await supabase
    .from("journal_lines")
    .delete()
    .eq("journal_entry_id", journalId);

  if (deleteError) {
    redirect(`/akuntansi?error=${encodeURIComponent(deleteError.message)}`);
  }

  // Insert new lines
  const { error: insertError } = await supabase.from("journal_lines").insert(
    lines.map((l) => ({
      journal_entry_id: journalId,
      account_id: l.account_id,
      debit: Number(l.debit ?? 0),
      credit: Number(l.credit ?? 0),
    })),
  );

  if (insertError) {
    redirect(`/akuntansi?error=${encodeURIComponent(insertError.message)}`);
  }

  // Update memo if provided
  if (memo) {
    await supabase.from("journal_entries").update({ memo }).eq("id", journalId);
  }

  await writeAuditLog(supabase, profileId, "journal.lines.updated", "journal_entries", journalId, {
    line_count: lines.length,
    total_debit: totalDebit,
  });

  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect("/akuntansi?saved=updated");
}
