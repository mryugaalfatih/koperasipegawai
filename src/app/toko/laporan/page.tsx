import { redirect } from "next/navigation";
import {
  TokoLaporanClientManager,
  TokoSalesSummaryRow,
  FastMovingItem,
  MemberBelanjaSummary,
} from "./TokoLaporanClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TokoLaporanPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const sampleSummary: TokoSalesSummaryRow = {
  totalOmset: 18500000,
  totalHpp: 14800000,
  grossProfit: 3700000,
  profitMarginPercent: 20.0,
  totalTransactions: 142,
};

const sampleFastMoving: FastMovingItem[] = [
  { productId: "1", name: "Beras Premium Ramos 5kg", category: "Sembako", totalQtySold: 120, totalOmset: 9000000, unitName: "Sak" },
  { productId: "2", name: "Minyak Goreng Sawit 2 Liter", category: "Sembako", totalQtySold: 150, totalOmset: 5400000, unitName: "Pouch" },
  { productId: "3", name: "Gula Pasir Putih 1kg", category: "Sembako", totalQtySold: 110, totalOmset: 1925000, unitName: "Kg" },
  { productId: "4", name: "Indomie Goreng Special", category: "Makanan", totalQtySold: 180, totalOmset: 630000, unitName: "Pcs" },
  { productId: "5", name: "Telur Ayam Negeri 1kg", category: "Sembako", totalQtySold: 40, totalOmset: 1200000, unitName: "Kg" },
];

const sampleSlowMoving: FastMovingItem[] = [
  { productId: "6", name: "Kecap Manis Botol 600ml", category: "Bumbu", totalQtySold: 2, totalOmset: 40000, unitName: "Botol" },
  { productId: "7", name: "Susu Kental Manis Kaleng", category: "Minuman", totalQtySold: 3, totalOmset: 36000, unitName: "Kaleng" },
];

const sampleMemberSummaries: MemberBelanjaSummary[] = [
  { memberId: "m1", memberName: "Budi Santoso", memberNo: "ANG-001", totalTransactions: 12, totalSpent: 1450000 },
  { memberId: "m2", memberName: "Siti Aminah", memberNo: "ANG-002", totalTransactions: 8, totalSpent: 980000 },
  { memberId: "m3", memberName: "Ahmad Hidayat", memberNo: "ANG-003", totalTransactions: 15, totalSpent: 2100000 },
  { memberId: "m4", memberName: "Dewi Lestari", memberNo: "ANG-004", totalTransactions: 5, totalSpent: 620000 },
];

export default async function TokoLaporanPage({ searchParams }: TokoLaporanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbSales }, { data: dbSaleItems }, { data: dbProducts }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("toko_sales").select("*, members(id, name, member_no)").order("created_at", { ascending: false }),
    supabase.from("toko_sale_items").select("*"),
    supabase.from("toko_products").select("*"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  // Compute Real Sales Summary
  const sales = dbSales ?? [];
  const saleItems = dbSaleItems ?? [];
  const products = dbProducts ?? [];

  const totalOmset = sales.reduce((sum, s) => sum + Number(s.grand_total ?? 0), 0);
  const totalHpp = saleItems.reduce((sum, item) => sum + (Number(item.buy_price ?? 0) * Number(item.qty ?? 1)), 0);
  const grossProfit = Math.max(0, totalOmset - totalHpp);
  const profitMarginPercent = totalOmset > 0 ? (grossProfit / totalOmset) * 100 : 0;

  const realSummary: TokoSalesSummaryRow = sales.length > 0 ? {
    totalOmset,
    totalHpp,
    grossProfit,
    profitMarginPercent,
    totalTransactions: sales.length,
  } : sampleSummary;

  // Compute Real Fast Moving Items
  const productAgg: Record<string, { name: string; category: string; totalQtySold: number; totalOmset: number; unitName: string }> = {};
  for (const item of saleItems) {
    const pid = item.product_id ?? item.product_name;
    if (!productAgg[pid]) {
      productAgg[pid] = {
        name: item.product_name,
        category: "Sembako",
        totalQtySold: 0,
        totalOmset: 0,
        unitName: item.unit_name ?? "Pcs",
      };
    }
    productAgg[pid].totalQtySold += Number(item.qty ?? 0);
    productAgg[pid].totalOmset += Number(item.subtotal ?? 0);
  }

  const realFastMoving: FastMovingItem[] = Object.entries(productAgg)
    .map(([productId, val]) => ({ productId, ...val }))
    .sort((a, b) => b.totalQtySold - a.totalQtySold)
    .slice(0, 5);

  // Compute Real Member Summaries
  const memberAgg: Record<string, { memberName: string; memberNo: string; totalTransactions: number; totalSpent: number }> = {};
  for (const sale of sales) {
    if (sale.member_id) {
      const mid = sale.member_id;
      const mName = sale.members?.name ?? "Anggota Koperasi";
      const mNo = sale.members?.member_no ?? "ANG-000";
      if (!memberAgg[mid]) {
        memberAgg[mid] = { memberName: mName, memberNo: mNo, totalTransactions: 0, totalSpent: 0 };
      }
      memberAgg[mid].totalTransactions += 1;
      memberAgg[mid].totalSpent += Number(sale.grand_total ?? 0);
    }
  }

  const realMemberSummaries: MemberBelanjaSummary[] = Object.entries(memberAgg)
    .map(([memberId, val]) => ({ memberId, ...val }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-3 py-3 md:px-3 md:py-4">
            <TokoLaporanClientManager
              fastMovingItems={realFastMoving.length ? realFastMoving : sampleFastMoving}
              memberSummaries={realMemberSummaries.length ? realMemberSummaries : sampleMemberSummaries}
              slowMovingItems={sampleSlowMoving}
              summary={realSummary}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
