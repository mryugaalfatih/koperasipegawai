import {
  Banknote,
  BookOpenCheck,
  Calculator,
  FileText,
  Landmark,
  Plus,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { postManualJournal } from "./actions";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CustomSelect } from "@/components/CustomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";


type AkuntansiPageProps = {
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
  journal_lines: JournalLineRow[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function AkuntansiPage({ searchParams }: AkuntansiPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accounts }, { data: journalEntries }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, journal_lines(debit, credit, accounts(code, name))")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const journalRows = (journalEntries ?? []) as unknown as JournalRow[];

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
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Modul Pembukuan</p>
                <h1 className="text-xl font-bold text-[#0b1220]">Akuntansi & Jurnal Umum</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-[#0b1220] shadow-sm ring-1 ring-[#dbe5f1] hover:bg-slate-50 transition-all"
                  href="/kas"
                >
                  <span>Lihat Kas Harian</span>
                  <Banknote className="size-4 text-[#2563eb]" />
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-4 md:px-7 md:py-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              {/* Journal Entries & CoA Table */}
              <div className="space-y-6">
                {/* Journal Entries Table */}
                <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Buku Jurnal</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Riwayat Jurnal Umum (Double-Entry)</h2>
                    </div>
                    <BookOpenCheck className="size-5 text-[#2563eb]" />
                  </div>

                  <div className="mt-4 divide-y divide-[#dbe5f1]">
                    {journalRows.length ? (
                      journalRows.map((entry) => (
                        <div className="py-3.5 first:pt-0 last:pb-0" key={entry.id}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-[#0b1220]">{entry.entry_no}</p>
                              <p className="text-xs font-semibold text-[#64748b]">
                                {entry.entry_date} · {entry.memo ?? "Jurnal Umum"}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748b]">
                              {entry.source_type ?? "manual"}
                            </span>
                          </div>

                          {/* Lines */}
                          <div className="mt-2.5 rounded-2xl bg-[#f8fbff] p-3 text-xs font-semibold space-y-1.5 border border-[#e2e8f0]">
                            {entry.journal_lines?.map((line, index) => (
                              <div className="flex items-center justify-between gap-2" key={index}>
                                <span className={Number(line.credit ?? 0) > 0 ? "pl-4 text-[#64748b]" : "font-bold text-[#0b1220]"}>
                                  {line.accounts?.[0]?.code ?? "-"} · {line.accounts?.[0]?.name ?? "Akun"}
                                </span>
                                <span>
                                  {Number(line.debit ?? 0) > 0
                                    ? `(Dr) ${currency.format(Number(line.debit))}`
                                    : `(Cr) ${currency.format(Number(line.credit))}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs font-bold text-[#64748b]">
                        Belum ada riwayat jurnal umum.
                      </div>
                    )}
                  </div>
                </section>

                {/* Chart of Accounts (CoA) Overview */}
                <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Master Akun</p>
                      <h2 className="text-base font-bold text-[#0b1220]">Bagan Akun (Chart of Accounts / CoA)</h2>
                    </div>
                    <Calculator className="size-5 text-[#2563eb]" />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {accountRows.map((acc) => (
                      <div className="rounded-2xl bg-[#f4f7fb] p-3.5" key={acc.id}>
                        <p className="text-xs font-bold text-[#2563eb]">{acc.code}</p>
                        <p className="text-sm font-bold text-[#0b1220]">{acc.name}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#64748b] capitalize">{acc.category}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Manual Journal Form Sidebar */}
              <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                    <Plus className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Akuntansi</p>
                    <h2 className="text-base font-bold text-[#0b1220]">Input Jurnal Umum</h2>
                  </div>
                </div>

                <form action={postManualJournal} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Akun Debit (Dr)</span>
                    <CustomSelect
                      name="debit_account_id"
                      required
                      className="mt-1.5 h-11"
                    >
                      <option value="">-- Pilih Akun Debit --</option>
                      {accountRows.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} · {acc.name}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Akun Kredit (Cr)</span>
                    <CustomSelect
                      name="credit_account_id"
                      required
                      className="mt-1.5 h-11"
                    >
                      <option value="">-- Pilih Akun Kredit --</option>
                      {accountRows.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} · {acc.name}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>


                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Nominal Jurnal (Rp)</span>
                    <CurrencyInput
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      name="amount"
                      placeholder="0"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Jurnal</span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      name="entry_date"
                      type="date"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase text-[#475569]">Keterangan Jurnal</span>
                    <textarea
                      className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                      name="memo"
                      placeholder="Contoh: Penyesuaian akhir bulan / depresiasi aset..."
                    />
                  </label>

                  <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                    Posting Jurnal Umum
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
