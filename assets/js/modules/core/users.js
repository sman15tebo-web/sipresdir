// ============================================================
// MANAJEMEN DATA AKUN (SISWA & GURU)
// ============================================================
async function loadDataSiswa() {
    stopAndBack(false);
    setActiveMenu('Kelola Akun');
    showView('view-data-siswa');

    const dropdown = document.getElementById('filterKelasSiswa');
    if (dropdown && existingClasses && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    if (tableState.siswa.fullData.length > 0) {
        processTableData('siswa');
    } else {
        // [OPTIMASI KILAT] Cek apakah ada cache di local storage
        const cached = localStorage.getItem('cache_data_siswa');
        if (cached) {
            try {
                tableState.siswa.fullData = JSON.parse(cached);
                processTableData('siswa');
            } catch (e) { }
        } else {
            document.getElementById('tbody-siswa').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data siswa...</td></tr>';
        }

        try {
            const result = await fetchAPI('getSiswaList');
            if (result.success) {
                // Filter: hanya tampilkan siswa dengan status 'aktif' atau yang belum ada statusnya
                const aktifData = result.data.filter(s => !s.status || s.status === '' || s.status === 'aktif');

                // Simpan SEMUA data siswa ke master cache (biar nonaktif juga bisa pake)
                localStorage.setItem('cache_data_siswa_master', JSON.stringify(result.data));
                localStorage.setItem('cache_data_siswa', JSON.stringify(aktifData));

                if (!cached || JSON.stringify(tableState.siswa.fullData) !== JSON.stringify(aktifData)) {
                    tableState.siswa.fullData = aktifData;
                    processTableData('siswa');
                }
            } else {
                if (!cached) showAlert('error', result.message);
            }
        } catch (e) {
            console.error("Fetch Exception in loadDataSiswa:", e);
            if (!cached) {
                const tbody = document.getElementById('tbody-siswa');
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500">Gagal memuat data siswa: ${e.message || e}</td></tr>`;
                showAlert('error', "Gagal memuat data siswa: " + (e.message || e));
            }
        }
    }
}

async function loadDataGuru() {
    stopAndBack(false); setActiveMenu('Kelola Akun'); showView('view-data-guru');
    const dropdown = document.getElementById('filterKelasGuru');

    if (dropdown && existingClasses && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    if (tableState.guru.fullData.length > 0) {
        processTableData('guru');
    } else {
        // [OPTIMASI KILAT] Cek apakah ada cache di local storage
        const cached = localStorage.getItem('cache_data_guru');
        if (cached) {
            try {
                tableState.guru.fullData = JSON.parse(cached);
                processTableData('guru');
            } catch (e) { }
        } else {
            document.getElementById('tbody-guru').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data guru...</td></tr>';
        }

        try {
            const result = await fetchAPI('getGuruList', { token: currentUser.token });
            if (result.success) {
                // Simpan ke cache untuk kunjungan berikutnya
                localStorage.setItem('cache_data_guru', JSON.stringify(result.data));

                // Jika panjang data beda atau cache kosong, update tabel
                if (!cached || JSON.stringify(tableState.guru.fullData) !== JSON.stringify(result.data)) {
                    tableState.guru.fullData = result.data;
                    processTableData('guru');
                }
            } else {
                if (!cached) {
                    document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">${result.message}</td></tr>`;
                }
                showAlert('error', result.message);
            }
        } catch (error) {
            if (!cached) {
                document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">Gagal memuat data guru: ${error.message || error}</td></tr>`;
                showAlert('error', 'Gagal memuat data guru: ' + (error.message || error));
            }
        }
    }
}

async function loadKelasSuggestions() {
    try {
        const result = await fetchAPI('getKelasList');
        if (result.success) existingClasses = result.data;
    } catch (e) { }
}

function openKelasDropdown() {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    renderDropdownItems(existingClasses);
    list.classList.remove('hidden');
}

function closeKelasDropdown() {
    setTimeout(() => { const list = document.getElementById('dropdownKelasList'); if (list) list.classList.add('hidden'); }, 200);
}

function filterKelasDropdown(query) {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    if (!query) { renderDropdownItems(existingClasses); return; }
    const filtered = existingClasses.filter(c => c.toLowerCase().includes(query.toLowerCase()));
    renderDropdownItems(filtered);
}

function renderDropdownItems(arr) {
    const list = document.getElementById('dropdownKelasList');
    if (!list) return;
    if (arr.length === 0) { list.innerHTML = '<div class="p-2 text-xs text-gray-400">Kelas tidak ditemukan</div>'; return; }
    list.innerHTML = arr.map(kelas => `<div onclick="selectKelasItem('${kelas}')" class="p-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 transition">${kelas}</div>`).join('');
}

function selectKelasItem(val) {
    const input = document.getElementById('inputKelas');
    if (input) input.value = val;
    closeKelasDropdown();
}

// RENDERER ROW SISWA & GURU (Dipindahkan dari index.html)
function renderSiswaRows(data, startIdx) {
    const tbody = document.getElementById('tbody-siswa');
    if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((siswa, i) => `
    <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
        <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
        <td class="p-4 whitespace-normal min-w-[120px]">
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-3 mt-1 shrink-0">${siswa.nama.charAt(0)}</div>
                <div class="whitespace-normal">
                    <div class="font-bold text-sm text-gray-900 break-words leading-tight">${siswa.nama}</div>
                    <div class="text-xs text-gray-500 md:hidden mt-0.5">${siswa.nisn}</div>
                </div>
            </div>
        </td>
        <td class="p-4 hidden md:table-cell text-sm text-gray-600 font-mono">${siswa.nisn}</td>
        <td class="p-4 hidden sm:table-cell"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">${siswa.kelas}</span></td>
            <td class="p-4 hidden lg:table-cell text-xs text-gray-600">${siswa.email || '-'}</td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                <button onclick='viewSiswa(${JSON.stringify(siswa).replace(/'/g, "&#39;")})' class="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"><i class="fas fa-eye"></i></button>
                <button onclick='editSiswa(${JSON.stringify(siswa).replace(/'/g, "&#39;")})' class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><i class="fas fa-edit"></i></button>
                <button onclick="loadQRCodeSiswa('${siswa.nisn}', '${siswa.nama.replace(/'/g, "\\'")}', '${siswa.kelas}')" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><i class="fas fa-qrcode"></i></button>
            </div>
        </td>
    </tr>`).join('');
}

function renderGuruRows(data, startIdx) {
    const tbody = document.getElementById('tbody-guru');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((guru, i) => {
        return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
            <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
            <td class="p-4 text-sm font-bold text-gray-800">${String(guru.nama || '-').replace(/^'+/, '')}</td>
            <td class="p-4 text-sm text-gray-600">${guru.status_pegawai || 'Guru'}</td>
            <td class="p-4 text-sm font-bold text-gray-800">${String(guru.username || '').replace(/^'+/, '')}</td>
            <td class="p-4 text-sm text-gray-600">${guru.kelas ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">${guru.kelas}</span>` : '<span class="text-gray-400 italic text-xs">Semua Akses</span>'}</td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                    <button onclick='editGuru(${JSON.stringify(guru).replace(/'/g, "&#39;")})' class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Edit Akun"><i class="fas fa-edit"></i></button>
                    <button onclick="showChangeGuruPassModal('${guru.username.replace(/'/g, "\\'")}')" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Ganti Password"><i class="fas fa-key"></i></button>
                    <button onclick="deleteGuruConfirm('${guru.username.replace(/'/g, "\\'")}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Hapus Akun"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// LOGIKA IMPORT
function showImportSiswaModal() { showModal(createSiswaImportModal()); }
function showImportGuruModal() { showModal(createImportModal('Guru')); }
function showImportPelanggaranModal() { showModal(createImportModal('Pelanggaran')); }

function createImportModal(type) {
    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-fade-in">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-file-excel"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Import Data ${type}</h3>
            <p class="text-xs text-gray-500 mt-1">Upload file Excel (.xlsx)</p>
        </div>
        <div class="mb-4 text-center">
            <button onclick="downloadTemplate('${type}')" class="text-xs text-indigo-600 hover:text-indigo-800 underline font-bold mb-3 block w-full text-center"><i class="fas fa-download mr-1"></i> Download Template ${type}</button>
            <p class="text-xs text-gray-500 mb-2">Pastikan format kolom sesuai template.</p>
        </div>
        <input type="file" id="importFile" accept=".xlsx, .xls" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4"/>
        <button onclick="processImport('${type}')" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition">Upload & Proses</button>
    </div>`;
}

function createSiswaImportModal() {
    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden animate-fade-in">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-file-excel"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Import Data Siswa</h3>
            <p class="text-xs text-gray-500 mt-1">Pilih format file sumber siswa</p>
        </div>
        <label class="block text-xs font-bold text-gray-700 mb-1">Jenis Import</label>
        <select id="studentImportMode" onchange="toggleStudentImportMode(this.value)" class="w-full border border-gray-300 rounded-lg text-sm p-3 mb-4">
            <option value="dapodik">Import Excel Dapodik</option>
            <option value="system">Import Template Sistem</option>
        </select>
        <div id="systemTemplateDownload" class="hidden mb-4 text-center">
            <button onclick="downloadTemplate('Siswa')" class="text-xs text-indigo-600 hover:text-indigo-800 underline font-bold"><i class="fas fa-download mr-1"></i>Download Template Sistem</button>
            <p class="text-xs text-gray-500 mt-2">Gunakan nama kolom sesuai template yang diunduh.</p>
        </div>
        <p id="dapodikImportHint" class="text-xs text-gray-500 mb-3">Kolom Dapodik seperti Nama, NISN, Jenis Kelamin, Kelas, dan Alamat akan dipetakan otomatis.</p>
        <input type="file" id="importFile" accept=".xlsx, .xls" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4"/>
        <button onclick="processImport('Siswa')" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition">Upload & Proses</button>
    </div>`;
}

function toggleStudentImportMode(mode) {
    const template = document.getElementById('systemTemplateDownload');
    const hint = document.getElementById('dapodikImportHint');
    if (template) template.classList.toggle('hidden', mode !== 'system');
    if (hint) hint.classList.toggle('hidden', mode === 'system');
}

function normalizeImportKey(value) {
    return String(value || '').toLowerCase().replace(/[\s_\-./()]+/g, '');
}

function cleanUserText(value) {
    return String(value ?? '').replace(/^'+/, '').replace(/'+$/g, '').trim();
}

function normalizeGender(value) {
    const text = cleanUserText(value).toLowerCase();
    if (!text) return 'Laki-laki';
    if (text === 'l' || text.includes('laki')) return 'Laki-laki';
    if (text === 'p' || text.includes('perempuan')) return 'Perempuan';
    if (text.includes('perempuan')) return 'Perempuan';
    return text.includes('laki') ? 'Laki-laki' : 'Perempuan';
}

function normalizeNisn(value) {
    let text = String(value ?? '').trim().replace(/^'+/, '').replace(/\.0$/, '');
    if (/e\+/i.test(text)) {
        const numeric = Number(text);
        if (Number.isFinite(numeric)) text = String(Math.trunc(numeric));
    }
    text = text.replace(/\D/g, '');
    return text ? text.padStart(10, '0') : '';
}

function formatParentName(value) {
    return cleanUserText(value).toLowerCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function readStudentWorkbookRows(sheet, mode) {
    if (mode !== 'dapodik') {
        return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    }

    // Dapodik exports may place report titles above the actual header row.
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    let headerRow = 0;
    for (let index = 0; index < Math.min(matrix.length, 30); index++) {
        const keys = matrix[index].map(normalizeImportKey);
        const hasName = keys.some(key => key === 'nama' || key.includes('namapesertadidik') || key.includes('namasiswa'));
        const hasNisn = keys.some(key => key === 'nisn' || key.includes('nomorinduksiswanasional'));
        if (hasName && hasNisn) {
            headerRow = index;
            break;
        }
    }
    const header = matrix[headerRow] || [];
    const subHeader = matrix[headerRow + 1] || [];
    const subHeaderKeys = subHeader.map(normalizeImportKey);
    const looksLikeHeader = subHeaderKeys.some(key => key === 'nisn' || key === 'jk' || key === 'jeniskelamin' || key.includes('nama'));
    const groupedHeaders = [];
    let group = '';
    header.forEach((value, index) => {
        const top = String(value || '').trim();
        if (top) group = top;
        const sub = String(subHeader[index] || '').trim();
        if (group && sub && /data ayah|data ibu|data wali/i.test(group)) {
            groupedHeaders[index] = `${group} ${sub}`;
        } else {
            groupedHeaders[index] = top || sub;
        }
    });
    const firstDataRow = looksLikeHeader ? headerRow + 2 : headerRow + 1;
    return matrix.slice(firstDataRow).filter(row => row.some(value => String(value || '').trim() !== '')).map(row => {
        const item = {};
        groupedHeaders.forEach((key, index) => { if (key) item[key] = row[index] ?? ''; });
        return item;
    });
}

function excelDateToISO(value) {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (/^\d+(\.\d+)?$/.test(String(value))) {
        const date = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000);
        return date.toISOString().slice(0, 10);
    }
    return String(value);
}

function mapDapodikStudent(row) {
    const values = {};
    Object.entries(row).forEach(([key, value]) => { values[normalizeImportKey(key)] = value; });
    const pick = (...keys) => {
        for (const key of keys) {
            const value = values[normalizeImportKey(key)];
            if (value !== undefined && value !== '') return value;
        }
        return '';
    };
    const addressParts = [
        pick('alamat'), pick('rt') ? `RT ${pick('rt')}` : '', pick('rw') ? `RW ${pick('rw')}` : '',
        pick('dusun'), pick('kelurahan'), pick('kecamatan'), pick('kode pos')
    ].filter(Boolean);
    const mapped = {
        nama: cleanUserText(pick('nama', 'nama peserta didik', 'nama siswa')).toUpperCase(),
        nisn: normalizeNisn(pick('nisn', 'nomor induk siswa nasional')),
        jenisKelamin: normalizeGender(pick('jenisKelamin', 'jenis kelamin', 'jk')),
        kelas: cleanUserText(pick('rombel saat ini', 'rombelsaatini', 'rombel', 'rombongan belajar', 'kelas')),
        status: 'aktif',
        tanggalLahir: excelDateToISO(pick('tanggalLahir', 'tanggal lahir', 'tanggal lahir peserta didik')),
        agama: cleanUserText(pick('agama')),
        namaAyah: formatParentName(pick('data ayah nama', 'dataayahnama', 'namaAyah', 'nama ayah')),
        namaIbu: formatParentName(pick('data ibu nama', 'dataibunama', 'namaIbu', 'nama ibu')),
        noHp: cleanUserText(pick('noHp', 'no hp', 'nomor handphone', 'nomor hp')),
        email: cleanUserText(pick('email', 'email peserta didik', 'alamat email')),
        alamat: addressParts.join(', ')
    };
    return {
        ...mapped,
        jenis_kelamin: mapped.jenisKelamin,
        jk: mapped.jenisKelamin,
        tanggal_lahir: mapped.tanggalLahir,
        nama_ayah: mapped.namaAyah,
        nama_ibu: mapped.namaIbu,
        no_hp: mapped.noHp,
        email: mapped.email
    };
}

function mapSystemStudent(row) {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => { normalized[normalizeImportKey(key)] = value; });
    const get = key => normalized[normalizeImportKey(key)] || '';
    const rawGender = get('jenisKelamin') || get('jk') || get('jenis kelamin');
    const genderValue = normalizeGender(rawGender);
    return {
        nama: cleanUserText(get('nama')).toUpperCase(),
        nisn: normalizeNisn(get('nisn')),
        jenisKelamin: genderValue,
        jenis_kelamin: genderValue,
        tanggalLahir: get('tanggalLahir'),
        tanggal_lahir: get('tanggalLahir'),
        agama: cleanUserText(get('agama')),
        namaAyah: formatParentName(get('namaAyah')),
        nama_ayah: formatParentName(get('namaAyah')),
        namaIbu: formatParentName(get('namaIbu')),
        nama_ibu: formatParentName(get('namaIbu')),
        noHp: cleanUserText(get('noHp')),
        no_hp: cleanUserText(get('noHp')),
        email: cleanUserText(get('email')),
        kelas: cleanUserText(get('kelas')),
        alamat: cleanUserText(get('alamat')),
        status: cleanUserText(get('status')) || 'aktif'
    };
}

function downloadTemplate(type) {
    let headers = [], fileName = "";
    if (type === 'Siswa') { headers = [["nama", "nisn", "jenisKelamin", "tanggalLahir", "agama", "namaAyah", "namaIbu", "noHp", "email", "kelas", "alamat"]]; fileName = "Template_Import_Siswa.xlsx"; }
    else if (type === 'Guru') { headers = [["namaPegawai", "statusPegawai", "jenisKelamin", "username", "password", "kelas"]]; fileName = "Template_Import_Guru.xlsx"; }
    else if (type === 'Pelanggaran') { headers = [["namaPelanggaran", "kategori", "poin"]]; fileName = "Template_Import_Pelanggaran.xlsx"; }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
}

function processImport(type) {
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) { showAlert('error', 'Pilih file terlebih dahulu'); return; }
    showLoading();
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const importMode = type === 'Siswa' ? (document.getElementById('studentImportMode')?.value || 'system') : 'system';
        const jsonData = type === 'Siswa'
            ? readStudentWorkbookRows(firstSheet, importMode)
            : XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: '' });

        try {
            let res;
            if (type === 'Siswa') {
                const mode = importMode;
                const mappedData = mode === 'dapodik' ? jsonData.map(mapDapodikStudent) : jsonData.map(mapSystemStudent);
                const validRows = mappedData.filter(row => row.nama && /^\d{10}$/.test(String(row.nisn || '').trim()) && row.kelas);
                const invalidRows = mappedData.length - validRows.length;
                if (!validRows.length) {
                    hideLoading();
                    showAlert('error', 'Tidak ada data yang valid. Nama, NISN wajib 10 digit, dan Kelas harus tersedia.');
                    return;
                }
                res = await fetchAPI('importSiswaBulk', { arr: validRows });
                hideLoading(); closeModal();
                if (res.success) { tableState.siswa.fullData = []; loadDataSiswa(); showAlert('success', `${res.message}${invalidRows ? ` ${invalidRows} baris dilewati karena data wajib tidak valid.` : ''}`); }
                else { showAlert('error', res.message); }
            } else if (type === 'Guru') {
                res = await fetchAPI('importGuruBulk', { arr: jsonData });
                hideLoading(); closeModal();
                if (res.success) { tableState.guru.fullData = []; loadDataGuru(); showAlert('success', res.message); }
                else { showAlert('error', res.message); }
            } else if (type === 'Pelanggaran') {
                res = await fetchAPI('importPelanggaranBulk', { token: currentUser.token, arr: jsonData });
                hideLoading(); closeModal();
                if (res.success) { tableState.pelanggaran.fullData = []; loadMasterPelanggaran(); showAlert('success', res.message); }
                else { showAlert('error', res.message); }
            }
        } catch (err) { hideLoading(); showAlert('error', err); }
    };
    reader.readAsArrayBuffer(file);
}

// LOGIKA CRUD GURU
async function saveGuru(e, isEdit) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan...';

    const fd = new FormData(form);
    const username = cleanUserText(fd.get('username'));
    const password = cleanUserText(fd.get('password'));
    const namaPegawai = cleanUserText(fd.get('namaPegawai')).toUpperCase();
    const kelas = cleanUserText(fd.get('kelas'));
    const jenisKelamin = normalizeGender(fd.get('jenisKelamin'));
    const token = currentUser ? currentUser.token : null;

    try {
        let r;
        if (isEdit) {
            r = await fetchAPI('updateGuru', { token: token, oldUsername: fd.get('oldUsername'), username: username, password: password, kelas: kelas, namaPegawai: namaPegawai, statusPegawai: fd.get('statusPegawai'), jenisKelamin: jenisKelamin });
        } else {
            r = await fetchAPI('addGuru', { token: token, username: username, password: password, kelas: kelas, namaPegawai: namaPegawai, statusPegawai: fd.get('statusPegawai'), jenisKelamin: jenisKelamin });
        }

        btn.disabled = false;
        btn.innerHTML = originalText;

        if (r && r.success) {
            closeModal();
            tableState.guru.fullData = [];
            loadDataGuru();
            showAlert('success', isEdit ? 'Data guru berhasil diperbarui' : 'Akun Guru berhasil dibuat');
        } else {
            let msg = r ? r.message : 'Terjadi kesalahan';
            if (String(msg).includes('UNIQUE constraint failed: guru.username')) {
                msg = 'Username telah digunakan, harap ganti lainnya.';
            }
            showAlert('error', msg);
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        let msg = String(error);
        if (msg.includes('UNIQUE constraint failed: guru.username')) {
            msg = 'Username telah digunakan, harap ganti lainnya.';
            showAlert('error', msg);
        } else {
            showAlert('error', 'Gagal koneksi server: ' + msg);
        }
    }
}

async function deleteGuruConfirm(username) {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Hapus akses untuk guru/admin: ${username}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            const token = currentUser ? currentUser.token : null;
            try {
                const r = await fetchAPI('deleteGuru', { token: token, username: username });
                hideLoading();
                if (r.success) {
                    tableState.guru.fullData = [];
                    loadDataGuru();
                    showAlert('success', 'Akun guru berhasil dihapus');
                } else {
                    showAlert('error', r.message);
                }
            } catch (error) {
                hideLoading();
                showAlert('error', 'Gagal menghapus: ' + error);
            }
        }
    });
}

function showAddGuruModal() { showModal(createGuruModal()); }
function editGuru(guruData) { showModal(createGuruModal(guruData)); }

function createGuruModal(guru = null) {
    const isEdit = guru !== null;
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 transition-all mb-4";

    let kelasOptions = '<option value="">-- Pilih Kelas (Opsional) --</option>';
    if (existingClasses && existingClasses.length > 0) {
        existingClasses.forEach(k => {
            const selected = (guru && guru.kelas === k) ? 'selected' : '';
            kelasOptions += `<option value="${k}" ${selected}>${k}</option>`;
        });
    }

    const cleanGuruName = cleanUserText(guru?.nama || '').toUpperCase();
    const cleanGuruUsername = cleanUserText(guru?.username || '');
    // Password tidak ditampilkan (biarkan kosong)

    return `
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative overflow-hidden">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-chalkboard-teacher"></i></div>
            <h3 class="font-bold text-xl text-gray-800">${isEdit ? 'Edit Akun Guru' : 'Tambah Guru'}</h3>
        </div>
        <form onsubmit="saveGuru(event, ${isEdit})" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Nama Pegawai</label>
                <input name="namaPegawai" oninput="this.value=this.value.toUpperCase()" value="${cleanGuruName}" placeholder="Nama lengkap pegawai" required class="${inputClass}"></div>
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Status Pegawai</label>
                <select name="statusPegawai" class="${inputClass}">
                <option value="Guru" ${(guru?.status_pegawai || 'Guru') === 'Guru' ? 'selected' : ''}>Guru</option>
                <option value="Tendik" ${guru?.status_pegawai === 'Tendik' ? 'selected' : ''}>Tendik</option>
                </select></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Username</label>
                <input name="username" value="${cleanGuruUsername}" placeholder="Username" required class="${inputClass}"></div>
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password</label>
                <input name="password" value="" placeholder="${isEdit ? '(Kosongkan jika tidak diubah)' : 'Password'}" ${isEdit ? '' : 'required'} class="${inputClass}"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Jenis Kelamin</label>
                <select name="jenisKelamin" class="${inputClass}">
                <option value="Laki-laki" ${(guru?.jenis_kelamin || guru?.jenisKelamin) === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                <option value="Perempuan" ${(guru?.jenis_kelamin || guru?.jenisKelamin) === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                </select></div>
                <div><label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Wali Kelas Untuk</label>
                <select name="kelas" class="${inputClass}">${kelasOptions}</select></div>
            </div>
            <p class="text-[10px] text-gray-400">Jika dipilih, guru hanya bisa melihat siswa di kelas ini.</p>
            ${isEdit ? `<input type="hidden" name="oldUsername" value="${guru.username}">` : ''}
            <div class="flex gap-3 mt-2">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan</button>
            </div>
        </form>
    </div>`;
}

async function changeAdminPass(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const token = currentUser ? currentUser.token : null;

    const newPass = String(fd.get('newPass') || '');
    const confirmPass = String(fd.get('confirmPass') || '');
    if (newPass.length < 6) {
        showAlert('error', 'Password minimal 6 karakter');
        return;
    }
    if (newPass !== confirmPass) {
        showAlert('error', 'Konfirmasi password tidak sama');
        return;
    }
    showLoading();
    try {
        const res = await fetchAPI('changeAdminPassword', {
            token: token,
            username: currentUser.username,
            newPass: newPass
        });
        hideLoading();
        if (res.success) {
            e.target.reset();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) { hideLoading(); }
}

function showChangeGuruPassModal(username) {
    showModal(`
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-key"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Reset Password</h3>
            <p class="text-xs text-gray-500 mt-1">Guru: <b>${username}</b></p>
        </div>
        <form onsubmit="saveGuruPass(event, '${username}')">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Baru</label>
            <input type="text" name="newPass" required placeholder="Minimal 6 karakter" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all mb-4">
            <div class="flex gap-3 mt-4">
                <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button>
                <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">Simpan</button>
            </div>
        </form>
    </div>`);
}

async function saveGuruPass(e, username) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newPass = fd.get('newPass');
    const token = currentUser ? currentUser.token : null;

    if (newPass.length < 6) {
        showAlert('error', 'Password terlalu pendek');
        return;
    }
    showLoading();
    try {
        const res = await fetchAPI('resetGuruPassword', { token: token, username: username, newPass: newPass });
        hideLoading();
        if (res.success) {
            closeModal();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) { hideLoading(); }
}

// LOGIKA CRUD SISWA
async function saveSiswa(e, isEdit) {
    e.preventDefault();
    showLoading();

    const fd = new FormData(e.target);
    let tgl = fd.get('tanggalLahir');

    const toTitleCase = (str) => {
        if (!str) return '';
        return String(str).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const siswaData = {
        nama: fd.get('nama') ? cleanUserText(fd.get('nama')).toUpperCase() : '',
        nisn: normalizeNisn(fd.get('nisn')),
        jenisKelamin: normalizeGender(fd.get('jenisKelamin')),
        tanggalLahir: tgl,
        agama: cleanUserText(fd.get('agama')),
        namaAyah: toTitleCase(cleanUserText(fd.get('namaAyah'))),
        namaIbu: toTitleCase(cleanUserText(fd.get('namaIbu'))),
        noHp: cleanUserText(fd.get('noHp')),
        email: cleanUserText(fd.get('email')),
        kelas: cleanUserText(fd.get('kelas')),
        alamat: cleanUserText(fd.get('alamat'))
    };

    const token = currentUser ? currentUser.token : null;

    try {
        let res;
        if (isEdit) {
            res = await fetchAPI('updateSiswa', { token: token, oldNisn: fd.get('oldNisn'), siswa: siswaData });
        } else {
            res = await fetchAPI('addSiswa', { token: token, siswa: siswaData });
        }

        hideLoading();
        if (res.success) {
            closeModal();
            tableState.siswa.fullData = [];
            loadDataSiswa();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    } catch (err) {
        hideLoading();
        showAlert('error', 'Terjadi kesalahan: ' + err);
    }
}

function deleteSiswaConfirm(nisn, nama) {
    Swal.fire({
        title: 'Hapus Permanen?',
        text: `Data siswa "${nama}" beserta SEMUA riwayat absensi dan pelanggaran akan DIHAPUS PERMANEN dan tidak dapat dikembalikan. Lanjutkan?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus Permanen!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            const token = currentUser.token;
            try {
                const r = await fetchAPI('deleteSiswa', { token: token, nisn: nisn });
                hideLoading();
                if (r.success) {
                    tableState.siswa.fullData = [];
                    tableState.siswaNonaktif.fullData = [];
                    // Reload appropriate view based on current active view
                    const activeView = document.querySelector('.view-section:not(.hidden)').id;
                    if (activeView === 'view-data-siswa-nonaktif') {
                        loadDataSiswaNonaktif();
                    } else {
                        loadDataSiswa();
                    }
                    Swal.fire({ icon: 'success', title: 'Berhasil', text: r.message, showConfirmButton: false, timer: 1500 });
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: r.message });
                }
            } catch (error) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Kesalahan', text: error.message });
            }
        }
    });
}

function toggleStatusSiswaConfirm(nisn, newStatus) {
    closeModal();
    const isAktifkan = newStatus === 'aktif';
    const actionText = isAktifkan ? 'mengaktifkan' : 'menonaktifkan';

    Swal.fire({
        title: 'Konfirmasi',
        text: `Apakah Anda yakin ingin ${actionText} siswa ini?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: isAktifkan ? '#10B981' : '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Lanjutkan!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                // [FIX] Gunakan nama action yang sesuai backend dan sertakan token admin
                const action = newStatus === 'aktif' ? 'aktifkanSiswa' : 'nonaktifkanSiswa';
                const r = await fetchAPI(action, { token: currentUser.token, nisn: nisn });
                hideLoading();
                if (r.success) {
                    // Reset cache so they are fetched again
                    tableState.siswa.fullData = [];
                    tableState.siswaNonaktif.fullData = [];
                    if (isAktifkan) {
                        loadDataSiswaNonaktif();
                    } else {
                        loadDataSiswa();
                    }
                    Swal.fire({ icon: 'success', title: 'Berhasil', text: r.message, showConfirmButton: false, timer: 1500 });
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: r.message });
                }
            } catch (error) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Kesalahan', text: error.message });
            }
        }
    });
}

