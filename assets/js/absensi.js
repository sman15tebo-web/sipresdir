// ============================================================
// LOGIKA SCANNER PRESENSI
// ============================================================
let html5QrCode = null;
let isScanning = false;

function loadScanAbsensi() {
    if (window.appStatusHari && window.appStatusHari.isLibur) {
        Swal.fire({
            icon: 'error',
            title: 'Hari Libur',
            text: 'Saat ini adalah hari libur (' + window.appStatusHari.keterangan + '). Anda tidak dapat merekam presensi.',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }

    isScanning = false;
    setActiveMenu('Scan Presensi');
    showView('view-scanner');
    setTimeout(() => { startCamera('environment'); }, 500);
}

function startCamera(mode) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            initCamera(mode);
        }).catch(err => initCamera(mode));
    } else {
        initCamera(mode);
    }
}

function initCamera(mode) {
    const loading = document.getElementById('camLoading');
    loading.classList.remove('hidden');

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => onScanSuccess(decodedText),
        (errorMessage) => { }
    ).then(() => {
        loading.classList.add('hidden');
        isScanning = false;
    }).catch((err) => {
        loading.classList.add('hidden');
        const resDiv = document.getElementById('scanResult');
        resDiv.classList.remove('hidden');
        resDiv.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-sm">Gagal Mengakses Kamera: ${err}</div>`;
    });
}

async function onScanSuccess(decodedText) {
    if (!decodedText || decodedText.trim() === "" || decodedText === "undefined") return;
    if (isScanning) return;
    isScanning = true;

    playScanSound();

    const resultDiv = document.getElementById('scanResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `<div class="bg-indigo-50 text-indigo-700 p-4 rounded-xl border border-indigo-100 flex items-center justify-center animate-pulse font-bold shadow-sm"><i class="fas fa-circle-notch fa-spin mr-3"></i> Memproses Data...</div>`;

    const myRole = currentUser ? currentUser.role : '';
    const myKelas = currentUser ? currentUser.kelas : '';

    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        // --- MENGGUNAKAN API GOOGLE APPS SCRIPT ---
        const result = await fetchAPI('scanAbsensi', {
            nisn: decodedText,
            role: myRole,
            kelasGuru: myKelas,
            token: currentUser ? currentUser.token : null,
            clientDate: `${yyyy}-${mm}-${dd}`,
            clientTime: `${hh}:${min}:${ss}`
        });

        if (result.success) {
            const color = result.type === 'datang' ? 'green' : 'blue';
            resultDiv.innerHTML = `<div class="bg-${color}-50 text-${color}-900 p-6 rounded-2xl border border-${color}-100 shadow-md animate-fade-in relative overflow-hidden"><div class="absolute top-0 right-0 p-4 opacity-10"><i class="fas fa-check-circle text-6xl"></i></div><h3 class="font-bold text-xl uppercase mb-1 tracking-tight">${result.nama || "Siswa"}</h3><p class="text-sm font-semibold opacity-70 mb-4">${result.kelas || ""}</p><div class="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-${color}-200 inline-block"><div class="text-xs uppercase tracking-widest font-bold opacity-60 mb-1">${result.message}</div><div class="text-3xl font-mono font-bold">${result.type === 'datang' ? result.jamDatang : result.jamPulang}</div></div><p class="text-xs mt-4 font-bold uppercase tracking-wide opacity-50 animate-pulse">Siap untuk siswa berikutnya...</p></div>`;
            setTimeout(() => { isScanning = false; }, 3000);
        } else {
            resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center space-x-4"><div class="bg-red-100 p-3 rounded-full"><i class="fas fa-times text-xl"></i></div><div class="text-left"><h4 class="font-bold">Gagal!</h4><p class="text-sm opacity-90">${result.message}</p></div></div>`;
            setTimeout(() => { isScanning = false; }, 4000);
        }
    } catch (err) {
        resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center space-x-4"><div class="bg-red-100 p-3 rounded-full"><i class="fas fa-times text-xl"></i></div><div class="text-left"><h4 class="font-bold">Error Koneksi!</h4><p class="text-sm opacity-90">Gagal terhubung ke server.</p></div></div>`;
        setTimeout(() => { isScanning = false; }, 4000);
    }
}

function playScanSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') { ctx.resume(); }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "square";
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.15;

        oscillator.start();
        setTimeout(() => { oscillator.stop(); ctx.close(); }, 150);
    } catch (e) { console.error("Audio error: " + e); }
}

function stopAndBack(redirect = true) {
    if (html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
                isScanning = false;
                if (redirect && currentUser) returnToDashboard();
            }).catch(() => {
                try { html5QrCode.clear(); } catch (e) { }
                html5QrCode = null;
                isScanning = false;
                if (redirect && currentUser) returnToDashboard();
            });
        } catch (e) {
            try { html5QrCode.clear(); } catch (err) { }
            html5QrCode = null;
            isScanning = false;
            if (redirect && currentUser) returnToDashboard();
        }
    }
    else if (redirect && currentUser) returnToDashboard();
}

function returnToDashboard() {
    if (currentUser.role === 'admin') loadAdminDashboard();
    else if (currentUser.role === 'guru') loadGuruDashboard();
    else loadSiswaDashboard();
}

// ============================================================
// LOGIKA MONITORING REALTIME
// ============================================================
async function loadMonitoringAbsensi(forceDate = false) {
    stopAndBack(false);
    if (currentUser && currentUser.role === 'admin') setActiveMenu('Kelola Presensi');
    else setActiveMenu('Monitoring');
    showView('view-monitoring');
    document.querySelectorAll('.tab-presensi-monitoring').forEach(tabMon => {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'guru')) {
            tabMon.classList.remove('hidden');
        } else {
            tabMon.classList.add('hidden');
        }
    });

    let targetDate = null;
    let textDate = new Date();
    
    if (forceDate) {
        targetDate = document.getElementById('tgl_export_harian').value;
        if (!targetDate) {
            showAlert('error', 'Pilih tanggal terlebih dahulu!');
            return;
        }
        textDate = new Date(targetDate);
    }
    
    document.getElementById('monitoringDate').textContent = textDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const myClass = (currentUser && currentUser.role === 'guru') ? currentUser.kelas : null;

    const dropdown = document.getElementById('filterKelasMonitoring');
    if (dropdown && typeof existingClasses !== 'undefined' && existingClasses.length > 0) {
        if (myClass && myClass !== 'undefined' && myClass !== 'Semua Kelas' && myClass !== '') {
            dropdown.innerHTML = `<option value="${myClass}">${myClass}</option>`;
            dropdown.value = myClass;
        } else {
            const currentValue = dropdown.value;
            let options = '<option value="">Semua Kelas</option>';
            existingClasses.forEach(kelas => {
                options += `<option value="${kelas}">${kelas}</option>`;
            });
            dropdown.innerHTML = options;
            if (currentValue) dropdown.value = currentValue;
        }
    }

    if (tableState.monitoring.fullData.length > 0 && !forceDate) {
        processTableData('monitoring');
    } else {
        document.getElementById('tbody-monitoring').innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
        try {
            const result = await fetchAPI('getMonitoringRealtime', { filterKelas: myClass, filterTanggal: targetDate });
            if (result.success) {
                if(result.isLibur) {
                    tableState.monitoring.fullData = [];
                    processTableData('monitoring');
                    document.getElementById('tbody-monitoring').innerHTML = `<tr><td colspan="8" class="p-12 text-center font-bold text-rose-500 bg-white"><i class="fas fa-calendar-times mb-2 text-2xl"></i><br>${result.message}</td></tr>`;
                } else {
                    tableState.monitoring.fullData = result.data;
                    processTableData('monitoring');
                }
            } else {
                document.getElementById('tbody-monitoring').innerHTML = '<tr><td colspan="8" class="p-12 text-center text-gray-400 italic bg-white">Data tidak ditemukan.</td></tr>';
            }
        } catch (e) { }
    }
}

