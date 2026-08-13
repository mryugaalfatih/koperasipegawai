"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

export async function createBusinessUnit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const code = text(formData.get("code")).toUpperCase();
  const name = text(formData.get("name"));
  const description = text(formData.get("description"));

  if (!code || !name) {
    redirect("/unit-usaha?error=Kode%20dan%20Nama%20Unit%20Usaha%20wajib%20diisi.");
  }

  const { error } = await supabase.from("business_units").insert({
    code,
    name,
    description,
    is_active: true,
  });

  if (error) {
    redirect(`/unit-usaha?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/unit-usaha");
  redirect("/unit-usaha?created=true");
}

export async function toggleBusinessUnitStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = text(formData.get("id"));
  const currentActive = text(formData.get("is_active")) === "true";

  if (!id) {
    redirect("/unit-usaha?error=ID%20Unit%20Usaha%20tidak%20valid.");
  }

  const { error } = await supabase
    .from("business_units")
    .update({ is_active: !currentActive })
    .eq("id", id);

  if (error) {
    redirect(`/unit-usaha?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/unit-usaha");
  redirect("/unit-usaha?updated=true");
}

export async function updateBusinessUnit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = text(formData.get("id"));
  const code = text(formData.get("code")).toUpperCase();
  const name = text(formData.get("name"));
  const description = text(formData.get("description"));

  if (!id || !code || !name) {
    redirect("/unit-usaha?error=ID,%20Kode,%20dan%20Nama%20Unit%20Usaha%20wajib%20diisi.");
  }

  const { error } = await supabase
    .from("business_units")
    .update({
      code,
      name,
      description,
    })
    .eq("id", id);

  if (error) {
    redirect(`/unit-usaha?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/unit-usaha");
  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  revalidatePath("/laporan");
  redirect("/unit-usaha?updated=true");
}

