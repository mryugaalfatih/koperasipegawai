import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Building2,
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { postCashTransaction, postManualJournal } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { ToastNotification } from "@/components/ToastNotification";

type KasJurnalPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    unit?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

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

type JournalLineRow = {
  debit: number;
  credit: number;
  accounts: {
    code: string;
    name: string;
    category?: string;
  } | {
    code: string;
    name: string;
    category?: string;
  }[] | null;
};

type JournalRow = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string | null;
  source_type: string | null;
  status: string | null;
  journal_lines: JournalLineRow[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function KasJurnalPage({ searchParams }: KasJurnalPageProps) {
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

  const [{ data: profile }, { data: accounts }, { data: cashTransactions }, { data: journalEntries }, { data: businessUnits }] = await Promise.all([
    supabase.from("profiles").select("id, branch_id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, status, journal_lines(debit, credit, accounts(code, name, category))")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("business_units").select("id, code, name").eq("is_active", true).order("code"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const rawCashRows = (cashTransactions ?? []) as CashTransactionRow[];
  const rawJournalRows = (journalEntries ?? []) as unknown as JournalRow[];
  const unitList = (businessUnits ?? []) as { id: string; code: string; name: string }[];

  const cashRows = rawCashRows.filter((item) => {
    if (selectedUnit && !item.description?.toLowerCase().includes(selectedUnit.toLowerCase())) return false;
    if (startDate && item.transaction_date < startDate) return false;
    if (endDate && item.transaction_date > endDate) return false;
    return true;
  });

  const journalRows = rawJournalRows.filter((item) => {
    if (selectedUnit && !item.memo?.toLowerCase().includes(selectedUnit.toLowerCase())) return false;
    if (startDate && item.entry_date < startDate) return false;
    if (endDate && item.entry_date > endDate) return false;
    return true;
  });

  const cashIn = cashRows.filter((row) => row.direction === "in").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const cashOut = cashRows.filter((row) => row.direction === "out").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const cashBalance = cashIn - cashOut;

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (selectedUnit && newParams.unit === undefined) p.set("unit", selectedUnit);
    else if (newParams.unit) p.set("unit", newParams.unit);

    if (period && newParams.period === undefined && !newParams.startDate) p.set("period", period);
    else if (newParams.period) p.set("period", newParams.period);

    if (newParams.startDate) p.set("startDate", newParams.startDate);
    if (newParams.endDate) p.set("endDate", newParams.endDate);

    const qs = p.toString();
    return qs ? `/kas-jurnal?${qs}` : "/kas-jurnal";
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />

        <section className="min-w-0 pb-24 lg:pb-8">
          {/* Header */}
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
                  <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Pembukuan Operasional</p>
                  <h1 className="text-lg font-bold text-[#0b1220] md:text-xl">Buku Kas & Jurnal Umum</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-2.5 text-xs font-bold text-[#0b1220] shadow-sm hover:bg-slate-50 transition-all"
                  href="/akuntansi"
                >
                  <BookOpenCheck className="size-3.5 text-[#2563eb]" />
                  <span>Modul Akuntansi</span>
                </Link>
                <Link
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0b1220] px-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1e293b] transition-all"
                  href="/konfigurasi"
                >
                  <Calculator className="size-3.5 text-blue-400" />
                  <span>Master COA</span>
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-4 px-2 py-3 md:px-4">
            {/* ============================================================ */}
            {/* FILTER TOOLBAR: PERIODE & UNIT USAHA                          */}
            {/* ============================================================ */}
            <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1] space-y-2.5">
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
                  Semua Unit ({rawJournalRows.length})
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
            {/* KPI STAT CARDS                                                */}
            {/* ============================================================ */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-[#2563eb]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Saldo Kas Periode</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#2563eb]">
                    <Landmark className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{currency.format(cashBalance)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">Kas masuk dikurangi kas keluar</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Total Kas Masuk</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ArrowDownLeft className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-emerald-600">+{currency.format(cashIn)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
                  {cashRows.filter((r) => r.direction === "in").length} transaksi penerimaan
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-rose-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Total Kas Keluar</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-rose-600">-{currency.format(cashOut)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
                  {cashRows.filter((r) => r.direction === "out").length} transaksi pengeluaran
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b]">Jurnal Terposting</span>
                  <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ReceiptText className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{journalRows.length} Jurnal</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">Double-entry berimbang</p>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 2-COLUMN MAIN CONTENT: LISTS & SIDEBAR FORMS                 */}
            {/* ============================================================ */}
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                {/* 1. JURNAL UMUM POSTING TERBARU */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Buku Jurnal</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Entri Jurnal Umum Terposting ({journalRows.length})</h2>
                    </div>
                    <ReceiptText className="size-5 text-[#2563eb]" />
                  </div>

                  <div className="space-y-3">
                    {journalRows.length ? (
                      journalRows.map((journal) => {
                        const debit = (journal.journal_lines ?? []).reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
                        const credit = (journal.journal_lines ?? []).reduce((sum, line) => sum + Number(line.credit ?? 0), 0);

                        return (
                          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-3.5 hover:shadow-sm transition-all" key={journal.id}>
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1f5f9] pb-2">
                              <div>
                                <p className="font-bold text-sm text-[#0b1220]">{journal.entry_no}</p>
                                <p className="text-xs font-semibold text-[#64748b]">
                                  {journal.entry_date} · {journal.memo ?? journal.source_type ?? "Jurnal Umum"}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#2563eb] border border-blue-200">
                                  {currency.format(debit)}
                                </span>
                              </div>
                            </div>

                            {/* Lines */}
                            <div className="mt-2.5 divide-y divide-[#f1f5f9] rounded-xl bg-[#f8fbff] p-2.5 border border-[#e2e8f0]">
                              {(journal.journal_lines ?? []).map((line, index) => {
                                const act = Array.isArray(line.accounts)
                                  ? line.accounts[0]
                                  : (line.accounts as unknown as { code: string; name: string } | null);
                                const isDebit = Number(line.debit ?? 0) > 0;

                                return (
                                  <div
                                    className={`flex items-center justify-between py-1 text-xs ${
                                      index === 0 ? "pt-0" : ""
                                    } ${index === (journal.journal_lines ?? []).length - 1 ? "pb-0" : ""}`}
                                    key={`${journal.id}-${index}`}
                                  >
                                    <div className={`flex items-center gap-1.5 ${isDebit ? "" : "pl-5"}`}>
                                      <span className="font-mono font-bold text-[#2563eb] text-[11px]">{act?.code ?? "-"}</span>
                                      <span className="font-semibold text-[#0b1220]">{act?.name ?? "Akun"}</span>
                                    </div>
                                    <span className="font-mono font-bold text-[#0b1220]">
                                      {isDebit ? currency.format(Number(line.debit)) : currency.format(Number(line.credit))}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl bg-white p-8 text-center ring-1 ring-[#dbe5f1]">
                        <FileText className="mx-auto size-9 text-[#94a3b8]" />
                        <p className="mt-3 font-bold text-[#0b1220]">Tidak ada jurnal pada periode ini</p>
                        <p className="text-xs text-[#64748b] mt-1">Posting transaksi kas atau jurnal baru dari form di sebelah kanan.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. MUTASI KAS OPERASIONAL */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Buku Kas</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Mutasi Kas Harian ({cashRows.length})</h2>
                    </div>
                    <Landmark className="size-5 text-[#2563eb]" />
                  </div>

                  <div className="space-y-2">
                    {cashRows.length ? (
                      cashRows.map((transaction) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbff] p-3 border border-[#e2e8f0] hover:bg-white transition-all"
                          key={transaction.id}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                                transaction.direction === "in"
                                  ? "bg-[#dcfce7] text-[#16a34a]"
                                  : "bg-[#fee2e2] text-[#dc2626]"
                              }`}
                            >
                              {transaction.direction === "in" ? (
                                <ArrowDownLeft className="size-4" />
                              ) : (
                                <ArrowUpRight className="size-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-[#0b1220] leading-snug break-words">
                                {transaction.description ?? transaction.source_type}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-[#64748b]">
                                {transaction.transaction_date} · {transaction.source_type}
                              </p>
                            </div>
                          </div>
                          <p
                            className={`font-mono text-xs font-black text-right shrink-0 ${
                              transaction.direction === "in" ? "text-[#16a34a]" : "text-[#dc2626]"
                            }`}
                          >
                            {transaction.direction === "in" ? "+" : "-"}
                            {currency.format(Number(transaction.amount ?? 0))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-center text-xs text-[#64748b] italic">Belum ada mutasi kas pada periode ini.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* ============================================================ */}
              {/* SIDEBAR: FORMS WITH MODERN CUSTOM SELECT & SEARCHABLE SELECT */}
              {/* ============================================================ */}
              <aside className="space-y-4">
                {/* Form 1: Posting Kas Manual */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Entri Kas</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Posting Transaksi Kas</h2>
                    </div>
                    <Banknote className="size-5 text-[#2563eb]" />
                  </div>

                  <form action={postCashTransaction} className="space-y-3.5">
                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Unit Usaha</span>
                      <CustomSelect name="unit_name" className="mt-1.5 h-10">
                        <option value="Pusat / Umum">🏢 Kantor Pusat / Umum</option>
                        {unitList.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.code} · {u.name}
                          </option>
                        ))}
                      </CustomSelect>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-[#475569]">Jenis Kas</span>
                        <CustomSelect name="direction" defaultValue="in" className="mt-1.5 h-10">
                          <option value="in">Kas Masuk (+)</option>
                          <option value="out">Kas Keluar (-)</option>
                        </CustomSelect>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-[#475569]">Sumber Kas</span>
                        <CustomSelect name="fund_source" defaultValue="kas" className="mt-1.5 h-10">
                          <option value="kas">Kas Tunai (1001)</option>
                          <option value="bank">Bank (1002)</option>
                        </CustomSelect>
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Kategori / Akun Lawan *</span>
                      <SearchableSelect
                        name="counter_account_id"
                        required
                        placeholder="-- Pilih Akun Lawan --"
                        searchPlaceholder="Ketik kode / nama akun..."
                        className="mt-1.5 h-10 text-xs"
                        options={accountRows
                          .filter((a) => a.code !== "1001" && a.code !== "1002")
                          .map((a) => ({
                            value: a.id,
                            label: `${a.code} · ${a.name}`,
                            sublabel: `Kategori: ${a.category}`,
                          }))}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Nominal Kas (Rp)</span>
                      <CurrencyInput
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        name="amount"
                        placeholder="0"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
                      <input
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        name="transaction_date"
                        type="date"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Keterangan</span>
                      <textarea
                        className="mt-1.5 min-h-16 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[#2563eb]"
                        name="description"
                        placeholder="Contoh: Pembayaran operasional kantor..."
                      />
                    </label>

                    <SubmitButton className="h-10 w-full rounded-xl bg-[#2563eb] text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8]">
                      Posting Transaksi Kas
                    </SubmitButton>
                  </form>
                </section>

                {/* Form 2: Input Jurnal Manual Dua Sisi */}
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                  <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Jurnal Umum</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Input Jurnal Dua Sisi</h2>
                    </div>
                    <Plus className="size-5 text-[#2563eb]" />
                  </div>

                  <form action={postManualJournal} className="space-y-3.5">
                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Unit Usaha</span>
                      <CustomSelect name="unit_name" className="mt-1.5 h-10">
                        <option value="Pusat / Umum">🏢 Kantor Pusat / Umum</option>
                        {unitList.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.code} · {u.name}
                          </option>
                        ))}
                      </CustomSelect>
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Akun Debit (Dr)</span>
                      <SearchableSelect
                        name="debit_account_id"
                        required
                        placeholder="-- Pilih Akun Debit --"
                        searchPlaceholder="Ketik kode / nama akun..."
                        className="mt-1.5 h-10 text-xs"
                        options={accountRows.map((a) => ({
                          value: a.id,
                          label: `${a.code} · ${a.name}`,
                          sublabel: `Kategori: ${a.category}`,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Akun Kredit (Cr)</span>
                      <SearchableSelect
                        name="credit_account_id"
                        required
                        placeholder="-- Pilih Akun Kredit --"
                        searchPlaceholder="Ketik kode / nama akun..."
                        className="mt-1.5 h-10 text-xs"
                        options={accountRows.map((a) => ({
                          value: a.id,
                          label: `${a.code} · ${a.name}`,
                          sublabel: `Kategori: ${a.category}`,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Nominal Jurnal (Rp)</span>
                      <CurrencyInput
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        name="amount"
                        placeholder="0"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Jurnal</span>
                      <input
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        name="entry_date"
                        type="date"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase text-[#475569]">Memo / Keterangan</span>
                      <textarea
                        className="mt-1.5 min-h-16 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[#2563eb]"
                        name="memo"
                        placeholder="Contoh: Penyesuaian akhir bulan..."
                      />
                    </label>

                    <SubmitButton className="h-10 w-full rounded-xl bg-[#0b1220] text-xs font-bold text-white shadow-sm hover:bg-[#1e293b]">
                      Posting Jurnal Dua Sisi
                    </SubmitButton>
                  </form>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
