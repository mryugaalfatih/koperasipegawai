# Konfigurasi Sebelum Aplikasi Dipakai

## 1. Organisasi

- Nama koperasi.
- Legalitas dan nomor badan hukum.
- Alamat, kontak, logo, dan kop laporan.
- Cabang/unit layanan jika ada.
- Tahun buku dan periode tutup buku.

## 2. User Dan Role

- Super admin.
- Admin cabang.
- Pengurus.
- Bendahara.
- Operator.
- Auditor.
- Anggota mobile.

Pastikan setiap user Supabase Auth memiliki baris di `profiles`.

## 3. Produk Simpanan

- Simpanan pokok.
- Simpanan wajib.
- Simpanan sukarela.
- Nominal minimal.
- Aturan penarikan.
- Saldo awal anggota.

## 4. Produk Pinjaman

- Nama produk.
- Plafon.
- Tenor maksimal.
- Bunga/jasa pinjaman.
- Metode bunga default: flat atau anuitas.
- Apakah metode bunga boleh diubah saat pengajuan.
- Biaya administrasi.
- Denda keterlambatan.
- Syarat dokumen.

Sistem mengadopsi metode flat dan anuitas. Produk pinjaman menentukan default, sedangkan pengajuan pinjaman menyimpan metode final.

## 5. Akuntansi

- Chart of accounts.
- Saldo awal kas/bank.
- Saldo awal simpanan anggota.
- Saldo awal piutang pinjaman.
- Mapping jurnal otomatis untuk:
  - Setoran simpanan.
  - Penarikan simpanan.
  - Pencairan pinjaman.
  - Pembayaran angsuran.
  - Pendapatan jasa.
  - Denda.
  - Biaya operasional.

## 6. SHU

- Persentase cadangan.
- Persentase jasa simpanan.
- Persentase jasa pinjaman.
- Dana pengurus/karyawan.
- Dana sosial dan pendidikan.
- Basis pembagian per anggota.

## 7. Dokumen Dan Notifikasi

- Template bukti setoran.
- Template kwitansi angsuran.
- Template perjanjian pinjaman.
- Format laporan laba rugi.
- Format laporan SHU.
- Email/WhatsApp/notifikasi jatuh tempo.

## 8. Keamanan

- RLS aktif.
- Policy super admin sudah dijalankan.
- Role cabang sudah diuji.
- Backup database aktif.
- Supabase Storage bucket untuk dokumen sudah dibuat.
- Service role key tidak dipakai di frontend.
