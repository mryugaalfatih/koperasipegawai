"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  Flame,
  Snowflake,
  Users,
  DollarSign,
  Calendar,
  Download,
  Percent,
  Printer,
  RotateCcw,
  Search,
  Store,
  AlertTriangle,
  Banknote,
  CreditCard,
  Package,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

export type RawSale = {
  id: string;
  invoice_no: string;
  sale_date: string;
  payment_method: string;
  total_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  member_id: string | null;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_no: string;
    department?: string | null;
  } | null;
};

export type RawSaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_name: string;
  buy_price: number;
  sell_price: number;
  subtotal: number;
};

export type RawProduct = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  unit_name: string | null;
  buy_price: number;
  sell_price_general: number;
  sell_price_member: number;
  stock_qty: number;
  min_stock: number;
  is_active: boolean;
};

export type RawMember = {
  id: string;
  member_no: string;
  full_name: string;
  department: string | null;
};

type TokoLaporanClientManagerProps = {
  rawSales: RawSale[];
  rawSaleItems: RawSaleItem[];
  rawProducts: RawProduct[];
  rawMembers: RawMember[];
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

function getStartOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function getEndOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function TokoLaporanClientManager({
  rawSales,
  rawSaleItems,
  rawProducts,
  rawMembers,
  cooperativeProfile,
}: TokoLaporanClientManagerProps) {
  const [activeTab, setActiveTab] = useState<"labarugi" | "fastmoving" | "member" | "stok">("labarugi");
  const [periodPreset, setPeriodPreset] = useState<"this_month" | "all" | "today" | "last_month" | "this_year" | "custom">("this_month");
  const [startDate, setStartDate] = useState<string>(getStartOfMonth());
  const [endDate, setEndDate] = useState<string>(getEndOfMonth());
  const [memberSearch, setMemberSearch] = useState("");

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
    setMemberSearch("");
  };

  // Filter Sales based on Date Range
  const filteredSales = useMemo(() => {
    return rawSales.filter((s) => {
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      return true;
    });
  }, [rawSales, startDate, endDate]);

  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map((s) => s.id));
  }, [filteredSales]);

  // Filter Sale Items matching the filtered sales
  const filteredSaleItems = useMemo(() => {
    return rawSaleItems.filter((item) => filteredSaleIds.has(item.sale_id));
  }, [rawSaleItems, filteredSaleIds]);

  // 1. Compute Financial Summary
  const {
    totalOmset,
    totalGrossSales,
    totalDiscounts,
    totalHpp,
    grossProfit,
    profitMarginPercent,
    cashSalesTotal,
    bankSalesTotal,
    creditSalesTotal,
    memberSalesTotal,
    generalSalesTotal,
    avgBasketSize,
    totalUnitsSold,
  } = useMemo(() => {
    let omset = 0;
    let gross = 0;
    let disc = 0;
    let cash = 0;
    let bank = 0;
    let credit = 0;
    let member = 0;
    let general = 0;

    for (const s of filteredSales) {
      const net = Number(s.grand_total ?? 0);
      omset += net;
      gross += Number(s.total_amount ?? net);
      disc += Number(s.discount_amount ?? 0);

      if (s.payment_method === "cash") cash += net;
      else if (s.payment_method === "bank") bank += net;
      else if (s.payment_method === "credit") credit += net;

      if (s.member_id || s.members) member += net;
      else general += net;
    }

    let hpp = 0;
    let units = 0;
    for (const item of filteredSaleItems) {
      const qty = Number(item.qty ?? 0);
      const buyPrice = Number(item.buy_price ?? 0);
      hpp += buyPrice * qty;
      units += qty;
    }

    const gp = Math.max(0, omset - hpp);
    const margin = omset > 0 ? (gp / omset) * 100 : 0;
    const basket = filteredSales.length > 0 ? Math.round(omset / filteredSales.length) : 0;

    return {
      totalOmset: omset,
      totalGrossSales: gross,
      totalDiscounts: disc,
      totalHpp: hpp,
      grossProfit: gp,
      profitMarginPercent: margin,
      cashSalesTotal: cash,
      bankSalesTotal: bank,
      creditSalesTotal: credit,
      memberSalesTotal: member,
      generalSalesTotal: general,
      avgBasketSize: basket,
      totalUnitsSold: units,
    };
  }, [filteredSales, filteredSaleItems]);

  // 2. Compute Fast & Slow Moving Products
  const { fastMoving, slowMoving, lowStockProducts } = useMemo(() => {
    const itemMap: Record<
      string,
      {
        productId: string;
        name: string;
        category: string;
        unitName: string;
        qtySold: number;
        omset: number;
        hpp: number;
        profit: number;
      }
    > = {};

    for (const item of filteredSaleItems) {
      const key = item.product_id || item.product_name;
      if (!itemMap[key]) {
        itemMap[key] = {
          productId: item.product_id || "",
          name: item.product_name,
          category: "Sembako",
          unitName: item.unit_name || "Pcs",
          qtySold: 0,
          omset: 0,
          hpp: 0,
          profit: 0,
        };
      }
      const qty = Number(item.qty ?? 0);
      const subtotal = Number(item.subtotal ?? 0);
      const cost = Number(item.buy_price ?? 0) * qty;

      itemMap[key].qtySold += qty;
      itemMap[key].omset += subtotal;
      itemMap[key].hpp += cost;
      itemMap[key].profit += Math.max(0, subtotal - cost);
    }

    const allAggregated = Object.values(itemMap);

    // Fast moving (Sorted by Qty Descending)
    const fast = [...allAggregated].sort((a, b) => b.qtySold - a.qtySold).slice(0, 10);

    // Products with 0 or lowest sales
    const soldProductIds = new Set(allAggregated.map((p) => p.productId).filter(Boolean));
    const unsoldProducts = rawProducts
      .filter((p) => p.is_active && !soldProductIds.has(p.id))
      .slice(0, 8);

    // Low stock products
    const lowStock = rawProducts.filter((p) => p.is_active && Number(p.stock_qty) <= Number(p.min_stock));

    return {
      fastMoving: fast,
      slowMoving: unsoldProducts,
      lowStockProducts: lowStock,
    };
  }, [filteredSaleItems, rawProducts]);

  // 3. Compute Member Belanja Summaries
  const memberSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        memberId: string;
        memberNo: string;
        fullName: string;
        department: string;
        txCount: number;
        totalSpent: number;
      }
    > = {};

    for (const sale of filteredSales) {
      if (sale.member_id || sale.members) {
        const mid = sale.member_id || sale.members?.id || "member";
        const mNo = sale.members?.member_no || "ANG-000";
        const mName = sale.members?.full_name || "Anggota Koperasi";
        const dept = sale.members?.department || "-";

        if (!map[mid]) {
          map[mid] = {
            memberId: mid,
            memberNo: mNo,
            fullName: mName,
            department: dept,
            txCount: 0,
            totalSpent: 0,
          };
        }
        map[mid].txCount += 1;
        map[mid].totalSpent += Number(sale.grand_total ?? 0);
      }
    }

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredSales]);

  // Filter member summaries by search input
  const filteredMemberSummaries = useMemo(() => {
    if (!memberSearch.trim()) return memberSummaries;
    const q = memberSearch.toLowerCase().trim();
    return memberSummaries.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
    );
  }, [memberSummaries, memberSearch]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] print:hidden">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Laporan & Analisa Bisnis Waserda Toko</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Analisa Laba Kotor, Perputaran Produk (Fast vs Slow Moving), Peringatan Stok, dan Rekap Belanja Anggota untuk SHU.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm transition-all cursor-pointer"
        >
          <Printer className="size-4" />
          <span>Cetak Laporan Analisa</span>
        </button>
      </div>

      {/* Printable Header (Visible on Print Only) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center mb-4">
        <h2 className="text-base font-black uppercase text-slate-900">
          {cooperativeProfile?.name || "KOPERASI PEGAWAI REPUBLIK INDONESIA"}
        </h2>
        {cooperativeProfile?.legal_number ? (
          <p className="text-[11px] font-semibold text-slate-600">Badan Hukum No: {cooperativeProfile.legal_number}</p>
        ) : null}
        <p className="text-xs font-bold text-slate-800">UNIT USAHA WASERDA / TOKO SEMBAKO</p>
        {cooperativeProfile?.address ? (
          <p className="text-[11px] text-slate-600">
            {cooperativeProfile.address}
            {cooperativeProfile.phone ? ` · Telp: ${cooperativeProfile.phone}` : ""}
          </p>
        ) : null}
        <div className="mt-2 border-t border-slate-300 pt-1">
          <p className="text-xs font-black uppercase tracking-wider text-slate-900">
            LAPORAN KINERJA & ANALISA LABA RUGI TOKO WASERDA
          </p>
          <p className="text-[11px] text-slate-700">
            Periode: {startDate ? `${startDate} s/d ${endDate}` : "Semua Periode"}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3 print:hidden">
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

          {(startDate || endDate || periodPreset !== "this_month") && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-[#64748b] hover:bg-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset Periode</span>
            </button>
          )}
        </div>

        {/* Date Pickers */}
        <div className="grid gap-2.5 sm:grid-cols-2 pt-2 border-t border-[#f1f5f9]">
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

      {/* Main KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Omset Total */}
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <DollarSign className="size-5 text-[#2563eb]" />
            <span className="text-[10px] font-bold bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-full">
              {filteredSales.length} Transaksi
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#64748b]">Total Omset Penjualan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{formatRupiah(totalOmset)}</p>
          <p className="text-[11px] text-[#64748b] mt-1">{totalUnitsSold} unit barang terjual</p>
        </article>

        {/* Total HPP Modal */}
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <BarChart3 className="size-5 text-[#64748b]" />
            <span className="text-[10px] font-bold bg-slate-100 text-[#475569] px-2 py-0.5 rounded-full">
              Harga Pokok Modal
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#64748b]">Total HPP (Modal Barang)</p>
          <p className="mt-0.5 text-xl font-black text-[#475569]">{formatRupiah(totalHpp)}</p>
          <p className="text-[11px] text-[#64748b] mt-1">
            {totalOmset > 0 ? `${((totalHpp / totalOmset) * 100).toFixed(1)}% dari Omset` : "0%"}
          </p>
        </article>

        {/* Laba Kotor */}
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <TrendingUp className="size-5 text-emerald-600" />
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              Margin {profitMarginPercent.toFixed(1)}%
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#64748b]">Laba Kotor Toko</p>
          <p className="mt-0.5 text-xl font-black text-emerald-600">{formatRupiah(grossProfit)}</p>
          <p className="text-[11px] text-[#64748b] mt-1">Omset dikurangi Modal HPP</p>
        </article>

        {/* Rata-rata Basket Size */}
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <ShoppingBag className="size-5 text-indigo-600" />
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              Basket Size
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#64748b]">Rata-rata Belanja / Struk</p>
          <p className="mt-0.5 text-xl font-black text-indigo-700">{formatRupiah(avgBasketSize)}</p>
          <p className="text-[11px] text-[#64748b] mt-1">Rata-rata nilai per transaksi kasir</p>
        </article>
      </section>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap rounded-2xl bg-[#e2e8f0] p-1.5 max-w-2xl border border-[#cbd5e1] print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("labarugi")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition-all cursor-pointer ${
            activeTab === "labarugi" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <TrendingUp className="size-4" />
          <span>Laba Rugi & Metode</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fastmoving")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition-all cursor-pointer ${
            activeTab === "fastmoving" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Flame className="size-4 text-amber-500" />
          <span>Produk Terlaris</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stok")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition-all cursor-pointer ${
            activeTab === "stok" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <AlertTriangle className="size-4 text-rose-500" />
          <span>Stok Menipis ({lowStockProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("member")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-black transition-all cursor-pointer ${
            activeTab === "member" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Users className="size-4" />
          <span>Belanja Anggota (SHU)</span>
        </button>
      </div>

      {/* TAB 1: LABA RUGI & METODE BAYAR */}
      {activeTab === "labarugi" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Laba Kotor Breakdown */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <TrendingUp className="size-4 text-[#2563eb]" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Rincian Perhitungan Laba Kotor Waserda</h3>
            </div>

            <div className="divide-y divide-[#e2e8f0] rounded-xl border border-[#dbe5f1] text-xs">
              <div className="flex justify-between p-3 bg-[#f8fbff]">
                <span className="font-bold text-[#475569]">Total Penjualan Kasir (Kotor)</span>
                <span className="font-black text-[#0b1220]">{formatRupiah(totalGrossSales)}</span>
              </div>
              {totalDiscounts > 0 ? (
                <div className="flex justify-between p-3">
                  <span className="font-bold text-rose-600">Dikurangi: Potongan Diskon Promo</span>
                  <span className="font-black text-rose-600">-{formatRupiah(totalDiscounts)}</span>
                </div>
              ) : null}
              <div className="flex justify-between p-3 font-bold text-[#0b1220]">
                <span>Total Omset Bersih Penjualan</span>
                <span>{formatRupiah(totalOmset)}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="font-bold text-[#64748b]">Dikurangi: Harga Pokok Penjualan (HPP Modal)</span>
                <span className="font-black text-rose-600">({formatRupiah(totalHpp)})</span>
              </div>
              <div className="flex justify-between p-3.5 bg-[#eff6ff] font-black text-sm text-[#2563eb]">
                <span>LABA KOTOR OPERASIONAL WASERDA</span>
                <span className="text-emerald-700">{formatRupiah(grossProfit)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748b] italic">
              * Laba kotor merupakan selisih antara harga jual produk dengan harga modal beli (HPP) dari supplier.
            </p>
          </section>

          {/* Payment & Customer Breakdown */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <Banknote className="size-4 text-[#2563eb]" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Komposisi Pembayaran & Pelanggan</h3>
            </div>

            <div className="space-y-3">
              {/* Payment Methods */}
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase text-[#64748b]">Berdasarkan Metode Pembayaran:</p>
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                    <p className="font-bold text-emerald-800">💵 Kas Tunai</p>
                    <p className="text-sm font-black text-emerald-900 mt-1">{formatRupiah(cashSalesTotal)}</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      {totalOmset > 0 ? `${((cashSalesTotal / totalOmset) * 100).toFixed(0)}% omset` : "0%"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                    <p className="font-bold text-blue-800">🏦 QRIS / Bank</p>
                    <p className="text-sm font-black text-blue-900 mt-1">{formatRupiah(bankSalesTotal)}</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      {totalOmset > 0 ? `${((bankSalesTotal / totalOmset) * 100).toFixed(0)}% omset` : "0%"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                    <p className="font-bold text-amber-800">💳 Potong Gaji</p>
                    <p className="text-sm font-black text-amber-900 mt-1">{formatRupiah(creditSalesTotal)}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {totalOmset > 0 ? `${((creditSalesTotal / totalOmset) * 100).toFixed(0)}% omset` : "0%"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Types */}
              <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
                <p className="text-[11px] font-black uppercase text-[#64748b]">Berdasarkan Tipe Pelanggan:</p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#0b1220]">⭐ Anggota Koperasi</p>
                      <p className="text-[11px] text-[#64748b]">Dasar alokasi SHU jasa</p>
                    </div>
                    <span className="font-black text-[#2563eb] text-sm">{formatRupiah(memberSalesTotal)}</span>
                  </div>
                  <div className="rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#0b1220]">👤 Pembeli Umum</p>
                      <p className="text-[11px] text-[#64748b]">Pelanggan reguler non-anggota</p>
                    </div>
                    <span className="font-black text-[#475569] text-sm">{formatRupiah(generalSalesTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* TAB 2: FAST & SLOW MOVING */}
      {activeTab === "fastmoving" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Fast Moving */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <Flame className="size-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Top 10 Barang Paling Laris (Fast Moving)</h3>
            </div>
            <div className="space-y-2 text-xs">
              {fastMoving.length ? (
                fastMoving.map((item, idx) => (
                  <div
                    key={item.productId || idx}
                    className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] hover:bg-[#eff6ff] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-lg text-white font-black text-[11px] ${
                        idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-[#2563eb]"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0b1220] truncate">{item.name}</p>
                        <p className="text-[11px] font-semibold text-[#64748b]">
                          Terjual: <strong className="text-[#0b1220]">{item.qtySold} {item.unitName}</strong> · Laba: {formatRupiah(item.profit)}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-[#2563eb] shrink-0 text-right">{formatRupiah(item.omset)}</span>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-[#64748b] font-bold">Belum ada data barang terjual di periode ini.</p>
              )}
            </div>
          </section>

          {/* Slow Moving */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <Snowflake className="size-5 text-sky-500" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Barang Lambat Terjual (Slow Moving / Belum Laku)</h3>
            </div>
            <div className="space-y-2 text-xs">
              {slowMoving.length ? (
                slowMoving.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-[#0b1220] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#64748b]">
                        Stok di Toko: <strong>{p.stock_qty} {p.unit_name || "Pcs"}</strong> · HPP: {formatRupiah(p.buy_price)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-[#475569] shrink-0">
                      Belum Terjual
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-[#64748b] font-bold">Semua produk aktif memiliki penjualan.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* TAB 3: STOK MENIPIS (RESTOCK ALERT) */}
      {activeTab === "stok" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">
                Peringatan Stok Menipis (Restock Alert $\le$ Min Stock)
              </h3>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-black text-rose-700">
              {lowStockProducts.length} Produk Perlu Di-Order
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Nama Produk Sembako</th>
                  <th className="px-3 py-2.5 font-bold">Kategori</th>
                  <th className="px-3 py-2.5 font-bold text-center">Sisa Stok Fisik</th>
                  <th className="px-3 py-2.5 font-bold text-center">Batas Min. Stok</th>
                  <th className="px-3 py-2.5 font-bold text-right">Harga Beli (HPP)</th>
                  <th className="px-3 py-2.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {lowStockProducts.length ? (
                  lowStockProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#fff1f2] transition-colors">
                      <td className="px-3 py-2.5 font-bold text-[#0b1220]">{prod.name}</td>
                      <td className="px-3 py-2.5 text-[#64748b]">{prod.category || "Sembako"}</td>
                      <td className="px-3 py-2.5 text-center font-black text-rose-600">
                        {prod.stock_qty} {prod.unit_name || "Pcs"}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-[#64748b]">
                        {prod.min_stock} {prod.unit_name || "Pcs"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[#0b1220]">
                        {formatRupiah(prod.buy_price)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-700">
                          <AlertTriangle className="size-3" />
                          <span>Segera Buat PO</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-emerald-600">
                      ✅ Semua stok barang toko dalam kondisi aman di atas batas minimum.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* TAB 4: BELANJA ANGGOTA (DASAR SHU) */}
      {activeTab === "member" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-xs font-black uppercase text-[#0b1220]">
                Rekapitulasi Belanja Toko Per Anggota (Dasar SHU Jasa Belanja)
              </h3>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                Data total omset transaksi anggota koperasi yang akan digunakan saat perhitungan SHU akhir tahun.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Cari nama, NIK, No. Anggota..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-8.5 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-8 pr-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                <tr>
                  <th className="px-3 py-2.5 font-bold">No. Anggota</th>
                  <th className="px-3 py-2.5 font-bold">Nama Anggota Koperasi</th>
                  <th className="px-3 py-2.5 font-bold">Departemen / Unit</th>
                  <th className="px-3 py-2.5 font-bold text-center">Jumlah Transaksi</th>
                  <th className="px-3 py-2.5 font-bold text-right">Total Belanja Toko</th>
                  <th className="px-3 py-2.5 font-bold text-right">% Kontribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredMemberSummaries.length ? (
                  filteredMemberSummaries.map((m) => {
                    const pct = memberSalesTotal > 0 ? (m.totalSpent / memberSalesTotal) * 100 : 0;
                    return (
                      <tr key={m.memberId} className="hover:bg-[#f8fbff] transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-[#2563eb]">{m.memberNo}</td>
                        <td className="px-3 py-2.5 font-bold text-[#0b1220]">{m.fullName}</td>
                        <td className="px-3 py-2.5 text-[#64748b]">{m.department}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#0b1220]">
                          {m.txCount} Transaksi
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-600">
                          {formatRupiah(m.totalSpent)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#2563eb]">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-[#64748b]">
                      Belum ada data belanja anggota pada periode terpilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Print Signatures (Print Only) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 text-center text-xs">
        <div>
          <p className="font-semibold text-slate-600">Disiapkan Oleh (Kepala Toko Waserda):</p>
          <div className="h-16"></div>
          <p className="font-bold border-t border-slate-400 pt-1">( ........................................ )</p>
        </div>
        <div>
          <p className="font-semibold text-slate-600">Mengetahui (Pengurus / Ketua Koperasi):</p>
          <div className="h-16"></div>
          <p className="font-bold border-t border-slate-400 pt-1">( ........................................ )</p>
        </div>
      </div>
    </div>
  );
}
