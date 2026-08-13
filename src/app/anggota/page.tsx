import { redirect } from "next/navigation";
import { AnggotaClientManager } from "./AnggotaClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AnggotaPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
};

type MemberRow = {
  id: string;
  member_no: string;
  full_name: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  joined_at: string;
  status: "active" | "inactive" | "resigned";
};

export default async function AnggotaPage({ searchParams }: AnggotaPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: members }, { count: activeCount }, { count: totalCount }, { data: branches }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name, allowed_unit_codes").eq("id", user.id).single(),
    supabase.from("members").select("id, member_no, full_name, nik, phone, address, joined_at, status, photo_url, ktp_url, email, gender, birth_place, birth_date, department, employee_no, bank_name, bank_account_no, bank_account_name, heir_name, heir_relation, heir_phone").order("created_at", { ascending: false }).limit(100),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("branches").select("id").order("created_at").limit(1).single(),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const memberRows = (members ?? []) as MemberRow[];
  const defaultBranchId = profile.branch_id ?? branches?.id ?? "";

  const canManageMembers =
    profile.role === "super_admin" ||
    profile.role === "admin" ||
    profile.allowed_unit_codes?.includes("*") ||
    profile.allowed_unit_codes?.includes("PUSAT");

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.created ? <ToastNotification saved="true" /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-3 py-3 md:px-3 md:py-4">
            <AnggotaClientManager
              activeCount={activeCount ?? 0}
              canManageMembers={canManageMembers}
              defaultBranchId={defaultBranchId}
              memberRows={memberRows}
              totalCount={totalCount ?? 0}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
