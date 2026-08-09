"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function requireProfile() {
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

  return { supabase, profileId: profile.id as string };
}

export async function createDemoAuditLog(formData: FormData) {
  const { supabase, profileId } = await requireProfile();
  const action = clean(formData.get("action")) ?? "demo.audit.checked";
  const tableName = clean(formData.get("table_name")) ?? "audit_logs";

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: profileId,
    action,
    table_name: tableName,
    metadata: {
      source: "web_admin_demo",
      note: clean(formData.get("note")) ?? "Catatan audit untuk kebutuhan demo live",
    },
  });

  if (error) {
    redirect(`/audit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/audit");
  redirect("/audit?saved=1");
}
