import { redirect } from "next/navigation";
import { TokoPenjualanClientManager, TokoSaleRow } from "./TokoPenjualanClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TokoPenjualanPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const initialSampleSales: TokoSaleRow[] = [
  {
    id: "sale_1",
    invoice_no: "INV-TOKO-88210921",
    sale_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    total_amount: 105000,
    discount_amount: 0,
    grand_total: 105000,
    paid_amount: 110000,
    change_amount: 5000,
    notes: "Pembelian Sembako Kasir",
    created_at: new Date().toISOString(),
    members: null,
    toko_sale_items: [
      { product_name: "Beras Premium Ramos 5kg", qty: 1, unit_name: "Sak", sell_price: 75000, subtotal: 75000 },
      { product_name: "Telur Ayam Negeri 1kg", qty: 1, unit_name: "Kg", sell_price: 30000, subtotal: 30000 },
    ],
  },
  {
    id: "sale_2",
    invoice_no: "INV-TOKO-88210922",
    sale_date: new Date().toISOString().slice(0, 10),
    payment_method: "credit",
    total_amount: 106000,
    discount_amount: 0,
    grand_total: 106000,
    paid_amount: 106000,
    change_amount: 0,
    notes: "Potong Gaji Anggota",
    created_at: new Date().toISOString(),
    members: {
      full_name: "Budi Santoso",
      member_no: "AGT-0001",
    },
    toko_sale_items: [
      { product_name: "Beras Premium Ramos 5kg", qty: 1, unit_name: "Sak", sell_price: 72000, subtotal: 72000 },
      { product_name: "Minyak Goreng Sawit 2 Liter", qty: 1, unit_name: "Pouch", sell_price: 34000, subtotal: 34000 },
    ],
  },
];

export default async function TokoPenjualanPage({ searchParams }: TokoPenjualanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbSales }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase
      .from("toko_sales")
      .select("id, invoice_no, sale_date, payment_method, total_amount, discount_amount, grand_total, paid_amount, change_amount, notes, created_at, members(full_name, member_no), toko_sale_items(product_name, qty, unit_name, sell_price, subtotal)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const salesRows: TokoSaleRow[] =
    dbSales && dbSales.length > 0
      ? (dbSales as unknown as TokoSaleRow[])
      : initialSampleSales;

  const totalOmset = salesRows.reduce((sum, s) => sum + Number(s.grand_total), 0);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoPenjualanClientManager
              salesRows={salesRows}
              totalOmset={totalOmset}
              totalSalesCount={salesRows.length}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
