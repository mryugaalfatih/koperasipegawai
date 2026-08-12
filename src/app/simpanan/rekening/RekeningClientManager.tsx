"use client";

import { useState } from "react";
import Link from "next/link";
import {
  WalletCards,
  Landmark,
  ReceiptText,
  Banknote,
  Plus,
  BookOpenCheck,
  Search,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { createSavingsAccount, updateSavingsAccountStatus } from "../actions";




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

type RekeningClientManagerProps = {
  memberOptions: MemberOption[];
  productRows: SavingsProduct[];
  accountRows: SavingsAccount[];
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

export function RekeningClientManager({
  memberOptions,
  productRows,
  accountRows,
  totals,
}: RekeningClientManagerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedEditAccount, setSelectedEditAccount] = useState<SavingsAccount | null>(null);


  // Real-time search & filtering for Savings Accounts
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


  return (
    <div className="space-y-6">
      {/* Standar CrudHeader */}
      <CrudHeader
        title="Master Rekening Simpanan"
        subtitle="Kelola pembukaan rekening simpanan pokok, wajib, & sukarela anggota."
        countBadge={`${accountRows.length} Rekening`}
        addButtonLabel="Buat Rekening Baru"
        onAddClick={() => setIsAccountModalOpen(true)}
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

      {/* KPI Summary Cards */}
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

      {/* Daftar Rekening Simpanan */}
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-hidden rounded-2xl border border-[#dbe5f1]">
          {filteredAccounts.length ? (
            filteredAccounts.map((account) => {
              const memberObj = Array.isArray(account.members)
                ? account.members[0]
                : (account.members as unknown as { full_name: string; member_no: string } | null);

              const memberName = memberObj?.full_name ?? "Anggota";
              const memberNo = memberObj?.member_no ?? "-";
              const productName = Array.isArray(account.savings_products)
                ? account.savings_products[0]?.name
                : (account.savings_products as unknown as { name: string } | null)?.name;

              return (
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
                          {memberName}
                        </p>
                        <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748b]">
                          {typeLabels[account.type]}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#64748b]">
                        No Anggota: <span className="font-bold text-[#0b1220]">{memberNo}</span> · No Rek: {account.account_no} · Produk: {productName ?? typeLabels[account.type]}
                      </p>
                    </div>
                  </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 text-left sm:text-right">
                    <div className="mr-1">
                      <p className="text-base font-bold text-[#2563eb]">
                        {currency.format(Number(account.balance ?? 0))}
                      </p>
                      <p className="text-[11px] font-medium text-[#94a3b8]">Saldo Efektif</p>
                    </div>

                    <Link
                      href={`/simpanan/rekening/${account.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#2563eb] bg-[#eaf2ff] px-3 text-xs font-bold text-[#2563eb] hover:bg-[#dbeafe] active:scale-95 transition-all"
                    >
                      Mutasi
                    </Link>

                    <button
                      type="button"
                      onClick={() => setSelectedEditAccount(account)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold text-[#0b1220] hover:bg-white active:scale-95 transition-all"
                    >
                      Status / Edit
                    </button>
                  </div>
                </div>
              );
            })


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

      {/* Modal: Buat Rekening Baru */}
      <CrudModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Pembukaan Rekening Simpanan"
        subtitle="Daftarkan rekening simpanan pokok, wajib, atau sukarela untuk anggota."
      >
        <form action={createSavingsAccount} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Pilih Anggota Koperasi *</span>
            <SearchableSelect
              name="member_id"
              required
              placeholder="-- Ketik nama atau nomor anggota --"
              searchPlaceholder="Ketik untuk mencari nama / no anggota..."
              className="mt-1.5 h-11"
              options={memberOptions.map((m) => ({
                value: m.id,
                label: m.full_name,
                sublabel: `No: ${m.member_no}`,
              }))}
            />
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
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
              name="account_no"
              placeholder="Kosongkan untuk nomor otomatis"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Saldo Awal Setoran (Rp)</span>
            <CurrencyInput
              name="opening_balance"
              placeholder="0"
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
            />
          </label>

          <div className="pt-2">
            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Buat Rekening Simpanan
            </SubmitButton>
          </div>
        </form>
      </CrudModal>

      {/* Modal: Edit Status / Tutup Rekening */}
      <CrudModal
        isOpen={Boolean(selectedEditAccount)}
        onClose={() => setSelectedEditAccount(null)}
        title="Ubah Status / Tutup Rekening"
        subtitle={`No Rekening: ${selectedEditAccount?.account_no ?? ""}`}
      >
        {selectedEditAccount ? (
          <form
            action={async (formData) => {
              await updateSavingsAccountStatus(selectedEditAccount.id, formData);
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nomor Rekening</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f1f5f9] px-4 text-xs font-bold text-[#64748b] outline-none"
                defaultValue={selectedEditAccount.account_no}
                disabled
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Status Rekening</span>
              <CustomSelect name="status" defaultValue="active" className="mt-1.5 h-11">
                <option value="active">Aktif (Dapat Bertransaksi)</option>
                <option value="inactive">Nonaktif / Tutup Rekening</option>
              </CustomSelect>
            </label>

            <div className="pt-2">
              <SubmitButton className="h-11 w-full rounded-2xl bg-[#0b1220] text-xs font-bold text-white hover:bg-slate-800">
                Simpan Perubahan Status
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </CrudModal>
    </div>
  );
}


