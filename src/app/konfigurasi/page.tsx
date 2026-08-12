import { redirect } from "next/navigation";
import { KonfigurasiClientManager } from "./KonfigurasiClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type KonfigurasiPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type CooperativeProfile = {
  id: string;
  name: string;
  legal_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscal_year_start_month: number;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
};

type SavingsProduct = {
  id: string;
  code: string;
  name: string;
  type: "pokok" | "wajib" | "sukarela";
  minimum_balance: number;
  monthly_required_amount: number;
  withdrawable: boolean;
};

type LoanProduct = {
  id: string;
  name: string;
  annual_rate: number;
  max_tenor_months: number;
  admin_fee_percent: number;
  default_interest_method: "flat" | "annuity";
  allow_method_override: boolean;
};

type FiscalPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
  branches: {
    name: string;
  }[] | null;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: "asset" | "liability" | "equity" | "income" | "expense";
  normal_balance: "in" | "out";
};

export default async function KonfigurasiPage({ searchParams }: KonfigurasiPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const [
    { data: cooperativeProfile },
    { data: branches },
    { data: fiscalPeriods },
    { data: savingsProducts },
    { data: loanProducts },
    { data: accounts },
  ] = await Promise.all([
    supabase.from("cooperative_profiles").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("branches").select("id, code, name, address").order("name"),
    supabase.from("fiscal_periods").select("id, year, month, status, branches(name)").order("year", { ascending: false }).limit(12),
    supabase.from("savings_products").select("*").order("code"),
    supabase.from("loan_products").select("*").order("name"),
    supabase.from("accounts").select("id, code, name, category, normal_balance").order("code"),
  ]);

  const koperasi = cooperativeProfile as CooperativeProfile | null;
  const branchRows = (branches ?? []) as Branch[];
  const fiscalRows = (fiscalPeriods ?? []) as unknown as FiscalPeriod[];
  const savingsRows = (savingsProducts ?? []) as SavingsProduct[];
  const loanRows = (loanProducts ?? []) as LoanProduct[];
  const accountRows = (accounts ?? []) as unknown as AccountRow[];
  const defaultBranchId = branchRows[0]?.id ?? "";

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <KonfigurasiClientManager
          koperasi={koperasi}
          branchRows={branchRows}
          fiscalRows={fiscalRows}
          savingsRows={savingsRows}
          loanRows={loanRows}
          accountRows={accountRows}
          defaultBranchId={defaultBranchId}
          profileName={profile.full_name ?? "User"}
          profileRole={profile.role ?? "admin"}
        />
      </div>
    </main>
  );
}
