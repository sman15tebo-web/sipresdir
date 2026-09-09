// ============================================================
// LOGIKA MONITORING REALTIME
// ============================================================
function getTanggalHariIniMonitoring() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function loadMonitoringAbsensi(forceDate = false) {
    stopAndBack(false);
    tableState.monitoring.page = 1;
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

    const normalizeClassValue = (value) => {
        if (value === null || value === undefined || value === 'Semua Kelas' || value === 'all') return '';
        return String(value).trim();
    };

    const dateInput = document.getElementById('tgl_export_harian');
    if (dateInput && !dateInput.value) dateInput.value = getTanggalHariIniMonitoring();

    let targetDate = dateInput ? String(dateInput.value || '').trim() : getTanggalHariIniMonitoring();
    let textDate = targetDate ? new Date(`${targetDate}T12:00:00`) : new Date();

    if (forceDate) {
        targetDate = dateInput ? String(dateInput.value || '').trim() : '';
        if (!targetDate) {
            showAlert('error', 'Pilih tanggal terlebih dahulu!');
            return;
        }
        textDate = new Date(`${targetDate}T12:00:00`);
    }

    const myClass = (currentUser && currentUser.role === 'guru') ? currentUser.kelas : null;
    const dropdown = document.getElementById('filterKelasMonitoring');
    const selectedClass = normalizeClassValue(dropdown ? (dropdown.value || myClass || '') : (myClass || ''));
    const requestedDate = targetDate || getTanggalHariIniMonitoring();
    const routeKey = `${requestedDate}|${selectedClass || 'all'}|${currentUser ? currentUser.role : 'guest'}`;
    const isDateChanged = tableState.monitoring.lastRequestedDate && tableState.monitoring.lastRequestedDate !== requestedDate;
    if (isDateChanged || forceDate) {
        tableState.monitoring.cacheKey = '';
    }
    const shouldReload = forceDate || tableState.monitoring.cacheKey !== routeKey || !Array.isArray(tableState.monitoring.fullData) || tableState.monitoring.fullData.length === 0;
    tableState.monitoring.lastRequestedDate = requestedDate;

    document.getElementById('monitoringDate').textContent = textDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (dropdown && typeof existingClasses !== 'undefined' && existingClasses.length > 0) {
        if (myClass && myClass !== 'undefined' && myClass !== 'Semua Kelas' && myClass !== '') {
            dropdown.innerHTML = `<option value="${myClass}">${myClass}</option>`;
            dropdown.value = myClass;
        } else {
            const currentValue = dropdown.value || selectedClass;
            let options = '<option value="">Semua Kelas</option>';
            existingClasses.forEach(kelas => {
                options += `<option value="${kelas}">${kelas}</option>`;
            });
            dropdown.innerHTML = options;
            if (currentValue) dropdown.value = currentValue;
        }
    }

    if (!shouldReload) {
        processTableData('monitoring');
        return;
    }

    tableState.monitoring.cacheKey = routeKey;
    tableState.monitoring.fullData = [];
    const tbodyMonitoring = document.getElementById('tbody-monitoring');
    if (tbodyMonitoring) tbodyMonitoring.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
    try {
        const result = await fetchAPI('getMonitoringRealtime', { filterKelas: selectedClass, filterTanggal: targetDate });
        let useData = [];

        if (result && result.success) {
            if (result.isLibur) {
                tableState.monitoring.fullData = [];
                processTableData('monitoring');
                const tbodyHoliday = document.getElementById('tbody-monitoring');
                if (tbodyHoliday) tbodyHoliday.innerHTML = `<tr><td colspan="8" class="p-12 text-center font-bold text-rose-500 bg-white"><i class="fas fa-calendar-times mb-2 text-2xl"></i><br>${result.message}</td></tr>`;
                return;
            }

            useData = Array.isArray(result.data) ? result.data : [];
        }

        if ((!result || !result.success || useData.length === 0) && targetDate) {
            try {
                const fallback = await fetchAPI('getAbsensiList', { tanggalMulai: targetDate, tanggalAkhir: targetDate, kelas: selectedClass || '' });
                if (fallback && fallback.success && Array.isArray(fallback.data)) {
                    useData = fallback.data.map(item => ({
                        nama: item.nama || '-',
                        nisn: String(item.nisn || '').replace(/'/g, '').trim(),
                        kelas: item.kelas || '-',
                        tanggal: item.tanggal || targetDate,
                        jamDatang: item.jam_datang || '-',
                        jamPulang: item.jam_pulang || '-',
                        status: item.status || 'Belum Absen',
                        keterangan: item.keterangan || '-'
                    }));
                }
            } catch (fallbackErr) {
                console.warn('Monitoring fallback failed:', fallbackErr);
            }
        }

        tableState.monitoring.fullData = useData;
        processTableData('monitoring');

        if (useData.length === 0) {
            const tbodyEmpty = document.getElementById('tbody-monitoring');
            if (tbodyEmpty) tbodyEmpty.innerHTML = '<tr><td colspan="8" class="p-12 text-center text-gray-400 italic bg-white">Data tidak ditemukan.</td></tr>';
        }
    } catch (e) {
        tableState.monitoring.fullData = [];
        const tbodyError = document.getElementById('tbody-monitoring');
        if (tbodyError) tbodyError.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-red-500 bg-white">Gagal memuat data: ${e.message || e}</td></tr>`;
    }
}

function renderMonitoringRows(data, startIdx) {
    const tbody = document.getElementById('tbody-monitoring');
    if (!tbody) return;
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-12 text-center text-gray-400 italic bg-white">Tidak ada data ditemukan.</td></tr>';
        return;
    }

    const canEdit = currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin');
    const cursorClass = canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70';
    const disabledAttr = canEdit ? '' : 'disabled';

    const monitorDate = document.getElementById('tgl_export_harian') ? document.getElementById('tgl_export_harian').value : "";
    const targetDate = monitorDate || new Date().toISOString().slice(0, 10);

    tbody.innerHTML = data.map((d, i) => {
        const nama = String(d?.nama ?? 'Siswa');
        const nisn = String(d?.nisn ?? '');
        const kelas = String(d?.kelas ?? '-');
        const tanggalValue = d?.tanggal || targetDate || getTanggalHariIniMonitoring();
        const tanggalLabel = (() => {
            if (!tanggalValue) return '-';
            try {
                const dt = new Date(`${tanggalValue}T12:00:00`);
                if (!Number.isNaN(dt.getTime())) {
                    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            } catch (e) {}
            return String(tanggalValue).slice(0, 10);
        })();
        const jamDatang = d?.jam_datang ?? d?.jamDatang ?? '-';
        const jamPulang = d?.jam_pulang ?? d?.jamPulang ?? '-';
        const rawStatus = d?.status || 'Belum Absen';
        const normalizedStatus = (rawStatus === 'Terlambat') ? 'Hadir' : rawStatus;
        let statusColor = 'bg-gray-100 text-gray-600';
        if (normalizedStatus === 'Hadir' || normalizedStatus === 'Tepat Waktu') statusColor = 'bg-green-100 text-green-700';
        else if (normalizedStatus === 'Izin') statusColor = 'bg-blue-100 text-blue-700';
        else if (normalizedStatus === 'Sakit') statusColor = 'bg-yellow-100 text-yellow-700';
        else if (normalizedStatus === 'Alpa') statusColor = 'bg-red-100 text-red-700';
        else if (normalizedStatus === 'Belum Absen') statusColor = 'bg-gray-100 text-gray-600';

        const safeNama = nama.replace(/'/g, "\\'");
        const safeKelas = kelas.replace(/'/g, "\\'");
        const safeNisn = nisn.replace(/'/g, "\\'");

        let originalKet = String(d?.keterangan || '-');
        let rawKet = originalKet.startsWith('Surat:') ? 'Melampirkan Bukti' : originalKet;
        let ketHtml = '';
        let buktiHtml = '<div class="w-28 text-center text-gray-400 font-mono text-[9px]">-</div>';

        if (rawKet.includes('Maps:') && rawKet.includes('Foto:')) {
            const wfhSessions = rawKet.split('||');
            ketHtml = '<div class="flex flex-col items-start gap-1">';

            wfhSessions.forEach(session => {
                const parts = session.split('|');
                let mapsLink = '', fotoLink = '', statusWfh = '';

                parts.forEach(p => {
                    if (p.includes('Maps:')) mapsLink = p.replace('Maps:', '').trim();
                    else if (p.includes('Foto:')) fotoLink = p.replace('Foto:', '').trim();
                    else if (p.trim() !== '' && !p.includes('Akurasi:') && !p.includes('[LAT:')) statusWfh = p.trim();
                });
                statusWfh = statusWfh.replace(/\[LAT:.*\]/, '').trim();

                let badgeHtml = statusWfh.includes('Terlambat')
                    ? `<div class="w-28 shrink-0"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-history"></i> ${statusWfh}</span></div>`
                    : `<div class="w-28 shrink-0"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-check-double"></i> ${statusWfh}</span></div>`;

                ketHtml += `
                <div class="flex flex-nowrap items-center gap-2 p-1 bg-gray-50 rounded-lg w-max">
                    ${badgeHtml}
                    <div class="flex flex-nowrap items-center gap-1">
                        <a href="${fotoLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Foto</a>
                        <a href="${mapsLink}" target="_blank" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 py-1 px-2 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-map-marker-alt"></i> Map</a>
                        ${canEdit ? `<button onclick="hapusBuktiAbsen('${safeNisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            });
            ketHtml += '</div>';
        }
        else if (originalKet.includes('Surat:')) {
            const suratLink = originalKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            window.adminBuktiCache = window.adminBuktiCache || {};
            window.adminBuktiCache[nisn] = suratLink;
            ketHtml = '<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">Via Sistem</span></div>';
            buktiHtml = `
            <div class="flex flex-nowrap items-center justify-center gap-1 w-max mx-auto p-1">
                <button onclick="lihatBuktiAdmin('${safeNisn}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Lihat Bukti</button>
                ${canEdit ? `<button onclick="hapusBuktiAbsen('${safeNisn}', '${targetDate}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-2 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center whitespace-nowrap"><i class="fas fa-trash"></i></button>` : ''}
            </div>`;
        }
        else if (rawKet.includes('Terlambat')) { ketHtml = `<div class="w-28"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate"><i class="fas fa-history mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet.includes('Pulang Cepat')) { ketHtml = `<div class="w-28"><span class="block text-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[9px] truncate"><i class="fas fa-running mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet === 'Tepat Waktu') { ketHtml = `<div class="w-28"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate"><i class="fas fa-check-double mr-1"></i>${rawKet}</span></div>`; }
        else { ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">${rawKet}</span></div>`; }

        return `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-2 text-center text-gray-400 text-[10px]">${startIdx + i + 1}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-700 whitespace-nowrap">${tanggalLabel}</td>
            <td class="p-2 whitespace-nowrap min-w-[120px] sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div class="font-bold text-xs text-gray-900 break-words leading-tight line-clamp-2 max-w-[150px] whitespace-normal" title="${nama}">${nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${nisn}</div>
            </td>
            <td class="p-2 text-center"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[9px] font-bold border border-indigo-100">${kelas}</span></td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${jamDatang}</td>
            <td class="p-2 text-center text-[10px] font-mono text-gray-600">${jamPulang}</td>
            <td class="p-2 align-middle">${ketHtml}</td>
            <td class="p-2 text-center relative">
                <select onchange="changeStatus('${safeNisn}', '${safeNama}', '${safeKelas}', '${targetDate}', this)" class="text-[9px] font-bold py-1 px-1 rounded border-0 focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none text-center w-24 ${statusColor} ${cursorClass}" ${disabledAttr}>
                    <option value="Belum Absen" ${normalizedStatus === 'Belum Absen' ? 'selected' : ''}>Belum Absen</option>
                    <option value="Hadir" ${normalizedStatus === 'Hadir' ? 'selected' : ''}>Hadir</option>
                    <option value="Izin" ${normalizedStatus === 'Izin' ? 'selected' : ''}>Izin</option>
                    <option value="Sakit" ${normalizedStatus === 'Sakit' ? 'selected' : ''}>Sakit</option>
                    <option value="Alpa" ${normalizedStatus === 'Alpa' ? 'selected' : ''}>Alpa</option>
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
        const safeStatus = (newStatus === 'Terlambat') ? 'Hadir' : newStatus;
        const res = await fetchAPI('updateAbsensiStatus', { token: token, nisn: nisn, nama: nama, kelas: kelas, tanggal: targetDate, newStatus: safeStatus });
        selectElement.disabled = false;
        selectElement.style.opacity = '1';

        if (res.success) {
            let newColor = 'bg-gray-100 text-gray-600';
            if (safeStatus === 'Hadir') newColor = 'bg-green-100 text-green-700';
            else if (safeStatus === 'Izin') newColor = 'bg-blue-100 text-blue-700';
            else if (safeStatus === 'Sakit') newColor = 'bg-yellow-100 text-yellow-700';
            else if (safeStatus === 'Alpa') newColor = 'bg-red-100 text-red-700';

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


window.lihatBuktiAdmin = function(nisn) {
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
};
