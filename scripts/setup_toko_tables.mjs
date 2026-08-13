import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v) env[k.trim()] = v.join("=").trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokoTables() {
  console.log("Checking toko_products table...");
  const { data, error } = await supabase.from("toko_products").select("id").limit(1);
  if (error) {
    console.log("toko_products table error/missing:", error.message);
  } else {
    console.log("toko_products table exists! Rows count:", data.length);
  }
}

checkTokoTables();
