"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  if (profile.role !== "super_admin") {
    redirect("/home");
  }

  return { supabase, profileId: profile.id as string };
}

async function writeAuditLog(
  supabase: SupabaseClient,
  profileId: string,
  action: string,
  recordId: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    actor_id: profileId,
    action,
    table_name: "profiles",
    record_id: recordId,
    metadata,
  });
}

export async function createUserProfile(formData: FormData) {
  const { supabase, profileId } = await requireSuperAdmin();
  const email = clean(formData.get("email"));
  const password = clean(formData.get("password"));
  const fullName = clean(formData.get("full_name"));
  const role = clean(formData.get("role")) ?? "operator";
  const branchId = clean(formData.get("branch_id"));

  if (!email || !password || !fullName || !branchId) {
    redirect("/users?error=Email,%20password,%20nama,%20dan%20cabang%20wajib%20diisi.");
  }

  if (password.length < 8) {
    redirect("/users?error=Password%20sementara%20minimal%208%20karakter.");
  }

  let adminClient: ReturnType<typeof createAdminClient>;

  try {
    adminClient = createAdminClient();
  } catch (error) {
    redirect(`/users?error=${encodeURIComponent(error instanceof Error ? error.message : "Service role key belum siap.")}`);
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (authError || !authData.user) {
    redirect(`/users?error=${encodeURIComponent(authError?.message ?? "User Auth gagal dibuat.")}`);
  }

  const { error } = await supabase.from("profiles").insert({
    id: authData.user.id,
    branch_id: branchId,
    full_name: fullName,
    role,
    phone: clean(formData.get("phone")),
  });

  if (error) {
    redirect(`/users?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "user.account.created", authData.user.id, {
    email,
    role,
    branch_id: branchId,
  });

  revalidatePath("/users");
  revalidatePath("/audit");
  redirect("/users?saved=created");
}

export async function updateUserProfile(userId: string, formData: FormData) {
  const { supabase, profileId } = await requireSuperAdmin();
  const fullName = clean(formData.get("full_name"));
  const role = clean(formData.get("role")) ?? "operator";
  const branchId = clean(formData.get("branch_id"));

  if (!fullName || !branchId) {
    redirect("/users?error=Nama%20dan%20cabang%20wajib%20diisi.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      branch_id: branchId,
      full_name: fullName,
      role,
      phone: clean(formData.get("phone")),
    })
    .eq("id", userId);

  if (error) {
    redirect(`/users?error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog(supabase, profileId, "user.profile.updated", userId, {
    role,
    branch_id: branchId,
  });

  revalidatePath("/users");
  revalidatePath("/audit");
  redirect("/users?saved=updated");
}
