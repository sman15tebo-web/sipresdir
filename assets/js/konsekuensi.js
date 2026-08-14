// ============================================================
// KONSEKUENSI HARIAN
// ============================================================

let jenisKonsekuensiList = [];
let siswaTerlambatList = [];
let hasilGenerateKonsekuensi = [];

// ---------- TAB NAVIGATION ----------
function switchKonsekuensiTab(tabName) {
    document.querySelectorAll('.kons-tab-btn').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600', 'font-bold');
        btn.classList.add('text-gray-500');
    });
    document.querySelectorAll('.kons-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('konsTab_' + tabName).classList.remove('hidden');
    const activeBtn = document.getElementById('konsBtnTab_' + tabName);
    activeBtn.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600', 'font-bold');
    activeBtn.classList.remove('text-gray-500');
    if (tabName === 'jenis') loadJenisKonsekuensi();
    else if (tabName === 'petakan') loadPetakanKonsekuensi();
}

// ---------- TAB 1: JENIS KONSEKUENSI ----------
async function loadJenisKonsekuensi() {
    const tbody = document.getElementById('tbodyJenisKonsekuensi');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
    const res = await fetchAPI('getJenisKonsekuensi', { token: currentUser.token });
    if (!res.success) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Gagal memuat: ' + res.message + '</td></tr>'; return; }
    jenisKonsekuensiList = res.data || [];
    renderJenisKonsekuensiTable();
}

function renderJenisKonsekuensiTable() {
    const tbody = document.getElementById('tbodyJenisKonsekuensi');
    if (!jenisKonsekuensiList.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-12 text-gray-400"><i class="fas fa-inbox text-4xl block mb-2"></i>Belum ada jenis konsekuensi.</td></tr>';
        return;
    }
    const objekBadge = { 'Laki-laki': 'bg-blue-100 text-blue-700', 'Perempuan': 'bg-pink-100 text-pink-700', 'Semua': 'bg-purple-100 text-purple-700' };
    const objekIcon = { 'Laki-laki': 'fa-mars', 'Perempuan': 'fa-venus', 'Semua': 'fa-venus-mars' };
    tbody.innerHTML = jenisKonsekuensiList.map(function(item, i) {
        return '<tr class="border-t border-gray-100 hover:bg-gray-50/50 transition"><td class="px-4 py-3 text-gray-500 font-medium">' + (i+1) + '</td><td class="px-4 py-3"><p class="text-sm font-bold text-gray-800">' + item.nama + '</p><div class="flex items-center gap-1 mt-1"><span class="w-1.5 h-1.5 rounded-full ' + (item.objek==='L' ? 'bg-blue-500' : item.objek==='P' ? 'bg-pink-500' : 'bg-purple-500') + '"></span><span class="text-xs text-gray-500">' + item.objek + '</span></div></td><td class="px-4 py-3 text-right"><div class="flex justify-end gap-2"><button onclick="openEditKonsekuensiModal(\'' + item.id + '\')" class="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"><i class="fas fa-edit"></i> Edit</button><button onclick="hapusJenisKonsekuensi(\'' + item.id + '\', \'' + item.nama.replace(/'/g,"\\'") + '\')" class="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"><i class="fas fa-trash"></i> Hapus</button></div></td></tr>';
    }).join('');
}

function openTambahKonsekuensiModal() {
    document.getElementById('kons_id').value = '';
    document.getElementById('kons_nama').value = '';
    document.getElementById('kons_objek').value = 'L/P';
    document.getElementById('modalKonsekuensiTitle').innerHTML = '<i class="fas fa-gavel text-indigo-600"></i> Tambah Konsekuensi';
    const m = document.getElementById('modalKonsekuensi');
    m.classList.remove('hidden');
    setTimeout(() => {
        m.classList.remove('opacity-0');
        m.firstElementChild.classList.remove('scale-95');
        m.firstElementChild.classList.add('scale-100');
    }, 10);
}

function openEditKonsekuensiModal(id) {
    const item = jenisKonsekuensiList.find(function(k) { return k.id === id; });
    if (!item) return;
    document.getElementById('kons_id').value = item.id;
    document.getElementById('kons_nama').value = item.nama;
    document.getElementById('kons_objek').value = item.objek;
    document.getElementById('modalKonsekuensiTitle').innerHTML = '<i class="fas fa-edit text-indigo-600"></i> Edit Konsekuensi';
    const m = document.getElementById('modalKonsekuensi');
    m.classList.remove('hidden');
    setTimeout(() => {
        m.classList.remove('opacity-0');
        m.firstElementChild.classList.remove('scale-95');
        m.firstElementChild.classList.add('scale-100');
    }, 10);
}

function closeModalKonsekuensi() { 
    const m = document.getElementById('modalKonsekuensi');
    m.classList.add('opacity-0');
    m.firstElementChild.classList.add('scale-95');
    m.firstElementChild.classList.remove('scale-100');
    setTimeout(() => m.classList.add('hidden'), 300);
}

async function simpanKonsekuensi() {
    const id = document.getElementById('kons_id').value;
    const nama = document.getElementById('kons_nama').value.trim();
    const objek = document.getElementById('kons_objek').value;
    if (!nama) { Swal.fire('Peringatan', 'Nama konsekuensi wajib diisi!', 'warning'); return; }
    const btn = document.getElementById('btnSubmitKonsekuensi');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Menyimpan...'; btn.disabled = true;
    let res = id
        ? await fetchAPI('updateJenisKonsekuensi', { token: currentUser.token, id, nama, objek })
        : await fetchAPI('addJenisKonsekuensi', { token: currentUser.token, nama, objek });
    btn.innerHTML = origText; btn.disabled = false;
    if (res.success) {
        closeModalKonsekuensi();
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: res.message, timer: 1500, showConfirmButton: false });
        loadJenisKonsekuensi();
    } else { Swal.fire('Gagal', res.message, 'error'); }
}

