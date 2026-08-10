import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

pdf_path = r"e:\Project\koperasi\docs\Dokumen_Alur_dan_SOP_Modul_Simpanan_Koperasi.pdf"
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

# Palette
PRIMARY = colors.HexColor("#07152f")
SECONDARY = colors.HexColor("#2563eb")
DARK_TEXT = colors.HexColor("#0b1220")
MUTED_TEXT = colors.HexColor("#475569")
LIGHT_BG = colors.HexColor("#f4f7fb")
BORDER_COLOR = colors.HexColor("#dbe5f1")
ACCENT_GREEN = colors.HexColor("#16a34a")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=16,
    leading=20,
    textColor=PRIMARY,
    alignment=TA_LEFT
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=SECONDARY,
    alignment=TA_LEFT
)

h1_style = ParagraphStyle(
    'SectionH1',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=PRIMARY,
    spaceBefore=12,
    spaceAfter=6
)

h2_style = ParagraphStyle(
    'SectionH2',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=SECONDARY,
    spaceBefore=8,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'BodyDark',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13.5,
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
    leftIndent=12,
    spaceAfter=3
)

story = []

# Header Document
story.append(Paragraph("KOPERASIPRO - SISTEM INFORMASI KOPERASI DIGITAL", subtitle_style))
story.append(Spacer(1, 2))
story.append(Paragraph("DOKUMEN PANDUAN ALUR & SOP MODUL SIMPANAN ANGGOTA", title_style))
story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", thickness=1.5, color=SECONDARY, spaceBefore=2, spaceAfter=10))

# Executive Summary Box
summary_text = (
    "<b>Ringkasan Eksekutif:</b> Dokumen ini berisi panduan alur operasional, klasifikasi produk simpanan, "
    "prosedur transaksi (setoran & penarikan), serta mekanisme integrasi pencatatan jurnal akuntansi otomatis "
    "<i>(auto-ledger double-entry)</i> pada Modul Simpanan KoperasiPro."
)
summary_table = Table(
    [[Paragraph(summary_text, body_style)]],
    colWidths=[532]
)
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(summary_table)
story.append(Spacer(1, 10))

# 1. Klasifikasi Jenis Simpanan
story.append(Paragraph("1. KLASIFIKASI & REGULASI PRODUK SIMPANAN", h1_style))
story.append(Paragraph(
    "Sesuai regulasi UU No. 25 Tahun 1992 & Permen KUKM, simpanan anggota dikelompokkan dalam 3 kategori utama:",
    body_style
))
story.append(Spacer(1, 6))

table_data = [
    [
        Paragraph("<b>Jenis Simpanan</b>", body_bold),
        Paragraph("<b>Sifat & Ketentuan</b>", body_bold),
        Paragraph("<b>Penarikan</b>", body_bold),
        Paragraph("<b>Perlakuan Akuntansi</b>", body_bold)
    ],
    [
        Paragraph("<b>Simpanan Pokok</b>", body_style),
        Paragraph("Wajib dibayar 1x saat mendaftar menjadi anggota.", body_style),
        Paragraph("Tidak dapat ditarik selama menjadi anggota.", body_style),
        Paragraph("Ekuitas / Modal Sendiri (Akun 3001)", body_style)
    ],
    [
        Paragraph("<b>Simpanan Wajib</b>", body_style),
        Paragraph("Wajib dibayar rutin setiap bulan sesuai nominal flat.", body_style),
        Paragraph("Tidak dapat ditarik selama menjadi anggota.", body_style),
        Paragraph("Ekuitas / Modal Sendiri (Akun 3002)", body_style)
    ],
    [
        Paragraph("<b>Simpanan Sukarela</b>", body_style),
        Paragraph("Setoran sukarela tanpa jumlah minimum (mirip tabungan bank).", body_style),
        Paragraph("Dapat ditarik sewaktu-waktu oleh anggota.", body_style),
        Paragraph("Kewajiban / Utang Simpanan (Akun 2001)", body_style)
    ]
]

t_produk = Table(table_data, colWidths=[110, 150, 120, 152])
t_produk.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PRIMARY),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 6),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
]))
# Fix white text header
for i in range(4):
    t_produk._cellvalues[0][i].style.textColor = colors.white

