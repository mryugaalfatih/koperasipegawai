const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function clearData() {
  console.log("Starting cleanup of ALL trial data...");

  // Delete loan payments
  const { error: err1 } = await supabase.from('loan_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete loan_payments:", err1 ? err1.message : "Success");

  // Delete loan installments
  const { error: err2 } = await supabase.from('loan_installments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete loan_installments:", err2 ? err2.message : "Success");

  // Delete loans
  const { error: err3 } = await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete loans:", err3 ? err3.message : "Success");

  // Delete savings transactions
  const { error: err7 } = await supabase.from('savings_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete savings_transactions:", err7 ? err7.message : "Success");

  // Delete savings accounts
  const { error: err8 } = await supabase.from('savings_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete savings_accounts:", err8 ? err8.message : "Success");

  // Delete journal lines
  const { error: err4 } = await supabase.from('journal_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete journal_lines:", err4 ? err4.message : "Success");

  // Delete journal entries
  const { error: err5 } = await supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete journal_entries:", err5 ? err5.message : "Success");

  // Delete cash transactions
  const { error: err6 } = await supabase.from('cash_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Delete cash_transactions:", err6 ? err6.message : "Success");

  console.log("Cleanup complete!");
}

clearData();
