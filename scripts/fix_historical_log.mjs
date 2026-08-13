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

async function fixHistoricalLog() {
  const logId = "da1dafa6-11df-42d6-b2aa-f36e3b676b97";
  const unitId = "4f6d0e29-4a91-42d9-85fb-a66b74c3f551"; // Pusat Kopkar Manunggal Perkasa (formerly USP)

  const { data: log } = await supabase.from("audit_logs").select("metadata").eq("id", logId).single();

  if (log) {
    const updatedMeta = {
      ...log.metadata,
      closing_unit_id: unitId,
      closing_unit_code: "PUSAT",
      closing_unit_name: "Pusat Kopkar Manunggal Perkasa",
    };

    const { error } = await supabase
      .from("audit_logs")
      .update({ metadata: updatedMeta })
      .eq("id", logId);

    if (error) console.error("Error updating log:", error);
    else console.log("Successfully updated historical closing log metadata!");
  }
}

fixHistoricalLog();
