import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  Plus,
  ReceiptText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { postCashTransaction } from "./actions";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CustomSelect } from "@/components/CustomSelect";
import { PrintKuitansiModal } from "@/components/PrintKuitansiModal";
import { SubmitButton } from "@/components/SubmitButton";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";


type KasPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
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

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function KasPage({ searchParams }: KasPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accounts }, { data: cashTransactions }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const cashRows = (cashTransactions ?? []) as CashTransactionRow[];

  const totalIn = cashRows
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const totalOut = cashRows
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const netCash = totalIn - totalOut;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/90 px-4 py-4 backdrop-blur md:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Modul Operasional Kas</p>
                <h1 className="text-xl font-bold text-[#0b1220]">Keuangan Kas Harian</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-[#0b1220] shadow-sm ring-1 ring-[#dbe5f1] hover:bg-slate-50 transition-all"
                  href="/akuntansi"
                >
                  <span>Lihat Jurnal Akuntansi</span>
                  <Scale className="size-4 text-[#2563eb]" />
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-4 md:px-7 md:py-6">
            {/* KPI Cards */}
            <section className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#dcfce7] text-[#15803d]">
                    <ArrowDownLeft className="size-5" />
                  </div>
                  <span className="text-xs font-bold text-[#16a34a]">Penerimaan</span>
                </div>
                <p className="mt-4 text-xs font-bold text-[#64748b]">Total Kas Masuk</p>
                <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalIn)}</p>
              </article>

              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#fee2e2] text-[#b91c1c]">
                    <ArrowUpRight className="size-5" />
                  </div>
                  <span className="text-xs font-bold text-[#dc2626]">Pengeluaran</span>
                </div>
                <p className="mt-4 text-xs font-bold text-[#64748b]">Total Kas Keluar</p>
                <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(totalOut)}</p>
              </article>

              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                    <Landmark className="size-5" />
                  </div>
                  <span className="text-xs font-bold text-[#2563eb]">Net Flow</span>
                </div>
                <p className="mt-4 text-xs font-bold text-[#64748b]">Kas Bersih Harian</p>
                <p className="mt-1 text-xl font-bold text-[#0b1220]">{currency.format(netCash)}</p>
              </article>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              {/* Cash Transactions List */}
              <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Riwayat Transaksi</p>
                    <h2 className="text-base font-bold text-[#0b1220]">Buku Kas Masuk & Keluar</h2>
                  </div>
                  <ReceiptText className="size-5 text-[#2563eb]" />
                </div>

                <div className="mt-4 divide-y divide-[#dbe5f1]">
                  {cashRows.length ? (
                    cashRows.map((item) => (
                      <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0" key={item.id}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`grid size-9 shrink-0 place-items-center rounded-2xl ${
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
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#0b1220]">
                              {item.description ?? "Transaksi kas"}
                            </p>
                            <p className="text-xs font-semibold text-[#64748b]">
                              {item.transaction_date} · {item.source_type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
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
                          <PrintKuitansiModal
                            data={{
                              noKuitansi: `KAS-${item.id.slice(0, 8).toUpperCase()}`,
                              tanggal: item.transaction_date,
                              diterimaDari: item.description ?? "Transaksi Kas Operasional",
                              tipeTransaksi: item.direction === "in" ? "Kas Masuk (Penerimaan)" : "Kas Keluar (Pengeluaran)",
                              nominal: Number(item.amount ?? 0),
                              keterangan: item.description ?? "Transaksi Kas Operasional",
                              petugas: "Kasir / Teller",
                            }}
                            onClose={() => {}}
                          />

                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                      Belum ada transaksi kas harian.
                    </div>
                  )}
                </div>
              </section>

              {/* Input Cash Form Sidebar */}
              <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                    <Plus className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Kasir</p>
                    <h2 className="text-base font-bold text-[#0b1220]">Input Kas Masuk / Keluar</h2>
                  </div>
                </div>

                <form action={postCashTransaction} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Jenis Transaksi</span>
                    <CustomSelect
                      defaultValue="out"
                      name="direction"
                      className="mt-1.5 h-11"
                    >
                      <option value="in">Kas Masuk (Penerimaan)</option>
                      <option value="out">Kas Keluar (Pengeluaran / Biaya)</option>
                    </CustomSelect>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Kategori / Akun Lawan</span>
                    <CustomSelect
                      name="counter_account_id"
                      required
                      className="mt-1.5 h-11"
                    >
                      <option value="">-- Pilih Akun Kategori --</option>
                      {accountRows
                        .filter((acc) => acc.code !== "1001")
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} · {acc.name} ({acc.category})
                          </option>
                        ))}
                    </CustomSelect>
                  </label>


                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Nominal Kas (Rp)</span>
                    <CurrencyInput
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      name="amount"
                      placeholder="0"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      name="transaction_date"
                      type="date"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Keterangan</span>
                    <textarea
                      className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                      name="description"
                      placeholder="Contoh: Pembayaran rekening listrik & air kantor..."
                    />
                  </label>

                  <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                    Posting Transaksi Kas
                  </SubmitButton>
                </form>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