function renderMonitoringRows(data, startIdx) {
    const tbody = document.getElementById('tbody-monitoring');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-12 text-center text-gray-400 italic bg-white">Tidak ada data ditemukan.</td></tr>';
        return;
    }

    const canEdit = currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin');
    const cursorClass = canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70';
    const disabledAttr = canEdit ? '' : 'disabled';

    const monitorDate = document.getElementById('tgl_export_harian') ? document.getElementById('tgl_export_harian').value : "";
    const targetDate = monitorDate || new Date().toISOString().slice(0, 10);

    tbody.innerHTML = data.map((d, i) => {
        let statusColor = 'bg-gray-100 text-gray-600';
        if (d.status === 'Hadir') statusColor = 'bg-green-100 text-green-700';
        else if (d.status === 'Izin') statusColor = 'bg-blue-100 text-blue-700';
        else if (d.status === 'Sakit') statusColor = 'bg-yellow-100 text-yellow-700';
        else if (d.status === 'Alpa') statusColor = 'bg-red-100 text-red-700';

        let rawKet = String(d.keterangan || "-");
        let ketHtml = ``;
        let buktiHtml = `<div class="w-28 text-center text-gray-400 font-mono text-[9px]">-</div>`;

        if (rawKet.includes("Maps:") && rawKet.includes("Foto:")) {
            const wfhSessions = rawKet.split('||');
            ketHtml = `<div class="flex flex-col items-start gap-1">`;

            wfhSessions.forEach(session => {
                const parts = session.split('|');
                let mapsLink = "", fotoLink = "", statusWfh = "";

                parts.forEach(p => {
                    if (p.includes("Maps:")) mapsLink = p.replace('Maps:', '').trim();
                    else if (p.includes("Foto:")) fotoLink = p.replace('Foto:', '').trim();
                    else if (p.trim() !== "" && !p.includes("Akurasi:") && !p.includes("[LAT:")) statusWfh = p.trim();
                });
                statusWfh = statusWfh.replace(/\[LAT:.*\]/, '').trim();

                let badgeHtml = statusWfh.includes("Terlambat")
                    ? `<div class="w-28 shrink-0"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-history"></i> ${statusWfh}</span></div>`
                    : `<div class="w-28 shrink-0"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-check-double"></i> ${statusWfh}</span></div>`;

                ketHtml += `
                <div class="flex flex-nowrap items-center gap-2 p-1 bg-gray-50 rounded-lg w-max">
                    ${badgeHtml}
                    <div class="flex flex-nowrap items-center gap-1">
                        <a href="${fotoLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Foto</a>
                        <a href="${mapsLink}" target="_blank" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-map-marker-alt"></i> Map</a>
                        ${canEdit ? `<button onclick="hapusBuktiAbsen('${d.nisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            });
            ketHtml += `</div>`;
        }
        else if (rawKet.includes("Surat:")) {
            let suratLink = rawKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">Via Sistem</span></div>`;
            buktiHtml = `
            <div class="flex flex-nowrap items-center justify-center gap-1 w-max mx-auto p-1">
                <a href="${suratLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-file-medical"></i> Lihat Surat</a>
                ${canEdit ? `<button onclick="hapusBuktiAbsen('${d.nisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap"><i class="fas fa-trash"></i></button>` : ''}
            </div>`;
        }
        else if (rawKet.includes("Terlambat")) { ketHtml = `<div class="w-28"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate"><i class="fas fa-history mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet.includes("Pulang Cepat")) { ketHtml = `<div class="w-28"><span class="block text-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[9px] truncate"><i class="fas fa-running mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet === "Tepat Waktu") { ketHtml = `<div class="w-28"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate"><i class="fas fa-check-double mr-1"></i>${rawKet}</span></div>`; }
        else { ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">${rawKet}</span></div>`; }

        return `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-2 text-center text-gray-400 text-[10px]">${startIdx + i + 1}</td>
            <td class="p-2 whitespace-nowrap min-w-[120px] sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div class="font-bold text-xs text-gray-900 break-words leading-tight line-clamp-2 max-w-[150px] whitespace-normal" title="${d.nama}">${d.nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${d.nisn}</div>
            </td>
            <td class="p-2 text-center"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-bold border border-indigo-100">${d.kelas}</span></td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jam_datang || '-'}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jam_pulang || '-'}</td>
            <td class="p-2 align-middle">${ketHtml}</td>
            <td class="p-2 text-center relative">
                <select onchange="changeStatus('${d.nisn}', '${d.nama.replace(/'/g, "\\'")}', '${d.kelas}', '${targetDate}', this)" class="text-[9px] font-bold py-1 px-1 rounded border-0 focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none text-center w-24 ${statusColor} ${cursorClass}" ${disabledAttr}>
                    <option value="Belum Absen" ${d.status === 'Belum Absen' ? 'selected' : ''}>Belum Absen</option>
                    <option value="Hadir" ${d.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                    <option value="Izin" ${d.status === 'Izin' ? 'selected' : ''}>Izin</option>
                    <option value="Sakit" ${d.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                    <option value="Alpa" ${d.status === 'Alpa' ? 'selected' : ''}>Alpa</option>
                </select>
                ${canEdit ? '<i class="fas fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-[8px] pointer-events-none opacity-40"></i>' : ''}
            </td>
            <td class="p-2 align-middle text-center">${buktiHtml}</td>
        </tr>`;
    }).join('');
}

async function changeStatus(nisn, nama, kelas, tanggal, selectElement) {
    if (window.appStatusHari && window.appStatusHari.isLibur) {
        Swal.fire({
            icon: 'error',
            title: 'Hari Libur',
            text: 'Saat ini adalah hari libur (' + window.appStatusHari.keterangan + '). Anda tidak dapat mengubah kehadiran secara manual.',
            confirmButtonColor: '#4f46e5'
        });
        // Reset select back to original value (which is likely "Belum Absen")
        loadMonitoringAbsensi();
        return;
    }

    const newStatus = selectElement.value;
    selectElement.disabled = true;
    selectElement.style.opacity = '0.5';
    const token = currentUser ? currentUser.token : null;

    let targetDate = document.getElementById('tgl_export_harian') ? document.getElementById('tgl_export_harian').value : null;

    try {
        const res = await fetchAPI('updateAbsensiStatus', { token: token, nisn: nisn, nama: nama, kelas: kelas, tanggal: targetDate, newStatus: newStatus });
        selectElement.disabled = false;
        selectElement.style.opacity = '1';

        if (res.success) {
            let newColor = 'bg-gray-100 text-gray-600';
            if (newStatus === 'Hadir') newColor = 'bg-green-100 text-green-700';
            else if (newStatus === 'Izin') newColor = 'bg-blue-100 text-blue-700';
            else if (newStatus === 'Sakit') newColor = 'bg-yellow-100 text-yellow-700';
            else if (newStatus === 'Alpa') newColor = 'bg-red-100 text-red-700';

            selectElement.className = `text-xs font-bold py-1.5 px-2 rounded-lg border-0 focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none text-center w-32 cursor-pointer ${newColor}`;
        } else {
            showAlert('error', 'Gagal update: ' + res.message);
            loadMonitoringAbsensi();
        }
    } catch (error) {
        selectElement.disabled = false;
        selectElement.style.opacity = '1';
        showAlert('error', 'Error koneksi: ' + error);
    }
}

// ============================================================
// LOGIKA REKAP ABSENSI & CETAK EXCEL/PDF (GURU/ADMIN)
// ============================================================
function loadRekapAbsensi() {
    stopAndBack(false);
    if (currentUser && currentUser.role === 'admin') setActiveMenu('Kelola Presensi');
    else setActiveMenu('Monitoring');
    showView('view-rekap-absensi');
    document.getElementById('rekapEmptyState').classList.remove('hidden');
    document.querySelectorAll('.tab-presensi-monitoring').forEach(tabMon => {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'guru')) {
            tabMon.classList.remove('hidden');
        } else {
            tabMon.classList.add('hidden');
        }
    });
    document.getElementById('rekapContainer').classList.add('hidden');
    document.getElementById('rekapLoading').classList.add('hidden');
    tableState.rekap.fullData = [];

    const myClass = (currentUser && currentUser.role === 'guru') ? currentUser.kelas : null;

    const selectKelas = document.getElementById('fKelasRekap');
    if (selectKelas) {
        if (myClass && myClass !== 'undefined' && myClass !== 'Semua Kelas' && myClass !== '') {
            selectKelas.innerHTML = `<option value="${myClass}">${myClass}</option>`;
            selectKelas.value = myClass;
        } else {
            selectKelas.innerHTML = '<option value="">Semua Kelas</option>';
            if (existingClasses && existingClasses.length > 0) {
                existingClasses.forEach(kelas => {
                    const option = document.createElement('option');
                    option.value = kelas;
                    option.textContent = kelas;
                    selectKelas.appendChild(option);
                });
            }
        }
    }
}

async function applyFilter() {
    const emptyState = document.getElementById('rekapEmptyState');
    const container = document.getElementById('rekapContainer');
    const loading = document.getElementById('rekapLoading');

    emptyState.classList.add('hidden');
    container.classList.add('hidden');
    loading.classList.remove('hidden');

    const filter = {
        tanggalMulai: document.getElementById('fStart').value,
        tanggalAkhir: document.getElementById('fEnd').value,
        kelas: document.getElementById('fKelasRekap').value
    };

    try {
        const result = await fetchAPI('getAbsensiList', { filter: filter });
        loading.classList.add('hidden');
        container.classList.remove('hidden');

        if (result.success) {
            tableState.rekap.fullData = result.data;
            processTableData('rekap');
        } else {
            tableState.rekap.fullData = [];
            processTableData('rekap');
        }
    } catch (err) {
        loading.classList.add('hidden');
        container.classList.remove('hidden');
    }
}

