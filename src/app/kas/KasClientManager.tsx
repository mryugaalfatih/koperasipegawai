"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Plus,
  Printer,
  ReceiptText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { postCashTransaction } from "./actions";
import { disburseLoan } from "@/app/pinjaman/actions";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PrintKuitansiModal } from "@/components/PrintKuitansiModal";
import { SubmitButton } from "@/components/SubmitButton";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type CashTransactionRow = {
  id: string;
  direction: "in" | "out";
  amount: number;
  source_type: string;
  description: string | null;
  transaction_date: string;
};

type KasClientManagerProps = {
  accountRows: AccountRow[];
  cashRows: CashTransactionRow[];
  totalIn: number;
  totalOut: number;
  netCash: number;
  approvedLoans: ApprovedLoanRow[];
};

type ApprovedLoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  interest_method: string;
  annual_rate_snapshot: number | null;
  members: { full_name: string; member_no: string }[] | null;
  loan_products: { name: string }[] | null;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function KasClientManager({
  accountRows,
  cashRows,
  totalIn,
  totalOut,
  netCash,
  approvedLoans,
}: KasClientManagerProps) {
  const [printTransaction, setPrintTransaction] = useState<CashTransactionRow | null>(null);
  const [search, setSearch] = useState("");

  const filteredRows = cashRows.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.source_type.toLowerCase().includes(q) ||
      item.transaction_date.includes(q)
    );
  });

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/90 px-4 py-4 backdrop-blur md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Modul Operasional Kas</p>
            <h1 className="text-xl font-bold text-[#0b1220]">Keuangan Kas Harian</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-[#0b1220] shadow-sm ring-1 ring-[#dbe5f1] hover:bg-slate-50 transition-all"
              href="/kas-jurnal"
            >
              <span>Lihat Jurnal Akuntansi</span>
              <Scale className="size-4 text-[#2563eb]" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-4 md:px-7 md:py-6">
        {/* KPI Cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#dcfce7] text-[#15803d]">
                <ArrowDownLeft className="size-5" />
              </div>
              <span className="text-xs font-bold text-[#16a34a]">Penerimaan</span>
            </div>
            <p className="mt-4 text-xs font-bold text-[#64748b]">Total Kas Masuk</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalIn)}</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#fee2e2] text-[#b91c1c]">
                <ArrowUpRight className="size-5" />
              </div>
              <span className="text-xs font-bold text-[#dc2626]">Pengeluaran</span>
            </div>
            <p className="mt-4 text-xs font-bold text-[#64748b]">Total Kas Keluar</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalOut)}</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                <Landmark className="size-5" />
              </div>
              <span className="text-xs font-bold text-[#2563eb]">Net Flow</span>
            </div>
            <p className="mt-4 text-xs font-bold text-[#64748b]">Kas Bersih Harian</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(netCash)}</p>
          </article>
        </section>

        {/* Pinjaman Siap Cair — Kasir Section */}
        {approvedLoans.length > 0 && (
          <section className="rounded-[28px] bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm ring-1 ring-amber-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Menunggu Pencairan</p>
                <h2 className="text-base font-bold text-[#0b1220]">
                  Pinjaman Siap Cair ({approvedLoans.length})
                </h2>
              </div>
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                <ReceiptText className="size-5" />
              </span>
            </div>

            <div className="space-y-3">
              {approvedLoans.map((loan) => {
                const memberObj = Array.isArray(loan.members) ? loan.members[0] : (loan.members as unknown as { full_name: string; member_no: string } | null);
                const productName = Array.isArray(loan.loan_products) ? loan.loan_products[0]?.name : (loan.loan_products as unknown as { name: string } | null)?.name;
                const disburse = disburseLoan.bind(null, loan.id);

                return (
                  <div key={loan.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0b1220]">{memberObj?.full_name ?? "Anggota"}</p>
                        <p className="text-xs font-semibold text-[#64748b]">
                          No: {memberObj?.member_no ?? "-"} · {productName ?? "Pinjaman"} · {loan.tenor_months} bln · {Number(loan.annual_rate_snapshot ?? 0)}%/thn
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#2563eb]">{currency.format(Number(loan.principal ?? 0))}</p>
                      </div>
                      <form action={disburse} className="flex items-center gap-2">
                        <select name="fund_source" className="h-10 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900 outline-none">
                          <option value="kas">Via Kas</option>
                          <option value="bank">Via Bank</option>
                        </select>
                        <button type="submit" className="h-10 rounded-xl bg-[#0b1220] px-4 text-xs font-bold text-white hover:bg-[#1e293b] active:scale-95 transition-all cursor-pointer">
                          Cairkan
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Cash Transactions List */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Riwayat Transaksi</p>
                <h2 className="text-base font-bold text-[#0b1220]">Buku Kas Masuk & Keluar</h2>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi kas..."
                className="h-10 w-full sm:w-64 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </div>

            <div className="mt-4 divide-y divide-[#f1f5f9]">
              {filteredRows.length ? (
                filteredRows.map((item) => (
                  <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                          item.direction === "in"
                            ? "bg-[#dcfce7] text-[#16a34a]"
                            : "bg-[#fee2e2] text-[#dc2626]"
                        }`}
                      >
                        {item.direction === "in" ? (
                          <ArrowDownLeft className="size-5" />
                        ) : (
                          <ArrowUpRight className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#0b1220]">
                          {item.description ?? "Transaksi kas"}
                        </p>
                        <p className="text-xs font-semibold text-[#64748b]">
                          {item.transaction_date} · {item.source_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <div>
                        <p
                          className={`text-sm font-bold ${
                            item.direction === "in" ? "text-[#16a34a]" : "text-[#dc2626]"
                          }`}
                        >
                          {item.direction === "in" ? "+" : "-"}
                          {currency.format(Number(item.amount ?? 0))}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrintTransaction(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] active:scale-95 transition-all"
                        title="Cetak Kuitansi Kas"
                      >
                        <Printer className="size-3.5" />
                        <span>Kuitansi</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                  Belum ada transaksi kas harian.
                </div>
              )}
            </div>
          </section>

          {/* Input Cash Form Sidebar */}
          <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Kasir</p>
                <h2 className="text-base font-bold text-[#0b1220]">Input Kas Masuk / Keluar</h2>
              </div>
            </div>

            <form action={postCashTransaction} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Jenis Transaksi</span>
                <CustomSelect
                  defaultValue="out"
                  name="direction"
                  className="mt-1.5 h-11"
                >
                  <option value="out">Kas Keluar (Pengeluaran / Biaya)</option>
                  <option value="in">Kas Masuk (Penerimaan)</option>
                </CustomSelect>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Metode / Akun Sumber</span>
                <CustomSelect
                  defaultValue="kas"
                  name="fund_source"
                  className="mt-1.5 h-11"
                >
                  <option value="kas">Kas Tunai (1001)</option>
                  <option value="bank">Bank (1002)</option>
                </CustomSelect>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Kategori / Akun Lawan *</span>
                <SearchableSelect
                  name="counter_account_id"
                  required
                  placeholder="-- Ketik atau pilih akun kategori --"
                  searchPlaceholder="Ketik kode / nama akun..."
                  className="mt-1.5 h-11"
                  options={accountRows
                    .filter((acc) => acc.code !== "1001" && acc.code !== "1002")
                    .map((acc) => ({
                      value: acc.id,
                      label: `${acc.code} · ${acc.name}`,
                      sublabel: `Kategori: ${acc.category}`,
                    }))}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nominal Kas (Rp)</span>
                <CurrencyInput
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="amount"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  name="transaction_date"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Keterangan</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                  name="description"
                  placeholder="Contoh: Pembayaran rekening listrik & air kantor..."
                />
              </label>

              <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                Posting Transaksi Kas
              </SubmitButton>
            </form>
          </aside>
        </div>
      </div>

      {/* Print Kuitansi Modal (Only when printTransaction is set) */}
      {printTransaction ? (
        <PrintKuitansiModal
          data={{
            noKuitansi: `KAS-${printTransaction.id.slice(0, 8).toUpperCase()}`,
            tanggal: printTransaction.transaction_date,
            diterimaDari: printTransaction.description ?? "Transaksi Kas Operasional",
            tipeTransaksi: printTransaction.direction === "in" ? "Kas Masuk (Penerimaan)" : "Kas Keluar (Pengeluaran)",
            nominal: Number(printTransaction.amount ?? 0),
            keterangan: printTransaction.description ?? "Transaksi Kas Operasional",
            petugas: "Kasir / Teller",
          }}
          onClose={() => setPrintTransaction(null)}
        />
      ) : null}
    </section>
  );
}
