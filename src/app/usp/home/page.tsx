import { redirect } from "next/navigation";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";
import {
  PiggyBank, CreditCard, Users, TrendingUp,
  AlertCircle, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function UspHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: members },
    { data: simpanan },
    { data: pinjaman },
    { data: angsuranToday },
  ] = await Promise.all([
    supabase.from("members").select("id, is_active, created_at"),
    supabase.from("savings_accounts").select("balance, status"),
    supabase.from("loan_applications").select("id, loan_amount, remaining_balance, status, next_due_date"),
    supabase.from("loan_payments").select("id, amount").gte("payment_date", today),
  ]);

  const activeMembers = (members ?? []).filter(m => m.is_active).length;
  const newMembersMonth = (members ?? []).filter(m => m.created_at >= startOfMonth).length;
  const totalSimpanan = (simpanan ?? []).filter(s => s.status === "active").reduce((s, a) => s + (a.balance ?? 0), 0);
  const activeSimpananCount = (simpanan ?? []).filter(s => s.status === "active").length;

  const activePinjaman = (pinjaman ?? []).filter(p => p.status === "active");
  const totalPinjamanOutstanding = activePinjaman.reduce((s, p) => s + (p.remaining_balance ?? 0), 0);
  const activePinjamanCount = activePinjaman.length;

  const angsuranJatuhTempo = (pinjaman ?? []).filter(p => {
    if (!p.next_due_date || p.status !== "active") return false;
    return p.next_due_date <= today;
  }).length;

  const angsuranBayarHariIni = (angsuranToday ?? []).reduce((s, a) => s + (a.amount ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />

        <section className="min-w-0 pb-24 lg:pb-4">
          <ToastNotification />

          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-3 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">Unit Simpan Pinjam</p>
                <h1 className="text-lg font-black text-[#0b1220]">Dashboard USP</h1>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-[#dbe5f1]">
                <Users className="size-4 text-[#2563eb]" />
                <span className="text-xs font-bold text-[#0b1220]">{activeMembers} Anggota Aktif</span>
              </div>
            </div>
          </header>

          <div className="px-3 py-3 space-y-4">
            {/* Hero Banner */}
            <div className="rounded-2xl bg-[#07152f] p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#bfdbfe]">
                    <PiggyBank className="size-3.5" /> Unit Simpan Pinjam
                  </div>
                  <h2 className="mt-2 text-xl font-black">Dashboard Simpan Pinjam</h2>
                  <p className="mt-1 text-xs font-medium text-[#cbd5e1]">
                    Kelola simpanan anggota, pinjaman, dan angsuran secara terpusat.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#94a3b8]">Total Dana Simpanan</p>
                  <p className="text-2xl font-black text-white">{formatRupiah(totalSimpanan)}</p>
                </div>
              </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Total Simpanan Aktif</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#eff6ff]">
                    <PiggyBank className="size-4 text-[#2563eb]" />
                  </div>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{formatRupiah(totalSimpanan)}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">{activeSimpananCount} rekening aktif</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Pinjaman Outstanding</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#fff7ed]">
                    <CreditCard className="size-4 text-[#f97316]" />
                  </div>
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">{formatRupiah(totalPinjamanOutstanding)}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">{activePinjamanCount} pinjaman aktif</p>
              </div>

              <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${angsuranJatuhTempo > 0 ? "ring-[#fca5a5]" : "ring-[#dbe5f1]"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Angsuran Jatuh Tempo</p>
                  <div className={`grid size-8 place-items-center rounded-xl ${angsuranJatuhTempo > 0 ? "bg-[#fef2f2]" : "bg-[#f0fdf4]"}`}>
                    <Clock className={`size-4 ${angsuranJatuhTempo > 0 ? "text-[#dc2626]" : "text-[#16a34a]"}`} />
                  </div>
                </div>
                <p className={`mt-2 text-2xl font-black ${angsuranJatuhTempo > 0 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>{angsuranJatuhTempo}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">pinjaman jatuh tempo</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Anggota Baru Bulan Ini</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#f0fdf4]">
                    <Users className="size-4 text-[#16a34a]" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-black text-[#16a34a]">{newMembersMonth}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">anggota baru bulan ini</p>
              </div>
            </div>

            {/* Angsuran Hari Ini Alert */}
            {angsuranJatuhTempo > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3">
                <AlertCircle className="size-5 shrink-0 text-[#dc2626]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#dc2626]">{angsuranJatuhTempo} Pinjaman Jatuh Tempo!</p>
                  <p className="text-xs font-semibold text-[#b91c1c]">Segera lakukan konfirmasi atau penagihan kepada anggota terkait.</p>
                </div>
                <a href="/pinjaman" className="shrink-0 text-xs font-bold text-[#dc2626] hover:underline">Lihat →</a>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Rekening Simpanan", href: "/simpanan/rekening", icon: PiggyBank, color: "text-[#2563eb]", bg: "bg-[#eff6ff]" },
                { label: "Setor / Tarik", href: "/simpanan/transaksi", icon: TrendingUp, color: "text-[#16a34a]", bg: "bg-[#f0fdf4]" },
                { label: "Daftar Pinjaman", href: "/pinjaman", icon: CreditCard, color: "text-[#f97316]", bg: "bg-[#fff7ed]" },
                { label: "Data Anggota", href: "/anggota", icon: Users, color: "text-[#64748b]", bg: "bg-[#f1f5f9]" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] hover:ring-[#2563eb] transition-all"
                >
                  <div className={`grid size-10 place-items-center rounded-xl ${item.bg}`}>
                    <item.icon className={`size-5 ${item.color}`} />
                  </div>
                  <span className="text-center text-xs font-bold text-[#0b1220]">{item.label}</span>
                </a>
              ))}
            </div>

            {/* Bayar Angsuran Hari Ini */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-[#0b1220]">Angsuran Dibayar Hari Ini</h2>
                <a href="/pinjaman" className="text-xs font-bold text-[#2563eb] hover:underline">Lihat Pinjaman →</a>
              </div>
              {(angsuranToday ?? []).length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-[#86efac]" />
                  <p className="mt-2 text-sm font-bold text-[#64748b]">Belum ada pembayaran angsuran hari ini</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-[#f0fdf4] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-[#16a34a]" />
                    <p className="text-sm font-black text-[#16a34a]">{angsuranToday?.length} Pembayaran Diterima</p>
                  </div>
                  <p className="text-sm font-black text-[#0b1220]">{formatRupiah(angsuranBayarHariIni)}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
