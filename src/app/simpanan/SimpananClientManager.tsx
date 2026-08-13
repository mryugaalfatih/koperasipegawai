"use client";

import { useState } from "react";
import Link from "next/link";
import {
  WalletCards,
  Landmark,
  ReceiptText,
  Banknote,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenCheck,
  CreditCard,
  Search,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { createSavingsAccount, postSavingsTransaction } from "./actions";

type MemberOption = {
  id: string;
  member_no: string;
  full_name: string;
};

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
};

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  savings_products: {
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
  savings_accounts: {
    account_no: string;
    members: {
      full_name: string;
    }[] | null;
  }[] | null;
};

type SimpananClientManagerProps = {
  memberOptions: MemberOption[];
  productRows: SavingsProduct[];
  accountRows: SavingsAccount[];
  transactionRows: SavingsTransaction[];
  totals: {
    total: number;
    pokok: number;
    wajib: number;
    sukarela: number;
  };
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const typeLabels = {
  pokok: "Pokok",
  wajib: "Wajib",
  sukarela: "Sukarela",
};

export function SimpananClientManager({
  memberOptions,
  productRows,
  accountRows,
  transactionRows,
  totals,
}: SimpananClientManagerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"accounts" | "history">("accounts");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Real-time search & filtering for Savings Accounts
  const filteredAccounts = accountRows.filter((acc) => {
    const memberName = acc.members?.[0]?.full_name ?? "";
    const memberNo = acc.members?.[0]?.member_no ?? "";
    const matchesSearch =
      !search ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      memberNo.toLowerCase().includes(search.toLowerCase()) ||
      acc.account_no.toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || acc.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Real-time search & filtering for Transactions
  const filteredTransactions = transactionRows.filter((t) => {
    const memberName = t.savings_accounts?.[0]?.members?.[0]?.full_name ?? "";
    const accountNo = t.savings_accounts?.[0]?.account_no ?? "";
    const matchesSearch =
      !search ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      accountNo.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Standar CrudHeader */}
      <CrudHeader
        title="Modul Simpanan Anggota"
        subtitle="Kelola setoran, penarikan, saldo simpanan pokok, wajib, & sukarela."
        countBadge={`${accountRows.length} Rekening`}
        addButtonLabel="Setor / Tarik Simpanan"
        onAddClick={() => setIsTransactionModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={typeFilter}
        onStatusFilterChange={setTypeFilter}
        statusOptions={[
          { value: "pokok", label: "Simpanan Pokok" },
          { value: "wajib", label: "Simpanan Wajib" },
          { value: "sukarela", label: "Simpanan Sukarela" },
        ]}
      />

      {/* Action Bar Tambahan: Buat Rekening Baru */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`h-9 rounded-xl px-2 text-xs font-bold transition-all ${
              activeTab === "accounts"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-[#f4f7fb] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b1220]"
            }`}
          >
            Daftar Rekening ({filteredAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`h-9 rounded-xl px-2 text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-[#f4f7fb] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b1220]"
            }`}
          >
            Riwayat Mutasi ({filteredTransactions.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAccountModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-white active:scale-95 transition-all"
        >
          <Plus className="size-4 text-[#2563eb]" />
          <span>Buat Rekening Baru</span>
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl bg-[#07152f] p-5 text-white shadow-sm">
          <WalletCards className="size-6 text-[#93c5fd]" />
          <p className="mt-4 text-xs font-bold text-[#bfdbfe]">Total Saldo Simpanan</p>
          <p className="mt-1 text-2xl font-bold text-white">{currency.format(totals.total)}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <Landmark className="size-6 text-[#2563eb]" />
          <p className="mt-4 text-xs font-bold text-[#64748b]">Simpanan Pokok</p>
          <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totals.pokok)}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <ReceiptText className="size-6 text-[#2563eb]" />
          <p className="mt-4 text-xs font-bold text-[#64748b]">Simpanan Wajib</p>
          <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totals.wajib)}</p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <Banknote className="size-6 text-[#16a34a]" />
          <p className="mt-4 text-xs font-bold text-[#64748b]">Simpanan Sukarela</p>
          <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totals.sukarela)}</p>
        </article>
      </section>

      {/* Tab 1: Daftar Rekening Simpanan */}
      {activeTab === "accounts" ? (
        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="overflow-hidden rounded-2xl border border-[#dbe5f1]">
            {filteredAccounts.length ? (
              filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 border-b border-[#f1f5f9] p-4 transition-colors last:border-b-0 hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                      <BookOpenCheck className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#0b1220]">
                          {account.members?.[0]?.full_name ?? "Anggota"}
                        </p>
                        <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748b]">
                          {typeLabels[account.type]}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#64748b]">
                        No Rek: {account.account_no} · Produk: {account.savings_products?.[0]?.name ?? typeLabels[account.type]}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-base font-bold text-[#2563eb]">
                      {currency.format(Number(account.balance ?? 0))}
                    </p>
                    <p className="text-[11px] font-medium text-[#94a3b8]">Saldo Efektif</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <WalletCards className="mx-auto size-10 text-[#94a3b8]" />
                <p className="mt-3 font-bold text-[#0b1220]">Rekening Tidak Ditemukan</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">
                  Coba ubah kata kunci pencarian atau jenis simpanan Anda.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Tab 2: Riwayat Mutasi Simpanan */}
      {activeTab === "history" ? (
        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="space-y-3">
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fbff] p-4 border border-[#e2e8f0]"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                        transaction.direction === "in"
                          ? "bg-[#dbeafe] text-[#1d4ed8]"
                          : "bg-[#fff1f2] text-[#be123c]"
                      }`}
                    >
                      {transaction.direction === "in" ? (
                        <ArrowDownLeft className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-sm text-[#0b1220]">
                        {transaction.savings_accounts?.[0]?.members?.[0]?.full_name ?? "Anggota"}
                      </p>
                      <p className="text-xs font-semibold text-[#64748b]">
                        {transaction.description ?? transaction.savings_accounts?.[0]?.account_no}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-sm ${
                        transaction.direction === "in" ? "text-[#16a34a]" : "text-[#be123c]"
                      }`}
                    >
                      {transaction.direction === "in" ? "+" : "-"}
                      {currency.format(Number(transaction.amount ?? 0))}
                    </p>
                    <p className="text-[11px] font-medium text-[#94a3b8]">
                      {transaction.transaction_date}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                Belum ada transaksi mutasi simpanan.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Modal 1: Form Setor / Tarik Simpanan */}
      <CrudModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        title="Setoran / Penarikan Simpanan"
        subtitle="Input transaksi setoran atau penarikan saldo anggota."
      >
        <form action={postSavingsTransaction} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Pilih Rekening Anggota *</span>
            <CustomSelect name="account_id" required className="mt-1.5 h-11">
              <option value="">-- Pilih Rekening Anggota --</option>
              {accountRows.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_no} · {account.members?.[0]?.full_name} ({typeLabels[account.type]})
                </option>
              ))}
            </CustomSelect>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Jenis Transaksi</span>
              <CustomSelect name="direction" defaultValue="in" className="mt-1.5 h-11">
                <option value="in">Setoran (Kas Masuk)</option>
                <option value="out">Penarikan (Kas Keluar)</option>
              </CustomSelect>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="transaction_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Nominal Transaksi (Rp) *</span>
            <CurrencyInput
              name="amount"
              placeholder="0"
              required
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Nomor Referensi</span>
            <input
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
              name="reference_no"
              placeholder="Opsional (No Kuitansi / Bukti Transfer)"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Keterangan Transaksi</span>
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
              name="description"
              placeholder="Keterangan setoran/penarikan..."
            />
          </label>

          <div className="pt-2">
            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Posting Transaksi Simpanan
            </SubmitButton>
          </div>
        </form>
      </CrudModal>

      {/* Modal 2: Buat Rekening Baru */}
      <CrudModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Pembukaan Rekening Simpanan"
        subtitle="Daftarkan rekening simpanan pokok, wajib, atau sukarela untuk anggota."
      >
        <form action={createSavingsAccount} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Pilih Anggota Koperasi *</span>
            <CustomSelect name="member_id" required className="mt-1.5 h-11">
              <option value="">-- Pilih Anggota --</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.member_no} · {member.full_name}
                </option>
              ))}
            </CustomSelect>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Produk Simpanan *</span>
            <CustomSelect name="product_id" required className="mt-1.5 h-11">
              <option value="">-- Pilih Produk Simpanan --</option>
              {productRows.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} · {product.name}
                </option>
              ))}
            </CustomSelect>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Nomor Rekening</span>
            <input
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
              name="account_no"
              placeholder="Kosongkan untuk nomor otomatis"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Saldo Awal Setoran (Rp)</span>
              <CurrencyInput
                name="opening_balance"
                placeholder="0"
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Metode Pembayaran</span>
              <CustomSelect name="payment_method" defaultValue="kas" className="mt-1.5 h-11">
                <option value="kas">Via Kas Tunai</option>
                <option value="bank">Via Transfer Bank</option>
              </CustomSelect>
            </label>
          </div>

          <div className="pt-2">
            <SubmitButton className="h-11 w-full rounded-2xl bg-[#0b1220] text-xs font-bold text-white hover:bg-slate-800">
              Buat Rekening Simpanan
            </SubmitButton>
          </div>
        </form>
      </CrudModal>
    </div>
  );
}
