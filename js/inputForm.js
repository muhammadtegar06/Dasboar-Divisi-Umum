/**
 * inputForm.js
 * Logika untuk form input manual data perjalanan dinas.
 * Fitur: validasi, auto-calculation, currency formatting,
 *        conditional fields, multi-entry, preview table,
 *        duplikat entri, database lokal (localStorage).
 */

// ============================================================
// STATE
// ============================================================
let entries = [];           // Data yang sudah disimpan (session ini)
let currentEntryIndex = 0;  // Tab aktif
let editingIndex = -1;      // -1 = mode tambah, >= 0 = mode edit

// ============================================================
// LOCAL STORAGE — Database Lokal
// ============================================================
const LS_KEY = 'ptpn4_input_entries';

/** Simpan semua entries ke localStorage */
function saveToLocalStorage() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(entries));
    } catch (e) {
        console.warn('[LS] Gagal menyimpan:', e);
    }
}

/** Muat entries dari localStorage saat halaman dibuka */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                entries = parsed;
                return true;
            }
        }
    } catch (e) {
        console.warn('[LS] Gagal memuat:', e);
    }
    return false;
}

/** Hapus semua data dari localStorage */
function clearLocalStorage() {
    localStorage.removeItem(LS_KEY);
}

// ============================================================
// CURRENCY FORMATTING
// ============================================================
function parseCurrencyInput(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return Number(val.toString().replace(/[^\d]/g, '')) || 0;
}

function formatCurrency(num) {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('id-ID').format(num);
}

function setupCurrencyInput(input) {
    input.addEventListener('input', function () {
        const raw = parseCurrencyInput(this.value);
        const pos = this.selectionStart;
        const oldLen = this.value.length;
        this.value = raw ? formatCurrency(raw) : '';
        const newLen = this.value.length;
        this.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
        recalculate();
    });
    input.addEventListener('focus', function () {
        if (this.value === '0') this.value = '';
    });
}

// Initialize all currency inputs
document.querySelectorAll('.form-input.currency:not(.readonly)').forEach(setupCurrencyInput);

// ============================================================
// AUTO-CALCULATION — VENDOR US & FES
// ============================================================
//
// ┌──────────────────────────────────────────────────────────────┐
// │  VENDOR US (Permata Andalan Wisata)                         │
// │  ──────────────────────────────────────────────────────────  │
// │  Input: Tagihan, Service Fee                                │
// │  DPP Service Fee    = 11/12 × Service Fee                   │
// │  PPN 12%            = Service Fee × 11%                     │
// │  PPH 23             = 2% × Service Fee                      │
// │  Tagihan Service    = Service Fee + PPN 12% − PPH 23        │
// │  Jumlah Tagihan     = Tagihan + Service Fee + PPN 12%       │
// │  Yang Dibayarkan    = Jumlah Tagihan − PPH 23               │
// ├──────────────────────────────────────────────────────────────┤
// │  VENDOR FES (Forever Express Service)                       │
// │  ──────────────────────────────────────────────────────────  │
// │  Input: Tagihan (per unit), Service Fee (per unit), Jumlah  │
// │  Total Tagihan      = Tagihan × Jumlah                      │
// │  Total Service Fee  = Service Fee × Jumlah                  │
// │  PPH 23             = 2% × Total Service Fee                │
// │  Jumlah Tagihan     = Total Tagihan + Total Service Fee      │
// │  Yang Dibayarkan    = Jumlah Tagihan − PPH 23               │
// ├──────────────────────────────────────────────────────────────┤
// │  VENDOR LAINNYA                                             │
// │  Input: Tagihan, Service Fee, Yang Dibayarkan (manual)      │
// └──────────────────────────────────────────────────────────────┘
//

/**
 * recalculate()
 * ─────────────
 * Fungsi utama untuk menghitung ulang semua field otomatis.
 * Rumus berbeda per vendor (US / FES / Lainnya).
 */
