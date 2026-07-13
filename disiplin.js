// ============================================================
// LOGIKA JAVASCRIPT MASTER PELANGGARAN
// ============================================================
async function loadMasterPelanggaran() {
    stopAndBack(false); setActiveMenu('Manaj. Disiplin'); showView('view-master-pelanggaran');
    document.getElementById('tbody-pelanggaran').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';

    try {
        const result = await fetchAPI('getPelanggaranList', { token: currentUser.token });
        if (result.success) {
            tableState.pelanggaran.fullData = result.data;
            processTableData('pelanggaran');
        } else {
            showAlert('error', result.message);
            document.getElementById('tbody-pelanggaran').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Gagal memuat data</td></tr>';
        }
    } catch (e) { document.getElementById('tbody-pelanggaran').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Error koneksi</td></tr>'; }
}

function renderPelanggaranRows(data, startIdx) {
    const tbody = document.getElementById('tbody-pelanggaran');
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>'; return; }

    tbody.innerHTML = data.map((item, i) => {
        let colorCat = 'bg-gray-100 text-gray-700';
        if (item.kategori.toLowerCase().includes('ringan')) colorCat = 'bg-blue-100 text-blue-700';
        if (item.kategori.toLowerCase().includes('sedang')) colorCat = 'bg-yellow-100 text-yellow-700';
        if (item.kategori.toLowerCase().includes('berat')) colorCat = 'bg-red-100 text-red-700';

        const isSystem = (item.id === 'SYS_LATE' || item.id === 'SYS_ALPA');

        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
            <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
            <td class="p-4 font-bold text-sm text-gray-800">${item.namaPelanggaran} ${isSystem ? '<i class="fas fa-shield-alt text-indigo-400 ml-1" title="Aturan Sistem"></i>' : ''}</td>
            <td class="p-4 text-center"><span class="px-2 py-1 rounded text-[10px] font-bold ${colorCat}">${item.kategori}</span></td>
            <td class="p-4 text-center whitespace-nowrap"><span class="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 whitespace-nowrap">+ ${item.poin}</span></td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                    <button onclick='editPelanggaran(${JSON.stringify(item)})' class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Edit Data"><i class="fas fa-edit"></i></button>
                    ${!isSystem ? `<button onclick="deletePelanggaranConfirm('${item.id}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Hapus Aturan"><i class="fas fa-trash"></i></button>` : `<span class="p-2 text-gray-300 cursor-not-allowed" title="Aturan Bawaan (Dikunci)"><i class="fas fa-lock"></i></span>`}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function showAddPelanggaranModal() { showModal(createPelanggaranModal()); }
function editPelanggaran(data) { showModal(createPelanggaranModal(data)); }

function createPelanggaranModal(p = null) {
    const isEdit = p !== null;
    const isSystem = isEdit && (p.id === 'SYS_LATE' || p.id === 'SYS_ALPA');
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-all mb-4";
    const disabledClass = "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300";

    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-fade-in">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-gavel"></i></div>
            <h3 class="font-bold text-xl text-gray-800">${isEdit ? 'Edit Pelanggaran' : 'Tambah Pelanggaran'}</h3>
            ${isSystem ? `<p class="text-[10px] text-rose-500 font-bold mt-1"><i class="fas fa-lock"></i> Aturan Sistem: Nama & Kategori dikunci.</p>` : ''}
        </div>
        <form onsubmit="savePelanggaran(event, ${isEdit})">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Nama Pelanggaran</label>
            <input type="text" name="namaPelanggaran" value="${p?.namaPelanggaran || ''}" required placeholder="Contoh: Terlambat Masuk" class="${inputClass} ${isSystem ? disabledClass : ''}" ${isSystem ? 'readonly' : ''}>
            
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Kategori</label>
            ${isSystem ? `<input type="hidden" name="kategori" value="${p.kategori}">` : ''}
            <select name="kategori" class="${inputClass} ${isSystem ? disabledClass : ''}" ${isSystem ? 'disabled' : ''}>
                <option value="Ringan" ${p?.kategori === 'Ringan' ? 'selected' : ''}>Ringan</option>
                <option value="Sedang" ${p?.kategori === 'Sedang' ? 'selected' : ''}>Sedang</option>
                <option value="Berat" ${p?.kategori === 'Berat' ? 'selected' : ''}>Berat</option>
            </select>

            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Bobot Poin</label>
            <input type="number" name="poin" value="${p?.poin || ''}" required min="1" placeholder="Contoh: 10" class="${inputClass}">

            ${isEdit ? `<input type="hidden" name="id" value="${p.id}">` : ''}
            
            <div class="flex gap-3 mt-4">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan</button>
            </div>
        </form>
    </div>`;
}

async function savePelanggaran(e, isEdit) {
    e.preventDefault(); showLoading();
    const fd = new FormData(e.target);
    const data = { namaPelanggaran: fd.get('namaPelanggaran'), kategori: fd.get('kategori'), poin: fd.get('poin') };

    try {
        let res;
        if (isEdit) { res = await fetchAPI('updatePelanggaran', { token: currentUser.token, id: fd.get('id'), data: data }); }
        else { res = await fetchAPI('addPelanggaran', { token: currentUser.token, data: data }); }

        hideLoading();
        if (res.success) { closeModal(); loadMasterPelanggaran(); showAlert('success', res.message); }
        else { showAlert('error', res.message); }
    } catch (err) { hideLoading(); showAlert('error', 'Terjadi kesalahan: ' + err); }
}

function deletePelanggaranConfirm(id) {
    if (confirm('Hapus data pelanggaran ini?')) {
        showLoading();
        fetchAPI('deletePelanggaran', { token: currentUser.token, id: id }).then(res => {
            hideLoading();
            if (res.success) { loadMasterPelanggaran(); showAlert('success', 'Dihapus!'); }
            else { showAlert('error', res.message); }
        }).catch(e => { hideLoading(); showAlert('error', 'Gagal hapus.'); });
    }
}

// ============================================================
// LOGIKA JAVASCRIPT INPUT KASUS (CERDAS & AUTOCOMPLETE)
// ============================================================
window.dataSiswaKasus = [];

async function loadInputKasus() {
    if (window.appStatusHari && window.appStatusHari.isLibur) {
        Swal.fire({
            icon: 'error',
            title: 'Hari Libur',
            text: 'Saat ini adalah hari libur (' + window.appStatusHari.keterangan + '). Anda tidak dapat mencatat pelanggaran.',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }

    stopAndBack(false);
    setActiveMenu(currentUser.role === 'admin' ? 'Manaj. Disiplin' : 'Input Kasus Siswa');
    showView('view-input-kasus');

    const d = new Date();
    document.getElementById('kasusTanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('kasusCatatan').value = '';
    resetPilihanSiswaKasus();

    const dropdown = document.getElementById('kasusIdPelanggaran');
    dropdown.innerHTML = '<option value="">Memuat...</option>';

    try {
        const res = await fetchAPI('getPelanggaranList', { token: currentUser.token });
        if (res.success) {
            let opts = '<option value="">-- Pilih Jenis Pelanggaran --</option>';
            res.data.forEach(p => {
                if (p.id !== 'SYS_LATE' && p.id !== 'SYS_ALPA') {
                    opts += `<option value="${p.id}">${p.namaPelanggaran} (+${p.poin} Poin)</option>`;
                }
            });
            dropdown.innerHTML = opts;
        } else { dropdown.innerHTML = '<option value="">Gagal memuat.</option>'; }
    } catch (e) { dropdown.innerHTML = '<option value="">Error koneksi.</option>'; }

    if (tableState.siswa.fullData.length > 0) {
        window.dataSiswaKasus = tableState.siswa.fullData;
    } else {
        try {
            const resSiswa = await fetchAPI('getSiswaList', { token: currentUser.token });
            if (resSiswa.success) window.dataSiswaKasus = resSiswa.data;
        } catch (e) { }
    }
}

function filterSiswaKasus(keyword) {
    const dropdown = document.getElementById('kasusSiswaDropdown');
    if (!keyword || keyword.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    const lowerKey = keyword.toLowerCase();
    const filtered = window.dataSiswaKasus.filter(s =>
        s.nama.toLowerCase().includes(lowerKey) ||
        String(s.nisn).toLowerCase().includes(lowerKey)
    ).slice(0, 10);

    if (filtered.length > 0) {
        dropdown.innerHTML = filtered.map(s => `
            <div onclick="pilihSiswaKasus('${s.nisn}', '${s.nama.replace(/'/g, "\\'")}', '${s.kelas}')" class="p-3 hover:bg-rose-50 cursor-pointer transition flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">${s.nama.charAt(0)}</div>
                <div>
                    <div class="font-bold text-xs text-gray-800">${s.nama}</div>
                    <div class="text-[10px] text-gray-500 font-mono mt-0.5"><span class="bg-gray-100 px-1.5 py-0.5 rounded mr-1 font-bold">${s.kelas}</span> ${s.nisn}</div>
                </div>
            </div>
        `).join('');
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = `<div class="p-4 text-xs text-gray-500 text-center italic">Data siswa tidak ditemukan.</div>`;
        dropdown.classList.remove('hidden');
    }
}

function pilihSiswaKasus(nisn, nama, kelas) {
    document.getElementById('kasusNisn').value = nisn;
    document.getElementById('kasusSearchSiswa').value = '';
    document.getElementById('kasusSearchSiswa').disabled = true;
    document.getElementById('kasusSiswaDropdown').classList.add('hidden');

    document.getElementById('textSiswaTerpilih').innerHTML = `${nama} <br><span class="font-normal text-[10px] text-emerald-600 font-mono">${kelas} - ${nisn}</span>`;
    document.getElementById('kasusSiswaTerpilih').classList.remove('hidden');
    document.getElementById('kasusSiswaTerpilih').classList.add('flex');
}

function resetPilihanSiswaKasus() {
    document.getElementById('kasusNisn').value = '';
    document.getElementById('kasusSearchSiswa').value = '';
    document.getElementById('kasusSearchSiswa').disabled = false;
    document.getElementById('kasusSiswaTerpilih').classList.add('hidden');
    document.getElementById('kasusSiswaTerpilih').classList.remove('flex');
}

let scannerKasusObj = null;

async function bukaScannerKasus() {
    if (typeof Html5QrcodeScanner === 'undefined') {
        const btn = document.querySelector('button[title="Scan QR Kartu"]');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xl"></i>';
        btn.disabled = true;

        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.onload = () => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            mulaiKameraKasus();
        };
        document.head.appendChild(script);
    } else {
        mulaiKameraKasus();
    }
}

function mulaiKameraKasus() {
    Swal.fire({
        title: 'Scan QR Pelanggar',
        html: `
            <style>
                #kamera-kasus { border: none !important; padding-bottom: 10px; }
                #kamera-kasus a { color: #2563eb !important; font-weight: bold; text-decoration: none; display: inline-block; margin-bottom: 10px; padding: 5px; background: #eff6ff; border-radius: 6px; }
                #kamera-kasus select { background: #f8fafc !important; color: #0f172a !important; padding: 10px !important; border-radius: 8px !important; border: 1px solid #cbd5e1 !important; width: 100%; font-weight: bold; font-size: 12px; margin-bottom: 10px; outline: none; }
                #kamera-kasus button { background: #2563eb !important; color: #ffffff !important; padding: 10px 16px !important; border-radius: 8px !important; font-weight: bold; border: none !important; margin: 5px 0; cursor: pointer; width: 100%; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: 0.2s; }
                #kamera-kasus button:active { transform: scale(0.95); }
                #kamera-kasus span { color: #475569 !important; font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px; }
            </style>
            <p class="text-xs text-gray-500 mb-3">Pilih kamera lalu sorot QR Code Kartu Siswa.</p>
            <div id="kamera-kasus" class="w-full overflow-hidden rounded-xl border-2 border-rose-200 bg-white min-h-[250px] shadow-inner"></div>
        `,
        showCancelButton: true,
        cancelButtonText: '<i class="fas fa-times mr-1"></i> Tutup Kamera',
        cancelButtonColor: '#64748b',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
            scannerKasusObj = new Html5QrcodeScanner(
                "kamera-kasus",
                { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
                false
            );

            scannerKasusObj.render((decodedText) => {
                scannerKasusObj.clear();
                Swal.close();

                const nisnScan = decodedText.replace(/'/g, "").trim();
                const siswa = window.dataSiswaKasus.find(s => String(s.nisn) === nisnScan);

                if (siswa) {
                    pilihSiswaKasus(siswa.nisn, siswa.nama, siswa.kelas);
                    showAlert('success', `Data ${siswa.nama} langsung terkunci!`);
                } else {
                    showAlert('error', 'Gagal! Kartu / NISN tidak terdaftar.');
                }
            }, (error) => { });
        },
        willClose: () => {
            if (scannerKasusObj) { scannerKasusObj.clear().catch(e => console.log(e)); }
        }
    });
}

async function submitKasusSiswa(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitKasus');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    showLoading();

    const data = {
        nisn: document.getElementById('kasusNisn').value,
        idPelanggaran: document.getElementById('kasusIdPelanggaran').value,
        tanggal: document.getElementById('kasusTanggal').value,
        catatan: document.getElementById('kasusCatatan').value
    };

    try {
        const res = await fetchAPI('addKasusSiswa', { token: currentUser.token, data: data });
        hideLoading();
        btn.disabled = false; btn.innerHTML = originalText;

        if (res.success) {
            showAlert('success', res.message);
            document.getElementById('kasusNisn').value = '';
            document.getElementById('kasusCatatan').value = '';
            document.getElementById('kasusIdPelanggaran').selectedIndex = 0;
            resetPilihanSiswaKasus();
        } else { showAlert('error', res.message); }
    } catch (err) {
        hideLoading(); btn.disabled = false; btn.innerHTML = originalText;
        showAlert('error', 'Gagal terhubung ke server');
    }
}

// ============================================================
// LOGIKA JAVASCRIPT REKAP KEDISIPLINAN (LEADERBOARD & HISTORY)
// ============================================================
window.kasusHistoryData = [];
window.kasusLeaderboardData = [];
window.currentDetailNisn = "";
window.currentDetailNama = "";
window.currentDetailKelas = "";

async function loadRekapKasus() {
    stopAndBack(false);
    if (currentUser.role === 'siswa') setActiveMenu('Dashboard'); 
    else if (currentUser.role === 'admin') setActiveMenu('Manaj. Disiplin');
    else setActiveMenu('Rekap Pelanggaran');
    showView('view-rekap-kasus');

    const tabDis = document.getElementById('tab-disiplin-rekap');
    if (tabDis) {
        if (currentUser && currentUser.role === 'admin') tabDis.classList.remove('hidden');
        else tabDis.classList.add('hidden');
    }

    const elAdmin = document.getElementById('areaAdminUtama');
    const elDetail = document.getElementById('areaDetailSiswa');
    const elSum = document.getElementById('summaryKasusSiswa');

    if (elAdmin) { elAdmin.classList.add('hidden'); elAdmin.classList.remove('flex'); }
    if (elDetail) { elDetail.classList.add('hidden'); elDetail.classList.remove('flex'); }
    if (elSum) { elSum.classList.add('hidden'); }

    const tbL = document.getElementById('tbody-leaderboard-kasus');
    if (tbL) tbL.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin text-rose-500 text-xl mb-2 block"></i> Memuat data...</td></tr>';

    try {
        const res = await fetchAPI('getRekapKasus', { token: currentUser.token });
        if (res.success) {
            const isAdminGuru = (res.role === 'admin' || res.role === 'guru');
            window.kasusHistoryData = res.history;

            if (isAdminGuru) {
                window.kasusLeaderboardData = res.leaderboard;

                const kelasSet = new Set(res.leaderboard.map(d => d.kelas));
                let kelasHtml = '<option value="">Semua Kelas</option>';
                Array.from(kelasSet).sort().forEach(k => { kelasHtml += `<option value="${k}">${k}</option>`; });
                document.getElementById('filterKelasKasus').innerHTML = kelasHtml;

                document.getElementById('areaAdminUtama').classList.remove('hidden');
                document.getElementById('areaAdminUtama').classList.add('flex');

                renderLeaderboardKasus(res.leaderboard);
            } else {
                document.getElementById('summaryKasusSiswa').classList.remove('hidden');
                document.getElementById('areaDetailSiswa').classList.remove('hidden');
                document.getElementById('areaDetailSiswa').classList.add('flex');
                document.getElementById('headerDetailKasus').classList.add('hidden');

                let myPoints = 0;
                if (res.leaderboard.length > 0) myPoints = res.leaderboard[0].totalPoin;

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

                renderHistoryKasus(res.history);
            }
        } else {
            showAlert('error', res.message);
        }
    } catch (e) { showAlert('error', 'Gagal terhubung ke server'); }
}

function renderLeaderboardKasus(data) {
    const tbody = document.getElementById('tbody-leaderboard-kasus');
    if (!tbody) return;
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400 italic">Belum ada kasus pelanggaran.</td></tr>'; return; }

    tbody.innerHTML = data.map((d, i) => {
        return `
        <tr class="hover:bg-rose-50/40 transition border-b border-gray-50">
            <td class="p-3 text-center align-middle text-gray-400 text-xs">${i + 1}</td>
            <td class="p-3 whitespace-nowrap min-w-[140px]">
                <div class="font-bold text-xs text-gray-800 break-words leading-tight line-clamp-2" title="${d.nama}">${d.nama}</div>
                <div class="text-[9px] text-gray-500 font-mono mt-0.5">${d.nisn}</div>
            </td>
            <td class="p-3 text-center"><span class="px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-[10px] font-bold">${d.kelas}</span></td>
            <td class="p-3 text-center whitespace-nowrap"><span class="font-black text-rose-600 text-sm bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 whitespace-nowrap">${d.totalPoin}</span></td>
            <td class="p-3 text-center">
                <button onclick="lihatDetailKasus('${d.nisn}', '${d.nama.replace(/'/g, "\\'")}', '${d.kelas}', ${d.totalPoin})" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition shadow-sm whitespace-nowrap"><i class="fas fa-eye mr-1"></i> Lihat Rekap</button>
            </td>
        </tr>`;
    }).join('');
}

function applyFilterLeaderboard() {
    const kelas = document.getElementById('filterKelasKasus').value;
    const cari = document.getElementById('cariNamaKasus').value.toLowerCase();

    let filtered = window.kasusLeaderboardData;
    if (kelas) filtered = filtered.filter(d => d.kelas === kelas);
    if (cari) filtered = filtered.filter(d => d.nama.toLowerCase().includes(cari) || d.nisn.toLowerCase().includes(cari));

    renderLeaderboardKasus(filtered);
}

function exportExcelKasus() {
    if (!window.kasusLeaderboardData || window.kasusLeaderboardData.length === 0) {
        showAlert('error', 'Tidak ada data untuk di-export'); return;
    }
    const dataToExport = window.kasusLeaderboardData.map((d, i) => ({
        "No": i + 1, "NISN": d.nisn, "Nama Siswa": d.nama, "Kelas": d.kelas,
        "Jumlah Kasus": d.kasus, "Total Poin": d.totalPoin
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Pelanggaran");
    XLSX.writeFile(wb, "Rekap_Pelanggaran_Siswa.xlsx");
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
    renderHistoryKasus(detailHistory);
}

function kembaliKeLeaderboard() {
    document.getElementById('areaDetailSiswa').classList.add('hidden');
    document.getElementById('areaDetailSiswa').classList.remove('flex');
    document.getElementById('areaAdminUtama').classList.remove('hidden');
    document.getElementById('areaAdminUtama').classList.add('flex');
}

function applyFilterDetailKasus() {
    const tglMulai = document.getElementById('filterMulaiDetail').value;
    const tglAkhir = document.getElementById('filterAkhirDetail').value;

    let nisnToFilter = currentUser.role === 'siswa' ? currentUser.nisn : window.currentDetailNisn;
    let filtered = window.kasusHistoryData.filter(d => d.nisn === nisnToFilter);

    if (tglMulai) filtered = filtered.filter(d => d.tanggal >= tglMulai);
    if (tglAkhir) filtered = filtered.filter(d => d.tanggal <= tglAkhir);

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
