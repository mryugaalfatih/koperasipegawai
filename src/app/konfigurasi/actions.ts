"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  const clean = String(value ?? "").trim();
  return clean.length ? clean : null;
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  return supabase;
}

export async function saveCooperativeProfile(formData: FormData) {
  const supabase = await requireUser();
  const profileId = text(formData.get("id"));
  const payload = {
    name: text(formData.get("name")) ?? "Koperasi",
    legal_number: text(formData.get("legal_number")),
    address: text(formData.get("address")),
    phone: text(formData.get("phone")),
    email: text(formData.get("email")),
    fiscal_year_start_month: numberValue(formData.get("fiscal_year_start_month"), 1),
    updated_at: new Date().toISOString(),
  };

  const request = profileId
    ? supabase.from("cooperative_profiles").update(payload).eq("id", profileId)
    : supabase.from("cooperative_profiles").insert(payload);

  const { error } = await request;

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#profil`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=profil#profil");
}

export async function createBranch(formData: FormData) {
  const supabase = await requireUser();
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));

  if (!code || !name) {
    redirect("/konfigurasi?error=Kode%20dan%20nama%20cabang%20wajib%20diisi.#cabang");
  }

  const { error } = await supabase.from("branches").insert({
    code,
    name,
    address: text(formData.get("address")),
  });

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#cabang`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=cabang#cabang");
}

export async function createFiscalPeriod(formData: FormData) {
  const supabase = await requireUser();
  const branchId = text(formData.get("branch_id"));

  if (!branchId) {
    redirect("/konfigurasi?error=Cabang%20wajib%20dipilih.#tahun-buku");
  }

  const { error } = await supabase.from("fiscal_periods").insert({
    branch_id: branchId,
    year: numberValue(formData.get("year"), new Date().getFullYear()),
    month: numberValue(formData.get("month"), 1),
    status: "open",
  });

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#tahun-buku`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=tahun-buku#tahun-buku");
}

export async function createSavingsProduct(formData: FormData) {
  const supabase = await requireUser();
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));

  if (!code || !name) {
    redirect("/konfigurasi?error=Kode%20dan%20nama%20produk%20simpanan%20wajib%20diisi.#simpanan");
  }

  const { error } = await supabase.from("savings_products").insert({
    code,
    name,
    type: text(formData.get("type")) ?? "sukarela",
    minimum_balance: numberValue(formData.get("minimum_balance")),
    monthly_required_amount: numberValue(formData.get("monthly_required_amount")),
    withdrawable: formData.get("withdrawable") === "on",
    is_active: true,
  });

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#simpanan`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=simpanan#simpanan");
}

export async function createLoanProduct(formData: FormData) {
  const supabase = await requireUser();
  const name = text(formData.get("name"));

  if (!name) {
    redirect("/konfigurasi?error=Nama%20produk%20pinjaman%20wajib%20diisi.#pinjaman");
  }

  const { error } = await supabase.from("loan_products").insert({
    name,
    annual_rate: numberValue(formData.get("annual_rate")),
    max_tenor_months: numberValue(formData.get("max_tenor_months"), 12),
    admin_fee_percent: numberValue(formData.get("admin_fee_percent")),
    default_interest_method: text(formData.get("default_interest_method")) ?? "flat",
    allow_method_override: formData.get("allow_method_override") === "on",
    is_active: true,
  });

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#pinjaman`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=pinjaman#pinjaman");
}

export async function updateSavingsProduct(productId: string, formData: FormData) {
  const supabase = await requireUser();
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));

  if (!productId || !code || !name) {
    redirect("/konfigurasi?error=Kode%20dan%20nama%20produk%20simpanan%20wajib%20diisi.#simpanan");
  }

  const { error } = await supabase
    .from("savings_products")
    .update({
      code,
      name,
      type: text(formData.get("type")) ?? "sukarela",
      minimum_balance: numberValue(formData.get("minimum_balance")),
      monthly_required_amount: numberValue(formData.get("monthly_required_amount")),
      withdrawable: formData.get("withdrawable") === "on",
    })
    .eq("id", productId);

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#simpanan`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=simpanan_updated#simpanan");
}

export async function updateLoanProduct(productId: string, formData: FormData) {
  const supabase = await requireUser();
  const name = text(formData.get("name"));

  if (!productId || !name) {
    redirect("/konfigurasi?error=Nama%20produk%20pinjaman%20wajib%20diisi.#pinjaman");
  }

  const { error } = await supabase
    .from("loan_products")
    .update({
      name,
      annual_rate: numberValue(formData.get("annual_rate")),
      max_tenor_months: numberValue(formData.get("max_tenor_months"), 12),
      admin_fee_percent: numberValue(formData.get("admin_fee_percent")),
      default_interest_method: text(formData.get("default_interest_method")) ?? "flat",
      allow_method_override: formData.get("allow_method_override") === "on",
    })
    .eq("id", productId);

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#pinjaman`);
  }

  revalidatePath("/konfigurasi");
  redirect("/konfigurasi?saved=pinjaman_updated#pinjaman");
}

export async function createAccount(formData: FormData) {
  const supabase = await requireUser();
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));
  const category = text(formData.get("category")) ?? "asset";
  const normalBalance = text(formData.get("normal_balance")) ?? (category === "asset" || category === "expense" ? "in" : "out");

  if (!code || !name) {
    redirect("/konfigurasi?error=Kode%20dan%20nama%20akun%20COA%20wajib%20diisi.#coa");
  }

  const { error } = await supabase.from("accounts").insert({
    code,
    name,
    category,
    normal_balance: normalBalance,
  });

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#coa`);
  }

  revalidatePath("/konfigurasi");
  revalidatePath("/akuntansi");
  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  redirect("/konfigurasi?saved=coa_created#coa");
}

export async function updateAccount(accountId: string, formData: FormData) {
  const supabase = await requireUser();
  const code = text(formData.get("code"));
  const name = text(formData.get("name"));
  const category = text(formData.get("category")) ?? "asset";
  const normalBalance = text(formData.get("normal_balance")) ?? (category === "asset" || category === "expense" ? "in" : "out");

  if (!accountId || !code || !name) {
    redirect("/konfigurasi?error=Kode%20dan%20nama%20akun%20COA%20wajib%20diisi.#coa");
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      code,
      name,
      category,
      normal_balance: normalBalance,
    })
    .eq("id", accountId);

  if (error) {
    redirect(`/konfigurasi?error=${encodeURIComponent(error.message)}#coa`);
  }

  revalidatePath("/konfigurasi");
  revalidatePath("/akuntansi");
  revalidatePath("/kas");
  revalidatePath("/kas-jurnal");
  redirect("/konfigurasi?saved=coa_updated#coa");
}
