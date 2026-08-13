import {
  ArrowDownLeft,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileBarChart2,
  Fingerprint,
  House,
  Landmark,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  UsersRound,
  UserCog,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const quickActions = [
  { label: "Setoran", icon: ArrowDownLeft, href: "/simpanan" },
  { label: "Angsuran", icon: ReceiptText, href: "/pinjaman" },
  { label: "Pinjaman", icon: CreditCard, href: "/pinjaman" },
  { label: "Anggota", icon: Plus, href: "/anggota" },
];

const setupItems = [
  "Profil koperasi, cabang, dan tahun buku",
  "User, role, dan hak akses",
  "Produk simpanan dan produk pinjaman",
  "Metode bunga pinjaman flat atau anuitas",
  "Chart of accounts dan saldo awal",
  "Formula SHU dan komponen pembagian",
  "Template dokumen, laporan, dan notifikasi",
];

type SavingsAccount = {
  balance: number;
  type: "pokok" | "wajib" | "sukarela";
};

type LoanRow = {
  principal: number;
  status: string;
};

type PendingLoan = {
  id: string;
  principal: number;
  status: string;
  members: {
    full_name: string;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

type CashTransaction = {
  direction: "in" | "out";
  amount: number;
};

type ProfitLoss = {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net_surplus: number;
};

type LoanOutstanding = {
  outstanding_amount: number;
  status: string;
};

type ShuRule = {
  component: string;
  percent: number;
};

const loanStatusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  review: "Review",
  approved: "Disetujui",
  disbursed: "Dicairkan",
  closed: "Lunas",
  rejected: "Ditolak",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [
    { data: profile },
    { count: activeMemberCount },
    { count: newMemberCount },
    { data: savingsAccounts },
    { data: loans },
    { data: pendingLoans },
    { data: cashTransactions },
    { data: profitLossRows },
    { data: loanOutstandingRows },
    { data: shuRules },
    { data: businessUnits },
  ] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).single(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("members").select("id", { count: "exact", head: true }).gte("joined_at", firstDayOfMonth),
    supabase.from("savings_accounts").select("balance, type"),
    supabase.from("loans").select("principal, status"),
    supabase
      .from("loans")
      .select("id, principal, status, members(full_name), loan_products(name)")
      .in("status", ["submitted", "review", "approved"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("cash_transactions").select("direction, amount").limit(1000),
    supabase
      .from("v_profit_loss_monthly")
      .select("year, month, total_income, total_expense, net_surplus")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12),
    supabase.from("v_loan_outstanding").select("outstanding_amount, status"),
    supabase.from("shu_allocation_rules").select("component, percent").eq("is_active", true).order("component"),
    supabase.from("business_units").select("id, code, name").eq("is_active", true).order("code"),
  ]);

  const activeUnitLabel = businessUnits?.length ? businessUnits.map((u) => u.code).join(" · ") : "Semua Unit Usaha";

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.%20Jalankan%20helper%20SQL%20super%20admin.");
  }


  const savingsRows = (savingsAccounts ?? []) as SavingsAccount[];
  const loanRows = (loans ?? []) as LoanRow[];
  const pendingLoanRows = (pendingLoans ?? []) as unknown as PendingLoan[];
  const cashRows = (cashTransactions ?? []) as CashTransaction[];
  const profitRows = (profitLossRows ?? []) as ProfitLoss[];
  const outstandingRows = (loanOutstandingRows ?? []) as LoanOutstanding[];
  const shuRuleRows = (shuRules ?? []) as ShuRule[];
  const latestProfit = profitRows[0];
  const totalSavings = savingsRows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const totalLoanPrincipal = loanRows
    .filter((loan) => loan.status === "disbursed")
    .reduce((sum, loan) => sum + Number(loan.principal ?? 0), 0);
  const cashBalance = cashRows.reduce(
    (sum, row) => sum + (row.direction === "in" ? Number(row.amount ?? 0) : -Number(row.amount ?? 0)),
    0,
  );
  const totalIncome = profitRows.reduce((sum, row) => sum + Number(row.total_income ?? 0), 0);
  const totalExpense = profitRows.reduce((sum, row) => sum + Number(row.total_expense ?? 0), 0);
  const runningShu = totalIncome - totalExpense;
  const totalOutstanding = outstandingRows.reduce((sum, row) => sum + Number(row.outstanding_amount ?? 0), 0);
  const pipeline = [
    { label: "Diajukan", status: "submitted", color: "bg-slate-900" },
    { label: "Review", status: "review", color: "bg-[#2563eb]" },
    { label: "Disetujui", status: "approved", color: "bg-[#2563eb]" },
    { label: "Dicairkan", status: "disbursed", color: "bg-[#f59e0b]" },
  ].map((item) => {
    const rows = loanRows.filter((loan) => loan.status === item.status);

    return {
      ...item,
      count: rows.length,
      amount: rows.reduce((sum, loan) => sum + Number(loan.principal ?? 0), 0),
    };
  });
  const reportRows = [
    { label: "Pendapatan", value: latestProfit?.total_income ?? 0, meta: "Periode terakhir", icon: TrendingUp },
    { label: "Beban", value: latestProfit?.total_expense ?? 0, meta: "Periode terakhir", icon: TrendingDown },
    { label: "SHU berjalan", value: latestProfit?.net_surplus ?? runningShu, meta: "Dari jurnal", icon: Banknote },
  ];
  const topline = [
    { label: "Simpanan", value: currency.format(totalSavings), icon: PiggyBank, tone: "bg-[#dbeafe] text-[#1d4ed8]" },
    { label: "Pinjaman cair", value: currency.format(totalLoanPrincipal), icon: Landmark, tone: "bg-[#eef4ff] text-[#1d4ed8]" },
    { label: "SHU berjalan", value: currency.format(runningShu), icon: CircleDollarSign, tone: "bg-[#e0f2fe] text-[#0369a1]" },
  ];
  const loanStatusRows = Object.entries(
    loanRows.reduce<Record<string, number>>((summary, loan) => {
      summary[loan.status] = (summary[loan.status] ?? 0) + 1;
      return summary;
    }, {}),
  );

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />

        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white lg:hidden">
                  <Menu className="size-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">
                    {profile.role === "super_admin" ? "Super admin" : profile.role}
                  </p>
                  <h2 className="truncate text-xl font-black md:text-2xl">
                    {profile.full_name ?? "Dashboard koperasi"}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-11 items-center gap-2 rounded-2xl border border-[#dbe5f1] bg-white px-4 md:flex">
                  <Search className="size-4 text-[#64748b]" />
                  <span className="text-sm font-semibold text-[#64748b]">Cari anggota/transaksi</span>
                </div>
                <button className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white">
                  <Bell className="size-5 text-[#334155]" />
                </button>
                <form action={signOut}>
                  <button className="grid size-10 place-items-center rounded-2xl bg-[#0b1220] text-white md:hidden" type="submit" aria-label="Keluar">
                    <LogOut className="size-4" />
                  </button>
                </form>
                <form action={signOut}>
                  <button className="hidden h-10 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" type="submit">
                    <LogOut className="size-4" />
                    Keluar
                  </button>
                </form>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-4 md:px-6 md:py-5">
            {/* Hero Section */}
            <section className="rounded-xl bg-[#07152f] p-4 text-white shadow-sm md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#bfdbfe]">
                      <CalendarDays className="size-4" />
                      Data operasional {today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <span className="rounded-full bg-[#2563eb] px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                      Unit Usaha Aktif: {activeUnitLabel}
                    </span>
                  </div>
                  <h1 className="mt-2.5 text-lg font-bold md:text-xl">
                    Dashboard Operasional Koperasi
                  </h1>
                  <p className="mt-1 max-w-xl text-xs font-medium text-[#cbd5e1]">
                    Pantau kas unit, simpanan anggota, tagihan pinjaman, dan performa SHU secara real-time.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
                  {quickActions.map((item) => (
                    <a
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3.5 text-xs font-bold text-[#07152f] shadow-sm hover:bg-slate-100 transition-all"
                      href={item.href}
                      key={item.label}
                    >
                      <item.icon className="size-4 text-[#2563eb]" />
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* Core KPI Cards */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <div className="grid size-9 place-items-center rounded-lg bg-[#dbeafe] text-[#1d4ed8]">
                    <PiggyBank className="size-4" />
                  </div>
                  <span className="text-xs font-bold text-[#2563eb]">+{newMemberCount ?? 0} bulan ini</span>
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">Total Simpanan ({activeMemberCount ?? 0} Anggota)</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(totalSavings)}</p>
              </article>

              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#eef4ff] text-[#1d4ed8]">
                  <Landmark className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">Outstanding Pinjaman</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(totalOutstanding)}</p>
              </article>

              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#eaf2ff] text-[#2563eb]">
                  <ChartNoAxesCombined className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">Kas Tersedia</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(cashBalance)}</p>
              </article>

              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#e0f2fe] text-[#0369a1]">
                  <CircleDollarSign className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">SHU Berjalan</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1220]">{currency.format(runningShu)}</p>
              </article>
            </section>

            {/* Loan Workflow & Submissions */}
            <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]" id="pinjaman">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Workflow pinjaman</p>
                    <h3 className="text-lg font-bold text-[#0b1220]">Pipeline persetujuan</h3>
                  </div>
                  <button className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <CreditCard className="size-5" />
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {pipeline.map((item) => (
                    <div className="rounded-2xl border border-[#dbe5f1] p-4" key={item.label}>
                      <div className={`h-1.5 w-10 rounded-full ${item.color}`} />
                      <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                      <p className="mt-1 text-2xl font-bold text-[#0b1220]">{item.count}</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748b]">{currency.format(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-[#ffffff] p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Butuh keputusan</p>
                    <h3 className="text-lg font-bold text-[#0b1220]">Pengajuan terbaru</h3>
                  </div>
                  <Clock3 className="size-5 text-[#f59e0b]" />
                </div>
                <div className="mt-4 divide-y divide-[#dbe5f1]">
                  {pendingLoanRows.length ? pendingLoanRows.map((item) => (
                    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={item.id}>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-sm text-[#0b1220]">{item.members?.[0]?.full_name ?? "Anggota"}</p>
                        <p className="truncate text-xs font-semibold text-[#64748b]">{item.loan_products?.[0]?.name ?? "Produk pinjaman"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#0b1220]">{currency.format(Number(item.principal ?? 0))}</p>
                        <p className="text-xs font-bold text-[#2563eb]">{loanStatusLabels[item.status] ?? item.status}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="py-4 text-xs font-bold text-[#64748b]">Belum ada pengajuan yang menunggu keputusan.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Reports & SHU Summary */}
            <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" id="laporan">
              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Laporan laba rugi</p>
                    <h3 className="text-lg font-bold text-[#0b1220]">Performa berjalan</h3>
                  </div>
                  <a className="inline-flex h-9 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all" href="/laporan">
                    <FileBarChart2 className="size-4" />
                    Cetak Laporan
                  </a>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {reportRows.map((item) => (
                    <div className="rounded-2xl bg-[#f4f7fb] p-4" key={item.label}>
                      <item.icon className="size-5 text-[#2563eb]" />
                      <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                      <p className="mt-1 text-lg font-bold text-[#0b1220]">{currency.format(Number(item.value ?? 0))}</p>
                      <p className="mt-1 text-xs font-semibold text-[#2563eb]">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-[#0b1220] p-5 text-white shadow-sm md:p-6" id="shu">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Formula SHU</p>
                    <h3 className="text-lg font-bold">Simulasi pembagian</h3>
                  </div>
                  <Banknote className="size-6 text-[#93c5fd]" />
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {shuRuleRows.length ? shuRuleRows.slice(0, 4).map((item) => (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-3 text-xs font-semibold" key={item.component}>
                      <CheckCircle2 className="size-4 text-[#93c5fd] shrink-0" />
                      <span>{item.component} ({Number(item.percent ?? 0)}%)</span>
                    </div>
                  )) : (
                    <div className="rounded-2xl bg-white/10 p-3 text-xs font-semibold text-[#cbd5e1]">
                      Rule SHU belum tersedia.
                    </div>
                  )}
                </div>
              </div>
            </section>


            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="konfigurasi">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <UserCog className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0b1220]">Pengaturan & Parameter Koperasi</h3>
                    <p className="text-xs font-semibold text-[#64748b]">Kelola produk simpanan, pinjaman, cabang, CoA akuntansi, dan formula SHU</p>
                  </div>
                </div>
                <a
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                  href="/konfigurasi"
                >
                  <span>Buka Pengaturan</span>
                  <ChevronRight className="size-4" />
                </a>
              </div>
            </section>

          </div>
        </section>
      </div>
    </main>
  );
}


