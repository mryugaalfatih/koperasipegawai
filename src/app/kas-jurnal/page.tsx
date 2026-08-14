import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Calculator,
  Calendar,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { postCashTransaction, postManualJournal } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { CurrencyInput } from "@/components/CurrencyInput";
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
  } | {
    code: string;
    name: string;
  }[] | null;
};

type JournalRow = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string | null;
  source_type: string | null;
  journal_lines: JournalLineRow[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const categoryLabels: Record<string, string> = {
  asset: "Aset",
  liability: "Kewajiban",
  equity: "Modal",
  income: "Pendapatan",
  expense: "Beban",
};

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
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, journal_lines(debit, credit, accounts(code, name))")
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
  const journalTotals = journalRows.reduce(
    (summary, journal) => {
      for (const line of journal.journal_lines ?? []) {
        summary.debit += Number(line.debit ?? 0);
        summary.credit += Number(line.credit ?? 0);
      }
      return summary;
    },
    { debit: 0, credit: 0 },
  );

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
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />
        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur md:px-2">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/home">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Kas & jurnal</p>
              <h1 className="text-xl font-black md:text-2xl">Pembukuan operasional koperasi</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-2 text-sm font-black text-white md:inline-flex" href="/konfigurasi">
            COA & periode
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-2 py-5 md:px-2 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Kontrol pembukuan</p>
                <h2 className="mt-1.5 text-xl font-bold md:text-2xl">Kas masuk, kas keluar, dan jurnal umum</h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[#cbd5e1]">
                  Setiap transaksi kas manual langsung dibuatkan jurnal dua sisi agar laporan laba rugi dan SHU punya dasar akuntansi.
                </p>
              </div>
              <BookOpenCheck className="size-8 text-[#93c5fd]" />
            </div>
          </section>

          {/* Filter Bar: Periode & Unit Usaha */}
          <div className="space-y-2.5 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1]">
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
              <span className="text-xs font-bold text-[#64748b] mr-1">Unit Usaha:</span>
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
                const isActive = selectedUnit.toLowerCase() === u.name.toLowerCase() || selectedUnit.toLowerCase() === u.code.toLowerCase();
                return (
                  <Link
                    key={u.id}
                    href={buildUrl({ unit: u.name })}
                    className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all inline-flex items-center ${
                      isActive
                        ? "bg-[#0b1220] text-white shadow-sm"
                        : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                    }`}
                  >
                    {u.code} · {u.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Saldo kas ringkas", value: currency.format(cashBalance), icon: Landmark },
              { label: "Kas masuk", value: currency.format(cashIn), icon: ArrowDownLeft },
              { label: "Kas keluar", value: currency.format(cashOut), icon: ArrowUpRight },
              { label: "Jurnal terbaru", value: String(journalRows.length), icon: ReceiptText },
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
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Jurnal umum</p>
              <h2 className="text-lg font-bold text-[#0b1220]">Posting terbaru</h2>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {journalRows.length ? (
                journalRows.map((journal) => {
                  const debit = (journal.journal_lines ?? []).reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
                  const credit = (journal.journal_lines ?? []).reduce((sum, line) => sum + Number(line.credit ?? 0), 0);

                  return (
                    <div className="border-b border-[#dbe5f1] p-4 last:border-b-0" key={journal.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{journal.entry_no}</p>
                          <p className="mt-1 text-sm font-semibold text-[#64748b]">{journal.memo ?? journal.source_type ?? "Jurnal"}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm font-black text-[#2563eb]">{journal.entry_date}</p>
                          <p className="mt-1 text-xs font-bold text-[#64748b]">
                            Debit {currency.format(debit)} | Kredit {currency.format(credit)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {(journal.journal_lines ?? []).map((line, index) => {
                          const act = Array.isArray(line.accounts)
                            ? line.accounts[0]
                            : (line.accounts as unknown as { code: string; name: string } | null);

                          return (
                            <div className="rounded-2xl bg-[#f4f7fb] p-3 text-sm font-semibold text-[#475569]" key={`${journal.id}-${index}`}>
                              <p className="font-black text-[#0b1220]">
                                {act?.code ?? "-"} {act?.name ?? "Akun"}
                              </p>
                              <p className="mt-1">
                                Debit {currency.format(Number(line.debit ?? 0))} | Kredit {currency.format(Number(line.credit ?? 0))}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <FileText className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada jurnal</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Posting kas atau jurnal umum pertama dari form di samping.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div>
              <p className="text-sm font-bold text-[#64748b]">Kas operasional</p>
              <h2 className="text-2xl font-black">Mutasi kas terbaru</h2>
            </div>
            <div className="mt-5 space-y-3">
              {cashRows.length ? (
                cashRows.map((transaction) => (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4f7fb] p-4" key={transaction.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${transaction.direction === "in" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#fff1f2] text-[#be123c]"}`}>
                        {transaction.direction === "in" ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[#0b1220] leading-snug break-words">{transaction.description ?? transaction.source_type}</p>
                        <p className="mt-0.5 text-xs font-semibold text-[#64748b]">{transaction.transaction_date}</p>
                      </div>
                    </div>
                    <p className="font-black">{currency.format(Number(transaction.amount ?? 0))}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada mutasi kas.</p>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {params.error ? (
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
          ) : null}
          {params.saved ? (
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Data berhasil diposting.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Banknote className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Kas</p>
                <h2 className="text-xl font-black">Posting kas manual</h2>
              </div>
            </div>
            <form action={postCashTransaction} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Jenis kas</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="direction">
                  <option value="in">Kas masuk</option>
                  <option value="out">Kas keluar</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Akun lawan</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="counter_account_id" required>
                  <option value="">Pilih akun</option>
                  {accountRows.filter((account) => account.code !== "1001").map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} | {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Nominal</span>
                <CurrencyInput name="amount" placeholder="0" required />
              </label>
              <label className="block">
                <span className="text-sm font-black">Tanggal</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="transaction_date" type="date" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Keterangan</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2 text-sm font-bold outline-none" name="description" placeholder="Contoh: pembayaran listrik kantor" />
              </label>
              <SubmitButton className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white hover:bg-[#1d4ed8]">
                Posting kas
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Jurnal umum</p>
                <h2 className="text-xl font-black">Input jurnal dua sisi</h2>
              </div>
            </div>
            <form action={postManualJournal} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Akun debit</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="debit_account_id" required>
                  <option value="">Pilih akun debit</option>
                  {accountRows.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} | {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Akun kredit</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="credit_account_id" required>
                  <option value="">Pilih akun kredit</option>
                  {accountRows.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} | {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Nominal</span>
                <CurrencyInput name="amount" placeholder="0" required />
              </label>
              <label className="block">
                <span className="text-sm font-black">Tanggal jurnal</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" name="entry_date" type="date" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Memo</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2 text-sm font-bold outline-none" name="memo" placeholder="Keterangan jurnal" />
              </label>
              <SubmitButton className="h-12 w-full rounded-2xl bg-[#0b1220] text-sm font-black text-white hover:bg-slate-800">
                Posting jurnal
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
            <h2 className="text-lg font-black text-[#0b1220]">Chart of Accounts (CoA)</h2>
            <div className="mt-4 space-y-2">
              {accountRows.map((account) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f7fb] p-3" key={account.id}>
                  <div>
                    <p className="text-sm font-black">{account.code} {account.name}</p>
                    <p className="text-xs font-bold text-[#64748b]">{categoryLabels[account.category] ?? account.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
    </div>
    <ToastNotification error={params.error} saved={params.saved} />
    </main>
  );
}
