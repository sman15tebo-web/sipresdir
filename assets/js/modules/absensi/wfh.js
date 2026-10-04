// ============================================================
// LOGIKA WFH & IZIN SAKIT (SISWA)
// ============================================================
async function loadAbsenWFH() {
    stopAndBack(false);
    setActiveMenu('Rekam-WFH');
    showLoading();

    try {
        const cek = await fetchAPI('cekWFHToday');
        hideLoading();

        if (cek) {
            const isLibur = cek.isLibur === true || cek.status === 'libur';
            const isWFH = cek.isWFH === true || cek.status === 'wfh';
            if (isLibur) {
                Swal.fire({
                    title: 'Perekaman Ditolak!',
                    text: `Anda tidak bisa melakukan perekaman karena hari ini adalah Hari Libur (${cek.keterangan}).`,
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
                return;
            } else if (!isWFH) {
                Swal.fire({
                    title: 'Akses Ditolak!',
                    text: 'Hari ini bukan jadwal WFH. Silakan lakukan presensi scan QR di sekolah.',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                }).then(() => {
                    loadSiswaDashboard();
                });
                return;
            } else {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'info', title: cek.keterangan });
            }
        }
    } catch (e) {
        hideLoading();
        showAlert('error', 'Gagal mengecek jadwal ke server.');
        loadSiswaDashboard();
        return;
    }

    // Hanya tampilkan kamera & cari lokasi jika dizinkan WFH
    showView('view-absen-wfh');
    startWFHCamera();
    getLocation();
}
let currentGPS = { lat: null, lon: null, acc: null };

