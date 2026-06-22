/**
 * excelParser.js
 * Logika untuk memproses data dari SheetJS dan mengubahnya menjadi format aplikasi.
 */

const CATEGORY_RULES = [
    { keyword: 'tiket pesawat', category: 'Pesawat' },
    { keyword: 'pesawat',       category: 'Pesawat' },
    { keyword: 'hotel',         category: 'Hotel' },
    { keyword: 'penginapan',    category: 'Hotel' },
    { keyword: 'kereta',        category: 'Kereta' },
    { keyword: 'mobil',         category: 'Mobil' },
    { keyword: 'rental',        category: 'Mobil' },
    { keyword: 'per diem',      category: 'Per Diem' },
    { keyword: 'per-diem',      category: 'Per Diem' },
    { keyword: 'perdiem',       category: 'Per Diem' },
    { keyword: 'trans lokal',   category: 'Trans Lokal' },
    { keyword: 'transport lokal', category: 'Trans Lokal' },
    { keyword: 'transport dari', category: 'Transport Dari & Ke' },
    { keyword: 'transport ke',   category: 'Transport Dari & Ke' },
    { keyword: 'laundry',        category: 'Laundry' },
];

/**
 * Mendeteksi kategori berdasarkan teks Uraian
 */
export function detectCategory(uraian) {
    if (!uraian) return 'Lain-lain';
    const lower = uraian.toLowerCase();
    
    for (const rule of CATEGORY_RULES) {
        if (lower.includes(rule.keyword)) return rule.category;
    }
    
    return 'Lain-lain';
}

/**
 * Membersihkan nilai nominal dari format Excel (String/Currency) ke Number
 */
export function cleanCurrency(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Hapus Rp, titik ribuan, dan spasi
    return Number(val.toString().replace(/[Rp.\s,]/g, ''));
}

// ============================================================
// STANDARISASI PESAWAT — MULTI-VENDOR (FES & US)
// ============================================================

/**
 * Mapping kolom dari vendor US ke format standar.
 * Vendor US memiliki kolom DPP Service Fee, PPN 12%, dan Tagihan Service.
 */
const VENDOR_US_MAPPING = {
    no:              ['No'],
    sap:             ['SAP'],
    no_mpp:          ['No. MPP', 'No MPP', 'NO MPP', 'NO. MPP'],
    cost_center:     ['Cost Center', 'COST CENTER', 'CostCenter'],
    divisi:          ['Divisi', 'DIVISI'],
    tagihan:         ['Tagihan', 'TAGIHAN'],
    service_fee:     ['Service Fee', 'SERVICE FEE'],
    dpp_service_fee: ['DPP Service Fee', 'DPP SERVICE FEE'],
    ppn:             ['PPN 12% DARI', 'PPN 12 % DARI', 'PPN'],
    pph23:           ['PPH23', 'PPH 23', 'Pph23'],
    tagihan_service: ['Tagihan Service', 'TAGIHAN SERVICE'],
    jumlah_tagihan:  ['Jumlah Tagihan', 'JUMLAH TAGIHAN'],
    yang_dibayarkan: ['Yang dibayarkan', 'YANG DIBAYARKAN', 'Yang Dibayarkan'],
    uraian:          ['Uraian', 'URAIAN'],
};

/**
 * Mapping kolom dari vendor FES ke format standar.
 * Vendor FES TIDAK memiliki DPP Service Fee, PPN 12%, dan Tagihan Service.
 */
const VENDOR_FES_MAPPING = {
    no:              ['NO', 'No'],
    sap:             ['SAP'],
    no_mpp:          ['NO MPP', 'No MPP', 'NO. MPP', 'No. MPP'],
    cost_center:     ['COST CENTER', 'Cost Center', 'CostCenter'],
    divisi:          ['DIVISI', 'Divisi'],
    tagihan:         ['TAGIHAN', 'Tagihan'],
    service_fee:     ['SERVICE FEE', 'Service Fee'],
    dpp_service_fee: [],  // Tidak tersedia di FES
    ppn:             [],  // Tidak tersedia di FES
    pph23:           ['PPH23', 'PPH 23', 'Pph23'],
    tagihan_service: [],  // Tidak tersedia di FES
    jumlah_tagihan:  ['JUMLAH TAGIHAN', 'Jumlah Tagihan'],
    yang_dibayarkan: ['YANG DIBAYARKAN', 'Yang dibayarkan', 'Yang Dibayarkan'],
    uraian:          ['URAIAN', 'Uraian'],
};

/**
 * Mencari nilai dari baris berdasarkan array kemungkinan nama kolom.
 * @param {Object} row - Satu baris data dari SheetJS
 * @param {Array<string>} possibleKeys - Daftar kemungkinan nama kolom
 * @param {*} defaultValue - Nilai default jika tidak ditemukan
 * @returns {*} Nilai yang ditemukan atau default
 */
function resolveColumn(row, possibleKeys, defaultValue = '') {
    if (!possibleKeys || possibleKeys.length === 0) return defaultValue;
    for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null) {
            return row[key];
        }
    }
    return defaultValue;
}

