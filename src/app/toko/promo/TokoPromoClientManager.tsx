"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Gift,
  ShoppingBag,
  Percent,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";

export type TokoPromoRow = {
  id: string;
  title: string;
  code: string;
  type: "bundling" | "discount_percent" | "discount_flat";
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string;
};

type TokoPromoClientManagerProps = {
  promos: TokoPromoRow[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoPromoClientManager({ promos: initialPromos }: TokoPromoClientManagerProps) {
  const [promos, setPromos] = useState<TokoPromoRow[]>(initialPromos);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const togglePromoStatus = (id: string) => {
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const filteredPromos = promos.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Promo & Paket Sembako Bundling"
        subtitle="Kelola paket belanja hemat sembako, promo diskon khusus anggota, dan kupon voucher toko."
        countBadge={`${promos.length} Promo`}
        addButtonLabel="Buat Promo / Paket Baru"
        onAddClick={() => setIsAddModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Promo Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filteredPromos.map((promo) => (
          <article
            key={promo.id}
            className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition-all ${
              promo.isActive ? "ring-[#dbe5f1]" : "ring-slate-200 opacity-60 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  promo.type === "bundling"
                    ? "bg-purple-100 text-purple-800"
                    : promo.type === "discount_percent"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {promo.type === "bundling"
                  ? "🎁 Paket Bundling"
                  : promo.type === "discount_percent"
                  ? " Diskon %"
                  : "🏷️ Potongan Rp"}
              </span>

              <button
                type="button"
                onClick={() => togglePromoStatus(promo.id)}
                className="text-[#2563eb] hover:text-[#1d4ed8]"
              >
                {promo.isActive ? (
                  <ToggleRight className="size-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="size-6 text-slate-400" />
                )}
              </button>
            </div>

            <h4 className="mt-3 font-black text-sm text-[#0b1220]">{promo.title}</h4>
            <p className="mt-1 text-xs text-[#64748b] leading-relaxed">{promo.description}</p>

            <div className="mt-4 rounded-xl bg-[#f8fbff] p-2.5 border border-[#dbe5f1] flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-[#2563eb] uppercase">KODE: {promo.code}</span>
              <span className="font-black text-[#0b1220]">
                {promo.type === "discount_percent" ? `${promo.value}%` : formatRupiah(promo.value)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#64748b]">
              <span>Berlaku s/d: {promo.endDate}</span>
              <span className={`font-bold ${promo.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                {promo.isActive ? "● Aktif" : "○ Nonaktif"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Modal Buat Promo Baru */}
      {isAddModalOpen ? (
        <CrudModal isOpen={true} title="Buat Promo / Paket Sembako Baru" onClose={() => setIsAddModalOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Promo baru berhasil ditambahkan!");
              setIsAddModalOpen(false);
            }}
            className="space-y-4 text-xs"
          >
            <label className="block">
              <span className="font-bold uppercase text-[#475569]">Judul Promo / Paket Sembako *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-bold outline-none"
                placeholder="Contoh: Paket Sembako Hemat Hari Raya 5kg + 2L"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold uppercase text-[#475569]">Kode Promo / Voucher</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-mono font-bold uppercase outline-none"
                  placeholder="Contoh: HEMAT10"
                />
              </label>

              <label className="block">
                <span className="font-bold uppercase text-[#475569]">Jenis Promo</span>
                <select className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-bold outline-none">
                  <option value="bundling">Paket Bundling Sembako</option>
                  <option value="discount_flat">Potongan Harga Nomina (Rp)</option>
                  <option value="discount_percent">Diskon Persentase (%)</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold uppercase text-[#475569]">Nilai Potongan / Nilai Diskon</span>
                <input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-bold outline-none"
                  placeholder="Contoh: 5000"
                />
              </label>

              <label className="block">
                <span className="font-bold uppercase text-[#475569]">Berlaku Sampai Tanggal</span>
                <input
                  type="date"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-bold outline-none"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-bold uppercase text-[#475569]">Deskripsi Rincian Paket</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 font-bold outline-none"
                placeholder="Contoh: Paket Beras Ramos 5kg + Minyak Sawit 2L hemat Rp 5.000"
              />
            </label>

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#2563eb] font-bold text-white hover:bg-[#1d4ed8]"
            >
              Simpan Promo Sembako
            </button>
          </form>
        </CrudModal>
      ) : null}
    </div>
  );
}
