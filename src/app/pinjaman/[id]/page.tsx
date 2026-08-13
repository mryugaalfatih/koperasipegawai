import { notFound, redirect } from "next/navigation";
import { PinjamanDetailClientManager } from "./PinjamanDetailClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type PinjamanDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; paid?: string }>;
};

type LoanDetail = {
  id: string;
  principal: number;
  tenor_months: number;
  status: "draft" | "submitted" | "review" | "approved" | "disbursed" | "closed" | "rejected";
  interest_method: "flat" | "annuity";
  annual_rate_snapshot: number | null;
  admin_fee_percent_snapshot: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
  members: {
    full_name: string;
    member_no: string;
    phone: string | null;
  }[] | null;
  loan_products: {
    name: string;
  }[] | null;
};

type InstallmentRow = {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  penalty_due: number;
  paid_amount: number;
  principal_paid: number;
  interest_paid: number;
  paid_at: string | null;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  total_paid: number;
  loan_installments?: { installment_no: number } | { installment_no: number }[] | null;
};

export default async function PinjamanDetailPage({ params, searchParams }: PinjamanDetailPageProps) {
  const supabase = await createClient();
  const { id } = await params;
  const query = await searchParams;
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

  const [{ data: loan }, { data: installments }, { data: payments }, { data: cooperative }] = await Promise.all([
    supabase
      .from("loans")
      .select("id, principal, tenor_months, status, interest_method, annual_rate_snapshot, admin_fee_percent_snapshot, submitted_at, approved_at, disbursed_at, members(full_name, member_no, phone), loan_products(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("loan_installments")
      .select("id, installment_no, due_date, principal_due, interest_due, penalty_due, paid_amount, principal_paid, interest_paid, paid_at")
      .eq("loan_id", id)
      .order("installment_no"),
    supabase
      .from("loan_payments")
      .select("id, payment_date, principal_paid, interest_paid, penalty_paid, total_paid, loan_installments(installment_no)")
      .eq("loan_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("cooperative_profiles")
      .select("name, legal_number, address, phone, email")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!loan) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <PinjamanDetailClientManager
          loanDetail={loan as unknown as LoanDetail}
          installmentRows={(installments ?? []) as InstallmentRow[]}
          paymentRows={(payments ?? []) as PaymentRow[]}
          cooperativeProfile={cooperative}
          error={query.error}
          paid={query.paid}
        />
      </div>
    </main>
  );
}
