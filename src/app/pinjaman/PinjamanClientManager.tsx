"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CreditCard,
  FileCheck2,
  Landmark,
  Trash2,
  UsersRound,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { createLoan, approveLoan, disburseLoan, updateLoan, deleteLoan } from "./actions";

type MemberOption = {
  id: string;
  member_no: string;
  full_name: string;
};

type LoanProduct = {
  id: string;
  name: string;
  annual_rate: number;
  max_tenor_months: number;
  default_interest_method: "flat" | "annuity" | "interest_only";
  allow_method_override: boolean;
};

type LoanRow = {
  id: string;
  member_id: string;
  product_id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  interest_method: "flat" | "annuity" | "interest_only";
  annual_rate_snapshot: number | null;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

type PinjamanClientManagerProps = {
  memberOptions: MemberOption[];
  productRows: LoanProduct[];
  loanRows: LoanRow[];
  totalPortfolio: number;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  review: "Review",
  approved: "Disetujui",
  disbursed: "Dicairkan",
  closed: "Lunas",
  rejected: "Ditolak",
};

const methodLabels: Record<string, string> = {
  flat: "Flat",
  annuity: "Anuitas",
};

export function PinjamanClientManager({
  memberOptions,
  productRows,
  loanRows,
  totalPortfolio,
}: PinjamanClientManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRow | null>(null);

  // States for Create Form
  const [createProductId, setCreateProductId] = useState("");
  const [createAnnualRate, setCreateAnnualRate] = useState("");
  const [createInterestMethod, setCreateInterestMethod] = useState("flat");
  const [createAllowOverride, setCreateAllowOverride] = useState(true);

  // States for Edit Form
  const [editProductId, setEditProductId] = useState("");
  const [editAnnualRate, setEditAnnualRate] = useState("");
  const [editInterestMethod, setEditInterestMethod] = useState("flat");
  const [editAllowOverride, setEditAllowOverride] = useState(true);

  const handleCreateProductChange = (val: string) => {
    setCreateProductId(val);
    const prod = productRows.find((p) => p.id === val);
    if (prod) {
      setCreateAnnualRate(String(Number(prod.annual_rate)));
      setCreateInterestMethod(prod.default_interest_method);
      setCreateAllowOverride(!!prod.allow_method_override);
    } else {
      setCreateAnnualRate("");
      setCreateInterestMethod("flat");
      setCreateAllowOverride(true);
    }
  };

  const handleEditProductChange = (val: string) => {
    setEditProductId(val);
    const prod = productRows.find((p) => p.id === val);
    if (prod) {
      setEditAnnualRate(String(Number(prod.annual_rate)));
      setEditInterestMethod(prod.default_interest_method);
      setEditAllowOverride(!!prod.allow_method_override);
    } else {
      setEditAnnualRate("");
      setEditInterestMethod("flat");
      setEditAllowOverride(true);
    }
  };

  const openEdit = (loan: LoanRow) => {
    setEditingLoan(loan);
    setEditProductId(loan.product_id);
    setEditAnnualRate(loan.annual_rate_snapshot !== null ? String(loan.annual_rate_snapshot) : "");
    setEditInterestMethod(loan.interest_method);
    
    const prod = productRows.find((p) => p.id === loan.product_id);
    setEditAllowOverride(prod ? !!prod.allow_method_override : true);
  };

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

  const waitingApproval = loanRows.filter((l) => l.status === "submitted").length;
  const disbursedCount = loanRows.filter((l) => l.status === "disbursed").length;

  const handleSaveEdit = async (formData: FormData) => {
    if (!editingLoan) return;

    // Append disabled fields if they are not submitted by the browser
    if (!editAllowOverride) {
      formData.set("annual_rate", editAnnualRate);
      formData.set("interest_method", editInterestMethod);
    }

    const action = updateLoan.bind(null, editingLoan.id);
    await action(formData);
    setEditingLoan(null);
  };

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6 space-y-6">

        {/* CrudHeader */}
        <CrudHeader
          title="Master Pinjaman Anggota"
          subtitle="Kelola pengajuan, approval, pencairan, dan jadwal angsuran pinjaman."
          countBadge={`${loanRows.length} Pengajuan`}
          addButtonLabel="Buat Pengajuan Baru"
          onAddClick={() => setIsModalOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          statusFilterValue={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={[
            { value: "submitted", label: "Diajukan" },
            { value: "approved", label: "Disetujui" },
            { value: "disbursed", label: "Dicairkan" },
            { value: "closed", label: "Lunas" },
            { value: "rejected", label: "Ditolak" },
          ]}
        />

        {/* KPI Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl bg-[#07152f] p-5 text-white shadow-sm">
            <Landmark className="size-6 text-[#93c5fd]" />
            <p className="mt-4 text-xs font-bold text-[#bfdbfe]">Portofolio Cair</p>
            <p className="mt-1 text-2xl font-bold text-white">{currency.format(totalPortfolio)}</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <FileCheck2 className="size-6 text-[#2563eb]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Total Pengajuan</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{loanRows.length}</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <CalendarClock className="size-6 text-[#f59e0b]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Menunggu Approval</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{waitingApproval}</p>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <BadgeCheck className="size-6 text-[#16a34a]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Dicairkan</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{disbursedCount}</p>
          </article>
        </section>

        {/* Loan List */}
        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="overflow-hidden rounded-2xl border border-[#dbe5f1]">
            {filteredLoans.length ? (
              filteredLoans.map((loan) => {
                const memberObj = Array.isArray(loan.members)
                  ? loan.members[0]
                  : (loan.members as unknown as { full_name: string; member_no: string } | null);
                const memberName = memberObj?.full_name ?? "Anggota";
                const memberNo = memberObj?.member_no ?? "-";
                const productName = Array.isArray(loan.loan_products)
                  ? loan.loan_products[0]?.name
                  : (loan.loan_products as unknown as { name: string } | null)?.name;

                const approve = approveLoan.bind(null, loan.id);
                const disburse = disburseLoan.bind(null, loan.id);
                const removeLoan = deleteLoan.bind(null, loan.id);

                return (
                  <div
                    key={loan.id}
                    className="flex flex-col gap-3 border-b border-[#f1f5f9] p-4 transition-colors last:border-b-0 hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      className="flex items-center gap-3.5 min-w-0"
                      href={`/pinjaman/${loan.id}`}
                    >
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                        <UsersRound className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#0b1220]">{memberName}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            loan.status === "disbursed" ? "bg-emerald-50 text-emerald-600" :
                            loan.status === "approved" ? "bg-blue-50 text-blue-600" :
                            loan.status === "submitted" ? "bg-amber-50 text-amber-600" :
                            loan.status === "closed" ? "bg-slate-100 text-slate-600" :
                            loan.status === "rejected" ? "bg-rose-50 text-rose-600" :
                            "bg-[#f1f5f9] text-[#64748b]"
                          }`}>
                            {statusLabels[loan.status]}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#64748b]">
                          No: <span className="font-bold text-[#0b1220]">{memberNo}</span> · {productName ?? "Pinjaman"} · {methodLabels[loan.interest_method]} {Number(loan.annual_rate_snapshot ?? 0)}%/thn · {loan.tenor_months} bln
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between sm:justify-end gap-2 text-left sm:text-right">
                      <div className="mr-1">
                        <p className="text-base font-bold text-[#2563eb]">
                          {currency.format(Number(loan.principal ?? 0))}
                        </p>
                        <p className="text-[11px] font-medium text-[#94a3b8]">Plafond</p>
                      </div>

                      <Link
                        href={`/pinjaman/${loan.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#2563eb] bg-[#eaf2ff] px-3 text-xs font-bold text-[#2563eb] hover:bg-[#dbeafe] active:scale-95 transition-all"
                      >
                        Detail
                      </Link>

                      {loan.status !== "disbursed" && loan.status !== "closed" && loan.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => openEdit(loan)}
                          className="h-9 rounded-xl border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                      )}

                      {loan.status !== "disbursed" && loan.status !== "closed" && (
                        <form action={removeLoan} onSubmit={(e) => { if (!confirm(`Hapus pengajuan pinjaman ${memberName}?`)) e.preventDefault(); }}>
                          <button
                            type="submit"
                            className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </form>
                      )}

                      {loan.status === "submitted" ? (
                        <form action={approve}>
                          <button className="h-9 rounded-xl bg-[#2563eb] px-3 text-xs font-bold text-white hover:bg-[#1d4ed8] active:scale-95 transition-all cursor-pointer" type="submit">
                            Approve
                          </button>
                        </form>
                      ) : null}

                      {loan.status === "approved" ? (
                        <form action={disburse} className="flex items-center gap-1.5">
                          <select name="fund_source" className="h-9 rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-[11px] font-bold outline-none">
                            <option value="kas">Kas</option>
                            <option value="bank">Bank</option>
                          </select>
                          <button className="h-9 rounded-xl bg-[#0b1220] px-3 text-xs font-bold text-white hover:bg-[#1e293b] active:scale-95 transition-all cursor-pointer" type="submit">
                            Cairkan
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center">
                <CreditCard className="mx-auto size-10 text-[#94a3b8]" />
                <p className="mt-3 font-bold text-[#0b1220]">Pinjaman Tidak Ditemukan</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">
                  Coba ubah kata kunci pencarian atau status filter Anda.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Info Card */}
        <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
          <Banknote className="size-6 text-[#2563eb]" />
          <h2 className="mt-4 text-xl font-black">Catatan metode bunga</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
            <strong>Flat</strong> — Pokok dan jasa rata setiap bulan. <strong>Anuitas</strong> — Total angsuran relatif tetap, komposisi pokok vs bunga berubah.
            Jadwal angsuran otomatis dibuat saat pinjaman dicairkan.
          </p>
        </section>
      </div>

      {/* Modal: Buat Pengajuan Baru */}
      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Pengajuan Pinjaman Baru"
      >
        <form action={createLoan} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Anggota</span>
            <SearchableSelect
              name="member_id"
              placeholder="Cari nama / no anggota..."
              options={memberOptions.map((m) => ({
                value: m.id,
                label: `${m.full_name}`,
                sublabel: `No: ${m.member_no}`,
              }))}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Produk Pinjaman</span>
            <CustomSelect
              name="product_id"
              value={createProductId}
              onChange={(e) => handleCreateProductChange(e.target.value)}
              className="mt-2 h-12 text-sm"
              required
            >
              <option value="">Pilih produk</option>
              {productRows.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} | {methodLabels[p.default_interest_method]} | {Number(p.annual_rate)}%
                </option>
              ))}
            </CustomSelect>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Plafond Pinjaman</span>
              <CurrencyInput name="principal" placeholder="0" required />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Tenor (Bulan)</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                name="tenor_months"
                placeholder="12"
                required
                type="number"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Bunga Tahunan (%)</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb] disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                name="annual_rate"
                placeholder="Ikuti produk"
                type="number"
                step="0.0001"
                value={createAnnualRate}
                onChange={(e) => setCreateAnnualRate(e.target.value)}
                disabled={!createAllowOverride}
              />
              {!createAllowOverride && <input type="hidden" name="annual_rate" value={createAnnualRate} />}
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Metode Bunga</span>
              <CustomSelect
                name="interest_method"
                value={createInterestMethod}
                onChange={(e) => setCreateInterestMethod(e.target.value)}
                disabled={!createAllowOverride}
                className="mt-2 h-12 text-sm"
              >
                <option value="flat">Flat</option>
                <option value="annuity">Anuitas</option>
              </CustomSelect>
            </label>
          </div>

          <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Simpan Pengajuan
          </SubmitButton>
        </form>
      </CrudModal>

      {/* Modal: Edit Pengajuan */}
      {editingLoan && (
        <CrudModal
          isOpen={!!editingLoan}
          onClose={() => setEditingLoan(null)}
          title={`Edit Pengajuan: ${editingLoan.members?.[0]?.full_name ?? ""}`}
        >
          <form action={handleSaveEdit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Anggota</span>
              <SearchableSelect
                name="member_id"
                defaultValue={editingLoan.member_id}
                placeholder="Cari nama / no anggota..."
                options={memberOptions.map((m) => ({
                  value: m.id,
                  label: `${m.full_name}`,
                  sublabel: `No: ${m.member_no}`,
                }))}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#0b1220]">Produk Pinjaman</span>
              <CustomSelect
                name="product_id"
                value={editProductId}
                onChange={(e) => handleEditProductChange(e.target.value)}
                className="mt-2 h-12 text-sm"
                required
              >
                <option value="">Pilih produk</option>
                {productRows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} | {methodLabels[p.default_interest_method] ?? p.default_interest_method} | {Number(p.annual_rate)}%
                  </option>
                ))}
              </CustomSelect>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#0b1220]">Plafond Pinjaman</span>
                <CurrencyInput
                  name="principal"
                  defaultValue={editingLoan.principal}
                  placeholder="0"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#0b1220]">Tenor (Bulan)</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                  name="tenor_months"
                  defaultValue={editingLoan.tenor_months}
                  placeholder="12"
                  required
                  type="number"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#0b1220]">Bunga Tahunan (%)</span>
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb] disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  name="annual_rate"
                  value={editAnnualRate}
                  onChange={(e) => setEditAnnualRate(e.target.value)}
                  disabled={!editAllowOverride}
                  placeholder="Ikuti produk"
                  type="number"
                  step="0.0001"
                />
                {!editAllowOverride && <input type="hidden" name="annual_rate" value={editAnnualRate} />}
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#0b1220]">Metode Bunga</span>
                <CustomSelect
                  name="interest_method"
                  value={editInterestMethod}
                  onChange={(e) => setEditInterestMethod(e.target.value)}
                  disabled={!editAllowOverride}
                  className="mt-2 h-12 text-sm"
                >
                  <option value="flat">Flat</option>
                  <option value="annuity">Anuitas</option>
                  <option value="interest_only">Bayar Bunga Saja</option>
                </CustomSelect>
              </label>
            </div>

            <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Perubahan
            </SubmitButton>
          </form>
        </CrudModal>
      )}
    </section>
  );
}
