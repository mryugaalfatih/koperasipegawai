import { Banknote } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AkuntansiClientManager } from "./AkuntansiClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type AkuntansiPageProps = {
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

type JournalLineRow = {
  debit: number;
  credit: number;
  accounts: {
    code: string;
    name: string;
    id?: string;
  } | {
    code: string;
    name: string;
    id?: string;
  }[] | null;
};

type JournalRow = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string | null;
  source_type: string | null;
  status: string | null;
  journal_lines: JournalLineRow[];
};

export default async function AkuntansiPage({ searchParams }: AkuntansiPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accounts }, { data: journalEntries }, { data: businessUnits }, { data: cooperativeProfile }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).single(),
    supabase.from("accounts").select("id, code, name, category").order("code"),
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, memo, source_type, status, journal_lines(debit, credit, accounts(id, code, name))")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("business_units").select("id, code, name").eq("is_active", true).order("code"),
    supabase.from("cooperative_profiles").select("name, legal_number, address, phone, email").order("created_at").limit(1).maybeSingle(),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const journalRows = (journalEntries ?? []) as unknown as JournalRow[];
  const businessUnitRows = (businessUnits ?? []) as { id: string; code: string; name: string }[];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <ToastNotification error={params.error} saved={params.saved} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <div>
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/90 px-2 py-2 backdrop-blur md:px-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Modul Pembukuan</p>
                <h1 className="text-xl font-bold text-[#0b1220]">Akuntansi, Jurnal & Buku Besar</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="inline-flex h-9 items-center gap-2 rounded-2xl bg-white px-2 text-xs font-bold text-[#0b1220] shadow-sm ring-1 ring-[#dbe5f1] hover:bg-slate-50 transition-all"
                  href="/kas"
                >
                  <span>Lihat Kas Harian</span>
                  <Banknote className="size-4 text-[#2563eb]" />
                </Link>
              </div>
            </div>
          </header>

          <AkuntansiClientManager
            accountRows={accountRows}
            journalRows={journalRows}
            businessUnits={businessUnitRows}
            cooperativeProfile={cooperativeProfile}
          />
        </div>
      </div>
    </main>
  );
}
