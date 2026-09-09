// ============================================================
// LOGIKA JAVASCRIPT REKAP KEDISIPLINAN (LEADERBOARD & HISTORY)
// ============================================================
window.kasusHistoryData = [];
window.kasusLeaderboardData = [];
window.kasusLeaderboardFiltered = [];
window.kasusLeaderboardPage = 1;
window.kasusLeaderboardLimit = 10;
window.currentDetailNisn = "";
window.currentDetailNama = "";
window.currentDetailKelas = "";

// ID timer retry global — bisa dibatalkan kapan saja jika user pindah menu
window._rekapRetryTimer = null;

async function loadRekapKasus(isRetry = false) {
    // Selalu batalkan timer retry sebelumnya (cegah ghost navigation)
    if (window._rekapRetryTimer) {
        clearTimeout(window._rekapRetryTimer);
        window._rekapRetryTimer = null;
    }

    if (!isRetry) {
        stopAndBack(false);
        if (currentUser.role === 'siswa') setActiveMenu('Dashboard');
        else if (currentUser.role === 'admin') setActiveMenu('Kelola Disiplin');
        else setActiveMenu('Rekap Pelanggaran');
        showView('view-rekap-kasus');
    } else {
        // Jika ini retry dan user sudah berpindah halaman, batalkan
        const view = document.getElementById('view-rekap-kasus');
        if (!view || view.classList.contains('hidden')) return;
    }

    const tabDis = document.getElementById('tab-disiplin-rekap');
    if (tabDis) {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'guru')) tabDis.classList.remove('hidden');
        else tabDis.classList.add('hidden');
    }

    const elAdmin = document.getElementById('areaAdminUtama');
    const elDetail = document.getElementById('areaDetailSiswa');
    const elSum = document.getElementById('summaryKasusSiswa');

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'guru')) {
        if (elAdmin) { elAdmin.classList.remove('hidden'); elAdmin.classList.add('flex'); }
        if (elDetail) { elDetail.classList.add('hidden'); elDetail.classList.remove('flex'); }
        if (elSum) { elSum.classList.add('hidden'); }

        const tbL = document.getElementById('tbody-leaderboard-kasus');
        if (tbL && !isRetry) tbL.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin text-rose-500 text-xl mb-2 block"></i> Memuat data...</td></tr>';
    } else {
        if (elAdmin) { elAdmin.classList.add('hidden'); elAdmin.classList.remove('flex'); }
        if (elDetail) { elDetail.classList.remove('hidden'); elDetail.classList.add('flex'); }
        if (elSum) { elSum.classList.remove('hidden'); }

        const tbH = document.getElementById('tbody-history-kasus');
        if (tbH && !isRetry) tbH.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin text-rose-500 text-xl mb-2 block"></i> Memuat riwayat...</td></tr>';
    }

    try {
        const res = await fetchAPI('getRekapKasus', {
            token: currentUser.token,
            role: currentUser.role,
            username: currentUser.username // username ini bisa berisi NISN jika role = siswa
        });

        // Setelah await selesai, cek sekali lagi apakah user masih di halaman ini
        const viewNow = document.getElementById('view-rekap-kasus');
        if (!viewNow || viewNow.classList.contains('hidden')) return;

        if (res.success) {
            const isAdminGuru = (currentUser.role === 'admin' || currentUser.role === 'guru');
            const history = Array.isArray(res.history) ? res.history : [];
            const leaderboard = Array.isArray(res.leaderboard) ? res.leaderboard : [];
            window.kasusHistoryData = history;

            if (isAdminGuru) {
                window.kasusLeaderboardData = leaderboard;

                const kelasSet = new Set(leaderboard.map(d => d.kelas).filter(Boolean));
                let kelasHtml = '<option value="">Semua Kelas</option>';
                Array.from(kelasSet).sort().forEach(k => { kelasHtml += `<option value="${k}">${k}</option>`; });
                document.getElementById('filterKelasKasus').innerHTML = kelasHtml;

                document.getElementById('areaAdminUtama').classList.remove('hidden');
                document.getElementById('areaAdminUtama').classList.add('flex');

                window.kasusLeaderboardFiltered = leaderboard;
                window.kasusLeaderboardPage = 1;
                renderLeaderboardPaginated();
            } else {
                document.getElementById('summaryKasusSiswa').classList.remove('hidden');
                document.getElementById('areaDetailSiswa').classList.remove('hidden');
                document.getElementById('areaDetailSiswa').classList.add('flex');
                document.getElementById('headerDetailKasus').classList.add('hidden');

                let myPoints = 0;
                if (leaderboard.length > 0) myPoints = leaderboard[0].totalPoin;

                document.getElementById('valTotalPoinSiswa').textContent = myPoints;
                const statEl = document.getElementById('valStatusPoinSiswa');

                if (myPoints === 0) {
                    statEl.innerHTML = '<i class="fas fa-star mr-1"></i> Sangat Baik / Bersih';
                    statEl.className = 'text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-full inline-block border shadow-sm bg-emerald-50 border-emerald-200 text-emerald-700';
                } else if (myPoints < 20) {
                    statEl.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Peringatan Ringan';
                    statEl.className = 'text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-full inline-block border shadow-sm bg-yellow-50 border-yellow-200 text-yellow-700';
                } else {
                    statEl.innerHTML = '<i class="fas fa-radiation mr-1"></i> Peringatan Keras!';
                    statEl.className = 'text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-full inline-block border shadow-sm bg-red-50 border-red-200 text-red-700 animate-pulse';
                }

                renderHistoryKasus(history);
            }
        } else {
            if (res.message.includes('antrean') || res.message.includes('sibuk')) {
                // Jadwalkan retry dan simpan ID-nya agar bisa dibatalkan
                const tbL = document.getElementById('tbody-leaderboard-kasus');
                if (tbL) tbL.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-blue-500"><i class="fas fa-circle-notch fa-spin text-blue-400 text-xl mb-2 block"></i> Sistem sedang memuat data. Mohon tunggu...</td></tr>';
                const tbH = document.getElementById('tbody-history-kasus');
                if (tbH) tbH.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-blue-500"><i class="fas fa-circle-notch fa-spin text-blue-400 text-xl mb-2 block"></i> Sistem sedang memuat data. Mohon tunggu...</td></tr>';
                window._rekapRetryTimer = setTimeout(() => loadRekapKasus(true), 3000);
            } else {
                // Tidak pakai alert popup — tampilkan pesan di dalam tabel saja
                const tbL = document.getElementById('tbody-leaderboard-kasus');
                if (tbL) tbL.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-blue-500"><i class="fas fa-info-circle mr-2"></i>${res.message}</td></tr>`;
            }
        }
    } catch (e) {
        const viewNow = document.getElementById('view-rekap-kasus');
        if (!viewNow || viewNow.classList.contains('hidden')) return;
        // Tidak tampilkan alert - cukup update pesan di tabel
        const tbL = document.getElementById('tbody-leaderboard-kasus');
        if (tbL) tbL.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-red-500"><i class="fas fa-times-circle mr-2"></i>Gagal terhubung ke server. Silakan muat ulang.</td></tr>';
    }
}