function recalculate() {
    const vendor = document.getElementById('vendor').value;
    const tagihan    = parseCurrencyInput(document.getElementById('tagihan').value);
    const serviceFee = parseCurrencyInput(document.getElementById('serviceFee').value);

    // ════════════════════════════════════════════════════════════
    //  VENDOR US
    // ════════════════════════════════════════════════════════════
    if (vendor === 'US') {
        const dppServiceFee = Math.round((11 / 12) * serviceFee);
        const ppn12         = Math.round(serviceFee * 0.11);
        // PPH 23 = 2% × Service Fee
        const pph23         = Math.round(0.02 * serviceFee);
        const tagihanServiceSetelahPajak = serviceFee + ppn12 - pph23;
        const jumlahTagihan  = tagihan + serviceFee + ppn12;
        const yangDibayarkan = jumlahTagihan - pph23;

        document.getElementById('dppServiceFee').value  = formatCurrency(dppServiceFee);
        document.getElementById('ppn').value            = formatCurrency(ppn12);
        document.getElementById('pph23').value          = formatCurrency(pph23);
        document.getElementById('tagihanService').value = formatCurrency(tagihanServiceSetelahPajak);
        document.getElementById('jumlahTagihan').value  = formatCurrency(jumlahTagihan);
        document.getElementById('yangDibayarkan').value = formatCurrency(yangDibayarkan);

        // Update badge text untuk US
        document.getElementById('pph23Badge').textContent        = '⚡ = 2% × Service Fee';
        document.getElementById('jumlahTagihanBadge').textContent = '⚡ = Tagihan + Service Fee + PPN 12%';

    // ════════════════════════════════════════════════════════════
    //  VENDOR FES
    // ════════════════════════════════════════════════════════════
    } else if (vendor === 'FES') {
        const jumlahQty       = parseInt(document.getElementById('jumlahQty').value) || 1;
        // Tagihan & Service Fee masing-masing dikali Jumlah
        const totalTagihan    = tagihan * jumlahQty;
        const totalServiceFee = serviceFee * jumlahQty;
        // PPH 23 = 2% × Total Service Fee
        const pph23           = Math.round(0.02 * totalServiceFee);
        // Jumlah Tagihan = Total Tagihan + Total Service Fee
        const jumlahTagihan   = totalTagihan + totalServiceFee;
        const yangDibayarkan  = jumlahTagihan - pph23;

        document.getElementById('pph23').value          = formatCurrency(pph23);
        document.getElementById('jumlahTagihan').value  = formatCurrency(jumlahTagihan);
        document.getElementById('yangDibayarkan').value = formatCurrency(yangDibayarkan);

        // Update badge text untuk FES
        document.getElementById('pph23Badge').textContent        = '⚡ = 2% × (Service Fee × Jumlah)';
        document.getElementById('jumlahTagihanBadge').textContent = '⚡ = (Tagihan × Jumlah) + (Service Fee × Jumlah)';
    }
}

// Listener untuk Jumlah (qty) FES — trigger recalculate saat berubah
document.getElementById('jumlahQty').addEventListener('input', recalculate);

// ============================================================
// CONDITIONAL FIELDS — Toggle berdasarkan Vendor
// ============================================================
const vendorSelect = document.getElementById('vendor');
const vendorLainnyaGroup = document.getElementById('vendorLainnyaGroup');

// Field groups per vendor
const usOnlyGroups  = ['dppServiceFeeGroup', 'ppnGroup', 'tagihanServiceGroup'];
const fesOnlyGroups = ['jumlahQtyGroup'];
const sharedCalcGroups = ['pph23Group', 'jumlahTagihanGroup', 'yangDibayarkanAutoGroup'];

/**
 * Event handler saat dropdown Vendor berubah.
 * ─────────────────────────────────────────────
 * 1. US  → tampilkan field US-only + shared auto-calc
 * 2. FES → tampilkan field FES-only (Jumlah) + shared auto-calc
 * 3. Lainnya → tampilkan Yang Dibayarkan manual + input nama vendor
 */
vendorSelect.addEventListener('change', function () {
    const isUS      = this.value === 'US';
    const isFES     = this.value === 'FES';
    const isLainnya = this.value === 'Lainnya';
    const hasVendor = this.value !== '';

    // US-only fields (DPP Service Fee, PPN, Tagihan Service)
    usOnlyGroups.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('visible', isUS);
    });

    // FES-only fields (Jumlah/qty)
    fesOnlyGroups.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('visible', isFES);
    });

    // Shared auto-calc fields (PPH 23, Jumlah Tagihan, Yang Dibayarkan auto)
    sharedCalcGroups.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('visible', isUS || isFES);
    });

    // Yang Dibayarkan manual (vendor selain US dan FES)
    const manualGroup = document.getElementById('yangDibayarkanManualGroup');
    if (manualGroup) {
        manualGroup.classList.toggle('visible', hasVendor && !isUS && !isFES);
    }

    // Input nama vendor (Lainnya)
    if (vendorLainnyaGroup) {
        vendorLainnyaGroup.classList.toggle('visible', isLainnya);
    }

    // Reset semua auto-calc fields
    ['dppServiceFee', 'ppn', 'pph23', 'tagihanService',
     'jumlahTagihan', 'yangDibayarkan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset Jumlah qty ke 1
    document.getElementById('jumlahQty').value = 1;

    // Hitung ulang
    recalculate();

    // Tampilkan tabel ringkasan rumus
    renderCalcSummary(this.value);
});

