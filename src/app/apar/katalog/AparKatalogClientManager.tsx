"use client";

import { useState } from "react";
import { Flame, Plus, Search, Shield, Tag, Store } from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";

export type AparProductRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  media_type: string;
  capacity_kg: number;
  buy_price: number;
  sell_price: number;
  refill_price: number;
  stock_qty: number;
  is_active: boolean;
};

type AparKatalogClientManagerProps = {
  products: AparProductRow[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function AparKatalogClientManager({ products }: AparKatalogClientManagerProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Katalog Tabung APAR & Equipment Damkar"
        subtitle="Master unit tabung pemadam baru, media refill, sparepart valve, dan perlengkapan APD Damkar."
        countBadge={`${products.length} Item`}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={categoryFilter}
        onStatusFilterChange={setCategoryFilter}
        statusOptions={categories.map((c) => ({ value: c, label: c }))}
      />

      {/* Catalog Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-2 py-2 font-bold">Kode / Nama Barang APAR</th>
                <th className="px-2 py-2 font-bold">Kategori</th>
                <th className="px-2 py-2 font-bold text-center">Media & Ukuran</th>
                <th className="px-2 py-2 font-bold text-right">Harga Jual Unit Baru</th>
                <th className="px-2 py-2 font-bold text-right text-[#be123c]">Harga Refill / Kg</th>
                <th className="px-2 py-2 font-bold text-center">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#f8fbff] transition-colors">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff1f2] text-[#be123c]">
                        <Flame className="size-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0b1220]">{p.name}</p>
                        <p className="text-[11px] font-mono text-[#64748b]">Kode: {p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-[#0b1220]">
                    {p.media_type} {p.capacity_kg ? `${p.capacity_kg} Kg` : ""}
                  </td>
                  <td className="px-2 py-2 text-right font-black text-[#0b1220]">
                    {formatRupiah(p.sell_price)}
                  </td>
                  <td className="px-2 py-2 text-right font-black text-[#be123c]">
                    {p.refill_price > 0 ? formatRupiah(p.refill_price) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                      {p.stock_qty} Unit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
