import {
  ArrowLeft,
  Banknote,
  BookOpenCheck,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
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

type ProfitLossRow = {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net_surplus: number;
};

type SavingsSummaryRow = {
  total_simpanan: number;
};

type LoanOutstandingRow = {
  outstanding_amount: number;
  status: string;
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
  savings: "Proporcional simpanan",
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

  const [
    { data: profile },
    { data: profitLoss },
    { data: savingsSummary },
    { data: loanOutstanding },
    { data: shuRules },
    { data: shuPeriods },
    { count: memberCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("v_profit_loss_monthly").select("year, month, total_income, total_expense, net_surplus").order("year", { ascending: false }).order("month", { ascending: false }).limit(12),
    supabase.from("v_member_savings_summary").select("total_simpanan"),
    supabase.from("v_loan_outstanding").select("outstanding_amount, status"),
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


  const profitRows = (profitLoss ?? []) as ProfitLossRow[];
  const savingsRows = (savingsSummary ?? []) as SavingsSummaryRow[];
  const loanRows = (loanOutstanding ?? []) as LoanOutstandingRow[];
  const ruleRows = (shuRules ?? []) as ShuAllocationRule[];
  const shuRows = (shuPeriods ?? []) as unknown as ShuPeriod[];
  const latestProfit = profitRows[0];
  const totalIncome = profitRows.reduce((sum, row) => sum + Number(row.total_income ?? 0), 0);
  const totalExpense = profitRows.reduce((sum, row) => sum + Number(row.total_expense ?? 0), 0);
  const totalSurplus = totalIncome - totalExpense;
  const totalSavings = savingsRows.reduce((sum, row) => sum + Number(row.total_simpanan ?? 0), 0);
  const totalOutstanding = loanRows.reduce((sum, row) => sum + Number(row.outstanding_amount ?? 0), 0);
  const activeLoans = loanRows.filter((row) => row.status === "disbursed").length;
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
            <PrintReportButton />
            <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/kas-jurnal">
              Buka jurnal
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Laporan manajemen</p>
                <h2 className="mt-1.5 text-xl font-bold md:text-2xl">Kinerja koperasi siap dipresentasikan</h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#cbd5e1]">
                  Data laporan dibaca dari jurnal, simpanan anggota, dan outstanding pinjaman. SHU bisa disimulasikan dari laba bersih berjalan.
                </p>
              </div>
              <FileBarChart2 className="size-8 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Pendapatan 12 bulan", value: currency.format(totalIncome), icon: TrendingUp },
              { label: "Beban 12 bulan", value: currency.format(totalExpense), icon: TrendingDown },
              { label: "SHU berjalan", value: currency.format(totalSurplus), icon: CircleDollarSign },
              { label: "Anggota aktif", value: String(memberCount ?? 0), icon: UsersRound },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-5 text-[#2563eb]" />
                <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-[#0b1220]">{item.value}</p>
              </article>
            ))}
          </div>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
            <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Laba rugi</p>
                <h2 className="text-lg font-bold text-[#0b1220]">Per bulan</h2>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
                {profitRows.length ? (
                  profitRows.map((row) => (
                    <div className="grid gap-3 border-b border-[#dbe5f1] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={`${row.year}-${row.month}`}>
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                          <ChartNoAxesCombined className="size-5" />
                        </div>
                        <div>
                          <p className="font-black">{monthNames[row.month - 1]} {row.year}</p>
                          <p className="mt-1 text-sm font-semibold text-[#64748b]">
                            Pendapatan {currency.format(Number(row.total_income ?? 0))} | Beban {currency.format(Number(row.total_expense ?? 0))}
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-black text-[#2563eb]">{currency.format(Number(row.net_surplus ?? 0))}</p>
                        <p className="mt-1 text-xs font-black text-[#64748b]">Surplus bersih</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <BookOpenCheck className="mx-auto size-10 text-[#94a3b8]" />
                    <p className="mt-3 font-black">Belum ada laba rugi</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748b]">Posting jurnal pendapatan atau beban di modul Kas & Jurnal.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <p className="text-sm font-bold text-[#64748b]">Posisi portofolio</p>
              <h2 className="text-2xl font-black">Ringkasan neraca kerja</h2>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Total simpanan anggota", value: currency.format(totalSavings), icon: PiggyBank },
                  { label: "Outstanding pinjaman", value: currency.format(totalOutstanding), icon: Landmark },
                  { label: "Pinjaman aktif", value: String(activeLoans), icon: ReceiptText },
                  { label: "Periode terakhir", value: latestProfit ? `${monthNames[latestProfit.month - 1]} ${latestProfit.year}` : "-", icon: Calculator },
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