/**
 * Deteksi otomatis vendor berdasarkan data sheet.
 * 
 * Strategi deteksi:
 * 1. Cek apakah ada teks "FOREVER EXPRESS" atau "FES" di baris pertama (header invoice)
 * 2. Cek apakah ada kolom "DPP Service Fee" (hanya milik US)
 * 3. Cek apakah header kolom semua UPPERCASE (ciri FES)
 * 
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {Array<string>} headers - Daftar nama kolom dari baris header
 * @returns {{ vendor: string, noInvoice: string }}
 */
export function detectVendorPesawat(worksheet, headers) {
    let vendor = 'UNKNOWN';
    let noInvoice = '';

    // --- Strategi 1: Cek baris-baris awal worksheet untuk teks vendor ---
    if (worksheet) {
        // Ambil beberapa baris pertama sebagai teks mentah
        const range = XLSX_getRange(worksheet);
        for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = worksheet[XLSX_cellRef(r, c)];
                if (cell && cell.v) {
                    const val = cell.v.toString().toUpperCase();
                    if (val.includes('FOREVER EXPRESS') || val.includes('FES')) {
                        vendor = 'FES';
                        // Coba ambil nomor invoice dari teks yang sama
                        const invoiceMatch = cell.v.toString().match(/No\.?\s*INVOICE\s*:\s*(.+)/i);
                        if (invoiceMatch) {
                            noInvoice = invoiceMatch[1].trim();
                        }
                        break;
                    }
                }
            }
            if (vendor !== 'UNKNOWN') break;
        }
    }

    // --- Strategi 2: Cek kolom khas US ---
    if (vendor === 'UNKNOWN') {
        const headersUpper = headers.map(h => h.toUpperCase());
        const hasDpp = headersUpper.some(h => h.includes('DPP SERVICE FEE'));
        const hasPpn = headersUpper.some(h => h.includes('PPN'));
        const hasTagihanService = headersUpper.some(h => h.includes('TAGIHAN SERVICE'));

        if (hasDpp || hasTagihanService) {
            vendor = 'US';
        }
    }

    // --- Strategi 3: Fallback berdasarkan case kolom ---
    if (vendor === 'UNKNOWN') {
        const allUpper = headers.every(h => h === h.toUpperCase());
        vendor = allUpper ? 'FES' : 'US';
    }

    return { vendor, noInvoice };
}

/**
 * Helper: Mendapatkan range dari worksheet SheetJS
 */
function XLSX_getRange(ws) {
    const ref = ws['!ref'];
    if (!ref) return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    // Coba gunakan XLSX.utils jika tersedia
    if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.utils.decode_range) {
        return XLSX.utils.decode_range(ref);
    }
    // Fallback: parse manual (e.g. "A1:N20")
    const parts = ref.split(':');
    return {
        s: parseCellAddress(parts[0]),
        e: parseCellAddress(parts[1] || parts[0])
    };
}

/**
 * Helper: Parse cell address string (e.g. "A1") ke {r, c}
 */
function parseCellAddress(addr) {
    const match = addr.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { r: 0, c: 0 };
    let col = 0;
    for (let i = 0; i < match[1].length; i++) {
        col = col * 26 + (match[1].charCodeAt(i) - 64);
    }
    return { r: parseInt(match[2]) - 1, c: col - 1 };
}

/**
 * Helper: Membuat cell reference string (e.g. {r:0, c:0} → "A1")
 */
function XLSX_cellRef(r, c) {
    let col = '';
    let cc = c + 1;
    while (cc > 0) {
        col = String.fromCharCode(((cc - 1) % 26) + 65) + col;
        cc = Math.floor((cc - 1) / 26);
    }
    return col + (r + 1);
}

/**
 * Mengecek apakah baris adalah baris total/subtotal yang harus dilewati
 */
function isTotalRow(row, mapping) {
    // Cek kolom divisi
    const divisi = resolveColumn(row, mapping.divisi, '').toString().toLowerCase();
    if (divisi.includes('total')) return true;

    // Cek kolom no_mpp (kadang baris total ada di sini)
    const noMpp = resolveColumn(row, mapping.no_mpp, '').toString().toLowerCase();
    if (noMpp.includes('total')) return true;

    // Cek kolom uraian
    const uraian = resolveColumn(row, mapping.uraian, '').toString().toLowerCase();
    if (uraian.includes('total keseluruhan') || uraian.includes('total divisi')) return true;

    return false;
}

/**
 * Mengecek apakah baris adalah baris data yang valid
 */
function isValidDataRow(row, mapping) {
    const uraian = resolveColumn(row, mapping.uraian, '');
    const yangDibayarkan = resolveColumn(row, mapping.yang_dibayarkan, 0);
    const tagihan = resolveColumn(row, mapping.tagihan, 0);
    
    // Baris harus punya uraian ATAU nilai pembayaran
    return (uraian !== '' && uraian !== 0) || (yangDibayarkan !== '' && yangDibayarkan !== 0) || (tagihan !== '' && tagihan !== 0);
}

