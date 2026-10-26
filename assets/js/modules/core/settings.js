// ====================================
// FITUR BACKUP & RESTORE JSON FULL SYSTEM
// ====================================
async function downloadFullBackupJSON() {
    if (!currentUser || currentUser.role !== 'admin') return;

    Swal.fire({
        title: 'Mempersiapkan Backup',
        html: 'Mengemas 100% data (Master & Sharding).<br>Proses ini memakan waktu beberapa detik...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const res = await fetchAPI('exportFullDBJSON', { token: currentUser.token });
        if (res.success) {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(res.data);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadAnchorNode.setAttribute('download', 'FullBackup_SiPresdir_' + dateStr + '.json');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            Swal.fire('Sukses!', 'File Backup berhasil didownload.', 'success');
        } else {
            Swal.fire('Gagal!', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error!', e.toString(), 'error');
    }
}

function processFullRestoreJSON(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    Swal.fire({
        title: 'Peringatan Keras!',
        html: '<p class="text-sm text-red-600 font-bold mb-2">Anda akan melakukan pemulihan 100% sistem.</p><p class="text-xs text-gray-600 text-left">Seluruh data saat ini (termasuk file Sharding Absensi dan Kasus) akan <b>ditimpa</b> dengan data dari file backup yang Anda pilih.</p><p class="text-xs text-gray-600 mt-2">Pastikan ini adalah file backup yang valid.</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Timpa Data Sekarang!'
    }).then((result) => {
        if (result.isConfirmed) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const jsonContent = e.target.result;

                Swal.fire({
                    title: 'Memulihkan Sistem...',
                    html: 'Mohon JANGAN TUTUP BROWSER.<br>Skrip sedang menulis ulang ribuan baris data...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const res = await fetchAPI('restoreFullDBJSON', { token: currentUser.token, jsonData: jsonContent });
                    if (res.success) {
                        Swal.fire('Restore Berhasil!', 'Sistem telah berhasil dipulihkan secara utuh. Halaman akan dimuat ulang.', 'success').then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire('Restore Gagal', res.message, 'error');
                    }
                } catch (err) {
                    Swal.fire('Error System', err.toString(), 'error');
                }
            };
            reader.readAsText(file);
        }
        input.value = '';
    });
}


// --- [BARU] Fungsi Auto-Pad NISN 10 Digit ---
window.padNisn = function (el) {
    let val = el.value.trim();
    if (val.length > 0 && val.length < 10) {
        let diff = 10 - val.length;
        el.value = val.padStart(10, '0');
        Swal.fire({
            icon: 'info',
            title: 'Pemberitahuan NISN',
            text: 'NISN wajib 10 angka. Karena Anda hanya mengisi ' + val.length + ' angka, maka otomatis ditambah ' + diff + ' nol di depannya.',
            confirmButtonText: 'Oke'
        });
    }
}

// ==========================================
// KELOLA TEMPLATE SURAT
// ==========================================
let templateSuratFile = null;
function previewTemplateSurat(input) {
    if (input.files && input.files[0]) {
        let file = input.files[0];
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Terlalu Besar', 'Maksimal ukuran file 2 MB', 'warning');
            input.value = '';
            return;
        }
        templateSuratFile = file;
        document.getElementById('labelTemplateSurat').innerText = file.name;
    }
}

async function uploadTemplateSuratBtn(btn) {
    if (!templateSuratFile) {
        Swal.fire('Pilih File', 'Silakan pilih file template terlebih dahulu!', 'warning');
        return;
    }

    let originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
    btn.disabled = true;

    try {
        let reader = new FileReader();
        reader.readAsDataURL(templateSuratFile);
        reader.onload = async function () {
            try {
                let dataUrl = reader.result;
                const res = await fetchAPI('uploadTemplateSurat', { token: currentUser.token, fileDataUrl: dataUrl, filename: templateSuratFile.name });
                if (res.success) {
                    Swal.fire('Berhasil', 'Template Surat berhasil diupload dan disimpan!', 'success');
                    templateSuratFile = null;
                    document.getElementById('labelTemplateSurat').innerText = 'Pilih File Template';
                    document.getElementById('inputTemplateSurat').value = '';
                    if (!window.appConfig) window.appConfig = {};
                    window.appConfig.url_template_surat = res.url;

                    const actContainer = document.getElementById('actionTemplateSuratContainer');
                    const btnLihat = document.getElementById('btnLihatTemplateSurat');
                    if (actContainer && btnLihat) {
                        actContainer.classList.remove('hidden');
                        btnLihat.href = res.url;
                    }
                } else {
                    Swal.fire('Gagal', res.message || 'Terjadi kesalahan saat upload', 'error');
                }
            } catch (err) {
                Swal.fire('Error Server', err.message || err.toString(), 'error');
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        };
        reader.onerror = function (error) {
            Swal.fire('Gagal', 'Tidak dapat membaca file.', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        };
    } catch (err) {
        Swal.fire('Error', err.toString(), 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function hapusTemplateSuratBtn() {
    Swal.fire({
        title: 'Hapus Template?',
        text: "Siswa akan kembali melihat contoh format surat bawaan (default) jika template khusus ini dihapus.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading('Menghapus template...');
            try {
                const res = await fetchAPI('deleteTemplateSurat', { token: currentUser.token });
                hideLoading();
                if (res.success) {
                    Swal.fire('Terhapus', res.message, 'success');
                    if (window.appConfig) window.appConfig.url_template_surat = null;
                    const actContainer = document.getElementById('actionTemplateSuratContainer');
                    if (actContainer) actContainer.classList.add('hidden');
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            } catch (error) {
                hideLoading();
                Swal.fire('Error', error.toString(), 'error');
            }
        }
    });
}

function updateFilterKelasNonaktif() {
    const dropdown = document.getElementById('filterKelasNonaktif');
    if (!dropdown) return;
    const currentValue = dropdown.value;
    const nonaktifClasses = Array.from(new Set(
        (tableState.siswaNonaktif.fullData || [])
            .map(s => (s.kelas || '').trim())
            .filter(k => k.length > 0)
    )).sort();

    let options = '<option value="">Semua Kelas</option>';
    nonaktifClasses.forEach(kelas => {
        options += `<option value="${kelas}">${kelas}</option>`;
    });
    dropdown.innerHTML = options;
    if (currentValue && nonaktifClasses.includes(currentValue)) {
        dropdown.value = currentValue;
    } else {
        dropdown.value = '';
    }
}

async function loadDataSiswaNonaktif() {
    stopAndBack(false);
    setActiveMenu('Kelola Akun');
    showView('view-data-siswa-nonaktif');

    updateFilterKelasNonaktif();

    if (tableState.siswaNonaktif.fullData.length > 0) {
        updateFilterKelasNonaktif();
        processTableData('siswaNonaktif');
    } else {
        // [OPTIMASI KILAT] Cek apakah ada cache di local storage
        const cached = localStorage.getItem('cache_data_siswa_nonaktif');
        const masterCached = localStorage.getItem('cache_data_siswa_master');

        if (cached) {
            try {
                tableState.siswaNonaktif.fullData = JSON.parse(cached);
                updateFilterKelasNonaktif();
                processTableData('siswaNonaktif');
            } catch (e) { }
        } else if (masterCached) {
            // Coba ambil dari master cache jika ada
            try {
                const masterData = JSON.parse(masterCached);
                tableState.siswaNonaktif.fullData = masterData.filter(s => s.status === 'nonaktif');
                updateFilterKelasNonaktif();
                processTableData('siswaNonaktif');
            } catch (e) { }
        } else {
            document.getElementById('tbody-siswa-nonaktif').innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data siswa...</td></tr>';
        }

        try {
            const result = await fetchAPI('getSiswaList');
            if (result.success) {
                const nonaktifData = result.data.filter(s => s.status === 'nonaktif');

                // Simpan ke cache
                localStorage.setItem('cache_data_siswa_master', JSON.stringify(result.data));
                localStorage.setItem('cache_data_siswa_nonaktif', JSON.stringify(nonaktifData));

                if (!cached || JSON.stringify(tableState.siswaNonaktif.fullData) !== JSON.stringify(nonaktifData)) {
                    tableState.siswaNonaktif.fullData = nonaktifData;
                    updateFilterKelasNonaktif();
                    processTableData('siswaNonaktif');
                }
            } else {
                if (!cached && !masterCached) throw new Error(result.message || 'Gagal memuat data');
            }
        } catch (error) {
            if (!cached && !masterCached) {
                document.getElementById('tbody-siswa-nonaktif').innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">${error.message}</td></tr>`;
            }
        }
    }
}

function renderSiswaNonaktifRows(data, startIdx) {
    const tbody = document.getElementById('tbody-siswa-nonaktif');
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
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
        <td class="p-4 hidden sm:table-cell"><span class="px-2 py-1 bg-rose-50 text-rose-700 rounded text-xs font-bold">${siswa.kelas}</span></td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                <button onclick='viewSiswa(${JSON.stringify(siswa).replace(/'/g, "&#39;")})' class="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"><i class="fas fa-eye"></i></button>
                <button onclick="deleteSiswaConfirm('${siswa.nisn}', '${siswa.nama.replace(/'/g, "\\'")}')" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    </tr>`).join('');
}

function bulkDeleteSiswaNonaktifConfirm() {
    Swal.fire({
        title: 'Hapus Permanen Massal?',
        html: "Peringatan: Semua data siswa nonaktif beserta data terkait (absen, pelanggaran) akan dihapus secara permanen dan tidak bisa dikembalikan lagi!<br><br>Ketik <b>HAPUS</b> untuk melanjutkan:",
        input: 'text',
        inputPlaceholder: 'Ketik HAPUS di sini...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal',
        preConfirm: (inputValue) => {
            if (inputValue !== 'HAPUS') {
                Swal.showValidationMessage('Anda harus mengetik HAPUS dengan huruf kapital!');
            }
            return inputValue;
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value === 'HAPUS') {
            showLoading('Menghapus data secara massal...');
            try {
                const r = await fetchAPI('bulkDeleteSiswaNonaktif', {});
                hideLoading();
                if (r.success) {
                    if (typeof clearSiswaCache === 'function') clearSiswaCache();
                    else {
                        localStorage.removeItem('cache_data_siswa');
                        localStorage.removeItem('cache_data_siswa_master');
                        localStorage.removeItem('cache_data_siswa_nonaktif');
                        tableState.siswaNonaktif.fullData = [];
                        tableState.siswa.fullData = [];
                    }
                    await loadKelasSuggestions();
                    await loadDataSiswaNonaktif();
                    Swal.fire({ icon: 'success', title: 'Berhasil', text: r.message, showConfirmButton: false, timer: 1500 });
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            } catch (error) {
                hideLoading();
                Swal.fire('Error!', error.message, 'error');
            }
        }
    });
}

async function showBulkDeactivateModal() {
    showLoading();
    try {
        await loadKelasSuggestions();
    } catch (e) {
        console.error("Gagal memuat kelas:", e);
    }
    hideLoading();

    let options = '<option value="">Pilih Kelas</option>';
    const hasClasses = existingClasses && existingClasses.length > 0;
    if (hasClasses) {
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
    } else {
        options = '<option value="">(Tidak ada kelas dengan siswa aktif)</option>';
    }

    const modalHtml = `
    <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-fade-in relative">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                <i class="fas fa-users-slash"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800">Nonaktifkan Massal</h3>
            <p class="text-sm text-gray-500 mt-1">Pilih kelas yang siswanya akan dinonaktifkan secara massal.</p>
        </div>
        
        <div class="mb-6">
            <label class="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Pilih Kelas</label>
            <select id="bulkDeactivateClass" class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-0 outline-none transition font-medium" ${hasClasses ? '' : 'disabled'}>
                ${options}
            </select>
        </div>
        
        <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-amber-500"></i>
                </div>
                <div class="ml-3">
                    <p class="text-xs text-amber-700 font-medium">
                        <strong>Peringatan:</strong> Siswa di kelas yang sudah dinonaktifkan secara massal, hanya dapat diaktifkan kembali per siswa.
                    </p>
                </div>
            </div>
        </div>

        <div class="flex gap-3">
            <button onclick="bulkDeactivateSiswaConfirm()" class="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition shadow-sm hover:shadow-md" ${hasClasses ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"'}>
                Ya, Nonaktifkan Massal
            </button>
            <button onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                Batal
            </button>
        </div>
    </div>`;
    showModal(modalHtml);
}

function bulkDeactivateSiswaConfirm() {
    const select = document.getElementById('bulkDeactivateClass');
    const kelas = select ? select.value : '';
    if (!kelas) {
        Swal.fire({ icon: 'warning', title: 'Pilih Kelas', text: 'Silakan pilih kelas terlebih dahulu!' });
        return;
    }

    closeModal();

    Swal.fire({
        title: 'Konfirmasi Akhir',
        text: `Yakin ingin menonaktifkan SEMUA siswa di kelas ${kelas}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Nonaktifkan!',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading('Memproses nonaktifkan siswa massal...');
            try {
                const r = await fetchAPI('bulkDeactivateSiswa', { kelas: kelas });
                hideLoading();
                if (r.success) {
                    if (typeof clearSiswaCache === 'function') clearSiswaCache();
                    else {
                        localStorage.removeItem('cache_data_siswa');
                        localStorage.removeItem('cache_data_siswa_master');
                        localStorage.removeItem('cache_data_siswa_nonaktif');
                        tableState.siswa.fullData = [];
                        tableState.siswaNonaktif.fullData = [];
                    }

                    // Muat ulang daftar kelas aktif terbaru
                    await loadKelasSuggestions();

                    // Otomatis refresh data siswa aktif dari database terbaru
                    await loadDataSiswa();

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

// ============================================================
// MANAJEMEN SOP DAN DASAR HUKUM SIPRESDIR
// ============================================================

const DEFAULT_SOP_PATH = 'assets/docs/SOP_SiPreSDir_Standar.pdf';
const DEFAULT_SOP_FILENAME = 'SOP_SiPreSDir_Template_Satuan_Pendidikan.pdf';
const DEFAULT_SOP_WORD_PATH = 'assets/docs/Template_Draf_SOP_SiPreSDir.docx';
const DEFAULT_SOP_WORD_FILENAME = 'Template_Draf_SOP_SiPreSDir.docx';

const DEFAULT_DASAR_HUKUM = [
    { id: 1, jenis: "Undang-Undang", nomor: "UU No. 20 Tahun 2003", tentang: "Sistem Pendidikan Nasional", keterkaitan: "Kewajiban penumbuhan disiplin, etika, dan pembentukan karakter peserta didik di sekolah." },
    { id: 2, jenis: "Undang-Undang", nomor: "UU No. 14 Tahun 2005", tentang: "Guru dan Dosen", keterkaitan: "Tugas pokok dan fungsi guru piket harian, wali kelas, serta pembinaan disiplin peserta didik." },
    { id: 3, jenis: "Undang-Undang", nomor: "UU No. 25 Tahun 2009", tentang: "Pelayanan Publik", keterkaitan: "Transparansi, akuntabilitas, dan kepastian standar pelayanan presensi serta keterbukaan informasi." },
    { id: 4, jenis: "Undang-Undang", nomor: "UU No. 11/2008 jo. UU No. 1/2024", tentang: "Informasi dan Transaksi Elektronik (ITE)", keterkaitan: "Keabsahan pencatatan dokumen elektronik presensi dan rekam jejak poin disiplin siswa." },
    { id: 5, jenis: "Peraturan Pemerintah", nomor: "PP No. 19/2005 jo. PP No. 57/2021", tentang: "Standar Nasional Pendidikan", keterkaitan: "Standar pengelolaan pendidikan dan ketertiban lingkungan satuan pendidikan." },
    { id: 6, jenis: "Peraturan Pemerintah", nomor: "PP No. 19 Tahun 2017", tentang: "Perubahan atas PP No. 74/2008 tentang Guru", keterkaitan: "Ekuivalensi beban kerja tugas tambahan guru piket dan wali kelas." },
    { id: 7, jenis: "Permendikbud", nomor: "Permendikbud No. 23 Tahun 2015", tentang: "Penumbuhan Budi Pekerti", keterkaitan: "Pembiasaan hadir tepat waktu dan pembinaan nilai-nilai moralitas serta integritas siswa." },
    { id: 8, jenis: "Permendikbud", nomor: "Permendikbud No. 64 Tahun 2015", tentang: "Kawasan Tanpa Rokok di Lingkungan Sekolah", keterkaitan: "Penegakan sanksi dan skor poin terhadap larangan merokok / vaping di sekolah." },
    { id: 9, jenis: "Permendikbudristek", nomor: "Permendikbudristek No. 46 Tahun 2023", tentang: "Pencegahan & Penanganan Kekerasan di Satuan Pendidikan (PPKSP)", keterkaitan: "Larangan kekerasan fisik dalam pemberian sanksi dan penegakan konsekuensi edukatif ramah anak." },
    { id: 10, jenis: "PermenPAN-RB", nomor: "PermenPAN-RB No. 35 Tahun 2012", tentang: "Pedoman Penyusunan Standar Operasional Prosedur (SOP)", keterkaitan: "Format baku matriks identitas dan langkah alur operasional SOP SiPreSDir." },
    { id: 11, jenis: "Keputusan Kepala Sekolah", nomor: "SK No. [NOMOR SK KEPALA SEKOLAH]", tentang: "Tata Tertib & Sistem Presensi Mandiri Siswa", keterkaitan: "Pemberlakuan resmi aplikasi hybrid SiPreSDir dan sistem skor poin kedisiplinan berjenjang." }
];

let pendingSopPdfData = null;
let pendingSopPdfMeta = null;
let activeSopBlobUrl = null;

function base64ToBlob(base64, type = 'application/pdf') {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
}

window.hasCustomSopPdf = function() {
    return Boolean(localStorage.getItem('sipresdir_sop_pdf_data') || localStorage.getItem('sipresdir_sop_pdf_url'));
};

window.switchPengaturanTab = function(tabName) {
    const tabUmum = document.getElementById('tab-umum');
    const tabKeamanan = document.getElementById('tab-keamanan');
    const tabSOPHukum = document.getElementById('tab-sop-hukum');
    const offlinePanel = document.getElementById('offlineSettingsPanel');

    const btnUmum = document.getElementById('btn-tab-umum');
    const btnKeamanan = document.getElementById('btn-tab-keamanan');
    const btnSOPHukum = document.getElementById('btn-tab-sop-hukum');

    const allTabs = [tabUmum, tabKeamanan, tabSOPHukum, offlinePanel];
    const allBtns = [btnUmum, btnKeamanan, btnSOPHukum];

    allTabs.forEach(t => t && t.classList.add('hidden'));
    allBtns.forEach(b => {
        if (b) {
            b.classList.remove('border-indigo-600', 'text-indigo-600');
            b.classList.add('border-transparent', 'text-gray-500');
        }
    });

    if (tabName === 'umum') {
        if (tabUmum) tabUmum.classList.remove('hidden');
        if (btnUmum) {
            btnUmum.classList.add('border-indigo-600', 'text-indigo-600');
            btnUmum.classList.remove('border-transparent', 'text-gray-500');
        }
    } else if (tabName === 'keamanan') {
        if (tabKeamanan) tabKeamanan.classList.remove('hidden');
        if (btnKeamanan) {
            btnKeamanan.classList.add('border-indigo-600', 'text-indigo-600');
            btnKeamanan.classList.remove('border-transparent', 'text-gray-500');
        }
        if (typeof loadOfflineSettings === 'function') loadOfflineSettings();
    } else if (tabName === 'sop-hukum') {
        if (tabSOPHukum) tabSOPHukum.classList.remove('hidden');
        if (btnSOPHukum) {
            btnSOPHukum.classList.add('border-indigo-600', 'text-indigo-600');
            btnSOPHukum.classList.remove('border-transparent', 'text-gray-500');
        }
        loadSOPHukumTab();
    }
};

window.loadSOPHukumTab = async function() {
    try {
        // Ambil data terbaru dari backend (Offline DB atau Online GAS)
        if (window.electronAPI) {
            try {
                const offRes = await window.electronAPI.queryDB('getOfflineSopPdf');
                if (offRes && offRes.hasCustom) {
                    if (offRes.base64) localStorage.setItem('sipresdir_sop_pdf_data', offRes.base64);
                    if (offRes.meta) localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(offRes.meta));
                } else if (offRes && !offRes.hasCustom) {
                    localStorage.removeItem('sipresdir_sop_pdf_data');
                    localStorage.removeItem('sipresdir_sop_pdf_meta');
                }
            } catch (_) {}
        } else {
            try {
                const onlRes = await fetchAPI('getSopPdf', { token: currentUser?.token });
                if (onlRes && onlRes.hasCustom) {
                    if (onlRes.url) localStorage.setItem('sipresdir_sop_pdf_url', onlRes.url);
                    if (onlRes.meta) localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(onlRes.meta));
                    if (onlRes.base64) localStorage.setItem('sipresdir_sop_pdf_data', onlRes.base64);
                } else if (onlRes && !onlRes.hasCustom) {
                    localStorage.removeItem('sipresdir_sop_pdf_data');
                    localStorage.removeItem('sipresdir_sop_pdf_meta');
                    localStorage.removeItem('sipresdir_sop_pdf_url');
                }
            } catch (_) {}
        }

        const config = window.appConfig || {};
        let customSopData = localStorage.getItem('sipresdir_sop_pdf_data') || config.sop_pdf_data || '';
        let customSopUrl = localStorage.getItem('sipresdir_sop_pdf_url') || config.sop_pdf_url || '';
        let customSopMeta = null;
        try {
            customSopMeta = JSON.parse(localStorage.getItem('sipresdir_sop_pdf_meta') || config.sop_pdf_meta || 'null');
        } catch(e) {}

        const activeFileNameEl = document.getElementById('sopActiveFileName');
        const activeMetaEl = document.getElementById('sopActiveMetaInfo');
        const activeBadgeEl = document.getElementById('sopActiveBadge');
        const btnLihatEl = document.getElementById('btnLihatSop');
        const btnUnduhEl = document.getElementById('btnUnduhSop');
        const unduhTextEl = document.getElementById('sopUnduhText');
        const unduhIconEl = document.getElementById('sopUnduhIcon');
        const btnTemplateWordAlt = document.getElementById('btnUnduhTemplateWordAlt');
        const btnHapusEl = document.getElementById('btnHapusSop');
        const iconContainerEl = document.getElementById('sopFileIconContainer');
        const fileIconEl = document.getElementById('sopFileIcon');
        const fileExtTextEl = document.getElementById('sopFileExtText');

        if ((customSopData || customSopUrl) && customSopMeta) {
            // Mode 1: Berkas PDF Kustom Resmi Telah Diunggah
            if (activeFileNameEl) activeFileNameEl.textContent = customSopMeta.name || 'Dokumen_SOP_SiPreSDir.pdf';
            const locText = customSopMeta.origin === 'offline_local' ? 'Tersimpan di Laptop' : 'Tersimpan di Google Drive';
            if (activeMetaEl) activeMetaEl.textContent = `Ukuran: ${customSopMeta.sizeText || 'Berkas PDF'} • Diunggah: ${customSopMeta.updatedAt || 'Tersimpan'} • ${locText}`;
            if (activeBadgeEl) {
                activeBadgeEl.textContent = 'Dokumen Resmi Aktif (PDF)';
                activeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
            }
            if (iconContainerEl) iconContainerEl.className = 'w-12 h-14 rounded-xl bg-white border border-rose-200 shadow-sm flex flex-col items-center justify-center text-rose-600 shrink-0';
            if (fileIconEl) fileIconEl.className = 'fas fa-file-pdf text-xl';
            if (fileExtTextEl) {
                fileExtTextEl.textContent = 'PDF';
                fileExtTextEl.className = 'text-[9px] font-bold text-rose-500 mt-0.5';
            }
            // Tombol Lihat SOP muncul dan aktif
            if (btnLihatEl) btnLihatEl.classList.remove('hidden');
            if (unduhTextEl) unduhTextEl.textContent = 'Unduh PDF';
            if (unduhIconEl) unduhIconEl.className = 'fas fa-download';
            if (btnTemplateWordAlt) btnTemplateWordAlt.classList.remove('hidden');
            if (btnHapusEl) btnHapusEl.classList.remove('hidden');
        } else {
            // Mode 2: Draf Template Mentah Word (Belum Ada PDF)
            // Sesuai permintaan: Draf berupa template Word mentah saja, tidak bisa dibuka, hanya bisa diunduh
            if (activeFileNameEl) activeFileNameEl.textContent = DEFAULT_SOP_WORD_FILENAME;
            if (activeMetaEl) activeMetaEl.textContent = 'Format: Dokumen Word Mentah (.docx) • Ukuran: 108 KB • Belum ada berkas PDF yang diunggah. Silakan unduh untuk diedit, lalu unggah versi PDF di bawah.';
            if (activeBadgeEl) {
                activeBadgeEl.textContent = 'Template Mentah (Word)';
                activeBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200';
            }
            if (iconContainerEl) iconContainerEl.className = 'w-12 h-14 rounded-xl bg-white border border-blue-200 shadow-sm flex flex-col items-center justify-center text-blue-600 shrink-0';
            if (fileIconEl) fileIconEl.className = 'fas fa-file-word text-xl';
            if (fileExtTextEl) {
                fileExtTextEl.textContent = 'DOCX';
                fileExtTextEl.className = 'text-[9px] font-bold text-blue-500 mt-0.5';
            }
            // Tombol Lihat SOP disembunyikan (tidak bisa dibuka sampai PDF diupload)
            if (btnLihatEl) btnLihatEl.classList.add('hidden');
            if (unduhTextEl) unduhTextEl.textContent = 'Unduh Draf Word';
            if (unduhIconEl) unduhIconEl.className = 'fas fa-file-word';
            if (btnTemplateWordAlt) btnTemplateWordAlt.classList.add('hidden');
            if (btnHapusEl) btnHapusEl.classList.add('hidden');
        }

        renderDasarHukumTable();
    } catch (err) {
        console.error('Gagal memuat tab SOP & Dasar Hukum:', err);
    }
};

window.handleSopFileSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    const btnSave = document.getElementById('btnSaveSopPdf');
    const hintEl = document.getElementById('sopUploadHint');
    if (!file) {
        pendingSopPdfData = null;
        pendingSopPdfMeta = null;
        if (btnSave) btnSave.disabled = true;
        return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        Swal.fire({
            icon: 'warning',
            title: 'Format File Tidak Sesuai',
            text: 'Harap pilih berkas dengan format PDF (.pdf).'
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    // Batas maksimal ukuran 500 KB (500 * 1024 bytes)
    const sizeKB = (file.size / 1024).toFixed(1);
    if (file.size > 500 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'File Terlalu Besar',
            text: `Ukuran file (${sizeKB} KB) melebihi batas maksimal 500 KB. Harap gunakan berkas PDF yang berukuran maksimal 500 KB.`
        });
        e.target.value = '';
        if (btnSave) btnSave.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        pendingSopPdfData = evt.target.result;
        pendingSopPdfMeta = {
            name: file.name,
            sizeBytes: file.size,
            sizeText: sizeKB + ' KB',
            updatedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
        if (btnSave) btnSave.disabled = false;
        if (hintEl) {
            hintEl.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fas fa-check-circle mr-1"></i>File siap: ${file.name} (${sizeKB} KB). Klik "Simpan File SOP" untuk menerapkan.</span>`;
        }
    };
    reader.readAsDataURL(file);
};

window.saveSopPdfFile = async function() {
    if (!pendingSopPdfData || !pendingSopPdfMeta) {
        Swal.fire({ icon: 'info', title: 'Pilih File', text: 'Silakan pilih berkas PDF SOP terlebih dahulu (maksimal 500 KB).' });
        return;
    }

    const token = (typeof currentUser !== 'undefined' && currentUser?.token) || 
                  (typeof getSession === 'function' && getSession()?.token) || '';

    showLoading('Menyimpan berkas SOP PDF...');
    try {
        if (window.electronAPI) {
            // Mode Desktop Offline: Simpan fisik di laptop
            const offRes = await window.electronAPI.queryDB('saveOfflineSopPdf', {
                token: token,
                fileDataUrl: pendingSopPdfData,
                filename: pendingSopPdfMeta.name
            });
            if (!offRes || !offRes.success) {
                const msg = offRes?.message || 'Gagal menyimpan ke penyimpanan lokal laptop.';
                if (typeof isSessionErrorMessage === 'function' && isSessionErrorMessage(msg)) {
                    hideLoading();
                    if (typeof handleSessionExpired === 'function') handleSessionExpired(msg);
                    return;
                }
                throw new Error(msg);
            }

            localStorage.setItem('sipresdir_sop_pdf_data', pendingSopPdfData);
            localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(offRes.meta || pendingSopPdfMeta));
            hideLoading();
            Swal.fire({
                icon: 'success',
                title: 'Tersimpan di Laptop',
                text: 'Dokumen SOP kustom berhasil disimpan di laptop secara offline dan siap disinkronkan ke Google Drive.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            // Mode Online Web: Unggah ke Google Drive dan buat terbuka untuk umum
            const onlRes = await fetchAPI('uploadSopPdf', {
                token: token,
                fileDataUrl: pendingSopPdfData,
                filename: pendingSopPdfMeta.name
            });
            if (!onlRes || !onlRes.success) {
                const msg = onlRes?.message || 'Gagal mengunggah file ke Google Drive.';
                if (typeof isSessionErrorMessage === 'function' && isSessionErrorMessage(msg)) {
                    hideLoading();
                    if (typeof handleSessionExpired === 'function') handleSessionExpired(msg);
                    return;
                }
                throw new Error(msg);
            }

            localStorage.setItem('sipresdir_sop_pdf_data', pendingSopPdfData);
            localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(onlRes.meta || pendingSopPdfMeta));
            if (onlRes.url) localStorage.setItem('sipresdir_sop_pdf_url', onlRes.url);

            hideLoading();
            Swal.fire({
                icon: 'success',
                title: 'Tersimpan di Google Drive',
                text: 'Dokumen SOP SiPreSDir berhasil diunggah ke Google Drive dan otomatis terbuka untuk umum bagi seluruh pengguna.',
                timer: 2000,
                showConfirmButton: false
            });
        }

        const inputEl = document.getElementById('inputSopPdf');
        if (inputEl) inputEl.value = '';
        const btnSave = document.getElementById('btnSaveSopPdf');
        if (btnSave) btnSave.disabled = true;

        pendingSopPdfData = null;
        pendingSopPdfMeta = null;

        await loadSOPHukumTab();
    } catch (err) {
        hideLoading();
        console.error('Gagal menyimpan file SOP:', err);
        const errMsg = err?.message || String(err || 'Terjadi kesalahan.');
        if (typeof isSessionErrorMessage === 'function' && isSessionErrorMessage(errMsg)) {
            if (typeof handleSessionExpired === 'function') {
                handleSessionExpired(errMsg);
                return;
            }
        }
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: errMsg });
    }
};

window.hapusSopPdf = function() {
    Swal.fire({
        title: 'Hapus Berkas SOP Kustom?',
        text: 'Berkas SOP kustom yang diunggah akan dihapus dan sistem akan kembali menggunakan template draf Word mentah.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus File',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading('Menghapus berkas SOP kustom...');
            const token = (typeof currentUser !== 'undefined' && currentUser?.token) || 
                          (typeof getSession === 'function' && getSession()?.token) || '';
            try {
                let delRes = null;
                if (window.electronAPI) {
                    delRes = await window.electronAPI.queryDB('deleteOfflineSopPdf', { token });
                } else {
                    delRes = await fetchAPI('deleteSopPdf', { token });
                }
                if (delRes && delRes.success === false && typeof isSessionErrorMessage === 'function' && isSessionErrorMessage(delRes.message)) {
                    hideLoading();
                    if (typeof handleSessionExpired === 'function') handleSessionExpired(delRes.message);
                    return;
                }
            } catch(e) {
                console.warn('Gagal panggil API delete SOP:', e);
                const errMsg = e?.message || String(e);
                if (typeof isSessionErrorMessage === 'function' && isSessionErrorMessage(errMsg)) {
                    hideLoading();
                    if (typeof handleSessionExpired === 'function') handleSessionExpired(errMsg);
                    return;
                }
            }

            localStorage.removeItem('sipresdir_sop_pdf_data');
            localStorage.removeItem('sipresdir_sop_pdf_meta');
            localStorage.removeItem('sipresdir_sop_pdf_url');
            if (activeSopBlobUrl) {
                URL.revokeObjectURL(activeSopBlobUrl);
                activeSopBlobUrl = null;
            }

            hideLoading();
            Swal.fire({
                icon: 'success',
                title: 'File Kustom Dihapus',
                text: 'SOP kustom telah dihapus. Sistem kembali menampilkan template draf Word mentah.',
                timer: 1500,
                showConfirmButton: false
            });

            await loadSOPHukumTab();
        }
    });
};

