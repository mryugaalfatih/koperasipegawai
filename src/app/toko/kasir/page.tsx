import { redirect } from "next/navigation";
import { MemberOption, TokoKasirClientManager } from "./TokoKasirClientManager";
import { TokoProductRow } from "../produk/TokoProdukClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TokoKasirPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    inv?: string;
    total?: string;
  }>;
};

const initialSampleProducts: TokoProductRow[] = [
  {
    id: "sample_1",
    barcode: "8991001001",
    name: "Beras Premium Ramos 5kg",
    category: "Sembako",
    unit_name: "Sak",
    buy_price: 68000,
    sell_price_general: 75000,
    sell_price_member: 72000,
    stock_qty: 45,
    min_stock: 10,
    is_active: true,
  },
  {
    id: "sample_2",
    barcode: "8992002002",
    name: "Minyak Goreng Sawit 2 Liter",
    category: "Sembako",
    unit_name: "Pouch",
    buy_price: 31000,
    sell_price_general: 36000,
    sell_price_member: 34000,
    stock_qty: 60,
    min_stock: 15,
    is_active: true,
  },
  {
    id: "sample_3",
    barcode: "8993003003",
    name: "Gula Pasir Putih 1kg",
    category: "Sembako",
    unit_name: "Kg",
    buy_price: 14500,
    sell_price_general: 17500,
    sell_price_member: 16500,
    stock_qty: 80,
    min_stock: 20,
    is_active: true,
  },
  {
    id: "sample_4",
    barcode: "8994004004",
    name: "Telur Ayam Negeri 1kg",
    category: "Sembako",
    unit_name: "Kg",
    buy_price: 26000,
    sell_price_general: 30000,
    sell_price_member: 28500,
    stock_qty: 12,
    min_stock: 15,
    is_active: true,
  },
  {
    id: "sample_5",
    barcode: "8995005005",
    name: "Indomie Goreng Spesial (1 Dus / 40 Pcs)",
    category: "Makanan Ringan",
    unit_name: "Dus",
    buy_price: 108000,
    sell_price_general: 120000,
    sell_price_member: 115000,
    stock_qty: 25,
    min_stock: 5,
    is_active: true,
  },
];

export default async function TokoKasirPage({ searchParams }: TokoKasirPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbProducts }, { data: dbMembers }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("toko_products").select("*").eq("is_active", true).order("name"),
    supabase.from("members").select("id, member_no, full_name, department").eq("status", "active").order("full_name"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const products: TokoProductRow[] =
    dbProducts && dbProducts.length > 0
      ? (dbProducts as TokoProductRow[])
      : initialSampleProducts;

  const members: MemberOption[] = (dbMembers ?? []) as MemberOption[];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved && params.saved !== "sale_success" ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6">
            <TokoKasirClientManager
              members={members}
              products={products}
              successInv={params.inv}
              successTotal={params.total ? Number(params.total) : undefined}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
