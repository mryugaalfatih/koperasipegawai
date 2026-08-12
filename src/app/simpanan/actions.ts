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
  const paymentMethod = clean(formData.get("payment_method")) ?? "kas";

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
    const { data: tx } = await supabase
      .from("savings_transactions")
      .insert({
        account_id: account.id,
        direction: "in",
        amount: openingBalance,
        description: "Saldo awal",
        transaction_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    // Automatic Journal & Cash Transaction for Opening Balance
    try {
      const { data: memberData } = await supabase
        .from("members")
        .select("branch_id")
        .eq("id", memberId)
        .single();

      const branchId = memberData?.branch_id;
      if (branchId) {
        const cashCode = paymentMethod === "bank" ? "1002" : "1001";
        const [{ data: cashAccount }, { data: savingsAccount }] = await Promise.all([
          supabase.from("accounts").select("id").eq("code", cashCode).single(),
          supabase.from("accounts").select("id").eq("code", "2101").single(),
        ]);

        if (cashAccount && savingsAccount) {
          const entryNo = `KM-SIMP-${Date.now().toString().slice(-8)}`;
          const memo = `${paymentMethod === "bank" ? "[Bank] " : "[Kas] "}Saldo Awal Rekening ${accountNo}`;

          const { data: journal } = await supabase
            .from("journal_entries")
            .insert({
              branch_id: branchId,
              entry_no: entryNo,
              entry_date: new Date().toISOString().slice(0, 10),
              memo,
              source_type: "savings_transactions",
              source_id: tx?.id,
              created_by: profileId,
              status: "draft",
            })
            .select("id")
            .single();

          if (journal) {
            await supabase.from("journal_lines").insert([
              { journal_entry_id: journal.id, account_id: cashAccount.id, debit: openingBalance, credit: 0 },
              { journal_entry_id: journal.id, account_id: savingsAccount.id, debit: 0, credit: openingBalance },
            ]);
          }

          // Record Cash Transaction
          await supabase.from("cash_transactions").insert({
            branch_id: branchId,
            direction: "in",
            amount: openingBalance,
            source_type: paymentMethod === "bank" ? "kas_bank" : "kas_tunai",
            source_id: tx?.id,
            description: memo,
            transaction_date: new Date().toISOString().slice(0, 10),
            created_by: profileId,
          });
        }
      }
    } catch (err) {
      console.error("Auto journal error on opening balance:", err);
    }
  }

  if (account) {
    await writeAuditLog(supabase, profileId, "savings.account.created", "savings_accounts", account.id, {
      opening_balance: openingBalance,
      product_id: productId,
    });
  }

  revalidatePath("/simpanan");
  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/audit");
  redirect("/simpanan?saved=rekening");
}

export async function postSavingsTransaction(formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const accountId = clean(formData.get("account_id"));
  const direction = clean(formData.get("direction"));
  const paymentMethod = clean(formData.get("payment_method")) ?? "kas";
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
    redirect(`/simpanan?error=${encodeURIComponent(transactionError?.message ?? "Gagal simpan transaksi.")}`);
  }

  const { error: balanceError } = await supabase
    .from("savings_accounts")
    .update({ balance: nextBalance })
    .eq("id", accountId);

  if (balanceError) {
    redirect(`/simpanan?error=${encodeURIComponent(balanceError.message)}`);
  }

  // Automatic Journal & Cash Transaction Creation
  try {
    const { data: memberData } = await supabase
      .from("savings_accounts")
      .select("members(branch_id)")
      .eq("id", accountId)
      .single();

    const branchId = (memberData?.members as unknown as { branch_id: string } | null)?.branch_id;

    if (branchId) {
      const cashCode = paymentMethod === "bank" ? "1002" : "1001";
      const [{ data: cashAccount }, { data: savingsAccount }] = await Promise.all([
        supabase.from("accounts").select("id").eq("code", cashCode).single(),
        supabase.from("accounts").select("id").eq("code", "2101").single(),
      ]);

      if (cashAccount && savingsAccount) {
        const txDate = clean(formData.get("transaction_date")) ?? new Date().toISOString().slice(0, 10);
        const userDesc = clean(formData.get("description")) ?? `Transaksi Simpanan ${direction === "in" ? "Masuk" : "Keluar"}`;
        const memo = `${paymentMethod === "bank" ? "[Bank] " : "[Kas] "}${userDesc}`;
        const entryNo = `${direction === "in" ? "KM" : "KK"}-SIMP-${Date.now().toString().slice(-8)}`;

        const { data: journal } = await supabase
          .from("journal_entries")
          .insert({
            branch_id: branchId,
            entry_no: entryNo,
            entry_date: txDate,
            memo,
            source_type: "savings_transactions",
            source_id: transaction.id,
            created_by: profileId,
            status: "draft",
          })
          .select("id")
          .single();

        if (journal) {
          const lines =
            direction === "in"
              ? [
                  { journal_entry_id: journal.id, account_id: cashAccount.id, debit: amount, credit: 0 },
                  { journal_entry_id: journal.id, account_id: savingsAccount.id, debit: 0, credit: amount },
                ]
              : [
                  { journal_entry_id: journal.id, account_id: savingsAccount.id, debit: amount, credit: 0 },
                  { journal_entry_id: journal.id, account_id: cashAccount.id, debit: 0, credit: amount },
                ];
          await supabase.from("journal_lines").insert(lines);
        }

        // Record Cash Transaction (Buku Kas Harian)
        await supabase.from("cash_transactions").insert({
          branch_id: branchId,
          direction,
          amount,
          source_type: paymentMethod === "bank" ? "kas_bank" : "kas_tunai",
          source_id: transaction.id,
          description: memo,
          transaction_date: txDate,
          created_by: profileId,
        });
      }
    }
  } catch (err) {
    console.error("Auto journal error:", err);
  }

  await writeAuditLog(supabase, profileId, "savings.transaction.posted", "savings_transactions", transaction.id, {
    account_id: accountId,
    direction,
    amount,
    next_balance: nextBalance,
  });

  revalidatePath("/simpanan");
  revalidatePath("/simpanan/transaksi");
  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  revalidatePath("/audit");
  redirect("/simpanan/transaksi?saved=transaksi");
}

