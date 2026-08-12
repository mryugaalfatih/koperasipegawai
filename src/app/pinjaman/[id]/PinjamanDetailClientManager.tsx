"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  Printer,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { postInstallmentPayment } from "./actions";

type LoanDetail = {
  id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  admin_fee_percent_snapshot: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
  members: {
    full_name: string;
    member_no: string;
    phone: string | null;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

type InstallmentRow = {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  penalty_due: number;
  paid_amount: number;
  principal_paid: number;
  interest_paid: number;
  paid_at: string | null;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  total_paid: number;
};

type PinjamanDetailClientManagerProps = {
  loanDetail: LoanDetail;
  installmentRows: InstallmentRow[];
  paymentRows: PaymentRow[];
  cooperativeProfile?: {
    name: string;
    legal_number: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  error?: string;
  paid?: string;
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

function generateInstallmentSimulation(principal: number, tenor: number, annualRate: number, method: string) {
  const monthlyRate = annualRate / 100 / 12;
  const startDate = new Date();

  const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next.toISOString().slice(0, 10);
  };

  return Array.from({ length: tenor }, (_, index) => {
    const installmentNo = index + 1;
    let pDue = 0;
    let iDue = 0;

    if (method === "annuity") {
      const monthlyPayment = monthlyRate === 0
        ? principal / tenor
        : principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -tenor)));
      const remainingBefore = principal - (principal / tenor) * index;
      iDue = remainingBefore * monthlyRate;
      pDue = Math.max(monthlyPayment - iDue, 0);
    } else { // flat or default
      pDue = principal / tenor;
      iDue = principal * monthlyRate;
    }

    return {
      id: `sim-${installmentNo}`,
      installment_no: installmentNo,
      due_date: addMonths(startDate, installmentNo),
      principal_due: Math.round(pDue),
      interest_due: Math.round(iDue),
      penalty_due: 0,
      paid_amount: 0,
      principal_paid: 0,
      interest_paid: 0,
      paid_at: null,
    };
  });
}

function getInstallmentStatus(inst: InstallmentRow) {
  const pDue = Number(inst.principal_due ?? 0);
  const iDue = Number(inst.interest_due ?? 0);
  const pPaid = Number(inst.principal_paid ?? 0);
  const iPaid = Number(inst.interest_paid ?? 0);

  const principalDone = pPaid >= pDue - 1;
  const interestDone = iPaid >= iDue - 1;

  if (principalDone && interestDone) return { label: "Lunas", color: "bg-emerald-50 text-emerald-700" };
  if (interestDone && !principalDone) return { label: "Bunga Lunas", color: "bg-amber-50 text-amber-700" };
  if (pPaid > 0 || iPaid > 0) return { label: "Sebagian", color: "bg-blue-50 text-blue-700" };
  return { label: "Belum Bayar", color: "bg-slate-100 text-slate-600" };
}

