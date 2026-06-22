/**
 * Script untuk generate template Excel standar pesawat.
 * Jalankan: node generate_template.js
 */

const XLSX = require('xlsx');
const path = require('path');

// ============================================================
// TEMPLATE 1: FORMAT STANDAR (untuk upload ke website)
// ============================================================
function createStandarTemplate() {
    const wb = XLSX.utils.book_new();

    const headers = [
        'No',
        'Vendor',
        'No Invoice',
        'SAP',
        'No MPP',
        'Cost Center',
        'Divisi',
        'Tagihan',
        'Service Fee',
        'DPP Service Fee',
        'PPN',
        'PPH23',
        'Tagihan Service',
        'Jumlah Tagihan',
        'Yang Dibayarkan',
        'Uraian',
    ];

    // Contoh data FES
    const sampleFES = [
        1, 'FES', '021/FES-PKU/04/2026', '51100417', 'DHPU/PPb/XXXX/2026', 'PH00DSPN18', 'DSPN',
        3280360, 164018, 0, 0, 3280, 0, 3444378, 3441098, 'Pembayaran Tiket Pesawat April 2026'
    ];

    // Contoh data US
    const sampleUS = [
        2, 'US', '', '51100417', 'DHPU/PPb/380/2026', 'PH00DSPN18', 'DSPN',
        2703380, 50000, 45833, 5500, 1000, 54500, 2758880, 2757880, 'Akomodasi Tiket Pesawat Staff HO PTPN IV 016 - 28 Februari 2026'
    ];

    const wsData = [headers, sampleFES, sampleUS];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 8 },   // Vendor
        { wch: 25 },  // No Invoice
        { wch: 12 },  // SAP
        { wch: 25 },  // No MPP
        { wch: 16 },  // Cost Center
        { wch: 8 },   // Divisi
        { wch: 15 },  // Tagihan
        { wch: 15 },  // Service Fee
        { wch: 18 },  // DPP Service Fee
        { wch: 12 },  // PPN
        { wch: 12 },  // PPH23
        { wch: 18 },  // Tagihan Service
        { wch: 18 },  // Jumlah Tagihan
        { wch: 18 },  // Yang Dibayarkan
        { wch: 60 },  // Uraian
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Data Pesawat');

    // --- Sheet 2: Petunjuk pengisian ---
    const instruksi = [
        ['PETUNJUK PENGISIAN TEMPLATE STANDAR PESAWAT'],
        [''],
        ['Kolom', 'Keterangan', 'Wajib?', 'Contoh'],
        ['No', 'Nomor urut', 'Ya', '1'],
        ['Vendor', 'Kode vendor: FES atau US', 'Ya', 'FES'],
        ['No Invoice', 'Nomor invoice (dari vendor FES)', 'Tidak', '021/FES-PKU/04/2026'],
        ['SAP', 'Kode SAP', 'Ya', '51100417'],
        ['No MPP', 'Nomor MPP', 'Ya', 'DHPU/PPb/XXXX/2026'],
        ['Cost Center', 'Kode Cost Center', 'Ya', 'PH00DSPN18'],
        ['Divisi', 'Kode Divisi', 'Ya', 'DSPN'],
        ['Tagihan', 'Nilai tagihan pokok (angka, tanpa Rp)', 'Ya', '3280360'],
        ['Service Fee', 'Biaya service (angka)', 'Ya', '164018'],
        ['DPP Service Fee', 'DPP Service Fee (hanya vendor US, isi 0 jika FES)', 'Tidak', '0'],
        ['PPN', 'PPN 12% (hanya vendor US, isi 0 jika FES)', 'Tidak', '0'],
        ['PPH23', 'PPH 23 (angka)', 'Ya', '3280'],
        ['Tagihan Service', 'Tagihan Service (hanya vendor US, isi 0 jika FES)', 'Tidak', '0'],
        ['Jumlah Tagihan', 'Total tagihan keseluruhan (angka)', 'Ya', '3444378'],
        ['Yang Dibayarkan', 'Total yang dibayarkan (angka)', 'Ya', '3441098'],
        ['Uraian', 'Deskripsi pembayaran', 'Ya', 'Pembayaran Tiket Pesawat April 2026'],
        [''],
        ['CATATAN:'],
        ['1. Semua nilai nominal diisi dalam angka tanpa format (tanpa Rp, tanpa titik ribuan)'],
        ['2. Kolom DPP Service Fee, PPN, dan Tagihan Service hanya diisi untuk vendor US'],
        ['3. Untuk vendor FES, kolom tersebut diisi 0'],
        ['4. Jika upload file asli dari vendor (bukan template ini), sistem akan otomatis mendeteksi vendor'],
    ];

    const wsInstruksi = XLSX.utils.aoa_to_sheet(instruksi);
    wsInstruksi['!cols'] = [
        { wch: 20 },
        { wch: 55 },
        { wch: 10 },
        { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, wsInstruksi, 'Petunjuk');

    return wb;
}

