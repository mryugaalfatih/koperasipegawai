"use client";

import { useState } from "react";
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

export function TokoPembelianClientManager({
  poRows,
  products,
  totalPoCount,
  pendingPoCount,
}: TokoPembelianClientManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<TokoPoRow | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

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

  // Form states for creating PO with Custom Product Picker
  const [prodSearch, setProdSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<TokoProductRow | null>(null);
  const [orderQty, setOrderQty] = useState("10");
  const [poCart, setPoCart] = useState<CartPoItem[]>([]);

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

  const filteredPo = poRows.filter((p) => {
    const matchesSearch =
      !search ||
      p.po_no.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const cartTotal = poCart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <CrudHeader
        title="Surat Pesanan & Pembelian Supplier (PO)"
        subtitle="Kelola pemesanan barang sembako ke Distributor/Supplier & proses penerimaan barang masuk."
        countBadge={`${totalPoCount} Surat PO`}
        addButtonLabel="Buat Surat Pesanan (PO)"
        onAddClick={() => setIsAddModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={[
          { value: "ordered", label: "Pesanan Dikirim (Pending)" },
          { value: "received", label: "Sudah Diterima (Complete)" },
        ]}
      />

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <FileText className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Surat Pesanan PO</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{totalPoCount} PO</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Clock className={`size-5 ${pendingPoCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Menunggu Penerimaan Barang</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{pendingPoCount} Surat</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Truck className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Data Ditampilkan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{filteredPo.length} Surat</p>
        </article>
      </section>

      {/* PO Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-2 py-2 font-bold">No. Surat PO</th>
                <th className="px-2 py-2 font-bold">Tanggal Pesan</th>
                <th className="px-2 py-2 font-bold">Distributor / Supplier</th>
                <th className="px-2 py-2 font-bold">Jenis Pembayaran</th>
                <th className="px-2 py-2 font-bold text-right">Total Nilai PO</th>
                <th className="px-2 py-2 font-bold text-center">Status PO</th>
                <th className="px-2 py-2 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredPo.length ? (
                filteredPo.map((po) => (
                  <tr key={po.id} className="hover:bg-[#f8fbff] transition-colors">
                    <td className="px-2 py-2 font-bold text-[#2563eb]">{po.po_no}</td>
                    <td className="px-2 py-2 font-semibold text-[#64748b]">{po.order_date}</td>
                    <td className="px-2 py-2 font-bold text-[#0b1220]">{po.supplier_name}</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">
                        {po.payment_type === "tempo" ? "Tempo (Kredit Supplier)" : "Tunai / Cash"}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-black text-right text-[#0b1220]">
                      {formatRupiah(po.total_amount)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          po.status === "received"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {po.status === "received" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {po.status === "received" ? "Sudah Diterima" : "Pesanan Dikirim"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPo(po)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
                      >
                        <Eye className="size-3 text-[#2563eb]" />
                        <span>Detail PO</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-bold text-[#64748b]">
                    Belum ada dokumen Surat Pesanan (PO). Klik "+ Buat Surat Pesanan (PO)" untuk memesan barang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Buat Surat Pesanan PO Baru */}
      {isAddModalOpen ? (
        <CrudModal isOpen={true} maxWidth="max-w-2xl" title="Buat Surat Pesanan (PO Supplier) Baru" onClose={() => setIsAddModalOpen(false)}>
          <form action={createPurchaseOrder} className="space-y-4">
            <input type="hidden" name="items_json" value={JSON.stringify(poCart)} />

            {/* Step 1: Info Supplier */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nama Distributor / Supplier *</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                  name="supplier_name"
                  placeholder="Contoh: PT Sayap Mas Utama / Distributor Beras Jaya"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">No. Telepon / Sales</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                  name="supplier_phone"
                  placeholder="Contoh: 0812-3456-7890"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Jenis Pembayaran</span>
                <CustomSelect
                  name="payment_type"
                  defaultValue="cash"
                  className="mt-1.5 h-11"
                  options={[
                    { value: "cash", label: "💵 Tunai (Langsung Bayar)" },
                    { value: "tempo", label: "📅 Tempo (Kredit Supplier 14-30 Hari)" },
                  ]}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tgl Jatuh Tempo (Jika Tempo)</span>
                <input
                  type="date"
                  name="due_date"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                />
              </label>
            </div>

            {/* Step 2: Custom Modern Product Picker */}
            <div className="rounded-2xl border border-[#cbd5e1] bg-[#f8fbff] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0b1220] flex items-center gap-1.5">
                  <PackageCheck className="size-4 text-[#2563eb]" />
                  1. Pilih Barang dari Katalog Sembako
                </span>
                <span className="text-[11px] font-semibold text-[#64748b]">
                  {products.length} Barang Tersedia
                </span>
              </div>

              {/* Custom Search & Dropdown Combobox */}
              <div className="relative">
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-[#cbd5e1] bg-white px-2 text-xs font-bold text-[#0b1220] shadow-xs hover:border-[#2563eb] transition-all"
                >
                  {selectedProd ? (
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-[#2563eb]" />
                      <span className="font-black text-sm text-[#0b1220]">{selectedProd.name}</span>
                      <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                        HPP: {formatRupiah(selectedProd.buy_price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#94a3b8]">-- Klik untuk mencari / memilih barang sembako --</span>
                  )}
                  <ChevronDown className={`size-4 text-[#64748b] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </div>

                {/* Dropdown Menu Popup */}
                {isDropdownOpen ? (
                  <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#cbd5e1] bg-white p-2 shadow-xl">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-2.5 size-4 text-[#94a3b8]" />
                      <input
                        type="text"
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        placeholder="Ketik nama atau kategori barang..."
                        className="h-9 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fbff] pl-9 pr-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      {filteredCatalog.length ? (
                        filteredCatalog.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 hover:bg-[#eff6ff] transition-colors"
                          >
                            <div>
                              <p className="font-bold text-xs text-[#0b1220]">{prod.name}</p>
                              <p className="text-[11px] font-semibold text-[#64748b]">
                                Satuan: {prod.unit_name ?? "Pcs"} · Stok Saat Ini: {prod.stock_qty}
                              </p>
                            </div>
                            <span className="rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-xs font-black text-[#2563eb]">
                              HPP: {formatRupiah(prod.buy_price)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="p-4 text-center text-xs font-bold text-[#64748b]">
                          Tidak ada barang ditemukan.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Quantity Input & Add Button */}
              {selectedProd ? (
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-[#2563eb] shadow-xs">
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase text-[#64748b]">Jumlah Order (Qty)</p>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={orderQty}
                        onChange={(e) => setOrderQty(e.target.value)}
                        className="h-10 w-28 rounded-xl border border-[#cbd5e1] bg-[#f8fbff] px-2 text-sm font-black outline-none focus:border-[#2563eb]"
                      />
                      <span className="font-bold text-xs text-[#475569]">{selectedProd.unit_name ?? "Pcs"}</span>
                    </div>
                  </div>

                  <div className="text-right pr-2">
                    <p className="text-[11px] font-bold uppercase text-[#64748b]">Subtotal Estimate</p>
                    <p className="text-sm font-black text-[#2563eb]">
                      {formatRupiah((Number(orderQty) || 1) * selectedProd.buy_price)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItemToPoCart}
                    className="h-10 rounded-xl bg-[#2563eb] px-2 text-xs font-bold text-white hover:bg-[#1d4ed8] shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="size-4" />
                    <span>Tambahkan Barang</span>
                  </button>
                </div>
              ) : null}

              {/* Step 3: PO Cart Items Table */}
              <div className="pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#0b1220] flex items-center gap-1.5 mb-2">
                  <ShoppingBag className="size-4 text-[#2563eb]" />
                  2. Daftar Barang Dalam Surat Pesanan ({poCart.length} Item)
                </span>

                <div className="space-y-2">
                  {poCart.length ? (
                    poCart.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between rounded-xl bg-white p-3 border border-[#cbd5e1] shadow-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="font-bold text-xs text-[#0b1220] truncate">{item.product_name}</p>
                          <p className="text-[11px] font-semibold text-[#64748b]">
                            {item.qty_ordered} {item.unit_name} × {formatRupiah(item.buy_price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-sm text-[#0b1220]">
                            {formatRupiah(item.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePoItem(item.product_id)}
                            className="rounded-lg p-1.5 text-[#94a3b8] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#cbd5e1] p-6 text-center text-xs font-bold text-[#94a3b8]">
                      Belum ada barang di-order. Pilih barang di atas lalu klik "+ Tambahkan Barang".
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Grand Total */}
              <div className="flex justify-between items-center pt-3 border-t border-[#cbd5e1] font-bold text-xs">
                <span className="text-[#0b1220] font-black uppercase">TOTAL NILAI SURAT PESANAN (PO):</span>
                <span className="text-base font-black text-[#2563eb]">{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Catatan Tambahan</span>
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
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center">
              <h2 className="text-base font-black uppercase text-slate-900">KOPERASI PEGAWAI REPUBLIK INDONESIA</h2>
              <p className="text-xs font-bold text-slate-700">UNIT USAHA WASERDA / TOKO SEMBAKO</p>
              <p className="text-[11px] font-semibold text-slate-500">SURAT PESANAN BARANG (PURCHASE ORDER)</p>
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
