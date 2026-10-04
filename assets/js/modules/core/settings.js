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

async function loadDataSiswaNonaktif() {
    stopAndBack(false);
    setActiveMenu('Kelola Akun');
    showView('view-data-siswa-nonaktif');

    const dropdown = document.getElementById('filterKelasNonaktif');
    if (dropdown && existingClasses && existingClasses.length > 0) {
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Kelas</option>';
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    }

    if (tableState.siswaNonaktif.fullData.length > 0) {
        processTableData('siswaNonaktif');
    } else {
        // [OPTIMASI KILAT] Cek apakah ada cache di local storage
        const cached = localStorage.getItem('cache_data_siswa_nonaktif');
        const masterCached = localStorage.getItem('cache_data_siswa_master');

        if (cached) {
            try {
                tableState.siswaNonaktif.fullData = JSON.parse(cached);
                processTableData('siswaNonaktif');
            } catch (e) { }
        } else if (masterCached) {
            // Coba ambil dari master cache jika ada
            try {
                const masterData = JSON.parse(masterCached);
                tableState.siswaNonaktif.fullData = masterData.filter(s => s.status === 'nonaktif');
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
                    tableState.siswaNonaktif.fullData = [];
                    loadDataSiswaNonaktif();
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

function showBulkDeactivateModal() {
    let options = '<option value="">Pilih Kelas</option>';
    if (existingClasses && existingClasses.length > 0) {
        existingClasses.forEach(kelas => {
            options += `<option value="${kelas}">${kelas}</option>`;
        });
    } else {
        options = '<option value="">Tidak ada data kelas</option>';
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
            <select id="bulkDeactivateClass" class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-0 outline-none transition font-medium">
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
            <button onclick="bulkDeactivateSiswaConfirm()" class="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition shadow-sm hover:shadow-md">
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
    const kelas = document.getElementById('bulkDeactivateClass').value;
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
            showLoading();
            try {
                const r = await fetchAPI('bulkDeactivateSiswa', { kelas: kelas });
                hideLoading();
                if (r.success) {
                    tableState.siswa.fullData = [];
                    tableState.siswaNonaktif.fullData = [];
                    loadDataSiswa();
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
