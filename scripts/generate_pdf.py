import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

pdf_path = r"e:\Project\koperasi\docs\Dokumen_Perancangan_Arsitektur_Multi_Unit_Usaha_Koperasi.pdf"
os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

styles = getSampleStyleSheet()

# Custom Palette
PRIMARY = colors.HexColor("#07152f")
SECONDARY = colors.HexColor("#2563eb")
DARK_TEXT = colors.HexColor("#0b1220")
MUTED_TEXT = colors.HexColor("#475569")
LIGHT_BG = colors.HexColor("#f4f7fb")
BORDER_COLOR = colors.HexColor("#dbe5f1")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=PRIMARY,
    alignment=TA_LEFT
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=SECONDARY,
    alignment=TA_LEFT
)

h1_style = ParagraphStyle(
    'SectionH1',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=17,
    textColor=PRIMARY,
    spaceBefore=14,
    spaceAfter=6
)

h2_style = ParagraphStyle(
    'SectionH2',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=SECONDARY,
    spaceBefore=10,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'BodyDark',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=DARK_TEXT,
    alignment=TA_LEFT
)

body_bold = ParagraphStyle(
    'BodyDarkBold',
    parent=body_style,
    fontName='Helvetica-Bold'
)

bullet_style = ParagraphStyle(
    'BulletText',
    parent=body_style,
    leftIndent=15,
    spaceAfter=3
)

story = []

# Title & Header
story.append(Paragraph("KOPERASIPRO - SISTEM INFORMASI KOPERASI DIGITAL", subtitle_style))
story.append(Spacer(1, 4))
story.append(Paragraph("DOKUMEN PERANCANGAN ARSITEKTUR & STRUKTUR HAK AKSES MULTI-UNIT USAHA KOPERASI", title_style))
story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=2, color=SECONDARY, spaceBefore=2, spaceAfter=12))

# Metadata Table
meta_data = [
    [
        Paragraph("<b>Tanggal Dokumen:</b> 10 Agustus 2026", body_style),
        Paragraph("<b>Versi Sistem:</b> KoperasiPro v2.0 (Multi-Unit Ready)", body_style),
    ],
    [
        Paragraph("<b>Modul Utama:</b> Unit Simpan Pinjam (USP), Toko, & Jasa", body_style),
        Paragraph("<b>Status Arsitektur:</b> Diterapkan di Lokal (Local Ready)", body_style),
    ]
]
meta_table = Table(meta_data, colWidths=[260, 270])
meta_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
    ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
    ('PADDING', (0, 0), (-1, -1), 8),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(meta_table)
story.append(Spacer(1, 14))

# 1. Ringkasan Eksekutif
story.append(Paragraph("1. Ringkasan Eksekutif (Executive Summary)", h1_style))
story.append(Paragraph(
    "Dokumen ini menyajikan perancangan arsitektur dan struktur hak akses untuk Koperasi yang memiliki <b>beberapa Unit Usaha (Multi-Unit Business)</b>. "
    "Sistem KoperasiPro dirancang secara terpadu sehingga setiap unit usaha (Simpan Pinjam, Toko/Waserda, Jasa & Penyewaan) memiliki alur kerja dan menu spesifik, "
    "namun tetap terintegrasi dalam satu Master Anggota Tunggal dan Akuntansi Konsolidasi.",
    body_style
))
story.append(Spacer(1, 10))

# 2. Hak Akses Dinamis Berdasarkan Role
story.append(Paragraph("2. Struktur Hak Akses Menu Berdasarkan Role & Jabatan", h1_style))
story.append(Paragraph(
    "Untuk menjamin keamanan data dan kenyamanan pengoperasian harian, tampilan menu navigasi disaring secara otomatis (<i>Dynamic Menu Filtering</i>) "
    "berdasarkan role pengguna saat login:",
    body_style
))
story.append(Spacer(1, 6))

role_table_data = [
    [Paragraph("<b>Role / Jabatan</b>", body_bold), Paragraph("<b>Tampilan Menu Navigasi</b>", body_bold), Paragraph("<b>Wewenang / Hak Akses</b>", body_bold)],
    [
        Paragraph("<b>Super Admin & Pengurus Pusat</b>", body_style),
        Paragraph("Menu Lengkap (Home, Anggota, Simpanan, Pinjaman, Keuangan, Akuntansi, Laporan, User, Setup)", body_style),
        Paragraph("Full Akses Lintas Cabang & Unit Usaha, Pengaturan Parameter, & Switch Unit Usaha.", body_style)
    ],
    [
        Paragraph("<b>Teller / Operator Simpan Pinjam (USP)</b>", body_style),
        Paragraph("Menu Operasional USP (Home, Anggota, Simpanan, Pinjaman, Keuangan Kas, Laporan Unit)", body_style),
        Paragraph("Terisolasi pada transaksi USP. Menu User, Setup Konfigurasi, dan Audit Log otomatis di-hide.", body_style)
    ],
    [
        Paragraph("<b>Kasir / Operator Unit Toko (Waserda)</b>", body_style),
        Paragraph("Menu Operasional Toko (Home Toko, Kasir POS, Stok & Barang, Pembelian, Kas Toko, Laporan Toko)", body_style),
        Paragraph("Terfokus pada transaksi Kasir POS ritel, inventaris barang, dan penjualan tunai/kredit.", body_style)
    ],
    [
        Paragraph("<b>Operator Unit Jasa & Penyewaan</b>", body_style),
        Paragraph("Menu Operasional Jasa (Home Jasa, Booking & Sewa, Master Aset & Tarif, Kas Jasa, Laporan Jasa)", body_style),
        Paragraph("Terfokus pada pemesanan sewa aset, jadwal keberangkatan/sewa, dan perawatan aset.", body_style)
    ],
    [
        Paragraph("<b>Auditor / Pengawas</b>", body_style),
        Paragraph("Menu Audit (Home, Keuangan Kas, Laporan Keuangan, Audit Log)", body_style),
        Paragraph("Read-only untuk pemeriksaan pembukuan, jurnal umum, dan jejak aktivitas sistem.", body_style)
    ],
]