// ============================================================
// RINGKASAN RUMUS (Tabel)
// ============================================================
function renderCalcSummary(vendor) {
    const summaryDiv = document.getElementById('calcSummary');
    const titleEl    = document.getElementById('calcSummaryTitle');
    const tbody      = document.getElementById('calcTableBody');

    if (!vendor || vendor === '') {
        summaryDiv.style.display = 'none';
        return;
    }

    // Definisi baris tabel per vendor
    let rows = [];

    if (vendor === 'US') {
        titleEl.textContent = '📊 Rumus Kalkulasi Otomatis — Vendor US';
        rows = [
            { field: 'Tagihan',                           type: '✏️ Input manual',    rumus: '—' },
            { field: 'Service Fee',                       type: '✏️ Input manual',    rumus: '—' },
            { field: 'DPP Service Fee',                   type: '⚡ Auto-calculated', rumus: '= 11/12 × Service Fee' },
            { field: 'PPN 12% dari Tagihan',              type: '⚡ Auto-calculated', rumus: '= Service Fee × 11%' },
            { field: 'PPH 23',                            type: '⚡ Auto-calculated', rumus: '= 2% × Service Fee' },
            { field: 'Tagihan Service Fee setelah Pajak', type: '⚡ Auto-calculated', rumus: '= Service Fee + PPN 12% − PPH 23' },
            { field: 'Jumlah Tagihan',                    type: '⚡ Auto-calculated', rumus: '= Tagihan + Service Fee + PPN 12%' },
            { field: 'Yang Dibayarkan',                   type: '⚡ Auto-calculated', rumus: '= Jumlah Tagihan − PPH 23' },
        ];
    } else if (vendor === 'FES') {
        titleEl.textContent = '📊 Rumus Kalkulasi Otomatis — Vendor FES';
        rows = [
            { field: 'Tagihan (per unit)',     type: '✏️ Input manual',    rumus: '—' },
            { field: 'Service Fee (per unit)', type: '✏️ Input manual',    rumus: '—' },
            { field: 'Jumlah (malam/unit)',    type: '✏️ Input manual',    rumus: '—' },
            { field: 'PPH 23',                type: '⚡ Auto-calculated',  rumus: '= 2% × (Service Fee × Jumlah)' },
            { field: 'Jumlah Tagihan',         type: '⚡ Auto-calculated',  rumus: '= (Tagihan × Jumlah) + (Service Fee × Jumlah)' },
            { field: 'Yang Dibayarkan',        type: '⚡ Auto-calculated',  rumus: '= Jumlah Tagihan − PPH 23' },
        ];
    } else {
        titleEl.textContent = '📊 Input Manual';
        rows = [
            { field: 'Tagihan',          type: '✏️ Input manual', rumus: '—' },
            { field: 'Service Fee',      type: '✏️ Input manual', rumus: '—' },
            { field: 'Yang Dibayarkan',  type: '✏️ Input manual', rumus: '—' },
        ];
    }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.field}</td>
            <td class="type-cell ${r.type.includes('Auto') ? 'auto' : 'manual'}">${r.type}</td>
            <td class="rumus-cell">${r.rumus}</td>
        </tr>
    `).join('');

    summaryDiv.style.display = 'block';
}

// ============================================================
// VALIDATION
// ============================================================
const requiredFields = [
    { id: 'costCenterValue', message: 'Masukkan kode cost center' },
    { id: 'kodeSAPValue', message: 'Masukkan nomor GL' },
    { id: 'divisi', message: 'Pilih divisi' },
    { id: 'kategori', message: 'Pilih kategori' },
    { id: 'vendor', message: 'Pilih vendor' },
    { id: 'noInvoice', message: 'Masukkan No Invoice' },
    { id: 'tagihan', message: 'Masukkan nominal tagihan' },
    { id: 'serviceFee', message: 'Masukkan nominal service fee' },
];

function validateForm() {
    let valid = true;

    // Check required fields
    requiredFields.forEach(field => {
        const el = document.getElementById(field.id);
        const group = el.closest('.form-group');
        const val = el.value.trim();

        if (!val || val === '') {
            group.classList.add('has-error');
            valid = false;
        } else {
            group.classList.remove('has-error');
        }
    });

    // Check uraian (contenteditable)
    const uraianContent = document.getElementById('uraianContent');
    const uraianText = uraianContent.innerText.trim();
    const uraianGroup = uraianContent.closest('.form-group');
    if (!uraianText) {
        uraianGroup.classList.add('has-error');
        valid = false;
    } else {
        uraianGroup.classList.remove('has-error');
    }

    // Check vendor lainnya if selected
    if (vendorSelect.value === 'Lainnya') {
        const vendorInput = document.getElementById('vendorLainnya');
        const vendorGroup = vendorInput.closest('.form-group');
        if (!vendorInput.value.trim()) {
            vendorGroup.classList.add('has-error');
            valid = false;
        } else {
            vendorGroup.classList.remove('has-error');
        }
    }

    // Check Yang Dibayarkan manual hanya jika vendor bukan US dan bukan FES
    const currentVendor = vendorSelect.value;
    if (currentVendor !== 'US' && currentVendor !== 'FES') {
        const ydManual = document.getElementById('yangDibayarkanManual');
        const ydGroup = ydManual?.closest('.form-group');
        const ydVal = parseCurrencyInput(ydManual?.value);
        if (ydGroup && !ydVal && currentVendor !== '') {
            ydGroup.classList.add('has-error');
            valid = false;
        } else if (ydGroup) {
            ydGroup.classList.remove('has-error');
        }
    }

    return valid;
}

// Remove error on input
document.querySelectorAll('.form-input, .form-select').forEach(el => {
    el.addEventListener('input', () => el.closest('.form-group')?.classList.remove('has-error'));
    el.addEventListener('change', () => el.closest('.form-group')?.classList.remove('has-error'));
});

// ============================================================
// COLLECT FORM DATA
// ============================================================
function collectFormData() {
    const vendorVal = vendorSelect.value === 'Lainnya'
        ? document.getElementById('vendorLainnya').value.trim()
        : vendorSelect.value;
    const isUS = vendorSelect.value === 'US';
    const isFES = vendorSelect.value === 'FES';

    const periodeBulan = document.getElementById('periodeBulan').value;
    const periodeTahun = document.getElementById('periodeTahun').value;
    const bulanNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periode = periodeBulan ? `${bulanNames[parseInt(periodeBulan)]} ${periodeTahun}` : periodeTahun;

    // Yang Dibayarkan: auto-calc (vendor US/FES) atau manual (vendor lain)
    const yangDibayarkan = (isUS || isFES)
        ? parseCurrencyInput(document.getElementById('yangDibayarkan').value)
        : parseCurrencyInput(document.getElementById('yangDibayarkanManual').value);

    return {
        id: editingIndex >= 0 ? entries[editingIndex].id : generateId(),
        tahun_anggaran: document.getElementById('tahunAnggaran').value,
        cost_center: document.getElementById('costCenterValue').value,
        kode_sap: document.getElementById('kodeSAPValue').value,
        divisi: document.getElementById('divisi').value,
        kategori: document.getElementById('kategori').value,
        vendor: vendorVal,
        no_invoice: document.getElementById('noInvoice').value.trim(),
        no_mpp: document.getElementById('noMpp').value.trim(),
        tgl_berangkat: document.getElementById('tglBerangkat').value,
        tgl_kembali: document.getElementById('tglKembali').value,
        period: periode,
        uraian: document.getElementById('uraianContent').innerText.trim(),
        uraian_html: document.getElementById('uraianContent').innerHTML,
        // Nominal
        tagihan: parseCurrencyInput(document.getElementById('tagihan').value),
        service_fee: parseCurrencyInput(document.getElementById('serviceFee').value),
        jumlah_qty: isFES ? (parseInt(document.getElementById('jumlahQty').value) || 1) : 1,
        dpp_service_fee: isUS ? parseCurrencyInput(document.getElementById('dppServiceFee').value) : 0,
        ppn: isUS ? parseCurrencyInput(document.getElementById('ppn').value) : 0,
        pph23: (isUS || isFES) ? parseCurrencyInput(document.getElementById('pph23').value) : 0,
        tagihan_service: isUS ? parseCurrencyInput(document.getElementById('tagihanService').value) : 0,
        jumlah_tagihan: (isUS || isFES) ? parseCurrencyInput(document.getElementById('jumlahTagihan').value) : 0,
        yang_dibayarkan: yangDibayarkan,
    };
}

function generateId() {
    return 'manual-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

// ============================================================
// SAVE ENTRY
// ============================================================
document.getElementById('btnSimpan').addEventListener('click', function () {
    if (!validateForm()) {
        showToast('Mohon lengkapi field yang wajib diisi.', 'error');
        return;
    }

    const data = collectFormData();

    if (editingIndex >= 0) {
        entries[editingIndex] = data;
        editingIndex = -1;
        showToast('✅ Data berhasil diupdate!', 'success');
    } else {
        entries.push(data);
        showToast(`✅ Entri #${entries.length} berhasil ditambahkan!`, 'success');
    }

    // Auto-simpan ke localStorage
    saveToLocalStorage();

    renderPreviewTable();
    updateEntryTabs();

    // Pindah ke tab baru (siap isi berikutnya)
    currentEntryIndex = entries.length;
    updateEntryTabs();
});


