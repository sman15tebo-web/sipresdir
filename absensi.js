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
        const result = await fetchAPI('scanAbsensi', {
            nisn: decodedText,
            role: myRole,
            kelasGuru: myKelas,
            token: currentUser ? currentUser.token : null
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
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            isScanning = false;
            if (redirect && currentUser) returnToDashboard();
        }).catch(() => {
            html5QrCode = null;
            if (redirect && currentUser) returnToDashboard();
        });
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
async function loadMonitoringAbsensi() {
    stopAndBack(false); 
    if (currentUser && currentUser.role === 'admin') setActiveMenu('Manaj. Presensi');
    else setActiveMenu('Monitoring');
    showView('view-monitoring');
    const tabMon = document.getElementById('tab-presensi-monitoring');
    if (tabMon) {
        if (currentUser && currentUser.role === 'admin') tabMon.classList.remove('hidden');
        else tabMon.classList.add('hidden');
    }

    document.getElementById('monitoringDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const dropdown = document.getElementById('filterKelasMonitoring');
    if (dropdown && typeof existingClasses !== 'undefined' && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    const myClass = currentUser.role === 'guru' ? currentUser.kelas : null;

    if (tableState.monitoring.fullData.length > 0) {
        processTableData('monitoring');
    } else {
        document.getElementById('tbody-monitoring').innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
        try {
            const result = await fetchAPI('getMonitoringRealtime', { filterKelas: myClass });
            if (result.success) {
                tableState.monitoring.fullData = result.data;
                processTableData('monitoring');
            } else {
                document.getElementById('tbody-monitoring').innerHTML = '<tr><td colspan="7" class="p-12 text-center text-gray-400 italic bg-white">Data tidak ditemukan.</td></tr>';
            }
        } catch (e) { }
    }
}

function renderMonitoringRows(data, startIdx) {
    const tbody = document.getElementById('tbody-monitoring');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-12 text-center text-gray-400 italic bg-white">Tidak ada data ditemukan.</td></tr>';
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
            let suratLink = rawKet.replace('Surat:', '').trim();
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
            <td class="p-2 text-center text-gray-400 text-[10px]">${startIdx + i + 1}</td>
            <td class="p-2 whitespace-nowrap min-w-[120px]">
                <div class="font-bold text-xs text-gray-900 break-words leading-tight line-clamp-2 max-w-[150px] whitespace-normal" title="${d.nama}">${d.nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${d.nisn}</div>
            </td>
            <td class="p-2 text-center"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-bold border border-indigo-100">${d.kelas}</span></td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jamDatang}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jamPulang}</td>
            <td class="p-2 align-middle">${ketHtml}</td>
            <td class="p-2 text-center relative">
                <select onchange="changeStatus('${d.nisn}', '${d.nama.replace(/'/g, "\\'")}', '${d.kelas}', this)" class="text-[9px] font-bold py-1 px-1 rounded border-0 focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none text-center w-24 ${statusColor} ${cursorClass}" ${disabledAttr}>
                    <option value="Belum Absen" ${d.status === 'Belum Absen' ? 'selected' : ''}>Belum Absen</option>
                    <option value="Hadir" ${d.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                    <option value="Izin" ${d.status === 'Izin' ? 'selected' : ''}>Izin</option>
                    <option value="Sakit" ${d.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                    <option value="Alpa" ${d.status === 'Alpa' ? 'selected' : ''}>Alpa</option>
                </select>
                ${canEdit ? '<i class="fas fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-[8px] pointer-events-none opacity-40"></i>' : ''}
            </td>
        </tr>`;
    }).join('');
}

async function changeStatus(nisn, nama, kelas, selectElement) {
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

    try {
        const res = await fetchAPI('updateAbsensiStatus', { token: token, nisn: nisn, nama: nama, kelas: kelas, newStatus: newStatus });
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
    stopAndBack(false); setActiveMenu('Manaj. Presensi'); showView('view-rekap-absensi');
    document.getElementById('rekapEmptyState').classList.remove('hidden');
    document.getElementById('rekapContainer').classList.add('hidden');
    document.getElementById('rekapLoading').classList.add('hidden');
    tableState.rekap.fullData = [];

    const selectKelas = document.getElementById('fKelasRekap');
    if (selectKelas) {
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
            let suratLink = rawKet.replace('Surat:', '').trim();
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
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jamDatang}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${d.jamPulang}</td>
            <td class="p-2 align-middle">${ketHtml}</td>
            <td class="p-2 text-center"><span class="${getStatusColor(d.status)} px-2 py-1 rounded text-[9px] font-bold">${d.status || 'Hadir'}</span></td>
        </tr>`;
    }).join('');
}

function exportToExcel() {
    const data = tableState.rekap.filtered;
    if (!data || data.length === 0) {
        showAlert('error', 'Tidak ada data untuk di-export.');
        return;
    }

    const btn = document.getElementById('btnExportExcel');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Proses...';

    setTimeout(() => {
        try {
            const excelData = data.map((row, index) => ({
                "No": index + 1,
                "Tanggal": new Date(row.tanggal).toLocaleDateString('id-ID'),
                "NISN": row.nisn,
                "Nama Siswa": row.nama,
                "Kelas": row.kelas,
                "Jam Datang": row.jamDatang,
                "Jam Pulang": row.jamPulang,
                "Keterangan": row.keterangan,
                "Status": row.status
            }));
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
            XLSX.writeFile(workbook, `Laporan_Absensi_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showAlert('success', 'File berhasil diunduh!');
        } catch (error) {
            showAlert('error', 'Gagal membuat file Excel.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 500);
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

        let headers = ["No", "NISN", "Nama Siswa", "Kelas"];
        for (let i = 1; i <= days; i++) headers.push(String(i));
        headers.push("H", "S", "I", "A");

        let excelRows = [headers];

        data.forEach((row, idx) => {
            let r = [idx + 1, row.nisn, row.nama, row.kelas];
            row.kehadiran.forEach(s => r.push(s));
            r.push(row.stats.H, row.stats.S, row.stats.I, row.stats.A);
            excelRows.push(r);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelRows);
        const wscols = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 10 }];
        for (let i = 0; i < days; i++) wscols.push({ wch: 3 });
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Absensi ${bulan}-${tahun}`);
        XLSX.writeFile(wb, `Jurnal_Absensi_${kelas || 'Semua'}_${bulan}-${tahun}.xlsx`);

        showAlert('success', 'Laporan Matriks Berhasil Diunduh!');

        btn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
        btn.disabled = false;
    } catch (err) {
        closeModal();
        showAlert('error', err);
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

        let headers = ["No", "NISN", "Nama Siswa", "Kelas", "Jam Datang", "Jam Pulang", "Status", "Keterangan"];
        let excelRows = [headers];

        data.forEach((row, idx) => {
            let jd = String(row.jamDatang || "-"); if (jd.length > 5) jd = jd.substring(0, 5);
            let jp = String(row.jamPulang || "-"); if (jp.length > 5) jp = jp.substring(0, 5);
            excelRows.push([idx + 1, row.nisn, row.nama, row.kelas, jd, jp, row.status, row.keterangan]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelRows);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Harian");

        const fileName = `Absensi_${tglDipilih}_${filterKelas || 'Semua'}.xlsx`;
        XLSX.writeFile(wb, fileName);
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
            let suratLink = rawKet.replace('Surat:', '').trim();
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

        document.getElementById('printLogoSiswa').src = document.querySelector('.dyn-logo').src;
        document.getElementById('printNamaSekolah').textContent = document.querySelector('.dyn-namasekolah').textContent;
        document.getElementById('printProvinsi').textContent = document.querySelector('.dyn-provinsi').textContent;

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
        const dataServer = await fetchAPI('getCardDataServer');
        const logoBase64 = dataServer.logo;
        const logoInstansiBase64 = dataServer.logoInstansi;
        const namaSekolah = dataServer.sekolah;
        const namaInstansi = dataServer.instansi;

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
        const dataServer = await fetchAPI('getCardDataServer');
        const logoBase64 = dataServer.logo;
        const logoInstansiBase64 = dataServer.logoInstansi;
        const namaSekolah = dataServer.sekolah;
        const namaInstansi = dataServer.instansi;

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

            await new Promise(resolve => setTimeout(resolve, 150));

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
    stopAndBack(false); setActiveMenu('Manaj. Presensi'); showView('view-kelola-absen');
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
            document.getElementById('conf_masuk_mulai').value = conf.jam_masuk_mulai || '06:00';
            document.getElementById('conf_masuk_akhir').value = conf.jam_masuk_akhir || '07:15';
            document.getElementById('conf_pulang_mulai').value = conf.jam_pulang_mulai || '15:00';
            document.getElementById('conf_pulang_akhir').value = conf.jam_pulang_akhir || '18:00';
            document.getElementById('conf_wfh_masuk_mulai').value = conf.wfh_masuk_mulai || '06:00';
            document.getElementById('conf_wfh_masuk_akhir').value = conf.wfh_masuk_akhir || '08:00';
            document.getElementById('conf_wfh_pulang_mulai').value = conf.wfh_pulang_mulai || '15:00';
            document.getElementById('conf_wfh_pulang_akhir').value = conf.wfh_pulang_akhir || '18:00';
            
            document.getElementById('toggleLiburMinggu').checked = String(conf.libur_minggu) === 'true';
            document.getElementById('toggleLiburSabtu').checked = String(conf.libur_sabtu) === 'true';
        }
    } catch (e) { }
}

window.handleWeekendToggle = function() {
    const isMinggu = document.getElementById('toggleLiburMinggu').checked;
    const isSabtu = document.getElementById('toggleLiburSabtu').checked;

    // Jika event berasal dari interaksi user
    if (event && event.target) {
        if(event.target.id === 'toggleLiburSabtu' && isSabtu) {
            document.getElementById('toggleLiburMinggu').checked = true;
        }
        if(event.target.id === 'toggleLiburMinggu' && !isMinggu) {
            document.getElementById('toggleLiburSabtu').checked = false;
        }
    }

    // Auto save konfigurasi (cari tombol simpan config waktu, tapi bisa jalan walau tanpa tombol)
    const btn = document.querySelector('button[onclick="saveGlobalConfig(this)"]');
    if (btn) saveGlobalConfig(btn);
}

async function saveGlobalConfig(btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';

    const newConfig = {
        jam_masuk_mulai: document.getElementById('conf_masuk_mulai').value,
        jam_masuk_akhir: document.getElementById('conf_masuk_akhir').value,
        jam_pulang_mulai: document.getElementById('conf_pulang_mulai').value,
        jam_pulang_akhir: document.getElementById('conf_pulang_akhir').value,
        wfh_masuk_mulai: document.getElementById('conf_wfh_masuk_mulai').value,
        wfh_masuk_akhir: document.getElementById('conf_wfh_masuk_akhir').value,
        wfh_pulang_mulai: document.getElementById('conf_wfh_pulang_mulai').value,
        wfh_pulang_akhir: document.getElementById('conf_wfh_pulang_akhir').value,
        libur_minggu: document.getElementById('toggleLiburMinggu').checked ? 'true' : 'false',
        libur_sabtu: document.getElementById('toggleLiburSabtu').checked ? 'true' : 'false'
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

    showView('view-absen-wfh');
    startWFHCamera();
    getLocation();

    try {
        const cek = await fetchAPI('cekWFHToday');

        if (cek) {
            if (cek.isLibur) {
                if (wfhStream) { wfhStream.getTracks().forEach(track => track.stop()); }
                Swal.fire({
                    title: 'Perekaman Ditolak!',
                    text: `Anda tidak bisa melakukan perekaman karena hari ini adalah Hari Libur (${cek.keterangan}).`,
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
            } else if (cek.isWFH) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'info', title: cek.keterangan });
            } else {
                if (wfhStream) { wfhStream.getTracks().forEach(track => track.stop()); }
                Swal.fire({
                    title: 'Akses Ditolak!',
                    text: 'Hari ini bukan jadwal WFH. Silakan lakukan presensi scan QR di sekolah.',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
            }
        }
    } catch (e) {
        if (wfhStream) { wfhStream.getTracks().forEach(track => track.stop()); }
        showAlert('error', 'Gagal mengecek jadwal ke server.');
        loadSiswaDashboard();
    }
}

function getLocation() {
    const gpsText = document.getElementById('gpsLocationText');
    if (navigator.geolocation) {
        gpsText.innerHTML = `<i class="fas fa-spinner fa-spin text-indigo-500"></i> Memeriksa sensor lokasi...`;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const acc = position.coords.accuracy;

                if (acc === 10 || acc === 20 || acc === 65 || acc === 100 || (acc % 10 === 0 && acc > 5)) {
                    gpsText.innerHTML = `<span class="text-rose-600 font-bold"><i class="fas fa-ban"></i> Terdeteksi Fake GPS / Mock Location!</span>`;
                    currentGPS.lat = null; currentGPS.lon = null;

                    Swal.fire('Peringatan!', 'Harap matikan aplikasi Fake GPS / Lokasi Palsu Anda sebelum melakukan presensi.', 'error');
                    checkWFHReady();
                    return;
                }

                currentGPS.lat = lat;
                currentGPS.lon = lon;
                currentGPS.acc = Math.round(acc);

                gpsText.innerHTML = `${lat.toFixed(5)}, ${lon.toFixed(5)} <br><span class="text-[9px] text-green-600">Akurasi: ${Math.round(acc)}m <i class="fas fa-check-circle"></i></span>`;
                checkWFHReady();
            },
            (error) => {
                let errMsg = "Izin Lokasi Ditolak!";
                if (error.code === 2) errMsg = "Sinyal GPS mati / tidak ditemukan.";
                else if (error.code === 3) errMsg = "Timeout pencarian lokasi.";

                gpsText.innerHTML = `<span class="text-red-500 font-bold"><i class="fas fa-exclamation-triangle"></i> ${errMsg}</span>`;
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        gpsText.innerHTML = "GPS tidak didukung browser ini.";
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

            const MAX_WIDTH = 600;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }

            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

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