role_table = Table(role_table_data, colWidths=[120, 210, 200])
role_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('PADDING', (0, 0), (-1, -1), 6),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(role_table)
story.append(Spacer(1, 14))

# 3. Detail Tampilan Menu per Unit Usaha
story.append(Paragraph("3. Detail Tampilan Menu per Devisi Unit Usaha", h1_style))

# Unit USP
story.append(Paragraph("A. Unit Usaha Simpan Pinjam (USP)", h2_style))
story.append(Paragraph("• <b>Home (Dashboard USP):</b> Ringkasan Total Simpanan, Outstanding Pinjaman, Kas USP, & SHU Berjalan.", bullet_style))
story.append(Paragraph("• <b>Anggota:</b> Master data anggota koperasi, registrasi anggota baru, NIK, HP, & status keanggotaan.", bullet_style))
story.append(Paragraph("• <b>Simpanan:</b> Setoran & penarikan simpanan pokok, wajib, sukarela, serta mutasi rekening.", bullet_style))
story.append(Paragraph("• <b>Pinjaman:</b> Pengajuan pinjaman, approval pengurus, pencairan, dan pembayaran angsuran.", bullet_style))
story.append(Paragraph("• <b>Keuangan Kas:</b> Input kas masuk/keluar operasional USP & cetak kuitansi transaksi.", bullet_style))
story.append(Spacer(1, 6))

# Unit Waserda
story.append(Paragraph("B. Unit Toko / Waserda (Pertokoan Ritel)", h2_style))
story.append(Paragraph("• <b>Home (Dashboard Toko):</b> Omset penjualan harian, barang terlaris, & sisa piutang belanja anggota.", bullet_style))
story.append(Paragraph("• <b>Kasir POS (Penjualan):</b> Layanan kasir cepat (Barcode scanner, bayar tunai / potong gaji / simpanan).", bullet_style))
story.append(Paragraph("• <b>Stok & Inventaris:</b> Master produk barang, kategori, harga beli/jual, & notifikasi stok menipis.", bullet_style))
story.append(Paragraph("• <b>Pembelian & Supplier:</b> Input barang masuk dari supplier & tagihan hutang dagang toko.", bullet_style))
story.append(Paragraph("• <b>Kas Toko & Laporan:</b> Setoran kasir harian, HPP, laba kotor toko, & rekap belanja anggota.", bullet_style))
story.append(Spacer(1, 6))

# Unit Jasa
story.append(Paragraph("C. Unit Jasa & Penyewaan Aset", h2_style))
story.append(Paragraph("• <b>Home (Dashboard Jasa):</b> Jadwal sewa aktif hari ini, estimasi omset sewa, & status kesiapan aset.", bullet_style))
story.append(Paragraph("• <b>Penyewaan & Booking:</b> Form transaksi sewa aset (Tanggal sewa/kembali, penyewa, & deposit).", bullet_style))
story.append(Paragraph("• <b>Master Aset & Tarif:</b> Daftar aset (kendaraan/gedung/peralatan), tarif sewa, & status maintenance.", bullet_style))
story.append(Paragraph("• <b>Kas Jasa & Laporan:</b> Uang sewa masuk, refund deposit, biaya perawatan, & laba bersih sewa.", bullet_style))
story.append(Spacer(1, 14))

# 4. Integrasi & Keunggulan
story.append(Paragraph("4. Integrasi Terpadu & Konsolidasi SHU", h1_style))
story.append(Paragraph(
    "<b>1. Single Member Master:</b> Anggota yang sama cukup terdaftar 1 kali. Anggota tersebut dapat menyimpan uang di USP, belanja di Waserda, dan menyewa aset di Unit Jasa.<br/>"
    "<b>2. Pembukuan Otomatis (Auto-Journal):</b> Setiap transaksi kas dari seluruh unit usaha otomatis dicatat ke dalam jurnal umum per unit.<br/>"
    "<b>3. Laba Rugi Per Unit & Konsolidasi:</b> Pengurus dapat mencetak laporan Laba/Rugi per unit usaha maupun Laporan Keuangan Konsolidasi gabungan.<br/>"
    "<b>4. Distribusi SHU Akhir Tahun:</b> Seluruh net surplus dari unit USP, Toko, dan Jasa digabungkan secara akurat untuk dibagikan sebagai SHU Anggota pada RAT.",
    body_style
))
story.append(Spacer(1, 16))

# Footer Stamp
story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=8, spaceAfter=8))
story.append(Paragraph("Dokumen ini dihasilkan secara otomatis oleh sistem KoperasiPro. Hak Cipta © 2026 KoperasiPro.", ParagraphStyle('FooterText', parent=body_style, fontSize=8, textColor=MUTED_TEXT, alignment=TA_CENTER)))

doc.build(story)
print(f"PDF successfully generated at: {pdf_path}")
