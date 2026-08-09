"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function writeAuditLog(
  supabase: SupabaseClient,
  profileId: string,
  action: string,
  tableName: string,
  recordId: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    actor_id: profileId,
    action,
    table_name: tableName,
    record_id: recordId,
    metadata,
  });
}

async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id, branch_id").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  let branchId = profile.branch_id as string | null;

  if (!branchId) {
    const { data: branch } = await supabase.from("branches").select("id").order("created_at").limit(1).single();
    branchId = (branch?.id as string | undefined) ?? null;
  }

  if (!branchId) {
    redirect("/laporan?error=Cabang%20belum%20tersedia.%20Buat%20cabang%20di%20konfigurasi.");
  }

  return { supabase, profileId: profile.id as string, branchId };
}

export async function createShuSimulation(formData: FormData) {
  const { supabase, profileId, branchId } = await requireProfile();
  const year = numberValue(formData.get("year"), new Date().getFullYear());
  const netSurplus = numberValue(formData.get("net_surplus"));

  if (netSurplus <= 0) {
    redirect("/laporan?error=SHU%20bersih%20harus%20lebih%20dari%200.#shu");
  }

  const { data: period, error: periodError } = await supabase
    .from("shu_periods")
    .insert({
      branch_id: branchId,
      year,
      net_surplus: netSurplus,
      status: "draft",
    })
    .select("id")
    .single();

  if (periodError || !period) {
    redirect(`/laporan?error=${encodeURIComponent(periodError?.message ?? "Simulasi SHU gagal dibuat.")}#shu`);
  }

  const { data: rules } = await supabase
    .from("shu_allocation_rules")
    .select("component, percent")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("component");

  const allocations = (rules ?? []).map((rule) => ({
    shu_period_id: period.id,
    component: rule.component,
    percent: Number(rule.percent ?? 0),
    amount: Math.round((netSurplus * Number(rule.percent ?? 0)) / 100),
  }));

  if (allocations.length) {
    const { error: allocationError } = await supabase.from("shu_allocations").insert(allocations);

    if (allocationError) {
      redirect(`/laporan?error=${encodeURIComponent(allocationError.message)}#shu`);
    }
  }

  await writeAuditLog(supabase, profileId, "shu.simulation.created", "shu_periods", period.id, {
    year,
    net_surplus: netSurplus,
    allocation_count: allocations.length,
  });

  revalidatePath("/laporan");
  revalidatePath("/audit");
  redirect("/laporan?saved=shu#shu");
}
