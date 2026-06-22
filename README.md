# Dashboard Divisi Umum - PTPN IV

Dashboard Rekap Perjalanan Dinas Divisi Umum PTPN IV. Web application untuk mengelola, memproses, dan memvisualisasikan data pengeluaran perjalanan dinas (tiket pesawat, hotel, kereta, mobil, per diem, dll) di lingkungan PTPN IV.

---

## Cara Kerja

Sistem ini adalah **web application statis** (HTML/CSS/JS) yang berjalan sepenuhnya di browser. Tidak membutuhkan server backend atau database eksternal.

### Alur Data

```
Input Manual (input.html)  ──┐
                              ├──▶  localStorage (Browser)  ──▶  Dashboard / Export Excel
Upload Excel (upload.html) ──┘
```

1. **Input Data** - User mengisi form perjalanan dinas secara manual
2. **Upload Data** - User upload file Excel rekap data (otomatis terdeteksi format FES/US/Kustom)
3. **Penyimpanan** - Semua data disimpan di **localStorage** browser (persisten meski browser ditutup)
4. **Tampilan** - Data ditampilkan di Dashboard, Laporan, dan RKAP dalam bentuk tabel & grafik
5. **Export** - Data bisa diexport ke file Excel (.xlsx)

### Auto-Calculation

Sistem menghitung otomatis pajak dan total tagihan berdasarkan vendor:

| Vendor | Rumus Utama |
|--------|------------|
| **US** | DPP Service Fee = 11/12 x Service Fee, PPN 12%, PPH 23 = 2% x Service Fee |
| **FES** | PPH 23 = 2% x (Service Fee x Jumlah), Tagihan = (Tagihan x Jumlah) + (Service Fee x Jumlah) |
| **Lainnya** | Semua input manual |

---

## Cara Menjalankan

Project ini adalah **static website**. Cukup jalkan di browser:

### Langkah 1: Clone Repository

```bash
git clone https://github.com/muhammadtegar06/Dasboar-Divisi-Umum.git
cd Dasboar-Divisi-Umum
```

### Langkah 2: Buka di Browser

Buka file `index.html` langsung di browser (Chrome/Firefox/Edge):

```
Klik ganda index.html
```

atau gunakan Live Server di VS Code:

```
Klik kanan index.html → Open with Live Server
```

> **Tidak perlu install dependency atau menjalankan server** - semua library (Tailwind CSS, SheetJS, Google Fonts) dimuat melalui CDN.

---

## Login

Untuk mengakses sistem, gunakan kredensial berikut:

| Field | Nilai |
|-------|-------|
| **Email** | `admin` |
| **Password** | `123` |

---

## Fitur Utama

### 1. Dashboard (`index.html`)
- Ringkasan KPI: Total Pengeluaran, Jumlah Perjalanan, Rata-rata per Divisi, Trend
- Chart komposisi biaya per divisi (stacked bar chart)
- Chart porsi biaya (donut chart)
- Tabel detail pengeluaran per divisi per kategori

### 2. Input Data (`input.html`)
- Form multi-section: Informasi Umum, Kategori & Vendor, Uraian & Tanggal, Nominal & Tagihan
- Auto-calculation pajak berdasarkan vendor (US/FES/Lainnya)
- Multi-entry tabs - input banyak data dalam satu sesi
- Duplikat entri otomatis
- Preview data sebelum export
- Export ke Excel (2 sheet: Data Rekap + Detail Lengkap)

### 3. Upload Data (`upload.html`)
- Drag & Drop file Excel (.xlsx / .xls)
- Auto-detect format: FES, US, atau Kustom
- Column Mapper untuk format yang tidak dikenal
- Preview data dengan subtotal per divisi
- Upload history

### 4. Laporan (`laporan.html`)
- Tabel laporan detail dengan filter
- Export CSV dan Print Report

### 5. RKAP (`rkap.html`)
- Manajemen pagu anggaran per Divisi dan Nomor GL
- Revisi RKAP: pemindahan anggaran antar divisi, penambahan, pengurangan
- Riwayat revisi permanen untuk audit
- Realisasi vs Anggaran dengan progress bar

### 6. Pengaturan (`pengaturan.html`)
- Profil user
- Kelola daftar divisi (CRUD)
- Referensi Nomor GL
- Kategori Biaya

---

## Struktur Project

```
Dasboard_Umum/
├── index.html              # Dashboard utama
├── input.html              # Form input manual
├── upload.html             # Upload data Excel
├── laporan.html            # Halaman laporan
├── rkap.html               # RKAP & revisi anggaran
├── pengaturan.html         # Pengaturan sistem
├── generate_template.js    # Generator template Excel
├── Dokumentasi_Project.html # Dokumentasi lengkap project
├── alur_project.md         # Alur & arsitektur project
│
├── css/
│   └── input-form.css      # Styling form input
│
├── js/
│   ├── inputForm.js        # Logika form: validasi, auto-calc, localStorage, export
│   ├── excelParser.js      # Parser file Excel upload
│   └── pesawatUploadHandler.js  # Handler upload pesawat
│
└── ptpn4-laravel/          # Backend Laravel (repository terpisah)
```

---

## Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| **HTML5** | Struktur halaman |
| **Tailwind CSS** (CDN) | Styling & design system |
| **JavaScript** (Vanilla) | Logika aplikasi |
| **SheetJS** (CDL) | Parse & generate file Excel |
| **localStorage** | Database lokal (penyimpanan data di browser) |
| **Google Fonts** | Inter (UI) & JetBrains Mono (angka/finansial) |
| **Material Symbols** | Icon set |

---

## Data Divisi

Sistem mendukung 24 divisi di PTPN IV:

DSPN, DTPI, DTAN, DTPL, DINF, DITN, DPSN, DRPL, DPEN, DSKP, DSMS, DRPH, DKSH, DPBA, DAPN, DMRS, DPSB, DSDM, DHPU, DTIS, DHKT, DHKM, DPSR, DPMO

---

## Format Cost Center

```
PHO0[KODE_DIVISI]18
```

Contoh: `PHO0DAPN18` untuk Divisi DAPN

---

## Nomor GL yang Tersedia

| Kode GL | Keterangan |
|---------|-----------|
| 51100417 | Perjalanan Dinas |
| 51101073 | Biaya Tiket Moda Transportasi |
| 51100152 | Biaya Jasa Sewa Kendaraan |
| 51100158 | Biaya Mess |
| 51100420 | Biaya Akomodasi |
| 51100421 | Biaya Uang Harian |

---

## License

Internal use - PTPN IV
