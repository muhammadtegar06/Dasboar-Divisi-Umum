/**
 * pesawatUploadHandler.js
 * Handler untuk upload file Excel pesawat.
 * Menggunakan parsePesawatData dari excelParser.js untuk
 * menghasilkan data standar dari vendor FES maupun US.
 * 
 * Contoh penggunaan dengan SheetJS (XLSX):
 * 
 * ```html
 * <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
 * <script type="module" src="js/pesawatUploadHandler.js"></script>
 * ```
 */

import { parsePesawatData } from './excelParser.js';

/**
 * Handle file upload untuk rekap pesawat.
 * Otomatis mendeteksi vendor (FES / US) dan memetakan ke format standar.
 * 
 * @param {File} file - File Excel (.xlsx / .xls) dari input file
 * @param {string} bulanTahun - Periode data, format "YYYY-MM" (e.g. "2026-04")
 * @param {Object} [options] - Opsi tambahan
 * @param {string} [options.vendor] - Override vendor ('FES' atau 'US')
 * @param {number} [options.sheetIndex=0] - Index sheet yang akan diproses
 * @returns {Promise<{ vendor: string, noInvoice: string, data: Array, rawRowCount: number }>}
 */
export async function handlePesawatUpload(file, bulanTahun, options = {}) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Pilih sheet
                const sheetIndex = options.sheetIndex || 0;
                const sheetName = workbook.SheetNames[sheetIndex];
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    throw new Error(`Sheet index ${sheetIndex} tidak ditemukan.`);
                }

                // Konversi ke JSON rows
                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    defval: '',       // Isi sel kosong dengan string kosong
                    raw: false,       // Gunakan formatted value
                });

                // Parse dengan standarisasi
                const parsed = parsePesawatData(
                    rows,
                    worksheet,
                    bulanTahun,
                    options.vendor || null
                );

                // Ambil info vendor dari hasil pertama
                const vendorResult = parsed.length > 0 ? parsed[0].vendor : 'UNKNOWN';
                const invoiceResult = parsed.length > 0 ? parsed[0].no_invoice : '';

                resolve({
                    vendor: vendorResult,
                    noInvoice: invoiceResult,
                    data: parsed,
                    rawRowCount: rows.length,
                    sheetName: sheetName,
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = function () {
            reject(new Error('Gagal membaca file.'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Contoh: menghubungkan ke elemen input file di HTML
 * 
 * ```html
 * <input type="file" id="pesawat-upload" accept=".xlsx,.xls" />
 * <select id="periode-select">
 *   <option value="2026-04">April 2026</option>
 * </select>
 * <div id="upload-result"></div>
 * ```
 */
export function initPesawatUploadUI() {
    const fileInput = document.getElementById('pesawat-upload');
    const periodeSelect = document.getElementById('periode-select');
    const resultDiv = document.getElementById('upload-result');

    if (!fileInput) {
        console.warn('[PesawatUpload] Element #pesawat-upload tidak ditemukan');
        return;
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const bulanTahun = periodeSelect ? periodeSelect.value : '';

        try {
            if (resultDiv) {
                resultDiv.innerHTML = '<p>⏳ Memproses file...</p>';
            }

            const result = await handlePesawatUpload(file, bulanTahun);

            console.log('=== HASIL PARSING PESAWAT ===');
            console.log(`Vendor: ${result.vendor}`);
            console.log(`No. Invoice: ${result.noInvoice}`);
            console.log(`Sheet: ${result.sheetName}`);
            console.log(`Baris mentah: ${result.rawRowCount}`);
            console.log(`Data valid: ${result.data.length}`);
            console.table(result.data);

            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div style="padding:12px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px;">
                        <p><strong>✅ Berhasil diproses!</strong></p>
                        <p>Vendor: <strong>${result.vendor}</strong></p>
                        <p>No. Invoice: <strong>${result.noInvoice || '-'}</strong></p>
                        <p>Jumlah data: <strong>${result.data.length} baris</strong></p>
                    </div>
                `;
            }

            // Event custom untuk integrasi dengan komponen lain
            document.dispatchEvent(new CustomEvent('pesawat-data-parsed', {
                detail: result
            }));

        } catch (err) {
            console.error('[PesawatUpload] Error:', err);
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div style="padding:12px; background:#fef2f2; border:1px solid #fca5a5; border-radius:8px;">
                        <p><strong>❌ Gagal memproses file</strong></p>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        }
    });
}
