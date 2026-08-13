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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
  console.log("=== ALL BUSINESS UNITS ===");
  const { data: units } = await supabase.from("business_units").select("*");
  console.log(JSON.stringify(units, null, 2));

  console.log("\n=== ALL CLOSING LOGS ===");
  const { data: logs } = await supabase.from("audit_logs").select("*").eq("action", "cash.closing.posted");
  console.log(JSON.stringify(logs, null, 2));
}

inspect();
