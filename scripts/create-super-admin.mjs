import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(file) {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...rest] = trimmed.split("=");
      const value = rest.join("=").replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional file.
  }
}

loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@koperasi.local";
const password = process.env.SUPER_ADMIN_PASSWORD ?? "Password12345";
const fullName = process.env.SUPER_ADMIN_NAME ?? "Super Admin";

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("SUPER_ADMIN_PASSWORD minimal 8 karakter.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: branch, error: branchError } = await supabase
  .from("branches")
  .select("id")
  .eq("code", "PST")
  .maybeSingle();

if (branchError) {
  console.error(`Gagal membaca cabang PST: ${branchError.message}`);
  process.exit(1);
}

let branchId = branch?.id;

if (!branchId) {
  const { data: newBranch, error: createBranchError } = await supabase
    .from("branches")
    .insert({ code: "PST", name: "Koperasi Pusat", address: "Jakarta" })
    .select("id")
    .single();

  if (createBranchError) {
    console.error(`Gagal membuat cabang PST: ${createBranchError.message}`);
    process.exit(1);
  }

  branchId = newBranch.id;
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName,
    role: "super_admin",
  },
});

let userId = created.user?.id;

if (createError) {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  const existingUser = usersData?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (listError || !existingUser) {
    console.error(`Gagal membuat user Auth: ${createError.message}`);
    process.exit(1);
  }

  userId = existingUser.id;

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "super_admin",
    },
  });

  if (updateError) {
    console.error(`User sudah ada, tapi gagal reset password: ${updateError.message}`);
    process.exit(1);
  }
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: userId,
  branch_id: branchId,
  full_name: fullName,
  role: "super_admin",
  phone: null,
});

if (profileError) {
  console.error(`Gagal membuat profile super admin: ${profileError.message}`);
  process.exit(1);
}

console.log(`Super admin siap: ${email}`);
console.log("Password mengikuti SUPER_ADMIN_PASSWORD atau default Password12345.");
