import { redirect } from "next/navigation";
import { TokoPembelianClientManager, TokoPoRow } from "./TokoPembelianClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";
import { initialSampleProducts } from "../produk/page";
import { TokoProductRow } from "../produk/TokoProdukClientManager";

type TokoPembelianPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialSamplePos: TokoPoRow[] = [
  {
    id: "sample_po_1",
    po_no: "PO-TOKO-991801",
    order_date: "2026-08-12",
    supplier_name: "PT Sayap Mas Utama",
    supplier_phone: "08123456789",
    status: "received",
    total_amount: 3400000,
    payment_type: "cash",
    due_date: null,
    notes: "Pengiriman pagi",
    created_at: new Date().toISOString(),
    toko_purchase_order_items: [
      {
        product_name: "Minyak Goreng Sawit 2 Liter",
        qty_ordered: 50,
        unit_name: "Pouch",
        buy_price: 31000,
        subtotal: 1550000,
      },
      {
        product_name: "Gula Pasir Putih 1kg",
        qty_ordered: 100,
        unit_name: "Kg",
        buy_price: 14500,
        subtotal: 1450000,
      },
      {
        product_name: "Indomie Goreng Spesiak (1 Dus / 40 Pcs)",
        qty_ordered: 4,
        unit_name: "Dus",
        buy_price: 108000,
        subtotal: 400000,
      },
    ],
  },
  {
    id: "sample_po_2",
    po_no: "PO-TOKO-991802",
    order_date: "2026-08-13",
    supplier_name: "Distributor Beras Ramos Utama",
    supplier_phone: "08198765432",
    status: "ordered",
    total_amount: 6800000,
    payment_type: "tempo",
    due_date: "2026-08-27",
    notes: "Pasokan Beras Premium Ramos 5kg",
    created_at: new Date().toISOString(),
    toko_purchase_order_items: [
      {
        product_name: "Beras Premium Ramos 5kg",
        qty_ordered: 100,
        unit_name: "Sak",
        buy_price: 68000,
        subtotal: 6800000,
      },
    ],
  },
];

export default async function TokoPembelianPage({ searchParams }: TokoPembelianPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbPos }, { data: dbProducts }, { data: cooperativeProfile }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("toko_purchase_orders").select("*, toko_purchase_order_items(*)").order("created_at", { ascending: false }),
    supabase.from("toko_products").select("*").eq("is_active", true).order("name"),
    supabase.from("cooperative_profiles").select("name, legal_number, address, phone, email").order("created_at").limit(1).maybeSingle(),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const poRows: TokoPoRow[] =
    dbPos && dbPos.length > 0
      ? (dbPos as unknown as TokoPoRow[])
      : initialSamplePos;

  const products: TokoProductRow[] =
    dbProducts && dbProducts.length > 0
      ? (dbProducts as TokoProductRow[])
      : initialSampleProducts;

  const pendingPoCount = poRows.filter((p) => p.status === "ordered").length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoPembelianClientManager
              pendingPoCount={pendingPoCount}
              poRows={poRows}
              products={products}
              totalPoCount={poRows.length}
              cooperativeProfile={cooperativeProfile}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