async function hapusJenisKonsekuensi(id, nama) {
    const result = await Swal.fire({ title: 'Hapus Konsekuensi?', html: 'Jenis konsekuensi <strong>' + nama + '</strong> akan dihapus.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#6B7280', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
    if (!result.isConfirmed) return;
    const res = await fetchAPI('deleteJenisKonsekuensi', { token: currentUser.token, id });
    if (res.success) { Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1200, showConfirmButton: false }); loadJenisKonsekuensi(); }
    else Swal.fire('Gagal', res.message, 'error');
}

// ---------- TAB 2: PETAKAN ----------
async function loadPetakanKonsekuensi() {
    hasilGenerateKonsekuensi = [];
    document.getElementById('hasilGenerateKonsekuensi').innerHTML = '';
    await Promise.all([loadSiswaTerlambatKons(), loadChecklistKonsekuensi()]);
}

async function loadSiswaTerlambatKons() {
    const container = document.getElementById('daftarSiswaTerlambatKons');
    const dateInput = document.getElementById('konsFilterDate');
    const dateStr = dateInput && dateInput.value ? dateInput.value : '';
    
    container.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i><p class="mt-2 text-sm">Memuat...</p></div>';
    const res = await fetchAPI('getSiswaTerlambat', { token: currentUser.token, date: dateStr });
    if (!res.success) { container.innerHTML = '<p class="text-red-500 text-sm text-center py-4">Gagal: ' + res.message + '</p>'; return; }
    siswaTerlambatList = res.data || [];
    if (!siswaTerlambatList.length) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-check-circle text-4xl text-green-400 block mb-2"></i><p class="text-sm font-semibold">Tidak ada siswa terlambat hari ini!</p></div>';
        return;
    }
    const lakilaki = siswaTerlambatList.filter(function(s) { return s.jenisKelamin && s.jenisKelamin.toLowerCase().includes('laki'); });
    const perempuan = siswaTerlambatList.filter(function(s) { return s.jenisKelamin && s.jenisKelamin.toLowerCase().includes('perempuan'); });
    const rows = siswaTerlambatList.map(function(s) {
        const isLaki = s.jenisKelamin && s.jenisKelamin.toLowerCase().includes('laki');
        return '<tr class="border-t border-gray-50 hover:bg-gray-50"><td class="px-3 py-2 font-semibold text-gray-800">' + s.nama + '</td><td class="px-3 py-2 text-gray-500 text-sm">' + s.kelas + '</td><td class="px-3 py-2 text-center"><span class="text-xs font-bold ' + (isLaki ? 'text-blue-600' : 'text-pink-600') + '"><i class="fas ' + (isLaki ? 'fa-mars' : 'fa-venus') + '"></i></span></td></tr>';
    }).join('');
    container.innerHTML = '<div class="flex gap-2 mb-3 text-xs font-bold"><span class="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full"><i class="fas fa-mars"></i> L: ' + lakilaki.length + '</span><span class="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-1 rounded-full"><i class="fas fa-venus"></i> P: ' + perempuan.length + '</span><span class="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Total: ' + siswaTerlambatList.length + '</span></div><div class="overflow-y-auto max-h-72 border border-gray-100 rounded-xl"><table class="w-full text-sm"><thead class="bg-gray-50 sticky top-0"><tr><th class="px-3 py-2 text-left text-xs font-bold text-gray-500">Nama</th><th class="px-3 py-2 text-left text-xs font-bold text-gray-500">Kelas</th><th class="px-3 py-2 text-center text-xs font-bold text-gray-500">JK</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function loadChecklistKonsekuensi() {
    const container = document.getElementById('checklistKonsekuensiKons');
    container.innerHTML = '<div class="text-center py-6 text-gray-400"><i class="fas fa-circle-notch fa-spin"></i></div>';
    const res = await fetchAPI('getJenisKonsekuensi', { token: currentUser.token });
    if (!res.success) { container.innerHTML = '<p class="text-red-500 text-sm">Gagal memuat.</p>'; return; }
    jenisKonsekuensiList = res.data || [];
    if (!jenisKonsekuensiList.length) { container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Belum ada jenis konsekuensi. Tambahkan di Tab 1.</p>'; return; }
    const objekBadge = { 'Laki-laki': 'bg-blue-100 text-blue-700', 'Perempuan': 'bg-pink-100 text-pink-700', 'Semua': 'bg-purple-100 text-purple-700' };
    const items = jenisKonsekuensiList.map(function(item) {
        return '<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition"><input type="checkbox" id="checkKons_' + item.id + '" value="' + item.id + '" class="w-4 h-4 accent-indigo-600"><div class="flex-1"><p class="text-sm font-semibold text-gray-800">' + item.nama + '</p><span class="text-xs px-2 py-0.5 rounded-full font-bold ' + (objekBadge[item.objek] || 'bg-gray-100 text-gray-600') + '">' + item.objek + '</span></div></label>';
    }).join('');
    container.innerHTML = '<div class="flex items-center gap-2 mb-3"><button onclick="toggleAllKonsekuensi(true)" class="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 transition">Pilih Semua</button><button onclick="toggleAllKonsekuensi(false)" class="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold border border-gray-200 transition">Hapus Pilihan</button></div><div class="space-y-2 max-h-72 overflow-y-auto pr-1">' + items + '</div>';
}

