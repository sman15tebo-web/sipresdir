// ============================================================
// INISIALISASI UI BERDASARKAN ROLE
// ============================================================
function initDashboard() {
    const name = currentUser.nama || currentUser.username;
    document.getElementById('navUserName').textContent = name;
    document.getElementById('navUserRole').textContent = currentUser.role.toUpperCase();
    document.getElementById('navUserInitial').textContent = name.charAt(0).toUpperCase();

    const menuContainer = document.getElementById('sidebarMenu');
    let menuHTML = '';

    const createItem = (label, icon, onclick, isDefaultActive = false, extraClass = '') => {
        const hideText = !isSidebarOpen ? 'hidden' : '';
        const centerClass = !isSidebarOpen ? 'justify-center px-0' : 'space-x-3 px-4';
        const style = isDefaultActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "text-gray-400 hover:bg-gray-800 hover:text-white";
        // Jika ada class hidden di extraClass, jangan gunakan flex bawaan agar tidak bentrok
        const baseClass = extraClass.includes('hidden') ? 'items-center py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer' : 'flex items-center py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer';
        return `
        <a data-name="${label}" onclick="${onclick}" class="${baseClass} ${centerClass} ${style} ${extraClass}">
            <i class="fas ${icon} w-6 text-center flex-shrink-0 group-hover:scale-110 transition-transform"></i>
            <span class="sidebar-label font-medium transition-opacity duration-300 ${hideText}">${label}</span>
        </a>`;
    };

    const createAccordion = (id, label, icon, subItems) => {
        const hideText = !isSidebarOpen ? 'hidden' : '';
        const centerClass = !isSidebarOpen ? 'justify-center px-0' : 'px-4';

        let subHTML = `<div id="${id}" class="hidden flex-col mt-1 space-y-1 bg-black/20 rounded-xl py-2 ${!isSidebarOpen ? 'px-2' : 'pl-10 pr-3'} animate-fade-in">`;
        subItems.forEach(item => {
            subHTML += `
            <a data-name="${item.label}" onclick="${item.onclick}" class="flex items-center space-x-3 py-2.5 px-3 rounded-lg transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer text-gray-400 hover:text-white hover:bg-gray-800/50 text-xs">
                <i class="fas ${item.icon} w-5 text-center flex-shrink-0 group-hover:scale-110 transition-transform"></i>
                <span class="sidebar-label font-medium transition-opacity duration-300 ${hideText}">${item.label}</span>
            </a>`;
        });
        subHTML += `</div>`;

        return `
        <div class="mb-1">
            <button onclick="toggleAdminMenu('${id}')" class="w-full flex items-center justify-between ${centerClass} py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none">
                <div class="flex items-center space-x-3">
                    <i class="fas ${icon} w-6 text-center flex-shrink-0 group-hover:scale-110 transition-transform"></i>
                    <span class="sidebar-label font-bold transition-opacity duration-300 ${hideText}">${label}</span>
                </div>
                <i id="${id}-icon" class="fas fa-chevron-down text-[10px] transition-transform duration-300 ${hideText}"></i>
            </button>
            ${subHTML}
        </div>`;
    };

    if (currentUser.role === 'admin') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadAdminDashboard()', true);
        menuHTML += createItem('Kelola Akun', 'fa-users-cog', 'loadDataSiswa()');
        menuHTML += createItem('Kelola Presensi', 'fa-calendar-check', 'loadKelolaAbsen()');
        menuHTML += createItem('Kelola Disiplin', 'fa-balance-scale', 'loadMasterPelanggaran()');
        menuHTML += createItem('Scan Presensi', 'fa-qrcode', 'loadScanAbsensi()');
        menuHTML += createItem('Konsekuensi Harian', 'fa-gavel', 'loadHalamanKonsekuensi()', false, 'hidden md:flex');

        menuHTML += createItem('Pengaturan', 'fa-cog', 'loadPengaturan()');

    } else if (currentUser.role === 'guru') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadGuruDashboard()', true);
        menuHTML += createItem('Monitoring', 'fa-eye', 'loadMonitoringAbsensi()');
        menuHTML += createItem('Scan Presensi', 'fa-qrcode', 'loadScanAbsensi()');
        menuHTML += createItem('Input Kasus Siswa', 'fa-exclamation-triangle', 'loadInputKasus()');
        menuHTML += createItem('Profil Saya', 'fa-user-circle', 'showProfilGuruMobile()');

    } else if (currentUser.role === 'siswa') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadSiswaDashboard()', true);
        menuHTML += createItem('Kartu Saya', 'fa-id-card', 'loadQRCodeSiswa()');
        menuHTML += createItem('Rekam-WFH', 'fa-camera-retro', 'loadAbsenWFH()');
        menuHTML += createItem('Izin / Sakit', 'fa-envelope-open-text', 'loadIzinSiswa()');
        menuHTML += createItem('Rekap Kehadiran', 'fa-file-pdf', 'loadRekapSiswa()');
    }

    menuContainer.innerHTML = menuHTML;
    updateConnectionStatus();

    // Auto-click the last active menu (stay on the same page after reload)
    setTimeout(() => {
        const activeMenu = sessionStorage.getItem('activeMenu') || 'Dashboard';
        const activeLink = document.querySelector(`a[data-name="${activeMenu}"]`);
        if (activeLink) {
            activeLink.click();
        } else {
            if (currentUser.role === 'admin') loadAdminDashboard();
            else if (currentUser.role === 'guru') loadGuruDashboard();
            else loadSiswaDashboard();
        }
    }, 50);

    loadKelasSuggestions();
    initMobileNav();

    // Sembunyikan tab khusus admin jika bukan admin
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only-tab').forEach(el => el.classList.add('hidden'));
    } else {
        document.querySelectorAll('.admin-only-tab').forEach(el => el.classList.remove('hidden'));
    }
}

function showLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('hidden');
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
}

// ============================================================
// SINKRONISASI OFFLINE
// ============================================================
async function openSyncModal() {
    if (!window.electronAPI) return;
    showLoading();
    try {
        const config = await window.electronAPI.getOfflineConfig();
        const input = document.getElementById('syncLinkInput');
        const customLink = localStorage.getItem('customSyncLink');

        if (customLink) {
            input.value = customLink;
        } else if (config && config.link_exec_sync) {
            input.value = config.link_exec_sync;
        }

        const modal = document.getElementById('syncModal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.children[0].classList.remove('scale-95');
        }, 10);
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Gagal memuat konfigurasi offline', 'error');
    }
    hideLoading();
}

function closeSyncModal() {
    const modal = document.getElementById('syncModal');
    modal.classList.add('opacity-0');
    modal.children[0].classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('syncStatus').classList.add('hidden');
    }, 300);
}

async function executeSync() {
    const input = document.getElementById('syncLinkInput');
    const newLink = input.value.trim();
    if (!newLink) {
        Swal.fire('Perhatian', 'Link Exec tidak boleh kosong.', 'warning');
        return;
    }

    localStorage.setItem('customSyncLink', newLink);
    const statusDiv = document.getElementById('syncStatus');
    statusDiv.classList.remove('hidden');

    if (!window.electronAPI) {
        statusDiv.className = 'rounded-lg p-3 text-sm mt-4 font-medium bg-red-100 text-red-800 border border-red-200';
        statusDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> Sinkronisasi hanya tersedia di versi Desktop (Offline).';
        return;
    }

    statusDiv.className = 'rounded-lg p-4 text-sm mt-4 bg-gray-50 border border-gray-200 shadow-inner flex flex-col gap-2';

    const updateProgress = (stepId, status, text) => {
        let el = document.getElementById(stepId);
        if (!el) {
            el = document.createElement('div');
            el.id = stepId;
            el.className = 'flex items-center text-gray-700 font-medium';
            statusDiv.appendChild(el);
        }

        let icon = '<i class="fas fa-circle text-gray-300 mr-2 text-xs"></i>';
        if (status === 'loading') icon = '<i class="fas fa-spinner fa-spin text-indigo-600 mr-2"></i>';
        else if (status === 'success') icon = '<i class="fas fa-check-circle text-green-500 mr-2"></i>';
        else if (status === 'error') icon = '<i class="fas fa-exclamation-circle text-red-500 mr-2"></i>';
        else if (status === 'warning') icon = '<i class="fas fa-exclamation-triangle text-amber-500 mr-2"></i>';

        el.innerHTML = `${icon} <span>${text}</span>`;
    };

    statusDiv.innerHTML = '';

    try {
        updateProgress('step-check', 'loading', 'Memeriksa antrian sinkronisasi...');
        const queueStatus = await window.electronAPI.queryDB('getSyncQueueStatus', { token: currentUser?.token });
        if (queueStatus.success && (queueStatus.data?.pending || queueStatus.data?.failed)) {
            updateProgress('step-check', 'warning', 'Terdapat antrian tertunda, diproses ulang.');
        } else {
            updateProgress('step-check', 'success', 'Antrian sinkronisasi bersih.');
        }

        updateProgress('step-prep', 'loading', 'Mempersiapkan data lokal...');
        const prepRes = await window.electronAPI.queryDB('prepareSyncData', { token: currentUser?.token });
        if (!prepRes.success) throw new Error('Gagal menyiapkan data lokal: ' + prepRes.message);
        updateProgress('step-prep', 'success', 'Data lokal siap dikirim.');

        updateProgress('step-auth', 'loading', 'Mengautentikasi dengan server online...');
        const config = await window.electronAPI.getOfflineConfig();
        const loginRes = await fetch(newLink, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: config.admin.username, password: config.admin.password }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.success) {
            throw new Error('Gagal login ke server online: ' + (loginData.message || 'Kredensial tidak valid.'));
        }
        const onlineToken = loginData.token;
        updateProgress('step-auth', 'success', 'Autentikasi berhasil.');

        updateProgress('step-transfer', 'loading', 'Mengunggah & mengunduh data ke server...');
        const response = await fetch(newLink, {
            method: 'POST',
            body: JSON.stringify({ action: 'syncData', token: onlineToken, payload: prepRes.data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Server tidak merespons dengan benar.');
        updateProgress('step-transfer', 'success', 'Transfer data selesai.');

        updateProgress('step-process', 'loading', 'Memproses pembaruan dari server ke lokal...');
        const procRes = await window.electronAPI.queryDB('processSyncResponse', { token: currentUser?.token, masterData: result.masterData, syncedIds: result.syncedIds });
        if (!procRes.success) throw new Error('Gagal memproses respons server: ' + procRes.message);
        updateProgress('step-process', 'success', 'Pemrosesan data lokal selesai.');

        const counts = result.counts || {};
        const localCounts = procRes.localCounts || {};

        let summaryDiv = document.createElement('div');
        summaryDiv.className = 'mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm font-semibold';
        summaryDiv.innerHTML = `✅ Sinkronisasi berhasil menyeluruh!<br/><span class="text-xs font-normal">Siswa: ${counts.siswa ?? localCounts.siswa ?? '-'} | Guru: ${counts.guru ?? localCounts.guru ?? '-'} | Absensi: ${counts.absensi ?? localCounts.absensi ?? '-'} | Konsekuensi: ${counts.jenisKonsekuensi ?? localCounts.jenisKonsekuensi ?? '-'} / riwayat ${counts.riwayatKonsekuensi ?? '-'}</span><br/><span class="text-xs text-green-600">Memuat ulang aplikasi...</span>`;
        statusDiv.appendChild(summaryDiv);

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        updateProgress('step-error', 'error', `Sinkronisasi dihentikan: ${error.message}`);
    }
}

window.openSyncModal = openSyncModal;
window.closeSyncModal = closeSyncModal;
window.executeSync = executeSync;

async function updateConnectionStatus() {
    const badge = document.getElementById('connectionBadge');
    const text = document.getElementById('connectionBadgeText');
    const syncButton = document.getElementById('headerSyncButton');
    if (!badge || !text) return;

    // Pada Electron, badge ini menunjukkan kondisi jaringan PC. Endpoint sync
    // boleh belum dikonfigurasi tanpa membuat jaringan aktif terlihat offline.
    let online = navigator.onLine;
    try {
        let pingUrl = '';
        if (window.electronAPI) {
            const config = await window.electronAPI.getOfflineConfig();
            pingUrl = localStorage.getItem('customSyncLink') || config.link_exec_sync || '';
        } else if (typeof API_URL !== 'undefined') {
            pingUrl = API_URL;
        }
        if (pingUrl && online && !window.electronAPI) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${pingUrl}${pingUrl.includes('?') ? '&' : '?'}action=ping`, { method: 'GET', signal: controller.signal });
            clearTimeout(timeout);
            online = response.ok;
        }
    } catch (error) {
        online = false;
    }
    badge.className = online
        ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100'
        : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100';
    badge.querySelector('span').className = online ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-rose-500';
    text.textContent = online ? 'Online' : 'Offline';
    if (syncButton) {
        const showSync = !!window.electronAPI && currentUser && currentUser.role === 'admin';
        syncButton.classList.toggle('hidden', !showSync);
        syncButton.classList.toggle('flex', showSync);
    }
}

window.updateConnectionStatus = updateConnectionStatus;
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
setInterval(updateConnectionStatus, 30000);

function initMobileNav() {
    const role = currentUser.role;
    const roleEl = document.getElementById('mobileHeaderRole');
    if (roleEl) roleEl.textContent = role;

    const btnSettings = document.getElementById('btnMobileSettings');
    const btnLogout = document.getElementById('btnMobileLogout');
    const schoolInfo = document.getElementById('mobileHeaderSchoolInfo');

    let navHTML = '';

    const createBottomNav = (label, icon, onclick, isCenter = false) => {
        if (isCenter) {
            return `
            <div class="relative -top-5 flex flex-col items-center z-10">
                <button onclick="closeAllSubNavs(); ${onclick}" class="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full text-white shadow-lg shadow-indigo-500/40 border-4 border-white transform transition active:scale-95 focus:outline-none">
                    <i class="fas ${icon} text-2xl"></i>
                </button>
                <span class="absolute -bottom-4 w-full text-center text-[9px] font-bold text-indigo-600 whitespace-nowrap">${label}</span>
            </div>`;
        } else {
            return `
            <button onclick="closeAllSubNavs(); ${onclick}" class="flex flex-col items-center text-gray-400 hover:text-indigo-600 p-2 min-w-[60px] transition-colors focus:outline-none">
                <i class="fas ${icon} text-xl mb-1"></i>
                <span class="text-[9px] font-bold leading-none">${label}</span>
            </button>`;
        }
    };

    const createBottomNavWithSub = (id, label, icon, subItems) => {
        let subHTML = `<div id="${id}" class="mobile-subnav hidden absolute bottom-[110%] left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.1)] border border-gray-100 p-2 flex flex-col gap-1 w-[150px] animate-fade-in z-50 origin-bottom">`;
        subItems.forEach(item => {
            subHTML += `<button onclick="closeAllSubNavs(); ${item.onclick}" class="flex items-center gap-3 p-2.5 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition text-left focus:outline-none"><i class="fas ${item.icon} w-4 text-center"></i> ${item.label}</button>`;
        });
        subHTML += `<div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 rotate-45"></div></div>`;

        return `
        <div class="relative flex flex-col items-center">
            ${subHTML}
            <button onclick="toggleSubNav('${id}')" class="flex flex-col items-center text-gray-400 hover:text-indigo-600 p-2 min-w-[60px] transition-colors focus:outline-none">
                <i class="fas ${icon} text-xl mb-1"></i>
                <span class="text-[9px] font-bold leading-none">${label}</span>
            </button>
        </div>`;
    };

    if (role === 'admin') {
        if (btnSettings) { btnSettings.classList.remove('hidden'); btnSettings.classList.add('flex'); }
        if (btnLogout) { btnLogout.classList.remove('hidden'); btnLogout.classList.add('flex'); }
        if (schoolInfo) { schoolInfo.classList.remove('flex'); schoolInfo.classList.add('hidden'); }

        navHTML += createBottomNav('Home', 'fa-home', 'loadAdminDashboard()');
        navHTML += createBottomNav('Akun', 'fa-users-cog', 'loadDataSiswa()');
        navHTML += createBottomNav('Scan', 'fa-qrcode', 'loadScanAbsensi()', true);
        navHTML += createBottomNav('Presensi', 'fa-calendar-check', 'loadKelolaAbsen()');
        navHTML += createBottomNav('Disiplin', 'fa-balance-scale', 'loadMasterPelanggaran()');

    } else if (role === 'guru') {
        if (btnSettings) { btnSettings.classList.remove('flex'); btnSettings.classList.add('hidden'); }
        if (btnLogout) { btnLogout.classList.remove('hidden'); btnLogout.classList.add('flex'); }
        if (schoolInfo) { schoolInfo.classList.remove('hidden'); schoolInfo.classList.add('flex'); }

        navHTML += createBottomNav('Home', 'fa-home', 'loadGuruDashboard()');
        navHTML += createBottomNav('Monitor', 'fa-desktop', 'loadMonitoringAbsensi()');
        navHTML += createBottomNav('Scan', 'fa-qrcode', 'loadScanAbsensi()', true);
        navHTML += createBottomNav('Akun', 'fa-user-circle', 'showProfilGuruMobile()');
        navHTML += createBottomNav('Kasus', 'fa-exclamation-triangle', 'loadInputKasus()');

    } else if (role === 'siswa') {
        if (btnSettings) { btnSettings.classList.remove('flex'); btnSettings.classList.add('hidden'); }
        if (btnLogout) { btnLogout.classList.remove('hidden'); btnLogout.classList.add('flex'); }
        if (schoolInfo) { schoolInfo.classList.remove('hidden'); schoolInfo.classList.add('flex'); }

        navHTML += createBottomNav('Home', 'fa-home', 'loadSiswaDashboard()');
        navHTML += createBottomNav('Kartu', 'fa-id-card', 'loadQRCodeSiswa()');
        navHTML += createBottomNav('WFH', 'fa-camera-retro', 'loadAbsenWFH()', true);
        navHTML += createBottomNav('Izin', 'fa-envelope-open-text', 'loadIzinSiswa()');
        navHTML += createBottomNav('Rekap', 'fa-file-pdf', 'loadRekapSiswa()');
    }

    document.getElementById('mobileBottomNav').innerHTML = navHTML;
}

function refreshData(type) {
    const btnIcon = event ? event.currentTarget.querySelector('i') : null;
    if (btnIcon) btnIcon.classList.add('fa-spin');

    if (type === 'siswa') {
        tableState.siswa.fullData = [];
        localStorage.removeItem('cache_data_siswa');
        localStorage.removeItem('cache_data_siswa_master');
        loadDataSiswa();
        showAlert('success', 'Memperbarui data siswa...');
    }
    else if (type === 'guru') {
        tableState.guru.fullData = [];
        localStorage.removeItem('cache_data_guru');
        localStorage.removeItem('cache_data_guru_master');
        loadDataGuru();
        showAlert('success', 'Memperbarui data guru...');
    }
    else if (type === 'dashboard') {
        // Clear cached dashboard if exists
        const dDate = new Date();
        const dMonth = String(dDate.getMonth() + 1).padStart(2, '0');
        const dDay = String(dDate.getDate()).padStart(2, '0');
        const cacheKey = `dashboard_cache_${dDate.getFullYear()}${dMonth}${dDay}`;
        localStorage.removeItem(cacheKey);

        if (currentUser.role === 'admin') loadAdminDashboard();
        else if (currentUser.role === 'guru') loadGuruDashboard();
        else loadSiswaDashboard();
        showAlert('success', 'Memperbarui statistik Dashboard...');
    }
    else if (type === 'monitoring') {
        tableState.monitoring.fullData = [];
        loadMonitoringAbsensi();
        showAlert('success', 'Memperbarui data monitoring...');
    }

    if (btnIcon) setTimeout(() => btnIcon.classList.remove('fa-spin'), 1000);
}


window.lihatBuktiAdmin = function (nisn) {
    const url = window.adminBuktiCache && window.adminBuktiCache[nisn];
    if (url) {
        Swal.fire({
            imageUrl: url,
            imageAlt: 'Bukti Dukung',
            showConfirmButton: true,
            confirmButtonText: 'Tutup',
            width: 'auto',
            customClass: {
                image: 'max-w-full max-h-[70vh] object-contain rounded shadow-sm border border-gray-200',
                confirmButton: 'bg-indigo-600 text-white rounded-lg px-4 py-2 font-bold hover:bg-indigo-700 transition'
            }
        });
    } else {
        showAlert('error', 'Bukti tidak ditemukan.');
    }
};window.showExcelPreviewModal = function(title, subtitle, headers, dataRows, callbackDownload) {
    let theadHtml = '';
    if (Array.isArray(headers[0])) {
        headers.forEach(row => {
            theadHtml += '<tr>';
            row.forEach(h => {
                theadHtml += `<th class="border border-gray-400 p-2 bg-gray-200 text-center text-xs whitespace-nowrap">${h}</th>`;
            });
            theadHtml += '</tr>';
        });
    } else {
        theadHtml = '<tr>';
        headers.forEach(h => {
            theadHtml += `<th class="border border-gray-400 p-2 bg-gray-200 text-center text-xs whitespace-nowrap">${h}</th>`;
        });
        theadHtml += '</tr>';
    }

    let tbodyHtml = '';
    dataRows.forEach(row => {
        tbodyHtml += '<tr>';
        row.forEach((cell, i) => {
            let align = (i === 0 || i > 3) ? 'text-center' : 'text-left';
            if (typeof cell === 'number') align = 'text-center';
            
            // Allow wrapping for the last column (usually Keterangan/Catatan) to avoid it being too wide
            let wrapClass = (i === row.length - 1) ? 'whitespace-normal min-w-[200px] max-w-[300px] break-words' : 'whitespace-nowrap';
            
            tbodyHtml += `<td class="border border-gray-300 p-2 text-xs ${align} ${wrapClass}">${cell !== null && cell !== undefined ? cell : ''}</td>`;
        });
        tbodyHtml += '</tr>';
    });

    const htmlContent = `
        <div class="flex flex-col h-[75vh]">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 bg-gray-50 p-2 rounded-lg">
                <div class="flex gap-2">
                    <button id="btnZoomIn" class="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-md text-sm text-gray-700 shadow-sm border border-gray-300 transition-colors"><i class="fas fa-search-plus text-gray-500 mr-1"></i> Zoom In</button>
                    <button id="btnZoomOut" class="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-md text-sm text-gray-700 shadow-sm border border-gray-300 transition-colors"><i class="fas fa-search-minus text-gray-500 mr-1"></i> Zoom Out</button>
                </div>
                <div class="flex gap-2">
                    <button id="btnPrintPreview" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-sm shadow-sm transition-colors"><i class="fas fa-print mr-1"></i> Print</button>
                    <button id="btnDownloadPreview" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-sm shadow-sm transition-colors"><i class="fas fa-file-excel mr-1"></i> Unduh Excel</button>
                </div>
            </div>
            
            <div id="previewTableContainer" class="flex-1 overflow-auto border border-gray-300 bg-white shadow-inner relative" style="zoom: 1;">
                <div id="printArea" class="p-6 bg-white min-w-max inline-block">
                    <div class="text-center mb-6">
                        <h2 class="text-xl font-bold text-gray-800 m-0 uppercase tracking-wide">${title}</h2>
                        ${subtitle ? `<p class="text-sm font-semibold text-gray-600 mt-2 uppercase tracking-wide">${subtitle}</p>` : ''}
                    </div>
                    <table class="border-collapse text-gray-800 bg-white" style="table-layout: auto;">
                        <thead>${theadHtml}</thead>
                        <tbody>${tbodyHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        title: 'Pratinjau Laporan',
        html: htmlContent,
        width: '95vw',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-xl shadow-2xl',
            title: 'text-left text-lg font-bold text-gray-800 border-b pb-3 m-0 pl-2'
        },
        didOpen: () => {
            let currentZoom = 1;
            const container = document.getElementById('previewTableContainer');
            
            document.getElementById('btnZoomIn').addEventListener('click', () => {
                if(currentZoom < 2.0) currentZoom += 0.1;
                container.style.zoom = currentZoom;
            });
            document.getElementById('btnZoomOut').addEventListener('click', () => {
                if (currentZoom > 0.4) currentZoom -= 0.1;
                container.style.zoom = currentZoom;
            });
            
            document.getElementById('btnPrintPreview').addEventListener('click', () => {
                const printContents = document.getElementById('printArea').innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>Print Preview</title>');
                printWindow.document.write(`
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top:20px; color: #1f2937; }
                        th, td { border: 1px solid #4b5563; padding: 6px 8px; }
                        th { background-color: #f3f4f6; text-align: center; font-weight: 700; text-transform: uppercase; }
                        td { text-align: left; }
                        td.text-center { text-align: center; }
                        h2 { text-align: center; margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; color: #111827; }
                        p { text-align: center; margin: 6px 0 10px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #4b5563; }
                        @media print {
                            @page { margin: 10mm; size: landscape; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                `);
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContents);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 800);
            });

            document.getElementById('btnDownloadPreview').addEventListener('click', () => {
                Swal.close();
                if (callbackDownload) callbackDownload();
            });
        }
    });
};

window.showDocumentPreviewModal = function(title, subtitle, htmlContent, callbackPrint, callbackDownload, downloadText = 'Unduh', downloadIcon = 'fa-download') {
    const modalHtml = `
        <div class="flex flex-col h-[75vh]">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 bg-gray-50 p-2 rounded-lg">
                <div class="flex gap-2">
                    <button id="btnZoomInDoc" class="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-md text-sm text-gray-700 shadow-sm border border-gray-300 transition-colors"><i class="fas fa-search-plus text-gray-500 mr-1"></i> Zoom In</button>
                    <button id="btnZoomOutDoc" class="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-md text-sm text-gray-700 shadow-sm border border-gray-300 transition-colors"><i class="fas fa-search-minus text-gray-500 mr-1"></i> Zoom Out</button>
                </div>
                <div class="flex gap-2">
                    ${callbackPrint ? `<button id="btnPrintDoc" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-sm shadow-sm transition-colors"><i class="fas fa-print mr-1"></i> Print</button>` : ''}
                    ${callbackDownload ? `<button id="btnDownloadDoc" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-sm shadow-sm transition-colors"><i class="fas ${downloadIcon} mr-1"></i> ${downloadText}</button>` : ''}
                </div>
            </div>
            
            <div id="previewDocContainer" class="flex-1 overflow-auto border border-gray-300 bg-gray-200 shadow-inner relative flex justify-center p-4">
                <div id="docPrintArea" class="bg-white shadow-md" style="width: 210mm; min-height: 297mm; padding: 20mm; transform-origin: top center; zoom: 1;">
                    ${htmlContent}
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        title: title || 'Pratinjau Dokumen',
        html: modalHtml,
        width: '95vw',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-xl shadow-2xl',
            title: 'text-left text-lg font-bold text-gray-800 border-b pb-3 m-0 pl-2'
        },
        didOpen: () => {
            let currentZoom = 1;
            const container = document.getElementById('docPrintArea');
            
            document.getElementById('btnZoomInDoc').addEventListener('click', () => {
                if(currentZoom < 2.0) currentZoom += 0.1;
                container.style.zoom = currentZoom;
            });
            document.getElementById('btnZoomOutDoc').addEventListener('click', () => {
                if (currentZoom > 0.4) currentZoom -= 0.1;
                container.style.zoom = currentZoom;
            });
            
            if (callbackPrint) {
                document.getElementById('btnPrintDoc').addEventListener('click', () => {
                    callbackPrint();
                });
            }

            if (callbackDownload) {
                document.getElementById('btnDownloadDoc').addEventListener('click', () => {
                    Swal.close();
                    callbackDownload();
                });
            }
        }
    });
};
