"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseNum(value: FormDataEntryValue | null, defaultVal = 0): number {
  if (!value) return defaultVal;
  const str = String(value).trim();
  // Handle formatted rupiah like 'Rp 15.000' or raw '15000'
  const raw = str.replace(/[^\d.-]/g, "");
  const num = Number(raw);
  return isNaN(num) ? defaultVal : num;
}

export async function createTokoProduct(formData: FormData) {
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

  const name = clean(formData.get("name"));
  if (!name) {
    redirect("/toko/produk?error=Nama%20produk%20sembako%20wajib%20diisi.");
  }

  const barcode = clean(formData.get("barcode")) ?? `BRC-${Date.now().toString().slice(-6)}`;
  const category = clean(formData.get("category")) ?? "Sembako";
  const unitName = clean(formData.get("unit_name")) ?? "Pcs";
  const buyPrice = parseNum(formData.get("buy_price"), 0);
  const sellPriceGeneral = parseNum(formData.get("sell_price_general"), 0);
  const sellPriceMember = parseNum(formData.get("sell_price_member"), sellPriceGeneral);
  const stockQty = parseNum(formData.get("stock_qty"), 0);
  const minStock = parseNum(formData.get("min_stock"), 5);

  const { error } = await supabase.from("toko_products").insert({
    branch_id: profile.branch_id,
    barcode,
    name,
    category,
    unit_name: unitName,
    buy_price: buyPrice,
    sell_price_general: sellPriceGeneral,
    sell_price_member: sellPriceMember,
    stock_qty: stockQty,
    min_stock: minStock,
    is_active: true,
  });

  if (error) {
    redirect(`/toko/produk?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/toko/produk");
  redirect("/toko/produk?saved=created");
}

export async function updateTokoProduct(productId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = clean(formData.get("name"));
  if (!productId || !name) {
    redirect("/toko/produk?error=ID%20dan%20Nama%20produk%20wajib%20diisi.");
  }

  const barcode = clean(formData.get("barcode"));
  const category = clean(formData.get("category")) ?? "Sembako";
  const unitName = clean(formData.get("unit_name")) ?? "Pcs";
  const buyPrice = parseNum(formData.get("buy_price"), 0);
  const sellPriceGeneral = parseNum(formData.get("sell_price_general"), 0);
  const sellPriceMember = parseNum(formData.get("sell_price_member"), sellPriceGeneral);
  const stockQty = parseNum(formData.get("stock_qty"), 0);
  const minStock = parseNum(formData.get("min_stock"), 5);
  const isActive = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("toko_products")
    .update({
      barcode,
      name,
      category,
      unit_name: unitName,
      buy_price: buyPrice,
      sell_price_general: sellPriceGeneral,
      sell_price_member: sellPriceMember,
      stock_qty: stockQty,
      min_stock: minStock,
      is_active: isActive,
    })
    .eq("id", productId);

  if (error) {
    redirect(`/toko/produk?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/toko/produk");
  redirect("/toko/produk?saved=updated");
}

export async function toggleTokoProductStatus(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: prod } = await supabase
    .from("toko_products")
    .select("id, name, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (!prod) {
    redirect("/toko/produk?error=Produk%20tidak%20ditemukan.");
  }

  const newStatus = !prod.is_active;

  const { error } = await supabase
    .from("toko_products")
    .update({ is_active: newStatus })
    .eq("id", productId);

  if (error) {
    redirect(`/toko/produk?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: newStatus ? "toko.product.activated" : "toko.product.deactivated",
    details: `Status produk ${prod.name} diubah menjadi ${newStatus ? "Aktif" : "Nonaktif"}.`,
    metadata: {
      product_id: productId,
      is_active: newStatus,
    },
  });

  revalidatePath("/toko/produk");
  revalidatePath("/toko/kasir");
  redirect(`/toko/produk?saved=${newStatus ? "activated" : "deactivated"}`);
}

export async function adjustTokoStock(productId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const type = clean(formData.get("type")) ?? "in";
  const qtyInput = parseNum(formData.get("qty"), 0);
  const notes = clean(formData.get("notes"));

  if (!productId || qtyInput < 0) {
    redirect("/toko/produk?error=ID%20produk%20dan%20Jumlah%20stok%20wajib%20valid.");
  }

  const { data: prod } = await supabase
    .from("toko_products")
    .select("name, stock_qty, buy_price, unit_name")
    .eq("id", productId)
    .maybeSingle();

  const currentQty = Number(prod?.stock_qty ?? 0);
  const buyPrice = Number(prod?.buy_price ?? 0);
  const unitLabel = prod?.unit_name ?? "Pcs";

  let newQty = currentQty;
  let qtyIn = 0;
  let qtyOut = 0;
  let typeLabel = "Mutasi Stok";

  if (type === "in") {
    qtyIn = qtyInput;
    newQty = currentQty + qtyInput;
    typeLabel = "Pasokan Stok Masuk (Distributor)";
  } else if (type === "retur_in") {
    qtyIn = qtyInput;
    newQty = currentQty + qtyInput;
    typeLabel = "Retur Penjualan (Pengembalian Pembeli)";
  } else if (type === "damage") {
    qtyOut = qtyInput;
    newQty = Math.max(0, currentQty - qtyInput);
    typeLabel = "Barang Rusak / Expired / Pecah";
  } else if (type === "retur_out") {
    qtyOut = qtyInput;
    newQty = Math.max(0, currentQty - qtyInput);
    typeLabel = "Retur Pembelian (Ke Supplier)";
  } else if (type === "opname") {
    newQty = qtyInput;
    if (newQty > currentQty) {
      qtyIn = newQty - currentQty;
    } else {
      qtyOut = currentQty - newQty;
    }
    typeLabel = "Penyesuaian Stock Opname Fisik";
  }

  const { error } = await supabase
    .from("toko_products")
    .update({ stock_qty: newQty })
    .eq("id", productId);

  if (error) {
    redirect(`/toko/produk?error=${encodeURIComponent(error.message)}`);
  }

  const refNo = `STK-${type.toUpperCase()}-${Date.now().toString().slice(-6)}`;

  // 1. Insert Stock Mutation Record for Kartu Stok
  await supabase.from("toko_stock_mutations").insert({
    product_id: productId,
    mutation_type: type,
    qty_in: qtyIn,
    qty_out: qtyOut,
    stock_after: newQty,
    ref_no: refNo,
    notes: notes ? `${typeLabel}: ${notes}` : typeLabel,
    created_by: user.id,
  });

  // 2. Fetch Profile & Branch for Automatic Journal Posting
  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .maybeSingle();

  let branchId = profile?.branch_id as string | null;
  if (!branchId) {
    const { data: branch } = await supabase.from("branches").select("id").order("created_at").limit(1).maybeSingle();
    branchId = (branch?.id as string | undefined) ?? null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const totalValue = Math.round(buyPrice * qtyInput);

  // A. Automatic Journal for Pasokan Masuk (Type 'in')
  if (type === "in" && totalValue > 0) {
    // Record Cash Out
    await supabase.from("cash_transactions").insert({
      branch_id: branchId,
      transaction_date: today,
      direction: "out",
      category: "Pembelian Stok Toko",
      unit_name: "Unit Toko Waserda",
      amount: totalValue,
      description: `[Unit Toko Waserda] Pembelian Stok Masuk: ${prod?.name ?? "Produk"} (${qtyInput} ${unitLabel}) ${notes ? '- ' + notes : ''}`,
      created_by: user.id,
    });

    const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();
    const { data: cashAcc } = await supabase.from("accounts").select("id").eq("code", "1001").maybeSingle();

    if (invAcc && cashAcc) {
      const { data: journal } = await supabase
        .from("journal_entries")
        .insert({
          branch_id: branchId,
          entry_no: `JRN-STK-${Date.now().toString().slice(-6)}`,
          entry_date: today,
          memo: `[Unit Toko Waserda] Pasokan Masuk: ${prod?.name ?? "Produk"} (${qtyInput} ${unitLabel}) ${notes ? '- ' + notes : ''}`,
          source_type: "toko_stock_in",
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (journal) {
        await supabase.from("journal_lines").insert([
          { journal_entry_id: journal.id, account_id: invAcc.id, debit: totalValue, credit: 0 },
          { journal_entry_id: journal.id, account_id: cashAcc.id, debit: 0, credit: totalValue },
        ]);
      }
    }
  }

  // B. Automatic Journal for Barang Rusak / Kadaluarsa (Type 'damage')
  else if (type === "damage" && totalValue > 0) {
    const { data: damageAcc } = await supabase.from("accounts").select("id").eq("code", "5201").maybeSingle();
    const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();

    if (damageAcc && invAcc) {
      const { data: journal } = await supabase
        .from("journal_entries")
        .insert({
          branch_id: branchId,
          entry_no: `JRN-DMG-${Date.now().toString().slice(-6)}`,
          entry_date: today,
          memo: `[Unit Toko Waserda] Kerugian Barang Rusak: ${prod?.name ?? "Produk"} (${qtyInput} ${unitLabel}) ${notes ? '- ' + notes : ''}`,
          source_type: "toko_damage",
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (journal) {
        await supabase.from("journal_lines").insert([
          { journal_entry_id: journal.id, account_id: damageAcc.id, debit: totalValue, credit: 0 },
          { journal_entry_id: journal.id, account_id: invAcc.id, debit: 0, credit: totalValue },
        ]);
      }
    }
  }

  // C. Automatic Journal for Retur ke Supplier (Type 'retur_out')
  else if (type === "retur_out" && totalValue > 0) {
    await supabase.from("cash_transactions").insert({
      branch_id: branchId,
      transaction_date: today,
      direction: "in",
      category: "Pengembalian Retur Supplier",
      unit_name: "Unit Toko Waserda",
      amount: totalValue,
      description: `[Unit Toko Waserda] Pengembalian Retur Supplier: ${prod?.name ?? "Produk"} (${qtyInput} ${unitLabel})`,
      created_by: user.id,
    });

    const { data: cashAcc } = await supabase.from("accounts").select("id").eq("code", "1001").maybeSingle();
    const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();

    if (cashAcc && invAcc) {
      const { data: journal } = await supabase
        .from("journal_entries")
        .insert({
          branch_id: branchId,
          entry_no: `JRN-RET-${Date.now().toString().slice(-6)}`,
          entry_date: today,
          memo: `[Unit Toko Waserda] Retur Barang ke Supplier: ${prod?.name ?? "Produk"} (${qtyInput} ${unitLabel})`,
          source_type: "toko_retur_out",
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (journal) {
        await supabase.from("journal_lines").insert([
          { journal_entry_id: journal.id, account_id: cashAcc.id, debit: totalValue, credit: 0 },
          { journal_entry_id: journal.id, account_id: invAcc.id, debit: 0, credit: totalValue },
        ]);
      }
    }
  }

  // 3. Insert Audit Log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "toko.stock.adjusted",
    details: `Adjustment stok ${prod?.name ?? "Produk"}: dari ${currentQty} menjadi ${newQty} (${notes ?? "Update stok"})`,
    metadata: {
      product_id: productId,
      old_qty: currentQty,
      new_qty: newQty,
      type,
      total_value: totalValue,
      unit_name: "Unit Toko Waserda",
    },
  });

  revalidatePath("/toko/produk");
  revalidatePath("/toko/home");
  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/kas");
  revalidatePath("/laporan");

  redirect("/toko/produk?saved=stock_adjusted");
}

export async function processPosSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const itemsJson = clean(formData.get("items_json"));
  if (!itemsJson) {
    redirect("/toko/kasir?error=Keranjang%20belanja%20kosong.");
  }

  type CartItem = {
    product_id: string;
    product_name: string;
    qty: number;
    unit_name: string;
    buy_price: number;
    sell_price: number;
    subtotal: number;
  };

  let cartItems: CartItem[] = [];
  try {
    cartItems = JSON.parse(itemsJson);
  } catch (err) {
    redirect("/toko/kasir?error=Format%20detail%20barang%20tidak%20valid.");
  }

  if (!cartItems.length) {
    redirect("/toko/kasir?error=Keranjang%20belanja%20kosong.");
  }

  const memberId = clean(formData.get("member_id"));
  const paymentMethod = clean(formData.get("payment_method")) ?? "cash";
  const discountAmount = parseNum(formData.get("discount_amount"), 0);
  const paidAmount = parseNum(formData.get("paid_amount"), 0);
  const notes = clean(formData.get("notes"));

  const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const grandTotal = Math.max(0, totalAmount - discountAmount);
  const changeAmount = paymentMethod === "cash" ? Math.max(0, paidAmount - grandTotal) : 0;

  const invoiceNo = `INV-TOKO-${Date.now().toString().slice(-8)}`;
  const today = new Date().toISOString().slice(0, 10);

  // 1. Insert Toko Sale Header
  const { data: saleData, error: saleError } = await supabase
    .from("toko_sales")
    .insert({
      branch_id: profile.branch_id,
      invoice_no: invoiceNo,
      sale_date: today,
      member_id: memberId,
      payment_method: paymentMethod,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      change_amount: changeAmount,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (saleError) {
    redirect(`/toko/kasir?error=${encodeURIComponent(saleError.message)}`);
  }

  const saleId = saleData.id;

  // 2. Insert Toko Sale Items
  const saleItemInserts = cartItems.map((item) => ({
    sale_id: saleId,
    product_id: item.product_id,
    product_name: item.product_name,
    qty: item.qty,
    unit_name: item.unit_name,
    buy_price: item.buy_price,
    sell_price: item.sell_price,
    subtotal: item.subtotal,
  }));

  await supabase.from("toko_sale_items").insert(saleItemInserts);

  // 3. Deduct product stock & Insert Stock Mutation for Kartu Stok
  for (const item of cartItems) {
    if (item.product_id) {
      const { data: prod } = await supabase
        .from("toko_products")
        .select("stock_qty")
        .eq("id", item.product_id)
        .single();

      if (prod) {
        const newStock = Math.max(0, Number(prod.stock_qty) - item.qty);
        await supabase.from("toko_products").update({ stock_qty: newStock }).eq("id", item.product_id);

        // Record stock mutation
        await supabase.from("toko_stock_mutations").insert({
          product_id: item.product_id,
          mutation_type: "out",
          qty_in: 0,
          qty_out: item.qty,
          stock_after: newStock,
          ref_no: invoiceNo,
          notes: `Penjualan POS Waserda Faktur #${invoiceNo}`,
          created_by: user.id,
        });
      }
    }
  }

  // 4. Record Cash Transaction in cash_transactions tagged with 'Unit Toko Waserda'
  const paymentMethodLabel = paymentMethod === "cash" ? "Tunai" : paymentMethod === "bank" ? "Transfer/QRIS" : "Kredit/Potong Gaji";
  await supabase.from("cash_transactions").insert({
    branch_id: profile.branch_id,
    transaction_date: today,
    direction: "in",
    category: "Penjualan Toko",
    unit_name: "Unit Toko Waserda",
    amount: grandTotal,
    description: `Penjualan Kasir POS Waserda (${paymentMethodLabel}) - No: ${invoiceNo}`,
    created_by: user.id,
  });

  // 5. Post Automatic Journal Entry in journal_entries tagged with Unit Toko Waserda
  const cashCode = paymentMethod === "bank" ? "1002" : paymentMethod === "credit" ? "1102" : "1001";
  let { data: cashAccount } = await supabase.from("accounts").select("id").eq("code", cashCode).maybeSingle();
  if (!cashAccount) {
    const { data: fallbackCash } = await supabase.from("accounts").select("id").eq("code", "1001").maybeSingle();
    cashAccount = fallbackCash;
  }

  let { data: revenueAccount } = await supabase.from("accounts").select("id").eq("code", "4201").maybeSingle();
  if (!revenueAccount) {
    const { data: fallbackRev } = await supabase.from("accounts").select("id").eq("code", "4101").maybeSingle();
    revenueAccount = fallbackRev;
  }

  if (cashAccount && revenueAccount && grandTotal > 0) {
    const entryNo = `JRN-TOKO-${Date.now().toString().slice(-8)}`;
    const { data: journal } = await supabase
      .from("journal_entries")
      .insert({
        branch_id: profile.branch_id,
        entry_no: entryNo,
        entry_date: today,
        memo: `[Unit Toko Waserda] Penjualan Kasir POS [${paymentMethodLabel}] - No: ${invoiceNo}`,
        source_type: "toko_pos",
        source_id: saleId,
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (journal) {
      await supabase.from("journal_lines").insert([
        {
          journal_entry_id: journal.id,
          account_id: cashAccount.id,
          debit: grandTotal,
          credit: 0,
        },
        {
          journal_entry_id: journal.id,
          account_id: revenueAccount.id,
          debit: 0,
          credit: grandTotal,
        },
      ]);

      // HPP Perpetual Journal (Debet 5201/5101 HPP Waserda, Kredit 1301 Persediaan Barang)
      const totalHpp = cartItems.reduce((sum, item) => sum + (Number(item.buy_price ?? 0) * Number(item.qty ?? 1)), 0);
      if (totalHpp > 0) {
        let { data: hppAcc } = await supabase.from("accounts").select("id").eq("code", "5201").maybeSingle();
        if (!hppAcc) {
          const { data: fallbackHpp } = await supabase.from("accounts").select("id").eq("code", "5101").maybeSingle();
          hppAcc = fallbackHpp;
        }
        const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();

        if (hppAcc && invAcc) {
          const { data: hppJournal } = await supabase
            .from("journal_entries")
            .insert({
              branch_id: profile.branch_id,
              entry_no: `JRN-HPP-${Date.now().toString().slice(-8)}`,
              entry_date: today,
              memo: `[Unit Toko Waserda] HPP Penjualan Toko Waserda - No: ${invoiceNo}`,
              source_type: "toko_hpp",
              source_id: saleId,
              status: "draft",
              created_by: user.id,
            })
            .select("id")
            .single();

          if (hppJournal) {
            await supabase.from("journal_lines").insert([
              { journal_entry_id: hppJournal.id, account_id: hppAcc.id, debit: totalHpp, credit: 0 },
              { journal_entry_id: hppJournal.id, account_id: invAcc.id, debit: 0, credit: totalHpp },
            ]);
          }
        }
      }
    }
  }

  // 6. Audit Log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "toko.sale.created",
    details: `Penjualan Toko POS ${invoiceNo} sebesar Rp ${grandTotal.toLocaleString("id-ID")}`,
    metadata: {
      invoice_no: invoiceNo,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      item_count: cartItems.length,
      unit_code: "TOKO",
      unit_name: "Unit Toko Waserda",
    },
  });

  revalidatePath("/toko/kasir");
  revalidatePath("/toko/penjualan");
  revalidatePath("/kas");
  revalidatePath("/akuntansi");
  revalidatePath("/laporan");

  redirect(`/toko/kasir?saved=sale_success&inv=${invoiceNo}&total=${grandTotal}`);
}

