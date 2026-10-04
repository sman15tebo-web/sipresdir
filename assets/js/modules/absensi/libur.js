// ============================================================
// LOGIKA KELOLA HARI LIBUR & WFH
// ============================================================
const pendingScheduleDrafts = { libur: [], wfh: [] };
let activeJadwalTab = 'sekolah';
let jadwalLoadRequestId = 0;

async function loadKelolaJadwal() {
    const requestId = ++jadwalLoadRequestId;
    stopAndBack(false);
    setActiveMenu('Kelola Jadwal');
    await showView('view-kelola-absen');
    if (requestId !== jadwalLoadRequestId || viewIdGlobal !== 'view-kelola-absen') return;

    switchJadwalTab(activeJadwalTab);
    pendingScheduleDrafts.libur = [];
    pendingScheduleDrafts.wfh = [];
    const tbodyLibur = document.getElementById('tbody-libur');
    const tbodyWfh = document.getElementById('tbody-wfh');
    if (tbodyLibur) tbodyLibur.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat...</td></tr>';
    if (tbodyWfh) tbodyWfh.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat...</td></tr>';

    const [liburResult, wfhResult, configResult] = await Promise.allSettled([
        fetchAPI('getHariLibur'),
        fetchAPI('getJadwalWFH'),
        fetchAPI('getAppConfig')
    ]);
    if (requestId !== jadwalLoadRequestId || viewIdGlobal !== 'view-kelola-absen') return;

    const renderLoadError = (tbody, label, result) => {
        const error = result.status === 'rejected'
            ? result.reason
            : new Error(result.value?.message || `Server gagal memuat ${label}.`);
        console.error(`Gagal memuat ${label}:`, error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-600">Gagal memuat ${label}. Periksa koneksi, lalu buka kembali menu Kelola Jadwal.</td></tr>`;
        }
    };

    if (liburResult.status === 'fulfilled' && liburResult.value?.success && Array.isArray(liburResult.value.data)) {
        tableState.libur.fullData = liburResult.value.data;
        processTableData('libur');
    } else {
        renderLoadError(tbodyLibur, 'daftar hari libur', liburResult);
    }

    if (wfhResult.status === 'fulfilled' && wfhResult.value?.success && Array.isArray(wfhResult.value.data)) {
        tableState.wfh.fullData = wfhResult.value.data;
        processTableData('wfh');
    } else {
        renderLoadError(tbodyWfh, 'jadwal WFH', wfhResult);
    }

    if (configResult.status === 'fulfilled' && configResult.value?.success) {
        applyGlobalConfig(configResult.value);
    } else {
        const error = configResult.status === 'rejected'
            ? configResult.reason
            : new Error(configResult.value?.message || 'Server gagal memuat konfigurasi waktu.');
        console.error('Gagal memuat konfigurasi waktu jadwal:', error);
        const inputs = document.querySelectorAll('#view-kelola-absen input[type="time"]');
        inputs.forEach(input => { input.disabled = false; });
    }
}

function loadKelolaAbsen() {
    return loadKelolaJadwal();
}

window.switchJadwalTab = function (tab) {
    activeJadwalTab = tab === 'wfh' ? 'wfh' : 'sekolah';
    const tabs = ['sekolah', 'wfh'];
    tabs.forEach(name => {
        const panel = document.getElementById(`panel-jadwal-${name}`);
        const button = document.getElementById(`tab-jadwal-${name}`);
        if (!panel || !button) return;
        const active = name === activeJadwalTab;
        panel.classList.toggle('hidden', !active);
        button.classList.toggle('border-indigo-600', active);
        button.classList.toggle('text-indigo-600', active);
        button.classList.toggle('bg-indigo-50/50', active);
        button.classList.toggle('border-transparent', !active);
        button.classList.toggle('text-gray-500', !active);
    });
};

