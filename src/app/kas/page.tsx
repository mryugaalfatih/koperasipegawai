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

type ApprovedLoanRow = {
  id: string;
  principal: number;
  tenor_months: number;
  interest_method: string;
  annual_rate_snapshot: number | null;
  members: { full_name: string; member_no: string }[] | null;
  loan_products: { name: string }[] | null;
};

type ClosingLogRow = {
  id: string;
  created_at: string;
  actor_id: string;
  metadata: {
    closing_date?: string;
    system_balance?: number;
    physical_balance?: number;
    variance?: number;
    status?: string;
    notes?: string;
    denominations?: {
      d100k?: number;
      d50k?: number;
      d20k?: number;
      d10k?: number;
      d5k?: number;
      d2k?: number;
      d1k?: number;
      dCoin?: number;
    };
  };
  profiles?: { full_name: string } | { full_name: string }[] | null;
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

  const [{ data: profile }, { data: accounts }, { data: cashTransactions }, { data: approvedLoans }, { data: closingLogs }, { data: journalEntries }, { data: businessUnits }] = await Promise.all([
    supabase.from("profiles").select("id, allowed_unit_codes").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("cash_transactions")
      .select("id, direction, amount, source_type, description, transaction_date")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("loans")
      .select("id, principal, tenor_months, interest_method, annual_rate_snapshot, members(full_name, member_no), loan_products(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, created_at, actor_id, metadata")
      .eq("action", "cash.closing.posted")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, status, source_id")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("business_units").select("id, code, name").order("code"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const rawCashTransactions = cashTransactions ?? [];
  const allJournals = journalEntries ?? [];
  const approvedLoanRows = (approvedLoans ?? []) as unknown as ApprovedLoanRow[];
  const closingRows = (closingLogs ?? []) as unknown as ClosingLogRow[];

  const journalStatusMap = new Map(
    allJournals.map((j) => [j.source_id, j.status])
  );

  const cashRows = rawCashTransactions.map((ct) => ({
    ...ct,
    journal_status: journalStatusMap.get(ct.id) ?? "approved",
  }));

  const pendingManagerRows = allJournals
    .filter((j) => ["pending_manager", "draft"].includes(j.status ?? ""))
    .map((j) => ({
      id: j.id,
      entry_no: j.entry_no,
      entry_date: j.entry_date,
      memo: j.memo,
    }));

  const totalIn = cashRows
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const totalOut = cashRows
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const netCash = totalIn - totalOut;

  const businessUnitRows = (businessUnits ?? []) as { id: string; code: string; name: string }[];

  // Resolve user's assigned unit safely from allowed_unit_codes array
  const rawUnitCodes = (profile as { allowed_unit_codes?: string[] | null }).allowed_unit_codes;
  const userUnitCodes = Array.isArray(rawUnitCodes) ? rawUnitCodes : [];
  
  // If user is restricted to exactly 1 unit, lock UI to that unit
  const userUnit = userUnitCodes.length === 1
    ? businessUnitRows.find((u) => u.code.toLowerCase() === userUnitCodes[0].toLowerCase() || u.name.toLowerCase().includes(userUnitCodes[0].toLowerCase())) ?? null
    : null;

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
          approvedLoans={approvedLoanRows}
          closingRows={closingRows}
          pendingManagerRows={pendingManagerRows}
          businessUnits={businessUnitRows}
          userUnit={userUnit}
        />
      </div>
    </main>
  );
}
