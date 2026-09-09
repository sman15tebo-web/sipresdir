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
    stopAndBack(false); setActiveMenu('Dashboard'); await showView('view-admin-dashboard');
    const adminDateDisplay = document.getElementById('adminDateDisplay');
    if (adminDateDisplay) {
        adminDateDisplay.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    const dashboardHeading = document.querySelector('#view-admin-dashboard h2');
    if (dashboardHeading) dashboardHeading.textContent = 'Dashboard Admin';

    try {
        // [OPTIMASI KILAT] Tampilkan dari Cache dulu jika ada
        const cachedRealtime = localStorage.getItem('cache_admin_realtime');
        const cachedAdv = localStorage.getItem('cache_admin_adv');

        if (cachedRealtime) {
            try {
                const data = JSON.parse(cachedRealtime);
                animateValue("admStatTotal", 0, data.length, 800);
                animateValue("admStatHadir", 0, data.filter(d => d.status === 'Hadir').length, 800);
                animateValue("admStatSakit", 0, data.filter(d => d.status === 'Sakit').length, 800);
                animateValue("admStatIzin", 0, data.filter(d => d.status === 'Izin').length, 800);
                animateValue("admStatAlpa", 0, data.filter(d => d.status === 'Alpa').length, 800);
            } catch (e) { }
        }

        if (cachedAdv) {
            try {
                const adv = JSON.parse(cachedAdv);
                renderAdminAttendanceLineChart(adv.attendanceTrend);
                renderAdminViolationPieChart(adv.violationPie);
                renderLeaderboardKelas(adv.topClasses);
                renderLeaderboardSiswa(adv.topViolators);
            } catch (e) { }
        }

        // 1. Get Realtime Stats (Cards) - Background Fetch
        const result = await fetchAPI('getMonitoringRealtime', { filterKelas: null });
        if (result.success) {
            localStorage.setItem('cache_admin_realtime', JSON.stringify(result.data));
            if (!cachedRealtime || JSON.stringify(result.data) !== cachedRealtime) {
                const data = result.data;
                if (Array.isArray(data)) {
                    animateValue("admStatTotal", 0, data.length, 800);
                    animateValue("admStatHadir", 0, data.filter(d => d.status === 'Hadir').length, 800);
                    animateValue("admStatSakit", 0, data.filter(d => d.status === 'Sakit').length, 800);
                    animateValue("admStatIzin", 0, data.filter(d => d.status === 'Izin').length, 800);
                    animateValue("admStatAlpa", 0, data.filter(d => d.status === 'Alpa').length, 800);
                } else {
                    animateValue("admStatTotal", 0, data.totalSiswa || 0, 800);
                    animateValue("admStatHadir", 0, data.hadir || 0, 800);
                    animateValue("admStatSakit", 0, data.sakit || 0, 800);
                    animateValue("admStatIzin", 0, data.izin || 0, 800);
                    animateValue("admStatAlpa", 0, data.alpa || 0, 800);
                }
            }
        }

        // 2. Get Advanced Stats (Charts & Leaderboards) - Background Fetch
        const advRes = await fetchAPI('getDashboardAdvancedStats', { token: currentUser.token });
        if (advRes.success) {
            localStorage.setItem('cache_admin_adv', JSON.stringify(advRes.data));
            if (!cachedAdv || JSON.stringify(advRes.data) !== cachedAdv) {
                const adv = advRes.data;
                renderAdminAttendanceLineChart(adv.attendanceTrend);
                renderAdminViolationPieChart(adv.violationPie);
                renderLeaderboardKelas(adv.topClasses);
                renderLeaderboardSiswa(adv.topViolators);
            }
        }

    } catch (e) {
        console.error("Fetch Exception in loadAdminDashboard:", e);
        showAlert('error', "Terjadi kesalahan koneksi saat memuat dashboard.");
    }
}

