import { ArrowLeft, BookOpenCheck, Download, PiggyBank, Printer, Search, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LaporanSimpananClientManager } from "./LaporanSimpananClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type SavingsAccountRow = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  balance: number;
  is_active: boolean;
  members: {
    full_name: string;
    member_no: string;
  } | {
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

export default async function LaporanSimpananPage() {
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

  const { data: accounts } = await supabase
    .from("savings_accounts")
    .select("id, account_no, type, balance, is_active, members(full_name, member_no), savings_products(name, code)")
    .order("created_at", { ascending: false });

  const accountRows = (accounts ?? []) as unknown as SavingsAccountRow[];

  let totalPokok = 0;
  let totalWajib = 0;
  let totalSukarela = 0;

  accountRows.forEach((acc) => {
    const bal = Number(acc.balance ?? 0);
    if (acc.type === "pokok") totalPokok += bal;
    else if (acc.type === "wajib") totalWajib += bal;
    else if (acc.type === "sukarela") totalSukarela += bal;
  });

  const grandTotal = totalPokok + totalWajib + totalSukarela;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <LaporanSimpananClientManager
          accountRows={accountRows}
          totalPokok={totalPokok}
          totalWajib={totalWajib}
          totalSukarela={totalSukarela}
          grandTotal={grandTotal}
        />
      </div>
    </main>
  );
}
