import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CreditCard,
  FileCheck2,
  Landmark,
  Plus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { approveLoan, createLoan, disburseLoan } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { ToastNotification } from "@/components/ToastNotification";

type PinjamanPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

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
  default_interest_method: "flat" | "annuity";
  allow_method_override: boolean;
};

type LoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusLabels = {
  draft: "Draft",
  submitted: "Diajukan",
  review: "Review",
  approved: "Disetujui",
  disbursed: "Dicairkan",
  closed: "Lunas",
  rejected: "Ditolak",
};

const methodLabels = {
  flat: "Flat",
  annuity: "Anuitas",
};

export default async function PinjamanPage({ searchParams }: PinjamanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const [{ data: members }, { data: products }, { data: loans }] = await Promise.all([
    supabase.from("members").select("id, member_no, full_name").eq("status", "active").order("full_name").limit(100),
    supabase
      .from("loan_products")
      .select("id, name, annual_rate, max_tenor_months, default_interest_method, allow_method_override")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("loans")
      .select("id, principal, tenor_months, status, interest_method, annual_rate_snapshot, members(full_name, member_no), loan_products(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const memberOptions = (members ?? []) as MemberOption[];
  const productRows = (products ?? []) as LoanProduct[];
  const loanRows = (loans ?? []) as unknown as LoanRow[];
  const totalPortfolio = loanRows
    .filter((loan) => loan.status === "disbursed")
    .reduce((sum, loan) => sum + Number(loan.principal ?? 0), 0);

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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Modul pinjaman</p>
              <h1 className="text-xl font-black md:text-2xl">Pengajuan dan pencairan pinjaman</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/konfigurasi#pinjaman">
            Produk pinjaman
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Pinjaman anggota</p>
                <h2 className="mt-1.5 text-xl font-bold md:text-2xl">Flat dan anuitas dalam satu workflow</h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#cbd5e1]">
                  Produk pinjaman menentukan metode default. Pengajuan menyimpan metode final agar jadwal angsuran konsisten.
                </p>
              </div>
              <CreditCard className="size-8 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Portofolio cair", value: currency.format(totalPortfolio), icon: Landmark },
              { label: "Total pengajuan", value: String(loanRows.length), icon: FileCheck2 },
              { label: "Menunggu approval", value: String(loanRows.filter((loan) => loan.status === "submitted").length), icon: CalendarClock },
              { label: "Dicairkan", value: String(loanRows.filter((loan) => loan.status === "disbursed").length), icon: BadgeCheck },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-5 text-[#2563eb]" />
                <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-[#0b1220]">{item.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Daftar pinjaman</p>
              <h2 className="text-lg font-bold text-[#0b1220]">Pengajuan terbaru</h2>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {loanRows.length ? (
                loanRows.map((loan) => {
                  const approve = approveLoan.bind(null, loan.id);
                  const disburse = disburseLoan.bind(null, loan.id);

                  return (
                    <div className="grid gap-4 border-b border-[#dbe5f1] p-4 last:border-b-0 xl:grid-cols-[1fr_auto]" key={loan.id}>
                      <Link className="flex min-w-0 items-start gap-3 rounded-2xl transition-colors hover:bg-[#f8fbff]" href={`/pinjaman/${loan.id}`}>
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                          <UsersRound className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black">{loan.members?.[0]?.full_name ?? "Anggota"}</p>
                          <p className="text-sm font-bold text-[#64748b]">{loan.loan_products?.[0]?.name ?? "Produk pinjaman"}</p>
                          <p className="mt-1 text-sm font-semibold text-[#64748b]">
                            {methodLabels[loan.interest_method]} | {Number(loan.annual_rate_snapshot ?? 0)}%/tahun | {loan.tenor_months} bulan
                          </p>
                        </div>
                      </Link>
                      <div className="space-y-2 text-left xl:text-right">
                        <p className="font-black text-[#2563eb]">{currency.format(Number(loan.principal ?? 0))}</p>
                        <p className="text-xs font-black text-[#64748b]">{statusLabels[loan.status]}</p>
                        <div className="flex gap-2 xl:justify-end">
                          {loan.status === "submitted" ? (
                            <form action={approve}>
                              <button className="h-9 rounded-xl bg-[#2563eb] px-3 text-xs font-black text-white" type="submit">Approve</button>
                            </form>
                          ) : null}
                          {loan.status === "approved" ? (
                            <form action={disburse}>
                              <button className="h-9 rounded-xl bg-[#0b1220] px-3 text-xs font-black text-white" type="submit">Cairkan</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <CreditCard className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada pengajuan</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Buat pengajuan pertama dari form di samping.</p>
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
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Data pinjaman berhasil disimpan.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Pengajuan</p>
                <h2 className="text-xl font-black">Buat pinjaman</h2>
              </div>
            </div>
            <form action={createLoan} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Anggota</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="member_id" required>
                  <option value="">Pilih anggota</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>{member.member_no} | {member.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Produk pinjaman</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="product_id" required>
                  <option value="">Pilih produk</option>
                  {productRows.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} | {methodLabels[product.default_interest_method]} | {Number(product.annual_rate)}%
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black">Plafon</span>
                  <CurrencyInput name="principal" placeholder="0" required />
                </label>
                <label className="block">
                  <span className="text-sm font-black">Tenor bulan</span>
                  <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="tenor_months" placeholder="12" required type="number" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black">Bunga tahunan %</span>
                  <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="annual_rate" placeholder="Ikuti produk" type="number" step="0.0001" />
                </label>
                <label className="block">
                  <span className="text-sm font-black">Metode</span>
                  <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="interest_method">
                    <option value="flat">Flat</option>
                    <option value="annuity">Anuitas</option>
                  </select>
                </label>
              </div>
              <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white hover:bg-[#1d4ed8]">
                Simpan pengajuan
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
            <Banknote className="size-6 text-[#2563eb]" />
            <h2 className="mt-4 text-xl font-black">Catatan metode</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
              Flat memakai pokok dan jasa rata. Anuitas memakai total angsuran relatif tetap.
              Jadwal dibuat saat pinjaman dicairkan.
            </p>
          </section>
        </aside>
      </div>
    </section>
    </div>
    <ToastNotification error={params.error} saved={params.saved} />
    </main>
  );
}


