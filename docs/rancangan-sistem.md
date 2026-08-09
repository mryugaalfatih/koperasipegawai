# Rancangan Sistem Koperasi Simpan Pinjam

## Tujuan Demo

Demo ini menampilkan kerangka aplikasi koperasi simpan pinjam berbasis web untuk admin/pengurus, dengan arah implementasi menggunakan Next.js dan Supabase. Fokus tahap demo:

- Dashboard operasional koperasi.
- Modul anggota, simpanan, pinjaman, kas, akuntansi, laporan laba rugi, dan SHU.
- Rancangan database awal untuk Supabase.
- Arah aplikasi mobile anggota setelah project disetujui.

## Aktor Sistem

| Aktor | Kebutuhan Utama |
| --- | --- |
| Admin sistem | Kelola user, role, cabang, parameter koperasi |
| Pengurus | Monitoring kinerja, approval pinjaman, laporan |
| Bendahara | Kas masuk/keluar, jurnal, rekonsiliasi |
| Teller/operator | Input simpanan, angsuran, pencairan |
| Anggota | Cek saldo, pinjaman, tagihan, SHU via mobile |
| Auditor | Akses laporan dan audit trail |

## Modul Web Admin

1. Anggota
   - Registrasi anggota.
   - Status aktif, nonaktif, keluar.
   - Nomor anggota dan dokumen KYC.
   - Riwayat simpanan, pinjaman, transaksi, dan SHU.

2. Simpanan
   - Simpanan pokok.
   - Simpanan wajib.
   - Simpanan sukarela.
   - Mutasi setoran/penarikan.
   - Rekap per anggota dan periode.

3. Pinjaman
   - Pengajuan pinjaman.
   - Verifikasi dokumen.
   - Approval komite/pengurus.
   - Pencairan.
   - Jadwal angsuran.
   - Pembayaran angsuran.
   - Tunggakan dan denda.

4. Kas dan Akuntansi
   - Kas masuk/keluar.
   - Chart of accounts.
   - Jurnal otomatis.
   - Buku besar.
   - Neraca saldo.

5. Laporan
   - Laporan anggota.
   - Laporan simpanan.
   - Laporan pinjaman.
   - Aging tunggakan.
   - Arus kas.
   - Laba rugi.
   - Neraca.
   - SHU.

6. SHU
   - Formula pembagian SHU dapat dikonfigurasi.
   - Komponen cadangan, jasa simpanan, jasa pinjaman, pengurus/karyawan, sosial/pendidikan.
   - Simulasi sebelum tutup buku.
   - Distribusi final ke anggota.

## Aplikasi Mobile Anggota

Mobile app dapat dibuat setelah demo web disetujui. Rekomendasi teknis:

- Expo React Native untuk pengembangan cepat.
- Supabase Auth untuk login anggota.
- Push notification untuk jatuh tempo angsuran.
- Storage Supabase untuk dokumen pinjaman.
- API policy sama dengan web admin melalui RLS.

Fitur mobile:

- E-kartu anggota.
- Saldo dan mutasi simpanan.
- Riwayat pinjaman dan jadwal angsuran.
- Pengajuan pinjaman.
- Upload dokumen.
- Notifikasi transaksi dan jatuh tempo.
- Estimasi SHU personal.

## Arsitektur

```text
Web Admin Next.js
        |
        | Supabase JS/SSR
        v
Supabase Auth - PostgreSQL - Storage - Realtime
        ^
        | Supabase JS
Mobile App Expo React Native
```

## Strategi Data

- Semua transaksi finansial disimpan sebagai event yang tidak diedit langsung.
- Koreksi dilakukan dengan transaksi pembalik/adjustment.
- Jurnal akuntansi dibuat otomatis dari transaksi operasional.
- Audit log mencatat aksi user penting.
- Row Level Security membatasi akses per role dan anggota.

## Alur Demo Live

1. Tampilkan dashboard ringkasan.
2. Jelaskan saldo simpanan, portofolio pinjaman, dan estimasi SHU.
3. Masuk ke cerita workflow pengajuan pinjaman.
4. Tunjukkan laporan laba rugi dan distribusi SHU.
5. Tutup dengan roadmap mobile anggota dan Supabase database.

## Keputusan Yang Dikunci Bertahap

- Metode bunga pinjaman yang didukung: flat dan anuitas.
- Default metode bunga ditentukan di produk pinjaman.
- Saat pengajuan, admin/pengurus dapat mengubah metode jika produk mengizinkan.
- Formula SHU final sesuai AD/ART koperasi.
- Struktur multi-cabang atau satu koperasi.
- Format laporan resmi dan kop dokumen.
- Integrasi payment gateway, WhatsApp, atau e-signature.
