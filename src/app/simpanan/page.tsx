import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSavingsAccount, postSavingsTransaction } from "./actions";
import { createClient } from "@/lib/supabase/server";

type SimpananPageProps = {
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

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
};

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  savings_products: {
    name: string;
    code: string;
  }[] | null;
};

type SavingsTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  transaction_date: string;
  savings_accounts: {
    account_no: string;
    members: {
      full_name: string;
    }[] | null;
  }[] | null;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const typeLabels = {
  pokok: "Pokok",
  wajib: "Wajib",
  sukarela: "Sukarela",
};

export default async function SimpananPage({ searchParams }: SimpananPageProps) {
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
    { data: members },
    { data: products },
    { data: accounts },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("members").select("id, member_no, full_name").eq("status", "active").order("full_name").limit(100),
    supabase.from("savings_products").select("id, code, name, type").eq("is_active", true).order("code"),
    supabase
      .from("savings_accounts")
      .select("id, account_no, type, balance, members(full_name, member_no), savings_products(name, code)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("savings_transactions")
      .select("id, direction, amount, description, transaction_date, savings_accounts(account_no, members(full_name))")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const memberOptions = (members ?? []) as MemberOption[];
  const productRows = (products ?? []) as SavingsProduct[];
  const accountRows = (accounts ?? []) as unknown as SavingsAccount[];
  const transactionRows = (transactions ?? []) as unknown as SavingsTransaction[];
  const totals = accountRows.reduce(
    (summary, account) => {
      summary.total += Number(account.balance ?? 0);
      summary[account.type] += Number(account.balance ?? 0);
      return summary;
    },
    { total: 0, pokok: 0, wajib: 0, sukarela: 0 },
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Modul simpanan</p>
              <h1 className="text-xl font-black md:text-2xl">Rekening dan transaksi simpanan</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/konfigurasi#simpanan">
            Produk simpanan
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">Simpanan anggota</p>
                <h2 className="mt-2 text-3xl font-black">Kelola setoran, penarikan, dan saldo</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                  Simpanan pokok, wajib, dan sukarela menjadi dasar saldo anggota dan perhitungan SHU.
                </p>
              </div>
              <PiggyBank className="size-9 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Total simpanan", value: totals.total, icon: WalletCards },
              { label: "Simpanan pokok", value: totals.pokok, icon: Landmark },
              { label: "Simpanan wajib", value: totals.wajib, icon: ReceiptText },
              { label: "Simpanan sukarela", value: totals.sukarela, icon: Banknote },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-6 text-[#2563eb]" />
                <p className="mt-4 text-sm font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-xl font-black">{currency.format(item.value)}</p>
              </article>
            ))}
          </div>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#64748b]">Rekening simpanan</p>
                <h2 className="text-2xl font-black">Daftar rekening</h2>
              </div>
              <div className="flex h-11 items-center gap-2 rounded-2xl bg-[#f4f7fb] px-4">
                <Search className="size-4 text-[#64748b]" />
                <span className="text-sm font-semibold text-[#64748b]">Pencarian segera ditambahkan</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {accountRows.length ? (
                accountRows.map((account) => (
                  <div className="grid gap-3 border-b border-[#dbe5f1] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={account.id}>
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                        <BookOpenCheck className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black">{account.members?.[0]?.full_name ?? "Anggota"}</p>
                        <p className="text-sm font-bold text-[#64748b]">{account.account_no}</p>
                        <p className="mt-1 text-sm font-semibold text-[#64748b]">
                          {account.savings_products?.[0]?.name ?? typeLabels[account.type]}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-black text-[#2563eb]">{currency.format(Number(account.balance ?? 0))}</p>
                      <p className="mt-1 text-xs font-black text-[#64748b]">{typeLabels[account.type]}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <WalletCards className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada rekening simpanan</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Buat rekening dari form di samping.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div>
              <p className="text-sm font-bold text-[#64748b]">Mutasi terbaru</p>
              <h2 className="text-2xl font-black">Riwayat transaksi</h2>
            </div>
            <div className="mt-5 space-y-3">
              {transactionRows.length ? (
                transactionRows.map((transaction) => (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4f7fb] p-4" key={transaction.id}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${transaction.direction === "in" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#fff1f2] text-[#be123c]"}`}>
                        {transaction.direction === "in" ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black">{transaction.savings_accounts?.[0]?.members?.[0]?.full_name ?? "Anggota"}</p>
                        <p className="text-sm font-semibold text-[#64748b]">{transaction.description ?? transaction.savings_accounts?.[0]?.account_no}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{currency.format(Number(transaction.amount ?? 0))}</p>
                      <p className="text-xs font-bold text-[#64748b]">{transaction.transaction_date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada mutasi simpanan.</p>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {params.error ? (
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
          ) : null}
          {params.saved ? (
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Data simpanan berhasil disimpan.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Rekening</p>
                <h2 className="text-xl font-black">Buat rekening</h2>
              </div>
            </div>
            <form action={createSavingsAccount} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Anggota</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="member_id" required>
                  <option value="">Pilih anggota</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>{member.member_no} · {member.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Produk simpanan</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="product_id" required>
                  <option value="">Pilih produk</option>
                  {productRows.map((product) => (
                    <option key={product.id} value={product.id}>{product.code} · {product.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Nomor rekening</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="account_no" placeholder="Kosongkan untuk otomatis" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Saldo awal</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="opening_balance" placeholder="0" type="number" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
                Simpan rekening
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Transaksi</p>
                <h2 className="text-xl font-black">Setoran / penarikan</h2>
              </div>
            </div>
            <form action={postSavingsTransaction} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Rekening</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="account_id" required>
                  <option value="">Pilih rekening</option>
                  {accountRows.map((account) => (
                    <option key={account.id} value={account.id}>{account.account_no} · {account.members?.[0]?.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Jenis transaksi</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="direction">
                  <option value="in">Setoran</option>
                  <option value="out">Penarikan</option>
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
                <span className="text-sm font-black">Nomor referensi</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="reference_no" placeholder="Opsional" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Keterangan</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" name="description" placeholder="Keterangan transaksi" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#0b1220] text-sm font-black text-white" type="submit">
                Posting transaksi
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
