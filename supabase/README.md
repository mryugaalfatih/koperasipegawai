# Supabase Setup

Jalankan file SQL lewat Supabase SQL Editor dengan urutan berikut:

1. `schema.sql`
   - Struktur awal: cabang, user profile, anggota, simpanan, pinjaman, kas, jurnal, SHU, audit.

2. `schema_additions.sql`
   - Tambahan untuk demo serius: dokumen anggota/pinjaman, produk simpanan, pembayaran pinjaman, periode akuntansi, rule SHU, index, dan view laporan.
   - Jika sudah pernah dijalankan, aman dijalankan ulang untuk menambahkan profil koperasi dan kolom metode bunga pinjaman.

3. `seed.sql`
   - Data awal: cabang pusat, produk pinjaman, produk simpanan, COA, dan rule SHU default.

4. `create_super_admin_profile.sql`
   - Buat user terlebih dahulu di Supabase Auth, misalnya `superadmin@koperasi.local`.
   - Ganti email di file SQL jika berbeda.
   - Jalankan file ini untuk memberi role `super_admin`.

5. `rls_policies.sql`
   - Jalankan setelah user Supabase Auth dan data `profiles` siap.
   - File ini aman dijalankan ulang karena policy lama akan di-drop lalu dibuat ulang.
   - Jika dijalankan terlalu awal, akses aplikasi bisa terkunci karena RLS aktif tetapi belum ada role user.

## Hirarki Role

| Role | Hak Akses |
| --- | --- |
| `super_admin` | Hak akses penuh lintas cabang dan modul |
| `admin` | Kelola data cabang sesuai branch |
| `pengurus` | Approval, monitoring, dan laporan |
| `bendahara` | Kas, jurnal, laporan keuangan |
| `operator` | Input anggota, simpanan, angsuran |
| `auditor` | Akses baca laporan dan audit |
| anggota mobile | Hanya data miliknya sendiri |

## Catatan Env

Untuk aplikasi Next.js, gunakan `.env.local` saat development lokal:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Jangan commit service role key ke repository.
