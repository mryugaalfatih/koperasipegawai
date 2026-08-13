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
    redirect("/kas?error=Cabang%20belum%20tersedia.");
  }

  return { supabase, profileId: profile.id as string, branchId };
}

export async function postCashTransaction(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const direction = clean(formData.get("direction"));
  const fundSource = clean(formData.get("fund_source")) ?? "kas";
  const amount = money(formData.get("amount"));
  const counterAccountId = clean(formData.get("counter_account_id"));
  const transactionDate = clean(formData.get("transaction_date")) ?? new Date().toISOString().slice(0, 10);
  const description = clean(formData.get("description")) ?? "Transaksi kas manual";

  if (!["in", "out"].includes(direction ?? "") || amount <= 0 || !counterAccountId) {
    redirect("/kas?error=Jenis%20kas,%20akun%20lawan,%20dan%20nominal%20wajib%20valid.");
  }

  const cashCode = fundSource === "bank" ? "1002" : "1001";
  const cashLabel = fundSource === "bank" ? "Bank" : "Kas";

  const { data: cashAccount } = await supabase.from("accounts").select("id").eq("code", cashCode).single();

  if (!cashAccount) {
    redirect(`/kas?error=Akun%20${cashLabel}%20${cashCode}%20belum%20ada.%20Jalankan%20seed%20COA.`);
  }

  const unitName = clean(formData.get("unit_name")) ?? "Unit Simpan Pinjam (USP)";
  const requiresApproval = direction === "out" && amount > 1000000;
  const finalDescription = requiresApproval
    ? `⏳ [APPROVAL TAHAP 1: MANAGER] [${unitName}] ${fundSource === "bank" ? "[Bank] " : "[Kas] "}${description}`
    : `[${unitName}] ${fundSource === "bank" ? "[Bank] " : "[Kas] "}${description}`;

  const { data: cashTransaction, error: cashError } = await supabase
    .from("cash_transactions")
    .insert({
      branch_id: branchId,
      direction,
      amount,
      source_type: fundSource === "bank" ? "kas_bank" : "kas_tunai",
      description: finalDescription,
      transaction_date: transactionDate,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (cashError || !cashTransaction) {
    redirect(`/kas?error=${encodeURIComponent(cashError?.message ?? "Transaksi kas gagal disimpan.")}`);
  }

  const { data: journal, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      branch_id: branchId,
      entry_no: makeEntryNo(direction === "in" ? "KM" : "KK"),
      entry_date: transactionDate,
      memo: finalDescription,
      source_type: "cash_transactions",
      source_id: cashTransaction.id,
      created_by: profileId,
      status: requiresApproval ? "pending_manager" : "approved",
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    redirect(`/kas?error=${encodeURIComponent(journalError?.message ?? "Jurnal otomatis kas gagal disimpan.")}`);
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
    redirect(`/kas?error=${encodeURIComponent(linesError.message)}`);
  }

  await writeAuditLog(supabase, profileId, "cash.transaction.posted", "cash_transactions", cashTransaction.id, {
    direction,
    amount,
    counter_account_id: counterAccountId,
    requires_approval: requiresApproval,
  });

  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/akuntansi");
  revalidatePath("/home");

  if (requiresApproval) {
    redirect("/kas?saved=approval_required");
  }

  redirect("/kas?saved=kas");
}

export async function approveManagerStage(journalId: string) {
  const { supabase, profileId } = await requireProfile();

  await supabase
    .from("journal_entries")
    .update({ status: "pending_accountant" })
    .eq("id", journalId);

  await writeAuditLog(supabase, profileId, "cash.manager_approved", "journal_entries", journalId, {});

  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/akuntansi");
  redirect("/kas?saved=manager_approved");
}

export async function approveAccountantStage(journalId: string) {
  const { supabase, profileId } = await requireProfile();

  await supabase
    .from("journal_entries")
    .update({ status: "approved" })
    .eq("id", journalId);

  await writeAuditLog(supabase, profileId, "cash.accountant_approved", "journal_entries", journalId, {});

  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/akuntansi");
  redirect("/akuntansi?saved=approved");
}

export async function transferCashBank(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const transferType = clean(formData.get("transfer_type")) ?? "kas_to_bank";
  const amount = money(formData.get("amount"));
  const transactionDate = clean(formData.get("transaction_date")) ?? new Date().toISOString().slice(0, 10);
  const note = clean(formData.get("note")) ?? "";

  if (amount <= 0 || !["kas_to_bank", "bank_to_kas"].includes(transferType)) {
    redirect("/kas?error=Jenis%20transfer%20dan%20nominal%20wajib%20valid.");
  }

  const [{ data: kasAccount }, { data: bankAccount }] = await Promise.all([
    supabase.from("accounts").select("id").eq("code", "1001").single(),
    supabase.from("accounts").select("id").eq("code", "1002").single(),
  ]);

  if (!kasAccount || !bankAccount) {
    redirect("/kas?error=Akun%20Kas%20Tunai%20(1001)%20atau%20Bank%20(1002)%20belum%20tersedia.");
  }

  const sourceAccount = transferType === "kas_to_bank" ? kasAccount : bankAccount;
  const targetAccount = transferType === "kas_to_bank" ? bankAccount : kasAccount;
  const sourceLabel = transferType === "kas_to_bank" ? "Kas Tunai" : "Bank";
  const targetLabel = transferType === "kas_to_bank" ? "Bank" : "Kas Tunai";

  // Check source account balance
  const { data: balanceData } = await supabase
    .from("journal_lines")
    .select("debit, credit")
    .eq("account_id", sourceAccount.id);

  const currentBalance = (balanceData ?? []).reduce(
    (sum, line) => sum + Number(line.debit ?? 0) - Number(line.credit ?? 0),
    0
  );

  if (currentBalance < amount) {
    const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    redirect(
      `/kas?error=${encodeURIComponent(`Saldo ${sourceLabel} tidak mencukupi. Saldo saat ini: ${fmt.format(currentBalance)}, dibutuhkan: ${fmt.format(amount)}.`)}`
    );
  }

  const descriptionText = transferType === "kas_to_bank"
    ? `Setor Tunai (Kas -> Bank)${note ? `: ${note}` : ""}`
    : `Tarik Tunai (Bank -> Kas)${note ? `: ${note}` : ""}`;

  // Record Cash Transactions
  const { data: sourceCT } = await supabase
    .from("cash_transactions")
    .insert({
      branch_id: branchId,
      direction: "out",
      amount,
      source_type: transferType === "kas_to_bank" ? "kas_tunai" : "kas_bank",
      description: descriptionText,
      transaction_date: transactionDate,
      created_by: profileId,
    })
    .select("id")
    .single();

  await supabase.from("cash_transactions").insert({
    branch_id: branchId,
    direction: "in",
    amount,
    source_type: transferType === "kas_to_bank" ? "kas_bank" : "kas_tunai",
    description: descriptionText,
    transaction_date: transactionDate,
    created_by: profileId,
  });

  // Record Journal Entry
  const { data: journal } = await supabase
    .from("journal_entries")
    .insert({
      branch_id: branchId,
      entry_no: makeEntryNo("MUTASI"),
      entry_date: transactionDate,
      memo: `Mutasi Kas (${sourceLabel} -> ${targetLabel}): ${amount.toLocaleString("id-ID")}${note ? ` - ${note}` : ""}`,
      source_type: "cash_transactions",
      source_id: sourceCT?.id,
      created_by: profileId,
      status: "draft",
    })
    .select("id")
    .single();

  if (journal) {
    await supabase.from("journal_lines").insert([
      { journal_entry_id: journal.id, account_id: targetAccount.id, debit: amount, credit: 0 },
      { journal_entry_id: journal.id, account_id: sourceAccount.id, debit: 0, credit: amount },
    ]);
  }

  await writeAuditLog(supabase, profileId, "cash.transfer.posted", "cash_transactions", sourceCT?.id ?? "", {
    transfer_type: transferType,
    amount,
  });

  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/home");
  redirect("/kas?saved=transfer");
}

export async function postCashClosing(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();

  const closingDate = clean(formData.get("closing_date")) ?? new Date().toISOString().slice(0, 10);
  const systemBalance = money(formData.get("system_balance"));
  const physicalBalance = money(formData.get("physical_balance"));
  const notes = clean(formData.get("notes")) ?? "";
  const closingUnitCode = clean(formData.get("closing_unit_code")) ?? "ALL";
  const closingUnitName = clean(formData.get("closing_unit_name")) ?? "Semua Unit";

  const d100k = money(formData.get("d_100k"));
  const d50k = money(formData.get("d_50k"));
  const d20k = money(formData.get("d_20k"));
  const d10k = money(formData.get("d_10k"));
  const d5k = money(formData.get("d_5k"));
  const d2k = money(formData.get("d_2k"));
  const d1k = money(formData.get("d_1k"));
  const dCoin = money(formData.get("d_coin"));

  const variance = physicalBalance - systemBalance;
  const status = variance === 0 ? "balance" : variance > 0 ? "surplus" : "shortage";

  const closingRecordId = crypto.randomUUID();

  await writeAuditLog(supabase, profileId, "cash.closing.posted", "cash_transactions", closingRecordId, {
    branch_id: branchId,
    closing_date: closingDate,
    closing_unit_code: closingUnitCode,
    closing_unit_name: closingUnitName,
    system_balance: systemBalance,
    physical_balance: physicalBalance,
    variance,
    status,
    notes,
    denominations: {
      d100k,
      d50k,
      d20k,
      d10k,
      d5k,
      d2k,
      d1k,
      dCoin,
    },
  });

  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  revalidatePath("/home");
  redirect("/kas?saved=closing");
}
