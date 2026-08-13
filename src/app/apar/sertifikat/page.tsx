import { redirect } from "next/navigation";
import { AparSertifikatClientManager, AparCertificateRow } from "./AparSertifikatClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AparSertifikatPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialSampleCerts: AparCertificateRow[] = [
  {
    id: "cert_1",
    cert_no: "CERT-DAMKAR-2026/08/001",
    client_name: "PT Wisma Nusantara Jaya",
    serial_no: "APAR-990121",
    media_type: "Powder",
    capacity_kg: 3.0,
    test_date: "2026-08-11",
    expired_date: "2028-08-11",
    inspector_name: "Sert. Komandan Regu 1 Damkar",
    status: "LULUS UJI KELAYAKAN",
  },
  {
    id: "cert_2",
    cert_no: "CERT-DAMKAR-2026/08/002",
    client_name: "Gedung RS Medika Persona",
    serial_no: "APAR-990122",
    media_type: "CO2",
    capacity_kg: 5.0,
    test_date: "2026-08-11",
    expired_date: "2028-08-11",
    inspector_name: "Sert. Komandan Regu 2 Damkar",
    status: "LULUS UJI KELAYAKAN",
  },
];

export default async function AparSertifikatPage({ searchParams }: AparSertifikatPageProps) {
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

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <AparSertifikatClientManager certificates={initialSampleCerts} />
          </div>
        </section>
      </div>
    </main>
  );
}