function toggleAllKonsekuensi(state) { document.querySelectorAll('[id^="checkKons_"]').forEach(function(cb) { cb.checked = state; }); }

function generateKonsekuensi() {
    if (!siswaTerlambatList.length) { Swal.fire('Info', 'Tidak ada siswa terlambat untuk data ini.', 'info'); return; }
    const checked = Array.from(document.querySelectorAll('[id^="checkKons_"]:checked')).map(function(cb) { return cb.value; });
    if (!checked.length) { Swal.fire('Peringatan', 'Pilih minimal 1 jenis konsekuensi.', 'warning'); return; }
    
    // Siapkan array siswa kosong pada tiap konsekuensi yang aktif (pertahankan yang sudah ada jika ada)
    const konsekuensiAktif = jenisKonsekuensiList.filter(function(k) { return checked.includes(k.id); }).map(function(k) { 
        const existing = (hasilGenerateKonsekuensi || []).find(e => e.id === k.id);
        return Object.assign({}, k, { siswa: existing ? [...existing.siswa] : [] }); 
    });

    // Kumpulkan semua nama siswa yang SUDAH terpetakan sebelumnya di konsekuensi yang aktif
    const assignedNames = new Set();
    konsekuensiAktif.forEach(k => {
        k.siswa.forEach(s => assignedNames.add(s.nama));
    });

    let newAddedCount = 0;

    siswaTerlambatList.forEach(function(siswa) {
        if (assignedNames.has(siswa.nama)) return; // Lewati jika sudah ditugaskan sebelumnya
        
        newAddedCount++;
        const isLaki = siswa.jenisKelamin && siswa.jenisKelamin.toLowerCase().includes('laki');
        
        // Cari tugas yang cocok
        const eligibleTasks = konsekuensiAktif.filter(k => {
            if (k.objek === 'L/P') return true;
            if (k.objek === 'L' && isLaki) return true;
            if (k.objek === 'P' && !isLaki) return true;
            return false;
        });

        if (eligibleTasks.length > 0) {
            // Cari tugas yang saat ini memiliki siswa paling sedikit (untuk meratakan pembagian)
            eligibleTasks.sort((a, b) => a.siswa.length - b.siswa.length);
            eligibleTasks[0].siswa.push(siswa);
        }
    });

    hasilGenerateKonsekuensi = konsekuensiAktif;
    renderHasilGenerate();
    
    if (newAddedCount > 0) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: newAddedCount + ' siswa baru berhasil dipetakan!', timer: 2000, showConfirmButton: false });
    } else {
        Swal.fire({ icon: 'info', title: 'Sudah Terpetakan', text: 'Semua siswa sudah ada dalam daftar. Tidak ada tambahan baru.', timer: 2000, showConfirmButton: false });
    }
}

