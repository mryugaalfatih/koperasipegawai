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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return { supabase, profileId: profile.id as string };
}

export async function createSavingsAccount(formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const memberId = clean(formData.get("member_id"));
  const productId = clean(formData.get("product_id"));

  if (!memberId || !productId) {
    redirect("/simpanan?error=Anggota%20dan%20produk%20simpanan%20wajib%20dipilih.");
  }

  const { data: product } = await supabase
    .from("savings_products")
    .select("type, code")
    .eq("id", productId)
    .single();

  if (!product) {
    redirect("/simpanan?error=Produk%20simpanan%20tidak%20ditemukan.");
  }

  const accountNo = clean(formData.get("account_no")) ?? `${product.code}-${Date.now().toString().slice(-8)}`;
  const openingBalance = money(formData.get("opening_balance"));

  const { data: account, error } = await supabase
    .from("savings_accounts")
    .insert({
      member_id: memberId,
      product_id: productId,
      type: product.type,
      account_no: accountNo,
      balance: openingBalance,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/simpanan?error=${encodeURIComponent(error.message)}`);
  }

  if (openingBalance > 0 && account) {
    await supabase.from("savings_transactions").insert({
      account_id: account.id,
      direction: "in",
      amount: openingBalance,
      description: "Saldo awal",
      transaction_date: new Date().toISOString().slice(0, 10),
    });
  }

  if (account) {
    await writeAuditLog(supabase, profileId, "savings.account.created", "savings_accounts", account.id, {
      opening_balance: openingBalance,
      product_id: productId,
    });
  }

  revalidatePath("/simpanan");
  revalidatePath("/audit");
  redirect("/simpanan?saved=rekening");
}

export async function postSavingsTransaction(formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const accountId = clean(formData.get("account_id"));
  const direction = clean(formData.get("direction"));
  const amount = money(formData.get("amount"));

  if (!accountId || !["in", "out"].includes(direction ?? "") || amount <= 0) {
    redirect("/simpanan?error=Rekening,%20jenis%20transaksi,%20dan%20nominal%20wajib%20valid.");
  }

  const { data: account } = await supabase
    .from("savings_accounts")
    .select("balance")
    .eq("id", accountId)
    .single();

  if (!account) {
    redirect("/simpanan?error=Rekening%20simpanan%20tidak%20ditemukan.");
  }

  const currentBalance = Number(account.balance ?? 0);
  const nextBalance = direction === "in" ? currentBalance + amount : currentBalance - amount;

  if (nextBalance < 0) {
    redirect("/simpanan?error=Saldo%20tidak%20cukup%20untuk%20penarikan.");
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: accountId,
      direction,
      amount,
      description: clean(formData.get("description")),
      reference_no: clean(formData.get("reference_no")),
      transaction_date: clean(formData.get("transaction_date")) ?? new Date().toISOString().slice(0, 10),
      created_by: profileId,
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    redirect(`/simpanan?error=${encodeURIComponent(transactionError.message)}`);
  }

  const { error: balanceError } = await supabase
    .from("savings_accounts")
    .update({ balance: nextBalance })
    .eq("id", accountId);

  if (balanceError) {
    redirect(`/simpanan?error=${encodeURIComponent(balanceError.message)}`);
  }

  await writeAuditLog(supabase, profileId, "savings.transaction.posted", "savings_transactions", transaction.id, {
    account_id: accountId,
    direction,
    amount,
    next_balance: nextBalance,
  });

  revalidatePath("/simpanan");
  revalidatePath("/audit");
  redirect("/simpanan?saved=transaksi");
}
