"aria-server-only";
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function createAparRefillOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const clientName = clean(formData.get("client_name"));
  const clientPhone = clean(formData.get("client_phone"));
  const clientAddress = clean(formData.get("client_address"));
  const notes = clean(formData.get("notes"));
  const itemsJson = clean(formData.get("items_json"));

  if (!clientName || !itemsJson) {
    redirect("/apar/refill?error=Nama%20Klien%20Gedung/PT%20dan%20Item%20Refill%20wajib%20diisi.");
  }

  type RefillItemInput = {
    serial_no: string;
    media_type: string;
    capacity_kg: number;
    location_tag: string;
    price: number;
  };

  let items: RefillItemInput[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch (err) {
    redirect("/apar/refill?error=Format%20detail%20tabung%20APAR%20tidak%20valid.");
  }

  if (!items.length) {
    redirect("/apar/refill?error=Pilih%20minimal%201%20tabung%20APAR%20untuk%20di-refill.");
  }

  const totalCylinders = items.length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.price), 0);
  const orderNo = `RFL-APAR-${Date.now().toString().slice(-8)}`;
  const today = new Date().toISOString().slice(0, 10);

  const { data: orderData, error: orderError } = await supabase
    .from("apar_refill_orders")
    .insert({
      branch_id: profile.branch_id,
      order_no: orderNo,
      order_date: today,
      client_name: clientName,
      client_phone: clientPhone,
      client_address: clientAddress,
      total_cylinders: totalCylinders,
      total_amount: totalAmount,
      payment_status: "unpaid",
      status: "process",
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orderError) {
    redirect(`/apar/refill?error=${encodeURIComponent(orderError.message)}`);
  }

  const orderId = orderData.id;
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 2); // 2 Tahun Masa Berlaku Refill Damkar

  const itemInserts = items.map((item) => ({
    order_id: orderId,
    serial_no: item.serial_no || `APAR-${Math.floor(100000 + Math.random() * 900000)}`,
    media_type: item.media_type || "Powder",
    capacity_kg: item.capacity_kg || 3.0,
    location_tag: item.location_tag || "Gedung Utama",
    expired_date: expDate.toISOString().slice(0, 10),
    price: item.price,
  }));

  await supabase.from("apar_refill_items").insert(itemInserts);

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "apar.refill.created",
    details: `Penerimaan Refill ${totalCylinders} Tabung APAR (${orderNo}) Klien ${clientName} Total Rp ${totalAmount.toLocaleString("id-ID")}`,
    metadata: {
      order_no: orderNo,
      client_name: clientName,
      total_cylinders: totalCylinders,
      total_amount: totalAmount,
      unit_code: "APAR",
      unit_name: "Unit Jasa APAR & Damkar",
    },
  });

  revalidatePath("/apar/refill");
  redirect("/apar/refill?saved=order_created");
}

export async function processAparRefillComplete(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();

  const { data: order } = await supabase
    .from("apar_refill_orders")
    .select("id, order_no, client_name, total_amount, payment_status")
    .eq("id", orderId)
    .single();

  if (!order) {
    redirect("/apar/refill?error=Order%20Refill%20APAR%20tidak%20ditemukan.");
  }

  await supabase
    .from("apar_refill_orders")
    .update({ status: "completed", payment_status: "paid" })
    .eq("id", orderId);

  const today = new Date().toISOString().slice(0, 10);
  const totalAmount = Number(order.total_amount ?? 0);

  // 1. Record Cash Transaction tagged with Unit Jasa APAR Damkar
  if (totalAmount > 0) {
    await supabase.from("cash_transactions").insert({
      branch_id: profile?.branch_id,
      transaction_date: today,
      direction: "in",
      category: "Pendapatan Refill APAR",
      unit_name: "Unit Jasa APAR & Damkar",
      amount: totalAmount,
      description: `Pembayaran Refill APAR & Hydrotest (Order #${order.order_no} - Klien ${order.client_name})`,
      created_by: user.id,
    });
  }

  // 2. Post Automatic Journal Entry in Akuntansi Pusat
  const { data: cashAcc } = await supabase.from("accounts").select("id").eq("code", "1001").maybeSingle();
  const { data: revAcc } = await supabase.from("accounts").select("id").eq("code", "4102").maybeSingle();

  if (cashAcc && revAcc && totalAmount > 0) {
    const { data: journal } = await supabase
      .from("journal_entries")
      .insert({
        branch_id: profile?.branch_id,
        entry_no: `JRN-APAR-${Date.now().toString().slice(-6)}`,
        entry_date: today,
        memo: `Pendapatan Jasa Refill APAR Klien ${order.client_name} (Order #${order.order_no})`,
        source_type: "apar_refill",
        source_id: orderId,
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (journal) {
      await supabase.from("journal_lines").insert([
        { journal_entry_id: journal.id, account_id: cashAcc.id, debit: totalAmount, credit: 0 },
        { journal_entry_id: journal.id, account_id: revAcc.id, debit: 0, credit: totalAmount },
      ]);
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "apar.refill.completed",
    details: `Proses Refill APAR #${order.order_no} Klien ${order.client_name} Selesai & Sertifikat Terbit.`,
    metadata: {
      order_no: order.order_no,
      client_name: order.client_name,
      total_amount: totalAmount,
      unit_code: "APAR",
    },
  });

  revalidatePath("/apar/refill");
  revalidatePath("/apar/sertifikat");
  revalidatePath("/kas");
  revalidatePath("/akuntansi");

  redirect("/apar/refill?saved=refill_completed");
}
