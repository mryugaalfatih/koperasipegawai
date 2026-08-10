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

  const photoFile = formData.get("photo") as File | null;
  const ktpFile = formData.get("ktp_file") as File | null;
  let photoUrl: string | null = null;
  let ktpUrl: string | null = null;

  const memberId = `mem_${Date.now()}`;

  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `avatars/${memberId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("member-photos").upload(path, photoFile, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
  }

  if (ktpFile && ktpFile.size > 0) {
    const ext = ktpFile.name.split(".").pop() || "jpg";
    const path = `ktp/${memberId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("member-photos").upload(path, ktpFile, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
      ktpUrl = data.publicUrl;
    }
  }

  const { error } = await supabase.from("members").insert({
    branch_id: branchId,
    member_no: memberNo,
    full_name: fullName,
    nik: clean(formData.get("nik")),
    phone: clean(formData.get("phone")),
    address: clean(formData.get("address")),
    joined_at: joinedAt,
    status: "active",
    photo_url: photoUrl,
    ktp_url: ktpUrl,
    email: clean(formData.get("email")),
    gender: clean(formData.get("gender")),
    birth_place: clean(formData.get("birth_place")),
    birth_date: clean(formData.get("birth_date")),
    department: clean(formData.get("department")),
    employee_no: clean(formData.get("employee_no")),
    bank_name: clean(formData.get("bank_name")),
    bank_account_no: clean(formData.get("bank_account_no")),
    bank_account_name: clean(formData.get("bank_account_name")),
    heir_name: clean(formData.get("heir_name")),
    heir_relation: clean(formData.get("heir_relation")),
    heir_phone: clean(formData.get("heir_phone")),
  });

  if (error) {
    redirect(`/anggota?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anggota");
  redirect("/anggota?created=1");
}

export async function updateMember(memberId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = clean(formData.get("full_name"));
  const status = clean(formData.get("status")) ?? "active";

  if (!memberId || !fullName) {
    redirect("/anggota?error=ID%20dan%20Nama%20anggota%20wajib%20diisi.");
  }

  const photoFile = formData.get("photo") as File | null;
  const ktpFile = formData.get("ktp_file") as File | null;
  let photoUrl: string | null = clean(formData.get("existing_photo_url"));
  let ktpUrl: string | null = clean(formData.get("existing_ktp_url"));

  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `avatars/${memberId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("member-photos").upload(path, photoFile, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
  }

  if (ktpFile && ktpFile.size > 0) {
    const ext = ktpFile.name.split(".").pop() || "jpg";
    const path = `ktp/${memberId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("member-photos").upload(path, ktpFile, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
      ktpUrl = data.publicUrl;
    }
  }

  const joinedAt = clean(formData.get("joined_at")) ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("members")
    .update({
      full_name: fullName,
      nik: clean(formData.get("nik")),
      phone: clean(formData.get("phone")),
      address: clean(formData.get("address")),
      joined_at: joinedAt,
      status,
      photo_url: photoUrl,
      ktp_url: ktpUrl,
      email: clean(formData.get("email")),
      gender: clean(formData.get("gender")),
      birth_place: clean(formData.get("birth_place")),
      birth_date: clean(formData.get("birth_date")),
      department: clean(formData.get("department")),
      employee_no: clean(formData.get("employee_no")),
      bank_name: clean(formData.get("bank_name")),
      bank_account_no: clean(formData.get("bank_account_no")),
      bank_account_name: clean(formData.get("bank_account_name")),
      heir_name: clean(formData.get("heir_name")),
      heir_relation: clean(formData.get("heir_relation")),
      heir_phone: clean(formData.get("heir_phone")),
    })
    .eq("id", memberId);

  if (error) {
    redirect(`/anggota?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anggota");
  revalidatePath(`/anggota/${memberId}`);
  redirect("/anggota?saved=updated");
}



export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

