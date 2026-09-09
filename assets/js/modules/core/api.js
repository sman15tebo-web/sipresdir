// ============================================================
// KONFIGURASI API & CORE STATE
// ============================================================
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzbOaXmTKe3TobQ2ndQY07_YU2Q_nu5atOO5JRoGwBdJIdv1mD-O-5bWPELoy6Q5g/exec';

// Konfigurasi Multitenant (Banyak Sekolah dalam 1 Frontend)
const TENANT_CONFIG = {
    // Ganti nilai-nilai ini dengan URL Web App Google Apps Script masing-masing sekolah
    "sipresdir": "https://script.google.com/macros/s/AKfycbzbOaXmTKe3TobQ2ndQY07_YU2Q_nu5atOO5JRoGwBdJIdv1mD-O-5bWPELoy6Q5g/exec",
    "sekolah2": DEFAULT_API_URL,
    "sekolah3": DEFAULT_API_URL,
    "default": DEFAULT_API_URL // HARUS ADA!
};

let API_URL = '';
function initTenant() {
    const isElectron = navigator.userAgent.toLowerCase().indexOf('electron/') > -1;
    if (isElectron) {
        console.log("Running in Electron mode, menggunakan IPC");
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tenantId = urlParams.get('id') || localStorage.getItem('activeTenant') || 'default';

        if (TENANT_CONFIG[tenantId]) {
            API_URL = TENANT_CONFIG[tenantId];
            localStorage.setItem('activeTenant', tenantId);
        } else if (TENANT_CONFIG['default']) {
            API_URL = TENANT_CONFIG['default'];
            console.warn("Kode tenant tidak ditemukan, fallback ke default");
        } else {
            const firstKey = Object.keys(TENANT_CONFIG)[0];
            API_URL = TENANT_CONFIG[firstKey];
        }

        new URL(API_URL);
    } catch (error) {
        console.warn('Konfigurasi tenant tidak valid, dipaksa ke URL default.', error);
        API_URL = DEFAULT_API_URL;
    }
}
initTenant();

let currentUser = null,
    isSidebarOpen = true,
    appCache = { siswa: null, guru: null },
    existingClasses = [],
    guruChartInstance = null,
    adminChartInstance = null,
    loadingInterval;

const tableState = {
    siswa: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
    siswaNonaktif: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
    guru: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
    libur: { fullData: [], filtered: [], limit: 5, page: 1, search: '' },
    rekap: { fullData: [], filtered: [], limit: 10, page: 1, search: '' },
    monitoring: { fullData: [], filtered: [], limit: 10, page: 1, search: '', statusFilter: '', classFilter: '', cacheKey: '' },
    wfh: { fullData: [], filtered: [], limit: 5, page: 1, search: '' },
    pelanggaran: { fullData: [], filtered: [], limit: 10, page: 1, search: '', kategoriFilter: '' }
};

// ============================================================
// FUNGSI UTAMA (API, LOADING, ALERT, MODAL)
// ============================================================
function setSession(data) {
    const jsonString = JSON.stringify(data);
    const obfuscated = btoa(unescape(encodeURIComponent(jsonString)));
    localStorage.setItem('absensiAppSession', `_sipresdir_${obfuscated}_secure_`);
}

function getSession() {
    const stored = localStorage.getItem('absensiAppSession');
    if (!stored || !stored.startsWith('_sipresdir_') || !stored.endsWith('_secure_')) return null;
    try {
        const obfuscated = stored.substring(11, stored.length - 8);
        return JSON.parse(decodeURIComponent(escape(atob(obfuscated))));
    } catch (e) { return null; }
}

async function fetchAPI(action, params = {}) {
    const payload = { ...params, action, _ts: Date.now() };
    if (currentUser && currentUser.token && !payload.token) payload.token = currentUser.token;
    try {
        if (window.electronAPI) {
            return await window.electronAPI.queryDB(action, payload);
        }

        const endpoint = API_URL || DEFAULT_API_URL;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

        const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Fetch API Error parsing JSON. Response text:", text);
            let titleMatch = text.match(/<title>(.*?)<\/title>/i);
            let title = titleMatch ? titleMatch[1] : "HTML Error";
            throw new Error(`Server Response Error: [${title}] ${text.substring(0, 80)}...`);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const countdownEl = document.getElementById('loadingCountdown');
    const textEl = document.getElementById('loadingText');

    if (!overlay) return;
    overlay.classList.remove('hidden');

    if (countdownEl) {
        let timeLeft = 8;
        countdownEl.textContent = timeLeft;
        const parent = countdownEl.parentElement;
        if (parent) parent.style.display = 'flex';

        clearInterval(loadingInterval);
        loadingInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                countdownEl.textContent = timeLeft;
            } else if (timeLeft === 0) {
                if (parent) parent.style.display = 'none';
                if (textEl) {
                    textEl.innerHTML = 'Sedang memproses data... <br><span class="text-[10px] text-orange-600 font-bold">Tunggu sebentar..</span>';
                }
            }
        }, 1000);
    }

    if (textEl) {
        textEl.innerHTML = 'Memproses... <br><span class="text-[10px] text-gray-500 font-normal">Mohon tunggu</span>';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
    clearInterval(loadingInterval);
}

function showModal(content) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML = `<div class="fixed inset-0 z-50 flex items-center justify-center p-4"><div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onclick="closeModal()"></div><div class="relative w-full max-w-2xl transform transition-all animate-fade-in">${content}</div></div>`;
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    if (container) container.innerHTML = '';
}

