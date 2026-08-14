import { redirect } from "next/navigation";
import { TokoLaporanClientManager } from "./TokoLaporanClientManager";
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

export default async function TokoLaporanPage({ searchParams }: TokoLaporanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbSales }, { data: dbSaleItems }, { data: dbProducts }, { data: dbMembers }, { data: cooperativeProfile }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase
      .from("toko_sales")
      .select("id, invoice_no, sale_date, payment_method, total_amount, discount_amount, grand_total, paid_amount, change_amount, member_id, created_at, members(id, full_name, member_no, department)")
      .order("created_at", { ascending: false }),
    supabase.from("toko_sale_items").select("id, sale_id, product_id, product_name, qty, unit_name, buy_price, sell_price, subtotal"),
    supabase.from("toko_products").select("id, name, barcode, category, unit_name, buy_price, sell_price_general, sell_price_member, stock_qty, min_stock, is_active"),
    supabase.from("members").select("id, member_no, full_name, department").eq("status", "active"),
    supabase.from("cooperative_profiles").select("name, legal_number, address, phone, email").order("created_at").limit(1).maybeSingle(),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoLaporanClientManager
              rawSales={(dbSales ?? []) as any}
              rawSaleItems={(dbSaleItems ?? []) as any}
              rawProducts={(dbProducts ?? []) as any}
              rawMembers={(dbMembers ?? []) as any}
              cooperativeProfile={cooperativeProfile}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
