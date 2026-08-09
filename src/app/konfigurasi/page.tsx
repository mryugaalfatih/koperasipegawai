import {
  ArrowLeft,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  PiggyBank,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createBranch,
  createFiscalPeriod,
  createLoanProduct,
  createSavingsProduct,
  saveCooperativeProfile,
} from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";

type KonfigurasiPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type CooperativeProfile = {
  id: string;
  name: string;
  legal_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscal_year_start_month: number;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
};

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
  minimum_balance: number;
  monthly_required_amount: number;
  withdrawable: boolean;
};

type LoanProduct = {
  id: string;
  name: string;
  annual_rate: number;
  max_tenor_months: number;
  admin_fee_percent: number;
  default_interest_method: "flat" | "annuity";
  allow_method_override: boolean;
};

type FiscalPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
  branches: {
    name: string;
  }[] | null;
};

const monthOptions = [
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

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function KonfigurasiPage({ searchParams }: KonfigurasiPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const [
    { data: cooperativeProfile },
    { data: branches },
    { data: fiscalPeriods },
    { data: savingsProducts },
    { data: loanProducts },
  ] = await Promise.all([
    supabase.from("cooperative_profiles").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("branches").select("id, code, name, address").order("name"),
    supabase.from("fiscal_periods").select("id, year, month, status, branches(name)").order("year", { ascending: false }).limit(12),
    supabase.from("savings_products").select("*").order("code"),
    supabase.from("loan_products").select("*").order("name"),
  ]);

  const koperasi = cooperativeProfile as CooperativeProfile | null;
  const branchRows = (branches ?? []) as Branch[];
  const fiscalRows = (fiscalPeriods ?? []) as unknown as FiscalPeriod[];
  const savingsRows = (savingsProducts ?? []) as SavingsProduct[];
  const loanRows = (loanProducts ?? []) as LoanProduct[];
  const defaultBranchId = branchRows[0]?.id ?? "";

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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Konfigurasi</p>
              <h1 className="text-xl font-black md:text-2xl">Setup awal aplikasi</h1>
            </div>
          </div>
          <div className="hidden rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#64748b] ring-1 ring-[#dbe5f1] md:block">
            {profile.full_name} · {profile.role}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 md:px-7">
        {params.error ? (
          <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
        ) : null}
        {params.saved ? (
          <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Konfigurasi berhasil disimpan.</div>
        ) : null}

        <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#bfdbfe]">Tiga fondasi awal</p>
              <h2 className="mt-2 text-3xl font-black">Profil, produk, dan metode pinjaman</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                Data ini dikunci sebelum transaksi berjalan agar laporan dan perhitungan angsuran konsisten.
              </p>
            </div>
            <Settings2 className="size-8 text-[#93c5fd]" />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]" id="profil">
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <Landmark className="size-6 text-[#2563eb]" />
              <h2 className="text-2xl font-black">Profil koperasi</h2>
            </div>
            <form action={saveCooperativeProfile} className="mt-5 grid gap-4 md:grid-cols-2">
              <input name="id" type="hidden" value={koperasi?.id ?? ""} />
              <label className="block md:col-span-2">
                <span className="text-sm font-black">Nama koperasi</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={koperasi?.name ?? ""} name="name" placeholder="Nama koperasi" required />
              </label>
              <label className="block">
                <span className="text-sm font-black">Nomor badan hukum</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={koperasi?.legal_number ?? ""} name="legal_number" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Awal tahun buku</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={koperasi?.fiscal_year_start_month ?? 1} name="fiscal_year_start_month">
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Email</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={koperasi?.email ?? ""} name="email" type="email" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Telepon</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={koperasi?.phone ?? ""} name="phone" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-black">Alamat</span>
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" defaultValue={koperasi?.address ?? ""} name="address" />
              </label>
              <button className="h-12 rounded-2xl bg-[#2563eb] px-5 text-sm font-black text-white md:col-span-2" type="submit">
                Simpan profil koperasi
              </button>
            </form>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="cabang">
              <div className="flex items-center gap-3">
                <Building2 className="size-6 text-[#2563eb]" />
                <h2 className="text-2xl font-black">Cabang</h2>
              </div>
              <form action={createBranch} className="mt-5 grid gap-3">
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="code" placeholder="Kode cabang" required />
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="name" placeholder="Nama cabang" required />
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="address" placeholder="Alamat cabang" />
                <button className="h-11 rounded-2xl bg-[#0b1220] text-sm font-black text-white" type="submit">Tambah cabang</button>
              </form>
              <div className="mt-5 space-y-2">
                {branchRows.map((branch) => (
                  <div className="rounded-2xl bg-[#f4f7fb] p-4" key={branch.id}>
                    <p className="font-black">{branch.code} · {branch.name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748b]">{branch.address ?? "Alamat belum diisi"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="tahun-buku">
              <div className="flex items-center gap-3">
                <CalendarDays className="size-6 text-[#2563eb]" />
                <h2 className="text-2xl font-black">Tahun buku</h2>
              </div>
              <form action={createFiscalPeriod} className="mt-5 grid gap-3 sm:grid-cols-3">
                <select className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={defaultBranchId} name="branch_id">
                  {branchRows.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={new Date().getFullYear()} name="year" type="number" />
                <select className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={1} name="month">
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                <button className="h-11 rounded-2xl bg-[#0b1220] text-sm font-black text-white sm:col-span-3" type="submit">Buka periode</button>
              </form>
              <div className="mt-5 space-y-2">
                {fiscalRows.map((period) => (
                  <div className="flex items-center justify-between rounded-2xl bg-[#f4f7fb] p-4" key={period.id}>
                    <span className="font-black">{period.branches?.[0]?.name ?? "Cabang"} · {monthOptions[period.month - 1]} {period.year}</span>
                    <span className="text-sm font-black text-[#2563eb]">{period.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2" id="produk">
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="simpanan">
            <div className="flex items-center gap-3">
              <PiggyBank className="size-6 text-[#2563eb]" />
              <h2 className="text-2xl font-black">Produk simpanan</h2>
            </div>
            <form action={createSavingsProduct} className="mt-5 grid gap-3 md:grid-cols-2">
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="code" placeholder="Kode produk" required />
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="name" placeholder="Nama produk" required />
              <select className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="type">
                <option value="pokok">Pokok</option>
                <option value="wajib">Wajib</option>
                <option value="sukarela">Sukarela</option>
              </select>
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="minimum_balance" placeholder="Saldo minimal" type="number" />
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="monthly_required_amount" placeholder="Setoran wajib bulanan" type="number" />
              <label className="flex h-12 items-center justify-between rounded-2xl bg-[#f8fbff] px-4 text-sm font-black">
                Bisa ditarik
                <input className="size-5 accent-[#2563eb]" name="withdrawable" type="checkbox" />
              </label>
              <button className="h-11 rounded-2xl bg-[#2563eb] text-sm font-black text-white md:col-span-2" type="submit">Tambah produk simpanan</button>
            </form>
            <div className="mt-5 space-y-2">
              {savingsRows.map((product) => (
                <div className="rounded-2xl bg-[#f4f7fb] p-4" key={product.id}>
                  <p className="font-black">{product.code} · {product.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">
                    {product.type} · minimal {currency.format(Number(product.minimum_balance))} · wajib {currency.format(Number(product.monthly_required_amount))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6" id="pinjaman">
            <div className="flex items-center gap-3">
              <CreditCard className="size-6 text-[#2563eb]" />
              <h2 className="text-2xl font-black">Produk pinjaman</h2>
            </div>
            <form action={createLoanProduct} className="mt-5 grid gap-3 md:grid-cols-2">
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none md:col-span-2" name="name" placeholder="Nama produk pinjaman" required />
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="annual_rate" placeholder="Bunga tahunan %" type="number" step="0.0001" />
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="max_tenor_months" placeholder="Tenor maksimal bulan" type="number" />
              <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="admin_fee_percent" placeholder="Biaya admin %" type="number" step="0.0001" />
              <select className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="default_interest_method">
                <option value="flat">Flat</option>
                <option value="annuity">Anuitas</option>
              </select>
              <label className="flex h-12 items-center justify-between rounded-2xl bg-[#f8fbff] px-4 text-sm font-black md:col-span-2">
                Metode boleh diubah saat pengajuan
                <input className="size-5 accent-[#2563eb]" name="allow_method_override" type="checkbox" />
              </label>
              <button className="h-11 rounded-2xl bg-[#2563eb] text-sm font-black text-white md:col-span-2" type="submit">Tambah produk pinjaman</button>
            </form>
            <div className="mt-5 space-y-2">
              {loanRows.map((product) => (
                <div className="rounded-2xl bg-[#f4f7fb] p-4" key={product.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{product.name}</p>
                    <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#2563eb]">
                      {product.default_interest_method === "annuity" ? "Anuitas" : "Flat"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">
                    {Number(product.annual_rate)}%/tahun · tenor {product.max_tenor_months} bulan · admin {Number(product.admin_fee_percent)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="size-6 text-[#2563eb]" />
            <div>
              <h2 className="text-2xl font-black">Metode bunga pinjaman</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
                Sistem mendukung flat dan anuitas. Produk pinjaman menentukan default,
                lalu pengajuan menyimpan metode final agar pinjaman lama tidak berubah saat produk diperbarui.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5">
              <Banknote className="size-6 text-[#2563eb]" />
              <h3 className="mt-4 font-black">Flat</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">Cicilan pokok dan jasa dihitung rata dari awal pinjaman.</p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <Banknote className="size-6 text-[#2563eb]" />
              <h3 className="mt-4 font-black">Anuitas</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">Total angsuran per bulan relatif tetap, komposisi pokok dan jasa berubah.</p>
            </div>
          </div>
        </section>
      </div>
    </section>
    </div>
    </main>
  );
}
