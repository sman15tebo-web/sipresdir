// ============================================================
// KONFIGURASI API & CORE STATE
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwulidxzNLLsZvifPbG8WTYXDMfVnhfsSJH6i8u7F1j3dIp3SiNSMd1x8qpO1jzzARWLA/exec";

let currentUser = null,
    isSidebarOpen = true,
    appCache = { siswa: null, guru: null },
    existingClasses = [],
    guruChartInstance = null,
    adminChartInstance = null,
    loadingInterval;

const tableState = {
    siswa: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
    guru: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
    libur: { fullData: [], filtered: [], limit: 5, page: 1, search: '' },
    rekap: { fullData: [], filtered: [], limit: 10, page: 1, search: '' },
    monitoring: { fullData: [], filtered: [], limit: 10, page: 1, search: '', statusFilter: '', classFilter: '' },
    wfh: { fullData: [], filtered: [], limit: 5, page: 1, search: '' },
    pelanggaran: { fullData: [], filtered: [], limit: 10, page: 1, search: '', kategoriFilter: '' }
};

// ============================================================
// FUNGSI UTAMA (API, LOADING, ALERT, MODAL)
// ============================================================
async function fetchAPI(action, params = {}) {
    params.action = action;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(params),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const countdownEl = document.getElementById('loadingCountdown');
    const textEl = document.getElementById('loadingText');

    overlay.classList.remove('hidden');
    let timeLeft = 8;
    countdownEl.textContent = timeLeft;
    countdownEl.parentElement.style.display = 'flex';
    textEl.innerHTML = 'Memproses... <br><span class="text-[10px] text-gray-500 font-normal">Mohon tunggu</span>';

    clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            countdownEl.textContent = timeLeft;
        } else if (timeLeft === 0) {
            countdownEl.parentElement.style.display = 'none';
            textEl.innerHTML = 'Sedang memproses data... <br><span class="text-[10px] text-orange-600 font-bold">Tunggu sebentar..</span>';
        }
    }, 1000);
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    clearInterval(loadingInterval);
}

function showModal(content) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = `<div class="fixed inset-0 z-50 flex items-center justify-center p-4"><div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onclick="closeModal()"></div><div class="relative w-full max-w-2xl transform transition-all animate-fade-in">${content}</div></div>`;
}

function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

function showAlert(type, message) {
    const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    const div = document.createElement('div');
    div.className = `fixed top-6 right-6 ${bg} text-white px-6 py-4 rounded-xl shadow-2xl z-[80] flex items-center font-medium animate-fade-in transform translate-y-2`;
    div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-3 text-xl"></i> ${message}`;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}

// ============================================================
// INISIALISASI & KONFIGURASI APP
// ============================================================
async function initAppConfigs() {
    try {
        const result = await fetchAPI('getSettings');
        if (result) {
            document.querySelectorAll('.dyn-logo').forEach(el => { if (el.tagName === 'IMG') el.src = result.logo; });
            document.querySelectorAll('.dyn-logoInstansi').forEach(el => { if (el.tagName === 'IMG') el.src = result.logoInstansi || result.logo; });
            document.querySelectorAll('.dyn-namaInstansi').forEach(el => el.innerHTML = result.namaInstansi);
            document.querySelectorAll('.dyn-namasekolah').forEach(el => el.innerHTML = result.namasekolah);
            document.querySelectorAll('.dyn-alamat').forEach(el => el.innerHTML = result.alamat);
            document.querySelectorAll('.dyn-website').forEach(el => el.innerHTML = result.website);
            document.querySelectorAll('.dyn-website-link').forEach(el => el.href = (result.website.startsWith('http') ? result.website : 'https://' + result.website));
            document.querySelectorAll('.dyn-runningtext').forEach(el => el.innerHTML = result.runningtext);
            document.querySelectorAll('.dyn-tahun').forEach(el => el.innerHTML = result.tahun);
        }

        // Ambil status libur hari ini
        const statusHari = await fetchAPI('cekWFHToday');
        if (statusHari) window.appStatusHari = statusHari;
    } catch (e) { console.log("Gagal memuat pengaturan awal", e); }
}

async function loadPengaturan() {
    stopAndBack(false); setActiveMenu('Pengaturan'); showView('view-pengaturan');
    const form = document.querySelector('#view-pengaturan form');
    const token = currentUser ? currentUser.token : null;
    try {
        const res = await fetchAPI('getLinkSettings', { token: token });
        if (res.success) {
            form.elements['namaInstansi'].value = res.data.namaInstansi;
            form.elements['namasekolah'].value = res.data.namasekolah;
            form.elements['alamat'].value = res.data.alamat;
            form.elements['tahun'].value = res.data.tahun;
            form.elements['website'].value = res.data.website;
            form.elements['runningtext'].value = res.data.runningtext;

            const defLogo = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhfzGqA11LudTtI5aqUk93_GUJWPoHCR2uNbhgSgZhv71Bmx48aW6zBg7l7U6KoVNNmQpC7zai4T3KeV6DfH1VXfpwQDaxYPEiaCZ8opxte2Koje_yoSzejOD3eKTGt8tHeMuVVrldPZjsXCeRjUe1dbFibHnjpxZYcYlsGBz3YKr_ZU9E9n4z1y0dUrYXC/s425/logo%20sipresdir.png';
            document.getElementById('finalLogoData').value = res.data.logo;
            document.getElementById('previewLogoSetting').src = res.data.logo || defLogo;
            document.getElementById('finalLogoInstansiData').value = res.data.logoInstansi;
            document.getElementById('previewLogoInstansiSetting').src = res.data.logoInstansi || defLogo;
        }
    } catch (e) { }
}

async function saveLinkData(e) {
    e.preventDefault(); const fd = new FormData(e.target); const token = currentUser ? currentUser.token : null;
    const data = {
        namaInstansi: fd.get('namaInstansi'),
        logoInstansi: document.getElementById('finalLogoInstansiData').value,
        namasekolah: fd.get('namasekolah'),
        logo: document.getElementById('finalLogoData').value,
        alamat: fd.get('alamat'),
        tahun: fd.get('tahun'),
        website: fd.get('website'),
        runningtext: fd.get('runningtext')
    };
    showLoading();
    try {
        const res = await fetchAPI('updateLinkSettings', { token: token, data: data });
        hideLoading();
        if (res.success) { showAlert('success', res.message); initAppConfigs(); }
        else { showAlert('error', res.message); }
    } catch (err) { hideLoading(); }
}

// LOGIKA UPLOAD & CROP LOGO
let cropperInstance = null;
let targetCropInput = '';
let targetCropPreview = '';

document.addEventListener("DOMContentLoaded", function () {
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

    setupLogoUpload('inputLogoFile', 'finalLogoData', 'previewLogoSetting');
    setupLogoUpload('inputLogoInstansiFile', 'finalLogoInstansiData', 'previewLogoInstansiSetting');

    initAppConfigs();
    checkSession();
});

function openCropModal(imageSrc) {
    const modal = document.getElementById('cropModal');
    const image = document.getElementById('imageToCrop');
    modal.classList.remove('hidden');
    image.src = imageSrc;
    if (cropperInstance) { cropperInstance.destroy(); }
    cropperInstance = new Cropper(image, { aspectRatio: 1 / 1, viewMode: 1, background: false, autoCropArea: 0.8, dragMode: 'move' });
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

    try {
        const result = await fetchAPI('login', {
            username: userVal,
            password: passVal,
            nisn: nisnVal
        });

        hideLoading();

        if (result.success) {
            currentUser = result;
            localStorage.setItem('absensiAppSession', JSON.stringify(result));
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('dashboardContainer').classList.remove('hidden');
            initDashboard();
        } else {
            const errorDiv = document.getElementById('loginError');
            document.getElementById('errorText').textContent = result.message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        }
    } catch (error) {
        hideLoading();
        alert('Gagal terhubung ke server: ' + error.toString());
    }
}

function checkSession() {
    const storedSession = localStorage.getItem('absensiAppSession');
    if (storedSession) {
        try {
            const sessionData = JSON.parse(storedSession);
            if (sessionData && sessionData.success) {
                currentUser = sessionData;
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('dashboardContainer').classList.remove('hidden');
                if (window.innerWidth < 768) document.getElementById('sidebar').classList.add('-translate-x-full');
                initDashboard();
            }
        } catch (e) {
            localStorage.removeItem('absensiAppSession');
        }
    }
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

function executeLogout() {
    stopAndBack(false);
    localStorage.removeItem('absensiAppSession');
    currentUser = null;
    appCache = { siswa: null, guru: null };
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');

    if (document.getElementById('username')) document.getElementById('username').value = '';
    if (document.getElementById('password')) document.getElementById('password').value = '';
    if (document.getElementById('nisn')) document.getElementById('nisn').value = '';

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

function showView(viewId) {
    viewIdGlobal = viewId;
    const fabKasus = document.getElementById('fabInputKasus');
    if (fabKasus) {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'guru') && viewId !== 'view-input-kasus') {
            fabKasus.classList.remove('hidden');
        } else {
            fabKasus.classList.add('hidden');
        }
    }

    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
        target.classList.add('animate-fade-in');
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
        case 'view-input-kasus': title = "Catat Pelanggaran"; break;
        case 'view-rekap-kasus': title = "Rekap Pelanggaran"; break;
    }

    document.getElementById('pageTitle').textContent = title;
    closeSidebarMobile();
    scrollToTop();
}

