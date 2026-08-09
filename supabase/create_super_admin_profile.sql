-- Jalankan setelah membuat user di Supabase Auth.
-- Ganti email di bawah sesuai email super admin yang dibuat.

insert into public.profiles (id, branch_id, full_name, role, phone)
select
  u.id,
  b.id,
  'Super Admin',
  'super_admin',
  null
from auth.users u
cross join public.branches b
where u.email = 'superadmin@koperasi.local'
  and b.code = 'PST'
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  full_name = excluded.full_name,
  role = 'super_admin',
  phone = excluded.phone;