window.getActiveSopUrl = function() {
    // 1. Cek Blob URL lokal jika ada data base64 (offline maupun online)
    const customData = localStorage.getItem('sipresdir_sop_pdf_data');
    if (customData) {
        try {
            if (activeSopBlobUrl) URL.revokeObjectURL(activeSopBlobUrl);
            const blob = base64ToBlob(customData);
            activeSopBlobUrl = URL.createObjectURL(blob);
            return activeSopBlobUrl;
        } catch(e) {
            console.warn('Gagal membuat Blob URL dari custom SOP:', e);
            return customData;
        }
    }

    // 2. Cek URL Google Drive jika berada di web online
    const customUrl = localStorage.getItem('sipresdir_sop_pdf_url');
    if (customUrl && !window.electronAPI) {
        return customUrl;
    }

    return null;
};

window.downloadTemplateWord = function() {
    const a = document.createElement('a');
    a.href = DEFAULT_SOP_WORD_PATH;
    a.download = DEFAULT_SOP_WORD_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

window.previewSopPdf = function() {
    if (!window.hasCustomSopPdf()) {
        Swal.fire({
            icon: 'info',
            title: 'Draf Template Word',
            html: `<div class="text-left text-xs sm:text-sm space-y-2 text-gray-600">
                <p>Dokumen resmi SOP berformat PDF belum diunggah.</p>
                <div class="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 flex items-start gap-2.5">
                    <i class="fas fa-file-word text-blue-600 text-lg mt-0.5 shrink-0"></i>
                    <div>
                        <p class="font-bold text-xs">Template Draf Mentah (.docx)</p>
                        <p class="text-[11px] text-blue-700 mt-0.5">Draf SOP hanya bisa diunduh untuk diedit, belum bisa dibuka di penampil PDF sebelum berkas PDF resmi diunggah.</p>
                    </div>
                </div>
            </div>`,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="fas fa-file-word mr-1.5"></i> Unduh Draf Word',
            cancelButtonText: 'Tutup'
        }).then((res) => {
            if (res.isConfirmed) {
                downloadTemplateWord();
            }
        });
        return;
    }
    openSOPModalLanding();
};

window.downloadSopPdf = function() {
    if (window.hasCustomSopPdf()) {
        downloadActiveSop();
    } else {
        downloadTemplateWord();
    }
};

window.openSOPModalLanding = async function() {
    // Jika belum ada di cache browser lokal, coba ambil dari server (Online GAS atau Offline SQLite)
    if (!localStorage.getItem('sipresdir_sop_pdf_data') && !localStorage.getItem('sipresdir_sop_pdf_url')) {
        try {
            if (window.electronAPI) {
                const offRes = await window.electronAPI.queryDB('getOfflineSopPdf');
                if (offRes && offRes.hasCustom) {
                    if (offRes.base64) localStorage.setItem('sipresdir_sop_pdf_data', offRes.base64);
                    if (offRes.meta) localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(offRes.meta));
                }
            } else {
                const onlRes = await fetchAPI('getSopPdf');
                if (onlRes && onlRes.hasCustom) {
                    if (onlRes.url) localStorage.setItem('sipresdir_sop_pdf_url', onlRes.url);
                    if (onlRes.meta) localStorage.setItem('sipresdir_sop_pdf_meta', JSON.stringify(onlRes.meta));
                    if (onlRes.base64) localStorage.setItem('sipresdir_sop_pdf_data', onlRes.base64);
                }
            }
        } catch (_) {}
    }

    if (!window.hasCustomSopPdf()) {
        Swal.fire({
            icon: 'info',
            title: 'SOP Satuan Pendidikan',
            html: `<div class="text-left text-xs sm:text-sm space-y-2 text-gray-600">
                <p>Dokumen resmi <b>Standar Operasional Prosedur (SOP) SiPreSDir</b> versi satuan pendidikan dalam format PDF belum diunggah oleh Administrator.</p>
                <div class="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 flex items-start gap-2.5">
                    <i class="fas fa-file-word text-blue-600 text-lg mt-0.5 shrink-0"></i>
                    <div>
                        <p class="font-bold text-xs">Template Draf Mentah (.docx)</p>
                        <p class="text-[11px] text-blue-700 mt-0.5">Dokumen Word mentah hanya dapat diunduh untuk diedit, dan tidak dapat dibuka langsung di peramban web sampai diunggah versi PDF-nya.</p>
                    </div>
                </div>
            </div>`,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="fas fa-file-word mr-1.5"></i> Unduh Draf Word (.docx)',
            cancelButtonText: 'Tutup'
        }).then((result) => {
            if (result.isConfirmed) {
                downloadTemplateWord();
            }
        });
        return;
    }

    const modal = document.getElementById('modalPreviewSOP');
    const iframe = document.getElementById('iframeSOPViewer');
    const loading = document.getElementById('sopLoadingState');
    const pdfUrl = getActiveSopUrl();

    if (!modal || !iframe) {
        if (pdfUrl) window.open(pdfUrl, '_blank');
        return;
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    if (loading) loading.style.display = 'flex';
    iframe.classList.add('hidden');

    iframe.onload = function() {
        if (loading) loading.style.display = 'none';
        iframe.classList.remove('hidden');
    };

    iframe.src = pdfUrl || 'about:blank';

    setTimeout(() => {
        if (loading) loading.style.display = 'none';
        iframe.classList.remove('hidden');
    }, 1500);
};

window.closeSOPModal = function() {
    const modal = document.getElementById('modalPreviewSOP');
    const iframe = document.getElementById('iframeSOPViewer');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
    if (iframe) iframe.src = 'about:blank';
};

window.downloadActiveSop = function() {
    if (!window.hasCustomSopPdf()) {
        downloadTemplateWord();
        return;
    }

    const pdfUrl = getActiveSopUrl();
    if (!pdfUrl) {
        downloadTemplateWord();
        return;
    }

    let fileName = 'Dokumen_SOP_SiPreSDir.pdf';
    try {
        const meta = JSON.parse(localStorage.getItem('sipresdir_sop_pdf_meta') || 'null');
        if (meta?.name) fileName = meta.name;
    } catch(e) {}

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
};

window.openActiveSopNewTab = function() {
    const pdfUrl = getActiveSopUrl();
    if (pdfUrl) {
        window.open(pdfUrl, '_blank');
    } else {
        downloadTemplateWord();
    }
};

// ============================================================
// MANAJEMEN DASAR HUKUM CRUD
// ============================================================

window.getDasarHukumList = function() {
    try {
        const stored = localStorage.getItem('dasar_hukum_list');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return DEFAULT_DASAR_HUKUM;
};

window.renderDasarHukumTable = function() {
    const tbody = document.getElementById('tbodyDasarHukum');
    if (!tbody) return;

    const list = getDasarHukumList();
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400">Belum ada data dasar hukum. Klik tombol "Reset Standar" untuk memuat 11 regulasi resmi.</td></tr>`;
        return;
    }

    const badgeColorMap = {
        'Undang-Undang': 'bg-blue-100 text-blue-800 border-blue-200',
        'Peraturan Pemerintah': 'bg-emerald-100 text-emerald-800 border-emerald-200',
        'Permendikbud': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'Permendikbudristek': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'PermenPAN-RB': 'bg-purple-100 text-purple-800 border-purple-200',
        'Keputusan Kepala Sekolah': 'bg-amber-100 text-amber-800 border-amber-200',
        'Tata Tertib Sekolah': 'bg-rose-100 text-rose-800 border-rose-200'
    };

    let html = '';
    list.forEach((item, idx) => {
        const badgeClass = badgeColorMap[item.jenis] || 'bg-gray-100 text-gray-700 border-gray-200';
        html += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="py-3 px-3 text-center font-bold text-gray-500">${idx + 1}</td>
                <td class="py-3 px-3">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">${item.jenis}</span>
                </td>
                <td class="py-3 px-3 font-bold text-gray-800 font-mono">${item.nomor}</td>
                <td class="py-3 px-4 font-medium text-gray-700 leading-relaxed">${item.tentang}</td>
                <td class="py-3 px-4 text-gray-600 leading-relaxed">${item.keterkaitan}</td>
                <td class="py-3 px-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="openModalTambahDasarHukum(${idx})" class="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition" title="Edit Regulasi">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="hapusDasarHukum(${idx})" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition" title="Hapus Regulasi">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.openModalTambahDasarHukum = function(editIndex = -1) {
    const modal = document.getElementById('modalFormDasarHukum');
    const title = document.getElementById('modalDasarHukumTitle');
    const inputIdx = document.getElementById('editDasarHukumIndex');
    const inputJenis = document.getElementById('inputJenisRegulasi');
    const inputNomor = document.getElementById('inputNomorTahun');
    const inputTentang = document.getElementById('inputTentang');
    const inputKeterkaitan = document.getElementById('inputKeterkaitan');

    if (!modal) return;

    if (editIndex >= 0) {
        const list = getDasarHukumList();
        const item = list[editIndex];
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> <span>Edit Dasar Hukum</span>';
            inputIdx.value = editIndex;
            inputJenis.value = item.jenis || 'Undang-Undang';
            inputNomor.value = item.nomor || '';
            inputTentang.value = item.tentang || '';
            inputKeterkaitan.value = item.keterkaitan || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-plus"></i> <span>Tambah Dasar Hukum</span>';
        inputIdx.value = -1;
        inputJenis.value = 'Undang-Undang';
        inputNomor.value = '';
        inputTentang.value = '';
        inputKeterkaitan.value = '';
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};

window.closeModalDasarHukum = function() {
    const modal = document.getElementById('modalFormDasarHukum');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
};

window.saveDasarHukum = function(e) {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editDasarHukumIndex').value, 10);
    const jenis = document.getElementById('inputJenisRegulasi').value.trim();
    const nomor = document.getElementById('inputNomorTahun').value.trim();
    const tentang = document.getElementById('inputTentang').value.trim();
    const keterkaitan = document.getElementById('inputKeterkaitan').value.trim();

    if (!nomor || !tentang) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Nomor/Tahun dan Tentang wajib diisi.' });
        return;
    }

    const list = getDasarHukumList();
    const newItem = { id: Date.now(), jenis, nomor, tentang, keterkaitan };

    if (editIndex >= 0 && editIndex < list.length) {
        list[editIndex] = { ...list[editIndex], jenis, nomor, tentang, keterkaitan };
    } else {
        list.push(newItem);
    }

    localStorage.setItem('dasar_hukum_list', JSON.stringify(list));
    closeModalDasarHukum();
    renderDasarHukumTable();

    Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Regulasi dasar hukum berhasil diperbarui.',
        timer: 1500,
        showConfirmButton: false
    });
};

window.hapusDasarHukum = function(index) {
    const list = getDasarHukumList();
    const item = list[index];
    if (!item) return;

    Swal.fire({
        title: 'Hapus Dasar Hukum?',
        text: `Hapus "${item.nomor} - ${item.tentang}" dari daftar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            list.splice(index, 1);
            localStorage.setItem('dasar_hukum_list', JSON.stringify(list));
            renderDasarHukumTable();
            Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Regulasi berhasil dihapus.', timer: 1200, showConfirmButton: false });
        }
    });
};

window.resetDasarHukumToDefault = function() {
    Swal.fire({
        title: 'Reset ke Standar?',
        text: 'Daftar dasar hukum akan dikembalikan ke 11 regulasi resmi standar SMAN 15 Tebo.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Reset Standar',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.setItem('dasar_hukum_list', JSON.stringify(DEFAULT_DASAR_HUKUM));
            renderDasarHukumTable();
            Swal.fire({ icon: 'success', title: 'Reset Berhasil', text: '11 regulasi standar telah dipulihkan.', timer: 1500, showConfirmButton: false });
        }
    });
};

