"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Landmark,
  Lock,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { postCashTransaction, transferCashBank, postCashClosing, approveManagerStage, reopenCashClosing } from "./actions";
import { disburseLoan } from "@/app/pinjaman/actions";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
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
  journal_status?: string;
};

type ClosingLogRow = {
  id: string;
  created_at: string;
  actor_id: string;
  metadata: {
    closing_date?: string;
    closing_unit_code?: string;
    closing_unit_name?: string;
    system_balance?: number;
    physical_balance?: number;
    variance?: number;
    status?: string;
    notes?: string;
    denominations?: {
      d100k?: number;
      d50k?: number;
      d20k?: number;
      d10k?: number;
      d5k?: number;
      d2k?: number;
      d1k?: number;
      dCoin?: number;
    };
  };
  profiles?: { full_name: string } | { full_name: string }[] | null;
};

type PendingManagerRow = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string;
};

type BusinessUnitOption = {
  id: string;
  code: string;
  name: string;
};

type KasClientManagerProps = {
  accountRows: AccountRow[];
  cashRows: CashTransactionRow[];
  totalIn: number;
  totalOut: number;
  netCash: number;
  approvedLoans: ApprovedLoanRow[];
  closingRows?: ClosingLogRow[];
  pendingManagerRows?: PendingManagerRow[];
  businessUnits?: BusinessUnitOption[];
  userUnit?: { id: string; code: string; name: string } | null;
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
  closingRows = [],
  pendingManagerRows = [],
  businessUnits = [],
  userUnit = null,
}: KasClientManagerProps) {
  const isUnitLocked = !!userUnit;

  const [printTransaction, setPrintTransaction] = useState<CashTransactionRow | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingPrintMode, setClosingPrintMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"kas" | "closing">("kas");
  const [selectedHistoricalClosing, setSelectedHistoricalClosing] = useState<ClosingLogRow | null>(null);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState(userUnit?.name ?? "");
  const [closingUnit, setClosingUnit] = useState(userUnit?.name ?? "");
  const [denominations, setDenominations] = useState({
    d100k: 0,
    d50k: 0,
    d20k: 0,
    d10k: 0,
    d5k: 0,
    d2k: 0,
    d1k: 0,
    dCoin: 0,
  });
  const [closingNotes, setClosingNotes] = useState("");

  const physicalTotal =
    denominations.d100k * 100000 +
    denominations.d50k * 50000 +
    denominations.d20k * 20000 +
    denominations.d10k * 10000 +
    denominations.d5k * 5000 +
    denominations.d2k * 2000 +
    denominations.d1k * 1000 +
    denominations.dCoin;

  const variance = physicalTotal - netCash;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Per-unit closing status
  const unitsList = businessUnits;

  const [formTxUnit, setFormTxUnit] = useState(userUnit?.name ?? unitsList[0]?.name ?? "");
  const [formTxDate, setFormTxDate] = useState(todayStr);

  const isFormTxClosed = closingRows.some((log) => {
    const meta = log.metadata ?? {};
    const logDate = meta.closing_date ?? log.created_at.slice(0, 10);
    if (logDate !== formTxDate) return false;

    const logCode = (meta.closing_unit_code ?? "ALL").toLowerCase();
    const logName = (meta.closing_unit_name ?? "Semua Unit").toLowerCase();
    const target = (formTxUnit ?? "").toLowerCase();

    return (
      logCode === "all" ||
      logName === "semua unit" ||
      target === logCode ||
      target === logName ||
      target.includes(logCode) ||
      logName.includes(target)
    );
  });

  const closedUnitsToday = new Set(
    closingRows
      .filter((log) => (log.metadata?.closing_date ?? log.created_at.slice(0, 10)) === todayStr)
      .map((log) => log.metadata?.closing_unit_code ?? "ALL"),
  );

  const allUnitsClosed = unitsList.every((u) => closedUnitsToday.has(u.code));
  const someUnitsClosed = closedUnitsToday.size > 0;

  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);
  const activeOperationalDate = allUnitsClosed ? tomorrowStr : todayStr;

  const filteredRows = cashRows.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.source_type.toLowerCase().includes(q) ||
      item.transaction_date.includes(q);

    const matchesDirection = !directionFilter || item.direction === directionFilter;
    const matchesUnit = !unitFilter || (item.description && item.description.toLowerCase().includes(unitFilter.toLowerCase()));

    return matchesSearch && matchesDirection && matchesUnit;
  });

  const displayTotalIn = filteredRows
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const displayTotalOut = filteredRows
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const displayNetCash = displayTotalIn - displayTotalOut;

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      <div className="space-y-4 px-3 py-3 md:px-6 md:py-5">
        {/* CrudHeader Standard */}
        <CrudHeader
          title="Keuangan & Operasional Kas"
          subtitle="Kelola kas masuk, kas keluar, mutasi kas/bank, dan closing kas harian."
          countBadge={`${cashRows.length} Transaksi`}
          addButtonLabel="Mutasi Kas ↔ Bank"
          onAddClick={() => setIsTransferModalOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          statusFilterValue={directionFilter}
          onStatusFilterChange={setDirectionFilter}
          statusOptions={[
            { value: "in", label: "Kas Masuk (Penerimaan)" },
            { value: "out", label: "Kas Keluar (Pengeluaran)" },
          ]}
        />

        {/* Toolbar Closing Kas Sore & Date Shift Indicator */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 rounded-xl p-3.5 ring-1 ${
            allUnitsClosed
              ? "bg-emerald-50/90 ring-emerald-200"
              : "bg-amber-50/80 ring-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-8.5 place-items-center rounded-lg shadow-sm text-white ${
                allUnitsClosed ? "bg-emerald-600" : "bg-amber-500"
              }`}
            >
              <Lock className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs font-bold ${allUnitsClosed ? "text-emerald-950" : "text-amber-950"}`}>
                  Closing Kas Harian Per Unit
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    allUnitsClosed
                      ? "bg-emerald-200 text-emerald-900"
                      : someUnitsClosed
                      ? "bg-blue-200 text-blue-900"
                      : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {allUnitsClosed
                    ? "🔒 SEMUA UNIT CLOSED"
                    : someUnitsClosed
                    ? `⏳ ${closedUnitsToday.size}/${unitsList.length} Unit Closed`
                    : "🟢 BELUM ADA CLOSING"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {unitsList.map((u) => {
                  const isClosed = closedUnitsToday.has(u.code);
                  return (
                    <span
                      key={u.code}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isClosed
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-white/80 text-[#64748b] border border-[#dbe5f1]"
                      }`}
                    >
                      {isClosed ? "✓" : "○"} {u.code}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsClosingModalOpen(true)}
            className={`inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer ${
              allUnitsClosed
                ? "bg-emerald-800 hover:bg-emerald-900"
                : "bg-[#07152f] hover:bg-slate-800"
            }`}
          >
            <Lock className="size-3.5 text-amber-400" />
            <span>{allUnitsClosed ? "🔒 Perbarui Closing Kas" : "🔒 Closing Kas Sore"}</span>
          </button>
        </div>

        {/* KPI Cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-[#dcfce7] text-[#15803d]">
                <ArrowDownLeft className="size-4" />
              </div>
              <span className="text-xs font-bold text-[#16a34a]">Penerimaan</span>
            </div>
            <p className="mt-3 text-xs font-bold text-[#64748b]">
              Total Kas Masuk {unitFilter ? `(${unitFilter})` : ""}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(displayTotalIn)}</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-[#fee2e2] text-[#b91c1c]">
                <ArrowUpRight className="size-4" />
              </div>
              <span className="text-xs font-bold text-[#dc2626]">Pengeluaran</span>
            </div>
            <p className="mt-3 text-xs font-bold text-[#64748b]">
              Total Kas Keluar {unitFilter ? `(${unitFilter})` : ""}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(displayTotalOut)}</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
            <div className="flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-lg bg-[#eaf2ff] text-[#2563eb]">
                <Landmark className="size-4" />
              </div>
              <span className="text-xs font-bold text-[#2563eb]">Net Flow</span>
            </div>
            <p className="mt-4 text-xs font-bold text-[#64748b]">
              Kas Bersih Harian {unitFilter ? `(${unitFilter})` : ""}
            </p>
            <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(displayNetCash)}</p>
          </article>
        </section>

        {/* Pending Manager Approval Section (Tahap 1) */}
        {pendingManagerRows.length > 0 && (
          <section className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm ring-1 ring-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Approval Tahap 1: Manager Keuangan</p>
                <h2 className="text-base font-bold text-[#0b1220]">
                  Otorisasi Pengeluaran Kas &gt; Rp 1 Juta ({pendingManagerRows.length})
                </h2>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <ShieldCheck className="size-5" />
              </span>
            </div>

            <div className="space-y-2.5">
              {pendingManagerRows.map((entry) => {
                const approve = approveManagerStage.bind(null, entry.id);

                return (
                  <div key={entry.id} className="rounded-xl bg-white p-3.5 ring-1 ring-blue-100">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#0b1220]">{entry.entry_no}</p>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Menunggu Manager (Tahap 1)
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#64748b] mt-0.5 leading-snug break-words">
                          {entry.entry_date} · {entry.memo}
                        </p>
                      </div>
                      <form action={approve} className="flex items-center gap-2 shrink-0">
                        <button
                          type="submit"
                          className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shadow-sm"
                        >
                          <Check className="size-4" />
                          <span>Setujui Manager (Tahap 1)</span>
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pinjaman Siap Cair — Kasir Section */}
        {approvedLoans.length > 0 && (
          <section className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm ring-1 ring-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Menunggu Pencairan</p>
                <h2 className="text-base font-bold text-[#0b1220]">
                  Pinjaman Siap Cair ({approvedLoans.length})
                </h2>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <ReceiptText className="size-4" />
              </span>
            </div>

            <div className="space-y-2.5">
              {approvedLoans.map((loan) => {
                const memberObj = Array.isArray(loan.members) ? loan.members[0] : (loan.members as unknown as { full_name: string; member_no: string } | null);
                const productName = Array.isArray(loan.loan_products) ? loan.loan_products[0]?.name : (loan.loan_products as unknown as { name: string } | null)?.name;
                const disburse = disburseLoan.bind(null, loan.id);

                return (
                  <div key={loan.id} className="rounded-xl bg-white p-3.5 ring-1 ring-amber-100">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0b1220]">{memberObj?.full_name ?? "Anggota"}</p>
                        <p className="text-xs font-semibold text-[#64748b]">
                          No: {memberObj?.member_no ?? "-"} · {productName ?? "Pinjaman"} · {loan.tenor_months} bln · {Number(loan.annual_rate_snapshot ?? 0)}%/thn
                        </p>
                        <p className="mt-0.5 text-base font-bold text-[#2563eb]">{currency.format(Number(loan.principal ?? 0))}</p>
                      </div>
                      <form action={disburse} className="flex items-center gap-2">
                        <select name="fund_source" className="h-9 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 outline-none">
                          <option value="kas">Via Kas</option>
                          <option value="bank">Via Bank</option>
                        </select>
                        <button type="submit" className="h-9 rounded-lg bg-[#0b1220] px-3.5 text-xs font-bold text-white hover:bg-[#1e293b] active:scale-95 transition-all cursor-pointer">
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

        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          {/* Cash Transactions & Closing History List */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div className="flex flex-col gap-2.5 border-b border-[#f1f5f9] pb-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("kas")}
                    className={`h-8.5 rounded-lg px-3.5 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "kas"
                        ? "bg-[#0b1220] text-white shadow-sm"
                        : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                    }`}
                  >
                    Buku Kas ({filteredRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("closing")}
                    className={`h-8.5 rounded-lg px-3.5 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "closing"
                        ? "bg-[#0b1220] text-white shadow-sm"
                        : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                    }`}
                  >
                    Riwayat Closing ({closingRows.length})
                  </button>
                </div>

                {activeTab === "kas" && (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Cari transaksi..."
                    className="h-8.5 w-full sm:w-52 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                  />
                )}
              </div>

              {/* Segmented Unit Filter Tabs */}
              {activeTab === "kas" && (
                isUnitLocked ? (
                  /* Locked to user's assigned unit */
                  <div className="flex items-center gap-2 rounded-lg bg-[#eff6ff] p-1.5 px-3">
                    <Lock className="size-3.5 text-[#2563eb]" />
                    <span className="text-[11px] font-bold text-[#1d4ed8]">
                      Unit Anda: {userUnit?.code} · {userUnit?.name}
                    </span>
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1.5 py-0.5 text-[10px] font-black text-white">
                      {filteredRows.length}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-lg bg-[#f1f5f9] p-1">
                    <button
                      type="button"
                      onClick={() => setUnitFilter("")}
                      className={`h-7 rounded-md px-3 text-[11px] font-bold transition-all cursor-pointer ${
                        !unitFilter
                          ? "bg-white text-[#0b1220] shadow-sm ring-1 ring-black/5"
                          : "text-[#64748b] hover:text-[#0b1220]"
                      }`}
                    >
                      Semua Unit
                      <span className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        !unitFilter ? "bg-[#0b1220] text-white" : "bg-[#dbe5f1] text-[#475569]"
                      }`}>
                        {cashRows.length}
                      </span>
                    </button>
                    {businessUnits.map((u) => {
                      const isActive = unitFilter.toLowerCase() === u.name.toLowerCase();
                      const unitCount = cashRows.filter(
                        (item) => item.description?.toLowerCase().includes(u.name.toLowerCase())
                      ).length;
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => setUnitFilter(u.name)}
                          className={`h-7 rounded-md px-2.5 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? "bg-white text-[#1d4ed8] shadow-sm ring-1 ring-black/5"
                              : "text-[#64748b] hover:text-[#0b1220]"
                          }`}
                        >
                          {u.code}
                          <span className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                            isActive ? "bg-[#2563eb] text-white" : "bg-[#dbe5f1] text-[#475569]"
                          }`}>
                            {unitCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {activeTab === "closing" ? (
              /* Closing History List */
              <div className="mt-3.5 space-y-3">
                {closingRows.length ? (
                  closingRows.map((log) => {
                    const meta = log.metadata ?? {};
                    const closingDate = meta.closing_date ?? log.created_at.slice(0, 10);
                    const sysBal = Number(meta.system_balance ?? 0);
                    const physBal = Number(meta.physical_balance ?? 0);
                    const vr = Number(meta.variance ?? 0);
                    const st = meta.status ?? (vr === 0 ? "balance" : vr > 0 ? "surplus" : "shortage");
                    const actorObj = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    const actorName = actorObj?.full_name ?? "Kasir Koperasi";

                    return (
                      <div key={log.id} className="rounded-xl border border-[#e2e8f0] bg-[#f8fbff] p-3.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[#0b1220]">Closing Tanggal {closingDate}</span>
                              <span className="rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb] border border-[#bfdbfe]">
                                {meta.closing_unit_code ?? "ALL"} · {meta.closing_unit_name ?? "Semua Unit"}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  st === "balance"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : st === "surplus"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {st === "balance" ? "✓ NIHIL / PAS" : st === "surplus" ? "⚠️ LEBIH" : "🚨 KURANG"}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#64748b] mt-0.5">
                              Petugas Kasir: <span className="font-bold text-[#0b1220]">{actorName}</span> · Waktu: {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHistoricalClosing(log);
                                setClosingNotes(meta.notes ?? "");
                                if (meta.denominations) {
                                  setDenominations({
                                    d100k: meta.denominations.d100k ?? 0,
                                    d50k: meta.denominations.d50k ?? 0,
                                    d20k: meta.denominations.d20k ?? 0,
                                    d10k: meta.denominations.d10k ?? 0,
                                    d5k: meta.denominations.d5k ?? 0,
                                    d2k: meta.denominations.d2k ?? 0,
                                    d1k: meta.denominations.d1k ?? 0,
                                    dCoin: meta.denominations.dCoin ?? 0,
                                  });
                                }
                                setClosingPrintMode(true);
                                setTimeout(() => window.print(), 150);
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] active:scale-95 transition-all cursor-pointer shadow-sm"
                            >
                              <Printer className="size-3.5" />
                              <span>Cetak BA (A4)</span>
                            </button>

                            <form
                              action={reopenCashClosing}
                              onSubmit={(e) => {
                                if (
                                  !confirm(
                                    `Buka kembali sesi closing unit ${meta.closing_unit_name ?? "Semua Unit"} tanggal ${closingDate}? Transaksi pada tanggal ini akan dibuka kembali.`,
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="log_id" value={log.id} />
                              <button
                                type="submit"
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer shadow-sm"
                                title="Buka kembali sesi closing"
                              >
                                <RefreshCw className="size-3.5" />
                                <span>Reopen</span>
                              </button>
                            </form>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-white p-2.5 text-xs ring-1 ring-[#e2e8f0]">
                          <div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase">Saldo Sistem</p>
                            <p className="font-bold text-[#0b1220]">{currency.format(sysBal)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase">Fisik Kasir</p>
                            <p className="font-bold text-[#2563eb]">{currency.format(physBal)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase">Selisih</p>
                            <p className={`font-bold ${vr === 0 ? "text-emerald-600" : vr > 0 ? "text-blue-600" : "text-rose-600"}`}>
                              {vr === 0 ? "0 (Pas)" : currency.format(vr)}
                            </p>
                          </div>
                        </div>

                        {meta.notes && (
                          <p className="text-xs text-[#475569] italic bg-white p-2 rounded-lg border border-[#e2e8f0]">
                            Catatan: "{meta.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                    Belum ada riwayat closing kas sore. Klik tombol "🔒 Closing Kas Sore" di atas untuk melakukan closing kasir hari ini.
                  </div>
                )}
              </div>
            ) : (
              /* Buku Kas Masuk & Keluar List */
              <div className="mt-4 divide-y divide-[#f1f5f9]">
                {filteredRows.length ? (
                  filteredRows.map((item) => {
                    const jStatus = item.journal_status ?? "approved";

                    const isOutflowOver1M = item.direction === "out" && Number(item.amount ?? 0) > 1000000;
                    const isPendingApproval = isOutflowOver1M && jStatus !== "approved";

                    return (
                      <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between" key={item.id}>
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`grid size-9 shrink-0 place-items-center rounded-xl mt-0.5 ${
                              item.direction === "in"
                                ? "bg-[#dcfce7] text-[#16a34a]"
                                : "bg-[#fee2e2] text-[#dc2626]"
                            }`}
                          >
                            {item.direction === "in" ? (
                              <ArrowDownLeft className="size-4" />
                            ) : (
                              <ArrowUpRight className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#0b1220] leading-snug break-words">
                              {item.description ?? "Transaksi kas"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#64748b]">
                              <span>{item.transaction_date} · {item.source_type}</span>
                              {isPendingApproval && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                                  <Lock className="size-3" />
                                  {jStatus === "pending_accountant"
                                    ? "⏳ Menunggu Approval Akuntan (Tahap 2)"
                                    : "⏳ Menunggu Approval Manager (Tahap 1)"}
                                </span>
                              )}
                            </div>
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

                          {isPendingApproval ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 opacity-80 cursor-not-allowed shadow-none"
                              title="Kuitansi belum dapat dicetak sebelum transaksi disetujui Manager & Akuntan"
                            >
                              <Lock className="size-3.5 text-amber-700" />
                              <span>Perlu Approval</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrintTransaction(item)}
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] active:scale-95 transition-all cursor-pointer"
                              title="Cetak Kuitansi Kas"
                            >
                              <Printer className="size-3.5" />
                              <span>Kuitansi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                    Belum ada transaksi kas harian.
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Input Cash Form Sidebar */}
          {/* Form Input Kasir */}
          <aside className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white">
                <Plus className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Kasir</p>
                <h2 className="text-base font-bold text-[#0b1220]">Input Kas Masuk / Keluar</h2>
              </div>
            </div>

            <form action={postCashTransaction} className="mt-4 space-y-3.5">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Unit Usaha Koperasi *</span>
                <CustomSelect
                  name="unit_name"
                  value={formTxUnit}
                  onChange={(e) => setFormTxUnit(e.target.value)}
                  className="mt-1.5 h-10 text-xs font-bold"
                  required
                >
                  {businessUnits.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.code} · {u.name}
                    </option>
                  ))}
                </CustomSelect>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Jenis Transaksi</span>
                <CustomSelect
                  defaultValue="out"
                  name="direction"
                  className="mt-1.5 h-10"
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
                  className="mt-1.5 h-10"
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
                  className="mt-1.5 h-10"
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
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="amount"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                  value={formTxDate}
                  onChange={(e) => setFormTxDate(e.target.value)}
                  name="transaction_date"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Keterangan</span>
                <textarea
                  className="mt-1.5 min-h-16 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#2563eb]"
                  name="description"
                  placeholder="Contoh: Pembayaran rekening listrik & air kantor..."
                />
              </label>

              {isFormTxClosed ? (
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] font-bold text-amber-900 flex items-start gap-2">
                  <Lock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Unit ini ({formTxUnit}) sudah Closing Kas Sore untuk tanggal {formTxDate}. Transaksi baru pada tanggal tersebut ditolak.
                  </span>
                </div>
              ) : null}

              <SubmitButton
                disabled={isFormTxClosed}
                className={`h-10 w-full rounded-xl text-xs font-bold text-white transition-all ${
                  isFormTxClosed
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#2563eb] hover:bg-[#1d4ed8]"
                }`}
              >
                {isFormTxClosed ? "🔒 Operasional Tanggal Terkunci" : "Posting Transaksi Kas"}
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

      {/* Modal Mutasi Kas ↔ Bank */}
      <CrudModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Mutasi / Transfer Kas ↔ Bank"
      >
        <form action={transferCashBank} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Jenis Mutasi / Transfer</span>
            <CustomSelect name="transfer_type" className="mt-2 h-12 text-sm font-bold" required>
              <option value="kas_to_bank">📥 Setor Tunai (Kas Tunai → Bank)</option>
              <option value="bank_to_kas">📤 Tarik Tunai (Bank → Kas Tunai)</option>
            </CustomSelect>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Nominal Transfer (Rp)</span>
            <CurrencyInput name="amount" placeholder="0" required />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Tanggal Transaksi</span>
            <input
              type="date"
              name="transaction_date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Catatan / Keterangan</span>
            <input
              type="text"
              name="note"
              placeholder="Contoh: Setor tunai harian ke Rekening Bank Mandiri Koperasi"
              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb]"
            />
          </label>

          <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Proses Mutasi Kas / Bank
          </SubmitButton>
        </form>
      </CrudModal>

      {/* Modal Closing Kas Sore & Cash Opname */}
      <CrudModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        title="🔒 Closing Kas Sore & Cash Opname"
        subtitle="Perhitungan Uang Fisik Kasir & Berita Acara Closing Kas Harian"
      >
        <form action={postCashClosing} className="space-y-4">
          <input type="hidden" name="closing_date" value={new Date().toISOString().slice(0, 10)} />
          <input type="hidden" name="system_balance" value={netCash} />
          <input type="hidden" name="physical_balance" value={physicalTotal} />
          {(() => {
            const currentSelected = closingUnit || userUnit?.name || unitsList[0]?.name || "Semua Unit";
            const matchedUnit = unitsList.find((u) => u.name === currentSelected || u.code === currentSelected);
            return (
              <>
                <input type="hidden" name="closing_unit_code" value={matchedUnit ? matchedUnit.code : "ALL"} />
                <input type="hidden" name="closing_unit_name" value={matchedUnit ? matchedUnit.name : "Semua Unit"} />
              </>
            );
          })()}

          {/* Unit Usaha Selector */}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Unit Usaha Yang Di-Closing * {isUnitLocked ? "(Terkunci sesuai Akun)" : ""}
            </span>
            <div className="mt-1.5">
              <CustomSelect
                value={closingUnit || (userUnit?.name ?? unitsList[0]?.name ?? "Semua Unit")}
                onChange={(e) => setClosingUnit(e.target.value)}
                disabled={isUnitLocked}
                placeholder="Pilih unit usaha..."
                options={[
                  ...(!isUnitLocked ? [{ value: "Semua Unit", label: "ALL · Semua Unit (Global Closing)" }] : []),
                  ...unitsList.map((u) => {
                    const alreadyClosed = closedUnitsToday.has(u.code);
                    return {
                      value: u.name,
                      label: `${u.code} · ${u.name}${alreadyClosed ? " ✓ (Sudah Closing)" : ""}`,
                    };
                  }),
                ]}
              />
            </div>
          </label>

          {/* Ringkasan Buku Kas Sistem Hari Ini */}
          <div className="rounded-xl bg-[#07152f] p-4 text-white">
            <div className="flex items-center justify-between text-xs font-bold text-[#bfdbfe]">
              <span>RINGKASAN BUKU KAS HARIAN SISTEM</span>
              <span>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/10 p-2">
                <p className="text-[11px] text-[#93c5fd] font-semibold">Kas Masuk</p>
                <p className="mt-0.5 text-xs font-bold text-emerald-300">+{currency.format(totalIn)}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2">
                <p className="text-[11px] text-[#93c5fd] font-semibold">Kas Keluar</p>
                <p className="mt-0.5 text-xs font-bold text-rose-300">-{currency.format(totalOut)}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2">
                <p className="text-[11px] text-[#93c5fd] font-semibold">Saldo Sistem</p>
                <p className="mt-0.5 text-xs font-bold text-white">{currency.format(netCash)}</p>
              </div>
            </div>
          </div>

          {/* Perhitungan Uang Fisik Kasir (Denominasi) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Perhitungan Uang Fisik Kasir (Lembaran)
              </span>
              <span className="text-xs font-black text-[#2563eb]">
                Total: {currency.format(physicalTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 100.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_100k"
                  value={denominations.d100k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d100k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 50.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_50k"
                  value={denominations.d50k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d50k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 20.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_20k"
                  value={denominations.d20k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d20k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 10.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_10k"
                  value={denominations.d10k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d10k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 5.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_5k"
                  value={denominations.d5k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d5k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 2.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_2k"
                  value={denominations.d2k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d2k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Rp 1.000</span>
                <input
                  type="number"
                  min="0"
                  name="d_1k"
                  value={denominations.d1k || ""}
                  onChange={(e) => setDenominations({ ...denominations, d1k: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 lbr"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-[#dbe5f1] bg-[#f8fbff] p-2">
                <span className="w-16 font-bold text-[#0b1220] shrink-0">Koin/Lain</span>
                <input
                  type="number"
                  min="0"
                  name="d_coin"
                  value={denominations.dCoin || ""}
                  onChange={(e) => setDenominations({ ...denominations, dCoin: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="h-8 w-full rounded border border-[#dbe5f1] bg-white px-2 font-bold text-right outline-none focus:border-[#2563eb]"
                  placeholder="0 (Rp)"
                />
              </label>
            </div>
          </div>

          {/* Indicator Status Selisih */}
          <div
            className={`rounded-xl p-3.5 border flex items-center justify-between text-xs font-bold ${
              variance === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : variance > 0
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div>
              <p className="uppercase text-[10px] tracking-wider opacity-75">Hasil Opname & Selisih Kas</p>
              <p className="text-sm font-black mt-0.5">
                {variance === 0
                  ? "✓ NIHIL / BALANCE (Uang Pas)"
                  : variance > 0
                  ? `⚠️ LEBIH (+) ${currency.format(variance)}`
                  : `🚨 KURANG (-) ${currency.format(Math.abs(variance))}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-75">Total Uang Fisik</p>
              <p className="text-sm font-black">{currency.format(physicalTotal)}</p>
            </div>
          </div>

          {/* Notes */}
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Catatan Kasir / Penjelasan Selisih</span>
            <textarea
              name="notes"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="mt-1.5 min-h-16 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-3 text-xs font-semibold outline-none focus:border-[#2563eb]"
              placeholder="Tambahkan catatan closing kasir sore ini jika ada selisih atau penyesuaian..."
            />
          </label>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setClosingPrintMode(true);
                setTimeout(() => window.print(), 150);
              }}
              className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-slate-100 cursor-pointer transition-all shadow-sm"
            >
              <Printer className="size-4 text-[#2563eb]" />
              <span>Cetak Berita Acara (A4)</span>
            </button>

            <SubmitButton className="h-10 w-full rounded-xl bg-[#07152f] text-xs font-bold text-white hover:bg-slate-800">
              Posting & Simpan Closing
            </SubmitButton>
          </div>
        </form>
      </CrudModal>

      {/* Printable Berita Acara Closing Kas Harian (A4) */}
      <div id="ba-closing-print" className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white print:p-8 print:text-black">
        {(() => {
          const activeClosingData = selectedHistoricalClosing
            ? {
                docNo: `BA-KAS-${(selectedHistoricalClosing.metadata?.closing_date ?? selectedHistoricalClosing.created_at.slice(0, 10)).replaceAll("-", "")}`,
                closingDate: selectedHistoricalClosing.metadata?.closing_date ?? selectedHistoricalClosing.created_at.slice(0, 10),
                closingTime: new Date(selectedHistoricalClosing.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                sysBal: Number(selectedHistoricalClosing.metadata?.system_balance ?? 0),
                physBal: Number(selectedHistoricalClosing.metadata?.physical_balance ?? 0),
                vr: Number(selectedHistoricalClosing.metadata?.variance ?? 0),
                st: selectedHistoricalClosing.metadata?.status ?? "balance",
                notes: selectedHistoricalClosing.metadata?.notes ?? "",
                cashier: (Array.isArray(selectedHistoricalClosing.profiles) ? selectedHistoricalClosing.profiles[0]?.full_name : selectedHistoricalClosing.profiles?.full_name) ?? "Kasir Koperasi",
                denoms: selectedHistoricalClosing.metadata?.denominations ?? denominations,
              }
            : {
                docNo: `BA-KAS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
                closingDate: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
                closingTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                sysBal: netCash,
                physBal: physicalTotal,
                vr: variance,
                st: variance === 0 ? "balance" : variance > 0 ? "surplus" : "shortage",
                notes: closingNotes,
                cashier: "Kasir Koperasi",
                denoms: denominations,
              };

          return (
            <div>
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <h1 className="text-xl font-black uppercase tracking-wide">KOPERASI PEGAWAI (KOPERASI REJEKI)</h1>
                <p className="text-xs font-semibold">Berita Acara Closing Kas Harian & Cash Opname Sore Hari</p>
                <p className="text-[11px] text-slate-600">Dokumen Resmi Verifikasi Keuangan Kas Tunai</p>
              </div>

              <div className="mt-4 flex justify-between text-xs font-semibold">
                <div>
                  <p>No. Dokumen: <span className="font-bold">{activeClosingData.docNo}</span></p>
                  <p>Tanggal Closing: <span className="font-bold">{activeClosingData.closingDate}</span></p>
                </div>
                <div className="text-right">
                  <p>Unit Usaha: <span className="font-bold">{selectedHistoricalClosing ? (selectedHistoricalClosing.metadata?.closing_unit_name ?? "Semua Unit") : (closingUnit || "Semua Unit")}</span></p>
                  <p>Waktu Closing: <span className="font-bold">{activeClosingData.closingTime} WIB</span></p>
                </div>
              </div>

              <table className="mt-4 w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th colSpan={2} className="border border-slate-300 p-2 text-left font-bold">1. RINGKASAN BUKU KAS HARIAN SISTEM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">Total Kas Masuk (Penerimaan)</td>
                    <td className="border border-slate-300 p-2 font-bold text-right">{currency.format(totalIn)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">Total Kas Keluar (Pengeluaran)</td>
                    <td className="border border-slate-300 p-2 font-bold text-right">{currency.format(totalOut)}</td>
                  </tr>
                  <tr className="font-bold bg-slate-50">
                    <td className="border border-slate-300 p-2">Saldo Akhir Buku Kas Sistem</td>
                    <td className="border border-slate-300 p-2 text-right">{currency.format(activeClosingData.sysBal)}</td>
                  </tr>
                </tbody>
              </table>

              <table className="mt-4 w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th colSpan={3} className="border border-slate-300 p-2 text-left font-bold">2. PERHITUNGAN UANG FISIK KAS (DENOMINASI)</th>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <th className="border border-slate-300 p-1.5 text-left">Pecahan</th>
                    <th className="border border-slate-300 p-1.5 text-center">Jumlah Lembar/Koin</th>
                    <th className="border border-slate-300 p-1.5 text-right">Subtotal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 100.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d100k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d100k ?? 0) * 100000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 50.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d50k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d50k ?? 0) * 50000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 20.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d20k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d20k ?? 0) * 20000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 10.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d10k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d10k ?? 0) * 10000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 5.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d5k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d5k ?? 0) * 5000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 2.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d2k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d2k ?? 0) * 2000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Rp 1.000</td>
                    <td className="border border-slate-300 p-1.5 text-center">{activeClosingData.denoms.d1k ?? 0} lbr</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format((activeClosingData.denoms.d1k ?? 0) * 1000)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Koin / Lain-lain</td>
                    <td className="border border-slate-300 p-1.5 text-center">-</td>
                    <td className="border border-slate-300 p-1.5 text-right">{currency.format(activeClosingData.denoms.dCoin ?? 0)}</td>
                  </tr>
                  <tr className="font-bold bg-slate-100">
                    <td colSpan={2} className="border border-slate-300 p-2">TOTAL FISIK KASIR</td>
                    <td className="border border-slate-300 p-2 text-right">{currency.format(activeClosingData.physBal)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 rounded border border-slate-300 p-3 text-xs">
                <p className="font-bold uppercase text-slate-700">3. HASIL VERIFIKASI & SELISIH KAS</p>
                <div className="mt-1 flex justify-between font-bold">
                  <span>Status Opname: {activeClosingData.vr === 0 ? "PAS / BALANCE (NIHIL)" : activeClosingData.vr > 0 ? "SELISIH LEBIH" : "SELISIH KURANG"}</span>
                  <span>Nominal Selisih: {currency.format(activeClosingData.vr)}</span>
                </div>
                {activeClosingData.notes && <p className="mt-2 text-slate-600 italic">Catatan Kasir: "{activeClosingData.notes}"</p>}
              </div>

              <div className="mt-8 grid grid-cols-3 text-center text-xs">
                <div>
                  <p className="font-bold">Dibuat oleh (Teller/Kasir),</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">({activeClosingData.cashier})</p>
                </div>
                <div>
                  <p className="font-bold">Diverifikasi oleh (Manager Keuangan),</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">( Manager Keuangan )</p>
                </div>
                <div>
                  <p className="font-bold">Mengetahui (Pengurus Koperasi),</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">( Pengurus Koperasi )</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #ba-closing-print, #ba-closing-print * {
                visibility: visible !important;
              }
              #ba-closing-print {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 30px !important;
                background: white !important;
                color: black !important;
                z-index: 99999 !important;
              }
            }
          `,
        }}
      />
    </section>
  );
}
