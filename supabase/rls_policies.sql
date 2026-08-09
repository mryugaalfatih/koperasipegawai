create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('super_admin', 'admin', 'pengurus', 'bendahara', 'operator', 'auditor'), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

create or replace function public.is_linked_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_app_links mal
    where mal.user_id = auth.uid()
      and mal.member_id = target_member_id
  )
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'branches',
    'cooperative_profiles',
    'profiles',
    'members',
    'member_app_links',
    'member_documents',
    'savings_products',
    'savings_accounts',
    'savings_transactions',
    'loan_products',
    'loans',
    'loan_installments',
    'loan_documents',
    'loan_payments',
    'cash_transactions',
    'accounts',
    'journal_entries',
    'journal_lines',
    'fiscal_periods',
    'shu_periods',
    'shu_allocation_rules',
    'shu_allocations',
    'shu_member_distributions',
    'audit_logs'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'super admin full access', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin())',
      'super admin full access',
      table_name
    );
  end loop;
end $$;

drop policy if exists "staff can read branches" on public.branches;
create policy "staff can read branches"
on public.branches for select
to authenticated
using (public.is_staff());

drop policy if exists "staff can manage own branch members" on public.members;
create policy "staff can manage own branch members"
on public.members for all
to authenticated
using (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()))
with check (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()));

drop policy if exists "members can read own member profile" on public.members;
create policy "members can read own member profile"
on public.members for select
to authenticated
using (public.is_linked_member(id));

drop policy if exists "profiles can read self" on public.profiles;
create policy "profiles can read self"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists "staff can manage savings accounts" on public.savings_accounts;
create policy "staff can manage savings accounts"
on public.savings_accounts for all
to authenticated
using (
  public.is_staff()
  and exists (
    select 1 from public.members m
    where m.id = member_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
)
with check (
  public.is_staff()
  and exists (
    select 1 from public.members m
    where m.id = member_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
);

drop policy if exists "members can read own savings accounts" on public.savings_accounts;
create policy "members can read own savings accounts"
on public.savings_accounts for select
to authenticated
using (public.is_linked_member(member_id));

drop policy if exists "staff can manage savings transactions" on public.savings_transactions;
create policy "staff can manage savings transactions"
on public.savings_transactions for all
to authenticated
using (
  public.is_staff()
  and exists (
    select 1
    from public.savings_accounts sa
    join public.members m on m.id = sa.member_id
    where sa.id = account_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
)
with check (
  public.is_staff()
  and exists (
    select 1
    from public.savings_accounts sa
    join public.members m on m.id = sa.member_id
    where sa.id = account_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
);

drop policy if exists "members can read own savings transactions" on public.savings_transactions;
create policy "members can read own savings transactions"
on public.savings_transactions for select
to authenticated
using (
  exists (
    select 1
    from public.savings_accounts sa
    where sa.id = account_id
      and public.is_linked_member(sa.member_id)
  )
);

drop policy if exists "staff can manage loans" on public.loans;
create policy "staff can manage loans"
on public.loans for all
to authenticated
using (
  public.is_staff()
  and exists (
    select 1 from public.members m
    where m.id = member_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
)
with check (
  public.is_staff()
  and exists (
    select 1 from public.members m
    where m.id = member_id
      and (public.is_super_admin() or m.branch_id = public.current_branch_id())
  )
);

drop policy if exists "members can read own loans" on public.loans;
create policy "members can read own loans"
on public.loans for select
to authenticated
using (public.is_linked_member(member_id));

drop policy if exists "staff can read accounting" on public.accounts;
create policy "staff can read accounting"
on public.accounts for select
to authenticated
using (public.is_staff());

drop policy if exists "staff can manage journal entries" on public.journal_entries;
create policy "staff can manage journal entries"
on public.journal_entries for all
to authenticated
using (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()))
with check (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()));

drop policy if exists "staff can manage journal lines" on public.journal_lines;
create policy "staff can manage journal lines"
on public.journal_lines for all
to authenticated
using (
  public.is_staff()
  and exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and (public.is_super_admin() or je.branch_id = public.current_branch_id())
  )
)
with check (
  public.is_staff()
  and exists (
    select 1
    from public.journal_entries je
    where je.id = journal_entry_id
      and (public.is_super_admin() or je.branch_id = public.current_branch_id())
  )
);

drop policy if exists "staff can manage cash transactions" on public.cash_transactions;
create policy "staff can manage cash transactions"
on public.cash_transactions for all
to authenticated
using (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()))
with check (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()));

drop policy if exists "staff can manage shu periods" on public.shu_periods;
create policy "staff can manage shu periods"
on public.shu_periods for all
to authenticated
using (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()))
with check (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()));

drop policy if exists "staff can manage shu allocations" on public.shu_allocations;
create policy "staff can manage shu allocations"
on public.shu_allocations for all
to authenticated
using (
  public.is_staff()
  and exists (
    select 1
    from public.shu_periods sp
    where sp.id = shu_period_id
      and (public.is_super_admin() or sp.branch_id = public.current_branch_id())
  )
)
with check (
  public.is_staff()
  and exists (
    select 1
    from public.shu_periods sp
    where sp.id = shu_period_id
      and (public.is_super_admin() or sp.branch_id = public.current_branch_id())
  )
);

drop policy if exists "staff can read shu rules" on public.shu_allocation_rules;
create policy "staff can read shu rules"
on public.shu_allocation_rules for select
to authenticated
using (public.is_super_admin() or (public.is_staff() and branch_id = public.current_branch_id()));

drop policy if exists "staff can read audit logs" on public.audit_logs;
create policy "staff can read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_staff());

drop policy if exists "staff can create audit logs" on public.audit_logs;
create policy "staff can create audit logs"
on public.audit_logs for insert
to authenticated
with check (public.is_staff() and actor_id = auth.uid());