function applyGlobalConfig(res) {
    const inputs = document.querySelectorAll('#view-kelola-absen input[type="time"]');
    inputs.forEach(el => { el.disabled = false; });
    if (res?.success && res.data) {
        const conf = res.data;
        const setV = (id, val, def) => {
            const el = document.getElementById(id);
            if (el) el.value = val || def;
        };
        setV('conf_wfh_masuk_mulai', conf.wfh_masuk_mulai, '06:00');
        setV('conf_wfh_masuk_akhir', conf.wfh_masuk_akhir, '08:00');
        setV('conf_wfh_pulang_mulai', conf.wfh_pulang_mulai, '15:00');
        setV('conf_wfh_pulang_akhir', conf.wfh_pulang_akhir, '18:00');
        setV('conf_sk_masuk_mulai', conf.seninkamis_masuk_mulai, '06:00');
        setV('conf_sk_masuk_akhir', conf.seninkamis_masuk_akhir, '07:15');
        setV('conf_sk_masuk_batas_akhir', conf.seninkamis_masuk_batas_akhir, '11:00');
        setV('conf_sk_pulang_mulai', conf.seninkamis_pulang_mulai, '15:00');
        setV('conf_sk_pulang_akhir', conf.seninkamis_pulang_akhir, '17:00');
        setV('conf_jum_masuk_mulai', conf.jumat_masuk_mulai, '06:00');
        setV('conf_jum_masuk_akhir', conf.jumat_masuk_akhir, '07:15');
        setV('conf_jum_masuk_batas_akhir', conf.jumat_masuk_batas_akhir, '11:00');
        setV('conf_jum_pulang_mulai', conf.jumat_pulang_mulai, '11:00');
        setV('conf_jum_pulang_akhir', conf.jumat_pulang_akhir, '13:00');
        setV('conf_sab_masuk_mulai', conf.sabtu_masuk_mulai, '06:00');
        setV('conf_sab_masuk_akhir', conf.sabtu_masuk_akhir, '07:15');
        setV('conf_sab_masuk_batas_akhir', conf.sabtu_masuk_batas_akhir, '11:00');
        setV('conf_sab_pulang_mulai', conf.sabtu_pulang_mulai, '12:00');
        setV('conf_sab_pulang_akhir', conf.sabtu_pulang_akhir, '15:00');

        const toggleLiburMinggu = document.getElementById('toggleLiburMinggu');
        const toggleLiburSabtu = document.getElementById('toggleLiburSabtu');
        if (toggleLiburMinggu) toggleLiburMinggu.checked = String(conf.libur_minggu) === 'true';
        if (toggleLiburSabtu) toggleLiburSabtu.checked = String(conf.libur_sabtu) === 'true';

        const todayDay = new Date().getDay();
        if (todayDay === 5) switchWaktuTab('jumat');
        else if (todayDay === 6) switchWaktuTab('sabtu');
        else switchWaktuTab('seninkamis');
    }
}

window.handleWeekendToggle = function (event) {
    const isMinggu = document.getElementById('toggleLiburMinggu').checked;
    const isSabtu = document.getElementById('toggleLiburSabtu').checked;

    // Jika event berasal dari interaksi user
    if (event && event.target) {
        if (event.target.id === 'toggleLiburSabtu' && isSabtu) {
            document.getElementById('toggleLiburMinggu').checked = true;
        }
        if (event.target.id === 'toggleLiburMinggu' && !isMinggu) {
            document.getElementById('toggleLiburSabtu').checked = false;
        }
    }

    // Perubahan hanya disimpan setelah tombol utama ditekan.
}

