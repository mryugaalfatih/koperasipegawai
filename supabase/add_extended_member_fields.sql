-- ====================================================================
-- MIGRASI SQL: PENAMBAHAN FIELD KELENGKAPAN MASTER ANGGOTA KOPERASI
-- Tanggal: 10 Agustus 2026
-- Deskripsi: Menambahkan field identitas, pekerjaan, rekening bank, & ahli waris
-- ====================================================================

do $$
begin
  -- 1. Identitas & Kontak Lengkap
  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='email') then
    alter table public.members add column email text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='gender') then
    alter table public.members add column gender text check (gender in ('male', 'female', 'L', 'P'));
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='birth_place') then
    alter table public.members add column birth_place text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='birth_date') then
    alter table public.members add column birth_date date;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='mother_name') then
    alter table public.members add column mother_name text;
  end if;

  -- 2. Pekerjaan & Instansi (Sangat penting untuk Koperasi Karyawan / Potong Gaji)
  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='employee_no') then
    alter table public.members add column employee_no text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='department') then
    alter table public.members add column department text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='job_title') then
    alter table public.members add column job_title text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='monthly_income') then
    alter table public.members add column monthly_income numeric default 0;
  end if;

  -- 3. Rekening Bank Pencairan / Transfer SHU
  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='bank_name') then
    alter table public.members add column bank_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='bank_account_no') then
    alter table public.members add column bank_account_no text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='bank_account_name') then
    alter table public.members add column bank_account_name text;
  end if;

  -- 4. Ahli Waris & Kontak Darurat (Untuk klaim pinjaman / duka)
  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='heir_name') then
    alter table public.members add column heir_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='heir_relation') then
    alter table public.members add column heir_relation text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='heir_phone') then
    alter table public.members add column heir_phone text;
  end if;

end $$;
