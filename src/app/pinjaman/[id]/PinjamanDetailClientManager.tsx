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
  RefreshCcw,
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
  loan_installments?: { installment_no: number } | { installment_no: number }[] | null;
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

  const principalDone = inst.paid_at != null || pPaid >= pDue - 5;
  const interestDone = inst.paid_at != null || iPaid >= iDue - 5;

  if (principalDone && interestDone) {
    return { label: "Lunas", color: "bg-emerald-100 text-emerald-700" };
  }
  if (pPaid > 0 || iPaid > 0) {
    return { label: "Parsial", color: "bg-amber-100 text-amber-700" };
  }
  return { label: "Belum Bayar", color: "bg-slate-100 text-slate-600" };
}

function terbilang(n: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const num = Math.floor(Math.abs(n));
  if (num < 12) return angka[num];
  if (num < 20) return terbilang(num - 10) + " Belas";
  if (num < 100) return terbilang(Math.floor(num / 10)) + " Puluh " + terbilang(num % 10);
  if (num < 200) return "Seratus " + terbilang(num - 100);
  if (num < 1000) return terbilang(Math.floor(num / 100)) + " Ratus " + terbilang(num % 100);
  if (num < 2000) return "Seribu " + terbilang(num - 1000);
  if (num < 1000000) return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
  if (num < 1000000000) return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
  if (num < 1000000000000) return terbilang(Math.floor(num / 1000000000)) + " Miliar " + terbilang(num % 1000000000);
  return String(n);
}

function toTerbilangRupiah(amount: number): string {
  if (amount <= 0) return "Nol Rupiah";
  const result = terbilang(amount).trim().replace(/\s+/g, " ");
  return `${result} Rupiah`;
}

