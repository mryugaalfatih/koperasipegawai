import { redirect } from "next/navigation";
import { AparKatalogClientManager, AparProductRow } from "./AparKatalogClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AparKatalogPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialSampleProducts: AparProductRow[] = [
  {
    id: "ap_1",
    code: "APAR-POW-3KG",
    name: "Tabung APAR Powder 3kg Utuh (Baru)",
    category: "Tabung APAR",
    media_type: "Powder",
    capacity_kg: 3.0,
    buy_price: 220000,
    sell_price: 350000,
    refill_price: 135000,
    stock_qty: 25,
    is_active: true,
  },
  {
    id: "ap_2",
    code: "APAR-POW-6KG",
    name: "Tabung APAR Powder 6kg Utuh (Baru)",
    category: "Tabung APAR",
    media_type: "Powder",
    capacity_kg: 6.0,
    buy_price: 380000,
    sell_price: 580000,
    refill_price: 270000,
    stock_qty: 18,
    is_active: true,
  },
  {
    id: "ap_3",
    code: "APAR-CO2-5KG",
    name: "Tabung APAR CO2 5kg (Ruang Server/Listrik)",
    category: "Tabung APAR",
    media_type: "CO2",
    capacity_kg: 5.0,
    buy_price: 750000,
    sell_price: 1100000,
    refill_price: 300000,
    stock_qty: 10,
    is_active: true,
  },
  {
    id: "ap_4",
    code: "APD-SUIT-NOMEX",
    name: "Baju Pemadam Tahan Panas Fire Suit (Nomex III A)",
    category: "APD Damkar",
    media_type: "Safety",
    capacity_kg: 0,
    buy_price: 2800000,
    sell_price: 3900000,
    refill_price: 0,
    stock_qty: 8,
    is_active: true,
  },
  {
    id: "ap_5",
    code: "APD-BOOTS-SAFETY",
    name: "Sepatu Boots Pemadam Safety Harvik Tahan Panas & Paku",
    category: "APD Damkar",
    media_type: "Safety",
    capacity_kg: 0,
    buy_price: 850000,
    sell_price: 1250000,
    refill_price: 0,
    stock_qty: 15,
    is_active: true,
  },
];

export default async function AparKatalogPage({ searchParams }: AparKatalogPageProps) {
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
    supabase.from("apar_products").select("*").order("name"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const products: AparProductRow[] =
    dbProducts && dbProducts.length > 0
      ? (dbProducts as AparProductRow[])
      : initialSampleProducts;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <AparKatalogClientManager products={products} />
          </div>
        </section>
      </div>
    </main>
  );
}
