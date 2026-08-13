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
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoKasirClientManager({
  products,
  members,
  successInv,
  successTotal,
}: TokoKasirClientManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "credit">("cash");
  const [paidAmountInput, setPaidAmountInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");

  const [showReceiptModal, setShowReceiptModal] = useState(!!successInv);

  // Custom Searchable Member Picker State
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const filteredMembers = members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase().trim();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.member_no.toLowerCase().includes(q)
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

  // Add product to cart
  const addToCart = (product: TokoProductRow) => {
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
    setPaidAmountInput("");
    setDiscountInput("0");
    setNotes("");
  };

  // Calculate Subtotal & Totals based on member toggle
  const isMember = !!selectedMember;
  const subtotal = cart.reduce((sum, item) => {
    const price = isMember ? item.sell_price_member : item.sell_price_general;
    return sum + price * item.qty;
  }, 0);

  const discount = Math.max(0, Number(discountInput) || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const paidAmount = Number(paidAmountInput) || 0;
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
              Touchscreen & Barcode POS · Dual Harga (Umum / Anggota Koperasi)
            </p>
          </div>
        </div>

        {/* Custom Searchable Member Combobox */}
        <div className="relative">
          {selectedMember ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#eff6ff] p-2 pr-3 border border-[#2563eb]">
              <div className="grid size-8 place-items-center rounded-lg bg-[#2563eb] text-white">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-black text-xs text-[#1d4ed8]">{selectedMember.full_name}</p>
                <p className="text-[10px] text-[#2563eb] font-bold">
                  🌟 Member Diskon Aktif ({selectedMember.member_no})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="ml-2 rounded-lg p-1 text-[#2563eb] hover:bg-[#dbe5f1]"
                title="Batal pilih anggota"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                className="flex h-11 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-[#f8fbff] px-2.5 text-xs font-bold text-[#0b1220] shadow-xs hover:border-[#2563eb] hover:bg-white transition-all"
              >
                <UserCheck className="size-4 text-[#2563eb]" />
                <span>Pilih Anggota (Harga Khusus)</span>
                <ChevronDown className={`size-3.5 text-[#64748b] transition-transform ${isMemberDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Searchable Member Dropdown Menu */}
              {isMemberDropdownOpen ? (
                <div className="absolute right-0 z-50 mt-1.5 w-80 max-h-72 overflow-y-auto rounded-2xl border border-[#cbd5e1] bg-white p-2.5 shadow-xl">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 size-3.5 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama atau No. Anggota..."
                      className="h-9 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fbff] pl-8 pr-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <div
                      onClick={() => {
                        setSelectedMember(null);
                        setIsMemberDropdownOpen(false);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-xl p-2 text-xs hover:bg-[#f1f5f9] transition-colors"
                    >
                      <span className="font-bold text-[#64748b]">👤 Pembeli Umum / Non-Anggota</span>
                    </div>

                    {filteredMembers.length ? (
                      filteredMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMember(m);
                            setIsMemberDropdownOpen(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-xl p-2 hover:bg-[#eff6ff] transition-colors"
                        >
                          <div>
                            <p className="font-black text-xs text-[#0b1220]">{m.full_name}</p>
                            <p className="text-[10px] font-semibold text-[#64748b]">
                              ID: {m.member_no} {m.department ? `· ${m.department}` : ""}
                            </p>
                          </div>
                          <span className="rounded-md bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                            Member
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-center text-xs font-bold text-[#94a3b8]">
                        Anggota tidak ditemukan.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

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
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isOut
                      ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                      : "border-[#dbe5f1] bg-white hover:border-[#2563eb] hover:shadow-sm active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-bold text-xs text-[#0b1220]">{product.name}</span>
                      <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                        {product.stock_qty} {product.unit_name ?? "Pcs"}
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
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Kosongkan
                </button>
              ) : null}
            </div>

            {/* Cart Item List */}
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                            className="grid size-7 place-items-center text-[#475569] hover:bg-[#f1f5f9]"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.product_id, 1)}
                            className="grid size-7 place-items-center text-[#475569] hover:bg-[#f1f5f9]"
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
                          className="text-[#94a3b8] hover:text-rose-600"
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
          <div className="mt-4 border-t border-[#dbe5f1] pt-4 space-y-3">
            {/* Payment Method Selector */}
            <div>
              <span className="text-xs font-bold uppercase text-[#475569]">Metode Pembayaran</span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === "cash"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569]"
                  }`}
                >
                  <Banknote className="size-4" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === "bank"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569]"
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>QRIS / Bank</span>
                </button>

                <button
                  type="button"
                  disabled={!isMember}
                  onClick={() => setPaymentMethod("credit")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                    !isMember
                      ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : paymentMethod === "credit"
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#dbe5f1] bg-[#f8fbff] text-[#475569]"
                  }`}
                  title={!isMember ? "Hanya untuk Anggota Koperasi" : ""}
                >
                  <UserCheck className="size-4" />
                  <span>Potong Gaji</span>
                </button>
              </div>
            </div>

            {/* Cash Input */}
            {paymentMethod === "cash" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-[#475569]">Uang Diterima</span>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="Rp 0"
                    className="mt-1 h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                  />
                </label>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#475569]">Kembalian</span>
                  <div className="mt-1 flex h-9 items-center rounded-xl bg-[#f1f5f9] px-2 text-xs font-black text-[#0b1220]">
                    {formatRupiah(changeAmount)}
                  </div>
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
                  <span>AKTIF 🌟</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-1 border-t border-slate-700 text-sm font-black">
                <span>TOTAL BAYAR:</span>
                <span className="text-[#2563eb] text-base">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Form Submission */}
            <form action={processPosSale}>
              <input type="hidden" name="items_json" value={JSON.stringify(cartSubmissionItems)} />
              <input type="hidden" name="member_id" value={selectedMember?.id ?? ""} />
              <input type="hidden" name="payment_method" value={paymentMethod} />
              <input type="hidden" name="discount_amount" value={discountInput} />
              <input type="hidden" name="paid_amount" value={paidAmountInput} />
              <input type="hidden" name="notes" value={notes} />

              <button
                type="submit"
                disabled={!cart.length || isPending}
                className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-black text-white hover:bg-[#1d4ed8] shadow-sm disabled:opacity-50"
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-[#0b1220]">Transaksi POS Berhasil!</h3>
              <p className="text-xs text-[#64748b]">No. Faktur: <span className="font-bold text-[#2563eb]">{successInv}</span></p>
              <p className="text-sm font-black text-[#0b1220] mt-1">{formatRupiah(successTotal ?? 0)}</p>
            </div>

            {/* Thermal Receipt Box */}
            <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fbff] p-4 text-left font-mono text-[11px] space-y-2 text-[#0b1220]">
              <div className="text-center font-bold">
                <p>WASERDA TOKO KOPERASI</p>
                <p className="text-[9px] font-normal text-[#64748b]">Struk Bukti Pembayaran Resmi</p>
              </div>
              <div className="border-t border-dashed border-[#cbd5e1] pt-1">
                <p>No: {successInv}</p>
                <p>Tgl: {new Date().toLocaleDateString("id-ID")}</p>
              </div>
              <div className="border-t border-dashed border-[#cbd5e1] pt-1 text-center font-bold text-emerald-600">
                LUNAS - TERIMA KASIH
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]"
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
                className="h-10 rounded-xl bg-[#f1f5f9] px-2 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
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