export async function createPurchaseOrder(formData: FormData) {
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

  const supplierName = clean(formData.get("supplier_name"));
  const supplierPhone = clean(formData.get("supplier_phone"));
  const paymentType = clean(formData.get("payment_type")) ?? "cash";
  const dueDate = clean(formData.get("due_date"));
  const notes = clean(formData.get("notes"));
  const itemsJson = clean(formData.get("items_json"));

  if (!supplierName || !itemsJson) {
    redirect("/toko/pembelian?error=Nama%20Supplier%20dan%20Item%20pesanan%20wajib%20diisi.");
  }

  type PoItem = {
    product_id: string;
    product_name: string;
    qty_ordered: number;
    unit_name: string;
    buy_price: number;
    subtotal: number;
  };

  let poItems: PoItem[] = [];
  try {
    poItems = JSON.parse(itemsJson);
  } catch (err) {
    redirect("/toko/pembelian?error=Format%20item%20PO%20tidak%20valid.");
  }

  if (!poItems.length) {
    redirect("/toko/pembelian?error=Pilih%20minimal%201%20barang%20untuk%20di-order.");
  }

  const totalAmount = poItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const poNo = `PO-TOKO-${Date.now().toString().slice(-8)}`;
  const today = new Date().toISOString().slice(0, 10);

  const { data: poData, error: poError } = await supabase
    .from("toko_purchase_orders")
    .insert({
      branch_id: profile.branch_id,
      po_no: poNo,
      order_date: today,
      supplier_name: supplierName,
      supplier_phone: supplierPhone,
      status: "ordered",
      total_amount: totalAmount,
      payment_type: paymentType,
      due_date: dueDate,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (poError) {
    redirect(`/toko/pembelian?error=${encodeURIComponent(poError.message)}`);
  }

  const poId = poData.id;
  const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

  const poItemInserts = poItems.map((item) => ({
    po_id: poId,
    product_id: isUuid(item.product_id) ? item.product_id : null,
    product_name: item.product_name,
    qty_ordered: item.qty_ordered,
    qty_received: 0,
    unit_name: item.unit_name,
    buy_price: item.buy_price,
    subtotal: item.subtotal,
  }));

  await supabase.from("toko_purchase_order_items").insert(poItemInserts);

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "toko.po.created",
    details: `Surat Pesanan PO ${poNo} ke Supplier ${supplierName} sebesar Rp ${totalAmount.toLocaleString("id-ID")}`,
    metadata: {
      po_no: poNo,
      supplier_name: supplierName,
      total_amount: totalAmount,
    },
  });

  revalidatePath("/toko/pembelian");
  redirect("/toko/pembelian?saved=po_created");
}

