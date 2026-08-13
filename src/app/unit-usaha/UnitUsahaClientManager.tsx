"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Edit2,
  PiggyBank,
  Plus,
  Scale,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { createBusinessUnit, toggleBusinessUnitStatus, updateBusinessUnit } from "./actions";
import { CrudModal } from "@/components/CrudModal";
import { SubmitButton } from "@/components/SubmitButton";

export type BusinessUnitRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type UnitUsahaClientManagerProps = {
  unitRows: BusinessUnitRow[];
  activeUnitsCount: number;
};

export function UnitUsahaClientManager({
  unitRows,
  activeUnitsCount,
}: UnitUsahaClientManagerProps) {
  const [editingUnit, setEditingUnit] = useState<BusinessUnitRow | null>(null);

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/90 px-2 py-2 backdrop-blur md:px-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Manajemen Devisi</p>
            <h1 className="text-xl font-bold text-[#0b1220]">Unit Usaha Koperasi</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-[#dbe5f1]">
            <Store className="size-4 text-[#2563eb]" />
            <span className="text-xs font-bold text-[#0b1220]">{activeUnitsCount} Unit Usaha Aktif</span>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-2 py-2 md:px-2 md:py-2">
        {/* Hero Card */}
        <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-[#bfdbfe]">
                <Building2 className="size-4" />
                Multi-Unit Usaha Architecture
              </div>
              <h2 className="mt-3 text-xl font-bold md:text-2xl">
                Struktur & Sektor Bisnis Koperasi
              </h2>
              <p className="mt-1 max-w-xl text-xs font-medium text-[#cbd5e1]">
                Kelola devisi usaha terpisah (Simpan Pinjam, Toko/Waserda, Jasa) dengan pencatatan keuangan terspesialisasi.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Registered Units Grid */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#0b1220]">Daftar Devisi Unit Usaha</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {unitRows.map((unit) => {
                const codeLower = unit.code.toLowerCase();
                const nameLower = unit.name.toLowerCase();
                const isUSP = codeLower.includes("usp") || nameLower.includes("simpan") || nameLower.includes("pusat");
                const isTOKO = codeLower.includes("toko") || codeLower.includes("was") || nameLower.includes("toko") || nameLower.includes("waserda");
                const isJASA = codeLower.includes("jasa") || codeLower.includes("kln") || nameLower.includes("jasa") || nameLower.includes("klinik");

                const IconComponent = isUSP ? PiggyBank : isTOKO ? ShoppingBag : isJASA ? Truck : Store;

                return (
                  <article
                    className={`flex flex-col justify-between rounded-[28px] p-5 shadow-sm ring-1 transition-all ${
                      unit.is_active
                        ? "bg-white ring-[#dbe5f1]"
                        : "bg-[#f8fbff] ring-[#e2e8f0] opacity-80"
                    }`}
                    key={unit.id}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                            unit.is_active
                              ? "bg-[#eaf2ff] text-[#2563eb]"
                              : "bg-[#f1f5f9] text-[#64748b]"
                          }`}
                        >
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingUnit(unit)}
                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all cursor-pointer shadow-sm"
                          >
                            <Edit2 className="size-3.5" />
                            <span>Edit Unit</span>
                          </button>

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              unit.is_active
                                ? "bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]"
                                : "bg-[#f1f5f9] text-[#64748b]"
                            }`}
                          >
                            {unit.is_active ? "Aktif" : "Non-Aktif"}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-[#0b1220]">
                        {unit.code} · {unit.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">
                        {unit.description ?? "Deskripsi operasional unit usaha belum diisi."}
                      </p>

                      {/* Unit Features Checklist / Action links */}
                      {isUSP ? (
                        <div className="mt-4 space-y-2 rounded-2xl bg-[#f4f7fb] p-3.5">
                          <p className="text-xs font-bold text-[#2563eb]">Fitur Modul Simpan Pinjam:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#0b1220]">
                            <Link className="flex items-center gap-1.5 hover:text-[#2563eb]" href="/simpanan">
                              <PiggyBank className="size-3.5 text-[#2563eb]" />
                              <span>Simpanan</span>
                            </Link>
                            <Link className="flex items-center gap-1.5 hover:text-[#2563eb]" href="/pinjaman">
                              <CreditCard className="size-3.5 text-[#2563eb]" />
                              <span>Pinjaman</span>
                            </Link>
                            <Link className="flex items-center gap-1.5 hover:text-[#2563eb]" href="/kas-jurnal">
                              <Scale className="size-3.5 text-[#2563eb]" />
                              <span>Kas Unit</span>
                            </Link>
                            <Link className="flex items-center gap-1.5 hover:text-[#2563eb]" href="/laporan">
                              <CheckCircle2 className="size-3.5 text-[#2563eb]" />
                              <span>SHU Unit</span>
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-[#f1f5f9] pt-4">
                      <form action={toggleBusinessUnitStatus}>
                        <input name="id" type="hidden" value={unit.id} />
                        <input name="is_active" type="hidden" value={String(unit.is_active)} />
                        <button
                          className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                            unit.is_active
                              ? "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                              : "bg-[#0b1220] text-white hover:bg-slate-800"
                          }`}
                          type="submit"
                        >
                          <span>{unit.is_active ? "Non-aktifkan Unit" : "Aktifkan Unit Usaha"}</span>
                          <ChevronRight className="size-4" />
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Add Unit Usaha Form Sidebar */}
          <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Devisi</p>
                <h2 className="text-base font-bold text-[#0b1220]">Tambah Unit Usaha</h2>
              </div>
            </div>

            <form action={createBusinessUnit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Kode Unit</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold uppercase outline-none focus:border-[#2563eb]"
                  name="code"
                  placeholder="Contoh: KULINER / SEWA"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nama Unit Usaha</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="name"
                  placeholder="Nama unit usaha"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Deskripsi Operasional</span>
                <textarea
                  className="mt-1.5 min-h-24 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2 text-xs font-semibold outline-none focus:border-[#2563eb]"
                  name="description"
                  placeholder="Jelaskan bidang usaha dan operasional singkat unit ini..."
                />
              </label>

              <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                Daftarkan Unit Usaha
              </SubmitButton>
            </form>
          </aside>
        </div>
      </div>

      {/* Modal Edit Unit Usaha */}
      {editingUnit ? (
        <CrudModal
          isOpen={!!editingUnit}
          onClose={() => setEditingUnit(null)}
          title={`✏️ Edit Unit Usaha (${editingUnit.code})`}
          subtitle="Perbarui kode, nama unit, dan deskripsi operasional."
        >
          <form action={updateBusinessUnit} className="space-y-4">
            <input type="hidden" name="id" value={editingUnit.id} />

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Kode Unit Usaha *</span>
              <input
                key={editingUnit.id + "-code"}
                defaultValue={editingUnit.code}
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold uppercase outline-none focus:border-[#2563eb]"
                name="code"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Unit Usaha *</span>
              <input
                key={editingUnit.id + "-name"}
                defaultValue={editingUnit.name}
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="name"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Deskripsi Operasional</span>
              <textarea
                key={editingUnit.id + "-desc"}
                defaultValue={editingUnit.description ?? ""}
                className="mt-1.5 min-h-24 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2 text-xs font-semibold outline-none focus:border-[#2563eb]"
                name="description"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="h-11 flex-1 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] text-xs font-bold text-[#64748b] hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <SubmitButton className="h-11 flex-1 rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                Simpan Perubahan
              </SubmitButton>
            </div>
          </form>
        </CrudModal>
      ) : null}
    </section>
  );
}
