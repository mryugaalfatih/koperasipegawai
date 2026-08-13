"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpenCheck,
  CalendarDays,
  Landmark,
  PiggyBank,
  Printer,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_no: string;
  } | {
    id: string;
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

type SavingsTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference_no: string | null;
  created_at: string;
};

type MutasiClientManagerProps = {
  account: SavingsAccount;
  transactions: SavingsTransaction[];
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

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function MutasiClientManager({ account, transactions }: MutasiClientManagerProps) {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  // Parse member info safely
  const memberObj = Array.isArray(account.members)
    ? account.members[0]
    : (account.members as unknown as { id: string; full_name: string; member_no: string } | null);
  const memberName = memberObj?.full_name ?? "Anggota";
  const memberNo = memberObj?.member_no ?? "-";

  const productObj = Array.isArray(account.savings_products)
    ? account.savings_products[0]
    : (account.savings_products as unknown as { name: string; code: string } | null);
  const productName = productObj?.name ?? typeLabels[account.type];

  // Compute totals
  const totalSetoran = transactions
    .filter((t) => t.direction === "in")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const totalPenarikan = transactions
    .filter((t) => t.direction === "out")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.reference_no ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesDirection = !directionFilter || t.direction === directionFilter;
    return matchesSearch && matchesDirection;
  });

  // Compute running balance for display
  // Transactions are sorted newest first, so reverse for running balance
  const txWithBalance = (() => {
    const sorted = [...filteredTransactions].reverse();
    let runningBalance = 0;

    // Calculate starting balance: current balance minus all transactions' net effect
    const allSorted = [...transactions].reverse();
    let totalNet = 0;
    allSorted.forEach((t) => {
      totalNet += t.direction === "in" ? Number(t.amount ?? 0) : -Number(t.amount ?? 0);
    });
    const openingBalance = Number(account.balance ?? 0) - totalNet;
    runningBalance = openingBalance;

    const result: (SavingsTransaction & { runningBalance: number })[] = [];
    sorted.forEach((t) => {
      runningBalance += t.direction === "in" ? Number(t.amount ?? 0) : -Number(t.amount ?? 0);
      result.push({ ...t, runningBalance });
    });
    return result.reverse(); // Back to newest first
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable-mutasi-area, .printable-mutasi-area * { visibility: visible !important; }
          .printable-mutasi-area {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; padding: 20px !important;
            background: white !important; box-shadow: none !important;
          }
          .print-hide { display: none !important; }
        }
      `}</style>

      <section className="min-w-0 pb-20 lg:pb-8">
        {/* Header */}
        <header className="print-hide sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-3 py-3 backdrop-blur md:px-3">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white hover:bg-slate-50 transition-all"
                href="/simpanan/rekening"
              >
                <ArrowLeft className="size-5 text-[#0b1220]" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Detail Rekening Simpanan</p>
                <h1 className="truncate text-xl font-black text-[#0b1220] md:text-2xl">{memberName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition-all"
              >
                <Printer className="size-4" />
                <span>Cetak Mutasi</span>
              </button>
            </div>
          </div>
        </header>

        <div className="printable-mutasi-area space-y-5 px-4 py-5 md:px-3">
          {/* Print Header */}
          <div className="hidden print:block border-b-2 border-[#0b1220] pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#0b1220]">KOPERASI SIMPAN PINJAM</h1>
            <h2 className="text-base font-bold text-[#2563eb]">Buku Tabungan / Mutasi Rekening Simpanan</h2>
            <p className="text-xs font-semibold text-[#64748b]">Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
          </div>

          {/* Account Info Card */}
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Informasi Rekening</p>
                <h2 className="mt-1.5 text-xl font-bold md:text-2xl">{memberName}</h2>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-[#cbd5e1]">
                  <span>No. Anggota: <span className="font-bold text-white">{memberNo}</span></span>
                  <span>No. Rekening: <span className="font-bold text-white">{account.account_no}</span></span>
                  <span>Produk: <span className="font-bold text-white">{productName}</span></span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-[#cbd5e1]">
                  <span>Jenis: <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-[#93c5fd]">{typeLabels[account.type]}</span></span>
                  <span>Dibuka: <span className="font-bold text-white">{formatDate(account.created_at)}</span></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#bfdbfe]">Saldo Efektif</p>
                <p className="mt-1 text-2xl font-black text-white md:text-3xl">{currency.format(Number(account.balance ?? 0))}</p>
              </div>
            </div>
          </section>

          {/* Summary Cards */}
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Setoran Masuk</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Setoran</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalSetoran)}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                  <TrendingDown className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-rose-600">Penarikan</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Penarikan</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalPenarikan)}</p>
            </article>

            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <CalendarDays className="size-5" />
                </div>
                <span className="text-[11px] font-bold text-[#2563eb]">Jumlah Transaksi</span>
              </div>
              <p className="mt-4 text-xs font-bold text-[#64748b]">Total Mutasi</p>
              <p className="mt-1 text-xl font-bold text-[#0b1220]">{transactions.length} Transaksi</p>
            </article>
          </section>

          {/* Transaction Table */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            {/* Toolbar */}
            <div className="print-hide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f1f5f9] pb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari keterangan / no referensi..."
                  className="h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] pl-10 pr-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </div>
              <div className="flex items-center gap-2 min-w-[180px]">
                <CustomSelect
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="h-10 text-xs"
                >
                  <option value="">Semua Mutasi</option>
                  <option value="in">Setoran Masuk</option>
                  <option value="out">Penarikan</option>
                </CustomSelect>
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] font-bold uppercase tracking-wider">
                    <th className="p-3">No</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3 text-right">Setoran (D)</th>
                    <th className="p-3 text-right">Penarikan (K)</th>
                    <th className="p-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-semibold">
                  {txWithBalance.length ? (
                    txWithBalance.map((tx, index) => (
                      <tr key={tx.id} className="hover:bg-[#f8fbff] transition-colors">
                        <td className="p-3 text-[#64748b]">{index + 1}</td>
                        <td className="p-3 text-[#0b1220] whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {tx.direction === "in" ? (
                              <ArrowDownCircle className="size-4 shrink-0 text-emerald-500" />
                            ) : (
                              <ArrowUpCircle className="size-4 shrink-0 text-rose-500" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#0b1220]">{tx.description || (tx.direction === "in" ? "Setoran" : "Penarikan")}</p>
                              {tx.reference_no ? (
                                <p className="text-[10px] text-[#94a3b8] font-mono">Ref: {tx.reference_no}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {tx.direction === "in" ? currency.format(Number(tx.amount ?? 0)) : "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          {tx.direction === "out" ? currency.format(Number(tx.amount ?? 0)) : "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-[#2563eb]">
                          {currency.format(tx.runningBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center">
                        <BookOpenCheck className="mx-auto size-10 text-[#94a3b8]" />
                        <p className="mt-3 font-bold text-[#0b1220]">Belum Ada Mutasi</p>
                        <p className="mt-1 text-xs font-medium text-[#64748b]">
                          Rekening ini belum memiliki transaksi setoran atau penarikan.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block for Print */}
            <div className="hidden print:grid grid-cols-2 text-center text-xs font-bold mt-12 pt-8 border-t border-slate-300">
              <div>
                <p className="text-[#64748b]">Pemilik Rekening / Anggota</p>
                <div className="mt-16 border-b border-slate-400 mx-auto w-40"></div>
                <p className="mt-1 text-[#0b1220]">{memberName}</p>
              </div>
              <div>
                <p className="text-[#64748b]">Petugas Simpanan / Teller</p>
                <div className="mt-16 border-b border-slate-400 mx-auto w-40"></div>
                <p className="mt-1 text-[#0b1220]">Staf Administrasi USP</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