export function PinjamanDetailClientManager({
  loanDetail,
  installmentRows,
  paymentRows,
  cooperativeProfile,
  error,
  paid,
}: PinjamanDetailClientManagerProps) {
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");
  const [principalInput, setPrincipalInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [penaltyInput, setPenaltyInput] = useState("");

  const memberObj = Array.isArray(loanDetail.members)
    ? loanDetail.members[0]
    : (loanDetail.members as unknown as { full_name: string; member_no: string; phone?: string | null } | null);
  const memberName = memberObj?.full_name ?? "Anggota";
  const memberNo = memberObj?.member_no ?? "-";
  const memberPhone = memberObj?.phone ?? "-";

  const productObj = Array.isArray(loanDetail.loan_products)
    ? loanDetail.loan_products[0]
    : (loanDetail.loan_products as unknown as { name: string } | null);
  const productName = productObj?.name ?? "Produk Pinjaman";

  const isSimulated = installmentRows.length === 0 && (loanDetail.status === "submitted" || loanDetail.status === "approved");
  const displayInstallments = isSimulated
    ? generateInstallmentSimulation(
        Number(loanDetail.principal ?? 0),
        Number(loanDetail.tenor_months ?? 12),
        Number(loanDetail.annual_rate_snapshot ?? 0),
        loanDetail.interest_method
      )
    : installmentRows;

  // Compute totals
  const totalPrincipalDue = displayInstallments.reduce((s, i) => s + Number(i.principal_due ?? 0), 0);
  const totalInterestDue = displayInstallments.reduce((s, i) => s + Number(i.interest_due ?? 0), 0);
  const totalDue = totalPrincipalDue + totalInterestDue;
  const totalPaid = displayInstallments.reduce((s, i) => s + Number(i.paid_amount ?? 0), 0);
  const outstanding = Math.max(totalDue - totalPaid, 0);

  // Unpaid installments for the dropdown
  const unpaidInstallments = displayInstallments.filter((inst) => {
    const due = Number(inst.principal_due ?? 0) + Number(inst.interest_due ?? 0);
    return Number(inst.paid_amount ?? 0) < due;
  });

  // Get the selected installment for auto-fill
  const selectedInstallment = displayInstallments.find((i) => i.id === selectedInstallmentId);

  const remainingPrincipal = selectedInstallment
    ? Math.max(Number(selectedInstallment.principal_due ?? 0) - Number(selectedInstallment.principal_paid ?? 0), 0)
    : 0;
  const remainingInterest = selectedInstallment
    ? Math.max(Number(selectedInstallment.interest_due ?? 0) - Number(selectedInstallment.interest_paid ?? 0), 0)
    : 0;

  // Auto-fill when selecting installment
  useEffect(() => {
    if (selectedInstallment) {
      setPrincipalInput(String(Math.round(remainingPrincipal)));
      setInterestInput(String(Math.round(remainingInterest)));
      setPenaltyInput("0");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstallmentId]);

  const handleInterestOnly = () => {
    setPrincipalInput("0");
    setInterestInput(String(Math.round(remainingInterest)));
    setPenaltyInput("0");
  };

  const handleFullPayment = () => {
    setPrincipalInput(String(Math.round(remainingPrincipal)));
    setInterestInput(String(Math.round(remainingInterest)));
    setPenaltyInput("0");
  };

  const postPayment = postInstallmentPayment.bind(null, loanDetail.id);

  return (
    <section className="min-w-0 pb-20 lg:pb-8 print:p-0 print:bg-white">
      <div className="print:hidden">
      {/* Header */}
      <header className="print:hidden sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white hover:bg-slate-50 transition-all" href="/pinjaman">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Detail Pinjaman</p>
              <h1 className="truncate text-xl font-black md:text-2xl">{memberName}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden md:inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-sm font-bold text-white hover:bg-[#1e293b] active:scale-95 transition-all"
          >
            <Printer className="size-4" />
            Cetak Jadwal
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-7 space-y-5">
        {/* Notifications */}
        {error && <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{error}</div>}
        {paid && <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Pembayaran berhasil diposting.</div>}

        {/* Loan Info Card */}
        <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#bfdbfe]">{productName}</p>
              <h2 className="mt-2 text-3xl font-black">{currency.format(Number(loanDetail.principal ?? 0))}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#cbd5e1]">
                {methodLabels[loanDetail.interest_method]} | {Number(loanDetail.annual_rate_snapshot ?? 0)}%/tahun | {loanDetail.tenor_months} bulan
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#cbd5e1]">
                <span>Anggota: <span className="font-bold text-white">{memberName}</span></span>
                <span>No: <span className="font-bold text-white">{memberNo}</span></span>
                <span>HP: <span className="font-bold text-white">{memberPhone}</span></span>
                <span>Admin Fee: <span className="font-bold text-white">{Number(loanDetail.admin_fee_percent_snapshot ?? 0)}%</span></span>
                <span>No. Kontrak: <span className="font-bold text-white">KP-{loanDetail.id.slice(0, 8).toUpperCase()}</span></span>
              </div>
            </div>
            <div className="rounded-3xl bg-white/10 px-5 py-4 text-center">
              <p className="text-xs font-bold text-[#bfdbfe]">Status</p>
              <p className="mt-1 text-lg font-black">{statusLabels[loanDetail.status]}</p>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <CreditCard className="size-6 text-[#2563eb]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Plafond</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(Number(loanDetail.principal ?? 0))}</p>
          </article>
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <FileText className="size-6 text-[#2563eb]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Total Tagihan</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalDue)}</p>
          </article>
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <CheckCircle2 className="size-6 text-[#16a34a]" />
            <p className="mt-4 text-xs font-bold text-[#64748b]">Terbayar</p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalPaid)}</p>
          </article>
          <article className="rounded-3xl bg-[#07152f] p-5 text-white shadow-sm">
            <Banknote className="size-6 text-[#93c5fd]" />
            <p className="mt-4 text-xs font-bold text-[#bfdbfe]">Sisa Outstanding</p>
            <p className="mt-1 text-xl font-bold text-white">{currency.format(outstanding)}</p>
          </article>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          {/* Installment Table */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Jadwal Angsuran</p>
                <h2 className="text-lg font-bold text-[#0b1220]">
                  {isSimulated ? "Proyeksi Jadwal Angsuran (Simulasi)" : "Rincian Pokok & Jasa per Angsuran"}
                </h2>
              </div>
              {isSimulated && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 animate-pulse">
                  ⚠️ Belum Dicairkan
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] font-bold uppercase tracking-wider">
                    <th className="p-3">No</th>
                    <th className="p-3">Jatuh Tempo</th>
                    <th className="p-3 text-right">Pokok</th>
                    <th className="p-3 text-right">Sisa Pokok</th>
                    <th className="p-3 text-right">Jasa</th>
                    <th className="p-3 text-right">Sisa Jasa</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-semibold">
                  {displayInstallments.length ? (
                    (() => {
                      let cumulativePrincipalDue = 0;
                      let cumulativeInterestDue = 0;
                      let cumulativePrincipalPaid = 0;
                      let cumulativeInterestPaid = 0;

                      return displayInstallments.map((inst) => {
                        const pDue = Number(inst.principal_due ?? 0);
                        const iDue = Number(inst.interest_due ?? 0);
                        const pPaid = Number(inst.principal_paid ?? 0);
                        const iPaid = Number(inst.interest_paid ?? 0);
                        const totalInst = pDue + iDue + Number(inst.penalty_due ?? 0);
                        const status = isSimulated ? { label: "Simulasi", color: "bg-amber-50 text-amber-600 border border-amber-200" } : getInstallmentStatus(inst);

                        cumulativePrincipalDue += pDue;
                        cumulativeInterestDue += iDue;
                        cumulativePrincipalPaid += pPaid;
                        cumulativeInterestPaid += iPaid;

                        const remainingPrincipalBalance = Math.max(totalPrincipalDue - cumulativePrincipalDue, 0);
                        const remainingInterestBalance = Math.max(totalInterestDue - cumulativeInterestDue, 0);

                        return (
                          <tr key={inst.id} className="hover:bg-[#f8fbff] transition-colors">
                            <td className="p-3 text-[#64748b]">#{inst.installment_no}</td>
                            <td className="p-3 text-[#0b1220] whitespace-nowrap">{inst.due_date}</td>
                            <td className="p-3 text-right text-[#0b1220]">{currency.format(pDue)}</td>
                            <td className="p-3 text-right">
                              <span className={remainingPrincipalBalance > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                                {currency.format(remainingPrincipalBalance)}
                              </span>
                            </td>
                            <td className="p-3 text-right text-[#0b1220]">{currency.format(iDue)}</td>
                            <td className="p-3 text-right">
                              <span className={remainingInterestBalance > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                                {currency.format(remainingInterestBalance)}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-[#2563eb]">{currency.format(totalInst)}</td>
                            <td className="p-3 text-center">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <ReceiptText className="mx-auto size-10 text-[#94a3b8]" />
                        <p className="mt-3 font-bold text-[#0b1220]">Jadwal belum dibuat</p>
                        <p className="mt-1 text-xs font-medium text-[#64748b]">Jadwal angsuran dibuat saat pinjaman dicairkan.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                {displayInstallments.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#dbe5f1] bg-[#f8fbff] font-bold">
                      <td className="p-3" colSpan={2}>Total</td>
                      <td className="p-3 text-right text-[#0b1220]">{currency.format(totalPrincipalDue)}</td>
                      <td className="p-3 text-right text-rose-600">{currency.format(Math.max(totalPrincipalDue - displayInstallments.reduce((s, i) => s + Number(i.principal_paid ?? 0), 0), 0))}</td>
                      <td className="p-3 text-right text-[#0b1220]">{currency.format(totalInterestDue)}</td>
                      <td className="p-3 text-right text-rose-600">{currency.format(Math.max(totalInterestDue - displayInstallments.reduce((s, i) => s + Number(i.interest_paid ?? 0), 0), 0))}</td>
                      <td className="p-3 text-right font-bold text-[#2563eb]">{currency.format(totalDue)}</td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* Payment Sidebar */}
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            {/* Payment Form */}
            {loanDetail.status === "disbursed" ? (
              <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                    <ReceiptText className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Pembayaran</p>
                    <h2 className="text-xl font-black">Posting Angsuran</h2>
                  </div>
                </div>

                <form action={postPayment} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Pilih Angsuran</span>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                      name="installment_id"
                      required
                      value={selectedInstallmentId}
                      onChange={(e) => setSelectedInstallmentId(e.target.value)}
                    >
                      <option value="">Pilih angsuran</option>
                      {unpaidInstallments.map((inst) => {
                        const sisaP = Math.max(Number(inst.principal_due ?? 0) - Number(inst.principal_paid ?? 0), 0);
                        const sisaI = Math.max(Number(inst.interest_due ?? 0) - Number(inst.interest_paid ?? 0), 0);
                        return (
                          <option key={inst.id} value={inst.id}>
                            #{inst.installment_no} | {inst.due_date} | Sisa P:{currency.format(sisaP)} J:{currency.format(sisaI)}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {/* Quick action buttons */}
                  {selectedInstallment && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleInterestOnly}
                        className="flex-1 h-10 rounded-xl border-2 border-amber-400 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                      >
                        💰 Bayar Bunga Saja
                      </button>
                      <button
                        type="button"
                        onClick={handleFullPayment}
                        className="flex-1 h-10 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                      >
                        ✅ Bayar Penuh
                      </button>
                    </div>
                  )}

                  {/* Remaining info */}
                  {selectedInstallment && (
                    <div className="rounded-2xl bg-[#f8fbff] p-3 text-xs font-semibold text-[#64748b] space-y-1 border border-[#dbe5f1]">
                      <p>Sisa Pokok: <span className="font-bold text-[#0b1220]">{currency.format(remainingPrincipal)}</span></p>
                      <p>Sisa Jasa: <span className="font-bold text-[#0b1220]">{currency.format(remainingInterest)}</span></p>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Tanggal Bayar</span>
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                      name="payment_date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Metode Bayar</span>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                      name="payment_method"
                    >
                      <option value="kas">Tunai (Kas)</option>
                      <option value="bank">Transfer (Bank)</option>
                    </select>
                  </label>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-bold text-[#0b1220]">Pokok</span>
                      <input
                        className="mt-1 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                        name="principal_paid"
                        placeholder="0"
                        type="number"
                        value={principalInput}
                        onChange={(e) => setPrincipalInput(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-[#0b1220]">Jasa / Bunga</span>
                      <input
                        className="mt-1 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                        name="interest_paid"
                        placeholder="0"
                        type="number"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-[#0b1220]">Denda</span>
                      <input
                        className="mt-1 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
                        name="penalty_paid"
                        placeholder="0"
                        type="number"
                        value={penaltyInput}
                        onChange={(e) => setPenaltyInput(e.target.value)}
                      />
                    </label>
                  </div>

                  <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8]">
                    Posting Pembayaran
                  </SubmitButton>
                </form>
              </section>
            ) : (
              <section className="rounded-[28px] bg-amber-50/50 p-5 shadow-sm ring-1 ring-amber-200/50 md:p-6 text-center">
                <ReceiptText className="size-8 mx-auto text-amber-500 mb-2" />
                <h3 className="font-bold text-amber-900 text-sm">Pencairan Diperlukan</h3>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-[#64748b]">
                  Status pinjaman saat ini adalah <span className="font-bold text-amber-700">{statusLabels[loanDetail.status]}</span>. 
                  Pembayaran angsuran hanya dapat diposting setelah kasir melakukan pencairan dana pinjaman.
                </p>
              </section>
            )}

            {/* Payment History */}
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <h2 className="text-lg font-bold text-[#0b1220]">Riwayat Pembayaran</h2>
              <div className="mt-4 space-y-3">
                {paymentRows.length ? (
                  paymentRows.map((payment) => (
                    <div className="rounded-2xl bg-[#f4f7fb] p-4" key={payment.id}>
                      <p className="font-bold text-[#0b1220]">{currency.format(Number(payment.total_paid ?? 0))}</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748b]">
                        {payment.payment_date} · Pokok {currency.format(Number(payment.principal_paid ?? 0))} · Jasa {currency.format(Number(payment.interest_paid ?? 0))}
                        {Number(payment.penalty_paid ?? 0) > 0 ? ` · Denda ${currency.format(Number(payment.penalty_paid))}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada pembayaran.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
      </div>

      {/* Area Khusus Cetak (Hanya Muncul Saat Print) */}
      <div className="hidden print:block text-black bg-white p-8 w-full font-serif text-sm">
        {/* Kop Surat Koperasi */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wider">
            {cooperativeProfile?.name ?? "KOPERASI PEGAWAI SEJAHTERA"}
          </h1>
          <p className="text-xs font-semibold text-gray-700">
            {cooperativeProfile?.address ?? "Jl. Utama Raya No. 123, Jakarta Selatan"}
            {cooperativeProfile?.phone ? ` | Telp: ${cooperativeProfile.phone}` : ""}
          </p>
          {cooperativeProfile?.email || cooperativeProfile?.legal_number ? (
            <p className="text-xs font-semibold text-gray-700">
              {cooperativeProfile?.email ? `Email: ${cooperativeProfile.email}` : ""}
              {cooperativeProfile?.legal_number ? ` | Badan Hukum No: ${cooperativeProfile.legal_number}` : ""}
            </p>
          ) : null}
        </div>

        {/* Judul Dokumen */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold uppercase underline">JADWAL ANGSURAN PINJAMAN</h2>
        </div>

        {/* Informasi Pinjaman */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs border border-black p-4 rounded-xl">
          <div className="space-y-1.5">
            <p><span className="font-bold">No. Kontrak:</span> KP-{loanDetail.id.slice(0, 8).toUpperCase()}</p>
            <p><span className="font-bold">Nama Anggota:</span> {memberName}</p>
            <p><span className="font-bold">No. Anggota:</span> {memberNo}</p>
            <p><span className="font-bold">No. Telepon:</span> {memberPhone}</p>
          </div>
          <div className="space-y-1.5 text-right font-semibold">
            <p><span className="font-bold">Plafond:</span> {currency.format(Number(loanDetail.principal ?? 0))}</p>
            <p><span className="font-bold">Jasa / Bunga:</span> {Number(loanDetail.annual_rate_snapshot ?? 0)}% / Tahun ({methodLabels[loanDetail.interest_method]})</p>
            <p><span className="font-bold">Tenor:</span> {loanDetail.tenor_months} Bulan</p>
          </div>
        </div>

        {/* Tabel Angsuran */}
        <table className="w-full border-collapse border border-black text-xs text-left">
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="border border-black p-2 text-center font-bold">Angsuran Ke</th>
              <th className="border border-black p-2 font-bold">Tanggal Jatuh Tempo</th>
              <th className="border border-black p-2 text-right font-bold">Pokok</th>
              <th className="border border-black p-2 text-right font-bold">Jasa / Bunga</th>
              <th className="border border-black p-2 text-right font-bold">Total Angsuran</th>
            </tr>
          </thead>
          <tbody>
            {displayInstallments.map((inst) => {
              const pDue = Number(inst.principal_due ?? 0);
              const iDue = Number(inst.interest_due ?? 0);
              const totalInst = pDue + iDue;

              return (
                <tr key={inst.id} className="border-b border-black">
                  <td className="border border-black p-2 text-center">#{inst.installment_no}</td>
                  <td className="border border-black p-2">{inst.due_date}</td>
                  <td className="border border-black p-2 text-right">{currency.format(pDue)}</td>
                  <td className="border border-black p-2 text-right">{currency.format(iDue)}</td>
                  <td className="border border-black p-2 text-right font-bold">{currency.format(totalInst)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-black font-bold">
              <td className="border border-black p-2 text-center" colSpan={2}>TOTAL</td>
              <td className="border border-black p-2 text-right">{currency.format(totalPrincipalDue)}</td>
              <td className="border border-black p-2 text-right">{currency.format(totalInterestDue)}</td>
              <td className="border border-black p-2 text-right">{currency.format(totalDue)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Tanda Tangan */}
        <div className="mt-12 flex justify-between text-xs">
          <div className="text-center w-40">
            <p>Penerima / Anggota</p>
            <div className="h-16"></div>
            <p className="border-b border-black font-bold">{memberName}</p>
          </div>
          <div className="text-center w-40">
            <p>Petugas Koperasi</p>
            <div className="h-16"></div>
            <p className="border-b border-black font-bold">Kasir / Admin</p>
          </div>
        </div>
      </div>
    </section>
  );
}