function setActiveMenu(targetName) {
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
    if (modal) { modal.classList.remove('hidden'); }
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) { modal.classList.add('hidden'); }
}

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

    const createItem = (label, icon, onclick, isDefaultActive = false) => {
        const hideText = !isSidebarOpen ? 'hidden' : '';
        const centerClass = !isSidebarOpen ? 'justify-center px-0' : 'space-x-3 px-4';
        const style = isDefaultActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "text-gray-400 hover:bg-gray-800 hover:text-white";
        return `
        <a data-name="${label}" onclick="${onclick}" class="flex items-center ${centerClass} py-3 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap cursor-pointer ${style}">
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
        menuHTML += createItem('Manaj. Akun', 'fa-users-cog', 'loadDataSiswa()');
        menuHTML += createItem('Manaj. Presensi', 'fa-calendar-check', 'loadKelolaAbsen()');
        menuHTML += createItem('Manaj. Disiplin', 'fa-balance-scale', 'loadMasterPelanggaran()');
        menuHTML += createItem('Scan Presensi', 'fa-qrcode', 'loadScanAbsensi()');
        menuHTML += createItem('Pengaturan', 'fa-cog', 'loadPengaturan()');
        loadAdminDashboard();

    } else if (currentUser.role === 'guru') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadGuruDashboard()', true);
        menuHTML += createItem('Monitoring', 'fa-eye', 'loadMonitoringAbsensi()');
        menuHTML += createItem('Scan Presensi', 'fa-qrcode', 'loadScanAbsensi()');
        menuHTML += createItem('Input Kasus Siswa', 'fa-exclamation-triangle', 'loadInputKasus()');
        menuHTML += createItem('Rekap Pelanggaran', 'fa-balance-scale', 'loadRekapKasus()');
        loadGuruDashboard();
    } else if (currentUser.role === 'siswa') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadSiswaDashboard()', true);
        menuHTML += createItem('Kartu Saya', 'fa-id-card', 'loadQRCodeSiswa()');
        menuHTML += createItem('Rekam-WFH', 'fa-camera-retro', 'loadAbsenWFH()');
        menuHTML += createItem('Izin / Sakit', 'fa-envelope-open-text', 'loadIzinSiswa()');
        menuHTML += createItem('Rekap Kehadiran', 'fa-file-pdf', 'loadRekapSiswa()');
        loadSiswaDashboard();
    }

    menuContainer.innerHTML = menuHTML;
    loadKelasSuggestions();
    initMobileNav();

    // Sembunyikan tab khusus admin jika bukan admin
    if (currentUser.role !== 'admin') {
        document.querySelectorAll('.admin-only-tab').forEach(el => el.classList.add('hidden'));
    } else {
        document.querySelectorAll('.admin-only-tab').forEach(el => el.classList.remove('hidden'));
    }
}

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
        navHTML += createBottomNav('Rekap Kasus', 'fa-balance-scale', 'loadRekapKasus()');

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
        loadDataSiswa();
        showAlert('success', 'Data siswa diperbarui.');
    }
    else if (type === 'guru') {
        tableState.guru.fullData = [];
        loadDataGuru();
        showAlert('success', 'Data guru diperbarui.');
    }
    else if (type === 'dashboard') {
        if (currentUser.role === 'admin') loadAdminDashboard();
        else if (currentUser.role === 'guru') loadGuruDashboard();
        else loadSiswaDashboard();
        showAlert('success', 'Statistik Dashboard diperbarui.');
    }
    else if (type === 'monitoring') {
        tableState.monitoring.fullData = [];
        loadMonitoringAbsensi();
        showAlert('success', 'Data monitoring diperbarui.');
    }

    if (btnIcon) setTimeout(() => btnIcon.classList.remove('fa-spin'), 1000);
}

// ============================================================
// DASHBOARD LOGIC (ADMIN & GURU)
// ============================================================
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

let adminViolationChartInstance = null;

async function loadAdminDashboard() {
    stopAndBack(false); setActiveMenu('Dashboard'); showView('view-admin-dashboard');
    document.getElementById('adminDateDisplay').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.querySelector('#view-admin-dashboard h2').textContent = 'Dashboard Admin';

    try {
        // 1. Get Realtime Stats (Cards)
        const result = await fetchAPI('getMonitoringRealtime', { filterKelas: null });
        if (result.success) {
            const data = result.data;
            const total = data.length;
            const hadir = data.filter(d => d.status === 'Hadir').length;
            const sakit = data.filter(d => d.status === 'Sakit').length;
            const izin = data.filter(d => d.status === 'Izin').length;
            const alpa = data.filter(d => d.status === 'Alpa').length;

            animateValue("admStatTotal", 0, total, 800);
            animateValue("admStatHadir", 0, hadir, 800);
            animateValue("admStatSakit", 0, sakit, 800);
            animateValue("admStatIzin", 0, izin, 800);
            animateValue("admStatAlpa", 0, alpa, 800);
        }

        // 2. Get Advanced Stats (Charts & Leaderboards)
        const advRes = await fetchAPI('getDashboardAdvancedStats', { token: currentUser.token });
        if(advRes.success) {
            const adv = advRes.data;
            renderAdminAttendanceLineChart(adv.attendanceTrend);
            renderAdminViolationPieChart(adv.violationPie);
            renderLeaderboardKelas(adv.topClasses);
            renderLeaderboardSiswa(adv.topViolators);
        }

    } catch (e) {
        console.error("Fetch Exception in loadAdminDashboard:", e);
        showAlert('error', "Terjadi kesalahan koneksi saat memuat dashboard.");
    }
}

function renderAdminAttendanceLineChart(historyData) {
    const ctx = document.getElementById('adminAttendanceChart');
    if (!ctx) return;
    if (adminChartInstance) adminChartInstance.destroy();
    
    // Sort array so oldest is first
    const sortedData = historyData.slice().reverse();
    const labels = sortedData.map(d => d.date);
    const hadirData = sortedData.map(d => d.hadir);
    const alpaData = sortedData.map(d => d.alpa);

    adminChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hadir',
                    data: hadirData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Alpa',
                    data: alpaData,
                    borderColor: '#EF4444',
                    backgroundColor: 'transparent',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderAdminViolationPieChart(pieData) {
    const ctx = document.getElementById('adminViolationChart');
    if (!ctx) return;
    if (adminViolationChartInstance) adminViolationChartInstance.destroy();

    const dataArr = [pieData.ringan, pieData.sedang, pieData.berat];
    // If all zero, render empty
    if(dataArr.every(x => x === 0)) dataArr[0] = 0.001; 

    adminViolationChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ringan (<=10)', 'Sedang (11-25)', 'Berat (>25)'],
            datasets: [{
                data: [pieData.ringan, pieData.sedang, pieData.berat],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { display: false }
            }
        }
    });
}

function renderLeaderboardKelas(topClasses) {
    const tbody = document.getElementById('leaderboardKelas');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(topClasses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-xs text-gray-500">Belum ada data absensi hari ini.</td></tr>`;
        return;
    }
    
    topClasses.forEach((c, index) => {
        const tr = document.createElement('tr');
        let medal = `<span class="text-gray-500 font-bold">#${index+1}</span>`;
        if(index === 0) medal = `<i class="fas fa-medal text-yellow-400 text-lg"></i>`;
        else if(index === 1) medal = `<i class="fas fa-medal text-gray-400 text-lg"></i>`;
        else if(index === 2) medal = `<i class="fas fa-medal text-orange-400 text-lg"></i>`;

        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-center">${medal}</td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-gray-800">${c.kelas}</td>
            <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end">
                    <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-emerald-500 h-2 rounded-full" style="width: ${c.persentase}%"></div>
                    </div>
                    <span class="text-xs font-bold text-emerald-600">${c.persentase}%</span>
                </div>
                <div class="text-[9px] text-gray-400 mt-0.5">${c.hadir} dari ${c.total} siswa</div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLeaderboardSiswa(topSiswa) {
    const tbody = document.getElementById('leaderboardSiswa');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(topSiswa.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-xs text-gray-500">Siswa teladan, belum ada catatan pelanggaran.</td></tr>`;
        return;
    }

    topSiswa.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-rose-50 cursor-pointer transition";
        tr.onclick = () => openRaporKedisiplinan(s.nisn);
        
        tr.innerHTML = `
            <td class="px-4 py-3">
                <div class="text-sm font-bold text-gray-800 truncate max-w-[150px]">${s.nama}</div>
                <div class="text-[10px] text-gray-400 font-mono">${s.nisn}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-600">${s.kelas}</td>
            <td class="px-4 py-3 whitespace-nowrap text-right">
                <span class="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-200">${s.totalPoin} Poin</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function openRaporKedisiplinan(nisn) {
    if(!nisn) return;
    Swal.fire({ title: 'Memuat Rapor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetchAPI('getStudentDisciplineReport', { token: currentUser.token, nisn: nisn });
        Swal.close();
        if(res.success) {
            const data = res.data;
            const bio = data.biodata;
            const abs = data.absensi;
            
            let ketPoin = "SANGAT BAIK"; let warna = "text-emerald-600"; let bg = "bg-emerald-50 border-emerald-200";
            if(data.poin > 10) { ketPoin = "PERINGATAN"; warna = "text-yellow-600"; bg = "bg-yellow-50 border-yellow-200"; }
            if(data.poin > 25) { ketPoin = "RAWAN"; warna = "text-orange-600"; bg = "bg-orange-50 border-orange-200"; }
            if(data.poin > 50) { ketPoin = "TINDAK LANJUT"; warna = "text-rose-600"; bg = "bg-rose-50 border-rose-200"; }

            let kasusHtml = '';
            if(data.kasus.length === 0) {
                kasusHtml = `<div class="text-center p-6 text-sm text-gray-400 italic">Siswa belum memiliki catatan pelanggaran.</div>`;
            } else {
                data.kasus.forEach(k => {
                    kasusHtml += `
                        <div class="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex justify-between gap-4">
                            <div>
                                <div class="text-xs font-bold text-gray-800">${k.jenis}</div>
                                <div class="text-[10px] text-gray-500 mt-1">${k.catatan || '-'}</div>
                                <div class="text-[9px] text-gray-400 mt-2"><i class="fas fa-user-tie mr-1"></i> Dilaporkan: ${k.pelapor}</div>
                            </div>
                            <div class="text-right flex flex-col justify-between">
                                <div class="text-[10px] text-gray-400 mb-1 whitespace-nowrap"><i class="far fa-calendar-alt mr-1"></i>${k.tanggal}</div>
                                <div class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">+${k.poin} Pts</div>
                            </div>
                        </div>
                    `;
                });
            }

            const modalHtml = `
                <div class="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <!-- Header -->
                    <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-id-card-alt text-indigo-400 text-xl"></i>
                            <h3 class="font-bold text-sm">Rapor Kedisiplinan</h3>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.print()" class="text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                <i class="fas fa-print mr-1"></i> Print
                            </button>
                            <button onclick="closeModal()" class="text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-0 overflow-y-auto printable-rapor">
                        <!-- Profil & Ringkasan -->
                        <div class="p-6 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row gap-6 items-center md:items-start">
                            <img src="${bio.foto}" class="w-24 h-24 rounded-2xl object-cover shadow-sm border border-gray-200">
                            <div class="flex-1 text-center md:text-left">
                                <h2 class="text-2xl font-black text-gray-800 uppercase tracking-tight">${bio.nama}</h2>
                                <p class="text-sm text-gray-500 font-mono mt-1"><i class="fas fa-fingerprint mr-1 text-gray-400"></i> ${bio.nisn}</p>
                                <div class="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                                    <span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-200">Kelas ${bio.kelas}</span>
                                    <span class="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold border border-gray-300">${bio.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                                </div>
                            </div>
                            
                            <!-- Poin Besar -->
                            <div class="w-full md:w-auto ${bg} p-4 rounded-xl text-center shadow-sm border mt-4 md:mt-0 flex-shrink-0">
                                <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Poin Pelanggaran</p>
                                <div class="text-4xl font-black ${warna} drop-shadow-sm">${data.poin}</div>
                                <div class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/50 border border-white mt-1 inline-block ${warna}">${ketPoin}</div>
                            </div>
                        </div>

                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Kolom Kiri: Rekap Absensi -->
                            <div>
                                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center"><i class="fas fa-calendar-check text-emerald-500 mr-2"></i> Rekap Kehadiran</h4>
                                <div class="bg-white border border-gray-100 rounded-xl shadow-sm p-4 grid grid-cols-2 gap-4">
                                    <div class="text-center p-3 bg-emerald-50 rounded-lg">
                                        <div class="text-2xl font-bold text-emerald-600">${abs.hadir}</div>
                                        <div class="text-[10px] text-gray-500 uppercase">Hadir</div>
                                    </div>
                                    <div class="text-center p-3 bg-yellow-50 rounded-lg">
                                        <div class="text-2xl font-bold text-yellow-600">${abs.sakit}</div>
                                        <div class="text-[10px] text-gray-500 uppercase">Sakit</div>
                                    </div>
                                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">${abs.izin}</div>
                                        <div class="text-[10px] text-gray-500 uppercase">Izin</div>
                                    </div>
                                    <div class="text-center p-3 bg-rose-50 rounded-lg">
                                        <div class="text-2xl font-bold text-rose-600">${abs.alpa}</div>
                                        <div class="text-[10px] text-gray-500 uppercase">Alpa</div>
                                    </div>
                                    <div class="col-span-2 text-center p-2 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center gap-2">
                                        <i class="fas fa-running text-orange-500"></i>
                                        <span class="text-xs font-bold text-orange-700">Terlambat: ${abs.telat} Kali</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Kolom Kanan: Histori Pelanggaran -->
                            <div class="flex flex-col h-full">
                                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center"><i class="fas fa-history text-rose-500 mr-2"></i> Histori Pelanggaran</h4>
                                <div class="bg-white border border-gray-100 rounded-xl shadow-sm flex-1 overflow-y-auto max-h-[300px]">
                                    ${kasusHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            showModal(modalHtml);
        } else {
            Swal.fire('Gagal!', res.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', e.toString(), 'error');
    }
}

async function loadGuruDashboard() {
    stopAndBack(false); setActiveMenu('Dashboard'); showView('view-admin-dashboard');
    document.getElementById('adminDateDisplay').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const myClass = currentUser.role === 'guru' ? currentUser.kelas : null;
    const titleEl = document.querySelector('#view-admin-dashboard h2');
    if (myClass) {
        titleEl.textContent = `Dashboard Guru (${myClass})`;
    } else {
        titleEl.textContent = `Dashboard Guru`;
    }

    try {
        const result = await fetchAPI('getMonitoringRealtime', { filterKelas: null });
        if (result.success) {
            const data = result.data;
            const total = data.length;
            const hadir = data.filter(d => d.status === 'Hadir').length;
            const sakit = data.filter(d => d.status === 'Sakit').length;
            const izin = data.filter(d => d.status === 'Izin').length;
            const alpa = data.filter(d => d.status === 'Alpa').length;

            animateValue("admStatTotal", 0, total, 800);
            animateValue("admStatHadir", 0, hadir, 800);
            animateValue("admStatSakit", 0, sakit, 800);
            animateValue("admStatIzin", 0, izin, 800);
            animateValue("admStatAlpa", 0, alpa, 800);
        }

        const advRes = await fetchAPI('getDashboardAdvancedStats', { token: currentUser.token });
        if(advRes.success) {
            const adv = advRes.data;
            renderAdminAttendanceLineChart(adv.attendanceTrend);
            renderAdminViolationPieChart(adv.violationPie);
            renderLeaderboardKelas(adv.topClasses);
            renderLeaderboardSiswa(adv.topViolators);
        }
    } catch (e) { 
        console.error(e);
    }
}

function renderGuruChart(hadir, sakit, izin, alpa, belumAbsen) {
    const ctx = document.getElementById('guruAttendanceChart');
    if (!ctx) return;
    if (guruChartInstance) guruChartInstance.destroy();
    if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); }

    guruChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen'],
            datasets: [{
                label: 'Jumlah Siswa',
                data: [hadir, sakit, izin, alpa, belumAbsen],
                backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#9CA3AF'],
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value > 0 ? value : '',
                    font: { weight: 'bold', size: 11 },
                    color: '#4B5563'
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#F3F4F6' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function showProfilGuruMobile() {
    const totalSiswa = document.getElementById('statGuruTotal') ? document.getElementById('statGuruTotal').innerText : '0';
    const namaKelas = currentUser.kelas ? currentUser.kelas : 'Semua Kelas';
    const namaGuru = currentUser.nama || currentUser.username || 'Guru';

    const modalContent = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-[300px] w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition">
            <i class="fas fa-times"></i>
        </button>

        <div class="text-center mb-6 mt-2">
            <div class="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-200 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md text-4xl">
                <i class="fas fa-user-circle"></i>
            </div>
            <h3 class="font-bold text-xl text-gray-800 tracking-tight leading-tight">${namaGuru}</h3>
            <p class="text-[10px] font-bold text-purple-600 uppercase tracking-widest mt-1 bg-purple-50 inline-block px-3 py-1 rounded-full border border-purple-100">Akun Guru</p>
        </div>

        <div class="bg-white rounded-2xl p-1 mb-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <div class="flex justify-between items-center p-3 border-b border-gray-50">
                <div class="flex items-center gap-2"><i class="fas fa-chalkboard text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Kelas</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${namaKelas}</span>
            </div>
            <div class="flex justify-between items-center p-3">
                <div class="flex items-center gap-2"><i class="fas fa-users text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Siswa</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${totalSiswa} Orang</span>
            </div>
        </div>

        <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-indigo-100 opacity-50"><i class="fas fa-qrcode text-6xl"></i></div>
            <i class="fas fa-camera text-indigo-500 text-2xl mb-2 relative z-10"></i>
            <p class="text-xs font-medium text-indigo-800 leading-relaxed relative z-10">
                Untuk memulai Presensi, silakan ketuk tombol <b class="text-indigo-600">Scan Kamera</b> berwarna ungu di bawah layar Anda.
            </p>
        </div>
    </div>
    `;
    showModal(modalContent);
}

// ============================================================
// MANAJEMEN DATA AKUN (SISWA & GURU)
// ============================================================
async function loadDataSiswa() {
    stopAndBack(false);
    setActiveMenu('Manaj. Akun');
    showView('view-data-siswa');

    const dropdown = document.getElementById('filterKelasSiswa');
    if (dropdown && existingClasses && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    if (tableState.siswa.fullData.length > 0) {
        processTableData('siswa');
    } else {
        document.getElementById('tbody-siswa').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data siswa...</td></tr>';
        try {
            const result = await fetchAPI('getSiswaList');
            if (result.success) {
                tableState.siswa.fullData = result.data;
                processTableData('siswa');
            } else {
                showAlert('error', result.message);
            }
        } catch (e) {
            console.error("Fetch Exception in loadDataSiswa:", e);
            showAlert('error', "Gagal memuat data siswa.");
        }
    }
}

async function loadDataGuru() {
    stopAndBack(false); setActiveMenu('Manaj. Akun'); showView('view-data-guru');
    const dropdown = document.getElementById('filterKelasGuru');

    if (dropdown && existingClasses && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    if (tableState.guru.fullData.length > 0) {
        processTableData('guru');
    } else {
        document.getElementById('tbody-guru').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data guru...</td></tr>';
        try {
            const result = await fetchAPI('getGuruList', { token: currentUser.token });
            if (result.success) {
                tableState.guru.fullData = result.data;
                processTableData('guru');
            } else {
                document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">${result.message}</td></tr>`;
                showAlert('error', result.message);
            }
        } catch (error) {
            document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">Error: ${error}</td></tr>`;
        }
    }
}

async function loadKelasSuggestions() {
    try {
        const result = await fetchAPI('getKelasList');
        if (result.success) existingClasses = result.data;
    } catch (e) { }
}

function openKelasDropdown() {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    renderDropdownItems(existingClasses);
    list.classList.remove('hidden');
}

function closeKelasDropdown() {
    setTimeout(() => { const list = document.getElementById('dropdownKelasList'); if (list) list.classList.add('hidden'); }, 200);
}

function filterKelasDropdown(query) {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    if (!query) { renderDropdownItems(existingClasses); return; }
    const filtered = existingClasses.filter(c => c.toLowerCase().includes(query.toLowerCase()));
    renderDropdownItems(filtered);
}

function renderDropdownItems(arr) {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    if (arr.length === 0) { list.innerHTML = '<div class="p-2 text-xs text-gray-400">Kelas tidak ditemukan</div>'; return; }
    list.innerHTML = arr.map(kelas => `<div onclick="selectKelasItem('${kelas}')" class="p-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 transition">${kelas}</div>`).join('');
}

function selectKelasItem(val) {
    const input = document.getElementById('inputKelas');
    if (input) input.value = val;
    closeKelasDropdown();
}

// RENDERER ROW SISWA & GURU (Dipindahkan dari index.html)
function renderSiswaRows(data, startIdx) {
    const tbody = document.getElementById('tbody-siswa');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((siswa, i) => `
    <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
        <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
        <td class="p-4 whitespace-normal min-w-[120px]">
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-3 mt-1 shrink-0">${siswa.nama.charAt(0)}</div>
                <div class="whitespace-normal">
                    <div class="font-bold text-sm text-gray-900 break-words leading-tight">${siswa.nama}</div>
                    <div class="text-xs text-gray-500 md:hidden mt-0.5">${siswa.nisn}</div>
                </div>
            </div>
        </td>
        <td class="p-4 hidden md:table-cell text-sm text-gray-600 font-mono">${siswa.nisn}</td>
        <td class="p-4 hidden sm:table-cell"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">${siswa.kelas}</span></td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                <button onclick='viewSiswa(${JSON.stringify(siswa).replace(/'/g, "&#39;")})' class="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"><i class="fas fa-eye"></i></button>
                <button onclick='editSiswa(${JSON.stringify(siswa).replace(/'/g, "&#39;")})' class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><i class="fas fa-edit"></i></button>
                <button onclick="resetPasswordSiswaConfirm('${siswa.nisn}', '${siswa.nama.replace(/'/g, "\\'")}')" class="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition" title="Reset Password"><i class="fas fa-key"></i></button>
                <button onclick="deleteSiswaConfirm('${siswa.nisn}', '${siswa.nama.replace(/'/g, "\\'")}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><i class="fas fa-trash"></i></button>
                <button onclick="loadQRCodeSiswa('${siswa.nisn}', '${siswa.nama.replace(/'/g, "\\'")}', '${siswa.kelas}')" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><i class="fas fa-qrcode"></i></button>
            </div>
        </td>
    </tr>`).join('');
}

function renderGuruRows(data, startIdx) {
    const tbody = document.getElementById('tbody-guru');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((guru, i) => {
        const passId = `pass-${startIdx + i}`;
        const iconId = `icon-${startIdx + i}`;
        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
            <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
            <td class="p-4 text-sm font-bold text-gray-800">${guru.username}</td>
            <td class="p-4 text-sm text-gray-600">${guru.kelas ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">${guru.kelas}</span>` : '<span class="text-gray-400 italic text-xs">Semua Akses</span>'}</td>
            <td class="p-4 text-sm font-mono relative flex items-center">
                <span id="${passId}" class="text-gray-400 mr-2">••••••••</span>
                <button onclick="toggleTablePass('${passId}', '${iconId}', '${guru.password}')" class="text-gray-400 hover:text-purple-600 focus:outline-none transition">
                    <i id="${iconId}" class="fas fa-eye text-xs"></i>
                </button>
            </td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                    <button onclick='editGuru(${JSON.stringify(guru).replace(/'/g, "&#39;")})' class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Edit Akun"><i class="fas fa-edit"></i></button>
                    <button onclick="showChangeGuruPassModal('${guru.username.replace(/'/g, "\\'")}')" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Ganti Password"><i class="fas fa-key"></i></button>
                    <button onclick="deleteGuruConfirm('${guru.username.replace(/'/g, "\\'")}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Hapus Akun"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// LOGIKA IMPORT
function showImportSiswaModal() { showModal(createImportModal('Siswa')); }
function showImportGuruModal() { showModal(createImportModal('Guru')); }
function showImportPelanggaranModal() { showModal(createImportModal('Pelanggaran')); }

function createImportModal(type) {
    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-fade-in">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-file-excel"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Import Data ${type}</h3>
            <p class="text-xs text-gray-500 mt-1">Upload file Excel (.xlsx)</p>
        </div>
        <div class="mb-4 text-center">
            <button onclick="downloadTemplate('${type}')" class="text-xs text-indigo-600 hover:text-indigo-800 underline font-bold mb-3 block w-full text-center"><i class="fas fa-download mr-1"></i> Download Template ${type}</button>
            <p class="text-xs text-gray-500 mb-2">Pastikan format kolom sesuai template.</p>
        </div>
        <input type="file" id="importFile" accept=".xlsx, .xls" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4"/>
        <button onclick="processImport('${type}')" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition">Upload & Proses</button>
    </div>`;
}

function downloadTemplate(type) {
    let headers = [], fileName = "";
    if (type === 'Siswa') { headers = [["nama", "nisn", "jenisKelamin", "tanggalLahir", "agama", "namaAyah", "namaIbu", "noHp", "kelas", "alamat"]]; fileName = "Template_Import_Siswa.xlsx"; }
    else if (type === 'Guru') { headers = [["username", "password", "kelas"]]; fileName = "Template_Import_Guru.xlsx"; }
    else if (type === 'Pelanggaran') { headers = [["namaPelanggaran", "kategori", "poin"]]; fileName = "Template_Import_Pelanggaran.xlsx"; }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
}

function processImport(type) {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) { showAlert('error', 'Pilih file terlebih dahulu'); return; }
    showLoading();
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: "" });

        try {
            let res;
            if (type === 'Siswa') {
                res = await fetchAPI('importSiswaBulk', { arr: jsonData });
                hideLoading(); closeModal();
                if (res.success) { tableState.siswa.fullData = []; loadDataSiswa(); showAlert('success', res.message); }
                else { showAlert('error', res.message); }
            } else if (type === 'Guru') {
                res = await fetchAPI('importGuruBulk', { arr: jsonData });
                hideLoading(); closeModal();
                if (res.success) { tableState.guru.fullData = []; loadDataGuru(); showAlert('success', res.message); }
                else { showAlert('error', res.message); }
            } else if (type === 'Pelanggaran') {
                res = await fetchAPI('importPelanggaranBulk', { token: currentUser.token, arr: jsonData });
                hideLoading(); closeModal();
                if (res.success) { tableState.pelanggaran.fullData = []; loadMasterPelanggaran(); showAlert('success', res.message); }
                else { showAlert('error', res.message); }
            }
        } catch (err) { hideLoading(); showAlert('error', err); }
    };
    reader.readAsArrayBuffer(file);
}

// LOGIKA CRUD GURU
async function saveGuru(e, isEdit) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan...';

    const fd = new FormData(form);
    const username = "'" + fd.get('username');
    const password = "'" + fd.get('password');
    const kelas = fd.get('kelas');
    const token = currentUser ? currentUser.token : null;

    try {
        let r;
        if (isEdit) {
            r = await fetchAPI('updateGuru', { token: token, oldUsername: fd.get('oldUsername'), username: username, password: password, kelas: kelas });
        } else {
            r = await fetchAPI('addGuru', { token: token, username: username, password: password, kelas: kelas });
        }

        btn.disabled = false;
        btn.innerHTML = originalText;

        if (r && r.success) {
            closeModal();
            tableState.guru.fullData = [];
            loadDataGuru();
            showAlert('success', isEdit ? 'Data guru berhasil diperbarui' : 'Akun Guru berhasil dibuat');
        } else {
            showAlert('error', r ? r.message : 'Terjadi kesalahan');
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showAlert('error', 'Gagal koneksi server: ' + error);
    }
}

async function deleteGuruConfirm(username) {
    if (confirm(`Hapus akses untuk guru: ${username}?`)) {
        showLoading();
        const token = currentUser ? currentUser.token : null;
        try {
            const r = await fetchAPI('deleteGuru', { token: token, username: username });
            hideLoading();
            if (r.success) {
                tableState.guru.fullData = [];
                loadDataGuru();
                showAlert('success', 'Akun guru berhasil dihapus');
            } else {
                showAlert('error', r.message);
            }
        } catch (error) {
            hideLoading();
            showAlert('error', 'Gagal menghapus: ' + error);
        }
    }
}

function showAddGuruModal() { showModal(createGuruModal()); }
function editGuru(guruData) { showModal(createGuruModal(guruData)); }

function createGuruModal(guru = null) {
    const isEdit = guru !== null;
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 transition-all mb-4";

    let kelasOptions = '<option value="">-- Pilih Kelas (Opsional) --</option>';
    if (existingClasses && existingClasses.length > 0) {
        existingClasses.forEach(k => {
            const selected = (guru && guru.kelas === k) ? 'selected' : '';
            kelasOptions += `<option value="${k}" ${selected}>${k}</option>`;
        });
    }

    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-chalkboard-teacher"></i></div>
            <h3 class="font-bold text-xl text-gray-800">${isEdit ? 'Edit Akun Guru' : 'Tambah Guru'}</h3>
        </div>
        <form onsubmit="saveGuru(event, ${isEdit})">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Username</label>
            <input name="username" value="${guru?.username || ''}" placeholder="Username" required class="${inputClass}">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password</label>
            <input name="password" value="${guru?.password || ''}" placeholder="Password" required class="${inputClass}">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Wali Kelas Untuk</label>
            <select name="kelas" class="${inputClass}">${kelasOptions}</select>
            <p class="text-[10px] text-gray-400 -mt-3 mb-4">Jika dipilih, guru hanya bisa melihat siswa di kelas ini.</p>
            ${isEdit ? `<input type="hidden" name="oldUsername" value="${guru.username}">` : ''}
            <div class="flex gap-3 mt-2">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan</button>
            </div>
        </form>
    </div>`;
}

async function changeAdminPass(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const token = currentUser ? currentUser.token : null;

    if (fd.get('newPass').length < 6) {
        showAlert('error', 'Password minimal 6 karakter');
        return;
    }
    showLoading();
    try {
        const res = await fetchAPI('changeAdminPassword', {
            token: token,
            username: currentUser.username,
            oldPass: fd.get('oldPass'),
            newPass: fd.get('newPass')
        });
        hideLoading();
        if (res.success) {
            e.target.reset();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) { hideLoading(); }
}

function showChangeGuruPassModal(username) {
    showModal(`
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-key"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Reset Password</h3>
            <p class="text-xs text-gray-500 mt-1">Guru: <b>${username}</b></p>
        </div>
        <form onsubmit="saveGuruPass(event, '${username}')">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Baru</label>
            <input type="text" name="newPass" required placeholder="Minimal 6 karakter" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all mb-4">
            <div class="flex gap-3 mt-4">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">Simpan</button>
            </div>
        </form>
    </div>`);
}

async function saveGuruPass(e, username) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newPass = fd.get('newPass');
    const token = currentUser ? currentUser.token : null;

    if (newPass.length < 6) {
        showAlert('error', 'Password terlalu pendek');
        return;
    }
    showLoading();
    try {
        const res = await fetchAPI('resetGuruPassword', { token: token, username: username, newPass: newPass });
        hideLoading();
        if (res.success) {
            closeModal();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) { hideLoading(); }
}

// LOGIKA CRUD SISWA
async function saveSiswa(e, isEdit) {
    e.preventDefault();
    showLoading();

    const fd = new FormData(e.target);
    let tgl = fd.get('tanggalLahir');

    const siswaData = {
        nama: fd.get('nama'),
        nisn: "'" + fd.get('nisn'),
        jenisKelamin: fd.get('jenisKelamin'),
        tanggalLahir: tgl,
        agama: fd.get('agama'),
        namaAyah: fd.get('namaAyah'),
        namaIbu: fd.get('namaIbu'),
        noHp: "'" + fd.get('noHp'),
        kelas: fd.get('kelas'),
        alamat: fd.get('alamat')
    };

    const token = currentUser ? currentUser.token : null;

    try {
        let res;
        if (isEdit) {
            res = await fetchAPI('updateSiswa', { token: token, oldNisn: fd.get('oldNisn'), siswa: siswaData });
        } else {
            res = await fetchAPI('addSiswa', { token: token, siswa: siswaData });
        }

        hideLoading();
        if (res.success) {
            closeModal();
            tableState.siswa.fullData = [];
            loadDataSiswa();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) {
        hideLoading();
        showAlert('error', 'Terjadi kesalahan: ' + err);
    }
}

function deleteSiswaConfirm(nisn, nama) {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Data siswa "${nama}" akan dihapus.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            const token = currentUser.token;
            try {
                const r = await fetchAPI('deleteSiswa', { token: token, nisn: nisn });
                hideLoading();
                if (r.success) {
                    tableState.siswa.fullData = [];
                    loadDataSiswa();
                    Swal.fire('Terhapus!', 'Data siswa berhasil dihapus.', 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            } catch (err) {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            }
        }
    });
}

function resetPasswordSiswaConfirm(nisn, nama) {
    Swal.fire({
        title: 'Reset Password?',
        text: `Yakin ingin reset password ${nama} menjadi standar "123456"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Reset!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                const r = await fetchAPI('resetSiswaPassword', { token: currentUser.token, nisn: nisn });
                hideLoading();
                if (r.success) { Swal.fire('Berhasil!', r.message, 'success'); }
                else { Swal.fire('Gagal!', r.message, 'error'); }
            } catch (err) {
                hideLoading(); Swal.fire('Error', err.toString(), 'error');
            }
        }
    });
}

function viewSiswa(siswa) { showModal(createViewSiswaModal(siswa)); }
function showAddSiswaModal() { showModal(createSiswaModal()); }
function editSiswa(s) { showModal(createSiswaModal(s)); }

function createViewSiswaModal(s) {
    const item = (label, value, icon) => `
    <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
        <div class="flex items-center gap-2 mb-1">
            <i class="fas ${icon} text-gray-400 text-xs"></i>
            <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">${label}</span>
        </div>
        <div class="text-sm font-bold text-gray-800 break-words">${value || '-'}</div>
    </div>`;

    return `
    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full animate-fade-in relative">
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-start">
            <div class="flex gap-4 items-center">
                <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-inner">${s.nama.charAt(0)}</div>
                <div>
                    <h3 class="text-xl font-bold tracking-tight">${s.nama}</h3>
                    <p class="opacity-90 text-sm flex items-center gap-2">
                        <i class="far fa-id-card"></i> ${s.nisn} 
                        <span class="bg-white/20 px-2 py-0.5 rounded text-xs font-bold ml-2">${s.kelas}</span>
                    </p>
                </div>
            </div>
            <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">
            <div class="mb-6">
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-user-circle"></i> Data Pribadi</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${item('Jenis Kelamin', s.jenisKelamin, 'fa-venus-mars')}
                    ${item('Tanggal Lahir', s.tanggalLahir, 'fa-birthday-cake')}
                    ${item('Agama', s.agama, 'fa-pray')}
                    ${item('No. Handphone', s.noHp, 'fa-phone')}
                </div>
            </div>
            <div class="mb-6">
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-users"></i> Data Orang Tua</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${item('Nama Ayah', s.namaAyah, 'fa-male')}
                    ${item('Nama Ibu', s.namaIbu, 'fa-female')}
                </div>
            </div>
            <div>
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Alamat Lengkap</h4>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-3 items-start">
                    <i class="fas fa-home text-gray-400 mt-1"></i>
                    <p class="text-sm text-gray-700 leading-relaxed font-medium">${s.alamat || 'Alamat belum diisi.'}</p>
                </div>
            </div>
        </div>
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
            <button onclick="closeModal()" class="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition">Tutup</button>
        </div>
    </div>`;
}

function createSiswaModal(s = null) {
    const isEdit = s !== null;
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-all";
    const labelClass = "block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide";

    return `
    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
        </div>
        <div class="p-6 max-h-[75vh] overflow-y-auto">
            <form onsubmit="saveSiswa(event, ${isEdit})" class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="md:col-span-2">
                        <label class="${labelClass}">Nama Lengkap</label>
                        <input type="text" name="nama" value="${s?.nama || ''}" required class="${inputClass}" placeholder="Sesuai Akta Kelahiran">
                    </div>
                    <div>
                        <label class="${labelClass}">NISN</label>
                        <input type="number" name="nisn" value="${s?.nisn || ''}" required ${isEdit ? 'readonly class="' + inputClass + ' opacity-60 cursor-not-allowed"' : `class="${inputClass}"`} placeholder="Nomor Induk">
                    </div>
                    <div class="relative group">
                        <label class="${labelClass}">Kelas</label>
                        <input type="text" name="kelas" id="inputKelas" value="${s?.kelas || ''}" required class="${inputClass}" placeholder="Ketik atau pilih kelas" autocomplete="off" onfocus="openKelasDropdown()" oninput="filterKelasDropdown(this.value)" onblur="closeKelasDropdown()">
                        <div id="dropdownKelasList" class="hidden absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1 scrollbar-hide"></div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label class="${labelClass}">Jenis Kelamin</label>
                        <select name="jenisKelamin" class="${inputClass}">
                            <option value="Laki-laki" ${s?.jenisKelamin === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                            <option value="Perempuan" ${s?.jenisKelamin === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                        </select>
                    </div>
                    <div>
                        <label class="${labelClass}">Tanggal Lahir</label>
                        <input type="date" name="tanggalLahir" value="${s?.tanggalLahir || ''}" required class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Agama</label>
                        <select name="agama" class="${inputClass}">
                            <option value="Islam" ${s?.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                            <option value="Kristen" ${s?.agama === 'Kristen' ? 'selected' : ''}>Kristen</option>
                            <option value="Katolik" ${s?.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                            <option value="Hindu" ${s?.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                            <option value="Buddha" ${s?.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
                            <option value="Lainnya" ${s?.agama === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                        <label class="${labelClass}">Nama Ayah</label>
                        <input type="text" name="namaAyah" value="${s?.namaAyah || ''}" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Nama Ibu</label>
                        <input type="text" name="namaIbu" value="${s?.namaIbu || ''}" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">No. Handphone</label>
                        <input type="tel" name="noHp" value="${s?.noHp || ''}" class="${inputClass}">
                    </div>
                </div>
                <div>
                    <label class="${labelClass}">Alamat Lengkap</label>
                    <textarea name="alamat" rows="2" class="${inputClass}">${s?.alamat || ''}</textarea>
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onclick="closeModal()" class="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition">Batal</button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition transform active:scale-95">Simpan Data</button>
                </div>
                ${isEdit ? `<input type="hidden" name="oldNisn" value="${s.nisn}">` : ''}
            </form>
        </div>
    </div>`;
}

// LOGIKA DASHBOARD SISWA
async function loadSiswaDashboard() {
    stopAndBack(false);
    setActiveMenu('Dashboard');
    showView('view-siswa-dashboard');

    try {
        if (currentUser) {
            const fullName = currentUser.nama ? currentUser.nama : 'Siswa';
            document.getElementById('dashGreeting').textContent = fullName;
            document.getElementById('profileNameSidebar').textContent = currentUser.nama;
            document.getElementById('profileNisnSidebar').textContent = currentUser.nisn;
            document.getElementById('profileKelasSidebar').textContent = currentUser.kelas;

            let tglLahir = currentUser.tanggalLahir || '-';
            if (tglLahir.includes("T")) {
                tglLahir = new Date(tglLahir).toLocaleDateString('id-ID');
            }

            document.getElementById('profileJKSidebar').textContent = currentUser.jenisKelamin || '-';
            document.getElementById('profileLahirSidebar').textContent = tglLahir;
        }
        document.getElementById('dashDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { }

    try {
        const result = await fetchAPI('getAbsensiToday', { nisn: currentUser.nisn });

        if (result) {
            const absensi = result.success ? result.data : null;
            const isLibur = result.isLibur;
            const infoLibur = result.keteranganLibur;
            const isWFH = result.isWFH;

            const elHero = document.getElementById('heroCard');
            const elBadge = document.getElementById('dashStatusBadge');
            const elValMasuk = document.getElementById('valMasuk');
            const elValPulang = document.getElementById('valPulang');
            const elAlert = document.getElementById('alertBelumAbsen');
            const labelMasuk = document.getElementById('labelMasuk');
            const labelPulang = document.getElementById('labelPulang');

            const boxMasuk = document.getElementById('boxMasuk');
            const boxPulang = document.getElementById('boxPulang');
            const statusMasuk = document.getElementById('statusMasuk');
            const statusPulang = document.getElementById('statusPulang');

            boxPulang.style.display = 'block';
            boxMasuk.classList.remove('col-span-2');
            statusMasuk.textContent = "";
            statusPulang.textContent = "";

            let ketPagi = ""; let ketSore = "";
            if (absensi && absensi.keterangan) {
                let textKet = absensi.keterangan;
                if (isWFH) {
                    if (textKet.includes("PAGI:")) ketPagi = textKet.split("PAGI:")[1].split("|")[0].trim();
                    if (textKet.includes("SORE:")) ketSore = textKet.split("SORE:")[1].split("|")[0].trim();
                } else {
                    if (textKet.includes("&")) {
                        let parts = textKet.split("&");
                        ketPagi = parts[0].trim(); ketSore = parts[1].trim();
                    } else if (textKet.includes("Pulang")) {
                        ketPagi = "Tepat Waktu"; ketSore = textKet.trim();
                    } else {
                        ketPagi = textKet.trim();
                    }
                }
            }

            if (isLibur) {
                elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-red-800 p-6 text-white shadow-xl shadow-rose-200 transition-all duration-500 group";
                elBadge.innerHTML = `<i class="fas fa-calendar-times mr-2"></i> HARI LIBUR`;
                labelMasuk.innerHTML = "KETERANGAN";
                elValMasuk.innerHTML = `<span class="text-sm font-bold uppercase tracking-widest">${infoLibur}</span>`;
                boxPulang.style.display = 'none';
                boxMasuk.classList.add('col-span-2');
                elAlert.classList.add('hidden');
                return;
            }

            if (isWFH) {
                labelMasuk.innerHTML = "JAM PAGI";
                labelPulang.innerHTML = "JAM SORE";

                if (!absensi) {
                    elHero.className = "relative overflow-hidden rounded-3xl bg-slate-800 p-6 text-white shadow-xl shadow-slate-200 transition-all duration-500 group";
                    elBadge.className = "px-4 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-200 text-xs font-bold shadow-sm animate-pulse";
                    elBadge.innerHTML = `<i class="fas fa-circle text-[8px] mr-2"></i> BELUM ABSEN PAGI`;
                    elValMasuk.textContent = "--:--";
                    elValPulang.textContent = "--:--";

                    elAlert.innerHTML = `
                        <div class="bg-white p-2 rounded-full text-indigo-500 shadow-sm"><i class="fas fa-camera-retro"></i></div>
                        <div>
                            <h4 class="text-sm font-bold text-indigo-800 mb-0.5">Waktunya Presensi Pagi WFH</h4>
                            <p class="text-xs font-medium text-indigo-600/80 leading-relaxed">Ketuk menu WFH di bawah untuk melakukan perekaman kamera (Pagi).</p>
                        </div>`;
                    elAlert.className = "bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
                    elAlert.classList.remove('hidden');
                } else {
                    elValMasuk.textContent = absensi.jamDatang || "--:--";
                    statusMasuk.textContent = ketPagi;

                    if (!absensi.jamPulang || absensi.jamPulang === '-') {
                        elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-xl shadow-amber-200 transition-all duration-500 group";
                        elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm animate-pulse";
                        elBadge.innerHTML = `<i class="fas fa-clock mr-2"></i> BELUM ABSEN SORE`;
                        elValPulang.textContent = "--:--";

                        elAlert.innerHTML = `
                            <div class="bg-white p-2 rounded-full text-orange-500 shadow-sm"><i class="fas fa-sun"></i></div>
                            <div>
                                <h4 class="text-sm font-bold text-orange-800 mb-0.5">Jangan Lupa Presensi Sore!</h4>
                                <p class="text-xs font-medium text-orange-600/80 leading-relaxed">Jika jam sore sudah tiba, ketuk menu WFH lagi. Jarak Anda maksimal 200m dari titik Pagi.</p>
                            </div>`;
                        elAlert.className = "bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
                        elAlert.classList.remove('hidden');
                    } else {
                        elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-800 p-6 text-white shadow-xl shadow-indigo-200 transition-all duration-500 group";
                        elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm";
                        elBadge.innerHTML = `<i class="fas fa-check-circle mr-2"></i> WFH SELESAI`;
                        elValPulang.textContent = absensi.jamPulang;
                        statusPulang.textContent = ketSore;
                        elAlert.classList.add('hidden');
                    }
                }
            }
            else {
                labelMasuk.innerHTML = "JAM DATANG";
                labelPulang.innerHTML = "JAM PULANG";

                if (!absensi) {
                    elHero.className = "relative overflow-hidden rounded-3xl bg-slate-800 p-6 text-white shadow-xl shadow-slate-200 transition-all duration-500 group";
                    elBadge.className = "px-4 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-200 text-xs font-bold shadow-sm animate-pulse";
                    elBadge.innerHTML = `<i class="fas fa-circle text-[8px] mr-2"></i> BELUM ABSEN`;
                    elValMasuk.textContent = "--:--";
                    elValPulang.textContent = "--:--";

                    elAlert.innerHTML = `
                        <div class="bg-white p-2 rounded-full text-rose-500 shadow-sm"><i class="fas fa-exclamation"></i></div>
                        <div>
                            <h4 class="text-sm font-bold text-rose-800 mb-0.5">Peringatan Presensi</h4>
                            <p class="text-xs font-medium text-rose-600/80 leading-relaxed">Anda belum melakukan scan presensi hari ini.</p>
                        </div>`;
                    elAlert.className = "bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
                    elAlert.classList.remove('hidden');
                } else {
                    elValMasuk.textContent = absensi.jamDatang || "--:--";
                    statusMasuk.textContent = ketPagi;
                    elAlert.classList.add('hidden');

                    if (!absensi.jamPulang || absensi.jamPulang === '-') {
                        elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white shadow-xl shadow-emerald-200 transition-all duration-500 group";
                        elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm animate-pulse";
                        elBadge.innerHTML = `<i class="fas fa-clock mr-2"></i> SEDANG DI SEKOLAH`;
                        elValPulang.textContent = "--:--";
                    } else {
                        elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-800 p-6 text-white shadow-xl shadow-indigo-200 transition-all duration-500 group";
                        elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm";
                        elBadge.innerHTML = `<i class="fas fa-check-circle mr-2"></i> SELESAI HARI INI`;
                        elValPulang.textContent = absensi.jamPulang;
                        statusPulang.textContent = ketSore;
                    }
                }
            }
        }
    } catch (error) { }
}

async function showProfilSiswa() {
    showLoading();
    let dataSiswa = { nama: currentUser.nama, nisn: currentUser.nisn, kelas: currentUser.kelas, jenisKelamin: '-', tanggalLahir: '-' };
    try {
        const result = await fetchAPI('getSiswaList');
        if (result.success) {
            const findSiswa = result.data.find(s => s.nisn == currentUser.nisn);
            if (findSiswa) { dataSiswa = findSiswa; }
        }
    } catch (e) { }
    hideLoading();

    const modalContent = `
    <div class="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-[320px] w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0 border border-gray-100">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-rose-500 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fas fa-times"></i></button>

        <div class="text-center mb-6 mt-2">
            <div class="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-teal-50 shadow-md text-3xl">
                <i class="fas fa-user-graduate"></i>
            </div>
            <h3 class="font-bold text-lg text-gray-800 tracking-tight leading-tight">${dataSiswa.nama}</h3>
            <p class="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1.5 bg-teal-50 inline-block px-3 py-1 rounded-full border border-teal-100">Profil Siswa</p>
        </div>

        <div class="space-y-2 mb-4">
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="far fa-id-card text-teal-500 w-4 text-center mr-1"></i> NISN</span>
                <span class="text-sm font-bold text-gray-800 font-mono">${dataSiswa.nisn}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-chalkboard text-teal-500 w-4 text-center mr-1"></i> Kelas</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.kelas}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-venus-mars text-teal-500 w-4 text-center mr-1"></i> L/P</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.jenisKelamin}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-birthday-cake text-teal-500 w-4 text-center mr-1"></i> Lahir</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.tanggalLahir || '-'}</span>
            </div>
        </div>
        
        <button onclick="loadRekapKasus()" class="w-full mt-3 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-2 shadow-sm"><i class="fas fa-balance-scale"></i> Cek Poin Pelanggaran Disiplin
        </button>

        <button onclick="showUbahPasswordSiswaModal()" class="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 py-3 rounded-xl text-xs font-bold border border-teal-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <i class="fas fa-key"></i> Ubah Password Akun
        </button>
    </div>`;
    showModal(modalContent);
}

function showUbahPasswordSiswaModal() {
    const content = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-user-lock"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Ubah Password</h3>
            <p class="text-xs text-gray-500 mt-1">Amankan akun presensi kamu.</p>
        </div>
        <form onsubmit="submitUbahPasswordSiswa(event)">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Lama</label>
            <div class="relative group mb-4">
                <input type="password" id="oldPassSiswa" required class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('oldPassSiswa', 'eyeOldPass')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeOldPass"></i></button>
            </div>
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Baru</label>
            <div class="relative group mb-6">
                <input type="password" id="newPassSiswa" required minlength="6" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('newPassSiswa', 'eyeNewPass')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeNewPass"></i></button>
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan Password Baru</button>
        </form>
    </div>`;
    showModal(content);
}

async function submitUbahPasswordSiswa(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPassSiswa').value;
    const newPass = document.getElementById('newPassSiswa').value;

    showLoading();
    try {
        const res = await fetchAPI('changeSiswaPassword', { token: currentUser.token, oldPass: oldPass, newPass: newPass });
        hideLoading();
        if (res.success) {
            showAlert('success', res.message);
            closeModal();
        } else {
            showAlert('error', res.message);
        }
    } catch (err) {
        hideLoading();
        showAlert('error', 'Koneksi error: ' + err);
    }
}

// ====================================
// FITUR BACKUP & RESTORE JSON FULL SYSTEM
// ====================================
async function downloadFullBackupJSON() {
    if (!currentUser || currentUser.role !== 'admin') return;

    Swal.fire({
        title: 'Mempersiapkan Backup',
        html: 'Mengemas 100% data (Master & Sharding).<br>Proses ini memakan waktu beberapa detik...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const res = await fetchAPI('exportFullDBJSON', { token: currentUser.token });
        if (res.success) {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(res.data);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadAnchorNode.setAttribute('download', 'FullBackup_SiPresdir_' + dateStr + '.json');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            Swal.fire('Sukses!', 'File Backup berhasil didownload.', 'success');
        } else {
            Swal.fire('Gagal!', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error!', e.toString(), 'error');
    }
}

function processFullRestoreJSON(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    Swal.fire({
        title: 'Peringatan Keras!',
        html: '<p class="text-sm text-red-600 font-bold mb-2">Anda akan melakukan pemulihan 100% sistem.</p><p class="text-xs text-gray-600 text-left">Seluruh data saat ini (termasuk file Sharding Absensi dan Kasus) akan <b>ditimpa</b> dengan data dari file backup yang Anda pilih.</p><p class="text-xs text-gray-600 mt-2">Pastikan ini adalah file backup yang valid.</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Timpa Data Sekarang!'
    }).then((result) => {
        if (result.isConfirmed) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const jsonContent = e.target.result;

                Swal.fire({
                    title: 'Memulihkan Sistem...',
                    html: 'Mohon JANGAN TUTUP BROWSER.<br>Skrip sedang menulis ulang ribuan baris data...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const res = await fetchAPI('restoreFullDBJSON', { token: currentUser.token, jsonData: jsonContent });
                    if (res.success) {
                        Swal.fire('Restore Berhasil!', 'Sistem telah berhasil dipulihkan secara utuh. Halaman akan dimuat ulang.', 'success').then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire('Restore Gagal', res.message, 'error');
                    }
                } catch (err) {
                    Swal.fire('Error System', err.toString(), 'error');
                }
            };
            reader.readAsText(file);
        }
        input.value = '';
    });
}

