import { redirect } from "next/navigation";
import { TokoLabelClientManager } from "./TokoLabelClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";
import { initialSampleProducts } from "../produk/page";
import { TokoProductRow } from "../produk/TokoProdukClientManager";

type TokoLabelPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function TokoLabelPage({ searchParams }: TokoLabelPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbProducts }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("toko_products").select("*").eq("is_active", true).order("name"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const products: TokoProductRow[] =
    dbProducts && dbProducts.length > 0
      ? (dbProducts as TokoProductRow[])
      : initialSampleProducts;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoLabelClientManager products={products} />
          </div>
        </section>
      </div>
    </main>
  );
}
