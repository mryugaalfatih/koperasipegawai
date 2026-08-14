"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  CheckCircle2,
  Store,
  Tag,
  Barcode,
  X,
  User,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { processPosSale } from "../actions";
import { TokoProductRow } from "../produk/TokoProdukClientManager";

export type MemberOption = {
  id: string;
  member_no: string;
  full_name: string;
  department?: string | null;
};

type CartItem = {
  product_id: string;
  product_name: string;
  barcode: string | null;
  unit_name: string;
  buy_price: number;
  sell_price_general: number;
  sell_price_member: number;
  qty: number;
};

type TokoKasirClientManagerProps = {
  products: TokoProductRow[];
  members: MemberOption[];
  successInv?: string;
  successTotal?: number;
  cooperativeProfile?: {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  lastSaleData?: any;
  cashierName?: string;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoKasirClientManager({
  products,
  members,
  successInv,
  successTotal,
  cooperativeProfile,
  lastSaleData,
  cashierName = "Kasir",
}: TokoKasirClientManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSelected, setCustomerSelected] = useState<boolean>(false);
  const [customerType, setCustomerType] = useState<"general" | "member">("general");
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "credit">("cash");
  const [paidAmountInput, setPaidAmountInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");

  const [showReceiptModal, setShowReceiptModal] = useState(!!successInv);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Custom Searchable Member Picker State
  const [memberSearch, setMemberSearch] = useState("");

  const formatThousand = (val: string | number) => {
    const clean = String(val ?? "").replace(/\D/g, "");
    return clean ? new Intl.NumberFormat("id-ID").format(Number(clean)) : "";
  };

  const parseThousand = (val: string | number) => Number(String(val ?? "").replace(/\D/g, "") || "0");

  const filteredMembers = members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase().trim();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.member_no.toLowerCase().includes(q) ||
      (m.department && m.department.toLowerCase().includes(q))
    );
  });

  // Filter product catalog by search / barcode
  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  // Add product to cart (Checks if customer is selected)
  const addToCart = (product: TokoProductRow) => {
    if (!customerSelected) {
      setShowCustomerModal(true);
      return;
    }
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          unit_name: product.unit_name ?? "Pcs",
          buy_price: product.buy_price,
          sell_price_general: product.sell_price_general,
          sell_price_member: product.sell_price_member,
          qty: 1,
        },
      ];
    });
  };

  // Adjust cart qty
  const updateQty = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedMember(null);
    setCustomerType("general");
    setCustomerSelected(false);
    setPaymentMethod("cash");
    setPaidAmountInput("");
    setDiscountInput("0");
    setNotes("");
  };

  const handleSelectGeneral = () => {
    setCustomerType("general");
    setSelectedMember(null);
    setCustomerSelected(true);
    setShowCustomerModal(false);
    if (paymentMethod === "credit") setPaymentMethod("cash");
  };

  const handleSelectMember = (m: MemberOption) => {
    setCustomerType("member");
    setSelectedMember(m);
    setCustomerSelected(true);
    setShowCustomerModal(false);
  };

  // Calculate Subtotal & Totals based on member toggle
  const isMember = customerType === "member" && !!selectedMember;
  const subtotal = cart.reduce((sum, item) => {
    const price = isMember ? item.sell_price_member : item.sell_price_general;
    return sum + price * item.qty;
  }, 0);

  const discount = Math.max(0, parseThousand(discountInput));
  const grandTotal = Math.max(0, subtotal - discount);
  const paidAmount = parseThousand(paidAmountInput);
  const changeAmount = paymentMethod === "cash" ? Math.max(0, paidAmount - grandTotal) : 0;

  // Prepare items JSON for server action submission
  const cartSubmissionItems = cart.map((item) => {
    const price = isMember ? item.sell_price_member : item.sell_price_general;
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      qty: item.qty,
      unit_name: item.unit_name,
      buy_price: item.buy_price,
      sell_price: price,
      subtotal: price * item.qty,
    };
  });

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Kasir POS Waserda Toko</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Touchscreen & Barcode POS · Validasi Dual Tarif (Umum / Anggota Koperasi)
            </p>
          </div>
        </div>

        {/* Active Customer Status Badge */}
        <div>
          {customerSelected ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#f8fbff] p-2 pr-3 border border-[#dbe5f1]">
              <div className={`grid size-8 place-items-center rounded-lg text-white ${
                isMember ? "bg-[#2563eb]" : "bg-[#475569]"
              }`}>
                {isMember ? <Sparkles className="size-4" /> : <User className="size-4" />}
              </div>
              <div className="text-xs">
                <p className="font-black text-[#0b1220]">
                  {isMember ? selectedMember?.full_name : "Pembeli Umum / Non-Anggota"}
                </p>
                <p className="text-[10px] font-bold text-[#64748b]">
                  {isMember ? `🌟 Harga Anggota (${selectedMember?.member_no})` : "🛒 Harga Reguler Standar"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="ml-2 rounded-lg bg-white px-2 py-1 text-[11px] font-black text-[#2563eb] border border-[#dbe5f1] hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                Ganti Pelanggan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="flex h-11 items-center gap-2 rounded-xl border-2 border-dashed border-[#2563eb] bg-[#eff6ff] px-4 text-xs font-black text-[#1d4ed8] hover:bg-[#dbeafe] transition-all cursor-pointer animate-pulse"
            >
              <UserCheck className="size-4 text-[#2563eb]" />
              <span>👉 Pilih Pelanggan untuk Memulai Transaksi</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Selection Required Modal / Prompt */}
      {(!customerSelected || showCustomerModal) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-[#f1f5f9] pb-3">
              <div>
                <h2 className="text-base font-black text-[#0b1220]">Pilih Tipe Pelanggan Transaksi</h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Tentukan jenis pembeli sebelum memasukkan barang ke keranjang kasir.
                </p>
              </div>
              {customerSelected ? (
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="rounded-lg p-1 text-[#64748b] hover:bg-slate-100 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            {/* 2 Customer Selection Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Card 1: Pembeli Umum */}
              <button
                type="button"
                onClick={handleSelectGeneral}
                className="group flex flex-col justify-between rounded-2xl border-2 border-[#e2e8f0] bg-white p-4 text-left hover:border-[#2563eb] hover:bg-[#eff6ff] transition-all cursor-pointer active:scale-[0.98]"
              >
                <div>
                  <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#475569] group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                    <User className="size-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-black text-[#0b1220]">Pembeli Umum</h3>
                  <p className="text-xs text-[#64748b] mt-1">
                    Pelanggan reguler / non-anggota koperasi.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#f1f5f9] text-[11px] font-bold text-[#64748b] space-y-0.5">
                  <p className="text-[#0b1220]">✔️ Berlaku Harga Umum</p>
                  <p className="text-slate-400">✖️ Potong Gaji Nonaktif</p>
                </div>
              </button>

              {/* Card 2: Anggota Koperasi */}
              <div className="rounded-2xl border-2 border-[#2563eb] bg-[#f8fbff] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-xl bg-[#2563eb] text-white">
                      <Sparkles className="size-6" />
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      🌟 Harga Khusus
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-black text-[#0b1220]">Anggota Koperasi</h3>
                  <p className="text-xs text-[#64748b] mt-1">
                    Cari & pilih nama anggota untuk mengaktifkan diskon & tempo potong gaji.
                  </p>
                </div>

                {/* Member Search input inside card */}
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Ketik nama atau ID anggota..."
                      className="h-8.5 w-full rounded-xl border border-[#cbd5e1] bg-white pl-8 pr-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-white p-1 border border-[#e2e8f0]">
                    {filteredMembers.length ? (
                      filteredMembers.slice(0, 10).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMember(m)}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs hover:bg-[#eff6ff] transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-[#0b1220] truncate">{m.full_name}</p>
                            <p className="text-[10px] text-[#64748b]">ID: {m.member_no} {m.department ? `· ${m.department}` : ""}</p>
                          </div>
                          <span className="shrink-0 rounded bg-[#2563eb] px-2 py-0.5 text-[10px] font-bold text-white">
                            Pilih
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-2 text-center text-xs text-[#94a3b8]">Anggota tidak ditemukan.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main POS Screen (Grid 2 Column: Product Selector vs Cart) */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Product Selector */}
        <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 size-4 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan Barcode / Cari Nama Barang Sembako..."
              className="h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-10 pr-4 text-xs font-bold outline-none focus:border-[#2563eb]"
              autoFocus
            />
          </div>

          {/* Product Grid */}
          <div className="grid gap-3 sm:grid-cols-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const currentPrice = isMember ? product.sell_price_member : product.sell_price_general;
              const isOut = product.stock_qty <= 0;

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOut}
                  onClick={() => addToCart(product)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isOut
                      ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                      : "border-[#dbe5f1] bg-white hover:border-[#2563eb] hover:shadow-sm active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-bold text-xs text-[#0b1220]">{product.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isOut ? "bg-rose-100 text-rose-700" : "bg-[#f1f5f9] text-[#475569]"
                      }`}>
                        {isOut ? "Habis" : `${product.stock_qty} ${product.unit_name ?? "Pcs"}`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
                      BC: {product.barcode ?? "-"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
                    <div>
                      <p className="text-xs font-black text-[#2563eb]">{formatRupiah(currentPrice)}</p>
                      {isMember && product.sell_price_member < product.sell_price_general ? (
                        <p className="text-[10px] text-[#16a34a] font-bold line-through">
                          {formatRupiah(product.sell_price_general)}
                        </p>
                      ) : null}
                    </div>
                    <span className="grid size-7 place-items-center rounded-lg bg-[#2563eb] text-white">
                      <Plus className="size-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Cart & Checkout Form */}
        <section className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#dbe5f1]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5 text-[#2563eb]" />
                <h2 className="font-bold text-sm text-[#0b1220]">Keranjang Belanja POS</h2>
              </div>
              {cart.length ? (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              ) : null}
            </div>

            {/* Cart Item List */}
            <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {cart.length ? (
                cart.map((item) => {
                  const price = isMember ? item.sell_price_member : item.sell_price_general;
                  const itemSubtotal = price * item.qty;

                  return (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-[#0b1220] truncate">{item.product_name}</p>
                        <p className="text-[11px] text-[#64748b]">
                          {formatRupiah(price)} / {item.unit_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-lg bg-white border border-[#dbe5f1]">
                          <button
                            type="button"
                            onClick={() => updateQty(item.product_id, -1)}
                            className="grid size-7 place-items-center text-[#475569] hover:bg-[#f1f5f9] cursor-pointer"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.product_id, 1)}
                            className="grid size-7 place-items-center text-[#475569] hover:bg-[#f1f5f9] cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <span className="w-20 text-right font-black text-[#0b1220]">
                          {formatRupiah(itemSubtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-[#94a3b8] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs font-bold text-[#94a3b8]">
                  Keranjang belanja masih kosong. Klik barang di sebelah kiri untuk menambahkan.
                </div>
              )}
            </div>
          </div>

          {/* Checkout & Payment Section */}
          <div className="mt-4 border-t border-[#dbe5f1] pt-3 space-y-3">
            {/* Payment Method Selector */}
            <div>
              <span className="text-xs font-bold uppercase text-[#475569]">Metode Pembayaran</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === "cash"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb] shadow-xs font-black"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569] hover:bg-slate-50"
                  }`}
                >
                  <Banknote className="size-4" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === "bank"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb] shadow-xs font-black"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569] hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>QRIS / Bank</span>
                </button>

                <button
                  type="button"
                  disabled={!isMember}
                  onClick={() => {
                    if (isMember) setPaymentMethod("credit");
                  }}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                    !isMember
                      ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : paymentMethod === "credit"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb] shadow-xs font-black cursor-pointer"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569] hover:bg-slate-50 cursor-pointer"
                  }`}
                  title={!isMember ? "Hanya untuk Anggota Koperasi (Pilih Anggota terlebih dahulu)" : "Potong Gaji Bulanan"}
                >
                  <UserCheck className="size-4" />
                  <span>Potong Gaji</span>
                  {!isMember ? (
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">Locked</span>
                  ) : null}
                </button>
              </div>
            </div>

            {/* Cash Input with Thousand Separator & Quick Denomination Buttons */}
            {paymentMethod === "cash" ? (
              <div className="space-y-2 rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1]">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#475569] block mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-[#64748b]">Rp</span>
                      <input
                        type="text"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(formatThousand(e.target.value))}
                        placeholder="0"
                        className="h-8.5 w-full rounded-lg border border-[#cbd5e1] bg-white pl-8 pr-2 text-xs font-black text-[#0b1220] outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-[#475569] block mb-1">
                      Kembalian
                    </span>
                    <div className={`flex h-8.5 items-center rounded-lg px-2.5 text-xs font-black ${
                      changeAmount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#f1f5f9] text-[#0b1220]"
                    }`}>
                      {formatRupiah(changeAmount)}
                    </div>
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#64748b]">Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setPaidAmountInput(formatThousand(grandTotal))}
                    className="rounded-md bg-white border border-[#cbd5e1] px-2 py-0.5 text-[10px] font-black text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  {[20000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaidAmountInput(formatThousand(amt))}
                      className="rounded-md bg-white border border-[#cbd5e1] px-1.5 py-0.5 text-[10px] font-bold text-[#475569] hover:bg-slate-100 cursor-pointer"
                    >
                      {formatThousand(amt)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Totals Summary */}
            <div className="rounded-xl bg-[#0b1220] p-3 text-white space-y-1 text-xs">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Subtotal ({cart.length} Jenis Item):</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              {isMember ? (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Status Diskon Anggota:</span>
                  <span>AKTIF 🌟 ({selectedMember?.full_name})</span>
                </div>
              ) : (
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Tarif:</span>
                  <span>Umum / Reguler</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-700 text-sm font-black">
                <span>TOTAL BAYAR:</span>
                <span className="text-[#38bdf8] text-base">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Form Submission */}
            <form action={processPosSale}>
              <input type="hidden" name="items_json" value={JSON.stringify(cartSubmissionItems)} />
              <input type="hidden" name="member_id" value={isMember ? selectedMember?.id ?? "" : ""} />
              <input type="hidden" name="payment_method" value={paymentMethod} />
              <input type="hidden" name="discount_amount" value={parseThousand(discountInput)} />
              <input type="hidden" name="paid_amount" value={parseThousand(paidAmountInput)} />
              <input type="hidden" name="notes" value={notes} />

              <button
                type="submit"
                disabled={!cart.length || isPending}
                className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-black text-white hover:bg-[#1d4ed8] shadow-sm disabled:opacity-50 cursor-pointer transition-all active:scale-[0.99]"
              >
                {isPending ? "MEMPROSES TRANSAKSI..." : `BAYAR SEKARANG (${formatRupiah(grandTotal)})`}
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Thermal Receipt Modal */}
      {showReceiptModal && successInv ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-center max-h-[90vh] overflow-y-auto">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-[#0b1220]">Transaksi POS Berhasil!</h3>
              <p className="text-xs text-[#64748b]">No. Faktur: <span className="font-bold text-[#2563eb]">{successInv}</span></p>
              <p className="text-base font-black text-[#0b1220] mt-1">
                {formatRupiah(lastSaleData?.grand_total ?? successTotal ?? 0)}
              </p>
            </div>

            {/* Thermal Receipt Box (Printable) */}
            <div id="printable-receipt" className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fbff] p-4 text-left font-mono text-[11px] space-y-2 text-[#0b1220]">
              {/* Header */}
              <div className="text-center">
                <p className="text-xs uppercase font-black">{cooperativeProfile?.name || "KOPKAR MANUNGGAL PERKASA"}</p>
                {cooperativeProfile?.address ? (
                  <p className="text-[9px] font-normal text-[#64748b] mt-0.5">{cooperativeProfile.address}</p>
                ) : null}
                {cooperativeProfile?.phone ? (
                  <p className="text-[9px] font-normal text-[#64748b]">Telp: {cooperativeProfile.phone}</p>
                ) : null}
                <p className="text-[10px] font-bold text-[#2563eb] mt-1">UNIT USAHA TOKO WASERDA</p>
                <p className="text-[9px] font-normal text-[#64748b]">Struk Bukti Pembayaran Resmi</p>
              </div>

              {/* Transaction Metadata */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-0.5 text-[10px] text-[#475569]">
                <div className="flex justify-between">
                  <span>No. Faktur:</span>
                  <span className="font-bold text-[#0b1220]">{successInv}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold text-[#0b1220]">
                    {lastSaleData?.members?.full_name
                      ? `${lastSaleData.members.full_name} (${lastSaleData.members.member_no})`
                      : "Pembeli Umum"}
                  </span>
                </div>
              </div>

              {/* Itemized Products List */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-2 pb-1 space-y-1.5 text-xs">
                {lastSaleData?.toko_sale_items && lastSaleData.toko_sale_items.length > 0 ? (
                  lastSaleData.toko_sale_items.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="space-y-0.5">
                      <p className="font-bold text-[#0b1220] leading-tight truncate">{item.product_name}</p>
                      <div className="flex justify-between text-[10px] text-[#64748b]">
                        <span>{item.qty} {item.unit_name ?? "Pcs"} x {formatRupiah(item.sell_price)}</span>
                        <span className="font-bold text-[#0b1220]">{formatRupiah(item.subtotal)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-[#64748b] text-[10px] italic py-1">Memuat rincian item barang...</p>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-1 text-xs">
                <div className="flex justify-between text-[#64748b]">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(lastSaleData?.total_amount ?? successTotal ?? 0)}</span>
                </div>
                {(lastSaleData?.discount_amount ?? 0) > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(lastSaleData?.discount_amount ?? 0)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-[#0b1220] text-xs pt-1 border-t border-slate-200">
                  <span>TOTAL BELANJA:</span>
                  <span className="text-[#2563eb] text-sm">
                    {formatRupiah(lastSaleData?.grand_total ?? successTotal ?? 0)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-0.5 text-[10px] text-[#64748b]">
                <div className="flex justify-between">
                  <span>Metode Pembayaran:</span>
                  <span className="font-bold text-[#0b1220] uppercase">
                    {lastSaleData?.payment_method === "bank"
                      ? "QRIS / Transfer Bank"
                      : lastSaleData?.payment_method === "credit"
                      ? "Tempo Potong Gaji"
                      : "Tunai (Cash)"}
                  </span>
                </div>
                {lastSaleData?.payment_method === "cash" || !lastSaleData?.payment_method ? (
                  <>
                    <div className="flex justify-between">
                      <span>Uang Diterima:</span>
                      <span>{formatRupiah(lastSaleData?.paid_amount ?? successTotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0b1220]">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(lastSaleData?.change_amount ?? 0)}</span>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-2 text-center text-[10px] space-y-0.5 text-[#64748b]">
                <p className="font-bold text-emerald-600">LUNAS - TERIMA KASIH</p>
                <p className="text-[9px]">Barang yang sudah dibeli</p>
                <p className="text-[9px]">tidak dapat ditukar/dikembalikan</p>
              </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-receipt, #printable-receipt * {
                  visibility: visible;
                }
                #printable-receipt {
                  position: fixed;
                  left: 0;
                  top: 0;
                  width: 100%;
                  max-width: 80mm;
                  margin: 0 auto;
                  padding: 12px;
                  font-size: 11px;
                  background: white !important;
                  border: none !important;
                  box-shadow: none !important;
                }
              }
            `}</style>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8] cursor-pointer shadow-xs"
              >
                <Printer className="size-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  clearCart();
                  router.push("/toko/kasir");
                }}
                className="h-10 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
