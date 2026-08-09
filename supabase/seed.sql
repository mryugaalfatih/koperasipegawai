insert into public.branches (code, name, address)
values ('PST', 'Koperasi Pusat', 'Jakarta')
on conflict (code) do nothing;

insert into public.loan_products (name, annual_rate, max_tenor_months, admin_fee_percent)
select x.name, x.annual_rate, x.max_tenor_months, x.admin_fee_percent
from (
  values
    ('Modal usaha mikro', 12.0000, 24, 1.0000),
    ('Renovasi rumah', 10.5000, 36, 1.0000),
    ('Pendidikan', 9.0000, 18, 0.5000)
) as x(name, annual_rate, max_tenor_months, admin_fee_percent)
where not exists (
  select 1 from public.loan_products lp where lp.name = x.name
);

update public.loan_products
set
  default_interest_method = case
    when name = 'Renovasi rumah' then 'annuity'::interest_method
    else 'flat'::interest_method
  end,
  allow_method_override = true
where name in ('Modal usaha mikro', 'Renovasi rumah', 'Pendidikan');

insert into public.savings_products (code, name, type, minimum_balance, monthly_required_amount, withdrawable)
values
  ('SP', 'Simpanan Pokok', 'pokok', 100000.00, 0.00, false),
  ('SW', 'Simpanan Wajib', 'wajib', 0.00, 50000.00, false),
  ('SS', 'Simpanan Sukarela', 'sukarela', 0.00, 0.00, true)
on conflict (code) do nothing;

insert into public.accounts (code, name, category, normal_balance)
values
  ('1001', 'Kas', 'asset', 'in'),
  ('1002', 'Bank', 'asset', 'in'),
  ('1101', 'Piutang Pinjaman Anggota', 'asset', 'in'),
  ('2101', 'Simpanan Anggota', 'liability', 'out'),
  ('3101', 'Modal Anggota', 'equity', 'out'),
  ('4101', 'Pendapatan Jasa Pinjaman', 'income', 'out'),
  ('4102', 'Pendapatan Administrasi Pinjaman', 'income', 'out'),
  ('4103', 'Pendapatan Denda', 'income', 'out'),
  ('5101', 'Beban Operasional', 'expense', 'in'),
  ('5102', 'Beban Gaji dan Honor', 'expense', 'in'),
  ('5103', 'Beban Penyusutan', 'expense', 'in')
on conflict (code) do nothing;

insert into public.shu_allocation_rules (branch_id, component, percent, basis)
select b.id, x.component, x.percent, x.basis
from public.branches b
cross join (
  values
    ('Cadangan koperasi', 30.0000, 'manual'),
    ('Jasa simpanan anggota', 25.0000, 'savings'),
    ('Jasa pinjaman anggota', 25.0000, 'loan_interest'),
    ('Dana pengurus/karyawan', 12.0000, 'manual'),
    ('Dana sosial dan pendidikan', 8.0000, 'manual')
) as x(component, percent, basis)
where b.code = 'PST'
  and not exists (
    select 1
    from public.shu_allocation_rules sar
    where sar.branch_id = b.id
      and sar.component = x.component
  );
