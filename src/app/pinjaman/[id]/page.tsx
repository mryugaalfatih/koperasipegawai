import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  ReceiptText,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { postInstallmentPayment } from "./actions";
import { createClient } from "@/lib/supabase/server";

type PinjamanDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    paid?: string;
  }>;
};

type LoanDetail = {
  id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  admin_fee_percent_snapshot: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
  members: {
    full_name: string;
    member_no: string;
    phone: string | null;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

type InstallmentRow = {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  penalty_due: number;
  paid_amount: number;
  paid_at: string | null;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  total_paid: number;
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

export default async function PinjamanDetailPage({ params, searchParams }: PinjamanDetailPageProps) {
  const supabase = await createClient();
  const { id } = await params;
  const query = await searchParams;
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

  const [{ data: loan }, { data: installments }, { data: payments }] = await Promise.all([
    supabase
      .from("loans")
      .select("id, principal, tenor_months, status, interest_method, annual_rate_snapshot, admin_fee_percent_snapshot, submitted_at, approved_at, disbursed_at, members(full_name, member_no, phone), loan_products(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("loan_installments")
      .select("id, installment_no, due_date, principal_due, interest_due, penalty_due, paid_amount, paid_at")
      .eq("loan_id", id)
      .order("installment_no"),
    supabase
      .from("loan_payments")
      .select("id, payment_date, principal_paid, interest_paid, penalty_paid, total_paid")
      .eq("loan_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!loan) {
    notFound();
  }

  const loanDetail = loan as unknown as LoanDetail;
  const installmentRows = (installments ?? []) as InstallmentRow[];
  const paymentRows = (payments ?? []) as PaymentRow[];
  const totalDue = installmentRows.reduce(
    (sum, installment) => sum + Number(installment.principal_due ?? 0) + Number(installment.interest_due ?? 0) + Number(installment.penalty_due ?? 0),
    0,
  );
  const totalPaid = installmentRows.reduce((sum, installment) => sum + Number(installment.paid_amount ?? 0), 0);
  const outstanding = Math.max(totalDue - totalPaid, 0);
  const unpaidInstallments = installmentRows.filter((installment) => {
    const due = Number(installment.principal_due ?? 0) + Number(installment.interest_due ?? 0) + Number(installment.penalty_due ?? 0);
    return Number(installment.paid_amount ?? 0) < due;
  });
  const postPayment = postInstallmentPayment.bind(null, id);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/pinjaman">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Detail pinjaman</p>
              <h1 className="truncate text-xl font-black md:text-2xl">
                {loanDetail.members?.[0]?.full_name ?? "Anggota"}
              </h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/pinjaman">
            Daftar pinjaman
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">{loanDetail.loan_products?.[0]?.name ?? "Produk pinjaman"}</p>
                <h2 className="mt-2 text-3xl font-black">{currency.format(Number(loanDetail.principal ?? 0))}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#cbd5e1]">
                  {methodLabels[loanDetail.interest_method]} | {Number(loanDetail.annual_rate_snapshot ?? 0)}%/tahun | {loanDetail.tenor_months} bulan
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs font-bold text-[#bfdbfe]">Status</p>
                <p className="mt-1 font-black">{statusLabels[loanDetail.status]}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Plafon", value: currency.format(Number(loanDetail.principal ?? 0)), icon: CreditCard },
              { label: "Total tagihan", value: currency.format(totalDue), icon: FileText },
              { label: "Terbayar", value: currency.format(totalPaid), icon: CheckCircle2 },
              { label: "Sisa", value: currency.format(outstanding), icon: Banknote },
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
              <p className="text-sm font-bold text-[#64748b]">Jadwal angsuran</p>
              <h2 className="text-2xl font-black">Angsuran pinjaman</h2>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {installmentRows.length ? (
                installmentRows.map((installment) => {
                  const totalInstallment =
                    Number(installment.principal_due ?? 0) +
                    Number(installment.interest_due ?? 0) +
                    Number(installment.penalty_due ?? 0);
                  const isPaid = Number(installment.paid_amount ?? 0) >= totalInstallment;

                  return (
                    <div className="grid gap-3 border-b border-[#dbe5f1] p-4 last:border-b-0 md:grid-cols-[1fr_auto]" key={installment.id}>
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${isPaid ? "bg-[#eaf2ff] text-[#2563eb]" : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1]"}`}>
                          <CalendarClock className="size-5" />
                        </div>
                        <div>
                          <p className="font-black">Angsuran #{installment.installment_no}</p>
                          <p className="mt-1 text-sm font-semibold text-[#64748b]">Jatuh tempo {installment.due_date}</p>
                          <p className="mt-1 text-xs font-bold text-[#64748b]">
                            Pokok {currency.format(Number(installment.principal_due ?? 0))} | Jasa {currency.format(Number(installment.interest_due ?? 0))}
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-black text-[#2563eb]">{currency.format(totalInstallment)}</p>
                        <p className="mt-1 text-xs font-black text-[#64748b]">{isPaid ? "Lunas" : `Terbayar ${currency.format(Number(installment.paid_amount ?? 0))}`}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <ReceiptText className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Jadwal belum dibuat</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Jadwal angsuran dibuat saat pinjaman dicairkan.</p>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                <UserRound className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Anggota</p>
                <h2 className="text-xl font-black">{loanDetail.members?.[0]?.full_name ?? "Anggota"}</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm font-semibold text-[#64748b]">
              <p>Nomor anggota: {loanDetail.members?.[0]?.member_no ?? "-"}</p>
              <p>HP: {loanDetail.members?.[0]?.phone ?? "-"}</p>
              <p>Admin fee: {Number(loanDetail.admin_fee_percent_snapshot ?? 0)}%</p>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <ReceiptText className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Pembayaran</p>
                <h2 className="text-xl font-black">Posting angsuran</h2>
              </div>
            </div>

            {query.error ? <div className="mt-5 rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{query.error}</div> : null}
            {query.paid ? <div className="mt-5 rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Pembayaran berhasil diposting.</div> : null}

            <form action={postPayment} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Angsuran</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="installment_id" required>
                  <option value="">Pilih angsuran</option>
                  {unpaidInstallments.map((installment) => (
                    <option key={installment.id} value={installment.id}>#{installment.installment_no} | {installment.due_date}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Tanggal bayar</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="payment_date" type="date" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="principal_paid" placeholder="Pokok" type="number" />
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="interest_paid" placeholder="Jasa" type="number" />
                <input className="h-12 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="penalty_paid" placeholder="Denda" type="number" />
              </div>
              <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
                Posting pembayaran
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <h2 className="text-xl font-black">Pembayaran terbaru</h2>
            <div className="mt-4 space-y-3">
              {paymentRows.length ? (
                paymentRows.map((payment) => (
                  <div className="rounded-2xl bg-[#f4f7fb] p-4" key={payment.id}>
                    <p className="font-black">{currency.format(Number(payment.total_paid ?? 0))}</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748b]">{payment.payment_date}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada pembayaran.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
