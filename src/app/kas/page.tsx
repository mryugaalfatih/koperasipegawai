import { redirect } from "next/navigation";
import { KasClientManager } from "./KasClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type KasPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type CashTransactionRow = {
  id: string;
  direction: "in" | "out";
  amount: number;
  source_type: string;
  description: string | null;
  transaction_date: string;
};

export default async function KasPage({ searchParams }: KasPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accounts }, { data: cashTransactions }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const cashRows = (cashTransactions ?? []) as CashTransactionRow[];

  const totalIn = cashRows
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const totalOut = cashRows
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const netCash = totalIn - totalOut;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <KasClientManager
          accountRows={accountRows}
          cashRows={cashRows}
          totalIn={totalIn}
          totalOut={totalOut}
          netCash={netCash}
        />
      </div>
    </main>
  );
}
