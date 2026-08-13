import {
  AlertTriangle,
  BarChart2,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

type TokoSaleRow = {
  id: string;
  grand_total: number;
  created_at: string;
};

type TokoProductRow = {
  id: string;
  name: string;
  stock_qty: number;
  min_stock: number;
};

type TokoSaleItemRow = {
  product_id: string;
  product_name: string;
  qty: number;
  subtotal: number;
};

export default async function TokoHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    { data: profile },
    { data: allSales },
    { data: allProducts },
    { data: allSaleItems },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("branch_id, role, full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("toko_sales")
      .select("id, grand_total, created_at")
      .gte("created_at", firstDayOfMonth),
    supabase.from("toko_products").select("id, name, stock_qty, min_stock"),
    supabase
      .from("toko_sale_items")
      .select("product_id, product_name, qty, subtotal"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const salesRows = (allSales ?? []) as TokoSaleRow[];
  const productRows = (allProducts ?? []) as TokoProductRow[];
  const saleItemRows = (allSaleItems ?? []) as TokoSaleItemRow[];

  // Today's sales
  const todaySales = salesRows.filter((s) =>
    s.created_at.startsWith(todayStr)
  );
  const todaySalesTotal = todaySales.reduce(
    (sum, s) => sum + Number(s.grand_total ?? 0),
    0
  );
  const todaySalesCount = todaySales.length;

  // Low stock
  const lowStockProducts = productRows.filter(
    (p) => Number(p.stock_qty ?? 0) <= Number(p.min_stock ?? 0)
  );
  const lowStockCount = lowStockProducts.length;

  // Total revenue this month
  const totalRevenueMonth = salesRows.reduce(
    (sum, s) => sum + Number(s.grand_total ?? 0),
    0
  );

  // Top 5 products by qty sold
  const productSummary: Record<
    string,
    { name: string; qty: number; total: number }
  > = {};
  for (const item of saleItemRows) {
    const key = item.product_id ?? item.product_name;
    if (!productSummary[key]) {
      productSummary[key] = {
        name: item.product_name ?? key,
        qty: 0,
        total: 0,
      };
    }
    productSummary[key].qty += Number(item.qty ?? 0);
    productSummary[key].total += Number(item.subtotal ?? 0);
  }
  const topProducts = Object.values(productSummary)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />

        <section className="min-w-0 pb-20 lg:pb-4">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur md:px-2">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dbeafe] text-[#2563eb]">
                <Store className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563eb]">
                  Unit Usaha
                </p>
                <h1 className="text-xl font-black text-[#0b1220] md:text-2xl">
                  Dashboard Waserda Toko
                </h1>
              </div>
            </div>
          </header>

          <div className="space-y-4 px-2 py-2 md:px-2 md:py-2">
            {/* Hero Banner */}
            <section className="rounded-2xl bg-[#07152f] p-4 text-white shadow-sm md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-[#bfdbfe]">
                    <Store className="size-3.5" />
                    {today.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <h2 className="mt-2 text-base font-bold md:text-lg">
                    Pantau performa penjualan toko secara real-time
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#cbd5e1]">
                    Selamat datang,{" "}
                    <span className="font-bold text-white">
                      {profile.full_name ?? "Petugas Toko"}
                    </span>
                    . Berikut ringkasan aktivitas toko hari ini.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/toko/kasir"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-2 text-xs font-bold text-[#07152f] shadow-sm transition-all hover:bg-slate-100"
                  >
                    <ShoppingCart className="size-4 text-[#2563eb]" />
                    Buka Kasir
                  </a>
                  <a
                    href="/toko/produk"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/10 px-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-white/20"
                  >
                    <Package className="size-4" />
                    Produk
                  </a>
                </div>
              </div>
            </section>

            {/* KPI Cards */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* Penjualan Hari Ini */}
              <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#dbeafe] text-[#1d4ed8]">
                  <TrendingUp className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">
                  Penjualan Hari Ini
                </p>
                <p className="mt-0.5 truncate text-base font-bold text-[#0b1220] md:text-lg">
                  {formatRupiah(todaySalesTotal)}
                </p>
              </article>

              {/* Transaksi Hari Ini */}
              <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#e0f2fe] text-[#0369a1]">
                  <ShoppingCart className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">
                  Transaksi Hari Ini
                </p>
                <p className="mt-0.5 text-base font-bold text-[#0b1220] md:text-lg">
                  {todaySalesCount}{" "}
                  <span className="text-xs font-semibold text-[#64748b]">
                    transaksi
                  </span>
                </p>
              </article>

              {/* Stok Menipis */}
              <article
                className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                  lowStockCount > 0
                    ? "ring-[#fecdd3]"
                    : "ring-[#dbe5f1]"
                }`}
              >
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    lowStockCount > 0
                      ? "bg-[#fff1f2] text-[#be123c]"
                      : "bg-[#f0fdf4] text-[#15803d]"
                  }`}
                >
                  <AlertTriangle className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">
                  Stok Menipis
                </p>
                <p
                  className={`mt-0.5 text-base font-bold md:text-lg ${
                    lowStockCount > 0 ? "text-[#be123c]" : "text-[#15803d]"
                  }`}
                >
                  {lowStockCount}{" "}
                  <span className="text-xs font-semibold text-[#64748b]">
                    produk
                  </span>
                </p>
              </article>

              {/* Omset Bulan Ini */}
              <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="grid size-9 place-items-center rounded-lg bg-[#eef4ff] text-[#4f46e5]">
                  <BarChart2 className="size-4" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#64748b]">
                  Omset Bulan Ini
                </p>
                <p className="mt-0.5 truncate text-base font-bold text-[#0b1220] md:text-lg">
                  {formatRupiah(totalRevenueMonth)}
                </p>
              </article>
            </section>

            {/* Top 5 Barang Terlaris */}
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Ringkasan penjualan
                  </p>
                  <h3 className="text-base font-bold text-[#0b1220]">
                    Top 5 Barang Terlaris
                  </h3>
                </div>
                <div className="grid size-9 place-items-center rounded-xl bg-[#dbeafe] text-[#2563eb]">
                  <TrendingUp className="size-4" />
                </div>
              </div>

              {topProducts.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-[#dbe5f1]">
                        <th className="pb-2 text-left text-xs font-bold text-[#64748b]">
                          #
                        </th>
                        <th className="pb-2 text-left text-xs font-bold text-[#64748b]">
                          Nama Barang
                        </th>
                        <th className="pb-2 text-right text-xs font-bold text-[#64748b]">
                          Qty Terjual
                        </th>
                        <th className="pb-2 text-right text-xs font-bold text-[#64748b]">
                          Total Omset
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {topProducts.map((item, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-[#f8fbff]"
                        >
                          <td className="py-2.5 pr-3">
                            <span
                              className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                                idx === 0
                                  ? "bg-[#fef9c3] text-[#a16207]"
                                  : idx === 1
                                  ? "bg-[#f1f5f9] text-[#475569]"
                                  : idx === 2
                                  ? "bg-[#fef3c7] text-[#92400e]"
                                  : "bg-[#f1f5f9] text-[#64748b]"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 font-semibold text-[#0b1220]">
                            {item.name}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-bold text-[#0b1220]">
                            {item.qty.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#2563eb]">
                            {formatRupiah(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-[#64748b]">
                  Belum ada data penjualan. Mulai transaksi dari kasir untuk
                  melihat barang terlaris.
                </p>
              )}
            </section>

            {/* Stok Menipis Alert */}
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Perlu perhatian
                  </p>
                  <h3 className="text-base font-bold text-[#0b1220]">
                    Stok Menipis
                  </h3>
                </div>
                <div
                  className={`grid size-9 place-items-center rounded-xl ${
                    lowStockCount > 0
                      ? "bg-[#fff1f2] text-[#be123c]"
                      : "bg-[#f0fdf4] text-[#15803d]"
                  }`}
                >
                  <AlertTriangle className="size-4" />
                </div>
              </div>

              {lowStockProducts.length > 0 ? (
                <div className="mt-4 divide-y divide-[#f1f5f9]">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff1f2] text-[#be123c]">
                          <Package className="size-4" />
                        </div>
                        <p className="truncate text-sm font-semibold text-[#0b1220]">
                          {product.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            Number(product.stock_qty) === 0
                              ? "bg-[#fff1f2] text-[#be123c]"
                              : "bg-[#fef9c3] text-[#a16207]"
                          }`}
                        >
                          Stok: {Number(product.stock_qty ?? 0)}
                          {" / Min: "}
                          {Number(product.min_stock ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-[#64748b]">
                  Semua produk memiliki stok yang cukup. Tidak ada peringatan
                  saat ini.
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
