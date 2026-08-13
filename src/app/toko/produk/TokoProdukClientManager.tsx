"use client";

import { useState } from "react";
import {
  Store,
  Plus,
  Search,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Tag,
  Barcode,
  Boxes,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { SubmitButton } from "@/components/SubmitButton";
import { createTokoProduct, updateTokoProduct, adjustTokoStock } from "../actions";

import { TokoStockMutationRow } from "./page";

export type TokoProductRow = {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit_name: string | null;
  buy_price: number;
  sell_price_general: number;
  sell_price_member: number;
  stock_qty: number;
  min_stock: number;
  is_active: boolean;
};

type TokoProdukClientManagerProps = {
  productRows: TokoProductRow[];
  stockMutations?: TokoStockMutationRow[];
  totalProducts: number;
  lowStockCount: number;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoProdukClientManager({
  productRows,
  stockMutations = [],
  totalProducts,
  lowStockCount,
}: TokoProdukClientManagerProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "stock">("catalog");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<TokoProductRow | null>(null);
  const [selectedStockProduct, setSelectedStockProduct] = useState<TokoProductRow | null>(null);
  const [selectedCardProduct, setSelectedCardProduct] = useState<TokoProductRow | null>(null);

  const categories = Array.from(new Set(productRows.map((p) => p.category ?? "Sembako"))).filter(Boolean);

  const filteredProducts = productRows.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !categoryFilter || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <CrudHeader
        title="Pengelolaan Waserda Toko"
        subtitle="Modul terpisah untuk Master Katalog Barang Sembako & Kontrol Kuantitas Stok Opname."
        countBadge={`${totalProducts} Produk`}
        addButtonLabel="Tambah Produk Sembako"
        onAddClick={() => setIsAddModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={categoryFilter}
        onStatusFilterChange={setCategoryFilter}
        statusOptions={categories.map((c) => ({ value: c, label: c }))}
      />

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Package className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Jenis Barang</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{totalProducts} Item</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <AlertTriangle className={`size-5 ${lowStockCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Stok Menipis / Perlu Reorder</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{lowStockCount} Item</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <CheckCircle2 className="size-5 text-[#16a34a]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Barang Ditampilkan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{filteredProducts.length} Item</p>
        </article>
      </section>

      {/* Tab Switcher (Master Katalog vs Kontrol Stok) */}
      <div className="flex rounded-2xl bg-[#e2e8f0] p-1.5 max-w-md border border-[#cbd5e1]">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all ${
            activeTab === "catalog"
              ? "bg-white text-[#2563eb] shadow-sm"
              : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Package className="size-4" />
          <span>Tab 1: Master Katalog & Harga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all ${
            activeTab === "stock"
              ? "bg-white text-[#2563eb] shadow-sm"
              : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Boxes className="size-4" />
          <span>Tab 2: Stok & Opname</span>
          {lowStockCount > 0 ? (
            <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-black">
              {lowStockCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Content TAB 1: Master Katalog & Harga */}
      {activeTab === "catalog" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Katalog Master Barang, Harga HPP, Harga Umum & Harga Anggota
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                <tr>
                  <th className="px-3 py-3 font-bold">Produk Sembako</th>
                  <th className="px-3 py-3 font-bold">Kategori</th>
                  <th className="px-3 py-3 font-bold text-right">HPP (Modal)</th>
                  <th className="px-3 py-3 font-bold text-right">Harga Umum</th>
                  <th className="px-3 py-3 font-bold text-right">Harga Anggota</th>
                  <th className="px-3 py-3 font-bold text-center">Status</th>
                  <th className="px-3 py-3 font-bold text-center">Aksi Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#f8fbff] transition-colors">
                      <td className="px-3 py-3 font-bold text-[#0b1220]">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf2ff] text-[#2563eb]">
                            <Store className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0b1220]">{product.name}</p>
                            <p className="text-[11px] font-semibold text-[#64748b]">
                              Barcode: {product.barcode ?? "-"} · Satuan: {product.unit_name ?? "Pcs"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">
                          {product.category ?? "Sembako"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-right text-[#64748b]">
                        {formatRupiah(product.buy_price)}
                      </td>
                      <td className="px-3 py-3 font-bold text-right text-[#0b1220]">
                        {formatRupiah(product.sell_price_general)}
                      </td>
                      <td className="px-3 py-3 font-bold text-right text-[#2563eb]">
                        {formatRupiah(product.sell_price_member)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            product.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {product.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEditProduct(product)}
                          className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
                        >
                          <Pencil className="size-3 text-[#2563eb]" />
                          <span>Edit Master</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-bold text-[#64748b]">
                      Belum ada produk. Klik "+ Tambah Produk Sembako" untuk membuat master produk baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Content TAB 2: Kontrol Stok & Opname Barang */}
      {activeTab === "stock" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Pengawasan Kuantitas Stok, Alert Reorder & Form Adjustment Opname
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                <tr>
                  <th className="px-3 py-3 font-bold">Produk Sembako</th>
                  <th className="px-3 py-3 font-bold text-center">Satuan</th>
                  <th className="px-3 py-3 font-bold text-center">Batas Min. Stok</th>
                  <th className="px-3 py-3 font-bold text-center">Sisa Stok Fisik</th>
                  <th className="px-3 py-3 font-bold text-center">Status Reorder</th>
                  <th className="px-3 py-3 font-bold text-center">Input Pasokan / Opname</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredProducts.length ? (
                  filteredProducts.map((product) => {
                    const isLow = product.stock_qty <= product.min_stock;
                    return (
                      <tr key={product.id} className="hover:bg-[#f8fbff] transition-colors">
                        <td className="px-3 py-3 font-bold text-[#0b1220]">
                          <p className="font-bold text-sm text-[#0b1220]">{product.name}</p>
                          <p className="text-[11px] font-semibold text-[#64748b]">
                            BC: {product.barcode ?? "-"} · Kategori: {product.category ?? "Sembako"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-[#64748b]">
                          {product.unit_name ?? "Pcs"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-[#64748b]">
                          {product.min_stock} {product.unit_name ?? "Pcs"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-black text-sm ${
                              isLow ? "text-amber-600" : "text-[#0b1220]"
                            }`}
                          >
                            {product.stock_qty} {product.unit_name ?? "Pcs"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              isLow
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {isLow ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
                            {isLow ? "Perlu Reorder (Menipis)" : "Stok Aman"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCardProduct(product)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#f1f5f9] px-3 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
                            >
                              <Layers className="size-3.5 text-[#2563eb]" />
                              <span>Kartu Stok</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedStockProduct(product)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                            >
                              <Plus className="size-3.5" />
                              <span>Input Pasokan / Opname</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-[#64748b]">
                      Belum ada data barang.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Modal Tambah Produk Baru */}
      {isAddModalOpen ? (
        <CrudModal isOpen={true} title="Tambah Produk Sembako Baru" onClose={() => setIsAddModalOpen(false)}>
          <form action={createTokoProduct} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Barang Sembako *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                name="name"
                placeholder="Contoh: Beras Ramos Super 5kg"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Barcode / SKU</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="barcode"
                  placeholder="Scan atau Kosongkan Auto-gen"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Kategori</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="category"
                  defaultValue="Sembako"
                  placeholder="Sembako, Minuman, Bumbu, dll"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Satuan Barang</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="unit_name"
                  defaultValue="Pcs"
                  placeholder="Pcs, Kg, Liter, Sak, Dus"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Stok Awal</span>
                <input
                  type="number"
                  step="any"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="stock_qty"
                  defaultValue="100"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">HPP (Harga Modal)</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="buy_price"
                  placeholder="Rp 0"
                  defaultValue="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Harga Jual Umum</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="sell_price_general"
                  placeholder="Rp 0"
                  defaultValue="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#2563eb]">Harga Anggota</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#2563eb] bg-[#eff6ff] px-4 text-xs font-bold outline-none text-[#1d4ed8]"
                  name="sell_price_member"
                  placeholder="Harga Khusus"
                  defaultValue="0"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Batas Minimum Stok (Alert)</span>
              <input
                type="number"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                name="min_stock"
                defaultValue="5"
              />
            </label>

            <SubmitButton className="h-11 w-full rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Produk Sembako
            </SubmitButton>
          </form>
        </CrudModal>
      ) : null}

      {/* Modal Edit Master Product */}
      {selectedEditProduct ? (
        <CrudModal isOpen={true} title="Edit Master & Harga Produk" onClose={() => setSelectedEditProduct(null)}>
          <form action={updateTokoProduct.bind(null, selectedEditProduct.id)} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Barang Sembako *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                name="name"
                defaultValue={selectedEditProduct.name}
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Barcode / SKU</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="barcode"
                  defaultValue={selectedEditProduct.barcode ?? ""}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Kategori</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="category"
                  defaultValue={selectedEditProduct.category ?? "Sembako"}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Satuan</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="unit_name"
                  defaultValue={selectedEditProduct.unit_name ?? "Pcs"}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Batas Minimum Stok</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="min_stock"
                  defaultValue={selectedEditProduct.min_stock}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">HPP (Modal)</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="buy_price"
                  defaultValue={selectedEditProduct.buy_price}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Harga Umum</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                  name="sell_price_general"
                  defaultValue={selectedEditProduct.sell_price_general}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#2563eb]">Harga Anggota</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#2563eb] bg-[#eff6ff] px-4 text-xs font-bold outline-none text-[#1d4ed8]"
                  name="sell_price_member"
                  defaultValue={selectedEditProduct.sell_price_member}
                />
              </label>
            </div>

            <input type="hidden" name="stock_qty" value={selectedEditProduct.stock_qty} />
            <input type="hidden" name="is_active" value="true" />

            <SubmitButton className="h-11 w-full rounded-xl bg-[#0b1220] text-xs font-bold text-white hover:bg-slate-800">
              Simpan Master Produk & Harga
            </SubmitButton>
          </form>
        </CrudModal>
      ) : null}

      {/* Modal Input Pasokan / Adjustment Stok Opname (Tab 2) */}
      {selectedStockProduct ? (
        <CrudModal
          isOpen={true}
          title={`Input Pasokan / Opname Stok: ${selectedStockProduct.name}`}
          onClose={() => setSelectedStockProduct(null)}
        >
          <form action={adjustTokoStock.bind(null, selectedStockProduct.id)} className="space-y-4">
            <div className="rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] text-xs space-y-1">
              <p className="font-bold text-[#0b1220]">{selectedStockProduct.name}</p>
              <p className="text-[#64748b]">
                Stok Fisik Saat Ini: <span className="font-bold text-[#2563eb]">{selectedStockProduct.stock_qty} {selectedStockProduct.unit_name ?? "Pcs"}</span>
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Jenis Penyesuaian</span>
              <select
                name="type"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
              >
                <option value="in">📥 + Tambah Pasokan Stok Masuk (Distributor / Supplier)</option>
                <option value="retur_in">↩️ + Retur Penjualan (Pengembalian dari Pembeli)</option>
                <option value="damage">⚠️ - Barang Rusak / Expired / Pecah (Kerugian Toko)</option>
                <option value="retur_out">🚚 - Retur Pembelian (Pengembalian ke Supplier)</option>
                <option value="opname">🔄 Set Jumlah Fisik Hasil Stock Opname</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Jumlah Kuantitas Barang</span>
              <input
                type="number"
                step="any"
                name="qty"
                placeholder="Jumlah kuantitas"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Catatan / Keterangan</span>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Pasokan Dari Distributor PT Sembako Jaya / Opname Rutin"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none"
              />
            </label>

            <SubmitButton className="h-11 w-full rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Penyesuaian Stok
            </SubmitButton>
          </form>
        </CrudModal>
      ) : null}

      {/* Modal Kartu Stok (Stock Ledger) */}
      {selectedCardProduct ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-3xl"
          title={`📋 Kartu Stok Barang: ${selectedCardProduct.name}`}
          subtitle={`Barcode: ${selectedCardProduct.barcode ?? "-"} · Satuan: ${selectedCardProduct.unit_name ?? "Pcs"} · Sisa Stok Fisik: ${selectedCardProduct.stock_qty} ${selectedCardProduct.unit_name ?? "Pcs"}`}
          onClose={() => setSelectedCardProduct(null)}
        >
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Waktu / Tanggal</th>
                    <th className="px-3 py-2 font-bold">Jenis Mutasi</th>
                    <th className="px-3 py-2 font-bold text-center">Masuk (+)</th>
                    <th className="px-3 py-2 font-bold text-center">Keluar (-)</th>
                    <th className="px-3 py-2 font-bold text-center">Stok Akhir</th>
                    <th className="px-3 py-2 font-bold">Ref / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {(() => {
                    const productMutations = stockMutations.filter(
                      (m) => m.product_id === selectedCardProduct.id
                    );
                    if (productMutations.length) {
                      return productMutations.map((m) => {
                        const isIn = m.mutation_type === "in" || m.qty_in > 0;
                        return (
                          <tr key={m.id} className="hover:bg-[#f8fbff]">
                            <td className="px-3 py-2 font-semibold text-[#64748b]">
                              {new Date(m.mutation_date).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-3 py-2">
                              {(() => {
                                const t = m.mutation_type;
                                if (t === "in") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">📥 Pasokan Masuk</span>;
                                if (t === "retur_in") return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">↩️ Retur Penjualan</span>;
                                if (t === "damage") return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">⚠️ Barang Rusak / Expired</span>;
                                if (t === "retur_out") return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">🚚 Retur ke Supplier</span>;
                                if (t === "opname") return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">🔄 Stock Opname</span>;
                                return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">📤 Penjualan POS</span>;
                              })()}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-600">
                              {m.qty_in > 0 ? `+${m.qty_in}` : "-"}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-amber-600">
                              {m.qty_out > 0 ? `-${m.qty_out}` : "-"}
                            </td>
                            <td className="px-3 py-2 text-center font-black text-[#0b1220]">
                              {m.stock_after} {selectedCardProduct.unit_name ?? "Pcs"}
                            </td>
                            <td className="px-3 py-2 font-semibold text-[#475569]">
                              {m.ref_no ? <span className="font-bold text-[#2563eb]">{m.ref_no} · </span> : null}
                              {m.notes ?? "Mutasi Stok"}
                            </td>
                          </tr>
                        );
                      });
                    }

                    // Fallback initial sample mutation card
                    return (
                      <>
                        <tr className="hover:bg-[#f8fbff]">
                          <td className="px-3 py-2 font-semibold text-[#64748b]">Hari ini, 08:00</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              📥 Pasokan Masuk
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-600">+50</td>
                          <td className="px-3 py-2 text-center font-bold text-[#94a3b8]">-</td>
                          <td className="px-3 py-2 text-center font-black text-[#0b1220]">
                            {selectedCardProduct.stock_qty + 2} {selectedCardProduct.unit_name ?? "Pcs"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#475569]">
                            <span className="font-bold text-[#2563eb]">STK-IN-001 · </span> Pasokan Distributor Sembako
                          </td>
                        </tr>
                        <tr className="hover:bg-[#f8fbff]">
                          <td className="px-3 py-2 font-semibold text-[#64748b]">Hari ini, 10:15</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              📤 Penjualan POS
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-[#94a3b8]">-</td>
                          <td className="px-3 py-2 text-center font-bold text-amber-600">-2</td>
                          <td className="px-3 py-2 text-center font-black text-[#0b1220]">
                            {selectedCardProduct.stock_qty} {selectedCardProduct.unit_name ?? "Pcs"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#475569]">
                            <span className="font-bold text-[#2563eb]">INV-TOKO-88210921 · </span> Penjualan Kasir POS
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCardProduct(null)}
                className="h-10 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
              >
                Tutup Kartu Stok
              </button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </div>
  );
}