function renderHasilGenerate() {
    const container = document.getElementById('hasilGenerateKonsekuensi');
    if (!hasilGenerateKonsekuensi.length) { container.innerHTML = ''; return; }
    const objekColor = { 'Laki-laki': 'from-blue-500 to-blue-600', 'Perempuan': 'from-pink-500 to-pink-600', 'Semua': 'from-purple-500 to-purple-600' };
    const cards = hasilGenerateKonsekuensi.map(function(k, idx) {
        return '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">' +
            '<div class="bg-gradient-to-r ' + (objekColor[k.objek] || 'from-gray-400 to-gray-500') + ' p-4">' +
                '<div class="flex items-start justify-between">' +
                    '<div><p class="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">' + k.objek + '</p>' +
                    '<h5 class="text-white font-bold text-base">' + k.nama + '</h5></div>' +
                    '<span class="bg-white/25 text-white text-2xl font-black w-12 h-12 rounded-xl flex items-center justify-center">' + k.siswa.length + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="p-3 flex items-center justify-between">' +
                '<p class="text-xs text-gray-500">' + k.siswa.length + ' siswa ditugaskan</p>' +
                '<button onclick="lihatDetailKonsekuensi(' + idx + ')" class="inline-flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-bold transition active:scale-95"><i class="fas fa-list"></i> Lihat Daftar</button>' +
            '</div>' +
        '</div>';
    }).join('');
    container.innerHTML = '<div class="mt-6 pt-6 border-t border-gray-200"><h4 class="text-base font-bold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-check-circle text-green-500"></i> Hasil Generate Konsekuensi</h4><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' + cards + '</div></div>';
}