// ============================================================
// RESET FORM
// ============================================================
document.getElementById('btnReset').addEventListener('click', function () {
    if (confirm('Reset semua isian form?')) {
        resetForm();
        editingIndex = -1;
    }
});

function resetForm() {
    // Reset selects
    ['divisi', 'kategori', 'vendor', 'costCenterValue', 'kodeSAPValue', 'periodeBulan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.selectedIndex = 0;
    });

    // Reset manual text inputs
    ['noInvoice', 'noMpp', 'tglBerangkat', 'tglKembali',
        'tagihan', 'serviceFee', 'vendorLainnya', 'yangDibayarkanManual'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset Jumlah qty
    const jumlahQty = document.getElementById('jumlahQty');
    if (jumlahQty) jumlahQty.value = 1;

    // Reset auto-calculated readonly fields (Vendor US & FES)
    ['dppServiceFee', 'ppn', 'pph23', 'tagihanService',
        'jumlahTagihan', 'yangDibayarkan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset uraian
    document.getElementById('uraianContent').innerHTML = '';

    // Hide all conditional fields
    vendorLainnyaGroup?.classList.remove('visible');
    usOnlyGroups.forEach(id => {
        document.getElementById(id)?.classList.remove('visible');
    });
    fesOnlyGroups.forEach(id => {
        document.getElementById(id)?.classList.remove('visible');
    });
    sharedCalcGroups.forEach(id => {
        document.getElementById(id)?.classList.remove('visible');
    });
    document.getElementById('yangDibayarkanManualGroup')?.classList.remove('visible');

    // Remove errors
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
}

// ============================================================
// PREVIEW TABLE
// ============================================================
function renderPreviewTable() {
    const tbody = document.getElementById('previewTableBody');
    const submitBar = document.getElementById('submitBar');

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9">
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>Belum ada data yang diinput. Isi form di atas lalu klik <strong>Simpan Entri</strong>.</p>
            </div>
        </td></tr>`;
        submitBar.style.display = 'none';
        return;
    }

    tbody.innerHTML = entries.map((entry, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${entry.divisi}</strong></td>
            <td>${getCategoryIcon(entry.kategori)} ${entry.kategori}</td>
            <td>${entry.vendor}</td>
            <td class="currency-cell">${formatCurrency(entry.tagihan)}</td>
            <td class="currency-cell">${formatCurrency(entry.yang_dibayarkan)}</td>
            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(entry.uraian)}">${escapeHtml(entry.uraian)}</td>
            <td>${entry.period}</td>
            <td>
                <div class="action-cell">
                    <button class="btn-icon edit" title="Edit" onclick="editEntry(${i})">✏️</button>
                    <button class="btn-icon delete" title="Hapus" onclick="deleteEntry(${i})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    document.getElementById('totalEntries').textContent = entries.length;
    submitBar.style.display = 'flex';
}

function getCategoryIcon(cat) {
    const icons = {
        'Pesawat': '✈️', 'Hotel': '🏨', 'Kereta': '🚆', 'Mobil': '🚗',
        'Per Diem': '💰', 'Trans Lokal': '🚕', 'Transport Dari & Ke': '🚐',
        'Laundry': '👔', 'Lain-lain': '📦'
    };
    return icons[cat] || '📦';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// EDIT & DELETE
// ============================================================
window.editEntry = function (index) {
    const entry = entries[index];
    if (!entry) return;

    editingIndex = index;

    // Populate form
    document.getElementById('tahunAnggaran').value = entry.tahun_anggaran || '2026';
    document.getElementById('costCenterValue').value = entry.cost_center || '';
    document.getElementById('kodeSAPValue').value = entry.kode_sap || '';
    document.getElementById('divisi').value = entry.divisi;
    document.getElementById('kategori').value = entry.kategori;

    // Vendor
    if (['FES', 'US'].includes(entry.vendor)) {
        vendorSelect.value = entry.vendor;
    } else {
        vendorSelect.value = 'Lainnya';
        document.getElementById('vendorLainnya').value = entry.vendor;
        vendorLainnyaGroup.classList.add('visible');
    }
    vendorSelect.dispatchEvent(new Event('change'));

    document.getElementById('noInvoice').value = entry.no_invoice || '';
    document.getElementById('noMpp').value = entry.no_mpp || '';
    document.getElementById('tglBerangkat').value = entry.tgl_berangkat || '';
    document.getElementById('tglKembali').value = entry.tgl_kembali || '';
    document.getElementById('uraianContent').innerHTML = entry.uraian_html || entry.uraian || '';

    // Nominal
    document.getElementById('tagihan').value = entry.tagihan ? formatCurrency(entry.tagihan) : '';
    document.getElementById('serviceFee').value = entry.service_fee ? formatCurrency(entry.service_fee) : '';
    if (entry.vendor === 'FES' && entry.jumlah_qty) {
        document.getElementById('jumlahQty').value = entry.jumlah_qty;
    } else {
        document.getElementById('jumlahQty').value = 1;
    }

    // Yang Dibayarkan: auto-calc (vendor US/FES) atau manual (vendor lain)
    if (entry.vendor === 'US' || entry.vendor === 'FES') {
        // Vendor US/FES: recalculate() sudah handle auto-fill
    } else {
        document.getElementById('yangDibayarkanManual').value = entry.yang_dibayarkan ? formatCurrency(entry.yang_dibayarkan) : '';
    }

    recalculate();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Mode edit — ubah data lalu klik Simpan Entri.', 'info');
};

window.deleteEntry = function (index) {
    if (confirm(`Hapus data #${index + 1} (${entries[index].divisi} - ${entries[index].kategori})?`)) {
        entries.splice(index, 1);
        renderPreviewTable();
        updateEntryTabs();
        showToast('Data berhasil dihapus.', 'info');
    }
};

