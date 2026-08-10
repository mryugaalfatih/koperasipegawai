-- ====================================================================
-- MIGRASI SQL: DUKUNGAN MULTI-UNIT USAHA KOPERASI
-- Tanggal: 10 Agustus 2026
-- Deskripsi: Menambahkan tabel business_units dan menghubungkan transaksi
-- ====================================================================

-- 1. Buat Tabel Unit Usaha Koperasi
create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.business_units enable row level security;

-- Policy RLS untuk Akses Data Unit Usaha
create policy "Allow read access to business_units for authenticated users"
  on public.business_units for select
  to authenticated
  using (true);

create policy "Allow insert/update access to business_units for authenticated users"
  on public.business_units for all
  to authenticated
  using (true);

-- 2. Isi Data Awal Unit Usaha (Seed Initial Business Units)
insert into public.business_units (code, name, description, is_active)
values 
  ('USP', 'Unit Simpan Pinjam', 'Pengelolaan simpanan pokok/wajib/sukarela, pinjaman, dan angsuran anggota', true),
  ('TOKO', 'Unit Toko / Waserda', 'Penjualan ritel barang kebutuhan anggota dan pertokoan koperasi', false),
  ('JASA', 'Unit Jasa & Penyewaan', 'Layanan jasa umum, transportasi, dan penyewaan aset koperasi', false)
on conflict (code) do update set 
  name = excluded.name,
  description = excluded.description;

-- 3. Tambahkan Kolom business_unit_id pada Tabel Pembukuan & Transaksi (Opsional / Multi-Unit Ready)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='journal_entries' and column_name='business_unit_id') then
    alter table public.journal_entries add column business_unit_id uuid references public.business_units(id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name='cash_transactions' and column_name='business_unit_id') then
    alter table public.cash_transactions add column business_unit_id uuid references public.business_units(id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name='accounts' and column_name='business_unit_id') then
    alter table public.accounts add column business_unit_id uuid references public.business_units(id);
  end if;
end $$;

-- Set default business_unit_id transaksi existing ke Unit Simpan Pinjam (USP)
do $$
declare
  v_usp_id uuid;
begin
  select id into v_usp_id from public.business_units where code = 'USP' limit 1;

  if v_usp_id is not null then
    update public.journal_entries set business_unit_id = v_usp_id where business_unit_id is null;
    update public.cash_transactions set business_unit_id = v_usp_id where business_unit_id is null;
  end if;
end $$;
