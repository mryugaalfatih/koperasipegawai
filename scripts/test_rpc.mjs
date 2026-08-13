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

async function testSql() {
  const sql = fs.readFileSync(path.join(process.cwd(), "scripts", "create_toko_schema.sql"), "utf-8");
  console.log("Testing RPC sql execution...");
  const { data, error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) {
    console.log("RPC error:", error.message);
  } else {
    console.log("RPC success:", data);
  }
}

testSql();
