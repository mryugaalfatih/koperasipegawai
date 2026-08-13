import fs from "fs";
import path from "path";
import pg from "pg";

const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v) env[k.trim()] = v.join("=").trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const projectRef = url.replace("https://", "").split(".")[0];
const sql = fs.readFileSync(path.join(process.cwd(), "scripts", "create_toko_schema.sql"), "utf-8");

const possibleUrls = [
  env.DATABASE_URL,
  env.POSTGRES_URL,
  `postgres://postgres.qqtyogedtzilayxebzld:${env.SUPABASE_DB_PASSWORD || 'postgres'}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres:${env.SUPABASE_DB_PASSWORD || 'postgres'}@db.${projectRef}.supabase.co:5432/postgres`,
].filter(Boolean);

async function tryConnect() {
  for (const connStr of possibleUrls) {
    try {
      console.log("Trying connection:", connStr.replace(/:[^:@]+@/, ":***@"));
      const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log("CONNECTED successfully!");
      await client.query(sql);
      console.log("SQL executed successfully!");
      await client.end();
      return true;
    } catch (err) {
      console.log("Connection failed:", err.message);
    }
  }
  return false;
}

tryConnect().then((success) => {
  if (!success) {
    console.log("\n[INFO] Please run scripts/create_toko_schema.sql in your Supabase SQL Editor if database tables are not yet created.");
  }
});