// ============================================================
// TEMPLATE 2: FORMAT VENDOR FES (simulasi file asli FES)
// ============================================================
function createFESTemplate() {
    const wb = XLSX.utils.book_new();

    const wsData = [
        ['PT. FOREVER EXPRESS SERVICE No. INVOICE : ___/FES-PKU/__/2026'],
        ['NO', 'NO MPP', 'NO', 'SAP', 'COST CENTER', 'DIVISI', 'TAGIHAN', 'SERVICE FEE', 'JUMLAH TAGIHAN', 'PPH23', 'YANG DIBAYARKAN', 'URAIAN'],
        [1, 'DHPU/PPb/XXXX/2026', '', '51100417', 'PH00DSPN18', 'DSPN', '', '', '', '', '', 'Pembayaran Tiket Pesawat ....... 2026'],
        [2, 'DHPU/PPb/XXXX/2026', '', '51100417', 'PH00DSPN18', 'DSPN', '', '', '', '', '', 'Pembayaran Tiket Pesawat ....... 2026'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 5 },   // NO
        { wch: 25 },  // NO MPP
        { wch: 8 },   // NO (internal)
        { wch: 12 },  // SAP
        { wch: 16 },  // COST CENTER
        { wch: 8 },   // DIVISI
        { wch: 15 },  // TAGIHAN
        { wch: 15 },  // SERVICE FEE
        { wch: 18 },  // JUMLAH TAGIHAN
        { wch: 12 },  // PPH23
        { wch: 18 },  // YANG DIBAYARKAN
        { wch: 55 },  // URAIAN
    ];

    // Merge header row
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pesawat FES');
    return wb;
}

// ============================================================
// TEMPLATE 3: FORMAT VENDOR US (simulasi file asli US)
// ============================================================
function createUSTemplate() {
    const wb = XLSX.utils.book_new();

    const headers = ['No', 'SAP', 'No. MPP', 'Cost Center', 'Divisi', 'Tagihan', 'Service Fee', 'DPP Service Fee', 'PPN 12% DARI', 'PPH23', 'Tagihan Service', 'Jumlah Tagihan', 'Yang dibayarkan', 'Uraian'];

    const wsData = [
        headers,
        [1, '51100417', 'DHPU/PPb/380/2026', 'PH00DSPN18', 'DSPN', '', '', '', '', '', '', '', '', 'Akomodasi Tiket Pesawat Staff HO PTPN IV ...'],
        [2, '51100417', 'DHPU/PPb/380/2026', 'PH00DSPN18', 'DSPN', '', '', '', '', '', '', '', '', 'Akomodasi Tiket Pesawat Staff HO PTPN IV ...'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 12 },  // SAP
        { wch: 25 },  // No. MPP
        { wch: 16 },  // Cost Center
        { wch: 8 },   // Divisi
        { wch: 15 },  // Tagihan
        { wch: 15 },  // Service Fee
        { wch: 18 },  // DPP Service Fee
        { wch: 15 },  // PPN 12% DARI
        { wch: 12 },  // PPH23
        { wch: 18 },  // Tagihan Service
        { wch: 18 },  // Jumlah Tagihan
        { wch: 18 },  // Yang dibayarkan
        { wch: 55 },  // Uraian
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pesawat US');
    return wb;
}

// ============================================================
// GENERATE SEMUA TEMPLATE
// ============================================================
const outputDir = path.resolve(__dirname, 'templates');
const fs = require('fs');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Template Standar
const wbStandar = createStandarTemplate();
const pathStandar = path.join(outputDir, 'Template_Standar_Pesawat.xlsx');
XLSX.writeFile(wbStandar, pathStandar);
console.log(`✅ Template Standar: ${pathStandar}`);

// 2. Template FES
const wbFES = createFESTemplate();
const pathFES = path.join(outputDir, 'Template_Vendor_FES_Pesawat.xlsx');
XLSX.writeFile(wbFES, pathFES);
console.log(`✅ Template FES:     ${pathFES}`);

// 3. Template US
const wbUS = createUSTemplate();
const pathUS = path.join(outputDir, 'Template_Vendor_US_Pesawat.xlsx');
XLSX.writeFile(wbUS, pathUS);
console.log(`✅ Template US:      ${pathUS}`);

console.log('\n🎉 Semua template berhasil dibuat di folder: templates/');