function getLocation() {
    const gpsText = document.getElementById('gpsLocationText');
    if (navigator.geolocation) {
        gpsText.innerHTML = `<i class="fas fa-spinner fa-spin text-indigo-500"></i> Memeriksa sensor lokasi...`;

        let locationResolved = false;
        
        // Manual Timeout 12 Detik Anti-Hang
        const fallbackTimer = setTimeout(() => {
            if (!locationResolved) {
                locationResolved = true;
                gpsText.innerHTML = `<span class="text-orange-500 font-bold text-xs"><i class="fas fa-exclamation-triangle"></i> GPS tidak merespon (Lanjut Tanpa GPS)</span>`;
                currentGPS.lat = 0;
                currentGPS.lon = 0;
                currentGPS.acc = 0;
                checkWFHReady();
            }
        }, 15000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (locationResolved) return;
                locationResolved = true;
                clearTimeout(fallbackTimer);

                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const acc = position.coords.accuracy;

                currentGPS.lat = lat;
                currentGPS.lon = lon;
                currentGPS.acc = Math.round(acc);

                gpsText.innerHTML = `${lat.toFixed(5)}, ${lon.toFixed(5)} <br><span class="text-[9px] text-green-600">Akurasi: ${Math.round(acc)}m <i class="fas fa-check-circle"></i></span>`;
                checkWFHReady();
            },
            (error) => {
                if (locationResolved) return;
                locationResolved = true;
                clearTimeout(fallbackTimer);

                let errMsg = "Izin Lokasi Ditolak!";
                if (error.code === 2) errMsg = "Sinyal GPS mati.";
                else if (error.code === 3) errMsg = "Timeout lokasi.";

                gpsText.innerHTML = `<span class="text-orange-500 font-bold text-xs"><i class="fas fa-exclamation-triangle"></i> ${errMsg} (Lanjut Tanpa GPS)</span>`;
                
                currentGPS.lat = 0;
                currentGPS.lon = 0;
                currentGPS.acc = 0;
                checkWFHReady();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        gpsText.innerHTML = "GPS tidak didukung browser ini.";
        currentGPS.lat = 0; currentGPS.lon = 0; currentGPS.acc = 0;
        checkWFHReady();
    }
}

let wfhStream = null;

function checkWFHReady() {
    const btn = document.getElementById('btnCaptureWFH');
    if (wfhStream && currentGPS.lat !== null) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

async function startWFHCamera() {
    const video = document.getElementById('wfhVideo');
    const loading = document.getElementById('wfhLoading');
    const loadingText = document.getElementById('wfhLoadingText');
    const btn = document.getElementById('btnCaptureWFH');
    
    // Reset tombol setiap kali buka WFH
    btn.innerHTML = '<i class="fas fa-camera mr-1"></i> Kirim Presensi';
    btn.disabled = true;
    loading.classList.remove('hidden');
    loadingText.innerText = "Menyiapkan Kamera...";
    
    if (wfhStream) {
        wfhStream.getTracks().forEach(track => track.stop());
    }

    try {
        wfhStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        video.srcObject = wfhStream;
        
        video.onloadedmetadata = () => {
            loading.classList.add('hidden');
            checkWFHReady();
        };
    } catch (err) {
        loading.classList.add('hidden');
        showAlert('error', 'Kamera tidak dapat diakses atau diblokir browser.');
    }
}

function captureAndSendWFH() {
    const video = document.getElementById('wfhVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Foto = canvas.toDataURL('image/jpeg', 0.7);
    
    Swal.fire({
        title: 'Kirim Presensi WFH?',
        text: 'Pastikan wajah Anda terlihat jelas.',
        imageUrl: base64Foto,
        imageHeight: 200,
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Kirim!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            submitWFH(base64Foto);
        }
    });
}

async function submitWFH(base64Foto) {
    const btn = document.getElementById('btnCaptureWFH');
    const originalText = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    showLoading();

    try {
        const res = await fetchAPI('absenWFH', {
            token: currentUser.token, 
            nisn: currentUser.nisn, 
            foto: base64Foto,
            lokasi: `${currentGPS.lat},${currentGPS.lon}`
        });
        hideLoading();
        
        if (res.success) {
            showAlert('success', res.message);
            if(wfhStream) wfhStream.getTracks().forEach(t => t.stop());
            setTimeout(() => { loadSiswaDashboard(); }, 1500);
        } else {
            showAlert('error', res.message); 
            btn.disabled = false; 
            btn.innerHTML = originalText;
        }
    } catch (error) {
        hideLoading(); 
        showAlert('error', 'Gagal koneksi server!'); 
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}

function loadIzinSiswa() {
    stopAndBack(false);
    setActiveMenu('Izin / Sakit');
    showView('view-izin-siswa');
}

function previewIzinFoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading();
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const MAX_WIDTH = 800;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }

            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            document.getElementById('izinBase64').value = compressedBase64;
            const preview = document.getElementById('izinPreviewImg');
            preview.src = compressedBase64;
            preview.classList.remove('hidden');
            document.getElementById('izinUploadPlaceholder').classList.add('hidden');
            hideLoading();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitIzinSiswa(e) {
    e.preventDefault();

    if (window.currentAbsensi && window.currentAbsensi.status && window.currentAbsensi.status.toLowerCase().includes('hadir')) {
        showAlert('error', 'Anda sudah melakukan presensi kehadiran hari ini. Tidak dapat mengirim surat izin/sakit.');
        return;
    }

    const tipe = document.getElementById('tipeIzinSiswa').value;
    const base64Foto = document.getElementById('izinBase64').value;

    if (!base64Foto) { showAlert('error', 'Harap masukkan foto surat keterangan!'); return; }

    const btn = document.getElementById('btnSubmitIzin');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    showLoading();

    // Add a manual cancel timeout in case it hangs
    let isFinished = false;
    const fallbackTimeout = setTimeout(() => {
        if (!isFinished) {
            hideLoading();
            btn.disabled = false;
            btn.innerHTML = originalText;
            showAlert('error', 'Waktu pengiriman terlalu lama (Timeout). Silakan ulangi pengajuan.');
        }
    }, 15000);

    try {
        const res = await fetchAPI('ajukanIzin', {
            token: currentUser.token, nisn: currentUser.nisn, tipe: tipe, fotoBase64: base64Foto
        });
        isFinished = true;
        clearTimeout(fallbackTimeout);
        hideLoading();
        if (res.success) {
            showAlert('success', res.message);
            document.getElementById('fotoSuratIzin').value = '';
            document.getElementById('izinBase64').value = '';
            document.getElementById('izinPreviewImg').classList.add('hidden');
            document.getElementById('izinUploadPlaceholder').classList.remove('hidden');
            setTimeout(() => { loadSiswaDashboard(); }, 1500);
        } else {
            showAlert('error', res.message); btn.disabled = false; btn.innerHTML = originalText;
        }
    } catch (error) {
        isFinished = true;
        clearTimeout(fallbackTimeout);
        hideLoading(); showAlert('error', 'Gagal koneksi server! ' + error.message); btn.disabled = false; btn.innerHTML = originalText;
    }
}

function hapusBuktiAbsen(nisn, tanggal) {
    Swal.fire({
        title: 'Hapus Bukti & Reset Status?',
        html: `
            <div class="text-left">
                <p class="text-sm text-gray-600 mb-3">Data absensi hari ini dan file foto/surat di Google Drive akan dihapus permanen. Status siswa akan kembali menjadi "Belum Absen".</p>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Alasan Dihapus</label>
                <textarea id="alasanHapusBukti" rows="4" class="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:ring-2 focus:ring-red-200 focus:border-red-400" placeholder="Contoh: Bukti izin tidak jelas dan belum diperbaiki."></textarea>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Tidak',
        reverseButtons: true,
        preConfirm: () => {
            const alasan = document.getElementById('alasanHapusBukti').value.trim();
            if (!alasan) {
                Swal.showValidationMessage('Harap isi alasan kenapa bukti dihapus.');
                return false;
            }
            return alasan;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                const res = await fetchAPI('deleteAbsenRecord', {
                    token: currentUser.token,
                    nisn: nisn,
                    tanggal: tanggal,
                    alasan: result.value
                });
                hideLoading();
                if (res.success) {
                    localStorage.removeItem('cache_siswa_absensi_today');
                    showAlert('success', res.message);
                    refreshData('monitoring');
                } else {
                    showAlert('error', res.message);
                }
            } catch (e) {
                hideLoading();
                showAlert('error', 'Error koneksi ke server');
            }
        }
    });
}

