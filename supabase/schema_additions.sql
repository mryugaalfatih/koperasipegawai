do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('pending', 'verified', 'rejected');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fiscal_period_status') then
    create type fiscal_period_status as enum ('open', 'closed', 'locked');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'loan_payment_status') then
    create type loan_payment_status as enum ('posted', 'reversed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'interest_method') then
    create type interest_method as enum ('flat', 'annuity');
  end if;
end $$;

create table if not exists public.cooperative_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_number text,
  address text,
  phone text,
  email text,
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_app_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (member_id, user_id),
  unique (user_id)
);

create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  status document_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type savings_type not null,
  minimum_balance numeric(18,2) not null default 0,
  monthly_required_amount numeric(18,2) not null default 0,
  withdrawable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.savings_accounts
  add column if not exists product_id uuid references public.savings_products(id),
  add column if not exists closed_at timestamptz;

alter table public.savings_transactions
  add column if not exists reference_no text,
  add column if not exists reversed_transaction_id uuid references public.savings_transactions(id);

create table if not exists public.loan_documents (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  status document_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.loan_products
  add column if not exists default_interest_method interest_method not null default 'flat',
  add column if not exists allow_method_override boolean not null default false;

alter table public.loans
  add column if not exists interest_method interest_method not null default 'flat',
  add column if not exists annual_rate_snapshot numeric(7,4),
  add column if not exists admin_fee_percent_snapshot numeric(7,4);

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id),
  installment_id uuid references public.loan_installments(id),
  payment_date date not null default current_date,
  principal_paid numeric(18,2) not null default 0,
  interest_paid numeric(18,2) not null default 0,
  penalty_paid numeric(18,2) not null default 0,
  total_paid numeric(18,2) generated always as (principal_paid + interest_paid + penalty_paid) stored,
  status loan_payment_status not null default 'posted',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (principal_paid >= 0 and interest_paid >= 0 and penalty_paid >= 0),
  check ((principal_paid + interest_paid + penalty_paid) > 0)
);

create table if not exists public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  year int not null,
  month int not null check (month between 1 and 12),
  status fiscal_period_status not null default 'open',
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (branch_id, year, month)
);

create table if not exists public.shu_allocation_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  component text not null,
  percent numeric(7,4) not null check (percent >= 0),
  basis text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_branch_status on public.members(branch_id, status);
create index if not exists idx_savings_accounts_member on public.savings_accounts(member_id);
create index if not exists idx_savings_transactions_account_date on public.savings_transactions(account_id, transaction_date);
create index if not exists idx_loans_member_status on public.loans(member_id, status);
create index if not exists idx_loan_installments_due_date on public.loan_installments(due_date);
create index if not exists idx_loan_payments_loan_date on public.loan_payments(loan_id, payment_date);
create index if not exists idx_journal_entries_branch_date on public.journal_entries(branch_id, entry_date);
create index if not exists idx_journal_lines_account on public.journal_lines(account_id);

create or replace view public.v_member_savings_summary
with (security_invoker = true) as
select
  m.id as member_id,
  m.member_no,
  m.full_name,
  m.branch_id,
  coalesce(sum(sa.balance) filter (where sa.type = 'pokok'), 0) as simpanan_pokok,
  coalesce(sum(sa.balance) filter (where sa.type = 'wajib'), 0) as simpanan_wajib,
  coalesce(sum(sa.balance) filter (where sa.type = 'sukarela'), 0) as simpanan_sukarela,
  coalesce(sum(sa.balance), 0) as total_simpanan
from public.members m
left join public.savings_accounts sa on sa.member_id = m.id
group by m.id, m.member_no, m.full_name, m.branch_id;

create or replace view public.v_loan_outstanding
with (security_invoker = true) as
select
  l.id as loan_id,
  l.member_id,
  m.branch_id,
  m.member_no,
  m.full_name,
  l.status,
  l.principal,
  coalesce(sum(li.principal_due + li.interest_due + li.penalty_due - li.paid_amount), 0) as outstanding_amount,
  min(li.due_date) filter (where li.paid_at is null) as next_due_date
from public.loans l
join public.members m on m.id = l.member_id
left join public.loan_installments li on li.loan_id = l.id
group by l.id, l.member_id, m.branch_id, m.member_no, m.full_name, l.status, l.principal;

create or replace view public.v_profit_loss_monthly
with (security_invoker = true) as
select
  je.branch_id,
  extract(year from je.entry_date)::int as year,
  extract(month from je.entry_date)::int as month,
  coalesce(sum(jl.credit - jl.debit) filter (where a.category = 'income'), 0) as total_income,
  coalesce(sum(jl.debit - jl.credit) filter (where a.category = 'expense'), 0) as total_expense,
  coalesce(sum(jl.credit - jl.debit) filter (where a.category = 'income'), 0)
    - coalesce(sum(jl.debit - jl.credit) filter (where a.category = 'expense'), 0) as net_surplus
from public.journal_entries je
join public.journal_lines jl on jl.journal_entry_id = je.id
join public.accounts a on a.id = jl.account_id
group by je.branch_id, extract(year from je.entry_date), extract(month from je.entry_date);

alter table public.member_app_links enable row level security;
alter table public.cooperative_profiles enable row level security;
alter table public.member_documents enable row level security;
alter table public.savings_products enable row level security;
alter table public.loan_documents enable row level security;
alter table public.loan_payments enable row level security;
alter table public.fiscal_periods enable row level security;
alter table public.shu_allocation_rules enable row level security;
