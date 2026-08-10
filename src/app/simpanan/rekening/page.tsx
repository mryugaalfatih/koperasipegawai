import { redirect } from "next/navigation";
import { RekeningClientManager } from "./RekeningClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type RekeningPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type MemberOption = {
  id: string;
  member_no: string;
  full_name: string;
};

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
};

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  savings_products: {
    name: string;
    code: string;
  }[] | null;
};

export default async function RekeningPage({ searchParams }: RekeningPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: members },
    { data: products },
    { data: accounts },
  ] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).single(),
    supabase.from("members").select("id, member_no, full_name").eq("status", "active").order("full_name").limit(100),
    supabase.from("savings_products").select("id, code, name, type").eq("is_active", true).order("code"),
    supabase
      .from("savings_accounts")
      .select("id, account_no, type, balance, members(full_name, member_no), savings_products(name, code)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const memberOptions = (members ?? []) as MemberOption[];
  const productRows = (products ?? []) as SavingsProduct[];
  const accountRows = (accounts ?? []) as unknown as SavingsAccount[];

  const totals = accountRows.reduce(
    (summary, account) => {
      summary.total += Number(account.balance ?? 0);
      summary[account.type] += Number(account.balance ?? 0);
      return summary;
    },
    { total: 0, pokok: 0, wajib: 0, sukarela: 0 }
  );

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6">
            <RekeningClientManager
              accountRows={accountRows}
              memberOptions={memberOptions}
              productRows={productRows}
              totals={totals}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
