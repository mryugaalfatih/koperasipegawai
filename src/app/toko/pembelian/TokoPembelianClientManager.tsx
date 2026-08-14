"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  ShoppingBag,
  Store,
  PackageCheck,
  ChevronDown,
  Tag,
  Boxes,
  Printer,
  Calendar,
  RotateCcw,
  Banknote,
  CreditCard,
  Building2,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { createPurchaseOrder, receivePurchaseOrder } from "../actions";
import { TokoProductRow } from "../produk/TokoProdukClientManager";

export type TokoPoRow = {
  id: string;
  po_no: string;
  order_date: string;
  supplier_name: string;
  supplier_phone: string | null;
  status: "ordered" | "received" | "cancelled";
  total_amount: number;
  payment_type: "cash" | "tempo";
  due_date: string | null;
  notes: string | null;
  created_at: string;
  toko_purchase_order_items?: {
    product_name: string;
    qty_ordered: number;
    unit_name: string;
    buy_price: number;
    subtotal: number;
  }[];
};

type TokoPembelianClientManagerProps = {
  poRows: TokoPoRow[];
  products: TokoProductRow[];
  totalPoCount: number;
  pendingPoCount: number;
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

type CartPoItem = {
  product_id: string;
  product_name: string;
  qty_ordered: number;
  unit_name: string;
  buy_price: number;
  subtotal: number;
};

function getStartOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function getEndOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function TokoPembelianClientManager({
  poRows,
  products,
  cooperativeProfile,
}: TokoPembelianClientManagerProps) {
  const [periodPreset, setPeriodPreset] = useState<"this_month" | "all" | "today" | "last_month" | "this_year" | "custom">("this_month");
  const [startDate, setStartDate] = useState<string>(getStartOfMonth());
  const [endDate, setEndDate] = useState<string>(getEndOfMonth());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<TokoPoRow | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  // Form states for creating PO with Custom Product Picker
  const [prodSearch, setProdSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<TokoProductRow | null>(null);
  const [orderQty, setOrderQty] = useState("10");
  const [poCart, setPoCart] = useState<CartPoItem[]>([]);

  // Apply preset dates
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
    setStatusFilter("all");
    setPaymentFilter("all");
  };

  const handleReceivePo = async (po: TokoPoRow) => {
    if (isReceiving || po.status === "received") return;
    if (
      !confirm(
        `Konfirmasi penerimaan barang untuk PO #${po.po_no} dari ${po.supplier_name}?\n\nStok fisik toko akan otomatis bertambah dan langsung terjurnal di akuntansi & kas.`
      )
    ) {
      return;
    }
    setIsReceiving(true);
    const poId = po.id;
    setSelectedPo(null);
    try {
      await receivePurchaseOrder(poId);
    } catch (err) {
      console.error("Gagal memproses PO:", err);
    } finally {
      setIsReceiving(false);
    }
  };

  const filteredCatalog = products.filter(
    (p) =>
      !prodSearch ||
      p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(prodSearch.toLowerCase()))
  );

  const handleSelectProduct = (prod: TokoProductRow) => {
    setSelectedProd(prod);
    setIsDropdownOpen(false);
    setProdSearch("");
  };

  const addItemToPoCart = () => {
    if (!selectedProd) return;

    const qty = Math.max(1, Number(orderQty) || 1);
    const price = Number(selectedProd.buy_price) || 0;

    setPoCart((prev) => {
      const existing = prev.find((item) => item.product_id === selectedProd.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === selectedProd.id
            ? { ...item, qty_ordered: item.qty_ordered + qty, subtotal: (item.qty_ordered + qty) * item.buy_price }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: selectedProd.id,
          product_name: selectedProd.name,
          qty_ordered: qty,
          unit_name: selectedProd.unit_name ?? "Pcs",
          buy_price: price,
          subtotal: price * qty,
        },
      ];
    });

    setSelectedProd(null);
    setOrderQty("10");
  };

  const removePoItem = (prodId: string) => {
    setPoCart((prev) => prev.filter((item) => item.product_id !== prodId));
  };

  // Filtered PO Logic
  const filteredPo = useMemo(() => {
    return poRows.filter((p) => {
      // 1. Date filter
      if (startDate && p.order_date < startDate) return false;
      if (endDate && p.order_date > endDate) return false;

      // 2. Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      // 3. Payment type filter
      if (paymentFilter !== "all" && p.payment_type !== paymentFilter) return false;

      // 4. Search text (PO No, Supplier Name, Item Name)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchPo = p.po_no.toLowerCase().includes(q);
        const matchSupplier = p.supplier_name.toLowerCase().includes(q) || (p.supplier_phone ?? "").includes(q);
        const matchNotes = (p.notes ?? "").toLowerCase().includes(q);
        const matchItem = (p.toko_purchase_order_items ?? []).some((item) =>
          item.product_name.toLowerCase().includes(q)
        );
        if (!matchPo && !matchSupplier && !matchNotes && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [poRows, startDate, endDate, statusFilter, paymentFilter, search]);

  // Totals calculations
  const { totalFilteredAmount, pendingCount, receivedCount, tempoAmount } = useMemo(() => {
    let total = 0;
    let pending = 0;
    let received = 0;
    let tempo = 0;

    for (const p of filteredPo) {
      const amt = Number(p.total_amount ?? 0);
      total += amt;
      if (p.status === "ordered") pending++;
      if (p.status === "received") received++;
      if (p.payment_type === "tempo") tempo += amt;
    }

    return {
      totalFilteredAmount: total,
      pendingCount: pending,
      receivedCount: received,
      tempoAmount: tempo,
    };
  }, [filteredPo]);

  const cartTotal = poCart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Truck className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Surat Pesanan & Pembelian Supplier (PO)</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Kelola pemesanan kulakan barang sembako ke Supplier, cetak dokumen PO resmi, dan proses penerimaan stok.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm transition-all cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Buat Surat Pesanan (PO)</span>
        </button>
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

          {(startDate || endDate || search || statusFilter !== "all" || paymentFilter !== "all" || periodPreset !== "this_month") && (
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

        {/* 2. Status PO & Payment Type Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f1f5f9]">
          <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
            <PackageCheck className="size-3.5 text-[#2563eb]" /> Status PO:
          </span>
          {[
            { id: "all", label: "Semua Status" },
            { id: "ordered", label: "⏳ Menunggu Barang (Ordered)" },
            { id: "received", label: "✅ Sudah Diterima (Received)" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === s.id
                  ? "bg-[#0b1220] text-white shadow-sm"
                  : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
              }`}
            >
              {s.label}
            </button>
          ))}

          <span className="text-xs font-bold text-[#64748b] ml-2 mr-1 flex items-center gap-1">
            <Banknote className="size-3.5 text-[#2563eb]" /> Jenis Bayar:
          </span>
          {[
            { id: "all", label: "Semua Jenis" },
            { id: "cash", label: "💵 Tunai / Cash" },
            { id: "tempo", label: "⏳ Tempo / Hutang" },
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
            <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Cari No. PO / Supplier / Nama Barang</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="No PO / Nama Distributor Supplier / Item Barang..."
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
            <FileText className="size-5 text-[#2563eb]" />
            <span className="text-[10px] font-bold text-[#64748b]">Total Surat PO</span>
          </div>
          <p className="mt-2 text-xl font-black text-[#0b1220]">{filteredPo.length} Surat</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">{receivedCount} sudah diterima</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Clock className={`size-5 ${pendingCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              pendingCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}>
              Menunggu Barang
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-[#0b1220]">{pendingCount} PO Pending</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Belum masuk stok fisik</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Store className="size-5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Total Pembelian</span>
          </div>
          <p className="mt-2 text-xl font-black text-emerald-600">{formatRupiah(totalFilteredAmount)}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Nilai barang kulakan</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <CreditCard className="size-5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Hutang Tempo</span>
          </div>
          <p className="mt-2 text-xl font-black text-amber-600">{formatRupiah(tempoAmount)}</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Kewajiban supplier</p>
        </article>
      </section>

      {/* PO Transactions Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-2.5 font-bold">No. PO</th>
                <th className="px-3 py-2.5 font-bold">Tanggal Pesan</th>
                <th className="px-3 py-2.5 font-bold">Distributor / Supplier</th>
                <th className="px-3 py-2.5 font-bold">Rincian Barang</th>
                <th className="px-3 py-2.5 font-bold">Jenis Bayar</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-3 py-2.5 font-bold text-right">Total Nilai PO</th>
                <th className="px-3 py-2.5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredPo.length ? (
                filteredPo.map((po) => {
                  const itemCount = po.toko_purchase_order_items?.length ?? 0;
                  const firstItem = po.toko_purchase_order_items?.[0]?.product_name ?? "";
                  const otherCount = itemCount > 1 ? ` +${itemCount - 1} barang lainnya` : "";

                  return (
                    <tr key={po.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-[#2563eb]">
                        {po.po_no}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#64748b]">
                        {po.order_date}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[#0b1220]">
                        <div>{po.supplier_name}</div>
                        {po.supplier_phone ? (
                          <div className="text-[10px] text-[#64748b] font-normal">{po.supplier_phone}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#0b1220] max-w-[200px] truncate">
                        {firstItem ? (
                          <span title={po.toko_purchase_order_items?.map((i) => `${i.product_name} (${i.qty_ordered} ${i.unit_name})`).join(", ")}>
                            {firstItem}{otherCount}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] italic">Tidak ada item</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            po.payment_type === "cash"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.payment_type === "cash" ? "💵 Tunai / Cash" : "⏳ Tempo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            po.status === "received"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.status === "received" ? "✅ Diterima" : "⏳ Menunggu"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-black text-right text-[#0b1220]">
                        {formatRupiah(po.total_amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPo(po)}
                            className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#dbe5f1] transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="size-3.5 text-[#2563eb]" />
                            <span>Detail & Cetak</span>
                          </button>

                          {po.status !== "received" ? (
                            <button
                              type="button"
                              disabled={isReceiving}
                              onClick={() => handleReceivePo(po)}
                              className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Konfirmasi Penerimaan Barang Masuk"
                            >
                              <PackageCheck className="size-3.5" />
                              <span>Terima</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center font-bold text-[#64748b]">
                    Tidak ada surat pesanan PO yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Buat PO Baru */}
      {isAddModalOpen ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-2xl"
          title="Buat Surat Pesanan Supplier (PO Baru)"
          onClose={() => setIsAddModalOpen(false)}
        >
          <form action={createPurchaseOrder} className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold text-[#475569]">Nama Distributor / Supplier *</span>
                <input
                  type="text"
                  name="supplier_name"
                  required
                  placeholder="Contoh: PT. Sumber Pangan Jaya"
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">No. Telepon / Sales *</span>
                <input
                  type="text"
                  name="supplier_phone"
                  required
                  placeholder="Contoh: 08123456789"
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="font-bold text-[#475569]">Tanggal Pesan *</span>
                <input
                  type="date"
                  name="order_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">Jenis Pembayaran *</span>
                <CustomSelect
                  name="payment_type"
                  required
                  defaultValue="cash"
                  className="mt-1"
                  options={[
                    { value: "cash", label: "💵 Tunai / Cash" },
                    { value: "tempo", label: "⏳ Tempo (Hutang Supplier)" },
                  ]}
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">Jatuh Tempo (Jika Tempo)</span>
                <input
                  type="date"
                  name="due_date"
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>
            </div>

            {/* Custom Product Selection Area */}
            <div className="rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-3 space-y-3">
              <span className="font-black text-xs text-[#0b1220]">Tambah Barang Pesanan ke PO</span>

              <div className="grid gap-2 sm:grid-cols-[1fr_90px_auto]">
                <div className="relative">
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex h-11 cursor-pointer items-center justify-between rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold"
                  >
                    <span className={selectedProd ? "text-[#0b1220]" : "text-[#94a3b8]"}>
                      {selectedProd
                        ? `${selectedProd.name} (HPP: ${formatRupiah(selectedProd.buy_price)})`
                        : "Pilih Barang dari Master Produk..."}
                    </span>
                    <ChevronDown className="size-4 text-[#64748b]" />
                  </div>

                  {isDropdownOpen ? (
                    <div className="absolute left-0 top-12 z-50 w-full rounded-xl border border-[#cbd5e1] bg-white p-2 shadow-xl">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-[#94a3b8]" />
                        <input
                          type="text"
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          placeholder="Cari nama barang..."
                          className="h-8.5 w-full rounded-lg border border-[#e2e8f0] bg-[#f8fbff] pl-7 pr-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredCatalog.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs hover:bg-[#eff6ff]"
                          >
                            <span className="font-bold text-[#0b1220]">{p.name}</span>
                            <span className="text-[11px] font-bold text-[#2563eb]">
                              HPP: {formatRupiah(p.buy_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    placeholder="Qty"
                    className="h-11 w-full rounded-xl border border-[#dbe5f1] bg-white px-2 text-center text-xs font-bold outline-none focus:border-[#2563eb]"
                  />
                </div>

                <button
                  type="button"
                  onClick={addItemToPoCart}
                  disabled={!selectedProd}
                  className="h-11 rounded-xl bg-[#2563eb] px-4 font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-40 cursor-pointer"
                >
                  + Tambah
                </button>
              </div>

              {/* Items in Cart Table */}
              {poCart.length ? (
                <div className="rounded-xl border border-[#dbe5f1] bg-white overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                      <tr>
                        <th className="px-2.5 py-2 font-bold">Barang</th>
                        <th className="px-2.5 py-2 font-bold text-center">Qty</th>
                        <th className="px-2.5 py-2 font-bold text-right">Harga HPP</th>
                        <th className="px-2.5 py-2 font-bold text-right">Subtotal</th>
                        <th className="px-2.5 py-2 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {poCart.map((item) => (
                        <tr key={item.product_id}>
                          <td className="px-2.5 py-2 font-bold text-[#0b1220]">{item.product_name}</td>
                          <td className="px-2.5 py-2 text-center font-bold">
                            {item.qty_ordered} {item.unit_name}
                          </td>
                          <td className="px-2.5 py-2 text-right">{formatRupiah(item.buy_price)}</td>
                          <td className="px-2.5 py-2 text-right font-black text-[#0b1220]">
                            {formatRupiah(item.subtotal)}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removePoItem(item.product_id)}
                              className="text-[#94a3b8] hover:text-rose-600"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between bg-[#f8fbff] px-3 py-2.5 font-black text-xs border-t border-[#dbe5f1]">
                    <span>TOTAL PO:</span>
                    <span className="text-[#2563eb] text-sm">{formatRupiah(cartTotal)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Hidden Input for Cart Items JSON */}
            <input type="hidden" name="items_json" value={JSON.stringify(poCart)} />

            <label className="block">
              <span className="font-bold text-[#475569]">Catatan Tambahan PO</span>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Kirim sebelum tanggal 15 / Pengiriman pagi"
                className="h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </label>

            <SubmitButton className="h-12 w-full rounded-xl bg-[#2563eb] text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm">
              Terbitkan Surat Pesanan PO
            </SubmitButton>
          </form>
        </CrudModal>
      ) : null}

      {/* Modal Detail PO & Receiving Process */}
      {selectedPo ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-2xl"
          title={`Detail Surat Pesanan: ${selectedPo.po_no}`}
          onClose={() => setSelectedPo(null)}
        >
          <div className="space-y-4 text-xs">
            {/* Printable Header (Visible on Print) */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center mb-3">
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
                  {cooperativeProfile.email ? ` · Email: ${cooperativeProfile.email}` : ""}
                </p>
              ) : null}
              <div className="mt-2 border-t border-slate-300 pt-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">SURAT PESANAN BARANG (PURCHASE ORDER)</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-1.5 print:bg-white print:border-slate-300">
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">No. Dokumen PO:</span>
                <span className="font-bold text-[#2563eb] print:text-black">{selectedPo.po_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Distributor / Supplier:</span>
                <span className="font-bold text-[#0b1220]">{selectedPo.supplier_name} {selectedPo.supplier_phone ? `(${selectedPo.supplier_phone})` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Tanggal Pesan:</span>
                <span className="font-bold">{selectedPo.order_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Jenis Pembayaran:</span>
                <span className="font-bold">
                  {selectedPo.payment_type === "tempo" ? `Tempo (Jatuh Tempo: ${selectedPo.due_date ?? "-"})` : "Tunai / Cash"}
                </span>
              </div>
              <div className="flex justify-between print:hidden">
                <span className="text-[#64748b] font-semibold">Status Penerimaan:</span>
                <span
                  className={`font-bold ${
                    selectedPo.status === "received" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {selectedPo.status === "received" ? "✅ Sudah Diterima (Stok Bertambah & Terjurnal)" : "⏳ Belum Diterima (Pesanan Dikirim)"}
                </span>
              </div>
              {selectedPo.notes ? (
                <div className="flex justify-between">
                  <span className="text-[#64748b] font-semibold">Catatan:</span>
                  <span className="font-medium text-slate-700">{selectedPo.notes}</span>
                </div>
              ) : null}
            </div>

            {/* Items Table */}
            <div className="rounded-xl border border-[#dbe5f1] overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1] print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="px-2 py-2 font-bold">Barang Sembako</th>
                    <th className="px-2 py-2 font-bold text-center">Qty Pesanan</th>
                    <th className="px-2 py-2 font-bold text-right">Harga HPP</th>
                    <th className="px-2 py-2 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {selectedPo.toko_purchase_order_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2 font-bold text-[#0b1220]">{item.product_name}</td>
                      <td className="px-2 py-2 text-center font-bold">
                        {item.qty_ordered} {item.unit_name}
                      </td>
                      <td className="px-2 py-2 text-right">{formatRupiah(item.buy_price)}</td>
                      <td className="px-2 py-2 text-right font-black">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-[#0b1220] p-3 text-white flex justify-between items-center font-black print:bg-slate-100 print:text-black print:border print:border-slate-300">
              <span>TOTAL VALUE PO:</span>
              <span className="text-emerald-400 text-sm print:text-black">{formatRupiah(selectedPo.total_amount)}</span>
            </div>

            {/* Print Signatures (Visible on Print Only) */}
            <div className="hidden print:grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div>
                <p className="font-semibold text-slate-600">Dipesan Oleh (Admin Toko):</p>
                <div className="h-16"></div>
                <p className="font-bold border-t border-slate-400 pt-1">( ........................................ )</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Diterima / Disetujui (Supplier):</p>
                <div className="h-16"></div>
                <p className="font-bold border-t border-slate-400 pt-1">{selectedPo.supplier_name}</p>
              </div>
            </div>

            {/* Screen Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 print:hidden">
              {selectedPo.status !== "received" ? (
                <button
                  type="button"
                  disabled={isReceiving}
                  onClick={() => handleReceivePo(selectedPo)}
                  className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  <span>{isReceiving ? "Memproses Penerimaan..." : "PROSES PENERIMAAN BARANG (STOCK MASUK)"}</span>
                </button>
              ) : (
                <div className="flex-1 rounded-xl bg-emerald-50 p-2.5 text-center font-bold text-emerald-800 border border-emerald-300">
                  ✅ Barang Pesanan Telah Diterima & Terjurnal
                </div>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-slate-50 shadow-sm cursor-pointer"
              >
                <Printer className="size-4 text-[#2563eb]" />
                <span>Cetak PO</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPo(null)}
                className="h-11 rounded-xl bg-[#f1f5f9] px-3 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </div>
  );
}
