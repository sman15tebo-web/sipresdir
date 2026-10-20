// ============================================================
// LOGIKA JAVASCRIPT MASTER PELANGGARAN
// ============================================================
async function loadMasterPelanggaran() {
    stopAndBack(false); setActiveMenu('Kelola Disiplin'); showView('view-master-pelanggaran');
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
            <td class="p-4 font-bold text-sm text-gray-800">${item.namaPelanggaran || item.nama_pelanggaran || '-'} ${isSystem ? '<i class="fas fa-shield-alt text-indigo-400 ml-1" title="Aturan Sistem"></i>' : ''}</td>
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
    const readonlyClass = "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300";

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
            <input type="text" name="namaPelanggaran" value="${p?.namaPelanggaran || ''}" required placeholder="Contoh: Merokok di area sekolah" class="${inputClass} ${isSystem ? readonlyClass : ''}" ${isSystem ? 'readonly' : ''}>
            
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Kategori</label>
            <select name="kategori" class="${inputClass}">
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
    if(window.Swal) {
        Swal.fire({
            title: 'Hapus data pelanggaran ini?',
            text: "Data tidak bisa dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                processDeletePelanggaran(id);
            }
        });
    } else {
        if (confirm('Hapus data pelanggaran ini?')) {
            processDeletePelanggaran(id);
        }
    }
}

function processDeletePelanggaran(id) {
    showLoading();
    fetchAPI('deletePelanggaran', { token: currentUser.token, id: id }).then(res => {
        hideLoading();
        if (res.success) { loadMasterPelanggaran(); showAlert('success', 'Dihapus!'); }
        else { showAlert('error', res.message); }
    }).catch(e => { hideLoading(); showAlert('error', 'Gagal hapus.'); });
}

