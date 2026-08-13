import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v) env[k.trim()] = v.join("=").trim();
});

console.log("DB URL Keys:", Object.keys(env).filter(k => k.toLowerCase().includes("db") || k.toLowerCase().includes("postgres") || k.toLowerCase().includes("url") || k.toLowerCase().includes("key")));
