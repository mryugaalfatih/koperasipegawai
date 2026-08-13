"use client";

import { useState } from "react";
import { ArrowLeft, BookOpenCheck, Landmark, PiggyBank, Printer, Search, WalletCards } from "lucide-react";
import Link from "next/link";
import { CustomSelect } from "@/components/CustomSelect";

type SavingsAccountRow = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  members: {
    full_name: string;
    member_no: string;
  } | {
    full_name: string;
    member_no: string;
  }[] | null;
  savings_products: {
    name: string;
    code: string;
  } | {
    name: string;
    code: string;
  }[] | null;
};


type LaporanSimpananClientManagerProps = {
  accountRows: SavingsAccountRow[];
  totalPokok: number;
  totalWajib: number;
  totalSukarela: number;
  grandTotal: number;
};

const typeLabels: Record<string, string> = {
  pokok: "Simpanan Pokok",
  wajib: "Simpanan Wajib",
  sukarela: "Simpanan Sukarela",
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function LaporanSimpananClientManager({
  accountRows,
  totalPokok,
  totalWajib,
  totalSukarela,
  grandTotal,
}: LaporanSimpananClientManagerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filteredAccounts = accountRows.filter((acc) => {
    const memberObj = Array.isArray(acc.members)
      ? acc.members[0]
      : (acc.members as unknown as { full_name: string; member_no: string } | null);
    const memberName = memberObj?.full_name ?? "";
    const memberNo = memberObj?.member_no ?? "";
    const matchesSearch =
      !search ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      memberNo.toLowerCase().includes(search.toLowerCase()) ||
      acc.account_no.toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || acc.type === typeFilter;

    return matchesSearch && matchesType;
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
        <header className="print-hide sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur md:px-2">
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
                <h1 className="text-xl font-black text-[#0b1220] md:text-2xl">Laporan Portofolio Simpanan</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-2 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition-all"
              >
                <Printer className="size-4" />
                <span>Cetak / PDF Laporan</span>
              </button>
            </div>
          </div>
        </header>

        <div className="printable-laporan-area space-y-6 px-2 py-5 md:px-2">
          {/* Printable Report Header */}
          <div className="hidden print:block border-b-2 border-[#0b1220] pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#0b1220]">KOPERASI SIMPAN PINJAM</h1>
            <h2 className="text-base font-bold text-[#2563eb]">Laporan Rekapitulasi Portofolio Simpanan Anggota</h2>
            <p className="text-xs font-semibold text-[#64748b]">Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
          </div>

          {/* KPI Summary Cards */}
          <section className="grid gap-3 sm:grid-cols-4">
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <PiggyBank className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Simpanan Pokok</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Saldo Pokok</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalPokok)}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <WalletCards className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Simpanan Wajib</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Saldo Wajib</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalWajib)}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <BookOpenCheck className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Simpanan Sukarela</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Saldo Sukarela</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalSukarela)}</p>
            </article>

            <article className="rounded-3xl bg-[#0b1220] p-5 text-white shadow-sm ring-1 ring-[#0b1220]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white">
                  <Landmark className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#93c5fd]">Grand Total</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#cbd5e1]">Total Simpanan Koperasi</p>
              <p className="mt-1 text-xl font-bold text-white">{currency.format(grandTotal)}</p>
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
                  placeholder="Cari nama / no anggota / no rek..."
                  className="h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] pl-10 pr-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="flex items-center gap-2 min-w-[200px]">
                <CustomSelect
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 text-xs"
                >
                  <option value="">Semua Jenis Simpanan</option>
                  <option value="pokok">Simpanan Pokok</option>
                  <option value="wajib">Simpanan Wajib</option>
                  <option value="sukarela">Simpanan Sukarela</option>
                </CustomSelect>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] font-bold uppercase tracking-wider">
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Anggota</th>
                    <th className="p-3">No. Anggota</th>
                    <th className="p-3">No. Rekening</th>
                    <th className="p-3">Jenis Simpanan</th>
                    <th className="p-3 text-right">Saldo Efektif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-semibold">
                  {filteredAccounts.length ? (
                    filteredAccounts.map((acc, index) => {
                      const memberObj = Array.isArray(acc.members)
                        ? acc.members[0]
                        : (acc.members as unknown as { full_name: string; member_no: string } | null);
                      const memberName = memberObj?.full_name ?? "Anggota";
                      const memberNo = memberObj?.member_no ?? "-";

                      return (
                        <tr key={acc.id} className="hover:bg-[#f8fbff] transition-colors">
                          <td className="p-3 text-[#64748b]">{index + 1}</td>
                          <td className="p-3 font-bold text-[#0b1220]">{memberName}</td>
                          <td className="p-3 text-[#64748b]">{memberNo}</td>
                          <td className="p-3 font-mono text-[#0b1220]">{acc.account_no}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#475569]">
                              {typeLabels[acc.type]}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-[#2563eb]">
                            {currency.format(Number(acc.balance ?? 0))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#94a3b8] font-bold">
                        Tidak ada data simpanan yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block for Print */}
            <div className="hidden print:grid grid-cols-2 text-center text-xs font-bold mt-12 pt-8 border-t border-slate-300">
              <div>
                <p className="text-slate-64748b">Dibuat Oleh (Petugas Simpanan)</p>
                <div className="mt-16 border-b border-slate-400 mx-auto w-40"></div>
                <p className="mt-1 text-[#0b1220]">Staf Administrasi USP</p>
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