function renderLeaderboardKasus(data, startIdx = 0) {
    const tbody = document.getElementById('tbody-leaderboard-kasus');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400 italic">Belum ada kasus pelanggaran.</td></tr>'; return; }

    tbody.innerHTML = data.map((d, i) => {
        return `
        <tr class="hover:bg-rose-50/40 transition border-b border-gray-50">
            <td class="p-3 text-center align-middle text-gray-400 text-xs">${startIdx + i + 1}</td>
            <td class="p-3 whitespace-nowrap min-w-[140px]">
                <div class="font-bold text-xs text-gray-800 break-words leading-tight line-clamp-2" title="${d.nama}">${d.nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${d.nisn}</div>
            </td>
            <td class="p-3 text-center whitespace-nowrap"><span class="px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-[10px] font-bold whitespace-nowrap">${d.kelas}</span></td>
            <td class="p-3 text-center whitespace-nowrap"><span class="font-black text-rose-600 text-sm bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 whitespace-nowrap">${d.totalPoin}</span></td>
            <td class="p-3 text-center">
                <button onclick="lihatDetailKasus('${d.nisn}', '${d.nama.replace(/'/g, "\\'")}', '${d.kelas}', ${d.totalPoin})" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition shadow-sm whitespace-nowrap"><i class="fas fa-eye mr-1"></i> Buka</button>
            </td>
        </tr>`;
    }).join('');
}