/**
 * ============================================================
 * FUNGSI UTAMA: Parse file Excel pesawat dari vendor FES atau US
 * ============================================================
 * 
 * Menghasilkan array data dengan format standar yang seragam,
 * terlepas dari vendor mana yang menghasilkan file Excel.
 * 
 * @param {Array} rows - Data mentah dari xlsx.utils.sheet_to_json
 * @param {Object} worksheet - SheetJS worksheet object (untuk deteksi vendor)
 * @param {string} bulanTahun - Periode data (input user saat upload)
 * @param {string} [vendorOverride] - Override vendor jika user sudah tahu ('FES' atau 'US')
 * @returns {Array<Object>} Data terstandarisasi
 */
export function parsePesawatData(rows, worksheet, bulanTahun, vendorOverride = null) {
    if (!rows || rows.length === 0) return [];

    // Ambil nama kolom dari baris pertama
    const headers = Object.keys(rows[0]);

    // Deteksi vendor
    let vendor, noInvoice;
    if (vendorOverride) {
        vendor = vendorOverride.toUpperCase();
        noInvoice = '';
    } else {
        const detection = detectVendorPesawat(worksheet, headers);
        vendor = detection.vendor;
        noInvoice = detection.noInvoice;
    }

    // Pilih mapping berdasarkan vendor
    const mapping = vendor === 'FES' ? VENDOR_FES_MAPPING : VENDOR_US_MAPPING;

    console.log(`[PesawatParser] Vendor terdeteksi: ${vendor}`);
    console.log(`[PesawatParser] No. Invoice: ${noInvoice || '(tidak tersedia)'}`);
    console.log(`[PesawatParser] Jumlah baris mentah: ${rows.length}`);

    // Parse dan filter baris
    const results = [];

    for (const row of rows) {
        // Lewati baris total/subtotal
        if (isTotalRow(row, mapping)) continue;

        // Lewati baris kosong
        if (!isValidDataRow(row, mapping)) continue;

        // Ambil uraian dan pastikan ini data pesawat
        const uraian = resolveColumn(row, mapping.uraian, '').toString();

        const record = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID 
                ? crypto.randomUUID() 
                : Math.random().toString(36).substring(2),
            vendor:          vendor,
            no_invoice:      noInvoice,
            period:          bulanTahun,
            no:              cleanCurrency(resolveColumn(row, mapping.no, 0)),
            sap:             resolveColumn(row, mapping.sap, '').toString(),
            no_mpp:          resolveColumn(row, mapping.no_mpp, '').toString(),
            cost_center:     resolveColumn(row, mapping.cost_center, '').toString(),
            divisi:          resolveColumn(row, mapping.divisi, '').toString(),
            kategori:        'Pesawat',
            tagihan:         cleanCurrency(resolveColumn(row, mapping.tagihan, 0)),
            service_fee:     cleanCurrency(resolveColumn(row, mapping.service_fee, 0)),
            dpp_service_fee: cleanCurrency(resolveColumn(row, mapping.dpp_service_fee, 0)),
            ppn:             cleanCurrency(resolveColumn(row, mapping.ppn, 0)),
            pph23:           cleanCurrency(resolveColumn(row, mapping.pph23, 0)),
            tagihan_service: cleanCurrency(resolveColumn(row, mapping.tagihan_service, 0)),
            jumlah_tagihan:  cleanCurrency(resolveColumn(row, mapping.jumlah_tagihan, 0)),
            yang_dibayarkan: cleanCurrency(resolveColumn(row, mapping.yang_dibayarkan, 0)),
            uraian:          uraian,
        };

        results.push(record);
    }

    console.log(`[PesawatParser] Jumlah data valid: ${results.length}`);
    return results;
}

// ============================================================
// FUNGSI LEGACY (dipertahankan untuk kompatibilitas)
// ============================================================

/**
 * Memproses baris-baris dari SheetJS (format lama - generic)
 * @param {Array} rows - Data mentah dari xlsx.utils.sheet_to_json
 * @param {String} bulanTahun - Periode data (input user saat upload)
 */
export function parseExcelData(rows, bulanTahun) {
    return rows.filter(row => {
        // Abaikan baris Total/Subtotal
        const divisi = row['Divisi'] || '';
        if (divisi.toString().toLowerCase().includes('total')) return false;
        
        // Abaikan baris kosong
        if (!row['Uraian'] && !row['Yang dibayarkan']) return false;
        
        return true;
    }).map(row => {
        const uraian = row['Uraian'] || '';
        return {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            period: bulanTahun,
            divisi: row['Divisi'] || 'Unknown',
            kategori: detectCategory(uraian),
            uraian: uraian,
            yangDibayarkan: cleanCurrency(row['Yang dibayarkan']),
            jumlahTagihan: cleanCurrency(row['Jumlah Tagihan']),
            sap: row['SAP'] || '',
            noMpp: row['No. MPP'] || '',
            costCenter: row['Cost Center'] || ''
        };
    });
}
