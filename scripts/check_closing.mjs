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

async function checkData() {
  console.log("=== 1. CLOSING LOGS (audit_logs) ===");
  const { data: closingLogs, error: logError } = await supabase
    .from("audit_logs")
    .select("id, created_at, metadata")
    .eq("action", "cash.closing.posted")
    .order("created_at", { ascending: false })
    .limit(10);

  if (logError) console.error("Error closing logs:", logError);
  else console.log(JSON.stringify(closingLogs, null, 2));

  console.log("\n=== 2. LAST 5 CASH TRANSACTIONS ===");
  const { data: txs, error: txError } = await supabase
    .from("cash_transactions")
    .select("id, direction, amount, description, transaction_date, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (txError) console.error("Error txs:", txError);
  else console.log(JSON.stringify(txs, null, 2));

  console.log("\n=== 3. BUSINESS UNITS ===");
  const { data: units } = await supabase.from("business_units").select("id, code, name");
  console.log(JSON.stringify(units, null, 2));
}

checkData();
