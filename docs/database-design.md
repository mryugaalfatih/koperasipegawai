# Rancangan Database KoperasiPro

## Prinsip Desain

Database dibuat untuk koperasi simpan pinjam yang membutuhkan audit transaksi, laporan laba rugi, dan pembagian SHU. Prinsip utama:

- Transaksi finansial tidak dihapus, koreksi memakai transaksi pembalik.
- Saldo dapat disimpan untuk performa, tetapi sumber kebenaran tetap mutasi transaksi dan jurnal.
- Semua transaksi operasional penting memiliki jejak ke jurnal akuntansi.
- Akses anggota mobile dibatasi oleh Row Level Security.
- Formula bunga dan SHU dibuat configurable agar bisa disesuaikan setelah deal project.

## Modul Dan Tabel

| Modul | Tabel Utama | Fungsi |
| --- | --- | --- |
| Organisasi | `branches`, `profiles` | Cabang, user admin/operator, role |
| Anggota | `members`, `member_documents`, `member_app_links` | Data anggota, dokumen KYC, koneksi user mobile |
| Simpanan | `savings_products`, `savings_accounts`, `savings_transactions` | Produk simpanan, rekening anggota, mutasi |
| Pinjaman | `loan_products`, `loans`, `loan_installments`, `loan_payments`, `loan_documents` | Produk pinjaman, pengajuan, jadwal, pembayaran |
| Kas | `cash_transactions` | Kas masuk/keluar operasional |
| Akuntansi | `accounts`, `journal_entries`, `journal_lines`, `fiscal_periods` | COA, jurnal, buku besar, periode |
| Laporan | `v_profit_loss_monthly`, `v_member_savings_summary`, `v_loan_outstanding` | Laporan agregat |
| SHU | `shu_periods`, `shu_allocation_rules`, `shu_allocations`, `shu_member_distributions` | Simulasi dan distribusi SHU |
| Audit | `audit_logs` | Jejak aksi user |

## Relasi Inti

```text
branches 1--n members
branches 1--n profiles
members 1--n savings_accounts
savings_accounts 1--n savings_transactions
members 1--n loans
loan_products 1--n loans
loans 1--n loan_installments
loans 1--n loan_payments
branches 1--n journal_entries
journal_entries 1--n journal_lines
accounts 1--n journal_lines
shu_periods 1--n shu_allocations
shu_periods 1--n shu_member_distributions
members 1--n shu_member_distributions
```

## Alur Simpanan

1. Anggota dibuat di `members`.
2. Sistem membuat rekening di `savings_accounts` untuk simpanan pokok/wajib/sukarela.
3. Setoran/penarikan masuk ke `savings_transactions`.
4. Sistem membuat `cash_transactions`.
5. Sistem membuat jurnal:
   - Setoran: Debit Kas, Kredit Simpanan Anggota.
   - Penarikan: Debit Simpanan Anggota, Kredit Kas.

## Alur Pinjaman

1. Pengajuan dibuat di `loans` status `submitted`.
2. Sistem mengambil default metode bunga dari `loan_products`.
3. Metode yang didukung adalah `flat` dan `annuity`.
4. Metode final disimpan di `loans.interest_method` sebagai snapshot pinjaman.
5. Dokumen masuk ke `loan_documents`.
6. Approval mengubah status ke `approved`.
7. Pencairan mengubah status ke `disbursed` dan membuat `loan_installments`.
8. Pembayaran masuk ke `loan_payments`, lalu update `loan_installments`.
9. Jurnal:
   - Pencairan: Debit Piutang Pinjaman, Kredit Kas.
   - Angsuran: Debit Kas, Kredit Piutang Pinjaman dan Pendapatan Jasa.

Default metode bunga disiapkan di produk pinjaman, tetapi pengurus/admin dapat mengubahnya saat pengajuan jika `allow_method_override` aktif. Pinjaman lama tidak ikut berubah jika aturan produk pinjaman diubah di kemudian hari.

## Laba Rugi

Laba rugi dibaca dari jurnal berdasarkan `accounts.category`:

- `income`: pendapatan jasa, administrasi, denda.
- `expense`: biaya operasional, gaji, ATK, penyusutan, biaya lain.

View `v_profit_loss_monthly` menyiapkan agregat per cabang dan bulan.

## SHU

SHU memakai `shu_periods` sebagai tahun/periode tutup buku.

Komponen yang disiapkan:

- Cadangan koperasi.
- Jasa simpanan anggota.
- Jasa pinjaman anggota.
- Dana pengurus/karyawan.
- Dana sosial dan pendidikan.

Basis pembagian anggota:

- Jasa simpanan dihitung dari proporsi saldo/rata-rata simpanan.
- Jasa pinjaman dihitung dari proporsi jasa pinjaman yang dibayar anggota.

Formula final bisa disesuaikan setelah AD/ART dan kesepakatan project dikunci.

## Catatan Supabase

- `auth.users` dipakai untuk user admin dan anggota mobile.
- `profiles` menyimpan role internal.
- `member_app_links` menghubungkan akun login mobile ke anggota.
- RLS dibuat bertahap: admin/pengurus melihat sesuai cabang, anggota hanya melihat data sendiri.
- Dokumen KYC dan pinjaman disimpan di Supabase Storage, database menyimpan metadata path.
