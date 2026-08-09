"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createMember(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const requestedBranchId = clean(formData.get("branch_id"));
  const branchId = profile.role === "super_admin" && requestedBranchId ? requestedBranchId : profile.branch_id;
  const fullName = clean(formData.get("full_name"));

  if (!branchId || !fullName) {
    redirect("/anggota?error=Nama%20anggota%20dan%20cabang%20wajib%20diisi.");
  }

  const memberNo = clean(formData.get("member_no")) ?? `AGT-${Date.now().toString().slice(-8)}`;
  const joinedAt = clean(formData.get("joined_at")) ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("members").insert({
    branch_id: branchId,
    member_no: memberNo,
    full_name: fullName,
    nik: clean(formData.get("nik")),
    phone: clean(formData.get("phone")),
    address: clean(formData.get("address")),
    joined_at: joinedAt,
    status: "active",
  });

  if (error) {
    redirect(`/anggota?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anggota");
  redirect("/anggota?created=1");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
