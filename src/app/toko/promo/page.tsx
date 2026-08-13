import { redirect } from "next/navigation";
import { TokoPromoClientManager, TokoPromoRow } from "./TokoPromoClientManager";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { ToastNotification } from "@/components/ToastNotification";
import { mobileNavItems, navItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/server";

type TokoPromoPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const initialPromos: TokoPromoRow[] = [
  {
    id: "promo_1",
    title: "Paket Sembako Berkah Ramadan 5kg + 2L",
    code: "RAMADAN52",
    type: "bundling",
    value: 5000,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    isActive: true,
    description: "Beli Beras Ramos 5kg + Minyak Goreng 2L potongan hemat Rp 5.000.",
  },
  {
    id: "promo_2",
    title: "Diskon Khusus Anggota Koperasi 5%",
    code: "MEMBER5",
    type: "discount_percent",
    value: 5,
    startDate: "2026-08-01",
    endDate: "2026-12-31",
    isActive: true,
    description: "Diskon tambahan 5% untuk setiap transaksi pembelian umum anggota.",
  },
  {
    id: "promo_3",
    title: "Voucher Belanja Sembako Rp 10.000",
    code: "SEMBAKO10",
    type: "discount_flat",
    value: 10000,
    startDate: "2026-08-10",
    endDate: "2026-08-25",
    isActive: true,
    description: "Potongan Rp 10.000 dengan minimal belanja toko Rp 200.000.",
  },
];

export default async function TokoPromoPage({ searchParams }: TokoPromoPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      {params.saved ? <ToastNotification saved={params.saved} /> : null}
      {params.error ? <ToastNotification error={params.error} /> : null}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[auto_1fr]">
        <DashboardNavigation mobileNavItems={mobileNavItems} navItems={navItems} />

        <section className="min-w-0 pb-20 lg:pb-8">
          <div className="px-2 py-2 md:px-2 md:py-2">
            <TokoPromoClientManager promos={initialPromos} />
          </div>
        </section>
      </div>
    </main>
  );
}