// ============================================================
// ENTRY TABS
// ============================================================
function updateEntryTabs() {
    const tabsContainer = document.getElementById('entryTabs');
    const addBtn = document.getElementById('btnAddEntry');

    // Remove existing tabs
    tabsContainer.querySelectorAll('.entry-tab').forEach(t => t.remove());

    // Add tabs for each entry + current
    const totalTabs = Math.max(entries.length + 1, 1);
    for (let i = 0; i < totalTabs; i++) {
        const tab = document.createElement('button');
        tab.className = 'entry-tab' + (i === currentEntryIndex ? ' active' : '');
        tab.textContent = `Isi ${i + 1}.`;
        tab.dataset.index = i;
        tab.addEventListener('click', () => {
            currentEntryIndex = i;
            updateEntryTabs();
            if (i < entries.length) {
                window.editEntry(i);
            } else {
                resetForm();
                editingIndex = -1;
            }
        });
        tabsContainer.insertBefore(tab, addBtn);
    }
}

document.getElementById('btnAddEntry').addEventListener('click', function () {
    // Duplikat dari entri terakhir jika ada
    if (entries.length > 0) {
        const last = entries[entries.length - 1];
        currentEntryIndex = entries.length;
        editingIndex = -1;
        duplicateFromEntry(last);
        updateEntryTabs();
        showToast('📋 Data sebelumnya otomatis disalin. Ganti Kategori, Tagihan & Service Fee.', 'info');
    } else {
        currentEntryIndex = entries.length;
        resetForm();
        editingIndex = -1;
        updateEntryTabs();
        showToast('Entri baru siap diisi.', 'info');
    }
});

