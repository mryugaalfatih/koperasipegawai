-- ====================================================================
-- MIGRASI SQL: STORAGE & DUKUNGAN FOTO PROFIL / KTP ANGGOTA
-- Tanggal: 10 Agustus 2026
-- Deskripsi: Menambahkan kolom photo_url & ktp_url serta membuat storage bucket member-photos
-- ====================================================================

-- 1. Tambahkan Kolom photo_url dan ktp_url pada Tabel public.members
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='photo_url') then
    alter table public.members add column photo_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='members' and column_name='ktp_url') then
    alter table public.members add column ktp_url text;
  end if;
end $$;

-- 2. Buat Storage Bucket 'member-photos' (Publik)
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do update set public = true;

-- 3. Kebijakan Keamanan RLS Storage (Objects)
drop policy if exists "Public Read Member Photos" on storage.objects;
create policy "Public Read Member Photos"
  on storage.objects for select
  using (bucket_id = 'member-photos');

drop policy if exists "Authenticated Upload Member Photos" on storage.objects;
create policy "Authenticated Upload Member Photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-photos');

drop policy if exists "Authenticated Update Member Photos" on storage.objects;
create policy "Authenticated Update Member Photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'member-photos');