function changeLimitLeaderboard(val) {
    window.kasusLeaderboardLimit = val === 'all' ? Infinity : parseInt(val);
    window.kasusLeaderboardPage = 1;
    renderLeaderboardPaginated();
}

function changePageLeaderboard(dir) {
    window.kasusLeaderboardPage += dir;
    renderLeaderboardPaginated();
}

function renderLeaderboardPaginated() {
    const limit = window.kasusLeaderboardLimit;
    const total = window.kasusLeaderboardFiltered.length;
    const maxPage = limit === Infinity ? 1 : Math.ceil(total / limit);

    if (window.kasusLeaderboardPage > maxPage && maxPage > 0) window.kasusLeaderboardPage = maxPage;
    if (window.kasusLeaderboardPage < 1) window.kasusLeaderboardPage = 1;

    const startIdx = (window.kasusLeaderboardPage - 1) * limit;
    const endIdx = limit === Infinity ? total : startIdx + limit;
    const pagedData = window.kasusLeaderboardFiltered.slice(startIdx, endIdx);

    renderLeaderboardKasus(pagedData, startIdx);

    const infoEl = document.getElementById('info-leaderboard');
    if (infoEl) infoEl.textContent = `Menampilkan ${total === 0 ? 0 : startIdx + 1}-${Math.min(endIdx, total)} dari ${total} data`;

    const btnPrev = document.getElementById('btn-prev-leaderboard');
    if (btnPrev) btnPrev.disabled = window.kasusLeaderboardPage <= 1;

    const btnNext = document.getElementById('btn-next-leaderboard');
    if (btnNext) btnNext.disabled = window.kasusLeaderboardPage >= maxPage || maxPage === 0;
}

function applyFilterLeaderboard() {
    const kelas = document.getElementById('filterKelasKasus').value;
    const cari = document.getElementById('cariNamaKasus').value.toLowerCase();

    let filtered = window.kasusLeaderboardData;
    if (kelas) filtered = filtered.filter(d => d.kelas === kelas);
    if (cari) filtered = filtered.filter(d => d.nama.toLowerCase().includes(cari) || d.nisn.toLowerCase().includes(cari));

    window.kasusLeaderboardFiltered = filtered;
    window.kasusLeaderboardPage = 1;
    renderLeaderboardPaginated();
}

