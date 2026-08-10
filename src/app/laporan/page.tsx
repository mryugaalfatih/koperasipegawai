import {
  ArrowLeft,
  Banknote,
  BookOpenCheck,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  Landmark,
  PiggyBank,
  ReceiptText,
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

type LaporanPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
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
};

type JournalEntry = {
  id: string;
  transaction_date: string;
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

const monthNames = [
  "",
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

const basisLabels: Record<string, string> = {
  manual: "Proses pengurus/manual",
  savings: "Proporsional simpanan",
  loan_interest: "Jasa pinjaman",
};

export default async function LaporanPage({ searchParams }: LaporanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ======================================================================
  // FETCH ALL DATA FROM THE SAME REAL TABLES USED BY EACH MODULE
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
  ] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),

    // Same table as /simpanan/rekening
    supabase.from("savings_accounts").select("id, type, balance"),

    // Same table as /pinjaman
    supabase.from("loans").select("id, principal, status"),

    // Same table as /kas
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("transaction_date", { ascending: false })
      .limit(200),

    // Journal entries for income/expense calculation
    supabase
      .from("journal_entries")
      .select("id, transaction_date, debit, credit, accounts(code, name, category)")
      .order("transaction_date", { ascending: false })
      .limit(500),

    supabase.from("shu_allocation_rules").select("id, component, percent, basis").eq("is_active", true).order("component"),
    supabase
      .from("shu_periods")
      .select("id, year, net_surplus, status, shu_allocations(component, percent, amount)")
      .order("year", { ascending: false })
      .limit(5),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  // ======================================================================
  // COMPUTE SAVINGS TOTALS (same logic as /simpanan/rekening)
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
  // COMPUTE LOAN TOTALS (same logic as /pinjaman)
  // ======================================================================
  const loanRows = (loans ?? []) as LoanRow[];
  const totalOutstanding = loanRows
    .filter((l) => l.status === "disbursed")
    .reduce((s, l) => s + Number(l.principal ?? 0), 0);
  const activeLoans = loanRows.filter((l) => l.status === "disbursed").length;

  // ======================================================================
  // COMPUTE CASH TOTALS (same logic as /kas)
  // ======================================================================
  const cashRows = (cashTransactions ?? []) as CashTransaction[];
  const totalCashIn = cashRows
    .filter((c) => c.direction === "in")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalCashOut = cashRows
    .filter((c) => c.direction === "out")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const netCash = totalCashIn - totalCashOut;

  // ======================================================================
  // COMPUTE INCOME / EXPENSE FROM JOURNAL ENTRIES
  // ======================================================================
  const journals = (journalEntries ?? []) as unknown as JournalEntry[];
  let totalIncome = 0;
  let totalExpense = 0;
  journals.forEach((je) => {
    const accountObj = Array.isArray(je.accounts) ? je.accounts[0] : je.accounts;
    const category = accountObj?.category ?? "";
    if (category === "pendapatan" || category === "income" || category === "revenue") {
      totalIncome += Number(je.credit ?? 0) - Number(je.debit ?? 0);
    } else if (category === "beban" || category === "expense") {
      totalExpense += Number(je.debit ?? 0) - Number(je.credit ?? 0);
    }
  });
  const totalSurplus = totalIncome - totalExpense;

  // ======================================================================
  // SHU DATA
  // ======================================================================
  const ruleRows = (shuRules ?? []) as ShuAllocationRule[];
  const shuRows = (shuPeriods ?? []) as unknown as ShuPeriod[];
  const latestShu = shuRows[0];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />
        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/home">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Laporan</p>
              <h1 className="text-xl font-black md:text-2xl">Laba rugi, portofolio, dan SHU</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold text-[#0b1220] shadow-sm hover:bg-slate-50 transition-all"
              href="/laporan/simpanan"
            >
              <PiggyBank className="size-4 text-[#2563eb]" />
              <span>Laporan Simpanan</span>
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold text-[#0b1220] shadow-sm hover:bg-slate-50 transition-all"
              href="/laporan/pinjaman"
            >
              <CreditCard className="size-4 text-[#2563eb]" />
              <span>Laporan Pinjaman</span>
            </Link>
            <PrintReportButton />
            <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/kas-jurnal">
              Buka jurnal
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          {/* Hero Banner */}
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Laporan manajemen</p>
                <h2 className="mt-1.5 text-xl font-bold md:text-2xl">Kinerja koperasi siap dipresentasikan</h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#cbd5e1]">
                  Data laporan dibaca langsung dari tabel simpanan, pinjaman, kas, dan jurnal akuntansi. SHU bisa disimulasikan dari laba bersih berjalan.
                </p>
              </div>
              <FileBarChart2 className="size-8 text-[#93c5fd]" />
            </div>
          </section>

          {/* Summary KPI Cards */}
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Total Simpanan Anggota", value: currency.format(totalSavings), icon: PiggyBank },
              { label: "Outstanding Pinjaman Aktif", value: currency.format(totalOutstanding), icon: Landmark },
              { label: "Pendapatan (Jurnal)", value: currency.format(totalIncome), icon: TrendingUp },
              { label: "Anggota Aktif", value: String(memberCount ?? 0), icon: UsersRound },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-5 text-[#2563eb]" />
                <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-[#0b1220]">{item.value}</p>
              </article>
            ))}
          </div>

          {/* Detail Portfolio & P/L section */}
          <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
            {/* Cash & P/L Card */}
            <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Kas & Laba Rugi</p>
                <h2 className="text-lg font-bold text-[#0b1220]">Ringkasan Arus Kas & Pendapatan</h2>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
                <div className="divide-y divide-[#dbe5f1]">
                  {[
                    { label: "Kas Masuk", value: currency.format(totalCashIn), color: "text-emerald-600" },
                    { label: "Kas Keluar", value: currency.format(totalCashOut), color: "text-rose-600" },
                    { label: "Saldo Kas Bersih", value: currency.format(netCash), color: "text-[#2563eb]" },
                    { label: "Pendapatan (Jurnal)", value: currency.format(totalIncome), color: "text-emerald-600" },
                    { label: "Beban (Jurnal)", value: currency.format(totalExpense), color: "text-rose-600" },
                    { label: "Surplus / SHU Berjalan", value: currency.format(totalSurplus), color: "text-[#2563eb]" },
                  ].map((item) => (
                    <div className="flex items-center justify-between gap-3 p-4" key={item.label}>
                      <p className="text-sm font-black text-[#0b1220]">{item.label}</p>
                      <p className={`text-sm font-black ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio Summary Card */}
            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <p className="text-sm font-bold text-[#64748b]">Posisi portofolio</p>
              <h2 className="text-2xl font-black">Ringkasan neraca kerja</h2>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Simpanan Pokok", value: currency.format(totalSimpananPokok), icon: PiggyBank },
                  { label: "Simpanan Wajib", value: currency.format(totalSimpananWajib), icon: PiggyBank },
                  { label: "Simpanan Sukarela", value: currency.format(totalSimpananSukarela), icon: PiggyBank },
                  { label: "Total Simpanan", value: currency.format(totalSavings), icon: Landmark },
                  { label: "Outstanding Pinjaman", value: currency.format(totalOutstanding), icon: CreditCard },
                  { label: "Pinjaman Aktif", value: `${activeLoans} Berkas`, icon: ReceiptText },
                ].map((item) => (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4f7fb] p-4" key={item.label}>
                    <div className="flex items-center gap-3">
                      <item.icon className="size-5 text-[#2563eb]" />
                      <p className="text-sm font-black">{item.label}</p>
                    </div>
                    <p className="text-sm font-black text-[#2563eb]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SHU Section */}
          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5" id="shu">
            <div>
              <p className="text-sm font-bold text-[#64748b]">SHU</p>
              <h2 className="text-2xl font-black">Simulasi pembagian</h2>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {latestShu ? (
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">Tahun buku {latestShu.year}</p>
                      <p className="mt-1 text-sm font-semibold text-[#64748b]">Status {latestShu.status}</p>
                    </div>
                    <p className="text-xl font-black text-[#2563eb]">{currency.format(Number(latestShu.net_surplus ?? 0))}</p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(latestShu.shu_allocations ?? []).map((allocation) => (
                      <div className="rounded-2xl bg-[#f4f7fb] p-4" key={allocation.component}>
                        <p className="font-black">{allocation.component}</p>
                        <p className="mt-1 text-sm font-bold text-[#64748b]">{Number(allocation.percent ?? 0)}%</p>
                        <p className="mt-2 text-lg font-black text-[#2563eb]">{currency.format(Number(allocation.amount ?? 0))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Banknote className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada simulasi SHU</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Buat simulasi dari form di samping.</p>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* Sidebar */}
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {params.error ? (
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
          ) : null}
          {params.saved ? (
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Simulasi SHU berhasil dibuat.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Banknote className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Simulasi SHU</p>
                <h2 className="text-xl font-black">Buat periode</h2>
              </div>
            </div>
            <form action={createShuSimulation} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Tahun buku</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="year" placeholder="2026" type="number" />
              </label>
              <label className="block">
                <span className="text-sm font-black">SHU bersih</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="net_surplus" placeholder={String(Math.max(totalSurplus, 0))} type="number" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
                Buat simulasi
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="size-5 text-[#2563eb]" />
              <h2 className="text-xl font-black">Rule SHU aktif</h2>
            </div>
            <div className="mt-4 space-y-3">
              {ruleRows.length ? (
                ruleRows.map((rule) => (
                  <div className="rounded-2xl bg-[#f4f7fb] p-4" key={rule.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{rule.component}</p>
                        <p className="mt-1 text-sm font-semibold text-[#64748b]">{basisLabels[rule.basis] ?? rule.basis}</p>
                      </div>
                      <p className="font-black text-[#2563eb]">{Number(rule.percent ?? 0)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">
                  Rule SHU belum ada. Jalankan seed atau tambah dari konfigurasi berikutnya.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
    </div>
    </main>
  );
}
