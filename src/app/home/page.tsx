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

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const navItems = [
  { label: "Home", icon: House, href: "/home" },
  { label: "Anggota", icon: UsersRound, href: "/anggota" },
  { label: "Simpanan", icon: WalletCards, href: "/simpanan" },
  { label: "Pinjaman", icon: CreditCard, href: "/pinjaman" },
  { label: "Kas", icon: Scale, href: "/kas-jurnal" },
  { label: "Laporan", icon: FileBarChart2, href: "/laporan" },
  { label: "Audit", icon: Fingerprint, href: "/audit" },
  { label: "User", icon: UserCog, href: "/users" },
  { label: "Setup", icon: ShieldCheck, href: "/konfigurasi" },
];

const mobileNavItems = navItems.filter((item) =>
  ["Home", "Anggota", "Simpanan", "Pinjaman", "Setup"].includes(item.label),
);

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.%20Jalankan%20helper%20SQL%20super%20admin.");
  }

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [
    { count: activeMemberCount },
    { count: newMemberCount },
    { data: savingsAccounts },
    { data: loans },
    { data: pendingLoans },
    { data: cashTransactions },
    { data: profitLossRows },
    { data: loanOutstandingRows },
    { data: shuRules },
  ] = await Promise.all([
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
  ]);

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
        <aside className="hidden border-r border-[#dbe5f1] bg-[#f8fbff] px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">Admin suite</p>
              <h1 className="text-xl font-black">KoperasiPro</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item, index) => (
              <a
                className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold ${
                  index === 0 ? "bg-[#0b1220] text-white shadow-sm" : "text-[#475569] hover:bg-white"
                }`}
                href={item.href}
                key={item.label}
              >
                <item.icon className="size-5" />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

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

          <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-4 md:px-7 md:py-6">
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#bfdbfe]">
                      <CalendarDays className="size-4" />
                      Data operasional {today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight md:text-5xl">
                      Operasional hari ini siap diputuskan.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-[#cbd5e1] md:text-base">
                      Pantau kas, simpanan, risiko pinjaman, dan estimasi SHU tanpa membuka banyak menu.
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                    {quickActions.map((item) => (
                      <a
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-black text-[#07152f]"
                        href={item.href}
                        key={item.label}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3" id="anggota">
                <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                  <p className="text-sm font-bold text-[#64748b]">Anggota aktif</p>
                  <p className="mt-3 text-4xl font-black">{activeMemberCount ?? 0}</p>
                  <p className="mt-3 text-sm font-bold text-[#2563eb]">+{newMemberCount ?? 0} bulan ini</p>
                </div>
                <div className="rounded-[28px] bg-[#eaf2ff] p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#1e40af]">Outstanding</p>
                  <p className="mt-3 text-3xl font-black">{currency.format(totalOutstanding)}</p>
                  <p className="mt-3 text-sm font-bold text-[#1e40af]">Sisa tagihan pinjaman</p>
                </div>
                <div className="col-span-2 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#64748b]">Kas tersedia</p>
                      <p className="mt-2 text-3xl font-black">{currency.format(cashBalance)}</p>
                    </div>
                    <ChartNoAxesCombined className="size-9 text-[#2563eb]" />
                  </div>
                </div>
              </div>
            </section>

            <section className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0" id="simpanan">
              {topline.map((item) => (
                <article className="min-w-[82vw] snap-start rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] sm:min-w-[340px] md:min-w-0" key={item.label}>
                  <div className="flex items-center justify-between">
                    <div className={`grid size-11 place-items-center rounded-2xl ${item.tone}`}>
                      <item.icon className="size-5" />
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-bold text-[#64748b]">{item.label}</p>
                  <p className="mt-2 text-2xl font-black">{item.value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]" id="pinjaman">
              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Workflow pinjaman</p>
                    <h3 className="text-2xl font-black">Pipeline persetujuan</h3>
                  </div>
                  <button className="grid size-11 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <CreditCard className="size-5" />
                  </button>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  {pipeline.map((item) => (
                    <div className="rounded-3xl border border-[#dbe5f1] p-4" key={item.label}>
                      <div className={`h-2 w-12 rounded-full ${item.color}`} />
                      <p className="mt-4 text-sm font-bold text-[#64748b]">{item.label}</p>
                      <p className="mt-1 text-3xl font-black">{item.count}</p>
                      <p className="mt-1 text-xs font-bold text-[#64748b]">{currency.format(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] bg-[#ffffff] p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Butuh keputusan</p>
                    <h3 className="text-2xl font-black">Pengajuan terbaru</h3>
                  </div>
                  <Clock3 className="size-6 text-[#f59e0b]" />
                </div>
                <div className="mt-5 divide-y divide-[#dbe5f1]">
                  {pendingLoanRows.length ? pendingLoanRows.map((item) => (
                    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={item.id}>
                      <div className="min-w-0">
                        <p className="truncate font-black">{item.members?.[0]?.full_name ?? "Anggota"}</p>
                        <p className="truncate text-sm font-semibold text-[#64748b]">{item.loan_products?.[0]?.name ?? "Produk pinjaman"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black">{currency.format(Number(item.principal ?? 0))}</p>
                        <p className="text-xs font-bold text-[#2563eb]">{loanStatusLabels[item.status] ?? item.status}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="py-4 text-sm font-bold text-[#64748b]">Belum ada pengajuan yang menunggu keputusan.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]" id="laporan">
              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Pinjaman</p>
                    <h3 className="text-2xl font-black">Status portofolio</h3>
                  </div>
                  <CheckCircle2 className="size-6 text-[#2563eb]" />
                </div>
                <div className="mt-6 space-y-5">
                  {loanStatusRows.length ? loanStatusRows.map(([status, count]) => {
                    const percent = loanRows.length ? Math.round((count / loanRows.length) * 100) : 0;

                    return (
                    <div key={status}>
                      <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span>{loanStatusLabels[status] ?? status}</span>
                        <span>{count} data</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
                        <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    );
                  }) : (
                    <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada data pinjaman.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#64748b]">Laporan laba rugi</p>
                    <h3 className="text-2xl font-black">Performa berjalan</h3>
                  </div>
                  <a className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white" href="/laporan">
                    <FileBarChart2 className="size-4" />
                    Cetak
                  </a>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {reportRows.map((item) => (
                    <div className="rounded-3xl bg-[#f4f7fb] p-4" key={item.label}>
                      <item.icon className="size-5 text-[#2563eb]" />
                      <p className="mt-4 text-sm font-bold text-[#64748b]">{item.label}</p>
                      <p className="mt-2 text-2xl font-black">{currency.format(Number(item.value ?? 0))}</p>
                      <p className="mt-2 text-sm font-bold text-[#2563eb]">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[28px] bg-[#0b1220] p-5 text-white shadow-sm md:p-6" id="shu">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#bfdbfe]">SHU</p>
                    <h3 className="text-2xl font-black">Simulasi pembagian</h3>
                  </div>
                  <Banknote className="size-6 text-[#93c5fd]" />
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {shuRuleRows.length ? shuRuleRows.slice(0, 4).map((item) => (
                    <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-4" key={item.component}>
                      <CheckCircle2 className="size-5 text-[#93c5fd]" />
                      <span className="text-sm font-bold">{item.component} {Number(item.percent ?? 0)}%</span>
                    </div>
                  )) : (
                    <div className="rounded-2xl bg-white/8 p-4 text-sm font-bold text-[#cbd5e1]">
                      Rule SHU belum tersedia.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] bg-[#eaf2ff] p-5 shadow-sm md:p-6" id="mobile">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#2563eb]">Aplikasi anggota</p>
                    <h3 className="text-2xl font-black">Mobile companion</h3>
                  </div>
                  <Smartphone className="size-6 text-[#2563eb]" />
                </div>
                <div className="mt-5 grid gap-3">
                  {["Saldo & mutasi simpanan", "Pengajuan pinjaman", "Notifikasi jatuh tempo", "Estimasi SHU personal"].map((item) => (
                    <div className="flex items-center justify-between rounded-2xl bg-white p-4" key={item}>
                      <span className="text-sm font-black">{item}</span>
                      <ChevronRight className="size-4 text-[#64748b]" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="konfigurasi">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#64748b]">Konfigurasi awal</p>
                  <h3 className="text-2xl font-black">Sebelum aplikasi dipakai</h3>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#64748b]">
                    Checklist ini perlu dikunci sebelum data transaksi asli masuk agar laporan,
                    RLS, dan perhitungan SHU konsisten.
                  </p>
                </div>
                <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#2563eb]">
                  Setup koperasi
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {setupItems.map((item) => (
                  <div className="flex items-start gap-3 rounded-2xl bg-[#f4f7fb] p-4" key={item}>
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2563eb]" />
                    <span className="text-sm font-black leading-6">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item, index) => (
            <a
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black ${
                index === 0 ? "bg-[#0b1220] text-white" : "text-[#64748b]"
              }`}
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-4" />
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </main>
  );
}

