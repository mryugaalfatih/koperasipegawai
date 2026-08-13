"use client";

import { useState } from "react";
import {
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import {
  saveCooperativeProfile,
  createFiscalPeriod,
  createSavingsProduct,
  createLoanProduct,
  updateSavingsProduct,
  updateLoanProduct,
  createAccount,
  updateAccount,
} from "./actions";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";

type CooperativeProfile = {
  id: string;
  name: string;
  legal_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscal_year_start_month: number;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
};

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
  minimum_balance: number;
  monthly_required_amount: number;
  withdrawable: boolean;
};

type LoanProduct = {
  id: string;
  name: string;
  annual_rate: number;
  max_tenor_months: number;
  admin_fee_percent: number;
  default_interest_method: "flat" | "annuity";
  allow_method_override: boolean;
};

type FiscalPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
  branches: {
    name: string;
  }[] | null;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: "asset" | "liability" | "equity" | "income" | "expense";
  normal_balance: "in" | "out";
};

type KonfigurasiClientManagerProps = {
  koperasi: CooperativeProfile | null;
  branchRows: Branch[];
  fiscalRows: FiscalPeriod[];
  savingsRows: SavingsProduct[];
  loanRows: LoanProduct[];
  accountRows: AccountRow[];
  defaultBranchId: string;
  profileName: string;
  profileRole: string;
};

const categoryLabels: Record<string, string> = {
  asset: "Aset / Aktiva",
  liability: "Kewajiban / Pasiva",
  equity: "Modal / Ekuitas",
  income: "Pendapatan",
  expense: "Beban / Pengeluaran",
};

