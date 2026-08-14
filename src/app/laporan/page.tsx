import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  Landmark,
  PiggyBank,
  Printer,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createShuSimulation } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { PrintReportButton } from "@/components/PrintReportButton";
import { ToastNotification } from "@/components/ToastNotification";
import { CurrencyInput } from "@/components/CurrencyInput";

type LaporanPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    unit?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

type SavingsAccount = {
  id: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
};

type LoanRow = {
  id: string;
  principal: number;
  status: string;
};

type CashTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  source_type: string;
  description: string | null;
  transaction_date: string;
  unit_id: string | null;
};

type JournalLine = {
  debit: number;
  credit: number;
  accounts: {
    code: string;
    name: string;
    category: string;
  } | {
    code: string;
    name: string;
    category: string;
  }[] | null;
};

type JournalEntry = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string | null;
  source_type: string | null;
  status: string | null;
  journal_lines: JournalLine[];
};

type ShuAllocationRule = {
  id: string;
  component: string;
  percent: number;
  basis: string;
};

type ShuPeriod = {
  id: string;
  year: number;
  net_surplus: number;
  status: string;
  shu_allocations: {
    component: string;
    percent: number;
    amount: number;
  }[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const basisLabels: Record<string, string> = {
  manual: "Proses pengurus/manual",
  savings: "Proporsional simpanan",
  loan_interest: "Jasa pinjaman",
};

export default async function LaporanPage({ searchParams }: LaporanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const selectedUnit = params.unit ?? "";
  const period = params.period ?? "this_month";

  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  let startDate = params.startDate ?? "";
  let endDate = params.endDate ?? "";

  if (period === "this_month" && !startDate && !endDate) {
    startDate = currentMonthStart;
    endDate = currentMonthEnd;
  } else if (period === "today" && !startDate && !endDate) {
    const todayStr = now.toISOString().slice(0, 10);
    startDate = todayStr;
    endDate = todayStr;
  } else if (period === "last_month" && !startDate && !endDate) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
    endDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-${String(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  } else if (period === "this_year" && !startDate && !endDate) {
    startDate = `${now.getFullYear()}-01-01`;
    endDate = `${now.getFullYear()}-12-31`;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ======================================================================
  // REAL DATABASE QUERIES (Linked to live tables)
  // ======================================================================
  const [
    { data: profile },
    { data: savingsAccounts },
    { data: loans },
    { data: cashTransactions },
    { data: journalEntries },
    { data: shuRules },
    { data: shuPeriods },
    { count: memberCount },
    { data: businessUnits },
  ] = await Promise.all([
    supabase.from("profiles").select("id, branch_id").eq("id", user.id).single(),

    // Live savings balance
    supabase.from("savings_accounts").select("id, type, balance"),

    // Live loan balance
    supabase.from("loans").select("id, principal, status"),

    // Live cash transactions
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date, unit_id")
      .order("transaction_date", { ascending: false })
      .limit(500),

    // Live Journal entries with full lines & account categories
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, status, journal_lines(debit, credit, accounts(code, name, category))")
      .order("entry_date", { ascending: false })
      .limit(1000),

    // SHU Rules & Simulations
    supabase.from("shu_allocation_rules").select("id, component, percent, basis").eq("is_active", true).order("component"),
    supabase
      .from("shu_periods")
      .select("id, year, net_surplus, status, shu_allocations(component, percent, amount)")
      .order("year", { ascending: false })
      .limit(5),

    // Active members
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),

    // Business units
    supabase.from("business_units").select("id, code, name").eq("is_active", true).order("code"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  // ======================================================================
  // 1. COMPUTE SAVINGS TOTALS (Live from savings_accounts)
  // ======================================================================
  const savingsRows = (savingsAccounts ?? []) as SavingsAccount[];
  const totalSimpananPokok = savingsRows
    .filter((a) => a.type === "pokok")
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const totalSimpananWajib = savingsRows
    .filter((a) => a.type === "wajib")
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const totalSimpananSukarela = savingsRows
    .filter((a) => a.type === "sukarela")
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const totalSavings = totalSimpananPokok + totalSimpananWajib + totalSimpananSukarela;

  // ======================================================================
  // 2. COMPUTE LOAN TOTALS (Live from loans)
  // ======================================================================
  const loanRows = (loans ?? []) as LoanRow[];
  const totalOutstanding = loanRows
    .filter((l) => l.status === "disbursed")
    .reduce((s, l) => s + Number(l.principal ?? 0), 0);
  const activeLoansCount = loanRows.filter((l) => l.status === "disbursed").length;

  // ======================================================================
  // 3. COMPUTE CASH & JOURNAL TOTALS (Filtered by Period & Unit)
  // ======================================================================
  const rawCashRows = (cashTransactions ?? []) as CashTransaction[];
  const rawJournals = (journalEntries ?? []) as unknown as JournalEntry[];
  const unitList = (businessUnits ?? []) as { id: string; code: string; name: string }[];

  const cashRows = rawCashRows.filter((c) => {
    if (selectedUnit && !c.description?.toLowerCase().includes(selectedUnit.toLowerCase())) return false;
    if (startDate && c.transaction_date < startDate) return false;
    if (endDate && c.transaction_date > endDate) return false;
    return true;
  });

  const totalCashIn = cashRows
    .filter((c) => c.direction === "in")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalCashOut = cashRows
    .filter((c) => c.direction === "out")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const netCash = totalCashIn - totalCashOut;

  // ======================================================================
  // 4. COMPUTE INCOME / EXPENSE FROM DOUBLE-ENTRY JOURNAL LINES
  // ======================================================================
  const filteredJournals = rawJournals.filter((j) => {
    if (selectedUnit && !j.memo?.toLowerCase().includes(selectedUnit.toLowerCase())) return false;
    if (startDate && j.entry_date < startDate) return false;
    if (endDate && j.entry_date > endDate) return false;
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;

  // Detailed account breakdowns for Income Statement
  const incomeAccountMap: Record<string, { code: string; name: string; total: number }> = {};
  const expenseAccountMap: Record<string, { code: string; name: string; total: number }> = {};

  for (const journal of filteredJournals) {
    for (const line of journal.journal_lines ?? []) {
      const act = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts;
      if (!act) continue;

      const cat = act.category;
      if (cat === "income") {
        const netLineIncome = Number(line.credit ?? 0) - Number(line.debit ?? 0);
        totalIncome += netLineIncome;
        if (!incomeAccountMap[act.code]) {
          incomeAccountMap[act.code] = { code: act.code, name: act.name, total: 0 };
        }
        incomeAccountMap[act.code].total += netLineIncome;
      } else if (cat === "expense") {
        const netLineExpense = Number(line.debit ?? 0) - Number(line.credit ?? 0);
        totalExpense += netLineExpense;
        if (!expenseAccountMap[act.code]) {
          expenseAccountMap[act.code] = { code: act.code, name: act.name, total: 0 };
        }
        expenseAccountMap[act.code].total += netLineExpense;
      }
    }
  }

  const netSurplus = totalIncome - totalExpense;

  // ======================================================================
  // 5. COMPUTE BALANCE SHEET (NERACA AKTIVA VS PASIVA)
  // ======================================================================
  const totalAset = Math.max(netCash, 0) + totalOutstanding;
  const totalPasiva = totalSavings + netSurplus;
  const isNeracaBalanced = Math.abs(totalAset - totalPasiva) < 1000;

  // ======================================================================
  // 6. SHU DATA
  // ======================================================================
  const ruleRows = (shuRules ?? []) as ShuAllocationRule[];
  const shuRows = (shuPeriods ?? []) as unknown as ShuPeriod[];
  const latestShu = shuRows[0];

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (selectedUnit && newParams.unit === undefined) p.set("unit", selectedUnit);
    else if (newParams.unit) p.set("unit", newParams.unit);

    if (period && newParams.period === undefined && !newParams.startDate) p.set("period", period);
    else if (newParams.period) p.set("period", newParams.period);

    if (newParams.startDate) p.set("startDate", newParams.startDate);
    if (newParams.endDate) p.set("endDate", newParams.endDate);

    const qs = p.toString();
    return qs ? `/laporan?${qs}` : "/laporan";
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />

        <section className="min-w-0 pb-24 lg:pb-8">
          {/* Header Bar */}
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-3 py-2.5 backdrop-blur md:px-4">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  className="grid size-9 place-items-center rounded-xl border border-[#dbe5f1] bg-white text-[#64748b] hover:bg-slate-50 transition-all shadow-sm"
                  href="/home"
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Laporan Keuangan & SHU</p>
                  <h1 className="text-lg font-bold text-[#0b1220] md:text-xl">Laba Rugi, Neraca, & Portofolio</h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] shadow-sm hover:bg-slate-50 transition-all"
                  href="/laporan/simpanan"
                >
                  <PiggyBank className="size-3.5 text-[#2563eb]" />
                  <span>Lap. Simpanan</span>
                </Link>
                <Link
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] shadow-sm hover:bg-slate-50 transition-all"
                  href="/laporan/pinjaman"
                >
                  <CreditCard className="size-3.5 text-[#2563eb]" />
                  <span>Lap. Pinjaman</span>
                </Link>
                <PrintReportButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-4 px-2 py-3 md:px-4">
            {/* ============================================================ */}
            {/* FILTER TOOLBAR: PERIODE & UNIT USAHA                          */}
            {/* ============================================================ */}
            <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1] space-y-2.5 print:hidden">
              {/* Periode Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#f1f5f9]">
                <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
                  <Calendar className="size-3.5 text-[#2563eb]" /> Periode:
                </span>
                {[
                  { id: "this_month", label: "Bulan Ini" },
                  { id: "today", label: "Hari Ini" },
                  { id: "last_month", label: "Bulan Lalu" },
                  { id: "this_year", label: "Tahun Ini" },
                  { id: "all", label: "Semua Periode" },
                ].map((p) => {
                  const isActive = period === p.id && !params.startDate;
                  return (
                    <Link
                      key={p.id}
                      href={buildUrl({ period: p.id, startDate: undefined, endDate: undefined })}
                      className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all inline-flex items-center ${
                        isActive
                          ? "bg-[#2563eb] text-white shadow-sm"
                          : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </Link>
                  );
                })}
                {startDate && endDate && (
                  <span className="ml-auto text-[11px] font-semibold text-[#64748b] bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    📅 {startDate} s/d {endDate}
                  </span>
                )}
              </div>

              {/* Unit Usaha Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
                  <Building2 className="size-3.5 text-[#2563eb]" /> Unit:
                </span>
                <Link
                  href={buildUrl({ unit: "" })}
                  className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all inline-flex items-center ${
                    !selectedUnit
                      ? "bg-[#0b1220] text-white shadow-sm"
                      : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                  }`}
                >
                  Semua Unit (Konsolidasi)
                </Link>
                {unitList.map((u) => {
                  const isActive =
                    selectedUnit.toLowerCase() === u.name.toLowerCase() ||
                    selectedUnit.toLowerCase() === u.code.toLowerCase();
                  return (
                    <Link
                      key={u.id}
                      href={buildUrl({ unit: u.name })}
                      className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all inline-flex items-center ${
                        isActive
                          ? "bg-[#2563eb] text-white shadow-sm"
                          : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                      }`}
                    >
                      {u.code} · {u.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ============================================================ */}
            {/* EXECUTIVE KPI SUMMARY CARDS                                   */}
            {/* ============================================================ */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-[#2563eb]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Total Simpanan</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#2563eb]">
                    <PiggyBank className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{currency.format(totalSavings)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">Dari {memberCount ?? 0} anggota aktif</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Outstanding Pinjaman</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Landmark className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{currency.format(totalOutstanding)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">{activeLoansCount} berkas pinjaman aktif</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Pendapatan Periode</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-emerald-600">{currency.format(totalIncome)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">Beban: {currency.format(totalExpense)}</p>
              </div>

              <div
                className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 ${
                  netSurplus >= 0 ? "border-l-emerald-600" : "border-l-rose-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">SHU / Surplus Berjalan</span>
                  <span
                    className={`grid size-8 place-items-center rounded-xl ${
                      netSurplus >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    <Scale className="size-4" />
                  </span>
                </div>
                <p
                  className={`mt-2 text-lg font-black ${
                    netSurplus >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {currency.format(netSurplus)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
                  {totalIncome > 0
                    ? `Margin: ${((netSurplus / totalIncome) * 100).toFixed(1)}%`
                    : "Laba bersih operasional"}
                </p>
              </div>
            </div>

            {/* ============================================================ */}
            {/* MAIN 2-COLUMN: LABA RUGI, NERACA, & SHU SIMULATION            */}
            {/* ============================================================ */}
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                {/* 1. LAPORAN LABA RUGI (INCOME STATEMENT) */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Laporan Keuangan</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Laporan Laba Rugi (Income Statement)</h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-[#64748b]">
                      Unit: {selectedUnit || "Konsolidasi (Semua Unit)"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Bagian Pendapatan */}
                    <div>
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50/80 px-3 py-2 font-bold text-xs text-emerald-900 border border-emerald-200">
                        <span>1. PENDAPATAN OPERASIONAL</span>
                        <span className="font-mono">{currency.format(totalIncome)}</span>
                      </div>
                      <div className="divide-y divide-[#f1f5f9] px-2">
                        {Object.values(incomeAccountMap).length ? (
                          Object.values(incomeAccountMap).map((acc) => (
                            <div className="flex items-center justify-between py-2 text-xs" key={acc.code}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#2563eb] font-bold">{acc.code}</span>
                                <span className="text-[#0b1220] font-semibold">{acc.name}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-600">{currency.format(acc.total)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-2.5 text-xs text-[#94a3b8] italic">Belum ada pendapatan jurnal pada periode ini.</div>
                        )}
                      </div>
                    </div>

                    {/* Bagian Beban */}
                    <div>
                      <div className="flex items-center justify-between rounded-xl bg-rose-50/80 px-3 py-2 font-bold text-xs text-rose-900 border border-rose-200">
                        <span>2. BEBAN & BIAYA OPERASIONAL</span>
                        <span className="font-mono">{currency.format(totalExpense)}</span>
                      </div>
                      <div className="divide-y divide-[#f1f5f9] px-2">
                        {Object.values(expenseAccountMap).length ? (
                          Object.values(expenseAccountMap).map((acc) => (
                            <div className="flex items-center justify-between py-2 text-xs" key={acc.code}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#2563eb] font-bold">{acc.code}</span>
                                <span className="text-[#0b1220] font-semibold">{acc.name}</span>
                              </div>
                              <span className="font-mono font-bold text-rose-600">{currency.format(acc.total)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-2.5 text-xs text-[#94a3b8] italic">Belum ada beban jurnal pada periode ini.</div>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Laba Bersih */}
                    <div
                      className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold border ${
                        netSurplus >= 0
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                          : "bg-rose-50 text-rose-900 border-rose-300"
                      }`}
                    >
                      <span className="text-sm">SISA HASIL USAHA (SHU) / LABA BERSIH:</span>
                      <span className="text-sm font-mono font-black">{currency.format(netSurplus)}</span>
                    </div>
                  </div>
                </section>

                {/* 2. LAPORAN NERACA (BALANCE SHEET) */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5" id="neraca">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Posisi Keuangan</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Neraca Keuangan Standar (Aktiva vs Pasiva)</h2>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        isNeracaBalanced
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      {isNeracaBalanced ? "✅ Neraca Seimbang (Balanced)" : "⚠️ Tinjau Saldo"}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* AKTIVA / ASET */}
                    <div className="rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-3.5">
                      <div className="flex items-center justify-between border-b border-[#dbe5f1] pb-2 mb-3">
                        <h3 className="text-xs font-bold text-[#0b1220] uppercase">ASET (AKTIVA)</h3>
                        <span className="font-mono text-xs font-bold text-[#2563eb]">{currency.format(totalAset)}</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Kas Tunai & Bank (Buku Kas)</span>
                          <span className="font-mono font-bold text-[#0b1220]">{currency.format(Math.max(netCash, 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Piutang Pinjaman Anggota</span>
                          <span className="font-mono font-bold text-[#0b1220]">{currency.format(totalOutstanding)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-2.5 border-t border-[#dbe5f1] flex justify-between font-bold text-xs text-[#2563eb]">
                        <span>TOTAL ASET</span>
                        <span className="font-mono">{currency.format(totalAset)}</span>
                      </div>
                    </div>

                    {/* PASIVA / KEWAJIBAN & EKUITAS */}
                    <div className="rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-3.5">
                      <div className="flex items-center justify-between border-b border-[#dbe5f1] pb-2 mb-3">
                        <h3 className="text-xs font-bold text-[#0b1220] uppercase">KEWAJIBAN & EKUITAS (PASIVA)</h3>
                        <span className="font-mono text-xs font-bold text-[#2563eb]">{currency.format(totalPasiva)}</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Simpanan Pokok & Wajib</span>
                          <span className="font-mono font-bold text-[#0b1220]">
                            {currency.format(totalSimpananPokok + totalSimpananWajib)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Simpanan Sukarela</span>
                          <span className="font-mono font-bold text-[#0b1220]">{currency.format(totalSimpananSukarela)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">SHU / Surplus Berjalan</span>
                          <span className="font-mono font-bold text-emerald-600">{currency.format(netSurplus)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-2.5 border-t border-[#dbe5f1] flex justify-between font-bold text-xs text-[#2563eb]">
                        <span>TOTAL PASIVA</span>
                        <span className="font-mono">{currency.format(totalPasiva)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* SIDEBAR: SIMULASI SHU & RULE DISTRIBUSI */}
              <aside className="space-y-4">
                {/* Form Simulasi SHU */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Perencanaan</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Simulasi Pembagian SHU</h2>
                    </div>
                    <Banknote className="size-5 text-[#2563eb]" />
                  </div>

                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Hitung alokasi SHU per pos (Jasa Modal, Jasa Anggota, Cadangan, Pengurus) otomatis sesuai persentase rule.
                  </p>

                  <form action={createShuSimulation} className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Tahun Buku</span>
                      <input
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        name="year"
                        defaultValue={new Date().getFullYear()}
                        type="number"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">SHU Bersih Yang Dibagikan (Rp)</span>
                      <CurrencyInput
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        name="net_surplus"
                        defaultValue={Math.max(netSurplus, 0)}
                        placeholder="0"
                      />
                    </label>

                    <button
                      className="h-10 w-full rounded-xl bg-[#2563eb] text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition-all cursor-pointer"
                      type="submit"
                    >
                      Kalkulasi Simulasi SHU
                    </button>
                  </form>
                </section>

                {/* Rule SHU Aktif */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Konfigurasi</p>
                      <h2 className="text-sm font-bold text-[#0b1220]">Rule Alokasi SHU Aktif</h2>
                    </div>
                    <CircleDollarSign className="size-4 text-[#2563eb]" />
                  </div>

                  <div className="space-y-2">
                    {ruleRows.length ? (
                      ruleRows.map((rule) => (
                        <div
                          className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-2.5 border border-[#e2e8f0]"
                          key={rule.id}
                        >
                          <div>
                            <p className="text-xs font-bold text-[#0b1220]">{rule.component}</p>
                            <p className="text-[10px] font-semibold text-[#64748b]">
                              {basisLabels[rule.basis] ?? rule.basis}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-[#2563eb]">
                            {Number(rule.percent ?? 0)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#64748b] italic">Rule alokasi SHU belum dikonfigurasi.</p>
                    )}
                  </div>
                </section>

                {/* Riwayat Hasil Simulasi SHU Terakhir */}
                {latestShu && (
                  <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5" id="shu">
                    <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2 mb-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Riwayat Simulasi</p>
                        <h2 className="text-sm font-bold text-[#0b1220]">Tahun Buku {latestShu.year}</h2>
                      </div>
                      <span className="font-mono text-xs font-black text-[#2563eb]">
                        {currency.format(Number(latestShu.net_surplus ?? 0))}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(latestShu.shu_allocations ?? []).map((alloc) => (
                        <div className="flex items-center justify-between text-xs py-1" key={alloc.component}>
                          <span className="text-[#475569] font-medium">
                            {alloc.component} ({Number(alloc.percent ?? 0)}%)
                          </span>
                          <span className="font-mono font-bold text-[#0b1220]">
                            {currency.format(Number(alloc.amount ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
