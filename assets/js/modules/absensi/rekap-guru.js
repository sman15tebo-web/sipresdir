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
        tableState.rekap.fullData = [];
        document.getElementById('tbody-rekap').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500">Gagal memuat laporan: ${err.message || err}</td></tr>`;
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
        let originalKet = String(d.keterangan || "-");
        let rawKet = originalKet.startsWith("Surat:") ? "Melampirkan Bukti" : originalKet;
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
        else if (originalKet.includes("Surat:")) {
            let suratLink = originalKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            window.adminBuktiCache = window.adminBuktiCache || {};
            window.adminBuktiCache[d.nisn] = suratLink;
            ketHtml = `
            <div class="flex flex-nowrap items-center gap-1 w-max p-1">
                <button onclick="lihatBuktiAdmin('${d.nisn}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Lihat Bukti</button>
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
                (row.keterangan || '').startsWith('Surat:') ? 'Melampirkan Bukti' : row.keterangan,
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

        const data = Array.isArray(res.data) ? res.data : [];
        const days = res.days;

        if (typeof ExcelJS === 'undefined') {
            showAlert('error', 'Library ExcelJS belum termuat!');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Jurnal Bulanan`);

        const bulanNama = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const namaBulan = bulanNama[parseInt(bulan)];

        const safeDays = Number.isInteger(Number(days)) && Number(days) > 0 ? Number(days) : new Date(Number(tahun), Number(bulan), 0).getDate();
        const totalCols = 4 + safeDays + 4; // 4 awal + days + 4 (H,S,I,A)
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
        for (let i = 1; i <= safeDays; i++) {
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
        worksheet.mergeCells(4, 5, 4, 4 + safeDays);

        // Merge untuk JUMLAH
        worksheet.mergeCells(4, 5 + safeDays, 4, 8 + safeDays);

        let cols = [
            { width: 5 }, { width: 15 }, { width: 35 }, { width: 12 }
        ];
        for (let i = 1; i <= safeDays; i++) cols.push({ width: 4 });
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
            const attendance = Array.isArray(row.kehadiran) ? row.kehadiran : [];
            const stats = row.stats || { H: 0, S: 0, I: 0, A: 0 };
            attendance.forEach(s => rowData.push(s));
            rowData.push(stats.H || 0, stats.S || 0, stats.I || 0, stats.A || 0);

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
        const data = Array.isArray(res.data) ? res.data : [];
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

            const cleanKet = (row.keterangan || '').startsWith('Surat:') ? 'Melampirkan Bukti' : row.keterangan;
            const r = worksheet.addRow([idx + 1, row.nisn, row.nama, row.kelas, jd, jp, row.status, cleanKet]);
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

