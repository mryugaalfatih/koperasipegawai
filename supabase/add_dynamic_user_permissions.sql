-- ====================================================================
-- MIGRASI SQL: HAK AKSES MENU DINAMIS & HAK AKSES MULTI-UNIT USAHA
-- Tanggal: 10 Agustus 2026
-- Deskripsi: Menambahkan kolom allowed_unit_codes dan allowed_menu_keys pada profiles
-- ====================================================================

-- 1. Tambahkan Kolom allowed_unit_codes dan allowed_menu_keys pada Tabel profiles
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='allowed_unit_codes') then
    alter table public.profiles add column allowed_unit_codes jsonb not null default '["USP"]'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='allowed_menu_keys') then
    alter table public.profiles add column allowed_menu_keys jsonb not null default '["home","anggota","simpanan","pinjaman","kas","laporan"]'::jsonb;
  end if;
end $$;

-- 2. Berikan Hak Akses Multi-Unit ("*") & Seluruh Menu pada User Ber-role Super Admin
update public.profiles
set 
  allowed_unit_codes = '["*"]'::jsonb,
  allowed_menu_keys = '["home","anggota","simpanan","pinjaman","kas","laporan","audit","users","unit-usaha","konfigurasi"]'::jsonb
where role = 'super_admin';