function showAlert(type, message) {
    const icon = type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'error';
    const text = String(message ?? '');

    if (window.Swal) {
        Swal.fire({
            icon,
            title: type === 'success' ? 'Berhasil' : type === 'warning' ? 'Perhatian' : type === 'info' ? 'Informasi' : 'Terjadi Kesalahan',
            text,
            confirmButtonText: 'OK',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }
    window.alert(text || 'Terjadi kesalahan.');
}

// ============================================================
// INISIALISASI & KONFIGURASI APP
// ============================================================
// Field yang TIDAK boleh masuk localStorage (terlalu besar, menyebabkan silent fail)
const CONFIG_FIELDS_EXCLUDE_CACHE = ['logo', 'logoInstansi'];

function stripLargeFields(data) {
    if (!data || typeof data !== 'object') return data;
    const out = {};
    Object.entries(data).forEach(([k, v]) => {
        if (!CONFIG_FIELDS_EXCLUDE_CACHE.includes(k)) out[k] = v;
    });
    return out;
}

async function initAppConfigs() {
    try {
        // Load dari cache lokal dulu (tanpa logo besar) agar UI terasa cepat
        const cachedConfig = localStorage.getItem('appConfigCache');
        if (cachedConfig) {
            try {
                const result = JSON.parse(cachedConfig);
                applyAppConfigToUI(result);
            } catch (e) { }
        }

        const settingsResponse = window.electronAPI ? await fetchAPI('getAppConfig') : await fetchAPI('getSettings');
        const result = settingsResponse && settingsResponse.success && settingsResponse.data
            ? settingsResponse.data
            : (settingsResponse && typeof settingsResponse === 'object' && !settingsResponse.message ? settingsResponse : null);
        if (result) {
            // Simpan ke cache HANYA field teks (tanpa logo base64 besar)
            try { localStorage.setItem('appConfigCache', JSON.stringify(stripLargeFields(result))); } catch (e) { console.warn('Cache config gagal:', e); }
            applyAppConfigToUI(result);
        }

        // Ambil status libur hari ini
        const statusHari = await fetchAPI('cekWFHToday');
        if (statusHari) window.appStatusHari = statusHari;
    } catch (error) {
        console.error("Gagal memuat konfigurasi aplikasi", error);
    }
}

function applyAppConfigToUI(result) {
    const safeConfig = {
        logo: 'assets/img/imgsipresdir.png',
        logoInstansi: 'assets/img/imgsipresdir.png',
        namaInstansi: 'Instansi Pendidikan',
        namasekolah: 'SiPresDiR Plus',
        alamat: '',
        tahun: new Date().getFullYear(),
        website: '#',
        runningtext: 'Selamat datang di SiPresDiR Plus',
        ...(result || {})
    };
    window.appConfig = safeConfig;
    applyGradientColors(safeConfig);
    document.querySelectorAll('.dyn-logo').forEach(el => { if (el.tagName === 'IMG') el.src = safeConfig.logo; });
    document.querySelectorAll('.dyn-logoInstansi').forEach(el => { if (el.tagName === 'IMG') el.src = safeConfig.logoInstansi || safeConfig.logo; });
    document.querySelectorAll('.dyn-namaInstansi').forEach(el => el.textContent = safeConfig.namaInstansi);
    document.querySelectorAll('.dyn-namasekolah').forEach(el => el.textContent = safeConfig.namasekolah);
    document.querySelectorAll('.dyn-alamat').forEach(el => el.textContent = safeConfig.alamat);
    document.querySelectorAll('.dyn-website').forEach(el => el.textContent = safeConfig.website);
    document.querySelectorAll('.dyn-website-link').forEach(el => el.href = (safeConfig.website.startsWith('http') ? safeConfig.website : '#'));
    document.querySelectorAll('.dyn-runningtext').forEach(el => el.textContent = safeConfig.runningtext);
    document.querySelectorAll('.dyn-tahun').forEach(el => el.textContent = safeConfig.tahun);

    // Logika Tampilan Template Surat
    const actContainer = document.getElementById('actionTemplateSuratContainer');
    const btnLihat = document.getElementById('btnLihatTemplateSurat');
    if (actContainer && btnLihat) {
        if (safeConfig.url_template_surat) {
            actContainer.classList.remove('hidden');
            btnLihat.href = safeConfig.url_template_surat;
        } else {
            actContainer.classList.add('hidden');
        }
    }
}

function applyPengaturanFormData(form, data) {
    if (!form || !data) {
        console.warn('applyPengaturanFormData: form or data is missing', { form, data });
        return;
    }

    const source = data.data && typeof data.data === 'object' ? data.data : data;
    const normalized = {
        namaInstansi: source.namaInstansi ?? source.instansi ?? '',
        namaOpd: source.namaOpd ?? source.nama_opd ?? '',
        namasekolah: source.namasekolah ?? source.namaSekolah ?? source.sekolah ?? '',
        alamat: source.alamat ?? '',
        teleponSekolah: source.teleponSekolah ?? source.telepon ?? '',
        emailSekolah: source.emailSekolah ?? source.email ?? '',
        website: source.website ?? '',
        runningtext: source.runningtext ?? source.runningText ?? '',
        logo: source.logo ?? '',
        logoInstansi: source.logoInstansi ?? source.logo_instansi ?? '',
        gradient1: source.gradient1 ?? '#6366f1',
        gradient2: source.gradient2 ?? '#a855f7',
        gradient3: source.gradient3 ?? '#3b82f6',
        gradient4: source.gradient4 ?? '#ec4899'
    };

    // Pastikan kita mencoba querySelector juga jika form.elements gagal
    ['namaInstansi', 'namaOpd', 'namasekolah', 'alamat', 'teleponSekolah', 'emailSekolah', 'website', 'runningtext'].forEach(name => {
        let input = form.elements[name];
        if (!input) input = form.querySelector(`[name="${name}"]`);

        if (input && normalized[name] !== undefined && normalized[name] !== null) {
            input.value = normalized[name];
        }
    });

    ['gradient1', 'gradient2', 'gradient3', 'gradient4'].forEach((name, index) => {
        let input = form.elements[name];
        if (!input) input = form.querySelector(`[name="${name}"]`);

        if (input) {
            input.value = normalized[name] || ['#6366f1', '#a855f7', '#3b82f6', '#ec4899'][index];
        }
    });

    const defLogo = 'assets/img/imgsipresdir.png';
    const logo = normalized.logo;
    const logoInstansi = normalized.logoInstansi;

    const logoInput = document.getElementById('finalLogoData');
    const logoPreview = document.getElementById('previewLogoSetting');
    const instansiInput = document.getElementById('finalLogoInstansiData');
    const instansiPreview = document.getElementById('previewLogoInstansiSetting');

    if (logoInput) logoInput.value = logo;
    if (instansiInput) instansiInput.value = logoInstansi;

    if (logoPreview) {
        logoPreview.onerror = () => { logoPreview.onerror = null; logoPreview.src = defLogo; };
        logoPreview.src = logo || defLogo;
    }
    if (instansiPreview) {
        instansiPreview.onerror = () => { instansiPreview.onerror = null; instansiPreview.src = defLogo; };
        instansiPreview.src = logoInstansi || defLogo;
    }

    updateLogoClearButton('instansi', logoInstansi);
    updateLogoClearButton('sekolah', logo);
    applyGradientColors(normalized);
}

async function loadPengaturan() {
    stopAndBack(false); setActiveMenu('Pengaturan');
    await showView('view-pengaturan');
    setupLogoUploadListeners();
    const offlinePanel = document.getElementById('offlineSettingsPanel');
    const onlineTabButtons = [document.getElementById('btn-tab-umum'), document.getElementById('btn-tab-keamanan')];
    const onlineTabs = [document.getElementById('tab-umum'), document.getElementById('tab-keamanan')];
    const offlineTabButton = document.getElementById('btn-tab-offline');
    if (window.electronAPI) {
        if (offlineTabButton) offlineTabButton.classList.add('hidden');
        if (offlinePanel) offlinePanel.classList.add('hidden');
        await loadOfflineSettings();
    } else {
        if (offlineTabButton) offlineTabButton.classList.add('hidden');
        onlineTabButtons.forEach(el => el && el.classList.remove('hidden'));
        onlineTabs.forEach(el => el && el.classList.remove('hidden'));
        if (offlinePanel) offlinePanel.classList.add('hidden');
    }
    document.querySelectorAll('.offline-only-settings').forEach(el => el.classList.toggle('hidden', !window.electronAPI));
    const securityTab = document.getElementById('tab-keamanan');
    const offlineForm = document.getElementById('offlineAccountsForm');
    const onlinePasswordForm = securityTab ? Array.from(securityTab.querySelectorAll('form')).find(form => form.id !== 'offlineAccountsForm') : null;
    const backupPanel = document.getElementById('backupRestorePanel');
    if (securityTab && offlineForm && onlinePasswordForm) {
        if (backupPanel && backupPanel.parentNode === securityTab) securityTab.insertBefore(offlineForm, backupPanel);
        else if (offlineForm.parentNode !== securityTab) securityTab.appendChild(offlineForm);
    }
    const onlineAdminUsername = document.getElementById('onlineAdminUsername');
    if (onlineAdminUsername) onlineAdminUsername.value = currentUser?.username || 'admin';
    let generalTab = document.getElementById('tab-umum');
    if (!generalTab) {
        const target = document.getElementById('view-pengaturan');
        const html = await loadHTML('view-pengaturan');
        if (target) target.innerHTML = normalizeViewHTML('view-pengaturan', html);
        generalTab = document.getElementById('tab-umum');
    }
    let form = generalTab ? generalTab.querySelector('form') : null;
    for (let attempt = 0; !form && attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const currentGeneralTab = document.getElementById('tab-umum');
        form = currentGeneralTab ? currentGeneralTab.querySelector('form') : null;
    }
    const token = currentUser ? currentUser.token : null;
    if (!form) {
        showAlert('error', 'Form pengaturan umum belum siap. Silakan buka ulang menu Pengaturan.');
        return;
    }
    try {
        // Baca cache teks (tanpa logo) dari localStorage sebagai tampilan awal cepat
        const rawCache1 = localStorage.getItem('app_configs');
        const rawCache2 = localStorage.getItem('appConfigCache');
        let mergedCacheData = {};
        if (rawCache2) { try { mergedCacheData = { ...mergedCacheData, ...JSON.parse(rawCache2) }; } catch (e) { } }
        if (rawCache1) { try { mergedCacheData = { ...mergedCacheData, ...JSON.parse(rawCache1) }; } catch (e) { } }
        if (Object.keys(mergedCacheData).length > 0) {
            applyPengaturanFormData(form, mergedCacheData);
        }

        // Selalu fetch dari database/server untuk mendapatkan data LENGKAP termasuk logo
        const token = currentUser ? currentUser.token : null;
        const res = window.electronAPI ? await fetchAPI('getAppConfig') : await fetchAPI('getLinkSettings', { token: token });

        let settingsData = null;
        if (res && res.success === true && res.data) {
            settingsData = res.data;
        } else if (res && typeof res === 'object' && !res.message && res.namasekolah !== undefined) {
            // Response langsung berupa object data (tanpa wrapper)
            settingsData = res;
        }

        // Handle jika backend mereturn Array
        if (Array.isArray(settingsData) && settingsData.length > 0) {
            settingsData = settingsData[0];
        }

        if (settingsData && typeof settingsData === 'object') {
            // finalSettings = gabungan cache teks + data segar dari server (termasuk logo)
            const finalSettings = { ...mergedCacheData, ...settingsData };
            // Simpan ke cache HANYA field teks (logo tidak disimpan karena bisa ratusan KB)
            try {
                const cacheOnly = stripLargeFields(finalSettings);
                localStorage.setItem('app_configs', JSON.stringify(cacheOnly));
                localStorage.setItem('appConfigCache', JSON.stringify(cacheOnly));
            } catch (e) { console.warn('Gagal simpan cache pengaturan:', e); }
            // Render form dengan data LENGKAP (termasuk logo dari server)
            applyPengaturanFormData(form, finalSettings);
            console.info('[Pengaturan] Form berhasil diisi', Object.keys(finalSettings));
        } else if (res && res.success === false) {
            console.warn('loadPengaturan: server error -', res.message);
            showAlert('error', res.message || 'Data pengaturan gagal dimuat.');
            if (Object.keys(mergedCacheData).length > 0) {
                applyPengaturanFormData(form, mergedCacheData);
            }
        } else {
            console.warn('[Pengaturan] Respons tidak berisi data pengaturan', res);
        }
    } catch (e) {
        console.error('Gagal memuat pengaturan umum:', e);
        showAlert('error', 'Pengaturan umum gagal dimuat: ' + (e.message || e));
    }
}

async function loadOfflineSettings() {
    const form = document.getElementById('offlineAccountsForm');
    if (!form || !window.electronAPI) return;
    try {
        const config = await window.electronAPI.getOfflineConfig();
        form.elements.offlineUsername.value = config.admin?.username || '';
        form.elements.guruUsername.value = config.guru?.username || '';
        form.elements.offlinePassword.value = '';
        form.elements.offlinePasswordConfirm.value = '';
        form.elements.guruPassword.value = '';
        const link = localStorage.getItem('customSyncLink') || config.link_exec_sync || '';
        const linkInput = document.getElementById('syncExecReadonly');
        if (linkInput) linkInput.value = link;
    } catch (error) {
        showAlert('error', 'Konfigurasi offline tidak dapat dibaca.');
    }
}

async function saveOfflineCredentials(event) {
    event.preventDefault();
    if (!window.electronAPI) return;
    const form = event.target;
    const username = form.elements.offlineUsername.value.trim();
    const password = form.elements.offlinePassword.value;
    const confirmation = form.elements.offlinePasswordConfirm.value;
    if (password.length < 6) {
        showAlert('error', 'Password admin offline minimal 6 karakter.');
        return;
    }
    if (password !== confirmation) {
        showAlert('error', 'Konfirmasi password tidak sama.');
        return;
    }
    showLoading();
    try {
        const result = await window.electronAPI.saveOfflineConfig({ admin: { username, password } });
        hideLoading();
        if (result.success) {
            form.elements.offlinePassword.value = '';
            form.elements.offlinePasswordConfirm.value = '';
            showAlert('success', result.message);
        } else {
            showAlert('error', result.message);
        }
    } catch (error) {
        hideLoading();
        showAlert('error', 'Kredensial offline gagal disimpan.');
    }
}

window.saveOfflineCredentials = saveOfflineCredentials;

async function saveOfflineAccounts(event) {
    event.preventDefault();
    if (!window.electronAPI) return;
    const form = event.target;
    const username = form.elements.offlineUsername.value.trim();
    const password = form.elements.offlinePassword.value;
    const confirmation = form.elements.offlinePasswordConfirm.value;
    const guruUsername = form.elements.guruUsername.value.trim();
    const guruPassword = form.elements.guruPassword.value;
    if (!username || (!password && !guruPassword && !guruUsername)) {
        showAlert('warning', 'Isi data akun offline yang ingin diubah.');
        return;
    }
    if (password && (password.length < 6 || password !== confirmation)) {
        showAlert('error', 'Password admin offline minimal 6 karakter dan konfirmasinya harus sama.');
        return;
    }
    if (guruPassword && guruPassword.length < 6) {
        showAlert('error', 'Password guru piket offline minimal 6 karakter.');
        return;
    }
    try {
        const current = await window.electronAPI.getOfflineConfig();
        const result = await window.electronAPI.saveOfflineConfig({
            admin: { username, password: password || current.admin.password },
            guru: { username: guruUsername || current.guru?.username || '', password: guruPassword || current.guru?.password || '' }
        });
        if (result.success) {
            form.elements.offlinePassword.value = '';
            form.elements.offlinePasswordConfirm.value = '';
            form.elements.guruPassword.value = '';
            showAlert('success', result.message);
        } else showAlert('error', result.message);
    } catch (error) {
        showAlert('error', error.message || error);
    }
}

async function copySyncExecLink() {
    const input = document.getElementById('syncExecReadonly');
    if (!input || !input.value) return showAlert('warning', 'Link Exec belum tersedia.');
    try {
        await navigator.clipboard.writeText(input.value);
        showAlert('success', 'Link Exec berhasil disalin.');
    } catch (error) {
        input.select();
        document.execCommand('copy');
        showAlert('success', 'Link Exec berhasil disalin.');
    }
}

window.saveOfflineAccounts = saveOfflineAccounts;
window.copySyncExecLink = copySyncExecLink;

async function saveLinkData(e) {
    e.preventDefault(); const fd = new FormData(e.target); const token = currentUser ? currentUser.token : null;
    const data = {
        namaInstansi: fd.get('namaInstansi'),
        namaOpd: fd.get('namaOpd'),
        logoInstansi: document.getElementById('finalLogoInstansiData').value,
        namasekolah: fd.get('namasekolah'),
        logo: document.getElementById('finalLogoData').value,
        alamat: fd.get('alamat'),
        teleponSekolah: fd.get('teleponSekolah'),
        emailSekolah: fd.get('emailSekolah'),
        gradient1: fd.get('gradient1'),
        gradient2: fd.get('gradient2'),
        gradient3: fd.get('gradient3'),
        gradient4: fd.get('gradient4'),
        website: fd.get('website'),
        runningtext: fd.get('runningtext')
    };
    showLoading();
    try {
        const res = window.electronAPI
            ? await fetchAPI('saveAppConfig', { newConfig: data })
            : await fetchAPI('updateLinkSettings', { token: token, data: data });
        hideLoading();
        if (res.success) {
            // Simpan ke cache hanya field teks (tanpa logo besar)
            try {
                const cachedData = JSON.parse(localStorage.getItem('app_configs') || '{}');
                const cacheOnly = stripLargeFields({ ...cachedData, ...data });
                localStorage.setItem('app_configs', JSON.stringify(cacheOnly));
                localStorage.setItem('appConfigCache', JSON.stringify(cacheOnly));
            } catch (e) { console.warn('Gagal simpan cache setelah save:', e); }
            applyPengaturanFormData(e.target, data);
            showAlert('success', res.message);
            initAppConfigs();
        }
        else { showAlert('error', res.message); }
    } catch (err) { hideLoading(); }
}

// LOGIKA UPLOAD & CROP LOGO
let cropperInstance = null;
let targetCropInput = '';
let targetCropPreview = '';

document.addEventListener("DOMContentLoaded", async function () {
    const dateElement = document.getElementById('currentDateDisplay');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const dateInput = document.getElementById('tgl_export_harian');
    if (dateInput) {
        const d = new Date();
        dateInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function setupLogoUpload(inputId, hiddenInputId, previewId) {
        const fileInput = document.getElementById(inputId);
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) { showAlert('error', 'Ukuran maksimal 2MB!'); this.value = ''; return; }
                    targetCropInput = hiddenInputId;
                    targetCropPreview = previewId;
                    const reader = new FileReader();
                    reader.onload = function (event) { openCropModal(event.target.result); };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    setupLogoUploadListeners();

    await initAppConfigs();
    await checkSession();
});

function setupLogoUploadListeners() {
    [['inputLogoFile', 'finalLogoData', 'previewLogoSetting'], ['inputLogoInstansiFile', 'finalLogoInstansiData', 'previewLogoInstansiSetting']].forEach(([inputId, hiddenInputId, previewId]) => {
        const fileInput = document.getElementById(inputId);
        if (!fileInput || fileInput.dataset.cropBound === 'true') return;
        fileInput.dataset.cropBound = 'true';
        fileInput.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { showAlert('error', 'Ukuran maksimal 2MB!'); this.value = ''; return; }
            targetCropInput = hiddenInputId;
            targetCropPreview = previewId;
            const reader = new FileReader();
            reader.onload = event => openCropModal(event.target.result);
            reader.readAsDataURL(file);
        });
    });
}

function applyGradientColors(config) {
    const root = document.documentElement;
    root.style.setProperty('--gradient-1', config.gradient1 || '#6366f1');
    root.style.setProperty('--gradient-2', config.gradient2 || '#a855f7');
    root.style.setProperty('--gradient-3', config.gradient3 || '#3b82f6');
    root.style.setProperty('--gradient-4', config.gradient4 || '#ec4899');
}

function openCropModal(imageSrc) {
    const modal = document.getElementById('cropModal');
    const image = document.getElementById('imageToCrop');
    modal.classList.remove('hidden');
    image.src = imageSrc;
    if (cropperInstance) { cropperInstance.destroy(); }
    cropperInstance = new Cropper(image, { aspectRatio: 1 / 1, viewMode: 1, background: false, autoCropArea: 0.8, dragMode: 'move' });
}

function updateLogoClearButton(type, value) {
    const button = document.getElementById(type === 'instansi' ? 'clearLogoInstansi' : 'clearLogoSekolah');
    if (button) button.classList.toggle('hidden', !value);
}

function clearLogo(type) {
    const inputId = type === 'instansi' ? 'finalLogoInstansiData' : 'finalLogoData';
    const previewId = type === 'instansi' ? 'previewLogoInstansiSetting' : 'previewLogoSetting';
    const fileId = type === 'instansi' ? 'inputLogoInstansiFile' : 'inputLogoFile';
    document.getElementById(inputId).value = '';
    document.getElementById(previewId).src = '';
    document.getElementById(fileId).value = '';
    updateLogoClearButton(type, '');
}

function closeCropModal() {
    document.getElementById('cropModal').classList.add('hidden');
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    document.getElementById('inputLogoFile').value = '';
    document.getElementById('inputLogoInstansiFile').value = '';
}

function applyCrop() {
    if (!cropperInstance) return;
    const canvas = cropperInstance.getCroppedCanvas({ width: 400, height: 400 });
    const croppedBase64 = canvas.toDataURL('image/png');

    document.getElementById(targetCropPreview).src = croppedBase64;
    document.getElementById(targetCropInput).value = croppedBase64;
    updateLogoClearButton(targetCropPreview === 'previewLogoInstansiSetting' ? 'instansi' : 'sekolah', croppedBase64);
    closeCropModal();
}

// ============================================================
// MANAJEMEN TABEL (PAGINATION, FILTER, SEARCH)
// ============================================================
function handleTableSearch(type, query) {
    tableState[type].search = query.toLowerCase();
    tableState[type].page = 1;
    processTableData(type);
}

function handleTableClassFilter(type, value) {
    if (tableState[type]) {
        tableState[type].classFilter = value;
        tableState[type].page = 1;

        if (type === 'monitoring') {
            const dateInput = document.getElementById('tgl_export_harian');
            if (dateInput && dateInput.value) {
                tableState.monitoring.cacheKey = '';
                loadMonitoringAbsensi(true);
                return;
            }
        }

        processTableData(type);
    }
}

function handleTableStatusFilter(type, status) {
    if (tableState[type]) {
        tableState[type].statusFilter = status;
        tableState[type].page = 1;
        processTableData(type);
    }
}

function handleTableLimit(type, limit) {
    tableState[type].limit = limit === 'all' ? Infinity : parseInt(limit);
    tableState[type].page = 1;
    processTableData(type);
}

function changePage(type, direction) {
    const state = tableState[type];
    const maxPage = Math.ceil(state.filtered.length / state.limit);
    const newPage = state.page + direction;
    if (newPage >= 1 && newPage <= maxPage) {
        state.page = newPage;
        processTableData(type);
    }
}

function processTableData(type) {
    const state = tableState[type];
    let result = [...state.fullData];

    if ((type === 'siswa' || type === 'guru' || type === 'monitoring' || type === 'pelanggaran') && state.classFilter) {
        result = result.filter(item => item.kelas === state.classFilter);
    }
    if (type === 'monitoring' && state.statusFilter) {
        result = result.filter(item => item.status === state.statusFilter);
    }
    if (state.search) {
        const query = state.search.toLowerCase();
        result = result.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query)));
    }

    state.filtered = result;
    const total = state.filtered.length;
    const totalPages = Math.ceil(total / state.limit);

    if (state.page > totalPages && totalPages > 0) state.page = totalPages;
    if (total === 0) state.page = 1;

    const startIdx = (state.page - 1) * state.limit;
    const endIdx = startIdx + state.limit;
    const pagedData = state.filtered.slice(startIdx, endIdx);

    if (type === 'siswa') renderSiswaRows(pagedData, startIdx);
    else if (type === 'siswaNonaktif') renderSiswaNonaktifRows(pagedData, startIdx);
    else if (type === 'guru') renderGuruRows(pagedData, startIdx);
    else if (type === 'libur') renderLiburRows(pagedData, startIdx);
    else if (type === 'rekap') renderRekapRows(pagedData);
    else if (type === 'monitoring') renderMonitoringRows(pagedData, startIdx);
    else if (type === 'wfh') renderWfhRows(pagedData, startIdx);
    else if (type === 'pelanggaran') {
        renderPelanggaranRows(pagedData, startIdx);
        document.getElementById('info-pelanggaran').textContent = `Menampilkan ${startIdx + 1}-${Math.min(endIdx, total)} dari ${total} data`;
        document.getElementById('btn-prev-pelanggaran').disabled = state.page === 1;
        document.getElementById('btn-next-pelanggaran').disabled = state.page === totalPages || totalPages === 0;
    }

    if (type !== 'pelanggaran') {
        updatePaginationUI(type, startIdx, pagedData.length, total, state.page, totalPages);
    }
}

