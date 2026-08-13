"use client";

import { useState } from "react";
import { ArrowLeft, CreditCard, Landmark, Printer, ReceiptText, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CustomSelect } from "@/components/CustomSelect";

type LoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  status: string;
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  members: {
    full_name: string;
    member_no: string;
  } | {
    full_name: string;
    member_no: string;
  }[] | null;
  loan_products: {
    name: string;
  } | {
    name: string;
  }[] | null;
};

type LaporanPinjamanClientManagerProps = {
  loanRows: LoanRow[];
  totalPrincipal: number;
  totalDisbursed: number;
  activeLoansCount: number;
};

const statusLabels: Record<string, string> = {
  draft: "Pengajuan Draf",
  approved: "Disetujui",
  disbursed: "Pinjaman Aktif",
  active: "Pinjaman Aktif",
  completed: "Lunas Selesai",
  rejected: "Ditolak",
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function LaporanPinjamanClientManager({
  loanRows,
  totalPrincipal,
  totalDisbursed,
  activeLoansCount,
}: LaporanPinjamanClientManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredLoans = loanRows.filter((loan) => {
    const memberObj = Array.isArray(loan.members)
      ? loan.members[0]
      : (loan.members as unknown as { full_name: string; member_no: string } | null);
    const memberName = memberObj?.full_name ?? "";
    const memberNo = memberObj?.member_no ?? "";
    const matchesSearch =
      !search ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      memberNo.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || loan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-laporan-area,
          .printable-laporan-area * {
            visibility: visible !important;
          }
          .printable-laporan-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            box-shadow: none !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <section className="min-w-0 pb-20 lg:pb-8">
        {/* Header */}
        <header className="print-hide sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-3 py-3 backdrop-blur md:px-3">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white hover:bg-slate-50 transition-all"
                href="/laporan"
              >
                <ArrowLeft className="size-5 text-[#0b1220]" />
              </Link>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Laporan Koperasi</p>
                <h1 className="text-xl font-black text-[#0b1220] md:text-2xl">Laporan Portofolio Pinjaman & Outstanding</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition-all"
              >
                <Printer className="size-4" />
                <span>Cetak / PDF Laporan</span>
              </button>
            </div>
          </div>
        </header>

        <div className="printable-laporan-area space-y-6 px-4 py-5 md:px-3">
          {/* Printable Header */}
          <div className="hidden print:block border-b-2 border-[#0b1220] pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#0b1220]">KOPERASI SIMPAN PINJAM</h1>
            <h2 className="text-base font-bold text-[#2563eb]">Laporan Rekapitulasi Portofolio Pinjaman Anggota</h2>
            <p className="text-xs font-semibold text-[#64748b]">Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
          </div>

          {/* Stat Cards */}
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <CreditCard className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Pencairan Aktif</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Outstanding Pinjaman Aktif</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalDisbursed)}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <ReceiptText className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Jumlah Pinjaman</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Pinjaman Aktif Anggota</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{activeLoansCount} Berkas</p>
            </article>

            <article className="rounded-3xl bg-[#0b1220] p-5 text-white shadow-sm ring-1 ring-[#0b1220]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white">
                  <Landmark className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#93c5fd]">Akumulasi Total</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#cbd5e1]">Total Pencairan Pinjaman</p>
              <p className="mt-1 text-xl font-bold text-white">{currency.format(totalPrincipal)}</p>
            </article>
          </section>

          {/* Table & Controls Section */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="print-hide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f1f5f9] pb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / no anggota / no pinjaman..."
                  className="h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] pl-10 pr-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="flex items-center gap-2 min-w-[200px]">
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 text-xs"
                >
                  <option value="">Semua Status Pinjaman</option>
                  <option value="disbursed">Pinjaman Aktif</option>
                  <option value="completed">Lunas Selesai</option>
                  <option value="draft">Draf Pengajuan</option>
                  <option value="approved">Disetujui</option>
                </CustomSelect>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] font-bold uppercase tracking-wider">
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Anggota</th>
                    <th className="p-3">Metode & Suku Bunga</th>
                    <th className="p-3">Tenor</th>
                    <th className="p-3 text-right">Plafond Pinjaman</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-semibold">
                  {filteredLoans.length ? (
                    filteredLoans.map((loan, index) => {
                      const memberObj = Array.isArray(loan.members)
                        ? loan.members[0]
                        : (loan.members as unknown as { full_name: string; member_no: string } | null);
                      const memberName = memberObj?.full_name ?? "Anggota";
                      const memberNo = memberObj?.member_no ?? "-";

                      return (
                        <tr key={loan.id} className="hover:bg-[#f8fbff] transition-colors">
                          <td className="p-3 text-[#64748b]">{index + 1}</td>
                          <td className="p-3">
                            <p className="font-bold text-[#0b1220]">{memberName}</p>
                            <p className="text-[11px] text-[#64748b]">No: {memberNo}</p>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#2563eb]">
                              {loan.interest_method === "annuity" ? "Anuitas" : "Flat"} ({Number(loan.annual_rate_snapshot ?? 0)}%/thn)
                            </span>
                          </td>
                          <td className="p-3">{loan.tenor_months} Bulan</td>
                          <td className="p-3 text-right font-bold text-[#0b1220]">
                            {currency.format(Number(loan.principal ?? 0))}
                          </td>
                          <td className="p-3 text-center">
                            <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[11px] font-bold text-[#2563eb]">
                              {statusLabels[loan.status] ?? loan.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#94a3b8] font-bold">
                        Tidak ada data pinjaman yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block for Print */}
            <div className="hidden print:grid grid-cols-2 text-center text-xs font-bold mt-12 pt-8 border-t border-slate-300">
              <div>
                <p className="text-slate-64748b">Dibuat Oleh (Analis Kredit / USP)</p>
                <div className="mt-16 border-b border-slate-400 mx-auto w-40"></div>
                <p className="mt-1 text-[#0b1220]">Staf Analis Kredit</p>
              </div>
              <div>
                <p className="text-slate-64748b">Disetujui Oleh (Ketua Koperasi)</p>
                <div className="mt-16 border-b border-slate-400 mx-auto w-40"></div>
                <p className="mt-1 text-[#0b1220]">Ketua Koperasi</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