story.append(t_produk)
story.append(Spacer(1, 10))

# 2. Alur Operasional Sistem
story.append(Paragraph("2. TAHAPAN ALUR OPERASIONAL (END-TO-END WORKFLOW)", h1_style))

steps = [
    ("Tahap 1: Registrasi Master Anggota", "Calon anggota didaftarkan melalui modul Anggota untuk menerbitkan Nomor Anggota (Member No) & NIK resmi."),
    ("Tahap 2: Pembukaan Rekening Simpanan", "Petugas membuka rekening simpanan (Pokok/Wajib/Sukarela) anggota. Sistem menerbitkan Nomor Rekening Unik (contoh: SAV-POKOK-001)."),
    ("Tahap 3: Transaksi Setoran & Penarikan", "Kasir memproses setoran (Kas Masuk) atau penarikan (Kas Keluar). Sistem memvalidasi kecukupan saldo efektif sebelum penarikan diproses."),
    ("Tahap 4: Auto-Posting Jurnal Akuntansi", "Setiap transaksi yang disetujui secara otomatis memposting ayat jurnal berpasangan (Double-Entry General Ledger) tanpa input manual ulang."),
    ("Tahap 5: Rekapitulasi & Kalkulasi SHU", "Saldo simpanan wajib & sukarela dihitung sebagai bobot persentase pembagian SHU Jasa Modal pada akhir tahun buku (RAT).")
]

for title, desc in steps:
    story.append(Paragraph(f"<b>• {title}</b>", h2_style))
    story.append(Paragraph(desc, bullet_style))
    story.append(Spacer(1, 3))

story.append(Spacer(1, 8))

# 3. Integrasi Auto-Ledger Jurnal Akuntansi
story.append(Paragraph("3. SKEMA PENCATATAN OTOMATIS JURNAL AKUNTANSI", h1_style))
story.append(Paragraph(
    "Setiap transaksi pada modul simpanan secara otomatis menghasilkan ayat jurnal akuntansi berpasangan:",
    body_style
))
story.append(Spacer(1, 6))

jurnal_data = [
    [
        Paragraph("<b>Jenis Transaksi</b>", body_bold),
        Paragraph("<b>Pos Akun Debit (Dr)</b>", body_bold),
        Paragraph("<b>Pos Akun Kredit (Cr)</b>", body_bold)
    ],
    [
        Paragraph("Setoran Simpanan Sukarela", body_style),
        Paragraph("<b>(Dr) 1001 - Kas Teller / Bank</b>", body_style),
        Paragraph("<b>(Cr) 2001 - Utang Simpanan Sukarela</b>", body_style)
    ],
    [
        Paragraph("Penarikan Simpanan Sukarela", body_style),
        Paragraph("<b>(Dr) 2001 - Utang Simpanan Sukarela</b>", body_style),
        Paragraph("<b>(Cr) 1001 - Kas Teller / Bank</b>", body_style)
    ],
    [
        Paragraph("Setoran Simpanan Pokok", body_style),
        Paragraph("<b>(Dr) 1001 - Kas Teller / Bank</b>", body_style),
        Paragraph("<b>(Cr) 3001 - Simpanan Pokok Anggota</b>", body_style)
    ],
    [
        Paragraph("Setoran Simpanan Wajib", body_style),
        Paragraph("<b>(Dr) 1001 - Kas Teller / Bank</b>", body_style),
        Paragraph("<b>(Cr) 3002 - Simpanan Wajib Anggota</b>", body_style)
    ]
]

t_jurnal = Table(jurnal_data, colWidths=[170, 181, 181])
t_jurnal.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), SECONDARY),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 6),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
]))
for i in range(3):
    t_jurnal._cellvalues[0][i].style.textColor = colors.white

story.append(t_jurnal)
story.append(Spacer(1, 14))

# Signoff footer
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=10, spaceAfter=10))
footer_text = Paragraph(
    "<b>KoperasiPro System Document</b> · Disusun & Divalidasi Otomatis oleh Antigravity Assistant Engine",
    ParagraphStyle('FooterText', parent=body_style, fontSize=8, textColor=MUTED_TEXT, alignment=TA_CENTER)
)
story.append(footer_text)

doc.build(story)
print("SUCCESS PDF GENERATED")