function renderRekapRows(data) {
    const tbody = document.getElementById('tbody-rekap');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">Tidak ada data ditemukan.</td></tr>';
        return;
    }

    const canEdit = currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin');

    const getStatusColor = (status) => {
        if (status === 'Hadir') return 'bg-green-100 text-green-700';
        if (status === 'Izin') return 'bg-blue-100 text-blue-700';
        if (status === 'Sakit') return 'bg-yellow-100 text-yellow-700';
        if (status === 'Alpa') return 'bg-red-100 text-red-700';
        return 'bg-gray-100 text-gray-600';
    };

    tbody.innerHTML = data.map((d, i) => {
        let rawKet = String(d.keterangan || "-");
        let ketHtml = ``;
        let targetDate = d.tanggal;

        if (rawKet.includes("Maps:") && rawKet.includes("Foto:")) {
            const wfhSessions = rawKet.split('||');
            ketHtml = `<div class="flex flex-col items-start gap-1">`;

            wfhSessions.forEach(session => {
                const parts = session.split('|');
                let mapsLink = "", fotoLink = "", statusWfh = "";

                parts.forEach(p => {
                    if (p.includes("Maps:")) mapsLink = p.replace('Maps:', '').trim();
                    else if (p.includes("Foto:")) fotoLink = p.replace('Foto:', '').trim();
                    else if (p.trim() !== "" && !p.includes("Akurasi:") && !p.includes("[LAT:")) statusWfh = p.trim();
                });
                statusWfh = statusWfh.replace(/\[LAT:.*\]/, '').trim();

                let badgeHtml = statusWfh.includes("Terlambat")
                    ? `<div class="w-28 shrink-0"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-history"></i> ${statusWfh}</span></div>`
                    : `<div class="w-28 shrink-0"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-check-double"></i> ${statusWfh}</span></div>`;

                ketHtml += `
                <div class="flex flex-nowrap items-center gap-2 p-1 bg-gray-50 rounded-lg w-max">
                    ${badgeHtml}
                    <div class="flex flex-nowrap items-center gap-1">
                        <a href="${fotoLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Foto</a>
                        <a href="${mapsLink}" target="_blank" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-map-marker-alt"></i> Map</a>
                        ${canEdit ? `<button onclick="hapusBuktiAbsen('${d.nisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            });
            ketHtml += `</div>`;
        }
        else if (rawKet.includes("Surat:")) {
            let suratLink = rawKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            ketHtml = `
            <div class="flex flex-nowrap items-center gap-1 w-max p-1">
                <a href="${suratLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-file-medical"></i> Lihat Surat</a>
                ${canEdit ? `<button onclick="hapusBuktiAbsen('${d.nisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap"><i class="fas fa-trash"></i></button>` : ''}
            </div>`;
        }
        else if (rawKet.includes("Terlambat")) { ketHtml = `<div class="w-28"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate"><i class="fas fa-history mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet.includes("Pulang Cepat")) { ketHtml = `<div class="w-28"><span class="block text-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[9px] truncate"><i class="fas fa-running mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet === "Tepat Waktu") { ketHtml = `<div class="w-28"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate"><i class="fas fa-check-double mr-1"></i>${rawKet}</span></div>`; }
        else { ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">${rawKet}</span></div>`; }

        return `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-2 text-center text-gray-400 text-[10px]">${i + 1}</td>
            <td class="p-2 text-[10px] text-gray-600 whitespace-nowrap">${new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td class="p-2 whitespace-nowrap min-w-[120px]">
                <div class="font-bold text-xs text-gray-900 break-words leading-tight line-clamp-2 max-w-[150px] whitespace-normal" title="${d.nama}">${d.nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${d.nisn}</div>
            </td>
            <td class="p-2 text-center"><span class="bg-gray-100 px-2 py-1 rounded text-[9px] font-bold">${d.kelas}</span></td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jam_datang || '-'}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jam_pulang || '-'}</td>
            <td class="p-2 align-middle">${ketHtml}</td>
            <td class="p-2 text-center"><span class="${getStatusColor(d.status)} px-2 py-1 rounded text-[9px] font-bold">${d.status || 'Hadir'}</span></td>
        </tr>`;
    }).join('');
}

async function exportToExcel() {
    const data = tableState.rekap.filtered;
    if (!data || data.length === 0) {
        showAlert('error', 'Tidak ada data untuk di-export.');
        return;
    }

    const btn = document.getElementById('btnExportExcel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Proses...';

    try {
        if (typeof ExcelJS === 'undefined') {
            showAlert('error', 'Library ExcelJS belum termuat!');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Rekap Absensi`);

        worksheet.mergeCells('A1:I1');
        const titleCell1 = worksheet.getCell('A1');
        titleCell1.value = `REKAPITULASI ABSENSI SISWA`;
        titleCell1.font = { size: 14, bold: true };
        titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };

        let headers = ["No", "Tanggal", "NISN", "Nama Siswa", "Kelas", "Jam Datang", "Jam Pulang", "Keterangan", "Status"];
        const headerRow = worksheet.getRow(3);
        headerRow.values = headers;

        worksheet.columns = [
            { width: 5 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 10 },
            { width: 15 }, { width: 15 }, { width: 25 }, { width: 15 }
        ];

        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        data.forEach((row, index) => {
            const r = worksheet.addRow([
                index + 1,
                new Date(row.tanggal).toLocaleDateString('id-ID'),
                row.nisn,
                row.nama,
                row.kelas,
                row.jamDatang,
                row.jamPulang,
                row.keterangan,
                row.status
            ]);

            r.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colNumber !== 4 && colNumber !== 8) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Rekap_Absensi_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showAlert('success', 'File berhasil diunduh!');
    } catch (error) {
        showAlert('error', 'Gagal membuat file Excel.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function showMatrixModal() {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const curMonth = new Date().getMonth();
    const curYear = new Date().getFullYear();
    let monthOpts = '';

    monthNames.forEach((m, i) => {
        monthOpts += `<option value="${i + 1}" ${i === curMonth ? 'selected' : ''}>${m}</option>`;
    });

    let classOpts = '<option value="">Semua Kelas</option>';
    let isLocked = false;

    if (currentUser.role === 'guru' && currentUser.kelas) {
        classOpts = `<option value="${currentUser.kelas}" selected>${currentUser.kelas}</option>`;
        isLocked = true;
    } else {
        if (existingClasses) {
            existingClasses.forEach(c => classOpts += `<option value="${c}">${c}</option>`);
        }
    }

    const content = `
    <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full animate-fade-in relative">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400"><i class="fas fa-times"></i></button>
        <h3 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-th text-purple-600"></i> Laporan Jurnal Bulanan</h3>
        <div class="space-y-3">
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Bulan</label>
                <select id="mat_bulan" class="w-full border-gray-300 rounded-lg text-sm p-2 bg-gray-50">${monthOpts}</select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tahun</label>
                <input type="number" id="mat_tahun" value="${curYear}" class="w-full border-gray-300 rounded-lg text-sm p-2 bg-gray-50">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas</label>
                <select id="mat_kelas" class="w-full border-gray-300 rounded-lg text-sm p-2 bg-gray-50 ${isLocked ? 'cursor-not-allowed opacity-70' : ''}" ${isLocked ? 'disabled' : ''}>${classOpts}</select>
            </div>
        </div>
        <button onclick="processMatrixExport(event)" class="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition"><i class="fas fa-file-excel mr-2"></i> Download Excel</button>
    </div>`;
    showModal(content);
}

async function processMatrixExport(event) {
    const bulan = document.getElementById('mat_bulan').value;
    const tahun = document.getElementById('mat_tahun').value;
    let kelas = document.getElementById('mat_kelas').value;
    if (currentUser.role === 'guru' && currentUser.kelas) kelas = currentUser.kelas;

    const btn = event.currentTarget;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil Data...';
    btn.disabled = true;

    try {
        const res = await fetchAPI('getRekapMatrix', { bulan: bulan, tahun: tahun, filterKelas: kelas });
        closeModal();
        if (!res.success) { showAlert('error', res.message); return; }

        const data = res.data;
        const days = res.days;

        if (typeof ExcelJS === 'undefined') {
            showAlert('error', 'Library ExcelJS belum termuat!');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Jurnal Bulanan`);

        const bulanNama = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const namaBulan = bulanNama[parseInt(bulan)];

        const totalCols = 4 + days + 4; // 4 awal + days + 4 (H,S,I,A)
        worksheet.mergeCells(1, 1, 1, totalCols);
        const titleCell1 = worksheet.getCell('A1');
        titleCell1.value = `REKAPITULASI JURNAL KEHADIRAN BULANAN SISWA`;
        titleCell1.font = { size: 14, bold: true };
        titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.mergeCells(2, 1, 2, totalCols);
        const titleCell2 = worksheet.getCell('A2');
        titleCell2.value = `PERIODE: ${namaBulan.toUpperCase()} ${tahun} | KELAS: ${kelas ? kelas.toUpperCase() : 'SEMUA KELAS'}`;
        titleCell2.font = { size: 12, bold: true };
        titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };

        let topHeader = ["No", "NISN", "Nama Siswa", "Kelas"];
        let bottomHeader = ["", "", "", ""];

        topHeader.push("TANGGAL");
        for (let i = 1; i <= days; i++) {
            if (i > 1) topHeader.push(""); // isi kosong untuk sel yang akan dimerge
            bottomHeader.push(String(i));
        }

        topHeader.push("JUMLAH", "", "", ""); // H, S, I, A
        bottomHeader.push("H", "S", "I", "A");

        const row4 = worksheet.getRow(4);
        row4.values = topHeader;

        const row5 = worksheet.getRow(5);
        row5.values = bottomHeader;

        // Merge untuk Header Kolom No, NISN, Nama, Kelas (Baris 4 ke 5)
        worksheet.mergeCells(4, 1, 5, 1);
        worksheet.mergeCells(4, 2, 5, 2);
        worksheet.mergeCells(4, 3, 5, 3);
        worksheet.mergeCells(4, 4, 5, 4);

        // Merge untuk TANGGAL
        worksheet.mergeCells(4, 5, 4, 4 + days);

        // Merge untuk JUMLAH
        worksheet.mergeCells(4, 5 + days, 4, 8 + days);

        let cols = [
            { width: 5 }, { width: 15 }, { width: 35 }, { width: 12 }
        ];
        for (let i = 1; i <= days; i++) cols.push({ width: 4 });
        cols.push({ width: 5 }, { width: 5 }, { width: 5 }, { width: 5 });
        worksheet.columns = cols;

        [row4, row5].forEach(row => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= totalCols) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
                    cell.font = { bold: true };
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        data.forEach((row, idx) => {
            let rowData = [idx + 1, row.nisn, row.nama, row.kelas];
            row.kehadiran.forEach(s => rowData.push(s));
            rowData.push(row.stats.H, row.stats.S, row.stats.I, row.stats.A);

            const r = worksheet.addRow(rowData);
            r.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colNumber > 4 || colNumber === 1) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Jurnal_Absensi_${kelas || 'Semua'}_${namaBulan}_${tahun}.xlsx`);

        showAlert('success', 'Laporan Matriks Berhasil Diunduh!');

        btn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
        btn.disabled = false;
    } catch (err) {
        closeModal();
        showAlert('error', err.message || err);
        btn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
        btn.disabled = false;
    }
}

async function processDailyExportCustom(btnElement) {
    const tglDipilih = document.getElementById('tgl_export_harian').value;
    if (!tglDipilih) { showAlert('error', 'Pilih tanggal dulu!'); return; }

    let filterKelas = "";
    if (typeof currentUser !== 'undefined' && currentUser.role === 'guru' && currentUser.kelas) { filterKelas = currentUser.kelas; }

    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    btnElement.disabled = true;

    try {
        const res = await fetchAPI('tarikDataExcelHarian', { tglString: tglDipilih, filterKelas: filterKelas });
        btnElement.innerHTML = originalText; btnElement.disabled = false;

        if (!res || !res.success) { showAlert('error', res ? res.message : 'Gagal mengambil data.'); return; }
        const data = res.data;
        if (!data || data.length === 0) { showAlert('warning', 'Tidak ada data presensi pada tanggal tersebut.'); return; }

        if (typeof ExcelJS === 'undefined') {
            showAlert('error', 'Library ExcelJS belum termuat!');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Harian`);

        worksheet.mergeCells('A1:H1');
        const titleCell1 = worksheet.getCell('A1');
        titleCell1.value = `LAPORAN ABSENSI HARIAN SISWA`;
        titleCell1.font = { size: 14, bold: true };
        titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.mergeCells('A2:H2');
        const titleCell2 = worksheet.getCell('A2');
        const formattedDate = new Date(tglDipilih).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        titleCell2.value = `TANGGAL: ${formattedDate.toUpperCase()} | KELAS: ${filterKelas ? filterKelas.toUpperCase() : 'SEMUA KELAS'}`;
        titleCell2.font = { size: 12, bold: true };
        titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };

        let headers = ["No", "NISN", "Nama Siswa", "Kelas", "Jam Datang", "Jam Pulang", "Status", "Keterangan"];
        const headerRow = worksheet.getRow(4);
        headerRow.values = headers;

        worksheet.columns = [
            { width: 5 }, { width: 15 }, { width: 35 }, { width: 10 },
            { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }
        ];

        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        data.forEach((row, idx) => {
            let jd = String(row.jamDatang || "-"); if (jd.length > 5) jd = jd.substring(0, 5);
            let jp = String(row.jamPulang || "-"); if (jp.length > 5) jp = jp.substring(0, 5);

            const r = worksheet.addRow([idx + 1, row.nisn, row.nama, row.kelas, jd, jp, row.status, row.keterangan]);
            r.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colNumber !== 3 && colNumber !== 8) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Absensi_Harian_${tglDipilih}_${filterKelas || 'Semua'}.xlsx`);

        showAlert('success', 'Download Berhasil!');

    } catch (err) {
        btnElement.innerHTML = originalText; btnElement.disabled = false;
        showAlert('error', 'Koneksi Server Gagal: ' + err.message);
    }
}

// ============================================================
// LOGIKA REKAP ABSENSI & CETAK (SISWA)
// ============================================================
function loadRekapSiswa() {
    stopAndBack(false); setActiveMenu('Rekap Kehadiran'); showView('view-rekap-siswa');

    const curDate = new Date();
    const yearInput = document.getElementById('rs_tahun');
    if (yearInput && !yearInput.value) yearInput.value = curDate.getFullYear();

    const monthSelect = document.getElementById('rs_bulan');
    if (monthSelect && monthSelect.options.length === 0) {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        months.forEach((m, i) => { monthSelect.innerHTML += `<option value="${i + 1}" ${i === curDate.getMonth() ? 'selected' : ''}>${m}</option>`; });
    }
    document.getElementById('rs_result').classList.add('hidden');
}

async function cariRekapSiswa() {
    const bln = document.getElementById('rs_bulan').value;
    const thn = document.getElementById('rs_tahun').value;
    if (!bln || !thn) return;

    document.getElementById('rs_result').classList.add('hidden');
    document.getElementById('rs_loading').classList.remove('hidden');

    const startStr = `${thn}-${String(bln).padStart(2, '0')}-01`;
    const lastDay = new Date(thn, bln, 0).getDate();
    const endStr = `${thn}-${String(bln).padStart(2, '0')}-${lastDay}`;

    try {
        const filter = { tanggalMulai: startStr, tanggalAkhir: endStr, kelas: currentUser.kelas };
        const res = await fetchAPI('getAbsensiList', { filter: filter });

        document.getElementById('rs_loading').classList.add('hidden');
        document.getElementById('rs_result').classList.remove('hidden');

        if (res.success) {
            rs_currentData = res.data.filter(d => d.nisn == currentUser.nisn);
            renderTabelRekapSiswa(rs_currentData);
        } else {
            rs_currentData = []; renderTabelRekapSiswa([]);
        }
    } catch (e) {
        document.getElementById('rs_loading').classList.add('hidden');
        showAlert('error', 'Gagal memuat rekap server.');
    }
}

function renderTabelRekapSiswa(data) {
    const tbody = document.getElementById('tbody-rekap-siswa');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-5 text-center text-gray-400 italic">Tidak ada data kehadiran bulan ini.</td></tr>';
        return;
    }

    data.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const getStatusColor = (s) => {
        if (s === 'Hadir') return 'bg-green-100 text-green-700';
        if (s === 'Izin') return 'bg-blue-100 text-blue-700';
        if (s === 'Sakit') return 'bg-yellow-100 text-yellow-700';
        if (s === 'Alpa') return 'bg-red-100 text-red-700'; return 'bg-gray-100 text-gray-600';
    };

    tbody.innerHTML = data.map(d => {
        let rawKet = String(d.keterangan || "-");
        let ketHtml = ``;

        if (rawKet.includes("Maps:") && rawKet.includes("Foto:")) {
            const wfhSessions = rawKet.split('||');
            ketHtml = `<div class="flex flex-col items-start gap-1">`;

            wfhSessions.forEach(session => {
                const parts = session.split('|');
                let mapsLink = "", fotoLink = "", statusWfh = "";

                parts.forEach(p => {
                    if (p.includes("Maps:")) mapsLink = p.replace('Maps:', '').trim();
                    else if (p.includes("Foto:")) fotoLink = p.replace('Foto:', '').trim();
                    else if (p.trim() !== "" && !p.includes("Akurasi:") && !p.includes("[LAT:")) statusWfh = p.trim();
                });

                statusWfh = statusWfh.replace(/\[LAT:.*\]/, '').trim();

                let badgeHtml = statusWfh.includes("Terlambat")
                    ? `<div class="w-24 shrink-0"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-history"></i> ${statusWfh}</span></div>`
                    : `<div class="w-24 shrink-0"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-check-double"></i> ${statusWfh}</span></div>`;

                ketHtml += `
                <div class="flex flex-nowrap items-center gap-2 p-1 bg-gray-50 rounded-lg w-max">
                    ${badgeHtml}
                    <div class="flex flex-nowrap items-center gap-1">
                        <a href="${fotoLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 py-1 px-2 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Foto</a>
                        <a href="${mapsLink}" target="_blank" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 py-1 px-2 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-map-marker-alt"></i> Map</a>
                    </div>
                </div>`;
            });
            ketHtml += `</div>`;
        }
        else if (rawKet.includes("Surat:")) {
            let suratLink = rawKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            ketHtml = `
            <div class="flex flex-nowrap items-center gap-1 w-max p-1">
                <a href="${suratLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-file-medical"></i> Lihat Surat</a>
            </div>`;
        }
        else if (rawKet.includes("Terlambat")) { ketHtml = `<div class="w-28"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate"><i class="fas fa-history mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet.includes("Pulang Cepat")) { ketHtml = `<div class="w-28"><span class="block text-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[9px] truncate"><i class="fas fa-running mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet === "Tepat Waktu") { ketHtml = `<div class="w-28"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate"><i class="fas fa-check-double mr-1"></i>${rawKet}</span></div>`; }
        else { ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">${rawKet}</span></div>`; }

        return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
            <td class="p-2 text-center text-gray-700 font-medium text-[10px] whitespace-nowrap">${new Date(d.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
            <td class="p-2 text-center"><span class="${getStatusColor(d.status)} px-2 py-1 rounded-lg text-[9px] font-bold">${d.status}</span></td>
            <td class="p-2">${ketHtml}</td>
        </tr>`;
    }).join('');
}

async function downloadPDFRekapSiswa() {
    if (rs_currentData.length === 0) { showAlert('error', 'Tidak ada data untuk diunduh'); return; }

    const btn = document.getElementById('btnDownloadPDFSiswa');
    const originalTxt = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Proses PDF...'; btn.disabled = true;

    try {
        const blnText = document.getElementById('rs_bulan').options[document.getElementById('rs_bulan').selectedIndex].text;
        const thnText = document.getElementById('rs_tahun').value;

        const logoEl = document.querySelector('.dyn-logo');
        if (logoEl && document.getElementById('printLogoSiswa')) document.getElementById('printLogoSiswa').src = logoEl.src;

        const namaSekolahEl = document.querySelector('.dyn-namasekolah');
        if (namaSekolahEl && document.getElementById('printNamaSekolah')) document.getElementById('printNamaSekolah').textContent = namaSekolahEl.textContent;

        const provEl = document.querySelector('.dyn-provinsi');
        if (document.getElementById('printProvinsi')) {
            document.getElementById('printProvinsi').textContent = provEl ? provEl.textContent : (window.appConfig?.nama_dinas || '');
        }

        document.getElementById('printSiswaNama').textContent = currentUser.nama;
        document.getElementById('printSiswaNISN').textContent = currentUser.nisn;
        document.getElementById('printSiswaKelas').textContent = currentUser.kelas;
        document.getElementById('printSiswaPeriode').textContent = `${blnText} ${thnText}`;

        const tbodyPrint = document.getElementById('printTbodyRekapSiswa');
        tbodyPrint.innerHTML = rs_currentData.map((d, i) => `
            <tr>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${new Date(d.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-weight: bold; font-size: 10px;">${d.status}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${d.keterangan || '-'}</td>
            </tr>
        `).join('');

        const printArea = document.getElementById('printAreaRekapSiswa');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const canvas = await html2canvas(printArea, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: 800
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.6);

        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        doc.save(`Rekap_Absen_${currentUser.nama}_${blnText}_${thnText}.pdf`);

        showAlert('success', 'PDF Berhasil Diunduh!');
    } catch (error) {
        showAlert('error', 'Gagal membuat PDF. Coba kembali.');
    } finally {
        btn.innerHTML = originalTxt; btn.disabled = false;
    }
}

// ============================================================
// LOGIKA CETAK KARTU SISWA (QR CODE)
// ============================================================
async function loadQRCodeSiswa(nisnParam, namaParam, kelasParam) {
    stopAndBack(false);
    if (currentUser && currentUser.role === 'siswa') setActiveMenu('Kartu Saya');
    showView('view-kartu-siswa');

    const container = document.getElementById('kartuSiswaContainer');
    container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i><p class="mt-2 text-sm text-gray-500">Memproses Data Kartu...</p></div>';

    const nama = namaParam || currentUser.nama || "Siswa";
    const nisn = nisnParam || currentUser.nisn || "1234567890";
    const kelas = kelasParam || currentUser.kelas || "X";
    const backFn = (currentUser.role === 'admin' || currentUser.role === 'guru') ? "loadDataSiswa()" : "loadSiswaDashboard()";

    try {
        const dataServer = await fetchAPI('getSettings');
        const logoBase64 = dataServer.logo;
        const logoInstansiBase64 = dataServer.logoInstansi;
        const namaSekolah = dataServer.namasekolah;
        const namaInstansi = dataServer.namaInstansi;

        container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-5">
            <div id="idCardElement" style="width: 320px; height: 510px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; position: relative; font-family: sans-serif; box-sizing: border-box; display: flex; flex-direction: column;">
                
                <div style="background: #312e81; padding: 25px 15px 15px 15px; text-align: center; color: white; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 160px;">
                    <div style="display: flex; gap: 15px; margin-bottom: 10px; justify-content: center;">
                        <img src="${logoInstansiBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                        <img src="${logoBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </div>
                    <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; opacity: 0.9; letter-spacing: 0.5px;">${namaInstansi}</div>
                    <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; line-height: 1.4; padding: 0 5px; word-wrap: break-word;">${namaSekolah}</div>
                    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; font-weight: 600;">KARTU PRESENSI DIGITAL</div>
                </div>

                <div style="flex: 1; padding: 15px 20px; text-align: center; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 130px; height: 130px; margin: 0 auto 10px auto; padding: 8px; background: white; border: 1px solid #f3f4f6; border-radius: 10px; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); box-sizing: border-box;">
                        <div id="hiddenQrTarget" style="width: 100%; height: 100%;"></div>
                    </div>
                    
                    <div style="font-size: 16px; font-weight: 800; color: #1f2937; margin-bottom: 2px; line-height: 1.2;">${nama}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px; font-family: monospace;">${nisn}</div>
                    
                    <div style="margin-bottom: auto;">
                        <span style="background: #eef2ff; color: #4f46e5; padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #e0e7ff;">${kelas}</span>
                    </div>
                    
                    <div style="width: 100%; border-top: 2px dashed #f3f4f6; padding-top: 10px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 15px;">
                        <span>ID: ${nisn}</span>
                        <span>VALID: ${new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex flex-col gap-3 w-[320px]">
                <button onclick="downloadCardAsPNG('${nama}')" class="w-full bg-indigo-600 text-white py-3 rounded-xl shadow-md font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i> Unduh Kartu Pribadi
                </button>
                <button onclick="${backFn}" class="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl shadow-sm font-bold text-sm hover:bg-gray-50 transition">
                    Tutup / Kembali
                </button>
            </div>
        </div>`;

        const qrTarget = document.getElementById('hiddenQrTarget');
        new QRCode(qrTarget, { text: String(nisn), width: 124, height: 124, correctLevel: QRCode.CorrectLevel.H });

        initAppConfigs();

    } catch (e) { }
}

function downloadCardAsPNG(filename) {
    const element = document.getElementById('idCardElement');
    const btn = event.currentTarget;
    const oldTxt = btn.innerHTML;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Proses...";
    btn.disabled = true;

    html2canvas(element, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Kartu_${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        btn.innerHTML = oldTxt; btn.disabled = false;
    }).catch(err => {
        alert("Gagal Unduh: " + err);
        btn.innerHTML = oldTxt; btn.disabled = false;
    });
}

async function cetakSemuaKartuSiswa() {
    const dataToPrint = tableState.siswa.filtered;

    if (!dataToPrint || dataToPrint.length === 0) {
        showAlert('error', 'Tidak ada data siswa untuk dicetak. Hapus filter pencarian jika perlu.');
        return;
    }

    showLoading();

    try {
        const dataServer = await fetchAPI('getSettings');
        const logoBase64 = dataServer.logo;
        const logoInstansiBase64 = dataServer.logoInstansi;
        const namaSekolah = dataServer.namasekolah;
        const namaInstansi = dataServer.namaInstansi;

        let container = document.getElementById('hiddenCardFactory');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hiddenCardFactory';
            container.style.cssText = 'position: fixed; top: 0; left: -9999px; z-index: -9999; pointer-events: none; background: white;';
            document.body.appendChild(container);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const cardW = 54;
        const cardH = 86;
        const marginX = (210 - (3 * cardW)) / 4;
        const marginY = (297 - (3 * cardH)) / 4;

        for (let i = 0; i < dataToPrint.length; i++) {
            const siswa = dataToPrint[i];

            document.getElementById('loadingText').innerHTML = `Memproses Kartu... <br><span class="text-[10px] text-gray-500 font-normal">${i + 1} dari ${dataToPrint.length} Siswa</span>`;

            container.innerHTML = `
            <div id="printCardTemplate" style="width: 320px; height: 510px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; position: relative; font-family: sans-serif; box-sizing: border-box; display: flex; flex-direction: column;">
                
                <div style="background: #312e81; padding: 25px 15px 15px 15px; text-align: center; color: white; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 160px;">
                    <div style="display: flex; gap: 15px; margin-bottom: 10px; justify-content: center;">
                        <img src="${logoInstansiBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                        <img src="${logoBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </div>
                    <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; opacity: 0.9; letter-spacing: 0.5px;">${namaInstansi}</div>
                    <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; line-height: 1.4; padding: 0 5px; word-wrap: break-word;">${namaSekolah}</div>
                    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; font-weight: 600;">KARTU PRESENSI DIGITAL</div>
                </div>

                <div style="flex: 1; padding: 15px 20px; text-align: center; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 130px; height: 130px; margin: 0 auto 10px auto; padding: 8px; background: white; border: 1px solid #f3f4f6; border-radius: 10px; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); box-sizing: border-box;">
                        <div id="hiddenQrTarget" style="width: 100%; height: 100%;"></div>
                    </div>
                    
                    <div style="font-size: 16px; font-weight: 800; color: #1f2937; margin-bottom: 2px; line-height: 1.2;">${siswa.nama}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px; font-family: monospace;">${siswa.nisn}</div>
                    
                    <div style="margin-bottom: auto;">
                        <span style="background: #eef2ff; color: #4f46e5; padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #e0e7ff;">${siswa.kelas}</span>
                    </div>
                    
                    <div style="width: 100%; border-top: 2px dashed #f3f4f6; padding-top: 10px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 15px;">
                        <span>ID: ${siswa.nisn}</span>
                        <span>VALID: ${new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>`;

            const qrTarget = document.getElementById('hiddenQrTarget');
            new QRCode(qrTarget, { text: String(siswa.nisn), width: 124, height: 124, correctLevel: QRCode.CorrectLevel.H });

            await new Promise(resolve => setTimeout(resolve, 400)); // Beri waktu lebih lama agar QR & gambar benar-benar termuat

            const cardEl = document.getElementById('printCardTemplate');
            const canvas = await html2canvas(cardEl, { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            const col = i % 3;
            const row = Math.floor((i % 9) / 3);
            const x = marginX + col * (cardW + marginX);
            const y = marginY + row * (cardH + marginY);

            doc.addImage(imgData, 'JPEG', x, y, cardW, cardH);

            if ((i + 1) % 9 === 0 && i !== dataToPrint.length - 1) {
                doc.addPage();
            }
        }

        const pdfFileName = `Cetak_Kartu_Siswa_${new Date().getTime()}.pdf`;
        doc.save(pdfFileName);

        showAlert('success', 'PDF berhasil diunduh dengan proporsi nama sekolah yang lebih baik!');

    } catch (error) {
        console.error("Error Cetak PDF:", error);
        showAlert('error', 'Gagal mencetak kartu: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================================
// LOGIKA KELOLA HARI LIBUR & WFH
// ============================================================
async function loadKelolaAbsen() {
    stopAndBack(false); setActiveMenu('Kelola Presensi'); showView('view-kelola-absen');
    document.getElementById('tbody-libur').innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat...</td></tr>';
    document.getElementById('tbody-wfh').innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat...</td></tr>';

    try {
        const resLibur = await fetchAPI('getHariLibur');
        if (resLibur.success) {
            tableState.libur.fullData = resLibur.data;
            processTableData('libur');
        }

        const resWfh = await fetchAPI('getJadwalWFH');
        if (resWfh.success) {
            tableState.wfh.fullData = resWfh.data;
            processTableData('wfh');
        }

    } catch (e) { }
    loadGlobalConfig();
}

async function loadGlobalConfig() {
    const inputs = document.querySelectorAll('#view-kelola-absen input[type="time"]');
    inputs.forEach(el => el.disabled = true);
    try {
        const res = await fetchAPI('getAppConfig');
        inputs.forEach(el => el.disabled = false);
        if (res.success) {
            const conf = res.data;
            // Config lama (WFH)
            const setV = (id, val, def) => { const el = document.getElementById(id); if (el) el.value = val || def; };
            setV('conf_wfh_masuk_mulai', conf.wfh_masuk_mulai, '06:00');
            setV('conf_wfh_masuk_akhir', conf.wfh_masuk_akhir, '08:00');
            setV('conf_wfh_pulang_mulai', conf.wfh_pulang_mulai, '15:00');
            setV('conf_wfh_pulang_akhir', conf.wfh_pulang_akhir, '18:00');
            // Config baru per kelompok hari
            setV('conf_sk_masuk_mulai', conf.seninkamis_masuk_mulai, '06:00');
            setV('conf_sk_masuk_akhir', conf.seninkamis_masuk_akhir, '07:15');
            setV('conf_sk_pulang_mulai', conf.seninkamis_pulang_mulai, '15:00');
            setV('conf_sk_pulang_akhir', conf.seninkamis_pulang_akhir, '17:00');
            setV('conf_jum_masuk_mulai', conf.jumat_masuk_mulai, '06:00');
            setV('conf_jum_masuk_akhir', conf.jumat_masuk_akhir, '07:15');
            setV('conf_jum_pulang_mulai', conf.jumat_pulang_mulai, '11:00');
            setV('conf_jum_pulang_akhir', conf.jumat_pulang_akhir, '13:00');
            setV('conf_sab_masuk_mulai', conf.sabtu_masuk_mulai, '06:00');
            setV('conf_sab_masuk_akhir', conf.sabtu_masuk_akhir, '07:15');
            setV('conf_sab_pulang_mulai', conf.sabtu_pulang_mulai, '12:00');
            setV('conf_sab_pulang_akhir', conf.sabtu_pulang_akhir, '15:00');

            const toggleLiburMinggu = document.getElementById('toggleLiburMinggu');
            const toggleLiburSabtu = document.getElementById('toggleLiburSabtu');
            if (toggleLiburMinggu) toggleLiburMinggu.checked = String(conf.libur_minggu) === 'true';
            if (toggleLiburSabtu) toggleLiburSabtu.checked = String(conf.libur_sabtu) === 'true';

            // Highlight tab hari ini secara otomatis
            const todayDay = new Date().getDay(); // 0=Minggu, 1=Senin, ..., 5=Jumat, 6=Sabtu
            if (todayDay === 5) switchWaktuTab('jumat');
            else if (todayDay === 6) switchWaktuTab('sabtu');
            else switchWaktuTab('seninkamis');
        }
    } catch (e) {
        inputs.forEach(el => el.disabled = false);
    }
}

window.handleWeekendToggle = function () {
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

    // Auto save konfigurasi (cari tombol simpan config waktu, tapi bisa jalan walau tanpa tombol)
    const btn = document.querySelector('button[onclick="saveGlobalConfig(this)"]');
    if (btn) saveGlobalConfig(btn);
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

async function saveGlobalConfig(btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';

    const getV = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };

    const newConfig = {
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
        seninkamis_pulang_mulai: getV('conf_sk_pulang_mulai', '15:00'),
        seninkamis_pulang_akhir: getV('conf_sk_pulang_akhir', '17:00'),
        jumat_masuk_mulai: getV('conf_jum_masuk_mulai', '06:00'),
        jumat_masuk_akhir: getV('conf_jum_masuk_akhir', '07:15'),
        jumat_pulang_mulai: getV('conf_jum_pulang_mulai', '11:00'),
        jumat_pulang_akhir: getV('conf_jum_pulang_akhir', '13:00'),
        sabtu_masuk_mulai: getV('conf_sab_masuk_mulai', '06:00'),
        sabtu_masuk_akhir: getV('conf_sab_masuk_akhir', '07:15'),
        sabtu_pulang_mulai: getV('conf_sab_pulang_mulai', '12:00'),
        sabtu_pulang_akhir: getV('conf_sab_pulang_akhir', '15:00')
    };

    try {
        const res = await fetchAPI('saveAppConfig', { newConfig: newConfig });
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;

        if (res.success) {
            showAlert('success', 'Pengaturan waktu berhasil disimpan!');
        } else {
            showAlert('error', res.message);
        }
    } catch (err) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;
        showAlert('error', 'Gagal koneksi: ' + err);
    }
}

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
    showLoading();
    const fd = new FormData(e.target);
    try {
        const res = await fetchAPI('addHariLibur', {
            tanggal: fd.get('tanggal'),
            keterangan: fd.get('keterangan')
        });
        hideLoading();
        if (res.success) {
            e.target.reset();
            loadKelolaAbsen();
            showAlert('success', 'Jadwal libur ditambahkan');
        } else {
            showAlert('error', res.message);
        }
    } catch (err) { }
}

async function deleteLiburConfirm(tgl) {
    if (confirm('Hapus hari libur ini?')) {
        showLoading();
        try {
            await fetchAPI('deleteHariLibur', { tanggal: tgl });
            hideLoading();
            loadKelolaAbsen();
            showAlert('success', 'Jadwal libur dihapus');
        } catch (e) { }
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
    e.preventDefault(); showLoading(); const fd = new FormData(e.target);
    try {
        const res = await fetchAPI('addJadwalWFH', { tanggal: fd.get('tanggal'), keterangan: fd.get('keterangan') });
        hideLoading();
        if (res.success) { e.target.reset(); loadKelolaAbsen(); showAlert('success', 'Jadwal WFH ditambahkan'); }
        else showAlert('error', res.message);
    } catch (err) { hideLoading(); }
}

async function deleteWfhConfirm(tgl) {
    if (confirm('Hapus jadwal WFH ini?')) {
        showLoading();
        try {
            await fetchAPI('deleteJadwalWFH', { tanggal: tgl });
            hideLoading(); loadKelolaAbsen(); showAlert('success', 'Jadwal WFH dihapus');
        } catch (e) { }
    }
}

// ============================================================
// LOGIKA WFH & IZIN SAKIT (SISWA)
// ============================================================
async function loadAbsenWFH() {
    stopAndBack(false);
    setActiveMenu('Rekam-WFH');
    showLoading();

    try {
        const cek = await fetchAPI('cekWFHToday');
        hideLoading();

        if (cek) {
            if (cek.isLibur) {
                Swal.fire({
                    title: 'Perekaman Ditolak!',
                    text: `Anda tidak bisa melakukan perekaman karena hari ini adalah Hari Libur (${cek.keterangan}).`,
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
                return;
            } else if (!cek.isWFH) {
                Swal.fire({
                    title: 'Akses Ditolak!',
                    text: 'Hari ini bukan jadwal WFH. Silakan lakukan presensi scan QR di sekolah.',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
                return;
            } else {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'info', title: cek.keterangan });
            }
        }
    } catch (e) {
        hideLoading();
        showAlert('error', 'Gagal mengecek jadwal ke server.');
        loadSiswaDashboard();
        return;
    }

    // Hanya tampilkan kamera & cari lokasi jika dizinkan WFH
    showView('view-absen-wfh');
    startWFHCamera();
    getLocation();
}
let currentGPS = { lat: null, lon: null, acc: null };

function getLocation() {
    const gpsText = document.getElementById('gpsLocationText');
    if (navigator.geolocation) {
        gpsText.innerHTML = `<i class="fas fa-spinner fa-spin text-indigo-500"></i> Memeriksa sensor lokasi...`;

        let locationResolved = false;
        
        // Manual Timeout 12 Detik Anti-Hang
        const fallbackTimer = setTimeout(() => {
            if (!locationResolved) {
                locationResolved = true;
                gpsText.innerHTML = `<span class="text-orange-500 font-bold text-xs"><i class="fas fa-exclamation-triangle"></i> GPS tidak merespon (Lanjut Tanpa GPS)</span>`;
                currentGPS.lat = 0;
                currentGPS.lon = 0;
                currentGPS.acc = 0;
                checkWFHReady();
            }
        }, 15000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (locationResolved) return;
                locationResolved = true;
                clearTimeout(fallbackTimer);

                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const acc = position.coords.accuracy;

                currentGPS.lat = lat;
                currentGPS.lon = lon;
                currentGPS.acc = Math.round(acc);

                gpsText.innerHTML = `${lat.toFixed(5)}, ${lon.toFixed(5)} <br><span class="text-[9px] text-green-600">Akurasi: ${Math.round(acc)}m <i class="fas fa-check-circle"></i></span>`;
                checkWFHReady();
            },
            (error) => {
                if (locationResolved) return;
                locationResolved = true;
                clearTimeout(fallbackTimer);

                let errMsg = "Izin Lokasi Ditolak!";
                if (error.code === 2) errMsg = "Sinyal GPS mati.";
                else if (error.code === 3) errMsg = "Timeout lokasi.";

                gpsText.innerHTML = `<span class="text-orange-500 font-bold text-xs"><i class="fas fa-exclamation-triangle"></i> ${errMsg} (Lanjut Tanpa GPS)</span>`;
                
                currentGPS.lat = 0;
                currentGPS.lon = 0;
                currentGPS.acc = 0;
                checkWFHReady();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        gpsText.innerHTML = "GPS tidak didukung browser ini.";
        currentGPS.lat = 0; currentGPS.lon = 0; currentGPS.acc = 0;
        checkWFHReady();
    }
}

let wfhStream = null;

function checkWFHReady() {
    const btn = document.getElementById('btnCaptureWFH');
    if (wfhStream && currentGPS.lat !== null) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

async function startWFHCamera() {
    const video = document.getElementById('wfhVideo');
    const loading = document.getElementById('wfhLoading');
    const loadingText = document.getElementById('wfhLoadingText');
    const btn = document.getElementById('btnCaptureWFH');
    
    // Reset tombol setiap kali buka WFH
    btn.innerHTML = '<i class="fas fa-camera mr-1"></i> Kirim Presensi';
    btn.disabled = true;
    loading.classList.remove('hidden');
    loadingText.innerText = "Menyiapkan Kamera...";
    
    if (wfhStream) {
        wfhStream.getTracks().forEach(track => track.stop());
    }

    try {
        wfhStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        video.srcObject = wfhStream;
        
        video.onloadedmetadata = () => {
            loading.classList.add('hidden');
            checkWFHReady();
        };
    } catch (err) {
        loading.classList.add('hidden');
        showAlert('error', 'Kamera tidak dapat diakses atau diblokir browser.');
    }
}

function captureAndSendWFH() {
    const video = document.getElementById('wfhVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Foto = canvas.toDataURL('image/jpeg', 0.7);
    
    Swal.fire({
        title: 'Kirim Presensi WFH?',
        text: 'Pastikan wajah Anda terlihat jelas.',
        imageUrl: base64Foto,
        imageHeight: 200,
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Kirim!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            submitWFH(base64Foto);
        }
    });
}

async function submitWFH(base64Foto) {
    const btn = document.getElementById('btnCaptureWFH');
    const originalText = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    showLoading();

    try {
        const res = await fetchAPI('absenWFH', {
            token: currentUser.token, 
            nisn: currentUser.nisn, 
            foto: base64Foto,
            lokasi: `${currentGPS.lat},${currentGPS.lon}`
        });
        hideLoading();
        
        if (res.success) {
            showAlert('success', res.message);
            if(wfhStream) wfhStream.getTracks().forEach(t => t.stop());
            setTimeout(() => { loadSiswaDashboard(); }, 1500);
        } else {
            showAlert('error', res.message); 
            btn.disabled = false; 
            btn.innerHTML = originalText;
        }
    } catch (error) {
        hideLoading(); 
        showAlert('error', 'Gagal koneksi server!'); 
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}

function loadIzinSiswa() {
    stopAndBack(false);
    setActiveMenu('Izin / Sakit');
    showView('view-izin-siswa');
}

function previewIzinFoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading();
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const MAX_WIDTH = 800;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }

            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            document.getElementById('izinBase64').value = compressedBase64;
            const preview = document.getElementById('izinPreviewImg');
            preview.src = compressedBase64;
            preview.classList.remove('hidden');
            document.getElementById('izinUploadPlaceholder').classList.add('hidden');
            hideLoading();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitIzinSiswa(e) {
    e.preventDefault();
    const tipe = document.getElementById('tipeIzinSiswa').value;
    const base64Foto = document.getElementById('izinBase64').value;

    if (!base64Foto) { showAlert('error', 'Harap masukkan foto surat keterangan!'); return; }

    const btn = document.getElementById('btnSubmitIzin');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    showLoading();

    try {
        const res = await fetchAPI('ajukanIzin', {
            token: currentUser.token, nisn: currentUser.nisn, tipe: tipe, fotoBase64: base64Foto
        });
        hideLoading();
        if (res.success) {
            showAlert('success', res.message);
            document.getElementById('fotoSuratIzin').value = '';
            document.getElementById('izinBase64').value = '';
            document.getElementById('izinPreviewImg').classList.add('hidden');
            document.getElementById('izinUploadPlaceholder').classList.remove('hidden');
            setTimeout(() => { loadSiswaDashboard(); }, 1500);
        } else {
            showAlert('error', res.message); btn.disabled = false; btn.innerHTML = originalText;
        }
    } catch (error) {
        hideLoading(); showAlert('error', 'Gagal koneksi server!'); btn.disabled = false; btn.innerHTML = originalText;
    }
}

function hapusBuktiAbsen(nisn, tanggal) {
    Swal.fire({
        title: 'Hapus Bukti & Reset Status?',
        text: 'Data absensi hari ini dan file foto/surat di Google Drive akan dihapus permanen. Status siswa akan kembali menjadi "Belum Absen".',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus & Reset!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                const res = await fetchAPI('deleteAbsenRecord', {
                    token: currentUser.token,
                    nisn: nisn,
                    tanggal: tanggal
                });
                hideLoading();
                if (res.success) {
                    showAlert('success', res.message);
                    refreshData('monitoring');
                } else {
                    showAlert('error', res.message);
                }
            } catch (e) {
                hideLoading();
                showAlert('error', 'Error koneksi ke server');
            }
        }
    });
}

// ==========================================
// CONTOH SURAT IZIN / SAKIT SISWA
// ==========================================

function bukaModalContohSurat() {
    if (window.settings && window.settings.url_template_surat) {
        window.open(window.settings.url_template_surat, '_blank');
        return;
    }

    let customTemplateUrl = window.appConfig && window.appConfig.url_template_surat ? window.appConfig.url_template_surat : null;

    let bodyContent = '';
    let footerContent = '';

    if (customTemplateUrl) {
        let isImage = customTemplateUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;

        if (isImage) {
            bodyContent = `
                <div class="p-4 text-center">
                    <p class="text-gray-600 mb-4 text-sm font-medium">Sekolah Anda telah menyediakan format template surat khusus:</p>
                    <img src="${customTemplateUrl}" alt="Template Surat" class="max-w-full h-auto mx-auto rounded-lg shadow border border-gray-200 mb-4 max-h-[60vh] object-contain">
                </div>
            `;
        } else {
            bodyContent = `
                <div class="p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
                    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                        <i class="fas fa-file-download"></i>
                    </div>
                    <h4 class="text-lg font-bold text-gray-800 mb-2">Template Surat Tersedia</h4>
                    <p class="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Sekolah telah menyediakan format khusus untuk surat izin/sakit. Silakan unduh file template tersebut.</p>
                </div>
            `;
        }

        footerContent = `
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition w-full sm:w-auto">
                Tutup
            </button>
            <a href="${customTemplateUrl}" target="_blank" download class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:emerald-700 shadow-md transition flex items-center justify-center gap-2 w-full sm:w-auto">
                <i class="fas fa-download"></i> Unduh File Template
            </a>
        `;
    } else {
        bodyContent = `
            <div class="p-6 overflow-y-auto bg-gray-50 text-sm text-gray-800 leading-relaxed font-serif" style="background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px;">
                <div class="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-200" id="teksContohSurat">
                    <p class="text-right mb-4">................., .................... 20...</p>
                    
                    <p class="mb-4">
                        Yth. Bapak/Ibu Wali Kelas<br>
                        Di Sekolah
                    </p>
                    
                    <p class="mb-4">Dengan hormat,</p>
                    <p class="mb-2">Yang bertanda tangan di bawah ini, selaku Orang Tua / Wali Murid dari:</p>
                    
                    <table class="mb-4 ml-4">
                        <tr><td class="pr-4 py-1">Nama</td><td>: .......................................</td></tr>
                        <tr><td class="pr-4 py-1">Kelas</td><td>: .......................................</td></tr>
                        <tr><td class="pr-4 py-1">NISN</td><td>: .......................................</td></tr>
                    </table>
                    
                    <p class="mb-4 text-justify">
                        Memberitahukan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada hari ini dikarenakan <strong>Sakit / Ada Keperluan Keluarga (Izin)*</strong>.
                    </p>
                    
                    <p class="mb-6 text-justify">
                        Demikian surat keterangan ini kami sampaikan agar dapat dimaklumi. Atas perhatian dan izin dari Bapak/Ibu, kami ucapkan terima kasih.
                    </p>
                    
                    <div class="flex justify-end mt-8">
                        <div class="text-center">
                            <p class="mb-16">Hormat kami,</p>
                            <p class="font-bold">( ....................................... )</p>
                            <p class="text-xs text-gray-500">Tanda tangan & Nama Terang</p>
                        </div>
                    </div>
                    
                    <p class="text-[10px] text-gray-400 mt-8 italic border-t pt-2">* Coret yang tidak perlu / Sesuaikan alasannya.</p>
                </div>
            </div>
        `;

        footerContent = `
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition w-full sm:w-auto">
                Tutup
            </button>
            <button type="button" onclick="unduhContohSurat()" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 w-full sm:w-auto">
                <i class="fas fa-file-word"></i> Unduh Surat (DOC)
            </button>
        `;
    }

    const htmlContent = `
        <div class="bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex justify-between items-center shrink-0">
                <h3 class="text-white font-bold text-lg flex items-center gap-2">
                    <i class="fas fa-file-alt"></i> Contoh Surat Keterangan
                </h3>
                <button type="button" onclick="closeModal()" class="text-blue-100 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            ${bodyContent}
            
            <div class="p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                ${footerContent}
            </div>
        </div>
    `;
    showModal(htmlContent);
}

function unduhContohSurat() {
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Contoh Surat Keterangan</title>
        <!--[if gte mso 9]>
        <xml>
            <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
            @page Section1 {
                size: 8.27in 11.69in; /* A4 size */
                margin: 2cm 2cm 2cm 2cm;
                mso-header-margin: 35.4pt;
                mso-footer-margin: 35.4pt;
                mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body, p, table, td, span { 
                font-family: 'Arial', sans-serif; 
                font-size: 12pt; 
                line-height: 1.5; 
            }
            p { margin: 0 0 10pt 0; }
        </style>
    </head>
    <body>
        <div class="Section1">
            <p style="text-align: right;">................., .................... 20...</p>
            <p>Yth. Bapak/Ibu Wali Kelas<br>Di Sekolah</p>
            <p>Dengan hormat,</p>
            <p>Yang bertanda tangan di bawah ini, selaku Orang Tua / Wali Murid dari:</p>
            <table style="margin-left: 20px; width: 100%;">
                <tr><td width="80" style="padding: 2px 0;">Nama</td><td style="padding: 2px 0;">: .......................................</td></tr>
                <tr><td width="80" style="padding: 2px 0;">Kelas</td><td style="padding: 2px 0;">: .......................................</td></tr>
                <tr><td width="80" style="padding: 2px 0;">NISN</td><td style="padding: 2px 0;">: .......................................</td></tr>
            </table>
            <p style="text-align: justify; margin-top: 10pt;">Memberitahukan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada hari ini dikarenakan <strong>Sakit / Ada Keperluan Keluarga (Izin)</strong>*.</p>
            <p style="text-align: justify;">Demikian surat keterangan ini kami sampaikan agar dapat dimaklumi. Atas perhatian dan izin dari Bapak/Ibu, kami ucapkan terima kasih.</p>
            <br>
            <table style="width: 100%;">
                <tr>
                    <td width="60%"></td>
                    <td width="40%" style="text-align: center;">
                        <p>Hormat kami,</p>
                        <br><br><br>
                        <p>( ....................................... )<br>Orang Tua / Wali Murid</p>
                    </td>
                </tr>
            </table>
            <p style="font-size: 10pt; color: #666; margin-top: 30pt;">* Coret yang tidak perlu / Sesuaikan alasannya.</p>
        </div>
    </body>
    </html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Contoh_Surat_Keterangan.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
