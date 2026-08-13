import { redirect } from "next/navigation";
import { MutasiClientManager } from "./MutasiClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type MutasiPageProps = {
  params: Promise<{ id: string }>;
};

type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_no: string;
  } | {
    id: string;
    full_name: string;
    member_no: string;
  }[] | null;
  savings_products: {
    name: string;
    code: string;
  } | {
    name: string;
    code: string;
  }[] | null;
};

type SavingsTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference_no: string | null;
  created_at: string;
};

export default async function MutasiRekeningPage({ params }: MutasiPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  // Fetch account detail
  const { data: account, error: accountError } = await supabase
    .from("savings_accounts")
    .select("id, account_no, type, balance, created_at, members(id, full_name, member_no), savings_products(name, code)")
    .eq("id", id)
    .single();

  if (accountError || !account) {
    redirect("/simpanan/rekening?error=Rekening%20tidak%20ditemukan.");
  }

  // Fetch all transactions for this account
  const { data: transactions } = await supabase
    .from("savings_transactions")
    .select("id, direction, amount, description, transaction_date, reference_no, created_at")
    .eq("account_id", id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  const accountData = account as unknown as SavingsAccount;
  const transactionRows = (transactions ?? []) as SavingsTransaction[];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <MutasiClientManager
          account={accountData}
          transactions={transactionRows}
        />
      </div>
    </main>
  );
}
