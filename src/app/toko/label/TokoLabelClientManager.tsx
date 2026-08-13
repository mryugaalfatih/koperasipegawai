"use client";

import { useState } from "react";
import { Printer, Barcode as BarcodeIcon, Tag, Check, Layers, Store } from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { TokoProductRow } from "../produk/TokoProdukClientManager";

type TokoLabelClientManagerProps = {
  products: TokoProductRow[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoLabelClientManager({ products }: TokoLabelClientManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printFormat, setPrintFormat] = useState<"pricetag" | "thermal" | "a4">("pricetag");

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Cetak Label Barcode & Price Tag Rak Toko"
        subtitle="Fitur siap cetak label harga rak toko (Dual Harga Umum & Anggota) dan stiker barcode thermal."
        countBadge={`${selectedIds.length} Barang Dipilih`}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Control Panel */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-[#475569]">Format Cetak:</span>
            <div className="flex rounded-xl bg-[#f1f5f9] p-1 border border-[#cbd5e1] text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat("pricetag")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  printFormat === "pricetag" ? "bg-white text-[#2563eb] shadow-xs" : "text-[#64748b]"
                }`}
              >
                🏷️ Price Tag Rak Toko (Dual Harga)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  printFormat === "thermal" ? "bg-white text-[#2563eb] shadow-xs" : "text-[#64748b]"
                }`}
              >
                🖨️ Stiker Thermal Barcode (58mm)
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            <Printer className="size-4" />
            <span>CETAK {selectedIds.length} LABEL SEKARANG</span>
          </button>
        </div>

        {/* Product Selector Table */}
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-3 font-bold text-center w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="size-4 rounded accent-[#2563eb]"
                  />
                </th>
                <th className="px-3 py-3 font-bold">Nama Barang Sembako</th>
                <th className="px-3 py-3 font-bold">Barcode / SKU</th>
                <th className="px-3 py-3 font-bold text-right">Harga Umum</th>
                <th className="px-3 py-3 font-bold text-right text-[#2563eb]">Harga Anggota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr
                    key={product.id}
                    onClick={() => toggleSelectProduct(product.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-[#eff6ff]" : "hover:bg-[#f8fbff]"
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="size-4 rounded accent-[#2563eb]"
                      />
                    </td>
                    <td className="px-3 py-3 font-bold text-[#0b1220]">{product.name}</td>
                    <td className="px-3 py-3 font-mono text-[#64748b]">{product.barcode ?? "-"}</td>
                    <td className="px-3 py-3 font-semibold text-right">{formatRupiah(product.sell_price_general)}</td>
                    <td className="px-3 py-3 font-bold text-right text-[#2563eb]">
                      {formatRupiah(product.sell_price_member)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Preview Area (Siap Print) */}
      {selectedProducts.length ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dbe5f1] space-y-4 print:p-0 print:ring-0 print:shadow-none">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#64748b] print:hidden">
            Preview Tampilan Sebelum Dicetak ({selectedProducts.length} Label)
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3">
            {selectedProducts.map((prod) => (
              <div
                key={prod.id}
                className="rounded-2xl border-2 border-dashed border-[#0b1220] bg-white p-4 shadow-xs space-y-2 text-center print:border-solid print:border-black"
              >
                <p className="text-[10px] font-black uppercase text-[#64748b] tracking-widest">
                  WASERDA KOPERASI
                </p>
                <h4 className="font-black text-sm text-[#0b1220] leading-tight truncate">{prod.name}</h4>

                {/* Price Display */}
                <div className="rounded-xl bg-[#f8fbff] p-2 border border-[#dbe5f1] space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-[#64748b]">Harga Umum:</span>
                    <span className="font-bold text-[#0b1220]">{formatRupiah(prod.sell_price_general)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black text-[#2563eb] pt-0.5 border-t border-[#dbe5f1]">
                    <span>HARGA ANGGOTA:</span>
                    <span className="text-sm">{formatRupiah(prod.sell_price_member)}</span>
                  </div>
                </div>

                {/* Simulated Barcode Lines */}
                <div className="pt-1 flex flex-col items-center">
                  <div className="h-8 w-3/4 bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_7px,transparent_7px,transparent_9px)]" />
                  <p className="font-mono text-[10px] font-bold text-[#475569] mt-0.5">
                    {prod.barcode ?? "8991001001"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