window.switchWaktuTab = function (tab) {
    const tabs = ['seninkamis', 'jumat', 'sabtu'];
    tabs.forEach(t => {
        const panel = document.getElementById('panel-' + t);
        const btn = document.getElementById('tab-' + t);
        if (!panel || !btn) return;
        const isActive = (t === tab);
        panel.classList.toggle('hidden', !isActive);
        btn.classList.toggle('text-indigo-600', isActive);
        btn.classList.toggle('border-indigo-600', isActive);
        btn.classList.toggle('bg-indigo-50/40', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('border-transparent', !isActive);
    });
}

function collectGlobalConfig() {
    const getV = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
    return {
        // Config WFH
        wfh_masuk_mulai: getV('conf_wfh_masuk_mulai', '06:00'),
        wfh_masuk_akhir: getV('conf_wfh_masuk_akhir', '08:00'),
        wfh_pulang_mulai: getV('conf_wfh_pulang_mulai', '15:00'),
        wfh_pulang_akhir: getV('conf_wfh_pulang_akhir', '18:00'),
        libur_minggu: document.getElementById('toggleLiburMinggu').checked ? 'true' : 'false',
        libur_sabtu: document.getElementById('toggleLiburSabtu').checked ? 'true' : 'false',
        // Config per kelompok hari (Tatap Muka)
        seninkamis_masuk_mulai: getV('conf_sk_masuk_mulai', '06:00'),
        seninkamis_masuk_akhir: getV('conf_sk_masuk_akhir', '07:15'),
        seninkamis_masuk_batas_akhir: getV('conf_sk_masuk_batas_akhir', '11:00'),
        seninkamis_pulang_mulai: getV('conf_sk_pulang_mulai', '15:00'),
        seninkamis_pulang_akhir: getV('conf_sk_pulang_akhir', '17:00'),
        jumat_masuk_mulai: getV('conf_jum_masuk_mulai', '06:00'),
        jumat_masuk_akhir: getV('conf_jum_masuk_akhir', '07:15'),
        jumat_masuk_batas_akhir: getV('conf_jum_masuk_batas_akhir', '11:00'),
        jumat_pulang_mulai: getV('conf_jum_pulang_mulai', '11:00'),
        jumat_pulang_akhir: getV('conf_jum_pulang_akhir', '13:00'),
        sabtu_masuk_mulai: getV('conf_sab_masuk_mulai', '06:00'),
        sabtu_masuk_akhir: getV('conf_sab_masuk_akhir', '07:15'),
        sabtu_masuk_batas_akhir: getV('conf_sab_masuk_batas_akhir', '11:00'),
        sabtu_pulang_mulai: getV('conf_sab_pulang_mulai', '12:00'),
        sabtu_pulang_akhir: getV('conf_sab_pulang_akhir', '15:00')
    };
}

async function saveGlobalConfig(btnElement, silent = false) {
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';

    try {
        const res = await fetchAPI('saveAppConfig', { newConfig: collectGlobalConfig() });
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
        if (res.success) {
            if (!silent) {
                try {
                    const statusHari = await fetchAPI('cekWFHToday');
                    if (statusHari) window.appStatusHari = statusHari;
                } catch (error) {
                    console.warn('Konfigurasi tersimpan, tetapi status hari belum dapat diperbarui:', error);
                }
            }
            if (!silent) showAlert('success', 'Pengaturan waktu berhasil disimpan!');
            return true;
        } else {
            showAlert('error', res?.message || 'Pengaturan waktu gagal disimpan.');
            return false;
        }
    } catch (err) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
        showAlert('error', 'Gagal koneksi: ' + err);
        return false;
    }
}

async function saveScheduleSection(btnElement, formId, successMessage) {
    if (btnElement.disabled) return;
    const form = document.getElementById(formId);
    const date = form?.elements.tanggal?.value || '';
    const note = form?.elements.keterangan?.value.trim() || '';
    if ((date && !note) || (!date && note)) {
        showAlert('warning', 'Isi tanggal dan keterangan secara lengkap, atau kosongkan keduanya.');
        return;
    }
    const type = formId === 'formTambahLibur' ? 'libur' : 'wfh';
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    try {
        const drafts = [...pendingScheduleDrafts[type]];
        if (date && note) drafts.push({ tanggal: date, keterangan: note });
        const res = await fetchAPI('saveScheduleWithConfig', {
            newConfig: collectGlobalConfig(),
            scheduleType: type,
            drafts
        });
        if (!res?.success) {
            const message = res?.message || 'Jadwal gagal disimpan.';
            showAlert(res?.configSaved ? 'warning' : 'error', res?.configSaved
                ? `Waktu berhasil disimpan, tetapi jadwal tidak ditambahkan: ${message}`
                : message);
            return;
        }
        pendingScheduleDrafts[type].length = 0;
        if (date && note) form.reset();
        showAlert('success', successMessage);
        void loadKelolaAbsen();
    } catch (error) {
        console.error('Gagal menyimpan jadwal:', error);
        showAlert('error', 'Jadwal gagal disimpan: ' + (error.message || error));
    } finally {
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
    }
}

function focusScheduleForm(formId) {
    const form = document.getElementById(formId);
    const dateInput = form?.elements.tanggal;
    if (dateInput) dateInput.focus();
}

async function saveSchoolSection(btnElement) {
    return saveScheduleSection(btnElement, 'formTambahLibur', 'Waktu sekolah dan hari libur berhasil disimpan.');
}

async function saveWfhSection(btnElement) {
    return saveScheduleSection(btnElement, 'formTambahWfh', 'Waktu WFH dan jadwal WFH berhasil disimpan.');
}

window.saveSchoolSection = saveSchoolSection;
window.saveWfhSection = saveWfhSection;
window.focusScheduleForm = focusScheduleForm;