async function exportExcelKasus() {
    if (!window.kasusLeaderboardData || window.kasusLeaderboardData.length === 0) {
        showAlert('error', 'Tidak ada data untuk di-export'); return;
    }

    try {
        if (typeof ExcelJS === 'undefined') {
            showAlert('error', 'Library ExcelJS belum termuat!');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Rekap Pelanggaran`);

        worksheet.mergeCells('A1:F1');
        const titleCell1 = worksheet.getCell('A1');
        titleCell1.value = `REKAPITULASI PELANGGARAN SISWA`;
        titleCell1.font = { size: 14, bold: true };
        titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };

        let headers = ["No", "NISN", "Nama Siswa", "Kelas", "Jumlah Kasus", "Total Poin"];
        const headerRow = worksheet.getRow(3);
        headerRow.values = headers;

        worksheet.columns = [
            { width: 5 }, { width: 15 }, { width: 35 }, { width: 10 },
            { width: 15 }, { width: 15 }
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

        window.kasusLeaderboardData.forEach((d, i) => {
            const r = worksheet.addRow([
                i + 1, d.nisn, d.nama, d.kelas, d.kasus, d.totalPoin
            ]);
            r.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colNumber !== 3) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "Rekap_Pelanggaran_Siswa.xlsx");
        showAlert('success', 'File berhasil diunduh!');
    } catch (error) {
        showAlert('error', 'Gagal membuat file Excel: ' + error.message);
    }
}

function lihatDetailKasus(nisn, nama, kelas, poin) {
    document.getElementById('areaAdminUtama').classList.add('hidden');
    document.getElementById('areaAdminUtama').classList.remove('flex');
    document.getElementById('areaDetailSiswa').classList.remove('hidden');
    document.getElementById('areaDetailSiswa').classList.add('flex');

    document.getElementById('headerDetailKasus').classList.remove('hidden');
    document.getElementById('detailNamaSiswa').textContent = nama;
    document.getElementById('detailInfoSiswa').innerHTML = `NISN: ${nisn} | Kelas: ${kelas} | Total Poin: <span class="font-bold text-rose-600">${poin}</span>`;

    window.currentDetailNisn = nisn; window.currentDetailNama = nama; window.currentDetailKelas = kelas;

    const detailHistory = window.kasusHistoryData.filter(d => d.nisn === nisn);

    // Populate dropdown jenis pelanggaran berdasarkan history siswa
    const jenisSet = new Set(detailHistory.map(d => d.pelanggaran));
    let jenisHtml = '<option value="">Semua Jenis Pelanggaran</option>';
    Array.from(jenisSet).sort().forEach(j => { jenisHtml += `<option value="${j}">${j}</option>`; });

    const filterJenisEl = document.getElementById('filterJenisDetail');
    if (filterJenisEl) {
        filterJenisEl.innerHTML = jenisHtml;
        filterJenisEl.value = "";
    }

    const filterBulanEl = document.getElementById('filterBulanDetail');
    if (filterBulanEl) filterBulanEl.value = "";

    renderHistoryKasus(detailHistory);
}

function kembaliKeLeaderboard() {
    document.getElementById('areaDetailSiswa').classList.add('hidden');
    document.getElementById('areaDetailSiswa').classList.remove('flex');
    document.getElementById('areaAdminUtama').classList.remove('hidden');
    document.getElementById('areaAdminUtama').classList.add('flex');
}

function applyFilterDetailKasus() {
    const bulan = document.getElementById('filterBulanDetail').value;
    const jenis = document.getElementById('filterJenisDetail').value;

    let nisnToFilter = currentUser.role === 'siswa' ? currentUser.nisn : window.currentDetailNisn;
    let filtered = window.kasusHistoryData.filter(d => d.nisn === nisnToFilter);

    if (bulan) {
        filtered = filtered.filter(d => {
            if (!d.tanggal) return false;
            return d.tanggal.startsWith(bulan);
        });
    }

    if (jenis) {
        filtered = filtered.filter(d => d.pelanggaran === jenis);
    }

    renderHistoryKasus(filtered);

    renderHistoryKasus(filtered);
}

function renderHistoryKasus(data) {
    const tbody = document.getElementById('tbody-history-kasus');
    if (!tbody) return;

    let totalPoinFiltered = 0;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-gray-400 italic">Tidak ada riwayat.</td></tr>`;
        return;
    }

    let html = data.map((d, i) => {
        totalPoinFiltered += parseInt(d.poin) || 0;
        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50">
            <td class="p-3 text-center text-gray-400 text-[10px]">${i + 1}</td>
            <td class="p-3 text-[10px] text-gray-600 whitespace-nowrap">${d.tanggal}</td>
            <td class="p-3 text-[11px] font-bold text-gray-700 min-w-[140px]">${d.pelanggaran}</td>
            <td class="p-3 text-center whitespace-nowrap"><span class="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[10px] whitespace-nowrap">+ ${d.poin}</span></td>
            <td class="p-3 min-w-[150px]">
                <div class="text-[9px] font-bold text-indigo-600 mb-0.5"><i class="fas fa-user-tie mr-1"></i>${d.guru}</div>
                ${d.catatan ? `<div class="text-[10px] text-gray-600 italic leading-snug whitespace-normal break-words">"${d.catatan}"</div>` : '-'}
            </td>
        </tr>`;
    }).join('');

    html += `
        <tr class="bg-rose-50/50 border-t-2 border-rose-200">
            <td colspan="3" class="p-3 text-right font-bold text-gray-700 text-xs uppercase tracking-wider">Total Poin Periode Ini:</td>
            <td class="p-3 text-center font-black text-rose-600 text-sm whitespace-nowrap">+ ${totalPoinFiltered}</td>
            <td></td>
        </tr>
    `;

    tbody.innerHTML = html;
}

function cetakPDFDetailKasus() {
    showLoading();
    if (typeof html2pdf === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => executePDFDownload();
        document.head.appendChild(script);
    } else {
        executePDFDownload();
    }
}

function executePDFDownload() {
    const isSiswa = currentUser.role === 'siswa';
    const nama = isSiswa ? currentUser.nama : window.currentDetailNama;
    const nisn = isSiswa ? currentUser.nisn : window.currentDetailNisn;
    const kelas = isSiswa ? currentUser.kelas : window.currentDetailKelas;

    const tglMulai = document.getElementById('filterMulaiDetail') ? document.getElementById('filterMulaiDetail').value : '';
    const tglAkhir = document.getElementById('filterAkhirDetail') ? document.getElementById('filterAkhirDetail').value : '';
    const periodeStr = (tglMulai || tglAkhir) ? `<p style="text-align: center; font-size: 12px; margin-bottom: 15px; color: #666;">Periode: ${tglMulai || 'Awal'} s/d ${tglAkhir || 'Akhir'}</p>` : '';

    const tableContent = document.getElementById('tbody-history-kasus').innerHTML;

    const element = document.createElement('div');
    element.innerHTML = `
        <div style="padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937;">
            <h2 style="text-align: center; margin-bottom: 5px; color: #e11d48; font-weight: 800;">LAPORAN KEDISIPLINAN SISWA</h2>
            ${periodeStr}
            <div style="margin-bottom: 20px; border-bottom: 2px solid #fda4af; padding-bottom: 15px; background: #fff1f2; padding: 15px; border-radius: 8px;">
                <p style="margin: 4px 0; font-size: 14px;"><b>Nama Siswa :</b> ${nama}</p>
                <p style="margin: 4px 0; font-size: 14px;"><b>NISN :</b> ${nisn}</p>
                <p style="margin: 4px 0; font-size: 14px;"><b>Kelas :</b> ${kelas}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e5e7eb;">
                <thead>
                    <tr style="background-color: #ffe4e6; color: #be123c;">
                        <th style="border: 1px solid #fda4af; padding: 10px; text-align: center;">No</th>
                        <th style="border: 1px solid #fda4af; padding: 10px; text-align: left;">Tanggal</th>
                        <th style="border: 1px solid #fda4af; padding: 10px; text-align: left;">Pelanggaran</th>
                        <th style="border: 1px solid #fda4af; padding: 10px; text-align: center;">Poin</th>
                        <th style="border: 1px solid #fda4af; padding: 10px; text-align: left;">Pelapor / Catatan</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableContent.includes("Tidak ada riwayat") ? '<tr><td colspan="5" style="text-align:center; padding:20px;">Tidak ada data riwayat di periode ini.</td></tr>' : tableContent}
                </tbody>
            </table>
            <p style="margin-top: 30px; font-size: 10px; text-align: right; color: #9ca3af;">Dicetak dari Sistem SiPresDiR - ${new Date().toLocaleString('id-ID')}</p>
        </div>
    `;

    const opt = {
        margin: 0.4,
        filename: `Buku_Kasus_${nama.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        hideLoading();
    }).catch(err => {
        hideLoading();
        showAlert('error', 'Gagal membuat file PDF');
    });
}
