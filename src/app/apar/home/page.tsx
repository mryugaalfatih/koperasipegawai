import { redirect } from "next/navigation";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";
import {
  Flame, ClipboardList, CheckCircle2, Clock,
  Award, TrendingUp, AlertCircle, FileText,
} from "lucide-react";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default async function AparHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { data: allOrders },
    { data: monthOrders },
    { data: todayOrders },
    { data: products },
  ] = await Promise.all([
    supabase.from("apar_refill_orders").select("id, status, total_cost, client_name"),
    supabase.from("apar_refill_orders").select("total_cost, status").gte("created_at", startOfMonth),
    supabase.from("apar_refill_orders").select("id, status").gte("created_at", startOfToday),
    supabase.from("apar_products").select("id, name, media_type, sell_price, stock_qty").eq("is_active", true),
  ]);

  const pendingCount = (allOrders ?? []).filter(o => o.status === "pending").length;
  const inProgressCount = (allOrders ?? []).filter(o => o.status === "in_progress").length;
  const doneCount = (allOrders ?? []).filter(o => o.status === "done").length;
  const monthRevenue = (monthOrders ?? []).filter(o => o.status === "done").reduce((s, o) => s + (o.total_cost ?? 0), 0);
  const todayCount = (todayOrders ?? []).length;
  const totalProducts = (products ?? []).length;

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
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">Unit Jasa APAR & Damkar</p>
                <h1 className="text-lg font-black text-[#0b1220]">Dashboard APAR</h1>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-[#dbe5f1]">
                <Flame className="size-4 text-[#dc2626]" />
                <span className="text-xs font-bold text-[#0b1220]">{totalProducts} Produk Aktif</span>
              </div>
            </div>
          </header>

          <div className="px-3 py-3 space-y-4">
            {/* Hero Banner */}
            <div className="rounded-2xl bg-[#07152f] p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#fca5a5]">
                    <Flame className="size-3.5" /> Unit APAR Damkar
                  </div>
                  <h2 className="mt-2 text-xl font-black">Selamat Datang di Unit APAR</h2>
                  <p className="mt-1 text-xs font-medium text-[#cbd5e1]">
                    Kelola refill, inspeksi, penjualan APAR & APD, dan penerbitan sertifikat hydrotest.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#94a3b8]">Pendapatan Bulan Ini</p>
                  <p className="text-2xl font-black text-white">{formatRupiah(monthRevenue)}</p>
                </div>
              </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Order Masuk Hari Ini</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#eff6ff]">
                    <ClipboardList className="size-4 text-[#2563eb]" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-black text-[#0b1220]">{todayCount}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">order baru hari ini</p>
              </div>

              <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${pendingCount > 0 ? "ring-[#fca5a5]" : "ring-[#dbe5f1]"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Menunggu Proses</p>
                  <div className={`grid size-8 place-items-center rounded-xl ${pendingCount > 0 ? "bg-[#fef2f2]" : "bg-[#f1f5f9]"}`}>
                    <Clock className={`size-4 ${pendingCount > 0 ? "text-[#dc2626]" : "text-[#94a3b8]"}`} />
                  </div>
                </div>
                <p className={`mt-2 text-2xl font-black ${pendingCount > 0 ? "text-[#dc2626]" : "text-[#0b1220]"}`}>{pendingCount}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">order pending</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Sedang Dikerjakan</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#fff7ed]">
                    <AlertCircle className="size-4 text-[#f97316]" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-black text-[#f97316]">{inProgressCount}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">sedang proses</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#64748b]">Selesai Bulan Ini</p>
                  <div className="grid size-8 place-items-center rounded-xl bg-[#f0fdf4]">
                    <CheckCircle2 className="size-4 text-[#16a34a]" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-black text-[#16a34a]">{doneCount}</p>
                <p className="text-[11px] font-semibold text-[#64748b]">order selesai</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Refill & Inspeksi", href: "/apar/refill", icon: Flame, color: "text-[#dc2626]", bg: "bg-[#fef2f2]" },
                { label: "Katalog APAR", href: "/apar/katalog", icon: ClipboardList, color: "text-[#2563eb]", bg: "bg-[#eff6ff]" },
                { label: "Invoice B2B", href: "/apar/penjualan", icon: TrendingUp, color: "text-[#16a34a]", bg: "bg-[#f0fdf4]" },
                { label: "Sertifikat Hydrotest", href: "/apar/sertifikat", icon: Award, color: "text-[#f97316]", bg: "bg-[#fff7ed]" },
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

            {/* Recent Orders */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-[#0b1220]">Order Refill Terbaru</h2>
                <a href="/apar/refill" className="text-xs font-bold text-[#2563eb] hover:underline">Lihat Semua →</a>
              </div>
              {(allOrders ?? []).length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto size-8 text-[#94a3b8]" />
                  <p className="mt-2 text-sm font-bold text-[#64748b]">Belum ada order masuk</p>
                  <p className="text-xs text-[#94a3b8]">Order refill APAR akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(allOrders ?? []).slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-xl bg-[#f8fbff] px-3 py-2.5">
                      <div>
                        <p className="text-xs font-bold text-[#0b1220]">{order.client_name ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#0b1220]">{formatRupiah(order.total_cost ?? 0)}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          order.status === "done" ? "bg-[#f0fdf4] text-[#16a34a]" :
                          order.status === "in_progress" ? "bg-[#fff7ed] text-[#f97316]" :
                          "bg-[#fef2f2] text-[#dc2626]"
                        }`}>
                          {order.status === "done" ? "Selesai" : order.status === "in_progress" ? "Proses" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
