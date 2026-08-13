"use client";

import { useState } from "react";
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
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";

export type TokoSalesSummaryRow = {
  totalOmset: number;
  totalHpp: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalTransactions: number;
};

export type FastMovingItem = {
  productId: string;
  name: string;
  category: string;
  totalQtySold: number;
  totalOmset: number;
  unitName: string;
};

export type MemberBelanjaSummary = {
  memberId: string;
  memberName: string;
  memberNo: string;
  totalTransactions: number;
  totalSpent: number;
};

type TokoLaporanClientManagerProps = {
  summary: TokoSalesSummaryRow;
  fastMovingItems: FastMovingItem[];
  slowMovingItems: FastMovingItem[];
  memberSummaries: MemberBelanjaSummary[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoLaporanClientManager({
  summary,
  fastMovingItems,
  slowMovingItems,
  memberSummaries,
}: TokoLaporanClientManagerProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "fastmoving" | "member">("summary");
  const [search, setSearch] = useState("");

  const filteredMembers = memberSummaries.filter(
    (m) =>
      !search ||
      m.memberName.toLowerCase().includes(search.toLowerCase()) ||
      m.memberNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Laporan & Analisa Toko Waserda"
        subtitle="Analisa Laba Kotor, Perputaran Stok Barang (Fast vs Slow Moving), dan Rekap Belanja Anggota."
        countBadge="Kinerja Toko"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Main KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <DollarSign className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Omset Penjualan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{formatRupiah(summary.totalOmset)}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <BarChart3 className="size-5 text-[#64748b]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total HPP (Harga Modal)</p>
          <p className="mt-0.5 text-xl font-black text-[#475569]">{formatRupiah(summary.totalHpp)}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <TrendingUp className="size-5 text-emerald-600" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Laba Kotor Toko</p>
          <p className="mt-0.5 text-xl font-black text-emerald-600">{formatRupiah(summary.grossProfit)}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Percent className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Margin Laba Toko</p>
          <p className="mt-0.5 text-xl font-black text-[#2563eb]">{summary.profitMarginPercent.toFixed(1)}%</p>
        </article>
      </section>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#e2e8f0] p-1.5 max-w-xl border border-[#cbd5e1]">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all ${
            activeTab === "summary" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <TrendingUp className="size-4" />
          <span>Laba Kotor Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fastmoving")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all ${
            activeTab === "fastmoving" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Flame className="size-4 text-amber-500" />
          <span>Fast & Slow Moving</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("member")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all ${
            activeTab === "member" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#0b1220]"
          }`}
        >
          <Users className="size-4" />
          <span>Belanja Per Anggota</span>
        </button>
      </div>

      {/* Tab 1: Laba Kotor Toko */}
      {activeTab === "summary" ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] space-y-4">
          <h3 className="text-sm font-black uppercase text-[#0b1220]">Rincian Perhitungan Laba Kotor Toko Waserda</h3>
          <div className="divide-y divide-[#e2e8f0] rounded-xl border border-[#dbe5f1] text-xs">
            <div className="flex justify-between p-3 bg-[#f8fbff]">
              <span className="font-bold text-[#475569]">Total Pendapatan Omset Penjualan (KASIR POS)</span>
              <span className="font-black text-[#0b1220]">{formatRupiah(summary.totalOmset)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="font-bold text-[#475569]">Dikurangi: Total Harga Pokok Penjualan (HPP Modal)</span>
              <span className="font-black text-rose-600">({formatRupiah(summary.totalHpp)})</span>
            </div>
            <div className="flex justify-between p-3.5 bg-[#eff6ff] font-black text-sm text-[#2563eb]">
              <span>TOTAL LABA KOTOR OPERASIONAL TOKO WASERDA</span>
              <span>{formatRupiah(summary.grossProfit)}</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tab 2: Fast & Slow Moving Goods */}
      {activeTab === "fastmoving" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Fast Moving */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e2e8f0]">
              <Flame className="size-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Top 5 Barang Paling Terlaris (Fast Moving)</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {fastMovingItems.map((item, idx) => (
                <div key={item.productId} className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-[#2563eb] text-white font-black text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-[#0b1220]">{item.name}</p>
                      <p className="text-[11px] font-semibold text-[#64748b]">Terjual: {item.totalQtySold} {item.unitName}</p>
                    </div>
                  </div>
                  <span className="font-black text-[#2563eb]">{formatRupiah(item.totalOmset)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Slow Moving */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e2e8f0]">
              <Snowflake className="size-5 text-sky-500" />
              <h3 className="text-xs font-black uppercase text-[#0b1220]">Barang Lambat Terjual (Slow Moving / Restock Alert)</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {slowMovingItems.map((item, idx) => (
                <div key={item.productId} className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1]">
                  <div>
                    <p className="font-bold text-[#0b1220]">{item.name}</p>
                    <p className="text-[11px] font-semibold text-[#64748b]">Kategori: {item.category}</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                    Stok Tertahan
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {/* Tab 3: Belanja Per Anggota */}
      {activeTab === "member" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-xs font-black uppercase text-[#0b1220]">
              Rekapitulasi Total Transaksi Belanja Toko Per Anggota (Dasar SHU Jasa Belanja)
            </h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                <tr>
                  <th className="px-2 py-2 font-bold">No. Anggota</th>
                  <th className="px-2 py-2 font-bold">Nama Anggota Koperasi</th>
                  <th className="px-2 py-2 font-bold text-center">Jumlah Transaksi</th>
                  <th className="px-2 py-2 font-bold text-right">Total Belanja Toko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredMembers.length ? (
                  filteredMembers.map((m) => (
                    <tr key={m.memberId} className="hover:bg-[#f8fbff]">
                      <td className="px-2 py-2 font-bold text-[#2563eb]">{m.memberNo}</td>
                      <td className="px-2 py-2 font-bold text-[#0b1220]">{m.memberName}</td>
                      <td className="px-2 py-2 text-center font-semibold">{m.totalTransactions} Transaksi</td>
                      <td className="px-2 py-2 text-right font-black text-emerald-600">
                        {formatRupiah(m.totalSpent)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center font-bold text-[#64748b]">
                      Belum ada data belanja anggota.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
