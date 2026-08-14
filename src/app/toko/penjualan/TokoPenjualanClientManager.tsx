"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Search,
  Printer,
  ShoppingBag,
  UserCheck,
  Calendar,
  Banknote,
  CreditCard,
  Eye,
  Store,
  RotateCcw,
  Sparkles,
  User,
  CheckCircle2,
} from "lucide-react";

export type TokoSaleRow = {
  id: string;
  invoice_no: string;
  sale_date: string;
  payment_method: string;
  total_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  notes: string | null;
  created_at: string;
  members: {
    full_name: string;
    member_no: string;
  } | null;
  toko_sale_items?: {
    product_name: string;
    qty: number;
    unit_name: string;
    sell_price: number;
    subtotal: number;
  }[];
};

type TokoPenjualanClientManagerProps = {
  salesRows: TokoSaleRow[];
  totalSalesCount: number;
  totalOmset: number;
  cooperativeProfile?: {
    name: string;
    legal_number: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const paymentMethodLabels: Record<string, string> = {
  cash: "Tunai (Cash)",
  bank: "Bank / QRIS",
  credit: "Potong Gaji Anggota",
};

function getStartOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function getEndOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function TokoPenjualanClientManager({
  salesRows,
  cooperativeProfile,
}: TokoPenjualanClientManagerProps) {
  const [periodPreset, setPeriodPreset] = useState<"this_month" | "all" | "today" | "last_month" | "this_year" | "custom">("this_month");
  const [startDate, setStartDate] = useState<string>(getStartOfMonth());
  const [endDate, setEndDate] = useState<string>(getEndOfMonth());
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "member" | "general">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<TokoSaleRow | null>(null);

  // Handle Preset Date changes
  const handlePresetChange = (preset: "this_month" | "all" | "today" | "last_month" | "this_year" | "custom") => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_month") {
      setStartDate(getStartOfMonth(now));
      setEndDate(getEndOfMonth(now));
    } else if (preset === "last_month") {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(getStartOfMonth(lastMonthDate));
      setEndDate(getEndOfMonth(lastMonthDate));
    } else if (preset === "this_year") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const resetFilters = () => {
    handlePresetChange("this_month");
    setSearch("");
    setCustomerFilter("all");
    setPaymentFilter("all");
  };

  // Filtered Sales Logic
  const filteredSales = useMemo(() => {
    return salesRows.filter((s) => {
      // 1. Date filter
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;

      // 2. Customer Type filter
      if (customerFilter === "member" && !s.members) return false;
      if (customerFilter === "general" && s.members) return false;

      // 3. Payment Method filter
      if (paymentFilter !== "all" && s.payment_method !== paymentFilter) return false;

      // 4. Search text (Invoice, Member Name/No, Item Name)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchInvoice = s.invoice_no.toLowerCase().includes(q);
        const matchMember = (s.members?.full_name ?? "").toLowerCase().includes(q) || (s.members?.member_no ?? "").toLowerCase().includes(q);
        const matchNotes = (s.notes ?? "").toLowerCase().includes(q);
        const matchItem = (s.toko_sale_items ?? []).some((item) =>
          item.product_name.toLowerCase().includes(q)
        );
        if (!matchInvoice && !matchMember && !matchNotes && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [salesRows, startDate, endDate, customerFilter, paymentFilter, search]);

  // Totals calculations
  const { totalFilteredOmset, cashOmset, creditOmset, totalItemsSold } = useMemo(() => {
    let total = 0;
    let cash = 0;
    let credit = 0;
    let items = 0;

    for (const s of filteredSales) {
      const amt = Number(s.grand_total ?? 0);
      total += amt;
      if (s.payment_method === "cash") cash += amt;
      if (s.payment_method === "credit") credit += amt;
      if (s.toko_sale_items) {
        items += s.toko_sale_items.reduce((sum, it) => sum + Number(it.qty ?? 0), 0);
      }
    }

    return {
      totalFilteredOmset: total,
      cashOmset: cash,
      creditOmset: credit,
      totalItemsSold: items,
    };
  }, [filteredSales]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Riwayat Penjualan Kasir POS Toko</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Rekapitulasi transaksi kasir waserda, struk faktur, rincian barang belanja, dan filter periode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-black text-[#2563eb] border border-[#dbe5f1]">
            {filteredSales.length} Transaksi Ditemukan
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
        {/* 1. Periode Preset Buttons & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
              <Calendar className="size-3.5 text-[#2563eb]" /> Periode:
            </span>
            {(
              [
                { id: "this_month", label: "Bulan Ini" },
                { id: "today", label: "Hari Ini" },
                { id: "last_month", label: "Bulan Lalu" },
                { id: "this_year", label: "Tahun Ini" },
                { id: "all", label: "Semua" },
                { id: "custom", label: "Kustom" },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                  periodPreset === preset.id
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {(startDate || endDate || search || customerFilter !== "all" || paymentFilter !== "all" || periodPreset !== "this_month") && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-[#64748b] hover:bg-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* 2. Customer Type & Payment Method Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f1f5f9]">
          <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
            <User className="size-3.5 text-[#2563eb]" /> Pelanggan:
          </span>
          {[
            { id: "all", label: "Semua Pelanggan" },
            { id: "member", label: "⭐ Anggota Koperasi" },
            { id: "general", label: "👤 Pembeli Umum" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCustomerFilter(c.id as any)}
              className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                customerFilter === c.id
                  ? "bg-[#0b1220] text-white shadow-sm"
                  : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
              }`}
            >
              {c.label}
            </button>
          ))}

          <span className="text-xs font-bold text-[#64748b] ml-2 mr-1 flex items-center gap-1">
            <Banknote className="size-3.5 text-[#2563eb]" /> Metode:
          </span>
          {[
            { id: "all", label: "Semua Metode" },
            { id: "cash", label: "💵 Tunai" },
            { id: "bank", label: "🏦 QRIS / Bank" },
            { id: "credit", label: "💳 Potong Gaji" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaymentFilter(p.id)}
              className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                paymentFilter === p.id
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 3. Search & Date Pickers */}
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4 pt-2 border-t border-[#f1f5f9]">
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Cari Transaksi / Barang / Pembeli</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="No Faktur / Nama Anggota / Nama Barang Sembako..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-8 pr-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="h-8.5 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="h-8.5 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Receipt className="size-5 text-[#2563eb]" />
            <span className="text-[10px] font-bold text-[#64748b]">Total Faktur</span>
          </div>
          <p className="mt-2 text-xl font-black text-[#0b1220]">{filteredSales.length} Faktur</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">{totalItemsSold} item barang terjual</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Store className="size-5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Omset Total</span>
          </div>
          <p className="mt-2 text-xl font-black text-emerald-600">{formatRupiah(totalFilteredOmset)}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Semua metode pembayaran</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Banknote className="size-5 text-[#2563eb]" />
            <span className="text-[10px] font-bold text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded">Kas Tunai</span>
          </div>
          <p className="mt-2 text-xl font-black text-[#0b1220]">{formatRupiah(cashOmset)}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Uang kas masuk kasir</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <CreditCard className="size-5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Potong Gaji</span>
          </div>
          <p className="mt-2 text-xl font-black text-amber-600">{formatRupiah(creditOmset)}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Piutang anggota toko</p>
        </article>
      </section>

      {/* Sales Transactions Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-2.5 font-bold">No. Faktur POS</th>
                <th className="px-3 py-2.5 font-bold">Tanggal</th>
                <th className="px-3 py-2.5 font-bold">Pelanggan / Anggota</th>
                <th className="px-3 py-2.5 font-bold">Rincian Barang</th>
                <th className="px-3 py-2.5 font-bold">Metode Bayar</th>
                <th className="px-3 py-2.5 font-bold text-right">Grand Total</th>
                <th className="px-3 py-2.5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredSales.length ? (
                filteredSales.map((sale) => {
                  const itemCount = sale.toko_sale_items?.length ?? 0;
                  const firstItem = sale.toko_sale_items?.[0]?.product_name ?? "";
                  const otherCount = itemCount > 1 ? ` +${itemCount - 1} barang lainnya` : "";

                  return (
                    <tr key={sale.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-[#2563eb]">
                        {sale.invoice_no}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#64748b]">
                        {sale.sale_date}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[#0b1220]">
                        {sale.members ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#eff6ff] px-2 py-0.5 text-xs text-[#1d4ed8] border border-[#bfdbfe]">
                            <Sparkles className="size-3 text-[#2563eb]" />
                            <span>{sale.members.full_name} ({sale.members.member_no})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[#64748b] text-xs">
                            <User className="size-3 text-slate-400" />
                            <span>Pembeli Umum</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#0b1220] max-w-[220px] truncate">
                        {firstItem ? (
                          <span title={sale.toko_sale_items?.map((i) => `${i.product_name} (${i.qty} ${i.unit_name})`).join(", ")}>
                            {firstItem}{otherCount}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] italic">Tidak ada item</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          sale.payment_method === "cash"
                            ? "bg-emerald-100 text-emerald-800"
                            : sale.payment_method === "bank"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-black text-right text-[#0b1220]">
                        {formatRupiah(sale.grand_total)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#dbe5f1] transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="size-3.5 text-[#2563eb]" />
                          <span>Struk / Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-bold text-[#64748b]">
                    Tidak ada transaksi penjualan yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detail & Cetak Struk Thermal */}
      {selectedSale ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-center max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
              <h3 className="text-sm font-black text-[#0b1220]">Rincian Faktur Penjualan</h3>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="rounded-lg p-1 text-[#64748b] hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thermal Receipt Box (Printable) */}
            <div id="printable-pos-receipt" className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fbff] p-4 text-left font-mono text-[11px] space-y-2 text-[#0b1220]">
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

              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-0.5 text-[10px] text-[#475569]">
                <div className="flex justify-between">
                  <span>No. Faktur:</span>
                  <span className="font-bold text-[#0b1220]">{selectedSale.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{selectedSale.sale_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold text-[#0b1220]">
                    {selectedSale.members ? `${selectedSale.members.full_name} (${selectedSale.members.member_no})` : "Pembeli Umum"}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-2 pb-1 space-y-1.5 text-xs">
                {selectedSale.toko_sale_items?.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-bold text-[#0b1220] leading-tight truncate">{item.product_name}</p>
                    <div className="flex justify-between text-[10px] text-[#64748b]">
                      <span>{item.qty} {item.unit_name ?? "Pcs"} x {formatRupiah(item.sell_price)}</span>
                      <span className="font-bold text-[#0b1220]">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-1 text-xs">
                <div className="flex justify-between text-[#64748b]">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedSale.total_amount)}</span>
                </div>
                {(selectedSale.discount_amount ?? 0) > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedSale.discount_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-[#0b1220] text-xs pt-1 border-t border-slate-200">
                  <span>TOTAL BELANJA:</span>
                  <span className="text-[#2563eb] text-sm">{formatRupiah(selectedSale.grand_total)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-[#cbd5e1] pt-1.5 space-y-0.5 text-[10px] text-[#64748b]">
                <div className="flex justify-between">
                  <span>Metode Pembayaran:</span>
                  <span className="font-bold text-[#0b1220] uppercase">
                    {paymentMethodLabels[selectedSale.payment_method] ?? selectedSale.payment_method}
                  </span>
                </div>
                {selectedSale.payment_method === "cash" ? (
                  <>
                    <div className="flex justify-between">
                      <span>Uang Diterima:</span>
                      <span>{formatRupiah(selectedSale.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0b1220]">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(selectedSale.change_amount)}</span>
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
                #printable-pos-receipt, #printable-pos-receipt * {
                  visibility: visible;
                }
                #printable-pos-receipt {
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
                <span>Cetak Ulang Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="h-10 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