function updatePaginationUI(type, startIdx, currentCount, total, currentPage, totalPages) {
    const infoEl = document.getElementById(`info-${type}`);
    const btnPrev = document.getElementById(`btn-prev-${type}`);
    const btnNext = document.getElementById(`btn-next-${type}`);

    if (total === 0) {
        if (infoEl) infoEl.textContent = 'Tidak ada data ditemukan.';
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
    } else {
        const end = startIdx + currentCount;
        if (infoEl) infoEl.textContent = `Menampilkan ${startIdx + 1} - ${end} dari ${total} data`;
        if (btnPrev) btnPrev.disabled = currentPage === 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
    }
}

// ============================================================
// OTENTIKASI & SESI (LOGIN/LOGOUT)
// ============================================================
function switchLoginTab(tab) {
    document.getElementById('loginError').classList.add('hidden');
    const btnSiswa = document.getElementById('btnSiswaTab');
    const btnAdmin = document.getElementById('btnAdminTab');
    const active = "bg-white text-indigo-600 shadow-sm";
    const inactive = "text-gray-500 hover:text-gray-700 hover:bg-gray-200";

    btnSiswa.className = `flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${tab === 'siswa' ? active : inactive}`;
    btnAdmin.className = `flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${tab === 'admin' ? active : inactive}`;

    if (tab === 'admin') {
        document.getElementById('formAdminLogin').classList.remove('hidden');
        document.getElementById('formSiswaLogin').classList.add('hidden');
    } else {
        document.getElementById('formAdminLogin').classList.add('hidden');
        document.getElementById('formSiswaLogin').classList.remove('hidden');
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.getElementById('togglePasswordIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function togglePasswordSiswa() {
    const pwd = document.getElementById('passwordSiswa');
    const icon = document.getElementById('toggleSiswaPassIcon');
    if (pwd.type === 'password') { pwd.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { pwd.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function toggleInputPass(inputId, iconId) {
    const inp = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (inp.type === "password") { inp.type = "text"; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { inp.type = "password"; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function restoreRememberedLogin() {
    const username = document.getElementById('username');
    const nisn = document.getElementById('nisn');
    if (username) username.value = localStorage.getItem('lastLoginUsername') || '';
    if (nisn) nisn.value = localStorage.getItem('lastLoginNisn') || '';
}

async function requirePasswordChange(user) {
    if (!user?.mustChangePassword) return true;

    const result = await Swal.fire({
        icon: 'warning',
        title: 'Ganti Password Standar',
        text: 'Password Anda masih menggunakan password standar. Silakan buat password baru untuk melanjutkan.',
        html: `
            <style>
                .forced-password-wrap { position: relative; width: min(420px, 100%); margin: 12px auto; }
                .forced-password-wrap input { box-sizing: border-box; width: 100%; margin: 0; padding-right: 48px; }
                .forced-password-toggle { position: absolute; top: 50%; right: 12px; transform: translateY(-50%); border: 0; background: transparent; color: #64748b; cursor: pointer; padding: 8px; }
            </style>
            <div class="forced-password-wrap">
                <input id="forcedNewPassword" type="password" class="swal2-input" placeholder="Password baru" autocomplete="new-password">
                <button type="button" class="forced-password-toggle" data-target="forcedNewPassword" aria-label="Tampilkan password"><i class="fas fa-eye"></i></button>
            </div>
            <div class="forced-password-wrap">
                <input id="forcedConfirmPassword" type="password" class="swal2-input" placeholder="Konfirmasi password" autocomplete="new-password">
                <button type="button" class="forced-password-toggle" data-target="forcedConfirmPassword" aria-label="Tampilkan konfirmasi password"><i class="fas fa-eye"></i></button>
            </div>`,
        focusConfirm: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
        confirmButtonText: 'Simpan Password',
        confirmButtonColor: '#4f46e5',
        showLoaderOnConfirm: true,
        didOpen: () => {
            document.querySelectorAll('.forced-password-toggle').forEach(button => {
                button.addEventListener('click', () => {
                    const input = document.getElementById(button.dataset.target);
                    const icon = button.querySelector('i');
                    if (!input || !icon) return;
                    input.type = input.type === 'password' ? 'text' : 'password';
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                });
            });
        },
        preConfirm: () => {
            const newPassword = document.getElementById('forcedNewPassword')?.value || '';
            const confirmation = document.getElementById('forcedConfirmPassword')?.value || '';
            if (newPassword.length < 6) {
                Swal.showValidationMessage('Password baru minimal 6 karakter.');
                return false;
            }
            if (newPassword === '123456' || newPassword === 'admin' || newPassword === 'gurupiket') {
                Swal.showValidationMessage('Gunakan password yang lebih kuat.');
                return false;
            }
            if (newPassword !== confirmation) {
                Swal.showValidationMessage('Konfirmasi password tidak sama.');
                return false;
            }
            return { newPassword };
        }
    });

    if (!result.isConfirmed) return false;
    const newPassword = result.value.newPassword;
    let response;
    if (user.role === 'siswa') {
        response = await fetchAPI('changeSiswaPassword', { token: user.token, oldPass: '123456', newPass: newPassword });
    } else if (user.role === 'guru') {
        response = await fetchAPI('changeGuruPassword', { token: user.token, username: user.username, oldPass: '123456', newPass: newPassword });
    } else {
        response = await fetchAPI('changeAdminPassword', { token: user.token, username: user.username || 'admin', newPass: newPassword });
    }
    if (!response?.success) {
        await Swal.fire('Gagal', response?.message || 'Password gagal diubah.', 'error');
        return requirePasswordChange(user);
    }
    user.mustChangePassword = false;
    setSession(user);
    await Swal.fire('Berhasil', 'Password berhasil diubah.', 'success');
    return true;
}

window.toggleTablePass = function (passId, iconId, password) {
    const span = document.getElementById(passId);
    const icon = document.getElementById(iconId);
    if (span && icon) {
        if (icon.classList.contains('fa-eye')) {
            span.textContent = password;
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            span.textContent = '••••••••';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    showLoading();

    const isSiswa = !document.getElementById('formSiswaLogin').classList.contains('hidden');

    const nisnVal = isSiswa ? document.getElementById('nisn').value : "";
    const userVal = isSiswa ? "" : document.getElementById('username').value;
    const passVal = isSiswa ? document.getElementById('passwordSiswa').value : document.getElementById('password').value;
    localStorage.setItem(isSiswa ? 'lastLoginNisn' : 'lastLoginUsername', isSiswa ? nisnVal : userVal);

    try {
        let result;
        if (window.electronAPI) {
            // Mode Offline: Siswa dan Guru via SQLite, Admin via config-offline.json
            if (isSiswa) {
                const res = await window.electronAPI.queryDB('login', { nisn: nisnVal, password: passVal, role: 'siswa' });
                if (res.success) {
                    result = {
                        ...res,
                        success: true,
                        token: res.token,
                        role: 'siswa',
                        nama: res.nama,
                        id: res.nisn,
                        kelas: res.kelas,
                        nisn: res.nisn,
                        jenisKelamin: res.jenisKelamin || res.jenis_kelamin || '',
                        tanggalLahir: res.tanggalLahir || res.tanggal_lahir || ''
                    };
                } else {
                    result = { success: false, message: res.message };
                }
            } else {
                // Untuk admin atau guru, cek config offline dulu (karena Admin di-hardcode)
                const config = await window.electronAPI.getOfflineConfig();
                if (config && userVal === config.admin.username && passVal === config.admin.password) {
                    const res = await window.electronAPI.queryDB('login', { username: userVal, password: passVal, role: 'admin' });
                    result = res.success ? { ...res, id: 'admin_offline' } : res;
                } else {
                    // Kalau bukan admin, coba login sebagai guru via SQLite
                    const res = await window.electronAPI.queryDB('login', { username: userVal, password: passVal, role: 'guru' });
                    if (res.success) {
                        result = { ...res, success: true, token: res.token, role: 'guru', nama: res.nama, id: res.id, username: res.username, kelas: res.kelas, jenisKelamin: res.jenisKelamin, statusPegawai: res.statusPegawai, mapel: res.mapel, wali_kelas: res.wali_kelas };
                    } else {
                        result = { success: false, message: 'Username atau password salah.' };
                    }
                }
            }
        } else {
            // Mode Online
            result = await fetchAPI('login', {
                username: isSiswa ? nisnVal : userVal,
                password: passVal,
                nisn: nisnVal
            });
        }

        hideLoading();

        if (result.success) {
            currentUser = result;
            setSession(result);
            if (!(await requirePasswordChange(result))) return;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('dashboardContainer').classList.remove('hidden');
            await preloadRoleViews(result.role);
            await initAppConfigs();
            initDashboard();
        } else {
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                document.getElementById('errorText').textContent = result.message;
                errorDiv.classList.remove('hidden');
                setTimeout(() => errorDiv.classList.add('hidden'), 5000);
            }
            Swal.fire({
                icon: 'error',
                title: 'Login Gagal',
                text: result.message || 'Username atau password salah.',
                confirmButtonColor: '#3085d6'
            });
        }
    } catch (error) {
        hideLoading();
        Swal.fire({
            icon: 'error',
            title: 'Koneksi Gagal',
            text: 'Gagal terhubung ke server: ' + error.toString(),
            confirmButtonColor: '#3085d6'
        });
    }
}

async function preloadRoleViews(role) {
    const commonViews = ['view-admin-dashboard', 'view-data-siswa', 'view-data-guru', 'view-monitoring', 'view-rekap-absensi', 'view-master-pelanggaran', 'view-input-kasus', 'view-rekap-kasus', 'view-konsekuensi', 'view-pengaturan'];
    const roleViews = role === 'siswa'
        ? ['view-siswa-dashboard', 'view-rekap-siswa', 'view-kartu-siswa', 'view-absen-wfh', 'view-izin-siswa']
        : role === 'guru'
            ? ['view-guru-dashboard', 'view-scanner']
            : ['view-scanner', 'view-kelola-absen'];
    try { await preloadViews([...commonViews, ...roleViews]); }
    catch (error) { console.error('Gagal preload view:', error); }
}

async function checkSession() {
    const sessionData = getSession();
    if (sessionData && sessionData.success) {
        try {
            // Session lama sebelum enforcement password harus login ulang agar status password diverifikasi server.
            if (typeof sessionData.mustChangePassword !== 'boolean') {
                localStorage.removeItem('absensiAppSession');
                await showView('loginPage');
                return;
            }
            currentUser = sessionData;
            if (!(await requirePasswordChange(sessionData))) return;

            document.getElementById('loginPage')?.classList.add('hidden');
            document.getElementById('dashboardContainer')?.classList.remove('hidden');
            if (window.innerWidth < 768) document.getElementById('sidebar')?.classList.add('-translate-x-full');
            await preloadRoleViews(sessionData.role);
            await initAppConfigs();
            initDashboard();
            return;
        } catch (e) {
            console.error('Session invalid', e);
            localStorage.removeItem('absensiAppSession');
        }
    } else {
        localStorage.removeItem('absensiAppSession');
        currentUser = null;
    }
    // JIKA TIDAK ADA SESSION ATAU SESSION TIDAK VALID, panggil showView agar HTML dimuat!
    document.getElementById('dashboardContainer')?.classList.add('hidden');
    await showView('loginPage');
    document.getElementById('loginPage')?.classList.remove('hidden');
    restoreRememberedLogin();
}

function logout() {
    Swal.fire({
        title: 'Konfirmasi Keluar',
        text: "Apakah Anda yakin ingin keluar dari aplikasi?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Keluar!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            executeLogout();
        }
    });
}

async function executeLogout() {
    stopAndBack(false);
    localStorage.removeItem('absensiAppSession');
    currentUser = null;
    appCache = { siswa: null, guru: null };
    document.getElementById('dashboardContainer').classList.add('hidden');
    await showView('loginPage');
    document.getElementById('loginPage').classList.remove('hidden');
    restoreRememberedLogin();

    if (document.getElementById('username')) document.getElementById('username').value = localStorage.getItem('lastLoginUsername') || '';
    if (document.getElementById('password')) document.getElementById('password').value = '';
    if (document.getElementById('nisn')) document.getElementById('nisn').value = localStorage.getItem('lastLoginNisn') || '';

    document.getElementById('sidebar').classList.add('-translate-x-full');
}

function showMobileLogin() {
    document.getElementById('loginPage').classList.add('mobile-login-active');
}

function hideMobileLogin() {
    document.getElementById('loginPage').classList.remove('mobile-login-active');
}

// ============================================================
// NAVIGASI (SIDEBAR & VIEW)
// ============================================================
let viewIdGlobal = '';

function updateViewUI(viewId) {
    viewIdGlobal = viewId;
    const fabKasus = document.getElementById('fabInputKasus');
    if (fabKasus) {
        if (currentUser && currentUser.role === 'admin' && viewId !== 'view-input-kasus') {
            fabKasus.classList.remove('hidden');
        } else {
            fabKasus.classList.add('hidden');
        }
    }

    document.querySelectorAll('#mainContentArea > .view-section, #loginPage').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
        el.style.display = '';
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        target.classList.remove('hidden');
        target.style.display = '';
        target.classList.add('animate-fade-in');
        // Pastikan elemen child (inner div dari view) juga di-unhide jika terlanjur disembunyikan
        const innerView = target.querySelector('.view-section');
        if (innerView) {
            innerView.classList.remove('hidden');
            innerView.style.display = '';
        }
        // Reset scroll ke atas setiap ganti halaman/tab
        const mainArea = document.getElementById('mainContentArea');
        if (mainArea) mainArea.scrollTop = 0;
    }



    let title = "Dashboard";
    switch (viewId) {
        case 'view-data-siswa': title = "Direktori Siswa"; break;
        case 'view-data-guru': title = "Manajemen Guru"; break;
        case 'view-kelola-absen': title = "Kelola Hari Libur & WFH"; break;
        case 'view-scanner': title = "Scan Presensi"; break;
        case 'view-monitoring': title = "Monitoring Realtime"; break;
        case 'view-rekap-absensi': title = "Laporan Kehadiran"; break;
        case 'view-rekap-siswa': title = "Rekap Presensi Siswa"; break;
        case 'view-kartu-siswa': title = "Kartu Presensi Digital"; break;
        case 'view-pengaturan': title = "Pengaturan Sistem"; break;
        case 'view-absen-wfh': title = "Presensi WFH"; break;
        case 'view-izin-siswa': title = "Pengajuan Izin / Sakit"; break;
        case 'view-master-pelanggaran': title = "Data Pelanggaran"; break;
        case 'view-konsekuensi': title = "Konsekuensi Harian"; break;
        case 'view-input-kasus': title = "Catat Pelanggaran"; break;
        case 'view-rekap-kasus': title = "Rekap Pelanggaran"; break;
    }

    document.getElementById('pageTitle').textContent = title;
    closeSidebarMobile();
    scrollToTop();
}

function setActiveMenu(targetName) {
    sessionStorage.setItem('activeMenu', targetName);
    const allLinks = document.querySelectorAll('#sidebarMenu a');
    const centerClass = !isSidebarOpen ? 'justify-center px-0' : 'space-x-3 px-4';
    const baseStyle = `flex items-center ${centerClass} py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer `;
    const activeStyle = "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50";
    const inactiveStyle = "text-gray-400 hover:bg-gray-800 hover:text-white";

    allLinks.forEach(link => {
        const menuName = link.getAttribute('data-name');
        link.className = (menuName === targetName) ? (baseStyle + activeStyle) : (baseStyle + inactiveStyle);
    });
}

window.toggleAdminMenu = function (id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        el.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

window.closeAllSubNavs = function () {
    document.querySelectorAll('.mobile-subnav').forEach(el => el.classList.add('hidden'));
    const fab = document.getElementById('fabInputKasus');
    if (fab && currentUser && viewIdGlobal !== 'view-input-kasus') {
        fab.style.opacity = '1';
        fab.style.pointerEvents = 'auto';
    }
};

window.toggleSubNav = function (id) {
    const el = document.getElementById(id);
    const isHidden = el.classList.contains('hidden');
    closeAllSubNavs();

    if (isHidden) {
        el.classList.remove('hidden');
        const fab = document.getElementById('fabInputKasus');
        if (fab) {
            fab.style.opacity = '0';
            fab.style.pointerEvents = 'none';
        }
    }
};

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const labels = document.querySelectorAll('.sidebar-label');
    const header = document.getElementById('sidebarHeader');
    const userCard = document.getElementById('userProfileCard');
    const logoutBtn = document.getElementById('btnLogout');
    const menuLinks = document.querySelectorAll('#sidebarMenu a');
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden', 'pointer-events-none');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    } else {
        if (isSidebarOpen) {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-20');
            document.getElementById('mainContent').classList.remove('md:ml-64');
            document.getElementById('mainContent').classList.add('md:ml-20');
            header.classList.remove('px-6', 'justify-start');
            header.classList.add('px-0', 'justify-center');
            userCard.classList.remove('space-x-3', 'p-3', 'bg-black/20', 'border');
            userCard.classList.add('justify-center', 'p-0', 'bg-transparent', 'border-transparent');
            logoutBtn.classList.remove('space-x-3', 'justify-start', 'px-4');
            logoutBtn.classList.add('justify-center', 'px-0');
            menuLinks.forEach(link => {
                link.classList.remove('space-x-3', 'px-4');
                link.classList.add('justify-center', 'px-0');
            });
            labels.forEach(el => { el.classList.add('hidden'); });
            isSidebarOpen = false;
        } else {
            sidebar.classList.remove('w-20');
            sidebar.classList.add('w-64');
            document.getElementById('mainContent').classList.remove('md:ml-20');
            document.getElementById('mainContent').classList.add('md:ml-64');
            header.classList.add('px-6', 'justify-start');
            header.classList.remove('px-0', 'justify-center');
            userCard.classList.add('space-x-3', 'p-3', 'bg-black/20', 'border');
            userCard.classList.remove('justify-center', 'p-0', 'bg-transparent', 'border-transparent');
            logoutBtn.classList.add('space-x-3', 'justify-start', 'px-4');
            logoutBtn.classList.remove('justify-center', 'px-0');
            menuLinks.forEach(link => {
                link.classList.add('space-x-3', 'px-4');
                link.classList.remove('justify-center', 'px-0');
            });
            labels.forEach(el => { el.classList.remove('hidden'); });
            isSidebarOpen = true;
        }
    }
}

function closeSidebarMobile() {
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        const overlay = document.getElementById('mobileOverlay');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

const contentArea = document.getElementById('mainContentArea');
const scrollBtn = document.getElementById('btnScrollTop');

if (contentArea && scrollBtn) {
    contentArea.onscroll = function () {
        if (contentArea.scrollTop > 300) {
            scrollBtn.classList.remove('opacity-0', 'translate-y-10', 'invisible');
        }
        else {
            scrollBtn.classList.add('opacity-0', 'translate-y-10', 'invisible');
        }
    };
}

function scrollToTop() {
    if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function showPrivacyModal(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.classList.remove('hidden');
        const updateDate = document.getElementById('privacy-update-date');
        if (updateDate) {
            const date = new Date();
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            updateDate.textContent = monthNames[date.getMonth()] + " " + date.getFullYear();
        }
    }
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) { modal.classList.add('hidden'); }
}