export function PinjamanDetailClientManager({
  loanDetail,
  installmentRows,
  paymentRows,
  cooperativeProfile,
  error,
  paid,
}: PinjamanDetailClientManagerProps) {
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>("");
  const [principalInput, setPrincipalInput] = useState<string>("0");
  const [interestInput, setInterestInput] = useState<string>("0");
  const [penaltyInput, setPenaltyInput] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<"full" | "interest_only" | "custom">("full");

  const [printMode, setPrintMode] = useState<"schedule" | "contract" | "receipt" | "settlement">("schedule");
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRow | null>(null);

  const handlePrintReceipt = (payment: PaymentRow) => {
    setSelectedPaymentForReceipt(payment);
    setPrintMode("receipt");
    setTimeout(() => window.print(), 100);
  };

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

  // Helper functions for remaining due with rounding tolerance (<= 5 rupiah treated as 0)
  const getSisaPrincipal = (inst: InstallmentRow) => {
    if (inst.paid_at) return 0;
    const sisa = Number(inst.principal_due ?? 0) - Number(inst.principal_paid ?? 0);
    return sisa <= 5 ? 0 : Math.max(sisa, 0);
  };

  const getSisaInterest = (inst: InstallmentRow) => {
    if (inst.paid_at) return 0;
    const sisa = Number(inst.interest_due ?? 0) - Number(inst.interest_paid ?? 0);
    return sisa <= 5 ? 0 : Math.max(sisa, 0);
  };

  // Unpaid installments for the dropdown (exclude paid_at or paid_amount >= due - 5)
  const unpaidInstallments = displayInstallments.filter((inst) => {
    if (inst.paid_at) return false;
    const due = Number(inst.principal_due ?? 0) + Number(inst.interest_due ?? 0);
    const paidAmt = Number(inst.paid_amount ?? 0);
    return due - paidAmt > 5;
  });

  // Selected installments (support single ID or comma-separated IDs)
  const selectedIds = selectedInstallmentId ? selectedInstallmentId.split(",") : [];
  const selectedInstallments = displayInstallments.filter((i) => selectedIds.includes(i.id));

  const remainingPrincipal = selectedInstallments.reduce(
    (sum, i) => sum + getSisaPrincipal(i),
    0
  );
  const remainingInterest = selectedInstallments.reduce(
    (sum, i) => sum + getSisaInterest(i),
    0
  );

  // Generate multi-installment options starting from the first unpaid installment
  const multiInstallmentOptions: { value: string; label: string }[] = [];
  if (unpaidInstallments.length > 0) {
    // 1. Single installment options
    unpaidInstallments.forEach((inst) => {
      const sisaP = getSisaPrincipal(inst);
      const sisaI = getSisaInterest(inst);
      multiInstallmentOptions.push({
        value: inst.id,
        label: `Angsuran #${inst.installment_no} (${inst.due_date}) | Sisa Pokok: ${currency.format(sisaP)}, Jasa: ${currency.format(sisaI)}`,
      });
    });

    // 2. Multi-installment combinations starting from first unpaid installment
    for (let count = 2; count <= unpaidInstallments.length; count++) {
      const slice = unpaidInstallments.slice(0, count);
      const ids = slice.map((i) => i.id).join(",");
      const firstNo = slice[0].installment_no;
      const lastNo = slice[slice.length - 1].installment_no;
      const totP = slice.reduce((sum, i) => sum + getSisaPrincipal(i), 0);
      const totI = slice.reduce((sum, i) => sum + getSisaInterest(i), 0);

      multiInstallmentOptions.push({
        value: ids,
        label: `🚀 Bayar ${count} Bulan (#${firstNo} s/d #${lastNo}) | Total: ${currency.format(totP + totI)}`,
      });
    }
  }

  // Auto-fill when selecting installment
  useEffect(() => {
    if (selectedInstallments.length > 0) {
      setPaymentMode("full");
      setPrincipalInput(String(Math.round(remainingPrincipal)));
      setInterestInput(String(Math.round(remainingInterest)));
      setPenaltyInput("0");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstallmentId]);

  const handleInterestOnly = () => {
    setPaymentMode("interest_only");
    setPrincipalInput("0");
    setInterestInput(String(Math.round(remainingInterest)));
    setPenaltyInput("0");
  };

  const handleFullPayment = () => {
    setPaymentMode("full");
    setPrincipalInput(String(Math.round(remainingPrincipal)));
    setInterestInput(String(Math.round(remainingInterest)));
    setPenaltyInput("0");
  };

  const postPayment = postInstallmentPayment.bind(null, loanDetail.id);

  return (
    <section className="min-w-0 pb-20 lg:pb-8 print:p-0 print:bg-white">
      <div className="print:hidden">
      {/* Header */}
      <header className="print:hidden sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur md:px-2">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPrintMode("schedule");
                setTimeout(() => window.print(), 100);
              }}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-[#0b1220] px-2 text-xs font-bold text-white hover:bg-[#1e293b] active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="size-4" />
              <span>Cetak Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPrintMode("contract");
                setTimeout(() => window.print(), 100);
              }}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-2 text-xs font-bold text-white hover:bg-[#1d4ed8] active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="size-4" />
              <span>Cetak Akad Kredit</span>
            </button>

            {loanDetail.status === "closed" && (
              <button
                type="button"
                onClick={() => {
                  setPrintMode("settlement");
                  setTimeout(() => window.print(), 100);
                }}
                className="h-9 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                <span>Cetak Surat Ket. Lunas</span>
              </button>
            )}

            {loanDetail.status === "disbursed" && (
              <Link
                href="/pinjaman"
                className="h-9 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-2.5 text-xs font-bold text-white hover:bg-amber-600 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCcw className="size-4" />
                <span>Ajukan Top-Up</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="px-2 py-2 md:px-2 space-y-4">
        {/* Notifications */}
        {error && <div className="rounded-xl bg-[#fff1f2] p-3.5 text-sm font-bold text-[#be123c]">{error}</div>}
        {paid && (
          <div className="rounded-xl bg-[#eff6ff] p-3.5 text-sm font-bold text-[#1d4ed8] flex items-center justify-between gap-3">
            <span>Pembayaran angsuran berhasil diposting.</span>
            {paymentRows.length > 0 && (
              <button
                type="button"
                onClick={() => handlePrintReceipt(paymentRows[0])}
                className="h-8 px-2 inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8] active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Printer className="size-3.5" />
                <span>Cetak Kuitansi Terbaru</span>
              </button>
            )}
          </div>
        )}

        {/* Loan Info Card */}
        <section className="rounded-xl bg-[#07152f] p-4 text-white shadow-sm md:p-5">
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
          <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <FileText className="size-5 text-[#2563eb]" />
            <p className="mt-3 text-xs font-bold text-[#64748b]">Total Tagihan</p>
            <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(totalDue)}</p>
          </article>
          <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <CheckCircle2 className="size-5 text-[#16a34a]" />
            <p className="mt-3 text-xs font-bold text-[#64748b]">Terbayar</p>
            <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(totalPaid)}</p>
          </article>
          <article className="rounded-xl bg-[#07152f] p-4 text-white shadow-sm">
            <Banknote className="size-5 text-[#93c5fd]" />
            <p className="mt-3 text-xs font-bold text-[#bfdbfe]">Sisa Outstanding</p>
            <p className="mt-0.5 text-lg font-bold text-white">{currency.format(outstanding)}</p>
          </article>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          {/* Installment Table */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Jadwal Angsuran</p>
                <h2 className="text-lg font-bold text-[#0b1220]">
                  {isSimulated ? "Proyeksi Jadwal Angsuran (Simulasi)" : "Rincian Pokok & Jasa per Angsuran"}
                </h2>
              </div>
              {isSimulated && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-bold text-amber-700 animate-pulse">
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
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            {/* Payment Form */}
            {loanDetail.status === "disbursed" ? (
              <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#2563eb] text-white">
                    <ReceiptText className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Pembayaran</p>
                    <h2 className="text-xl font-black">Posting Angsuran</h2>
                  </div>
                </div>

                <form action={postPayment} className="mt-4 space-y-3.5">
                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Pilih Angsuran / Paket Bulan</span>
                    <select
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                      name="installment_id"
                      required
                      value={selectedInstallmentId}
                      onChange={(e) => setSelectedInstallmentId(e.target.value)}
                    >
                      <option value="">Pilih angsuran yang akan dibayar</option>
                      {multiInstallmentOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Quick action buttons & Mode selection */}
                  {selectedInstallments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#64748b]">Mode Pembayaran:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={handleInterestOnly}
                          className={`flex-1 h-9 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            paymentMode === "interest_only"
                              ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                              : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          }`}
                        >
                          💰 Bunga Saja
                        </button>

                        <button
                          type="button"
                          onClick={handleFullPayment}
                          className={`flex-1 h-9 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            paymentMode === "full"
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          ✅ Bayar Penuh
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode("custom")}
                          className={`h-9 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            paymentMode === "custom"
                              ? "border-[#2563eb] bg-[#2563eb] text-white shadow-sm"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          ✏️ Custom
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remaining info */}
                  {selectedInstallments.length > 0 && (
                    <div className="rounded-2xl bg-[#f8fbff] p-3 text-xs font-semibold text-[#64748b] space-y-1 border border-[#dbe5f1]">
                      <div className="flex justify-between">
                        <span>Total Sisa Pokok ({selectedInstallments.length} Bulan):</span>
                        <span className="font-bold text-[#0b1220]">{currency.format(remainingPrincipal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sisa Jasa ({selectedInstallments.length} Bulan):</span>
                        <span className="font-bold text-[#0b1220]">{currency.format(remainingInterest)}</span>
                      </div>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Tanggal Bayar</span>
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none focus:border-[#2563eb]"
                      name="payment_date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-[#0b1220]">Metode Bayar</span>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none focus:border-[#2563eb]"
                      name="payment_method"
                    >
                      <option value="kas">Tunai (Kas)</option>
                      <option value="bank">Transfer (Bank)</option>
                    </select>
                  </label>

                  <div className="space-y-3">
                    <label className="block">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#0b1220]">Pokok (Rp)</span>
                        {selectedInstallments.length > 0 && (
                          <span className="text-[11px] font-semibold text-[#64748b]">
                            Maks: {currency.format(remainingPrincipal)}
                          </span>
                        )}
                      </div>
                      <input
                        className={`mt-1 h-12 w-full rounded-2xl border px-2 text-sm font-bold outline-none ${
                          paymentMode === "interest_only"
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-[#f8fbff] border-[#dbe5f1] focus:border-[#2563eb]"
                        }`}
                        name="principal_paid"
                        placeholder="0"
                        type="number"
                        min={0}
                        max={Math.round(remainingPrincipal)}
                        readOnly={paymentMode === "interest_only"}
                        value={principalInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedInstallments.length > 0 && val > remainingPrincipal) {
                            setPrincipalInput(String(Math.round(remainingPrincipal)));
                          } else {
                            setPrincipalInput(e.target.value);
                          }
                          setPaymentMode("custom");
                        }}
                      />
                    </label>
                    <label className="block">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#0b1220]">Jasa / Bunga (Rp)</span>
                        {selectedInstallments.length > 0 && (
                          <span className="text-[11px] font-semibold text-[#64748b]">
                            Maks: {currency.format(remainingInterest)}
                          </span>
                        )}
                      </div>
                      <input
                        className="mt-1 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none focus:border-[#2563eb]"
                        name="interest_paid"
                        placeholder="0"
                        type="number"
                        min={0}
                        max={Math.round(remainingInterest)}
                        value={interestInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (selectedInstallments.length > 0 && val > remainingInterest) {
                            setInterestInput(String(Math.round(remainingInterest)));
                          } else {
                            setInterestInput(e.target.value);
                          }
                          setPaymentMode("custom");
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold text-[#0b1220]">Denda (Rp)</span>
                      <input
                        className="mt-1 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none focus:border-[#2563eb]"
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
                    <div className="rounded-2xl bg-[#f4f7fb] p-4 flex items-center justify-between gap-3" key={payment.id}>
                      <div>
                        <p className="font-bold text-[#0b1220]">{currency.format(Number(payment.total_paid ?? 0))}</p>
                        <p className="mt-1 text-xs font-semibold text-[#64748b]">
                          {payment.payment_date} · Pokok {currency.format(Number(payment.principal_paid ?? 0))} · Jasa {currency.format(Number(payment.interest_paid ?? 0))}
                          {Number(payment.penalty_paid ?? 0) > 0 ? ` · Denda ${currency.format(Number(payment.penalty_paid))}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(payment)}
                        className="h-8 px-2 inline-flex items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white text-xs font-bold text-[#2563eb] hover:bg-[#eff6ff] active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                      >
                        <Printer className="size-3.5" />
                        <span>Kuitansi</span>
                      </button>
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
      <div className="hidden print:block text-black bg-white p-2 w-full font-serif text-[9pt] leading-snug">
        {printMode === "settlement" ? (
          <div className="border-2 border-black p-8 rounded-xl space-y-4 font-serif text-[10pt] leading-relaxed text-black max-w-[800px] mx-auto my-4">
            {/* Kop Surat Koperasi */}
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <h1 className="text-base font-bold uppercase tracking-wider">
                {cooperativeProfile?.name ?? "KOPERASI PEGAWAI SEJAHTERA"}
              </h1>
              <p className="text-[10px] font-semibold text-gray-700">
                {cooperativeProfile?.address ?? "Jl. Utama Raya No. 123, Jakarta Selatan"}
                {cooperativeProfile?.phone ? ` | Telp: ${cooperativeProfile.phone}` : ""}
              </p>
              {cooperativeProfile?.legal_number ? (
                <p className="text-[9px] font-semibold text-gray-600">Badan Hukum No: {cooperativeProfile.legal_number}</p>
              ) : null}
            </div>

            {/* Judul Dokumen */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider underline">SURAT KETERANGAN PELUNASAN PINJAMAN</h2>
              <p className="text-[9pt] font-semibold text-gray-600">Nomor: SKL/KP-{loanDetail.id.slice(0, 8).toUpperCase()}/{new Date().getFullYear()}</p>
            </div>

            {/* Pembukaan */}
            <p className="text-justify">
              Pengurus <strong>{cooperativeProfile?.name ?? "Koperasi"}</strong> dengan ini menerangkan dan menyatakan secara resmi bahwa:
            </p>

            {/* Identitas Anggota */}
            <div className="border border-black rounded-lg p-3 space-y-1 text-[9.5pt] bg-gray-50">
              <div className="grid grid-cols-[140px_1fr]">
                <span className="font-bold">Nama Anggota</span>
                <span>: <strong>{memberName.toUpperCase()}</strong></span>
              </div>
              <div className="grid grid-cols-[140px_1fr]">
                <span className="font-bold">Nomor Anggota</span>
                <span>: {memberNo}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr]">
                <span className="font-bold">No. Telepon / HP</span>
                <span>: {memberPhone}</span>
              </div>
            </div>

            <p className="text-justify">
              Telah menyelesaikan seluruh kewajiban fasilitas pinjaman uang pada Koperasi dengan rincian sebagai berikut:
            </p>

            {/* Rincian Pinjaman */}
            <div className="border border-black rounded-lg p-3 space-y-1.5 text-[9.5pt]">
              <div className="grid grid-cols-[160px_1fr]">
                <span className="font-bold">No. Kontrak Pinjaman</span>
                <span>: <strong>KP-{loanDetail.id.slice(0, 8).toUpperCase()}</strong></span>
              </div>
              <div className="grid grid-cols-[160px_1fr]">
                <span className="font-bold">Produk Pinjaman</span>
                <span>: {productName}</span>
              </div>
              <div className="grid grid-cols-[160px_1fr]">
                <span className="font-bold">Plafond Pinjaman Awal</span>
                <span>: {currency.format(Number(loanDetail.principal ?? 0))} ({toTerbilangRupiah(Number(loanDetail.principal ?? 0))})</span>
              </div>
              <div className="grid grid-cols-[160px_1fr]">
                <span className="font-bold">Jangka Waktu (Tenor)</span>
                <span>: {loanDetail.tenor_months} Bulan</span>
              </div>
              <div className="grid grid-cols-[160px_1fr]">
                <span className="font-bold">Status Pelunasan</span>
                <span>: <strong className="text-emerald-700 uppercase">LUNAS SEPENUHNYA (100%)</strong></span>
              </div>
            </div>

            {/* Pernyataan Bebas Kewajiban */}
            <p className="text-justify">
              Dengan diterbitkannya Surat Keterangan ini, maka fasilitas pinjaman atas Kontrak No. <strong>KP-{loanDetail.id.slice(0, 8).toUpperCase()}</strong> dinyatakan <strong>DITUTUP & LUNAS</strong>. Anggota dibebaskan dari seluruh kewajiban pembayaran angsuran yang berkaitan dengan kontrak pinjaman tersebut, dan segala jaminan/agunan yang melekat (jika ada) dikembalikan/dialihkan sesuai ketentuan.
            </p>

            <p className="text-justify">
              Demikian Surat Keterangan Pelunasan ini dibuat untuk dipergunakan sebagaimana mestinya.
            </p>

            {/* Tanda Tangan */}
            <div className="mt-8 flex justify-between text-center text-[9.5pt]">
              <div className="w-48">
                <p className="font-bold">Anggota Peminjam</p>
                <div className="h-16"></div>
                <p className="font-bold underline uppercase">({memberName})</p>
              </div>

              <div className="w-48">
                <p className="font-bold">Pengurus / Manager Koperasi</p>
                <div className="h-16"></div>
                <p className="font-bold underline">({cooperativeProfile?.name ?? "Pengurus Koperasi"})</p>
              </div>
            </div>
          </div>
        ) : printMode === "receipt" && selectedPaymentForReceipt ? (
          <div className="border-2 border-black p-6 rounded-xl space-y-4 font-serif text-[10pt] leading-normal text-black max-w-[750px] mx-auto my-4">
            {/* Kop Surat Koperasi */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h1 className="text-base font-bold uppercase tracking-wider">
                {cooperativeProfile?.name ?? "KOPERASI PEGAWAI SEJAHTERA"}
              </h1>
              <p className="text-[10px] font-semibold text-gray-700">
                {cooperativeProfile?.address ?? "Jl. Utama Raya No. 123, Jakarta Selatan"}
                {cooperativeProfile?.phone ? ` | Telp: ${cooperativeProfile.phone}` : ""}
              </p>
            </div>

            {/* Judul & No Kuitansi */}
            <div className="flex justify-between items-center border-b border-black pb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider underline">KUITANSI BUKTI PEMBAYARAN ANGSURAN</h2>
                <p className="text-[9pt] font-semibold text-gray-600">No. Kuitansi: KW-ANGS/{selectedPaymentForReceipt.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9pt] font-bold">Tanggal: {selectedPaymentForReceipt.payment_date}</p>
                <p className="text-[9pt] font-semibold text-gray-600">No. Kontrak: KP-{loanDetail.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Identitas Pembayaran */}
            <div className="space-y-1.5 text-[9.5pt]">
              <div className="grid grid-cols-[150px_1fr]">
                <span className="font-bold">Telah Diterima Dari</span>
                <span>: <strong>{memberName.toUpperCase()}</strong> (No. Anggota: {memberNo})</span>
              </div>
              <div className="grid grid-cols-[150px_1fr]">
                <span className="font-bold">Untuk Pembayaran</span>
                <span>
                  : Angsuran Pinjaman {productName} 
                  {selectedPaymentForReceipt.loan_installments ? (
                    ` (Angsuran #${Array.isArray(selectedPaymentForReceipt.loan_installments) ? selectedPaymentForReceipt.loan_installments[0]?.installment_no : selectedPaymentForReceipt.loan_installments.installment_no})`
                  ) : ""}
                </span>
              </div>
              <div className="grid grid-cols-[150px_1fr]">
                <span className="font-bold">Jumlah Pembayaran</span>
                <span className="font-bold text-sm underline">
                  : {currency.format(Number(selectedPaymentForReceipt.total_paid ?? 0))} ({toTerbilangRupiah(Number(selectedPaymentForReceipt.total_paid ?? 0))})
                </span>
              </div>
            </div>

            {/* Rincian Alokasi */}
            <div className="border border-black rounded-lg p-3 bg-gray-50 text-[9.5pt] space-y-1">
              <p className="font-bold border-b border-gray-300 pb-1 mb-1">Rincian Pembayaran:</p>
              <div className="flex justify-between">
                <span>1. Angsuran Pokok</span>
                <span className="font-semibold">{currency.format(Number(selectedPaymentForReceipt.principal_paid ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Bunga / Jasa Pinjaman</span>
                <span className="font-semibold">{currency.format(Number(selectedPaymentForReceipt.interest_paid ?? 0))}</span>
              </div>
              {Number(selectedPaymentForReceipt.penalty_paid ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>3. Denda Keterlambatan</span>
                  <span className="font-semibold">{currency.format(Number(selectedPaymentForReceipt.penalty_paid ?? 0))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
                <span>TOTAL PEMBAYARAN</span>
                <span>{currency.format(Number(selectedPaymentForReceipt.total_paid ?? 0))}</span>
              </div>
            </div>

            {/* Catatan Sisa */}
            <div className="text-[9pt] text-gray-700 italic border-l-2 border-black pl-3 py-0.5">
              <p>Sisa Plafond Pokok Pinjaman saat ini: {currency.format(outstanding)}</p>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-8 flex justify-between text-center text-[9.5pt]">
              <div className="w-44">
                <p className="font-bold">Penerima / Anggota</p>
                <div className="h-14"></div>
                <p className="font-bold underline uppercase">({memberName})</p>
              </div>

              <div className="w-44">
                <p className="font-bold">Kasir / Petugas Koperasi</p>
                <div className="h-14"></div>
                <p className="font-bold underline">({cooperativeProfile?.name ?? "Admin Kasir"})</p>
              </div>
            </div>
          </div>
        ) : printMode === "contract" ? (
          <div>
            {/* Judul Dokumen & Nomor */}
            <div className="text-center mb-2">
              <h2 className="text-xs font-bold uppercase underline">SURAT PERJANJIAN PINJAMAN UANG KOPERASI</h2>
              <p className="text-[9pt] font-bold mt-0.5">Nomor Kontrak: KP-{loanDetail.id.slice(0, 8).toUpperCase()}/AKAD/{new Date().getFullYear()}</p>
            </div>

            {/* Pembukaan */}
            <p className="mb-1.5 text-justify text-[9pt]">
              Pada hari ini <span className="font-bold">{new Date().toLocaleDateString("id-ID", { weekday: "long" })}</span>, 
              tanggal <span className="font-bold">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>, 
              bertempat di kantor <span className="font-bold">{cooperativeProfile?.name ?? "Koperasi"}</span>, kami yang bertanda tangan di bawah ini:
            </p>

            {/* Identitas Para Pihak (Side by Side Grid) */}
            <div className="grid grid-cols-2 gap-3 mb-2 text-[9pt] border border-gray-300 p-2 rounded">
              <div>
                <p className="font-bold uppercase text-[9pt] border-b border-gray-200 pb-0.5 mb-1">PIHAK PERTAMA (KOPERASI)</p>
                <div className="space-y-0.5">
                  <p><span className="font-bold">Lembaga:</span> {cooperativeProfile?.name ?? "Koperasi"}</p>
                  <p><span className="font-bold">Badan Hukum:</span> {cooperativeProfile?.legal_number ?? "-"}</p>
                  <p><span className="font-bold">Alamat:</span> {cooperativeProfile?.address ?? "-"}</p>
                  <p><span className="font-bold">Telepon:</span> {cooperativeProfile?.phone ?? "-"}</p>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-[9pt] border-b border-gray-200 pb-0.5 mb-1">PIHAK KEDUA (PEMINJAM)</p>
                <div className="space-y-0.5">
                  <p><span className="font-bold">Nama:</span> <strong className="uppercase">{memberName}</strong></p>
                  <p><span className="font-bold">No. Anggota:</span> {memberNo}</p>
                  <p><span className="font-bold">No. Telepon / HP:</span> {memberPhone}</p>
                </div>
              </div>
            </div>

            <p className="mb-1.5 text-justify text-[9pt]">
              Para Pihak dengan ini menyatakan sepakat untuk mengikatkan diri dalam <strong>Surat Perjanjian Pinjaman Uang</strong> dengan ketentuan sebagai berikut:
            </p>

            {/* Pasal-Pasal Perjanjian */}
            <div className="space-y-1.5 mb-2 text-[8.5pt]">
              <div>
                <h3 className="font-bold text-center uppercase text-[9pt]">PASAL 1: JUMLAH PINJAMAN & PRODUK</h3>
                <p className="mt-0.5 text-justify">
                  Pihak Pertama setuju memberikan pinjaman uang kepada Pihak Kedua sebesar <strong>{currency.format(Number(loanDetail.principal ?? 0))} ({toTerbilangRupiah(Number(loanDetail.principal ?? 0))})</strong> dengan produk <strong>{productName}</strong>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-center uppercase text-[9pt]">PASAL 2: JANGKA WAKTU & SUKU BUNGA</h3>
                <p className="mt-0.5 text-justify">
                  1. Jangka waktu pinjaman (tenor) selama <strong>{loanDetail.tenor_months} ({terbilang(loanDetail.tenor_months)}) bulan</strong> terhitung sejak pencairan.<br />
                  2. Bunga / jasa pinjaman sebesar <strong>{Number(loanDetail.annual_rate_snapshot ?? 0)}% per tahun</strong> (metode <strong>{methodLabels[loanDetail.interest_method]}</strong>).<br />
                  3. Estimasi angsuran per bulan sebesar <strong>{currency.format(Math.round(totalDue / (loanDetail.tenor_months || 1)))} ({toTerbilangRupiah(Math.round(totalDue / (loanDetail.tenor_months || 1)))})</strong>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-center uppercase text-[9pt]">PASAL 3: MEKANISME ANGSURAN & PENALTI</h3>
                <p className="mt-0.5 text-justify">
                  1. Pihak Kedua wajib membayarkan angsuran rutin sebelum atau pada tanggal jatuh tempo.<br />
                  2. Keterlambatan pembayaran angsuran dikenakan sanksi/denda sesuai ketentuan Koperasi yang berlaku.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-center uppercase text-[9pt]">PASAL 4: HAK, KEWAJIBAN & JAMINAN</h3>
                <p className="mt-0.5 text-justify">
                  1. Pelunasan dipercepat dapat dilakukan dengan konfirmasi kepada pengurus koperasi.<br />
                  2. Pihak Kedua bertanggung jawab penuh atas pelunasan pinjaman ini dengan jaminan hak keanggotaan & simpanan di koperasi.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-center uppercase text-[9pt]">PASAL 5: PENYELESAIAN PERSELISIHAN</h3>
                <p className="mt-0.5 text-justify">
                  Apabila timbul perselisihan di kemudian hari, Para Pihak sepakat menyelesaikannya secara musyawarah untuk mufakat berdasarkan asas kekeluargaan Koperasi.
                </p>
              </div>
            </div>

            <p className="mb-2 text-justify text-[8.5pt]">
              Demikian Surat Perjanjian ini dibuat dalam rangkap 2 (dua) bermaterai cukup dan mempunyai kekuatan hukum yang sama bagi Para Pihak.
            </p>

            {/* Area Tanda Tangan */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-center text-[9.5pt]">
              <div>
                <p className="font-bold">PIHAK KEDUA (PEMINJAM)</p>
                <div className="h-20 my-1 flex items-center justify-center">
                  <span className="text-[8.5pt] text-gray-400 border border-gray-300 px-2 py-1.5 rounded">Materai Rp 10.000</span>
                </div>
                <p className="font-bold underline uppercase">({memberName})</p>
                <p className="text-[8.5pt] text-gray-600">Anggota Koperasi</p>
              </div>

              <div>
                <p className="font-bold">PIHAK PERTAMA (KOPERASI)</p>
                <div className="h-20 my-1"></div>
                <p className="font-bold underline">({cooperativeProfile?.name ?? "Pengurus Koperasi"})</p>
                <p className="text-[8.5pt] text-gray-600">Ketua / Manager Koperasi</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
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
        )}
      </div>
    </section>
  );
}