const monthOptions = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function KonfigurasiClientManager({
  koperasi,
  fiscalRows,
  savingsRows,
  loanRows,
  accountRows = [],
  defaultBranchId,
}: KonfigurasiClientManagerProps) {
  const [activeTab, setActiveTab] = useState<"profil" | "simpanan" | "pinjaman" | "coa">("profil");

  const [editingSavingsProduct, setEditingSavingsProduct] = useState<SavingsProduct | null>(null);
  const [editingLoanProduct, setEditingLoanProduct] = useState<LoanProduct | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);

  const handleSaveSavingsProduct = async (formData: FormData) => {
    if (!editingSavingsProduct) return;
    const action = updateSavingsProduct.bind(null, editingSavingsProduct.id);
    await action(formData);
    setEditingSavingsProduct(null);
  };

  const handleSaveLoanProduct = async (formData: FormData) => {
    if (!editingLoanProduct) return;
    const action = updateLoanProduct.bind(null, editingLoanProduct.id);
    await action(formData);
    setEditingLoanProduct(null);
  };

  const handleSaveAccount = async (formData: FormData) => {
    if (!editingAccount) return;
    const action = updateAccount.bind(null, editingAccount.id);
    await action(formData);
    setEditingAccount(null);
  };

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      {/* Header Standardized CrudHeader */}
      <div className="sticky top-0 z-20 bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7 border-b border-[#dbe5f1]">
        <CrudHeader
          title="Konfigurasi & Setup Koperasi"
          subtitle="Pengaturan profil legal, produk simpanan, produk pinjaman, & periode buku."
          countBadge={`${savingsRows.length + loanRows.length} Produk · ${accountRows.length} Akun COA`}
        />

      </div>

      <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4 md:px-6 md:py-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dbe5f1] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "profil"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-slate-100 ring-1 ring-[#dbe5f1]"
            }`}
          >
            <Landmark className="size-4" />
            <span>Profil Koperasi & Tahun Buku</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("simpanan")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "simpanan"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-slate-100 ring-1 ring-[#dbe5f1]"
            }`}
          >
            <PiggyBank className="size-4" />
            <span>Produk Simpanan ({savingsRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pinjaman")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "pinjaman"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-slate-100 ring-1 ring-[#dbe5f1]"
            }`}
          >
            <CreditCard className="size-4" />
            <span>Produk Pinjaman ({loanRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coa")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "coa"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-white text-[#64748b] hover:bg-slate-100 ring-1 ring-[#dbe5f1]"
            }`}
          >
            <BookOpenCheck className="size-4" />
            <span>Bagan Akun COA ({accountRows.length})</span>
          </button>
        </div>

        {/* Tab 1: Profil Koperasi & Tahun Buku */}
        {activeTab === "profil" ? (
          <div className="space-y-6">
            <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Fondasi Operasional</p>
                  <h2 className="mt-1.5 text-xl font-bold md:text-2xl">Profil Legal & Periode Tahun Buku</h2>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#cbd5e1]">
                    Identitas badan hukum dan pengaturan periode buku koperasi digunakan untuk pencetakan laporan dan pembukuan resmi RAT.
                  </p>
                </div>
                <Settings2 className="size-8 text-[#93c5fd]" />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              {/* Form Profil Koperasi */}
              <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center gap-3 border-b border-[#f1f5f9] pb-4">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <Landmark className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1220]">Profil Legal Koperasi</h2>
                    <p className="text-xs font-semibold text-[#64748b]">Informasi identitas badan hukum resmi</p>
                  </div>
                </div>

                <form action={saveCooperativeProfile} className="mt-5 grid gap-4 md:grid-cols-2">
                  <input name="id" type="hidden" value={koperasi?.id ?? ""} />

                  <label className="block md:col-span-2">
                    <span className="text-xs font-bold uppercase text-[#475569]">Nama Koperasi *</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={koperasi?.name ?? ""}
                      name="name"
                      placeholder="Contoh: Koperasi Pegawai Sejahtera"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Nomor Badan Hukum</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={koperasi?.legal_number ?? ""}
                      name="legal_number"
                      placeholder="AHU-XXXXX.AH.01.26"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Awal Tahun Buku *</span>
                    <CustomSelect
                      defaultValue={String(koperasi?.fiscal_year_start_month ?? 1)}
                      name="fiscal_year_start_month"
                      className="mt-1.5 h-11"
                    >
                      {monthOptions.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Email Resmi Koperasi</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={koperasi?.email ?? ""}
                      name="email"
                      placeholder="koperasi@domain.com"
                      type="email"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Telepon / Whatsapp</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={koperasi?.phone ?? ""}
                      name="phone"
                      placeholder="0812XXXXXXXX"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-xs font-bold uppercase text-[#475569]">Alamat Lengkap Kantor</span>
                    <textarea
                      className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                      defaultValue={koperasi?.address ?? ""}
                      name="address"
                      placeholder="Alamat kantor koperasi..."
                    />
                  </label>

                  <div className="md:col-span-2 pt-2">
                    <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                      Simpan Profil Koperasi
                    </SubmitButton>
                  </div>
                </form>
              </section>

              {/* Sidebar: Tahun Buku & Unit Usaha */}
              <aside className="space-y-6">
                {/* Status Unit Usaha Multi-Unit */}
                <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                  <div className="flex items-center gap-3 border-b border-[#f1f5f9] pb-3">
                    <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#0b1220]">Unit Usaha Terdaftar</h2>
                      <p className="text-xs font-semibold text-[#64748b]">Sistem multi-unit bisnis terintegrasi</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#eff6ff] p-3.5 border border-[#bfdbfe]">
                      <div>
                        <span className="font-bold text-xs text-[#1e40af]">USP · Simpan Pinjam</span>
                        <p className="text-[11px] font-semibold text-[#3b82f6]">Pengelolaan simpanan & pinjaman</p>
                      </div>
                      <span className="rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Aktif
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1]">
                      <div>
                        <span className="font-bold text-xs text-[#0b1220]">TOKO · Waserda Ritel</span>
                        <p className="text-[11px] font-semibold text-[#64748b]">Penjualan barang & kasir POS</p>
                      </div>
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-bold text-[#64748b]">
                        Siap Diaktifkan
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1]">
                      <div>
                        <span className="font-bold text-xs text-[#0b1220]">JASA · Sewa & Layanan</span>
                        <p className="text-[11px] font-semibold text-[#64748b]">Penyewaan aset & jasa layanan</p>
                      </div>
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-bold text-[#64748b]">
                        Siap Diaktifkan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tahun Buku Periode */}
                <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                  <div className="flex items-center gap-3 border-b border-[#f1f5f9] pb-3">
                    <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                      <CalendarDays className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#0b1220]">Periode Tahun Buku</h2>
                      <p className="text-xs font-semibold text-[#64748b]">Buka pembukuan fiskal baru</p>
                    </div>
                  </div>

                  <form action={createFiscalPeriod} className="mt-4 space-y-3">
                    <input type="hidden" name="branch_id" value={defaultBranchId} />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-bold uppercase text-[#475569]">Tahun</span>
                        <input
                          className="mt-1 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                          defaultValue={new Date().getFullYear()}
                          name="year"
                          type="number"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-bold uppercase text-[#475569]">Bulan Awal</span>
                        <CustomSelect defaultValue="1" name="month" className="mt-1 h-10 text-xs">
                          {monthOptions.map((month, index) => (
                            <option key={month} value={index + 1}>
                              {month}
                            </option>
                          ))}
                        </CustomSelect>
                      </label>
                    </div>

                    <SubmitButton className="h-10 w-full rounded-2xl bg-[#0b1220] text-xs font-bold text-white hover:bg-slate-800">
                      Buka Periode Buku
                    </SubmitButton>
                  </form>

                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {fiscalRows.map((period) => (
                      <div className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3 border border-[#e2e8f0]" key={period.id}>
                        <span className="text-xs font-bold text-[#0b1220]">
                          {monthOptions[period.month - 1]} {period.year}
                        </span>
                        <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
                          {period.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {/* Tab 2: Produk Simpanan */}
        {activeTab === "simpanan" ? (
          <div className="space-y-6">
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <PiggyBank className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1220]">Pengaturan Produk Simpanan</h2>
                    <p className="text-xs font-semibold text-[#64748b]">Kelola jenis simpanan pokok, wajib, & sukarela</p>
                  </div>
                </div>
              </div>

              <form action={createSavingsProduct} className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Kode Produk *</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="code"
                    placeholder="Contoh: SW-01"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Produk *</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="name"
                    placeholder="Contoh: Simpanan Wajib Bulanan"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Kategori Simpanan *</span>
                  <CustomSelect defaultValue="wajib" name="type" className="mt-1.5 h-11">
                    <option value="pokok">Pokok (Modal Anggota)</option>
                    <option value="wajib">Wajib (Bulanan)</option>
                    <option value="sukarela">Sukarela (Bisa Ditarik)</option>
                  </CustomSelect>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Saldo Minimal (Rp)</span>
                  <CurrencyInput
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="minimum_balance"
                    placeholder="0"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Setoran Wajib Bulanan (Rp)</span>
                  <CurrencyInput
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="monthly_required_amount"
                    placeholder="0"
                  />
                </label>

                <div className="block flex items-end">
                  <label className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold text-[#0b1220]">
                    <span>Dapat Ditarik Kapan Saja</span>
                    <input className="size-4 accent-[#2563eb]" name="withdrawable" type="checkbox" />
                  </label>
                </div>

                <div className="md:col-span-3 pt-2">
                  <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                    Tambah Produk Simpanan
                  </SubmitButton>
                </div>
              </form>

              {/* Daftar Produk Simpanan */}
              <div className="mt-6 border-t border-[#f1f5f9] pt-6">
                <h3 className="text-xs font-bold uppercase text-[#64748b] mb-3">Daftar Produk Simpanan Aktif</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {savingsRows.map((product) => (
                    <div className="rounded-2xl bg-[#f8fbff] p-4 border border-[#e2e8f0] flex items-center justify-between gap-3" key={product.id}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2563eb] bg-[#eaf2ff] px-2 py-0.5 rounded-lg">
                            {product.code}
                          </span>
                          <span className="font-bold text-sm text-[#0b1220]">{product.name}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#64748b]">
                          Min Saldo: {currency.format(Number(product.minimum_balance))} · Wajib: {currency.format(Number(product.monthly_required_amount))}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-[#475569] uppercase">
                          {product.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSavingsProduct(product)}
                          className="h-8 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Pencil className="size-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {/* Tab 3: Produk Pinjaman */}
        {activeTab === "pinjaman" ? (
          <div className="space-y-6">
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1220]">Pengaturan Produk Pinjaman</h2>
                    <p className="text-xs font-semibold text-[#64748b]">Skema suku bunga, tenor maksimal, & biaya administrasi</p>
                  </div>
                </div>
              </div>

              <form action={createLoanProduct} className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="block md:col-span-3">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Produk Pinjaman *</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="name"
                    placeholder="Contoh: Pinjaman Reguler Anggota"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Suku Bunga Tahunan (%)</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="annual_rate"
                    placeholder="12"
                    step="0.0001"
                    type="number"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Tenor Maksimal (Bulan)</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="max_tenor_months"
                    placeholder="24"
                    type="number"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Biaya Administrasi (%)</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="admin_fee_percent"
                    placeholder="1.0"
                    step="0.0001"
                    type="number"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Metode Bunga Standar</span>
                  <CustomSelect defaultValue="flat" name="default_interest_method" className="mt-1.5 h-11">
                    <option value="flat">Flat (Rata Bunga & Pokok)</option>
                    <option value="annuity">Anuitas (Angsuran Tetap)</option>
                  </CustomSelect>
                </label>

                <div className="block md:col-span-2 flex items-end">
                  <label className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold text-[#0b1220]">
                    <span>Metode Bunga Boleh Diubah Saat Pengajuan</span>
                    <input className="size-4 accent-[#2563eb]" name="allow_method_override" type="checkbox" />
                  </label>
                </div>

                <div className="md:col-span-3 pt-2">
                  <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                    Tambah Produk Pinjaman
                  </SubmitButton>
                </div>
              </form>

              {/* Daftar Produk Pinjaman */}
              <div className="mt-6 border-t border-[#f1f5f9] pt-6">
                <h3 className="text-xs font-bold uppercase text-[#64748b] mb-3">Daftar Produk Pinjaman Aktif</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {loanRows.map((product) => (
                    <div className="rounded-2xl bg-[#f8fbff] p-4 border border-[#e2e8f0] flex items-center justify-between gap-3" key={product.id}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0b1220]">{product.name}</span>
                          <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                            {product.default_interest_method === "annuity" ? "Anuitas" : "Flat"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#64748b]">
                          {Number(product.annual_rate)}%/thn · Tenor s/d {product.max_tenor_months} bln · Admin {Number(product.admin_fee_percent)}%
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingLoanProduct(product)}
                        className="h-8 shrink-0 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Pencil className="size-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Edukasi Metode Bunga */}
            <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6 border border-[#bfdbfe]">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-[#2563eb]" />
                <div>
                  <h3 className="text-base font-bold text-[#0b1220]">Penjelasan Perhitungan Bunga</h3>
                  <p className="text-xs font-semibold text-[#475569]">
                    Metode bunga mengunci rumus angsuran agar tidak berubah saat produk diperbarui.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 border border-[#dbeafe]">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-[#2563eb]" />
                    <span className="font-bold text-sm text-[#0b1220]">Metode Flat</span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[#64748b] leading-relaxed">
                    Bunga dihitung proporsional dari pokok awal. Cicilan pokok dan cicilan bunga selalu sama nilainya setiap bulan.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 border border-[#dbeafe]">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-[#2563eb]" />
                    <span className="font-bold text-sm text-[#0b1220]">Metode Anuitas</span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[#64748b] leading-relaxed">
                    Total angsuran bulanan tetap konstan, namun porsi bunga lebih besar di awal dan porsi pokok membesar menjelang pelunasan.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {/* Tab 4: Bagan Akun COA */}
        {activeTab === "coa" ? (
          <div className="space-y-6">
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <BookOpenCheck className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1220]">Master Chart of Accounts (Bagan Akun COA)</h2>
                    <p className="text-xs font-semibold text-[#64748b]">Kelola kode akun akuntansi, kategori, & posisi saldo normal</p>
                  </div>
                </div>
              </div>

              {/* Form Tambah Akun Baru */}
              <form action={createAccount} className="mt-5 grid gap-4 md:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Kode Akun *</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="code"
                    placeholder="Contoh: 1003"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Akun *</span>
                  <input
                    className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    name="name"
                    placeholder="Contoh: Kas Kecil Operasional"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Kategori Akun *</span>
                  <CustomSelect defaultValue="asset" name="category" className="mt-1.5 h-11">
                    <option value="asset">Aset / Aktiva (Asset)</option>
                    <option value="liability">Kewajiban / Pasiva (Liability)</option>
                    <option value="equity">Modal / Ekuitas (Equity)</option>
                    <option value="income">Pendapatan (Income)</option>
                    <option value="expense">Beban / Pengeluaran (Expense)</option>
                  </CustomSelect>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Saldo Normal *</span>
                  <CustomSelect defaultValue="in" name="normal_balance" className="mt-1.5 h-11">
                    <option value="in">Debit (Debet)</option>
                    <option value="out">Kredit (Kredit)</option>
                  </CustomSelect>
                </label>

                <div className="md:col-span-4 pt-2">
                  <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                    Tambah Akun COA Baru
                  </SubmitButton>
                </div>
              </form>

              {/* Tabel Daftar Akun COA */}
              <div className="mt-6 border-t border-[#f1f5f9] pt-6">
                <h3 className="text-xs font-bold uppercase text-[#64748b] mb-3">Daftar Akun Terdaftar ({accountRows.length})</h3>
                <div className="overflow-hidden rounded-2xl border border-[#e2e8f0]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f8fbff] text-[#475569] border-b border-[#e2e8f0]">
                        <th className="px-4 py-3 font-bold uppercase">Kode</th>
                        <th className="px-4 py-3 font-bold uppercase">Nama Akun</th>
                        <th className="px-4 py-3 font-bold uppercase">Kategori</th>
                        <th className="px-4 py-3 font-bold uppercase">Saldo Normal</th>
                        <th className="px-4 py-3 font-bold uppercase text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {accountRows.map((acc) => (
                        <tr key={acc.id} className="hover:bg-[#f8fbff]/60">
                          <td className="px-4 py-3 font-mono font-bold text-[#2563eb]">{acc.code}</td>
                          <td className="px-4 py-3 font-bold text-[#0b1220]">{acc.name}</td>
                          <td className="px-4 py-3 font-semibold text-[#64748b]">
                            {categoryLabels[acc.category] ?? acc.category}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                acc.normal_balance === "in"
                                  ? "bg-[#dcfce7] text-[#16a34a]"
                                  : "bg-[#eff6ff] text-[#2563eb]"
                              }`}
                            >
                              {acc.normal_balance === "in" ? "Debit" : "Kredit"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingAccount(acc)}
                              className="h-8 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="size-3.5" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* Modal Edit Produk Simpanan */}
      {editingSavingsProduct && (
        <CrudModal
          isOpen={!!editingSavingsProduct}
          onClose={() => setEditingSavingsProduct(null)}
          title={`Edit Produk Simpanan: ${editingSavingsProduct.name}`}
        >
          <form action={handleSaveSavingsProduct} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Kode Produk *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="code"
                defaultValue={editingSavingsProduct.code}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Produk *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="name"
                defaultValue={editingSavingsProduct.name}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Kategori Simpanan *</span>
              <CustomSelect defaultValue={editingSavingsProduct.type} name="type" className="mt-1.5 h-11">
                <option value="pokok">Pokok (Modal Anggota)</option>
                <option value="wajib">Wajib (Bulanan)</option>
                <option value="sukarela">Sukarela (Bisa Ditarik)</option>
              </CustomSelect>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Saldo Minimal (Rp)</span>
              <CurrencyInput
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="minimum_balance"
                defaultValue={editingSavingsProduct.minimum_balance}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Setoran Wajib Bulanan (Rp)</span>
              <CurrencyInput
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="monthly_required_amount"
                defaultValue={editingSavingsProduct.monthly_required_amount}
              />
            </label>

            <div className="block flex items-end">
              <label className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold text-[#0b1220]">
                <span>Dapat Ditarik Kapan Saja</span>
                <input
                  className="size-4 accent-[#2563eb]"
                  name="withdrawable"
                  type="checkbox"
                  defaultChecked={editingSavingsProduct.withdrawable}
                />
              </label>
            </div>

            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Perubahan Produk Simpanan
            </SubmitButton>
          </form>
        </CrudModal>
      )}

      {/* Modal Edit Produk Pinjaman */}
      {editingLoanProduct && (
        <CrudModal
          isOpen={!!editingLoanProduct}
          onClose={() => setEditingLoanProduct(null)}
          title={`Edit Produk Pinjaman: ${editingLoanProduct.name}`}
        >
          <form action={handleSaveLoanProduct} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Produk Pinjaman *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="name"
                defaultValue={editingLoanProduct.name}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Suku Bunga Tahunan (%)</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="annual_rate"
                defaultValue={editingLoanProduct.annual_rate}
                step="0.0001"
                type="number"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Tenor Maksimal (Bulan)</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="max_tenor_months"
                defaultValue={editingLoanProduct.max_tenor_months}
                type="number"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Biaya Administrasi (%)</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="admin_fee_percent"
                defaultValue={editingLoanProduct.admin_fee_percent}
                step="0.0001"
                type="number"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Metode Bunga Standar</span>
              <CustomSelect defaultValue={editingLoanProduct.default_interest_method} name="default_interest_method" className="mt-1.5 h-11">
                <option value="flat">Flat (Rata Bunga & Pokok)</option>
                <option value="annuity">Anuitas (Angsuran Tetap)</option>
              </CustomSelect>
            </label>

            <div className="block flex items-end">
              <label className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold text-[#0b1220]">
                <span>Metode Bunga Boleh Diubah Saat Pengajuan</span>
                <input
                  className="size-4 accent-[#2563eb]"
                  name="allow_method_override"
                  type="checkbox"
                  defaultChecked={editingLoanProduct.allow_method_override}
                />
              </label>
            </div>

            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Perubahan Produk Pinjaman
            </SubmitButton>
          </form>
        </CrudModal>
      )}

      {/* Modal Edit Akun COA */}
      {editingAccount && (
        <CrudModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          title={`Edit Akun COA: ${editingAccount.code} · ${editingAccount.name}`}
        >
          <form action={handleSaveAccount} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Kode Akun *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="code"
                defaultValue={editingAccount.code}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Nama Akun *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                name="name"
                defaultValue={editingAccount.name}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Kategori Akun *</span>
              <CustomSelect defaultValue={editingAccount.category} name="category" className="mt-1.5 h-11">
                <option value="asset">Aset / Aktiva (Asset)</option>
                <option value="liability">Kewajiban / Pasiva (Liability)</option>
                <option value="equity">Modal / Ekuitas (Equity)</option>
                <option value="income">Pendapatan (Income)</option>
                <option value="expense">Beban / Pengeluaran (Expense)</option>
              </CustomSelect>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Saldo Normal *</span>
              <CustomSelect defaultValue={editingAccount.normal_balance} name="normal_balance" className="mt-1.5 h-11">
                <option value="in">Debit (Debet)</option>
                <option value="out">Kredit (Kredit)</option>
              </CustomSelect>
            </label>

            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Perubahan Akun COA
            </SubmitButton>
          </form>
        </CrudModal>
      )}
    </section>
  );
}