function resetPasswordSiswaConfirm(nisn, nama) {
    Swal.fire({
        title: 'Reset Password?',
        text: `Yakin ingin reset password ${nama} menjadi standar "123456"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Reset!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                const r = await fetchAPI('resetSiswaPassword', { token: currentUser.token, nisn: nisn });
                hideLoading();
                if (r.success) { Swal.fire('Berhasil!', r.message, 'success'); }
                else { Swal.fire('Gagal!', r.message, 'error'); }
            } catch (err) {
                hideLoading(); Swal.fire('Error', err.toString(), 'error');
            }
        }
    });
}

function viewSiswa(siswa) { showModal(createViewSiswaModal(siswa)); }
function showAddSiswaModal() { showModal(createSiswaModal()); }
function editSiswa(s) { showModal(createSiswaModal(s)); }

function createViewSiswaModal(s) {
    s.tanggalLahir = s.tanggalLahir || s.tanggal_lahir;
    s.namaAyah = s.namaAyah || s.nama_ayah;
    s.namaIbu = s.namaIbu || s.nama_ibu;
    s.noHp = s.noHp || s.no_hp;
    s.email = s.email || '';
    const item = (label, value, icon) => `
    <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
        <div class="flex items-center gap-2 mb-1">
            <i class="fas ${icon} text-gray-400 text-xs"></i>
            <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">${label}</span>
        </div>
        <div class="text-sm font-bold text-gray-800 break-words">${value || '-'}</div>
    </div>`;

    return `
    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full animate-fade-in relative">
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-start">
            <div class="flex gap-4 items-center">
                <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-inner">${s.nama.charAt(0)}</div>
                <div>
                    <h3 class="text-xl font-bold tracking-tight">${s.nama}</h3>
                    <p class="opacity-90 text-sm flex items-center gap-2">
                        <i class="far fa-id-card"></i> ${s.nisn} 
                        <span class="bg-white/20 px-2 py-0.5 rounded text-xs font-bold ml-2">${s.kelas}</span>
                    </p>
                </div>
            </div>
            <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">
            <div class="mb-6">
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-user-circle"></i> Data Pribadi</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${item('Jenis Kelamin', s.jenisKelamin, 'fa-venus-mars')}
                    ${item('Tanggal Lahir', s.tanggalLahir, 'fa-birthday-cake')}
                    ${item('Agama', s.agama, 'fa-pray')}
                    ${item('No. Handphone', s.noHp, 'fa-phone')}
                    ${item('Email', s.email, 'fa-envelope')}
                </div>
            </div>
            <div class="mb-6">
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-users"></i> Data Orang Tua</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${item('Nama Ayah', s.namaAyah, 'fa-male')}
                    ${item('Nama Ibu', s.namaIbu, 'fa-female')}
                </div>
            </div>
            <div>
                <h4 class="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Alamat Lengkap</h4>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-3 items-start">
                    <i class="fas fa-home text-gray-400 mt-1"></i>
                    <p class="text-sm text-gray-700 leading-relaxed font-medium">${s.alamat || 'Alamat belum diisi.'}</p>
                </div>
            </div>
        </div>
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-2 items-center">
            <div>
                ${s.status === 'nonaktif'
            ? `<button onclick="toggleStatusSiswaConfirm('${s.nisn}', 'aktif')" class="px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-200 transition"><i class="fas fa-check-circle mr-2"></i>Aktifkan Siswa</button>`
            : `<button onclick="toggleStatusSiswaConfirm('${s.nisn}', 'nonaktif')" class="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-200 transition"><i class="fas fa-ban mr-2"></i>Nonaktifkan Siswa</button>`
        }
            </div>
            <button onclick="closeModal()" class="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition">Tutup</button>
        </div>
    </div>`;
}

function createSiswaModal(s = null) {
    if (s) {
        s.tanggalLahir = s.tanggalLahir || s.tanggal_lahir || '';
        s.namaAyah = s.namaAyah || s.nama_ayah || '';
        s.namaIbu = s.namaIbu || s.nama_ibu || '';
        s.noHp = s.noHp || s.no_hp || '';
        s.email = s.email || '';
    }
    const isEdit = s !== null;
    const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-all";
    const labelClass = "block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide";
    const safeNama = cleanUserText(s?.nama || '').toUpperCase();
    const safeNisn = cleanUserText(s?.nisn || '');
    const safeNoHp = cleanUserText(s?.noHp || '');
    const safeAyah = cleanUserText(s?.namaAyah || '');
    const safeIbu = cleanUserText(s?.namaIbu || '');
    const safeAlamat = cleanUserText(s?.alamat || '');
    const safeEmail = cleanUserText(s?.email || '');
    const safeKelas = cleanUserText(s?.kelas || '');

    return `
    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
        </div>
        <div class="p-6 max-h-[75vh] overflow-y-auto">
            <form onsubmit="saveSiswa(event, ${isEdit})" class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="md:col-span-2 md:col-start-2 md:row-start-1">
                        <label class="${labelClass}">Nama Lengkap</label>
                        <input type="text" name="nama" value="${safeNama}" oninput="this.value=this.value.toUpperCase()" required class="${inputClass}" placeholder="Sesuai Akta Kelahiran">
                    </div>
                    <div class="md:col-span-1 md:col-start-1 md:row-start-1">
                        <label class="${labelClass}">NISN</label>
                        <input type="text" inputmode="numeric" pattern="[0-9]*" onblur="padNisn(this)" name="nisn" value="${safeNisn}" required ${isEdit ? 'readonly class="' + inputClass + ' opacity-60 cursor-not-allowed"' : `class="${inputClass}"`} placeholder="Nomor Induk">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label class="${labelClass}">Jenis Kelamin</label>
                        <select name="jenisKelamin" class="${inputClass}">
                            <option value="Laki-laki" ${normalizeGender(s?.jenisKelamin) === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                            <option value="Perempuan" ${normalizeGender(s?.jenisKelamin) === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                        </select>
                    </div>
                    <div>
                        <label class="${labelClass}">Tanggal Lahir</label>
                        <input type="date" name="tanggalLahir" value="${s?.tanggalLahir || ''}" required class="${inputClass}">
                    </div>
                    <div class="relative group">
                        <label class="${labelClass}">Kelas</label>
                        <input type="text" name="kelas" id="inputKelas" value="${safeKelas}" required class="${inputClass}" placeholder="Ketik atau pilih kelas" autocomplete="off" onfocus="openKelasDropdown()" oninput="filterKelasDropdown(this.value)" onblur="closeKelasDropdown()">
                        <div id="dropdownKelasList" class="hidden absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1 scrollbar-hide"></div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label class="${labelClass}">Agama</label>
                        <select name="agama" class="${inputClass}">
                            <option value="Islam" ${s?.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                            <option value="Kristen" ${s?.agama === 'Kristen' ? 'selected' : ''}>Kristen</option>
                            <option value="Katolik" ${s?.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                            <option value="Hindu" ${s?.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                            <option value="Buddha" ${s?.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
                            <option value="Lainnya" ${s?.agama === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="${labelClass}">No. Handphone</label>
                        <input type="tel" name="noHp" value="${safeNoHp}" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Email</label>
                        <input type="email" name="email" value="${safeEmail}" class="${inputClass}" placeholder="nama@contoh.com">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                        <label class="${labelClass}">Nama Ayah</label>
                        <input type="text" name="namaAyah" value="${safeAyah}" onblur="this.value=formatParentName(this.value)" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Nama Ibu</label>
                        <input type="text" name="namaIbu" value="${safeIbu}" onblur="this.value=formatParentName(this.value)" class="${inputClass}">
                    </div>
                </div>
                <div>
                    <label class="${labelClass}">Alamat Lengkap</label>
                    <textarea name="alamat" rows="2" class="${inputClass}">${safeAlamat}</textarea>
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    ${isEdit ? `<button type="button" onclick="resetPasswordSiswaConfirm('${s.nisn}', '${String(s.nama || '').replace(/'/g, "\\'")}')" class="px-6 py-2.5 rounded-xl text-purple-700 bg-purple-50 font-bold hover:bg-purple-100 transition"><i class="fas fa-key mr-2"></i>Reset Password</button>` : ''}
                    <button type="button" onclick="closeModal()" class="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition">Batal</button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition transform active:scale-95">Simpan Data</button>
                </div>
                ${isEdit ? `<input type="hidden" name="oldNisn" value="${s.nisn}">` : ''}
            </form>
        </div>
    </div>`;
}

// LOGIKA DASHBOARD SISWA
async function loadSiswaDashboard() {
    stopAndBack(false);
    setActiveMenu('Dashboard');
    showView('view-siswa-dashboard');

    try {
        if (currentUser) {
            const fullName = currentUser.nama ? currentUser.nama : 'Siswa';
            document.getElementById('dashGreeting').textContent = fullName;
            document.getElementById('profileNameSidebar').textContent = currentUser.nama;
            document.getElementById('profileNisnSidebar').textContent = currentUser.nisn;
            document.getElementById('profileKelasSidebar').textContent = currentUser.kelas;

            let tglLahir = currentUser.tanggalLahir || currentUser.tanggal_lahir || '-';
            if (tglLahir && tglLahir.includes("T")) {
                tglLahir = new Date(tglLahir).toLocaleDateString('id-ID');
            }

            document.getElementById('profileJKSidebar').textContent = currentUser.jenisKelamin || currentUser.jenis_kelamin || '-';
            document.getElementById('profileLahirSidebar').textContent = tglLahir || '-';
        }
        document.getElementById('dashDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { }

    try {
        const cached = localStorage.getItem('cache_siswa_absensi_today');
        if (cached) {
            try { renderAbsensiTodaySiswa(JSON.parse(cached)); } catch (e) { }
        }

        const result = await fetchAPI('getAbsensiToday', { nisn: currentUser.nisn });
        if (result) {
            localStorage.setItem('cache_siswa_absensi_today', JSON.stringify(result));
            if (!cached || JSON.stringify(result) !== cached) {
                renderAbsensiTodaySiswa(result);
            }
        }
    } catch (error) { }
}

function renderAbsensiTodaySiswa(result) {
    if (!result) return;
    const absensi = result.success ? result.data : null;
    window.currentAbsensi = absensi;
    const isLibur = result.isLibur;
    const infoLibur = result.keteranganLibur;
    const isWFH = result.isWFH;

    const elHero = document.getElementById('heroCard');
    const elBadge = document.getElementById('dashStatusBadge');
    const elValMasuk = document.getElementById('valMasuk');
    const elValPulang = document.getElementById('valPulang');
    const elAlert = document.getElementById('alertBelumAbsen');
    const labelMasuk = document.getElementById('labelMasuk');
    const labelPulang = document.getElementById('labelPulang');

    const boxMasuk = document.getElementById('boxMasuk');
    const boxPulang = document.getElementById('boxPulang');
    const statusMasuk = document.getElementById('statusMasuk');
    const statusPulang = document.getElementById('statusPulang');
    
    const valStatusHariIni = document.getElementById('valStatusHariIni');
    const containerBuktiDukung = document.getElementById('containerBuktiDukung');
    
    // Default values
    if(valStatusHariIni) {
        valStatusHariIni.textContent = "BELUM ABSEN";
        valStatusHariIni.className = "font-bold text-lg text-center tracking-tight mb-1 text-slate-400";
    }
    if(containerBuktiDukung) containerBuktiDukung.classList.add('hidden');

    boxPulang.style.display = 'block';
    boxMasuk.classList.remove('col-span-2');
    statusMasuk.textContent = "";
    statusMasuk.className = "text-[10px] text-center font-bold tracking-wider whitespace-normal break-words";
    statusPulang.textContent = "";
    statusPulang.className = "text-[10px] text-center font-bold tracking-wider whitespace-normal break-words";

    let ketPagi = ""; let ketSore = "";
    let urlBuktiDukung = "";

    if (absensi && absensi.keterangan) {
        let textKet = absensi.keterangan;
        if (isWFH) {
            if (textKet.includes("PAGI:")) ketPagi = textKet.split("PAGI:")[1].split("|")[0].trim();
            if (textKet.includes("SORE:")) ketSore = textKet.split("SORE:")[1].split("|")[0].trim();
        } else {
            if (textKet.startsWith("Surat:")) {
                let parts = textKet.split("Surat: ");
                urlBuktiDukung = parts[1].trim();
            } else if (textKet.includes("&")) {
                let parts = textKet.split("&");
                ketPagi = parts[0].trim(); ketSore = parts[1].trim();
            } else if (textKet.includes("Pulang")) {
                ketPagi = "Tepat Waktu"; ketSore = textKet.trim();
            } else {
                ketPagi = textKet.trim();
            }
        }

    }

    if (isLibur) {
        elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-red-800 p-6 text-white shadow-xl shadow-rose-200 transition-all duration-500 group";
        elBadge.innerHTML = `<i class="fas fa-calendar-times mr-2"></i> HARI LIBUR`;
        labelMasuk.innerHTML = "KETERANGAN";
        elValMasuk.innerHTML = `<span class="text-sm font-bold uppercase tracking-widest">${infoLibur}</span>`;
        boxPulang.style.display = 'none';
        boxMasuk.classList.add('col-span-2');
        elAlert.classList.add('hidden');
        return;
    }

    if (isWFH) {
        labelMasuk.innerHTML = "JAM PAGI";
        labelPulang.innerHTML = "JAM SORE";

        if (!absensi) {
            elHero.className = "relative overflow-hidden rounded-3xl bg-slate-800 p-6 text-white shadow-xl shadow-slate-200 transition-all duration-500 group";
            elBadge.className = "px-4 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-200 text-xs font-bold shadow-sm animate-pulse";
            elBadge.innerHTML = `<i class="fas fa-circle text-[8px] mr-2"></i> BELUM ABSEN PAGI`;
            elValMasuk.textContent = "--:--";
            elValPulang.textContent = "--:--";

            elAlert.innerHTML = `
                <div class="bg-white p-2 rounded-full text-indigo-500 shadow-sm"><i class="fas fa-camera-retro"></i></div>
                <div>
                    <h4 class="text-sm font-bold text-indigo-800 mb-0.5">Waktunya Presensi Pagi WFH</h4>
                    <p class="text-xs font-medium text-indigo-600/80 leading-relaxed">Ketuk menu WFH di bawah untuk melakukan perekaman kamera (Pagi).</p>
                </div>`;
            elAlert.className = "bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
            elAlert.classList.remove('hidden');
        } else {
            elValMasuk.textContent = absensi.jamDatang || "--:--";
            statusMasuk.textContent = ketPagi;

            if (!absensi.jamPulang || absensi.jamPulang === '-') {
                elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-xl shadow-amber-200 transition-all duration-500 group";
                elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm animate-pulse";
                elBadge.innerHTML = `<i class="fas fa-clock mr-2"></i> BELUM ABSEN SORE`;
                elValPulang.textContent = "--:--";

                elAlert.innerHTML = `
                    <div class="bg-white p-2 rounded-full text-orange-500 shadow-sm"><i class="fas fa-sun"></i></div>
                    <div>
                        <h4 class="text-sm font-bold text-orange-800 mb-0.5">Jangan Lupa Presensi Sore!</h4>
                        <p class="text-xs font-medium text-orange-600/80 leading-relaxed">Jika jam sore sudah tiba, ketuk menu WFH lagi. Jarak Anda maksimal 200m dari titik Pagi.</p>
                    </div>`;
                elAlert.className = "bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
                elAlert.classList.remove('hidden');
            } else {
                elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-800 p-6 text-white shadow-xl shadow-indigo-200 transition-all duration-500 group";
                elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm";
                elBadge.innerHTML = `<i class="fas fa-check-circle mr-2"></i> WFH SELESAI`;
                elValPulang.textContent = absensi.jamPulang;
                statusPulang.textContent = ketSore;
                elAlert.classList.add('hidden');
            }
        }
    }
    else {
        labelMasuk.innerHTML = "JAM DATANG";
        labelPulang.innerHTML = "JAM PULANG";

        const rawKeterangan = absensi ? String(absensi.keterangan || '') : '';
        const alasanDihapus = rawKeterangan.replace(/^\s*Bukti\s+dihapus\s*:\s*/i, '').trim();
        const isDeletedStatus = !!(absensi && (
            String(absensi.status || '').trim().toUpperCase() === 'BELUM ABSEN' ||
            rawKeterangan.toLowerCase().includes('bukti dihapus')
        ));

        if (absensi && rawKeterangan.toLowerCase().includes('bukti dihapus') && !alasanDihapus) {
            window.currentAlasanDihapus = 'Alasan penghapusan bukti tercatat pada data absensi.';
        } else if (alasanDihapus) {
            window.currentAlasanDihapus = alasanDihapus;
        }

        if (!absensi || isDeletedStatus) {
            elHero.className = "relative overflow-hidden rounded-3xl bg-slate-800 p-6 text-white shadow-xl shadow-slate-200 transition-all duration-500 group";
            elBadge.className = "px-4 py-2 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-rose-200 text-xs font-bold shadow-sm animate-pulse";
            elBadge.innerHTML = `<i class="fas fa-circle text-[8px] mr-2"></i> BELUM ABSEN`;
            elValMasuk.textContent = "--:--";
            elValPulang.textContent = "--:--";

            if (!isDeletedStatus) {
                elAlert.innerHTML = `
                    <div class="bg-white p-2 rounded-full text-rose-500 shadow-sm"><i class="fas fa-exclamation"></i></div>
                    <div>
                        <h4 class="text-sm font-bold text-rose-800 mb-0.5">Peringatan Presensi</h4>
                        <p class="text-xs font-medium text-rose-600/80 leading-relaxed">Anda belum melakukan scan presensi hari ini.</p>
                    </div>`;
                elAlert.className = "bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 items-start shadow-sm mb-6";
                elAlert.classList.remove('hidden');
            } else {
                elAlert.classList.add('hidden');
            }

            if (valStatusHariIni) {
                valStatusHariIni.textContent = 'BELUM ABSEN';
                valStatusHariIni.className = 'font-bold text-xl text-center tracking-tight mb-1 text-slate-200';
            }

            const containerAlasanDihapus = document.getElementById('containerAlasanDihapus');
            const btnAlasanDihapus = document.getElementById('btnLihatAlasanDihapus');
            if (containerAlasanDihapus) containerAlasanDihapus.classList.add('hidden');
            if (alasanDihapus) {
                window.currentAlasanDihapus = alasanDihapus;
                if (containerAlasanDihapus) containerAlasanDihapus.classList.remove('hidden');
                if (btnAlasanDihapus) btnAlasanDihapus.setAttribute('title', alasanDihapus);
            }
            if (!absensi) return;
            return;
        }

        elValMasuk.textContent = absensi.jamDatang || "--:--";
        statusMasuk.textContent = ketPagi;
        if(ketPagi.toLowerCase().includes("terlambat")) {
            statusMasuk.classList.add("text-rose-400");
        } else {
            statusMasuk.classList.add("text-emerald-400");
        }
        
        elAlert.classList.add('hidden');

        if (!absensi.jamPulang || absensi.jamPulang === '-') {
            elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white shadow-xl shadow-emerald-200 transition-all duration-500 group";
            elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm animate-pulse";
            elBadge.innerHTML = `<i class="fas fa-clock mr-2"></i> SEDANG DI SEKOLAH`;
            elValPulang.textContent = "--:--";
        } else {
            elHero.className = "relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-800 p-6 text-white shadow-xl shadow-indigo-200 transition-all duration-500 group";
            elBadge.className = "px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm";
            elBadge.innerHTML = `<i class="fas fa-check-circle mr-2"></i> SELESAI HARI INI`;
            elValPulang.textContent = absensi.jamPulang;
            statusPulang.textContent = ketSore;
            if(ketSore.toLowerCase().includes("terlambat")) {
                statusPulang.classList.add("text-rose-400");
            } else {
                statusPulang.classList.add("text-emerald-400");
            }
        }
        
        if(valStatusHariIni) {
            let statusUpper = (absensi.status || "HADIR").toUpperCase();
            valStatusHariIni.textContent = statusUpper;
            if(statusUpper === "HADIR") valStatusHariIni.className = "font-bold text-xl text-center tracking-tight mb-1 text-emerald-400";
            else if(statusUpper === "SAKIT") valStatusHariIni.className = "font-bold text-xl text-center tracking-tight mb-1 text-amber-400";
            else if(statusUpper === "IZIN") valStatusHariIni.className = "font-bold text-xl text-center tracking-tight mb-1 text-blue-400";
            else if(statusUpper === "ALPA" || statusUpper === "ALFA") valStatusHariIni.className = "font-bold text-xl text-center tracking-tight mb-1 text-rose-400";
            else valStatusHariIni.className = "font-bold text-xl text-center tracking-tight mb-1 text-white";

            const containerAlasanDihapus = document.getElementById('containerAlasanDihapus');
            const btnAlasanDihapus = document.getElementById('btnLihatAlasanDihapus');
            const alasanDihapus = String(absensi.keterangan || '').replace(/^\s*Bukti\s+dihapus\s*:\s*/i, '').trim();
            if (containerAlasanDihapus) containerAlasanDihapus.classList.add('hidden');
            if (alasanDihapus && absensi.status && absensi.status.toUpperCase() === 'BELUM ABSEN') {
                window.currentAlasanDihapus = alasanDihapus;
                if (containerAlasanDihapus) containerAlasanDihapus.classList.remove('hidden');
                if (btnAlasanDihapus) btnAlasanDihapus.setAttribute('title', alasanDihapus);
            }

            if (urlBuktiDukung && containerBuktiDukung) {
                containerBuktiDukung.classList.remove('hidden');
                window.currentBuktiDukungUrl = urlBuktiDukung;
                const btn = document.getElementById('btnBuktiDukung');
                if (btn) btn.setAttribute('data-url', urlBuktiDukung);
            }
        }
    }
}

window.lihatAlasanBuktiDihapus = function() {
    const modal = document.getElementById('modalAlasanDihapus');
    const text = document.getElementById('txtAlasanDihapus');
    const alasan = window.currentAlasanDihapus || 'Tidak ada alasan yang tercatat.';

    if (modal && text) {
        text.textContent = alasan;
        modal.classList.remove('hidden');
        setTimeout(() => {
            const content = document.getElementById('modalAlasanDihapusContent');
            if (content) content.classList.replace('scale-95', 'scale-100');
        }, 10);
    }
};

window.tutupAlasanDihapus = function() {
    const modal = document.getElementById('modalAlasanDihapus');
    if (modal) {
        const content = document.getElementById('modalAlasanDihapusContent');
        if (content) content.classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.lihatBuktiDukung = function(btnElement) {
    const modal = document.getElementById('modalBuktiDukung');
    const img = document.getElementById('imgBuktiDukung');
    const url = (btnElement && btnElement.getAttribute('data-url')) || window.currentBuktiDukungUrl;
    
    if(modal && img && url) {
        img.src = url;
        modal.classList.remove('hidden');
        setTimeout(() => {
            const content = document.getElementById('modalBuktiDukungContent');
            if(content) content.classList.replace('scale-95', 'scale-100');
        }, 10);
    } else {
        showAlert('error', `Debug: modal=${!!modal}, img=${!!img}, url=${!!window.currentBuktiDukungUrl}`);
    }
};

window.tutupBuktiDukung = function() {
    const modal = document.getElementById('modalBuktiDukung');
    if(modal) {
        const content = document.getElementById('modalBuktiDukungContent');
        if(content) content.classList.replace('scale-100', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            const img = document.getElementById('imgBuktiDukung');
            if(img) img.src = "";
        }, 300);
    }
};

async function showProfilSiswa() {
    showLoading();
    let dataSiswa = {
        nama: currentUser?.nama || '-',
        nisn: currentUser?.nisn || '-',
        kelas: currentUser?.kelas || '-',
        jenisKelamin: currentUser?.jenisKelamin || currentUser?.jenis_kelamin || '-',
        tanggalLahir: currentUser?.tanggalLahir || currentUser?.tanggal_lahir || '-'
    };
    try {
        const result = await fetchAPI('getSiswaList');
        if (result.success) {
            const findSiswa = result.data.find(s => s.nisn == currentUser.nisn);
            if (findSiswa) {
                dataSiswa = {
                    ...dataSiswa,
                    ...findSiswa,
                    jenisKelamin: findSiswa.jenisKelamin || findSiswa.jenis_kelamin || dataSiswa.jenisKelamin,
                    tanggalLahir: findSiswa.tanggalLahir || findSiswa.tanggal_lahir || dataSiswa.tanggalLahir
                };
            }
        }
    } catch (e) { }
    hideLoading();

    const modalContent = `
    <div class="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-[320px] w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0 border border-gray-100">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-rose-500 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fas fa-times"></i></button>

        <div class="text-center mb-6 mt-2">
            <div class="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-teal-50 shadow-md text-3xl">
                <i class="fas fa-user-graduate"></i>
            </div>
            <h3 class="font-bold text-lg text-gray-800 tracking-tight leading-tight">${dataSiswa.nama}</h3>
            <p class="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1.5 bg-teal-50 inline-block px-3 py-1 rounded-full border border-teal-100">Profil Siswa</p>
        </div>

        <div class="space-y-2 mb-4">
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="far fa-id-card text-teal-500 w-4 text-center mr-1"></i> NISN</span>
                <span class="text-sm font-bold text-gray-800 font-mono">${dataSiswa.nisn}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-chalkboard text-teal-500 w-4 text-center mr-1"></i> Kelas</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.kelas}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-venus-mars text-teal-500 w-4 text-center mr-1"></i> L/P</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.jenisKelamin}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span class="text-[11px] font-bold text-gray-500 uppercase"><i class="fas fa-birthday-cake text-teal-500 w-4 text-center mr-1"></i> Lahir</span>
                <span class="text-sm font-bold text-gray-800">${dataSiswa.tanggalLahir || '-'}</span>
            </div>
        </div>
        
        <button onclick="loadRekapKasus()" class="w-full mt-3 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-2 shadow-sm"><i class="fas fa-balance-scale"></i> Cek Poin Pelanggaran Disiplin
        </button>

        <button onclick="showUbahPasswordSiswaModal()" class="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 py-3 rounded-xl text-xs font-bold border border-teal-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <i class="fas fa-key"></i> Ubah Password Akun
        </button>
    </div>`;
    showModal(modalContent);
}

function showUbahPasswordSiswaModal() {
    const content = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-slide-up mx-auto mt-20 md:mt-0">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-rose-600 bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center transition"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm"><i class="fas fa-user-lock"></i></div>
            <h3 class="font-bold text-xl text-gray-800">Ubah Password</h3>
            <p class="text-xs text-gray-500 mt-1">Amankan akun presensi kamu.</p>
        </div>
        <form onsubmit="submitUbahPasswordSiswa(event)">
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Lama</label>
            <div class="relative group mb-4">
                <input type="password" id="oldPassSiswa" required class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('oldPassSiswa', 'eyeOldPass')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeOldPass"></i></button>
            </div>
            <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Password Baru</label>
            <div class="relative group mb-6">
                <input type="password" id="newPassSiswa" required minlength="6" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 transition-all">
                <button type="button" onclick="toggleInputPass('newPassSiswa', 'eyeNewPass')" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"><i class="fas fa-eye" id="eyeNewPass"></i></button>
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">Simpan Password Baru</button>
        </form>
    </div>`;
    showModal(content);
}

async function submitUbahPasswordSiswa(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPassSiswa').value;
    const newPass = document.getElementById('newPassSiswa').value;

    showLoading();
    try {
        const res = await fetchAPI('changeSiswaPassword', { token: currentUser.token, oldPass: oldPass, newPass: newPass, username: currentUser.username });
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

