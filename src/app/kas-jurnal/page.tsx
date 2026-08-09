import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Calculator,
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

type KasJurnalPageProps = {
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

type JournalLineRow = {
  debit: number;
  credit: number;
  accounts: {
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
  journal_lines: JournalLineRow[] | null;
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

  const [{ data: accounts }, { data: cashTransactions }, { data: journalEntries }] = await Promise.all([
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, journal_lines(debit, credit, accounts(code, name))")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const accountRows = (accounts ?? []) as AccountRow[];
  const cashRows = (cashTransactions ?? []) as CashTransactionRow[];
  const journalRows = (journalEntries ?? []) as unknown as JournalRow[];
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

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
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
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/konfigurasi">
            COA & periode
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">Kontrol pembukuan</p>
                <h2 className="mt-2 text-3xl font-black">Kas masuk, kas keluar, dan jurnal umum</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                  Setiap transaksi kas manual langsung dibuatkan jurnal dua sisi agar laporan laba rugi dan SHU punya dasar akuntansi.
                </p>
              </div>
              <BookOpenCheck className="size-9 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Saldo kas ringkas", value: currency.format(cashBalance), icon: Landmark },
              { label: "Kas masuk", value: currency.format(cashIn), icon: ArrowDownLeft },
              { label: "Kas keluar", value: currency.format(cashOut), icon: ArrowUpRight },
              { label: "Jurnal terbaru", value: String(journalRows.length), icon: ReceiptText },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-6 text-[#2563eb]" />
                <p className="mt-4 text-sm font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-xl font-black">{item.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div>
              <p className="text-sm font-bold text-[#64748b]">Jurnal umum</p>
              <h2 className="text-2xl font-black">Posting terbaru</h2>
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
                        {(journal.journal_lines ?? []).map((line, index) => (
                          <div className="rounded-2xl bg-[#f4f7fb] p-3 text-sm font-semibold text-[#475569]" key={`${journal.id}-${index}`}>
                            <p className="font-black text-[#0b1220]">
                              {line.accounts?.[0]?.code ?? "-"} {line.accounts?.[0]?.name ?? "Akun"}
                            </p>
                            <p className="mt-1">
                              Debit {currency.format(Number(line.debit ?? 0))} | Kredit {currency.format(Number(line.credit ?? 0))}
                            </p>
                          </div>
                        ))}
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
                      <div className="min-w-0">
                        <p className="truncate font-black">{transaction.description ?? transaction.source_type}</p>
                        <p className="text-sm font-semibold text-[#64748b]">{transaction.transaction_date}</p>
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
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="direction">
                  <option value="in">Kas masuk</option>
                  <option value="out">Kas keluar</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Akun lawan</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="counter_account_id" required>
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
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="amount" placeholder="0" required type="number" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Tanggal</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="transaction_date" type="date" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Keterangan</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" name="description" placeholder="Contoh: pembayaran listrik kantor" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
                Posting kas
              </button>
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
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="debit_account_id" required>
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
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="credit_account_id" required>
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
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="amount" placeholder="0" required type="number" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Tanggal jurnal</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="entry_date" type="date" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Memo</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" name="memo" placeholder="Keterangan jurnal" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#0b1220] text-sm font-black text-white" type="submit">
                Posting jurnal
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
            <Scale className="size-6 text-[#2563eb]" />
            <h2 className="mt-4 text-xl font-black">Kontrol balance</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
              Jurnal terbaru terbaca debit {currency.format(journalTotals.debit)} dan kredit {currency.format(journalTotals.credit)}.
            </p>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <Calculator className="size-5 text-[#2563eb]" />
              <h2 className="text-xl font-black">Chart of accounts</h2>
            </div>
            <div className="mt-4 space-y-2">
              {accountRows.slice(0, 8).map((account) => (
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
    </main>
  );
}
