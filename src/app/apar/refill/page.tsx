import { redirect } from "next/navigation";
import { AparRefillClientManager, AparRefillOrderRow } from "./AparRefillClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AparRefillPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialSampleRefills: AparRefillOrderRow[] = [
  {
    id: "sample_rfl_1",
    order_no: "RFL-APAR-881901",
    order_date: "2026-08-11",
    client_name: "PT Wisma Nusantara Jaya",
    client_phone: "0812-9988-7766",
    client_address: "Jl. MH Thamrin No. 59 Jakarta",
    total_cylinders: 15,
    total_amount: 2025000,
    payment_status: "paid",
    status: "completed",
    notes: "Pengisian powder 3kg & 6kg Gedung Utama",
    created_at: new Date().toISOString(),
    apar_refill_items: [
      {
        serial_no: "APAR-990121",
        media_type: "Powder",
        capacity_kg: 3.0,
        location_tag: "Lantai 1 Lobby Utama",
        expired_date: "2028-08-11",
        price: 135000,
      },
      {
        serial_no: "APAR-990122",
        media_type: "CO2",
        capacity_kg: 5.0,
        location_tag: "Lantai 2 Ruang Server",
        expired_date: "2028-08-11",
        price: 300000,
      },
    ],
  },
  {
    id: "sample_rfl_2",
    order_no: "RFL-APAR-881902",
    order_date: "2026-08-13",
    client_name: "RS Medika Graha Persona",
    client_phone: "0819-7766-5544",
    client_address: "Jl. Gatot Subroto No. 12",
    total_cylinders: 8,
    total_amount: 1440000,
    payment_status: "unpaid",
    status: "process",
    notes: "Refill tahunan & hydrotest tabung 6kg",
    created_at: new Date().toISOString(),
    apar_refill_items: [
      {
        serial_no: "APAR-881001",
        media_type: "Powder",
        capacity_kg: 6.0,
        location_tag: "UGD IGD Utama",
        expired_date: "2028-08-13",
        price: 270000,
      },
    ],
  },
];

export default async function AparRefillPage({ searchParams }: AparRefillPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: dbOrders }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    supabase.from("apar_refill_orders").select("*, apar_refill_items(*)").order("created_at", { ascending: false }),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const orderRows: AparRefillOrderRow[] =
    dbOrders && dbOrders.length > 0
      ? (dbOrders as unknown as AparRefillOrderRow[])
      : initialSampleRefills;

  const processOrderCount = orderRows.filter((o) => o.status === "process").length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6">
            <AparRefillClientManager
              orderRows={orderRows}
              processOrderCount={processOrderCount}
              totalOrderCount={orderRows.length}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
