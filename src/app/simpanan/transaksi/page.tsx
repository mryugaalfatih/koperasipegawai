import { redirect } from "next/navigation";
import { TransaksiClientManager } from "./TransaksiClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TransaksiPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
};

type SavingsTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference_no?: string | null;
  savings_accounts: {
    account_no: string;
    type: "pokok" | "wajib" | "sukarela";
    members: {
      full_name: string;
      member_no: string;
    }[] | null;
  }[] | null;
};

export default async function TransaksiPage({ searchParams }: TransaksiPageProps) {
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
    { data: accounts },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).single(),
    supabase
      .from("savings_accounts")
      .select("id, account_no, type, members(full_name, member_no)")
      .order("account_no"),
    supabase
      .from("savings_transactions")
      .select("id, direction, amount, description, transaction_date, reference_no, savings_accounts(account_no, type, members(full_name, member_no))")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as unknown as SavingsAccount[];
  const transactionRows = (transactions ?? []) as unknown as SavingsTransaction[];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-7 md:py-6">
            <TransaksiClientManager
              accountRows={accountRows}
              transactionRows={transactionRows}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