export async function receivePurchaseOrder(poId: string) {
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
    .maybeSingle();

  let branchId = profile?.branch_id as string | null;
  if (!branchId) {
    const { data: branch } = await supabase.from("branches").select("id").order("created_at").limit(1).maybeSingle();
    branchId = (branch?.id as string | undefined) ?? null;
  }

  const { data: po } = await supabase
    .from("toko_purchase_orders")
    .select("id, po_no, supplier_name, status, total_amount, payment_type, toko_purchase_order_items(product_id, product_name, qty_ordered, unit_name, buy_price)")
    .eq("id", poId)
    .maybeSingle();

  if (!po) {
    redirect("/toko/pembelian?error=Surat%20Pesanan%20PO%20tidak%20ditemukan.");
  }

  if (po.status === "received") {
    redirect("/toko/pembelian?error=Surat%20Pesanan%20PO%20ini%20sudah%20diterima%20sebelumnya.");
  }

  // 1. Update PO Status to 'received'
  await supabase
    .from("toko_purchase_orders")
    .update({ status: "received" })
    .eq("id", poId);

  const items = (po as any).toko_purchase_order_items ?? [];

  // 2. Increase stock qty for each product & Log Stock Mutation
  for (const item of items) {
    if (item.product_id) {
      const { data: prod } = await supabase
        .from("toko_products")
        .select("stock_qty")
        .eq("id", item.product_id)
        .maybeSingle();

      if (prod) {
        const currentStock = Number(prod.stock_qty ?? 0);
        const newStock = currentStock + Number(item.qty_ordered ?? 0);
        await supabase.from("toko_products").update({ stock_qty: newStock }).eq("id", item.product_id);

        // Record Stock Mutation in Kartu Stok
        await supabase.from("toko_stock_mutations").insert({
          product_id: item.product_id,
          mutation_type: "in",
          qty_in: Number(item.qty_ordered),
          qty_out: 0,
          stock_after: newStock,
          ref_no: po.po_no,
          notes: `Penerimaan Barang PO Supplier: ${po.supplier_name}`,
          created_by: user.id,
        });
      }
    }
  }

  // 3. Record Cash Transaction / Journal
  const today = new Date().toISOString().slice(0, 10);
  const totalAmount = Number(po.total_amount ?? 0);

  if (po.payment_type === "cash" && totalAmount > 0) {
    await supabase.from("cash_transactions").insert({
      branch_id: branchId,
      transaction_date: today,
      direction: "out",
      category: "Pembelian Barang Toko",
      unit_name: "Unit Toko Waserda",
      amount: totalAmount,
      description: `[Unit Toko Waserda] Pembelian Pasokan Sembako (PO #${po.po_no} - Supplier ${po.supplier_name})`,
      created_by: user.id,
    });
  }

  // Post Automatic Journal Entry
  const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();
  let { data: cashAcc } = await supabase.from("accounts").select("id").eq("code", po.payment_type === "tempo" ? "2102" : "1001").maybeSingle();
  if (!cashAcc && po.payment_type === "tempo") {
    const { data: fallbackDebt } = await supabase.from("accounts").select("id").eq("code", "2101").maybeSingle();
    cashAcc = fallbackDebt;
  }

  if (invAcc && cashAcc && totalAmount > 0) {
    const { data: journal } = await supabase
      .from("journal_entries")
      .insert({
        branch_id: branchId,
        entry_no: `JRN-PO-${Date.now().toString().slice(-6)}`,
        entry_date: today,
        memo: `[Unit Toko Waserda] Penerimaan Barang PO #${po.po_no} (${po.supplier_name})`,
        source_type: "toko_po",
        source_id: poId,
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (journal) {
      await supabase.from("journal_lines").insert([
        { journal_entry_id: journal.id, account_id: invAcc.id, debit: totalAmount, credit: 0 },
        { journal_entry_id: journal.id, account_id: cashAcc.id, debit: 0, credit: totalAmount },
      ]);
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "toko.po.received",
    details: `Penerimaan barang PO ${po.po_no} dari Supplier ${po.supplier_name} berhasil diproses. Stok bertambah.`,
    metadata: {
      po_no: po.po_no,
      supplier_name: po.supplier_name,
      total_amount: totalAmount,
      unit_name: "Unit Toko Waserda",
    },
  });

  revalidatePath("/toko/pembelian");
  revalidatePath("/toko/produk");
  revalidatePath("/toko/home");
  revalidatePath("/kas");
  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");

  redirect("/toko/pembelian?saved=po_received");
}

export async function processItemExchangeReturn(formData: FormData) {
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

  const saleId = String(formData.get("sale_id") || "").trim();
  const invoiceNo = String(formData.get("invoice_no") || "").trim();
  const productId = String(formData.get("product_id") || "").trim();
  const productName = String(formData.get("product_name") || "").trim();
  const qtyExchange = Math.max(1, Number(formData.get("qty") || 1));
  const reason = String(formData.get("reason") || "Barang Kadaluarsa / Expired").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!productName) {
    redirect("/toko/penjualan?error=Data%20barang%20retur%20tidak%20valid.");
  }

  const branchId = profile.branch_id;
  const today = new Date().toISOString().slice(0, 10);
  const retNo = `RET-TOKO-${Date.now().toString().slice(-6)}`;

  // 1. Lookup Product info to get buy_price & update physical stock
  let productRow = null;
  if (productId) {
    const { data: prod } = await supabase.from("toko_products").select("*").eq("id", productId).maybeSingle();
    productRow = prod;
  }
  if (!productRow) {
    const { data: prod } = await supabase.from("toko_products").select("*").ilike("name", productName).maybeSingle();
    productRow = prod;
  }

  const buyPrice = productRow ? Number(productRow.buy_price || 0) : 0;
  const unitName = productRow?.unit_name || "Pcs";
  const totalLossValue = buyPrice * qtyExchange;

  // 2. Reduce stock for the fresh replacement item given to customer
  if (productRow) {
    const newStock = Math.max(0, Number(productRow.stock_qty || 0) - qtyExchange);
    await supabase.from("toko_products").update({ stock_qty: newStock }).eq("id", productRow.id);

    // Insert Stock Mutation for Expired Loss / Exchange
    await supabase.from("toko_stock_mutations").insert({
      product_id: productRow.id,
      mutation_type: "damage",
      qty: qtyExchange,
      notes: `[Retur Tukar Barang ${reason}] Faktur #${invoiceNo} (${qtyExchange} ${unitName}): ${notes}`,
      created_by: user.id,
    });
  }

  // 3. Post Automatic Journal for Loss of Expired Goods (Status: Draft)
  // Debit: 5202 (Beban Kerugian Barang Rusak/Kadaluarsa) / 5201 fallback
  // Credit: 1301 (Persediaan Barang Dagang Toko Waserda)
  let { data: lossAcc } = await supabase.from("accounts").select("id").eq("code", "5202").maybeSingle();
  if (!lossAcc) {
    const { data: fallbackLoss } = await supabase.from("accounts").select("id").eq("code", "5201").maybeSingle();
    lossAcc = fallbackLoss;
  }
  const { data: invAcc } = await supabase.from("accounts").select("id").eq("code", "1301").maybeSingle();

  if (lossAcc && invAcc && totalLossValue > 0) {
    const { data: journal } = await supabase
      .from("journal_entries")
      .insert({
        branch_id: branchId,
        entry_no: `JRN-RET-${Date.now().toString().slice(-6)}`,
        entry_date: today,
        memo: `[Unit Toko Waserda] Kerugian Retur Tukar Barang Expire/Rusak (${retNo}) - Faktur #${invoiceNo} (${productName} ${qtyExchange} ${unitName})`,
        source_type: "toko_exchange_return",
        source_id: saleId || undefined,
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (journal) {
      await supabase.from("journal_lines").insert([
        { journal_entry_id: journal.id, account_id: lossAcc.id, debit: totalLossValue, credit: 0 },
        { journal_entry_id: journal.id, account_id: invAcc.id, debit: 0, credit: totalLossValue },
      ]);
    }
  }

  // 4. Audit Log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "toko.sale.exchange_return",
    details: `Retur tukar barang ${qtyExchange} ${unitName} ${productName} (Faktur #${invoiceNo}) berhasil diproses. Alasan: ${reason}.`,
    metadata: {
      ret_no: retNo,
      invoice_no: invoiceNo,
      product_name: productName,
      qty: qtyExchange,
      reason,
      total_loss: totalLossValue,
      unit_name: "Unit Toko Waserda",
    },
  });

  revalidatePath("/toko/penjualan");
  revalidatePath("/toko/produk");
  revalidatePath("/toko/laporan");
  revalidatePath("/toko/home");
  revalidatePath("/akuntansi");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");

  redirect(`/toko/penjualan?saved=exchange_success&ret_no=${encodeURIComponent(retNo)}&item=${encodeURIComponent(productName)}`);
}