function renderLiburRows(data, startIdx) {
    const tbody = document.getElementById('tbody-libur');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 italic">Tidak ada jadwal libur.</td></tr>';
        return;
    }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    tbody.innerHTML = data.map((item, i) => `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-4 text-center text-gray-500">${startIdx + i + 1}</td>
            <td class="p-4 font-mono font-medium text-indigo-700">${new Date(item.tanggal).toLocaleDateString('id-ID', options)}</td>
            <td class="p-4 font-bold text-gray-700">${item.keterangan}</td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                    <button onclick="editLibur('${item.tanggal}', '${item.keterangan}')" class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteLiburConfirm('${item.tanggal}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

function editLibur(tgl, ket) {
    showModal(createLiburModal({ tanggal: tgl, keterangan: ket }));
}

function createLiburModal(data) {
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-all mb-4";
    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-fade-in">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-calendar-day"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Edit Hari Libur</h3>
            <p class="text-xs text-gray-500 mt-1">Perbarui tanggal atau keterangan</p>
        </div>
        <form onsubmit="saveUpdateLibur(event)">
            <input type="hidden" name="oldDate" value="${data.tanggal}">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Tanggal</label>
            <input type="date" name="newDate" value="${data.tanggal}" required class="${inputClass}">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Keterangan</label>
            <input type="text" name="newKeterangan" value="${data.keterangan}" required class="${inputClass}">
            <div class="flex gap-3 mt-4">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" id="btnSaveLibur" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">Simpan Perubahan</button>
            </div>
        </form>
    </div>`;
}

async function saveUpdateLibur(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveLibur');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    showLoading();

    const fd = new FormData(e.target);
    try {
        const res = await fetchAPI('updateHariLibur', {
            oldDate: fd.get('oldDate'),
            newDate: fd.get('newDate'),
            newKeterangan: fd.get('newKeterangan')
        });
        hideLoading();
        btn.disabled = false;
        btn.innerHTML = originalText;

        if (res.success) {
            closeModal();
            loadKelolaAbsen();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (error) {
        hideLoading();
        btn.disabled = false;
        btn.innerHTML = originalText;
        showAlert('error', 'Gagal: ' + error);
    }
}

async function handleAddLibur(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    pendingScheduleDrafts.libur.push({ tanggal: fd.get('tanggal'), keterangan: String(fd.get('keterangan') || '').trim() });
    e.target.reset();
    renderLiburRows([...tableState.libur.fullData, ...pendingScheduleDrafts.libur], 0);
}

async function deleteLiburConfirm(tgl) {
    if(window.Swal) {
        Swal.fire({
            title: 'Hapus hari libur ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                processDeleteLibur(tgl);
            }
        });
    } else {
        if (confirm('Hapus hari libur ini?')) {
            processDeleteLibur(tgl);
        }
    }
}

async function processDeleteLibur(tgl) {
    showLoading();
    try {
        await fetchAPI('deleteHariLibur', { tanggal: tgl });
        hideLoading();
        loadKelolaAbsen();
        showAlert('success', 'Jadwal libur dihapus');
    } catch (e) { 
        hideLoading();
    }
}

function renderWfhRows(data, startIdx) {
    const tbody = document.getElementById('tbody-wfh');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 italic">Tidak ada jadwal WFH terdaftar.</td></tr>';
        return;
    }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    tbody.innerHTML = data.map((item, i) => `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-4 text-center text-gray-500">${startIdx + i + 1}</td>
            <td class="p-4 font-mono font-medium text-indigo-700">${new Date(item.tanggal).toLocaleDateString('id-ID', options)}</td>
            <td class="p-4 font-bold text-gray-700">${item.keterangan}</td>
            <td class="p-4 text-center"><button onclick="deleteWfhConfirm('${item.tanggal}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition opacity-80 group-hover:opacity-100"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('');
}

async function handleAddWfh(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    pendingScheduleDrafts.wfh.push({ tanggal: fd.get('tanggal'), keterangan: String(fd.get('keterangan') || '').trim() });
    e.target.reset();
    renderWfhRows([...tableState.wfh.fullData, ...pendingScheduleDrafts.wfh], 0);
}

async function deleteWfhConfirm(tgl) {
    if(window.Swal) {
        Swal.fire({
            title: 'Hapus jadwal WFH ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                processDeleteWfh(tgl);
            }
        });
    } else {
        if (confirm('Hapus jadwal WFH ini?')) {
            processDeleteWfh(tgl);
        }
    }
}

async function processDeleteWfh(tgl) {
    showLoading();
    try {
        await fetchAPI('deleteJadwalWFH', { tanggal: tgl });
        hideLoading(); 
        loadKelolaAbsen(); 
        showAlert('success', 'Jadwal WFH dihapus');
    } catch (e) { 
        hideLoading();
    }
}
