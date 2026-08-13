"use client";

import { useState } from "react";
import { Receipt, FileText, CheckCircle2, Eye, Building2, Calendar, DollarSign } from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";

export type AparPenjualanRow = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  client_name: string;
  client_type: "Instansi / PT" | "Anggota Internal";
  total_amount: number;
  payment_status: "LUNAS" | "TEMPO (Kredit PT)";
  due_date: string | null;
  items_summary: string;
};

type AparPenjualanClientManagerProps = {
  sales: AparPenjualanRow[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function AparPenjualanClientManager({ sales }: AparPenjualanClientManagerProps) {
  const [search, setSearch] = useState("");

  const filteredSales = sales.filter(
    (s) =>
      !search ||
      s.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Invoice & Penjualan B2B APAR Damkar"
        subtitle="Rekapitulasi transaksi penjualan tabung APAR baru & pengadaan alat pemadam untuk Gedung/PT/Instansi."
        countBadge={`${sales.length} Invoice B2B`}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-3 font-bold">No. Invoice Faktur</th>
                <th className="px-3 py-3 font-bold">Tanggal</th>
                <th className="px-3 py-3 font-bold">Nama Gedung / PT Klien</th>
                <th className="px-3 py-3 font-bold">Rincian Pengadaan</th>
                <th className="px-3 py-3 font-bold text-right">Total Nilai Tagihan</th>
                <th className="px-3 py-3 font-bold text-center">Status Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-[#f8fbff] transition-colors">
                  <td className="px-3 py-3 font-bold text-[#be123c]">{s.invoice_no}</td>
                  <td className="px-3 py-3 font-semibold text-[#64748b]">{s.invoice_date}</td>
                  <td className="px-3 py-3 font-bold text-[#0b1220]">{s.client_name}</td>
                  <td className="px-3 py-3 font-semibold text-[#475569]">{s.items_summary}</td>
                  <td className="px-3 py-3 font-black text-right text-[#0b1220]">
                    {formatRupiah(s.total_amount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        s.payment_status === "LUNAS"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {s.payment_status}
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
