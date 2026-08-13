import { redirect } from "next/navigation";
import { TokoProdukClientManager, TokoProductRow } from "./TokoProdukClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TokoProdukPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export const initialSampleProducts: TokoProductRow[] = [
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
    name: "Indomie Goreng Spesiak (1 Dus / 40 Pcs)",
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

export type TokoStockMutationRow = {
  id: string;
  product_id: string;
  mutation_date: string;
  mutation_type: string;
  qty_in: number;
  qty_out: number;
  stock_after: number;
  ref_no: string | null;
  notes: string | null;
};

export default async function TokoProdukPage({ searchParams }: TokoProdukPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbProducts }, { data: dbMutations }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("toko_products").select("*").order("name"),
    supabase.from("toko_stock_mutations").select("*").order("mutation_date", { ascending: false }).limit(200),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  let productRows: TokoProductRow[] = (dbProducts ?? []) as TokoProductRow[];

  // Auto seed to Supabase if table is currently empty
  if (!productRows || productRows.length === 0) {
    const seedData = [
      {
        branch_id: profile.branch_id,
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
        branch_id: profile.branch_id,
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
        branch_id: profile.branch_id,
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
        branch_id: profile.branch_id,
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
        branch_id: profile.branch_id,
        barcode: "8995005005",
        name: "Indomie Goreng Special (1 Dus / 40 Pcs)",
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

    const { data: seeded, error: seedError } = await supabase
      .from("toko_products")
      .insert(seedData)
      .select("*");

    if (!seedError && seeded) {
      productRows = seeded as TokoProductRow[];

      // Seed initial stock mutations
      const mutationInserts = seeded.map((p: any) => ({
        product_id: p.id,
        mutation_type: "in",
        qty_in: p.stock_qty,
        qty_out: 0,
        stock_after: p.stock_qty,
        ref_no: "STK-INIT-001",
        notes: "Stok Awal Inventaris Toko Waserda",
        created_by: user.id,
      }));
      await supabase.from("toko_stock_mutations").insert(mutationInserts);
    }
  }

  const stockMutations: TokoStockMutationRow[] = (dbMutations ?? []) as TokoStockMutationRow[];
  const lowStockCount = productRows.filter((p) => p.stock_qty <= p.min_stock).length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoProdukClientManager
              lowStockCount={lowStockCount}
              productRows={productRows}
              stockMutations={stockMutations}
              totalProducts={productRows.length}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