/**
 * duplicateFromEntry(entry)
 * Isi form dengan data dari entri sebelumnya,
 * KECUALI: Kategori, Tagihan, Service Fee, Jumlah Qty.
 */
function duplicateFromEntry(entry) {
    // Reset form dulu
    resetForm();

    // === Isi field yang di-copy ===

    // Section 1: Informasi Umum
    document.getElementById('tahunAnggaran').value = entry.tahun_anggaran || '2026';
    document.getElementById('costCenterValue').value = entry.cost_center || '';
    document.getElementById('kodeSAPValue').value = entry.kode_sap || '';
    document.getElementById('divisi').value = entry.divisi || '';

    // Section 2: Vendor & Invoice
    const vendorVal = entry.vendor || '';
    if (['FES', 'US'].includes(vendorVal)) {
        vendorSelect.value = vendorVal;
    } else if (vendorVal) {
        vendorSelect.value = 'Lainnya';
        document.getElementById('vendorLainnya').value = vendorVal;
        vendorLainnyaGroup.classList.add('visible');
    }
    vendorSelect.dispatchEvent(new Event('change'));

    document.getElementById('noInvoice').value = entry.no_invoice || '';
    document.getElementById('noMpp').value = entry.no_mpp || '';

    // Section 3: Periode & Tanggal
    const periodParts = (entry.period || '').split(' ');
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    const bulanIdx = bulanNames.indexOf(periodParts[0]);
    if (bulanIdx >= 0) {
        document.getElementById('periodeBulan').value = String(bulanIdx + 1).padStart(2, '0');
    }
    if (periodParts[1]) {
        document.getElementById('periodeTahun').value = periodParts[1];
    }
    document.getElementById('tglBerangkat').value = entry.tgl_berangkat || '';
    document.getElementById('tglKembali').value = entry.tgl_kembali || '';
    document.getElementById('uraianContent').innerHTML = entry.uraian_html || entry.uraian || '';

    // === TIDAK di-copy: Kategori, Tagihan, Service Fee, Jumlah Qty ===
    // (dibiarkan kosong agar user mengisi sendiri)

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// SUBMIT ALL — Simpan ke localStorage
// ============================================================
document.getElementById('btnSubmitAll').addEventListener('click', function () {
    if (entries.length === 0) {
        showToast('Tidak ada data untuk disubmit.', 'error');
        return;
    }
    saveToLocalStorage();
    showToast(`✅ ${entries.length} entri tersimpan di database lokal!`, 'success');
    console.log('[DB] Tersimpan:', entries.length, 'entri di localStorage key:', LS_KEY);
});

// Hapus semua data
document.getElementById('btnClearAll').addEventListener('click', function () {
    if (entries.length === 0) return;
    if (!confirm(`⚠️ Hapus semua ${entries.length} entri dari database lokal? Tindakan ini tidak bisa dibatalkan.`)) return;

    entries = [];
    clearLocalStorage();
    editingIndex = -1;
    currentEntryIndex = 0;

    resetForm();
    renderPreviewTable();
    updateEntryTabs();
    showToast('🗑️ Semua data berhasil dihapus.', 'info');
});

// ============================================================
// EXPORT KE EXCEL (Format Standar sesuai generate_template.js)
// ============================================================

/**
 * Kolom standar sesuai Template_Standar_Pesawat.xlsx
 * dari generate_template.js:
 *   No, Vendor, No Invoice, SAP, No MPP, Cost Center, Divisi,
 *   Tagihan, Service Fee, DPP Service Fee, PPN, PPH23,
 *   Tagihan Service, Jumlah Tagihan, Yang Dibayarkan, Uraian
 */
const STANDAR_HEADERS = [
    'No', 'Vendor', 'No Invoice', 'SAP', 'No MPP', 'Cost Center', 'Divisi',
    'Tagihan', 'Service Fee', 'DPP Service Fee', 'PPN', 'PPH23',
    'Tagihan Service', 'Jumlah Tagihan', 'Yang Dibayarkan', 'Uraian'
];

const STANDAR_COL_WIDTHS = [
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

/**
 * Mengonversi satu entry form ke satu baris format standar Excel.
 * Urutan kolom harus PERSIS sama dengan STANDAR_HEADERS.
 */
function entryToStandarRow(entry, index) {
    return [
        index + 1,                          // No
        entry.vendor || '',                  // Vendor
        entry.no_invoice || '',              // No Invoice
        entry.kode_sap || '',                // SAP
        entry.no_mpp || '',                  // No MPP
        entry.cost_center || '',             // Cost Center
        entry.divisi || '',                  // Divisi
        entry.tagihan || 0,                  // Tagihan
        entry.service_fee || 0,              // Service Fee
        entry.dpp_service_fee || 0,          // DPP Service Fee
        entry.ppn || 0,                      // PPN
        entry.pph23 || 0,                    // PPH23
        entry.tagihan_service || 0,          // Tagihan Service
        entry.jumlah_tagihan || 0,           // Jumlah Tagihan
        entry.yang_dibayarkan || 0,          // Yang Dibayarkan
        entry.uraian || '',                  // Uraian
    ];
}

/**
 * Export semua entries ke file .xlsx dengan format standar.
 * File yang dihasilkan bisa langsung di-upload kembali ke dashboard
 * dan akan ter-parse dengan benar oleh excelParser.js.
 */
function exportToExcel() {
    if (entries.length === 0) {
        showToast('Tidak ada data untuk di-export.', 'error');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // === Sheet 1: Data Standar ===
        const rows = [STANDAR_HEADERS];
        entries.forEach((entry, i) => {
            rows.push(entryToStandarRow(entry, i));
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = STANDAR_COL_WIDTHS;

        // Format kolom nominal sebagai angka (kolom H-O, index 7-14)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let r = 1; r <= range.e.r; r++) {
            for (let c = 7; c <= 14; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (ws[addr] && typeof ws[addr].v === 'number') {
                    ws[addr].t = 'n';  // tipe number
                    ws[addr].z = '#,##0'; // format ribuan
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Data Rekap');

        // === Sheet 2: Detail Lengkap (dengan field tambahan pajak dll) ===
        const detailHeaders = [
            'No', 'Tahun Anggaran', 'Vendor', 'No Invoice', 'SAP', 'No MPP',
            'Cost Center', 'Divisi', 'Kategori', 'Periode',
            'Tgl Berangkat', 'Tgl Kembali',
            'Tagihan', 'Service Fee', 'Jumlah (Qty)', 'DPP Service Fee', 'PPN', 'PPH23',
            'Tagihan Service', 'Jumlah Tagihan', 'Yang Dibayarkan',
            'Uraian'
        ];

        const detailRows = [detailHeaders];
        entries.forEach((entry, i) => {
            detailRows.push([
                i + 1,
                entry.tahun_anggaran || '',
                entry.vendor || '',
                entry.no_invoice || '',
                entry.kode_sap || '',
                entry.no_mpp || '',
                entry.cost_center || '',
                entry.divisi || '',
                entry.kategori || '',
                entry.period || '',
                entry.tgl_berangkat || '',
                entry.tgl_kembali || '',
                entry.tagihan || 0,
                entry.service_fee || 0,
                entry.jumlah_qty || 1,
                entry.dpp_service_fee || 0,
                entry.ppn || 0,
                entry.pph23 || 0,
                entry.tagihan_service || 0,
                entry.jumlah_tagihan || 0,
                entry.yang_dibayarkan || 0,
                entry.uraian || '',
            ]);
        });

        const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
        wsDetail['!cols'] = detailHeaders.map(h => ({
            wch: Math.max(h.length + 4, 14)
        }));

        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Lengkap');

        // === Generate filename ===
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const kategoriSet = [...new Set(entries.map(e => e.kategori))];
        const kategoriLabel = kategoriSet.length === 1 ? kategoriSet[0] : 'Campuran';
        const filename = `Rekap_${kategoriLabel}_${dateStr}.xlsx`;

        // === Download ===
        XLSX.writeFile(wb, filename);

        showToast(`✅ File "${filename}" berhasil di-download!`, 'success');
        console.log(`[Export] ${entries.length} entri → ${filename}`);
        console.log('[Export] Sheet 1: Format standar (16 kolom, kompatibel upload)');
        console.log('[Export] Sheet 2: Detail lengkap (21 kolom)');

    } catch (err) {
        console.error('[Export] Error:', err);
        showToast('Gagal export Excel: ' + err.message, 'error');
    }
}

// Bind export button
document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// INIT — Muat data dari localStorage saat halaman dibuka
// ============================================================
(function init() {
    const restored = loadFromLocalStorage();
    if (restored) {
        renderPreviewTable();
        updateEntryTabs();
        // Tampilkan entri terakhir di form
        const lastIdx = entries.length - 1;
        currentEntryIndex = lastIdx;
        updateEntryTabs();
        window.editEntry(lastIdx);
        showToast(`📂 ${entries.length} entri dimuat dari database lokal.`, 'info');
        console.log('[DB] Dimuat dari localStorage:', entries.length, 'entri');
    } else {
        renderPreviewTable();
        updateEntryTabs();
    }
    console.log('[InputForm] Initialized — localStorage key:', LS_KEY);
    console.log('[InputForm] Export Excel format: 16 kolom standar (kompatibel dengan excelParser.js)');
})();
