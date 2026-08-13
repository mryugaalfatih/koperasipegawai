import { redirect } from "next/navigation";
import { PinjamanClientManager } from "./PinjamanClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type PinjamanPageProps = {
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

type LoanProduct = {
  id: string;
  name: string;
  annual_rate: number;
  max_tenor_months: number;
  default_interest_method: "flat" | "annuity";
  allow_method_override: boolean;
};

type InstallmentInfo = {
  id: string;
  paid_amount: number;
  principal_due: number;
  interest_due: number;
  principal_paid: number;
  paid_at: string | null;
};

type LoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  member_id: string;
  product_id: string;
  interest_method: "flat" | "annuity" | "interest_only";
  annual_rate_snapshot: number | null;
  admin_fee_percent_snapshot?: number | null;
  ref_loan_id?: string | null;
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
  loan_products: {
    name: string;
    admin_fee_percent?: number | null;
  }[] | null;
  loan_installments?: InstallmentInfo[] | null;
};

export default async function PinjamanPage({ searchParams }: PinjamanPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: members }, { data: products }, { data: loans }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("members").select("id, member_no, full_name").eq("status", "active").order("full_name").limit(100),
    supabase
      .from("loan_products")
      .select("id, name, annual_rate, max_tenor_months, default_interest_method, allow_method_override, admin_fee_percent")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("loans")
      .select("id, member_id, product_id, principal, tenor_months, status, interest_method, annual_rate_snapshot, admin_fee_percent_snapshot, members(full_name, member_no), loan_products(name, admin_fee_percent), loan_installments(id, paid_amount, principal_due, interest_due, principal_paid, paid_at)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const memberOptions = (members ?? []) as MemberOption[];
  const productRows = (products ?? []) as LoanProduct[];
  const loanRows = (loans ?? []) as unknown as LoanRow[];
  const totalPortfolio = loanRows
    .filter((loan) => loan.status === "disbursed")
    .reduce((sum, loan) => sum + Number(loan.principal ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <PinjamanClientManager
          memberOptions={memberOptions}
          productRows={productRows}
          loanRows={loanRows}
          totalPortfolio={totalPortfolio}
        />
      </div>
    </main>
  );
}
