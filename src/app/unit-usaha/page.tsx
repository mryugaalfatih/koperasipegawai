import { redirect } from "next/navigation";
import { UnitUsahaClientManager, BusinessUnitRow } from "./UnitUsahaClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type UnitUsahaPageProps = {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
  }>;
};

export default async function UnitUsahaPage({ searchParams }: UnitUsahaPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: businessUnits }] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).single(),
    supabase.from("business_units").select("id, code, name, description, is_active, created_at").order("code"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const unitRows = (businessUnits ?? []) as BusinessUnitRow[];
  const activeUnitsCount = unitRows.filter((u) => u.is_active).length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.created || params.updated ? <ToastNotification saved="true" /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <UnitUsahaClientManager
          unitRows={unitRows}
          activeUnitsCount={activeUnitsCount}
        />
      </div>
    </main>
  );
}
