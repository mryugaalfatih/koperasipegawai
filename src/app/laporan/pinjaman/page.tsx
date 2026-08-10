import { redirect } from "next/navigation";
import { LaporanPinjamanClientManager } from "./LaporanPinjamanClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

// Use same column names as /pinjaman module: principal, interest_method, annual_rate_snapshot
type LoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  status: string;
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  members: {
    full_name: string;
    member_no: string;
  } | {
    full_name: string;
    member_no: string;
  }[] | null;
  loan_products: {
    name: string;
  } | {
    name: string;
  }[] | null;
};

export default async function LaporanPinjamanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  // Use the SAME query as /pinjaman module
  const { data: loans } = await supabase
    .from("loans")
    .select("id, principal, tenor_months, status, interest_method, annual_rate_snapshot, members(full_name, member_no), loan_products(name)")
    .order("created_at", { ascending: false });

  const loanRows = (loans ?? []) as unknown as LoanRow[];

  let totalPrincipal = 0;
  let totalDisbursed = 0;
  let activeLoansCount = 0;

  loanRows.forEach((loan) => {
    const amount = Number(loan.principal ?? 0);
    totalPrincipal += amount;
    if (["disbursed", "active"].includes(loan.status)) {
      totalDisbursed += amount;
      activeLoansCount += 1;
    }
  });

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <LaporanPinjamanClientManager
          loanRows={loanRows}
          totalPrincipal={totalPrincipal}
          totalDisbursed={totalDisbursed}
          activeLoansCount={activeLoansCount}
        />
      </div>
    </main>
  );
}
