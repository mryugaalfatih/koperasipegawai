import { redirect } from "next/navigation";
import { AparPenjualanClientManager, AparPenjualanRow } from "./AparPenjualanClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AparPenjualanPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialSampleSales: AparPenjualanRow[] = [
  {
    id: "inv_1",
    invoice_no: "INV-APAR-9901",
    invoice_date: "2026-08-10",
    client_name: "PT Wisma Nusantara Jaya",
    client_type: "Instansi / PT",
    total_amount: 5250000,
    payment_status: "LUNAS",
    due_date: null,
    items_summary: "10 Tabung APAR Powder 3kg + 2 Box APAR",
  },
  {
    id: "inv_2",
    invoice_no: "INV-APAR-9902",
    invoice_date: "2026-08-12",
    client_name: "Gedung RS Medika Persona",
    client_type: "Instansi / PT",
    total_amount: 11000000,
    payment_status: "TEMPO (Kredit PT)",
    due_date: "2026-08-26",
    items_summary: "10 Tabung APAR CO2 5kg + 5 Baju Nomex",
  },
];

export default async function AparPenjualanPage({ searchParams }: AparPenjualanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6">
            <AparPenjualanClientManager sales={initialSampleSales} />
          </div>
        </section>
      </div>
    </main>
  );
}