function renderAdminAttendanceLineChart(historyData) {
    const ctx = document.getElementById('adminAttendanceChart');
    if (!ctx) return;
    historyData = Array.isArray(historyData) ? historyData : [];
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
    pieData = pieData && typeof pieData === 'object' ? pieData : {};
    if (adminViolationChartInstance) adminViolationChartInstance.destroy();

    const dataArr = [pieData.ringan, pieData.sedang, pieData.berat];
    // If all zero, render empty
    if (dataArr.every(x => x === 0)) dataArr[0] = 0.001;

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
    if (!tbody) return;
    topClasses = Array.isArray(topClasses) ? topClasses : [];
    tbody.innerHTML = '';
    if (topClasses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-xs text-gray-500">Belum ada data absensi hari ini.</td></tr>`;
        return;
    }

    topClasses.forEach((c, index) => {
        const tr = document.createElement('tr');
        let medal = `<span class="text-gray-500 font-bold">#${index + 1}</span>`;
        if (index === 0) medal = `<i class="fas fa-medal text-yellow-400 text-lg"></i>`;
        else if (index === 1) medal = `<i class="fas fa-medal text-gray-400 text-lg"></i>`;
        else if (index === 2) medal = `<i class="fas fa-medal text-orange-400 text-lg"></i>`;

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
    if (!tbody) return;
    topSiswa = Array.isArray(topSiswa) ? topSiswa : [];
    tbody.innerHTML = '';
    if (topSiswa.length === 0) {
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
    if (!nisn) return;
    Swal.fire({ title: 'Memuat Rapor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetchAPI('getStudentDisciplineReport', { token: currentUser.token, nisn: nisn });
        Swal.close();
        if (res.success) {
            const data = res.data;
            const bio = data.biodata;
            const abs = data.absensi;

            let ketPoin = "SANGAT BAIK"; let warna = "text-emerald-600"; let bg = "bg-emerald-50 border-emerald-200";
            if (data.poin > 10) { ketPoin = "PERINGATAN"; warna = "text-yellow-600"; bg = "bg-yellow-50 border-yellow-200"; }
            if (data.poin > 25) { ketPoin = "RAWAN"; warna = "text-orange-600"; bg = "bg-orange-50 border-orange-200"; }
            if (data.poin > 50) { ketPoin = "TINDAK LANJUT"; warna = "text-rose-600"; bg = "bg-rose-50 border-rose-200"; }

            let kasusHtml = '';
            if (data.kasus.length === 0) {
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
    } catch (e) {
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
        // [OPTIMASI KILAT] Tampilkan dari Cache dulu jika ada
        const cachedRealtime = localStorage.getItem('cache_guru_realtime');
        const cachedAdv = localStorage.getItem('cache_guru_adv');

        if (cachedRealtime) {
            try {
                const data = JSON.parse(cachedRealtime);
                animateValue("admStatTotal", 0, data.length, 800);
                animateValue("admStatHadir", 0, data.filter(d => d.status === 'Hadir').length, 800);
                animateValue("admStatSakit", 0, data.filter(d => d.status === 'Sakit').length, 800);
                animateValue("admStatIzin", 0, data.filter(d => d.status === 'Izin').length, 800);
                animateValue("admStatAlpa", 0, data.filter(d => d.status === 'Alpa').length, 800);
            } catch (e) { }
        }

        if (cachedAdv) {
            try {
                const adv = JSON.parse(cachedAdv);
                renderAdminAttendanceLineChart(adv.attendanceTrend);
                renderAdminViolationPieChart(adv.violationPie);
                renderLeaderboardKelas(adv.topClasses);
                renderLeaderboardSiswa(adv.topViolators);
            } catch (e) { }
        }

        const result = await fetchAPI('getMonitoringRealtime', { filterKelas: null });
        if (result.success) {
            localStorage.setItem('cache_guru_realtime', JSON.stringify(result.data));
            if (!cachedRealtime || JSON.stringify(result.data) !== cachedRealtime) {
                const data = result.data;
                animateValue("admStatTotal", 0, data.length, 800);
                animateValue("admStatHadir", 0, data.filter(d => d.status === 'Hadir').length, 800);
                animateValue("admStatSakit", 0, data.filter(d => d.status === 'Sakit').length, 800);
                animateValue("admStatIzin", 0, data.filter(d => d.status === 'Izin').length, 800);
                animateValue("admStatAlpa", 0, data.filter(d => d.status === 'Alpa').length, 800);
            }
        }

        const advRes = await fetchAPI('getDashboardAdvancedStats', { token: currentUser.token });
        if (advRes.success) {
            localStorage.setItem('cache_guru_adv', JSON.stringify(advRes.data));
            if (!cachedAdv || JSON.stringify(advRes.data) !== cachedAdv) {
                const adv = advRes.data;
                renderAdminAttendanceLineChart(adv.attendanceTrend);
                renderAdminViolationPieChart(adv.violationPie);
                renderLeaderboardKelas(adv.topClasses);
                renderLeaderboardSiswa(adv.topViolators);
            }
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
    let namaKelas = currentUser.kelas || 'Semua Kelas';
    let namaGuru = currentUser.nama || currentUser.username || 'Guru';
    let jk = currentUser.jenisKelamin || currentUser.jk || '-';
    let statusPegawai = currentUser.statusPegawai || currentUser.status_pegawai || '-';
    
    if(jk === 'L' || jk.toLowerCase() === 'laki-laki') jk = 'Laki-Laki';
    if(jk === 'P' || jk.toLowerCase() === 'perempuan') jk = 'Perempuan';

    let totalSiswa = 0;
    try {
        const cachedMaster = localStorage.getItem('cache_data_siswa_master');
        if (cachedMaster) {
            const allSiswa = JSON.parse(cachedMaster);
            if (namaKelas && namaKelas.toLowerCase() !== 'semua kelas' && namaKelas !== '') {
                totalSiswa = allSiswa.filter(s => s.kelas === namaKelas).length;
            } else {
                totalSiswa = allSiswa.length; // Count ALL students
            }
        } else {
            // fallback if no master cache
            totalSiswa = document.getElementById('statGuruTotal') ? document.getElementById('statGuruTotal').innerText : '0';
        }
    } catch(e) {
        totalSiswa = document.getElementById('statGuruTotal') ? document.getElementById('statGuruTotal').innerText : '0';
    }

    const modalContent = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0">
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
                <div class="flex items-center gap-2"><i class="fas fa-venus-mars text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Jenis Kelamin</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${jk}</span>
            </div>
            <div class="flex justify-between items-center p-3 border-b border-gray-50">
                <div class="flex items-center gap-2"><i class="fas fa-id-badge text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Status Pegawai</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${statusPegawai}</span>
            </div>
            <div class="flex justify-between items-center p-3 border-b border-gray-50">
                <div class="flex items-center gap-2"><i class="fas fa-chalkboard text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Kelas</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${namaKelas}</span>
            </div>
            <div class="flex justify-between items-center p-3">
                <div class="flex items-center gap-2"><i class="fas fa-users text-indigo-400"></i> <span class="text-[11px] font-bold text-gray-500 uppercase">Siswa</span></div>
                <span class="text-sm font-extrabold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">${totalSiswa} Orang</span>
            </div>
        </div>

        <button onclick="showUbahPasswordGuruModal()" class="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 py-3 rounded-xl text-xs font-bold border border-teal-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <i class="fas fa-key"></i> Ubah Password Akun
        </button>
    </div>
    `;
    showModal(modalContent);
}

// ============================================================

function showUbahPasswordGuruModal() {
    const content = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-user-lock"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Ubah Password</h3>
            <p class="text-xs text-gray-500 mt-1">Amankan akun guru Anda.</p>
        </div>
        <form onsubmit="submitUbahPasswordGuru(event)">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Lama</label>
            <div class="relative group mb-4">
                <input type="password" id="oldPassGuru" required class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('oldPassGuru', 'eyeOldPassG')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeOldPassG"></i></button>
            </div>
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Baru</label>
            <div class="relative group mb-6">
                <input type="password" id="newPassGuru" required minlength="6" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('newPassGuru', 'eyeNewPassG')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeNewPassG"></i></button>
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan Password Baru</button>
        </form>
    </div>`;
    showModal(content);
}

async function submitUbahPasswordGuru(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPassGuru').value;
    const newPass = document.getElementById('newPassGuru').value;

    showLoading();
    try {
        const res = await fetchAPI('changeGuruPassword', { token: currentUser.token, oldPass: oldPass, newPass: newPass, username: currentUser.username });
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

