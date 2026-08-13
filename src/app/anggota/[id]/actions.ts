"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = ["active", "inactive", "resigned"] as const;

export async function updateMemberStatus(memberId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "");

  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    redirect(`/anggota/${memberId}?error=Status%20anggota%20tidak%20valid.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, allowed_unit_codes")
    .eq("id", user.id)
    .single();

  const canManage =
    profile?.role === "super_admin" ||
    profile?.role === "admin" ||
    profile?.allowed_unit_codes?.includes("*") ||
    profile?.allowed_unit_codes?.includes("PUSAT");

  if (!canManage) {
    redirect(`/anggota/${memberId}?error=${encodeURIComponent("Akses ditolak. Perubahan status anggota hanya dapat dilakukan oleh Admin Pusat.")}`);
  }

  const { error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", memberId);

  if (error) {
    redirect(`/anggota/${memberId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anggota");
  revalidatePath(`/anggota/${memberId}`);
  redirect(`/anggota/${memberId}?updated=1`);
}