function lihatDetailKonsekuensi(idx) {
    const item = hasilGenerateKonsekuensi[idx];
    if (!item) return;
    const rows = item.siswa.length
        ? item.siswa.map(function(s, i) {
            const isLaki = s.jenisKelamin && s.jenisKelamin.toLowerCase().includes('laki');
            return '<tr class="border-t border-gray-100"><td class="px-4 py-2 text-gray-400">' + (i+1) + '</td><td class="px-4 py-2 font-semibold text-gray-800">' + s.nama + '</td><td class="px-4 py-2 text-gray-500">' + s.kelas + '</td><td class="px-4 py-2 text-center"><span class="text-xs font-bold ' + (isLaki ? 'text-blue-600' : 'text-pink-600') + '"><i class="fas ' + (isLaki ? 'fa-mars' : 'fa-venus') + '"></i></span></td></tr>';
        }).join('')
        : '<tr><td colspan="4" class="text-center py-8 text-gray-400">Tidak ada siswa</td></tr>';
    const printBtn = '<div class="mt-4 flex justify-end"><button onclick="cetakKonsekuensi(' + idx + ')" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex items-center gap-2"><i class="fas fa-print"></i> Cetak Kartu</button></div>';
    Swal.fire({ title: item.nama, html: '<div class="text-left overflow-auto max-h-80 rounded-xl border border-gray-100"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="px-4 py-2 text-left text-xs font-bold text-gray-500">#</th><th class="px-4 py-2 text-left text-xs font-bold text-gray-500">Nama</th><th class="px-4 py-2 text-left text-xs font-bold text-gray-500">Kelas</th><th class="px-4 py-2 text-center text-xs font-bold text-gray-500">JK</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + printBtn, showCloseButton: true, showConfirmButton: false, width: '600px' });
}

function cetakKonsekuensi(idx) {
    const item = hasilGenerateKonsekuensi[idx];
    if (!item) return;

    const dateInput = document.getElementById('konsFilterDate');
    const tgl = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const dateStr = days[tgl.getDay()] + ', ' + tgl.getDate().toString().padStart(2, '0') + '-' + (tgl.getMonth()+1).toString().padStart(2, '0') + '-' + tgl.getFullYear();

    const appName = document.getElementById('navbarTitle') ? document.getElementById('navbarTitle').textContent : 'SEKOLAH';
    
    // Siapkan baris tabel, minimal 4 baris
    let tbodyRows = '';
    const minRows = 4;
    const totalRows = Math.max(item.siswa.length, minRows);
    
    for (let i = 0; i < totalRows; i++) {
        const s = item.siswa[i] || { nama: '', kelas: '' };
        tbodyRows += '<tr>';
        tbodyRows += '<td class="text-center">' + (i+1) + '</td>';
        tbodyRows += '<td>' + s.nama + '</td>';
        tbodyRows += '<td class="text-center">' + s.kelas + '</td>';
        
        // Kolom tanda tangan hanya di baris pertama dan rowspan sejumlah total baris
        if (i === 0) {
            tbodyRows += '<td rowspan="' + totalRows + '" class="text-center" style="vertical-align: bottom; padding-bottom: 15px;">';
            tbodyRows += '<div style="margin-bottom: 60px; font-weight: bold;">Mengetahui,<br>Petugas / Guru Piket</div>';
            tbodyRows += '( ............................................... )';
            tbodyRows += '</td>';
        }
        tbodyRows += '</tr>';
    }
    
    let html = `
    <html><head><title>Cetak Konsekuensi</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 13px; line-height: 1.4; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; }
        h3 { margin: 0 0 15px 0; font-size: 14px; font-weight: normal; }
        .info { margin-bottom: 10px; }
        .info div { margin-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
        .keterangan-box { border: 1px solid #000; border-top: none; padding: 10px 15px; }
        .keterangan-title { font-weight: bold; margin-bottom: 8px; }
        .checkbox-item { margin-bottom: 5px; display: inline-flex; align-items: center; margin-right: 20px; }
        .box { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 6px; }
        .catatan-line { border-bottom: 1px dotted #000; width: 100%; display: inline-block; margin-top: 12px; height: 15px; }
        @media print { button { display: none; } }
    </style>
    </head><body>
        <div style="max-width: 800px; margin: 0 auto;">
            <div class="text-center font-bold">
                <h2>BUKTI MELAKSANAKAN KONSEKUENSI SISWA TERLAMBAT</h2>
                <h3>${appName}</h3>
            </div>
            <div class="info">
                <div><strong>Jenis Konsekuensi :</strong> ${item.nama}</div>
                <div><strong>Hari / Tanggal :</strong> ${dateStr}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">No</th>
                        <th style="width: 250px;">Nama Siswa</th>
                        <th style="width: 80px;">Kelas</th>
                        <th style="width: 200px;">Tanda Tangan Petugas</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
            </table>
            
            <div class="keterangan-box">
                <div style="display: flex; align-items: center; flex-wrap: wrap;">
                    <div class="keterangan-title" style="margin-bottom: 0; margin-right: 20px;">KETERANGAN PELAKSANAAN:</div>
                    <div class="checkbox-item"><span class="box"></span> Selesai dan Tuntas</div>
                    <div class="checkbox-item" style="margin-right: 0;"><span class="box"></span> Kerjakan Kembali</div>
                </div>
                <div style="margin-top: 8px;">Catatan:</div>
                <span class="catatan-line"></span>
            </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
    </body></html>`;
    
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(html);
    win.document.close();
}

async function loadHalamanKonsekuensi() { 
    stopAndBack(false); 
    setActiveMenu('Konsekuensi Harian'); 
    showView('view-konsekuensi');
    switchKonsekuensiTab('jenis'); 
}
