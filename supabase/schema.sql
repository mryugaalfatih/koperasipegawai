create extension if not exists "pgcrypto";

create type member_status as enum ('active', 'inactive', 'resigned');
create type savings_type as enum ('pokok', 'wajib', 'sukarela');
create type loan_status as enum ('draft', 'submitted', 'review', 'approved', 'disbursed', 'closed', 'rejected');
create type transaction_direction as enum ('in', 'out');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references public.branches(id),
  full_name text not null,
  role text not null default 'operator',
  phone text,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  member_no text not null unique,
  full_name text not null,
  nik text,
  phone text,
  address text,
  joined_at date not null default current_date,
  status member_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.savings_accounts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  type savings_type not null,
  account_no text not null unique,
  balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.savings_accounts(id),
  direction transaction_direction not null,
  amount numeric(18,2) not null check (amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.loan_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  annual_rate numeric(7,4) not null default 0,
  max_tenor_months int not null,
  admin_fee_percent numeric(7,4) not null default 0,
  is_active boolean not null default true
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  product_id uuid not null references public.loan_products(id),
  principal numeric(18,2) not null check (principal > 0),
  tenor_months int not null check (tenor_months > 0),
  status loan_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id),
  installment_no int not null,
  due_date date not null,
  principal_due numeric(18,2) not null default 0,
  interest_due numeric(18,2) not null default 0,
  penalty_due numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  paid_at timestamptz,
  unique (loan_id, installment_no)
);

create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  direction transaction_direction not null,
  amount numeric(18,2) not null check (amount > 0),
  source_type text not null,
  source_id uuid,
  description text,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  normal_balance transaction_direction not null
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  entry_no text not null unique,
  entry_date date not null default current_date,
  memo text,
  source_type text,
  source_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  check (debit >= 0 and credit >= 0 and debit <> credit)
);

create table public.shu_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  year int not null,
  net_surplus numeric(18,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  unique (branch_id, year)
);

create table public.shu_allocations (
  id uuid primary key default gen_random_uuid(),
  shu_period_id uuid not null references public.shu_periods(id) on delete cascade,
  component text not null,
  percent numeric(7,4) not null check (percent >= 0),
  amount numeric(18,2) not null default 0
);

create table public.shu_member_distributions (
  id uuid primary key default gen_random_uuid(),
  shu_period_id uuid not null references public.shu_periods(id) on delete cascade,
  member_id uuid not null references public.members(id),
  savings_service_amount numeric(18,2) not null default 0,
  loan_service_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  unique (shu_period_id, member_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.savings_accounts enable row level security;
alter table public.savings_transactions enable row level security;
alter table public.loan_products enable row level security;
alter table public.loans enable row level security;
alter table public.loan_installments enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.shu_periods enable row level security;
alter table public.shu_allocations enable row level security;
alter table public.shu_member_distributions enable row level security;
alter table public.audit_logs enable row level security;
