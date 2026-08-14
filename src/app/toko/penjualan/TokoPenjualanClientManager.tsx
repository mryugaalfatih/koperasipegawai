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
  RefreshCw,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { processItemExchangeReturn } from "../actions";

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
  const [returnExchangeSale, setReturnExchangeSale] = useState<TokoSaleRow | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>("");
  const [exchangeQty, setExchangeQty] = useState<number>(1);

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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSale(sale)}
                            className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#dbe5f1] transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="size-3.5 text-[#2563eb]" />
                            <span>Struk</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReturnExchangeSale(sale);
                              setSelectedItemName(sale.toko_sale_items?.[0]?.product_name ?? "");
                              setExchangeQty(1);
                            }}
                            className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-amber-50 px-2.5 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                            title="Tukar Barang (Retur Expire / Rusak)"
                          >
                            <RefreshCw className="size-3 text-amber-700" />
                            <span>Tukar Barang</span>
                          </button>
                        </div>
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

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8] cursor-pointer shadow-xs"
                >
                  <Printer className="size-4" />
                  <span>Cetak Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="h-10 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const s = selectedSale;
                  setSelectedSale(null);
                  setReturnExchangeSale(s);
                  setSelectedItemName(s.toko_sale_items?.[0]?.product_name ?? "");
                  setExchangeQty(1);
                }}
                className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-50 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
              >
                <RefreshCw className="size-3.5 text-amber-700" />
                <span>Tukar Barang Baru (Retur Expire/Rusak)</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Tukar Barang (Retur Expire / Rusak) */}
      {returnExchangeSale ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-lg"
          title={`Tukar Barang Baru (Retur Expire / Rusak)`}
          onClose={() => setReturnExchangeSale(null)}
        >
          <form action={processItemExchangeReturn} className="space-y-4 text-xs">
            <input type="hidden" name="sale_id" value={returnExchangeSale.id} />
            <input type="hidden" name="invoice_no" value={returnExchangeSale.invoice_no} />

            {/* Info Faktur */}
            <div className="rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">No. Faktur Asal:</span>
                <span className="font-bold text-[#2563eb]">{returnExchangeSale.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Pelanggan:</span>
                <span className="font-bold text-[#0b1220]">
                  {returnExchangeSale.members
                    ? `${returnExchangeSale.members.full_name} (${returnExchangeSale.members.member_no})`
                    : "Pembeli Umum"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Tanggal Belanja:</span>
                <span className="font-semibold text-[#0b1220]">{returnExchangeSale.sale_date}</span>
              </div>
            </div>

            {/* Pilih Barang yang Ditukar */}
            <div className="space-y-1.5">
              <label className="block font-bold text-[#0b1220]">
                Pilih Barang yang Dikembalikan (Expire / Rusak): *
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {returnExchangeSale.toko_sale_items?.map((item, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedItemName === item.product_name
                        ? "border-[#2563eb] bg-[#eff6ff] text-[#0b1220] ring-1 ring-[#2563eb]"
                        : "border-[#e2e8f0] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="product_name"
                        value={item.product_name}
                        checked={selectedItemName === item.product_name}
                        onChange={() => setSelectedItemName(item.product_name)}
                        className="size-4 text-[#2563eb]"
                      />
                      <div>
                        <p className="font-bold">{item.product_name}</p>
                        <p className="text-[10px] text-[#64748b]">Dibeli: {item.qty} {item.unit_name ?? "Pcs"} @ {formatRupiah(item.sell_price)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#2563eb]">{formatRupiah(item.subtotal)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Jumlah Qty */}
              <label className="block">
                <span className="font-bold text-[#475569]">Jumlah Unit yang Ditukar (Qty) *</span>
                <input
                  type="number"
                  name="qty"
                  min="1"
                  required
                  value={exchangeQty}
                  onChange={(e) => setExchangeQty(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>

              {/* Alasan Retur */}
              <label className="block">
                <span className="font-bold text-[#475569]">Alasan Retur / Kondisi *</span>
                <select
                  name="reason"
                  required
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                >
                  <option value="Barang Kadaluarsa / Expired">Barang Kadaluarsa / Expired</option>
                  <option value="Kemasan Bocor / Pecah / Rusak">Kemasan Bocor / Pecah / Rusak</option>
                  <option value="Cacat Fisik / Basi / Kualitas Buruk">Cacat Fisik / Basi / Kualitas Buruk</option>
                  <option value="Lainnya">Alasan Lainnya</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="font-bold text-[#475569]">Catatan / Keterangan Penukaran</span>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Ditukar langsung di kasir dengan exp date baru"
                className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </label>

            {/* Mekanisme Notice Box */}
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                <span>Mekanisme Pencatatan Sistem:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[10px] pl-1">
                <li>Kasir menyerahkan <strong>{exchangeQty} unit barang baru</strong> yang masih bagus dari rak.</li>
                <li>Stok fisik barang toko otomatis <strong>berkurang {exchangeQty} unit</strong>.</li>
                <li>Barang expired otomatis dicatat sebagai <strong>Beban Kerugian Barang Rusak (Akun 5202)</strong> berstatus <em>Draft</em> di Akuntansi.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <SubmitButton className="flex-1 h-11 rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700 shadow-sm cursor-pointer">
                Konfirmasi Tukar Barang Baru
              </SubmitButton>
              <button
                type="button"
                onClick={() => setReturnExchangeSale(null)}
                className="h-11 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </CrudModal>
      ) : null}
    </div>
  );
}