export async function updateSavingsAccountStatus(accountId: string, formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const status = clean(formData.get("status")) ?? "active";

  if (!accountId) {
    redirect("/simpanan/rekening?error=ID%20Rekening%20wajib%20diisi.");
  }

  const { error } = await supabase
    .from("savings_accounts")
    .update({ is_active: status === "active" })
    .eq("id", accountId);

  if (error) {
    redirect(`/simpanan/rekening?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "savings.account.updated_status", "savings_accounts", accountId, {
    status,
  });

  revalidatePath("/simpanan/rekening");
  redirect("/simpanan/rekening?saved=account_updated");
}

export async function voidSavingsTransaction(transactionId: string, formData: FormData) {
  const { supabase, profileId } = await requireUser();
  const voidReason = clean(formData.get("void_reason")) ?? "Koreksi kesalahan teller";

  if (!transactionId) {
    redirect("/simpanan/transaksi?error=ID%20Transaksi%20wajib%20diisi.");
  }

  // Fetch original transaction
  const { data: origTx } = await supabase
    .from("savings_transactions")
    .select("account_id, direction, amount, description")
    .eq("id", transactionId)
    .single();

  if (!origTx) {
    redirect("/simpanan/transaksi?error=Transaksi%20asal%20tidak%20ditemukan.");
  }

  const accountId = origTx.account_id;
  const origAmount = Number(origTx.amount ?? 0);
  const reverseDirection = origTx.direction === "in" ? "out" : "in";

  // Check current balance
  const { data: account } = await supabase
    .from("savings_accounts")
    .select("balance")
    .eq("id", accountId)
    .single();

  if (!account) {
    redirect("/simpanan/transaksi?error=Rekening%20tidak%20ditemukan.");
  }

  const currentBalance = Number(account.balance ?? 0);
  const nextBalance = reverseDirection === "in" ? currentBalance + origAmount : currentBalance - origAmount;

  if (nextBalance < 0) {
    redirect("/simpanan/transaksi?error=Saldo%20tidak%20mencukupi%20untuk%20pembatalan%20transaksi.");
  }

  // Post reversal transaction
  const { data: voidTx, error: voidErr } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: accountId,
      direction: reverseDirection,
      amount: origAmount,
      description: `KOREKSI / VOID: ${voidReason} (Ref ID: ${transactionId.slice(0, 8)})`,
      transaction_date: new Date().toISOString().slice(0, 10),
      created_by: profileId,
    })
    .select("id")
    .single();

  if (voidErr || !voidTx) {
    redirect(`/simpanan/transaksi?error=${encodeURIComponent(voidErr?.message ?? "Gagal membatalkan transaksi.")}`);
  }

  // Update account balance
  await supabase
    .from("savings_accounts")
    .update({ balance: nextBalance })
    .eq("id", accountId);

  // Write audit log
  await writeAuditLog(supabase, profileId, "savings.transaction.voided", "savings_transactions", transactionId, {
    voided_by: profileId,
    void_reason: voidReason,
    reversal_tx_id: voidTx.id,
  });

  revalidatePath("/simpanan/transaksi");
  revalidatePath("/simpanan/rekening");
  revalidatePath("/audit");
  redirect("/simpanan/transaksi?saved=transaction_voided");
}


