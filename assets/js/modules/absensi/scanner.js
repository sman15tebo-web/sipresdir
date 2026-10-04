// ============================================================
// LOGIKA SCANNER PRESENSI
// ============================================================
let html5QrCode = null;
let isScanning = false;
let siswaManual = [];
let rekomendasiSiswaManual = [];
let siswaTerpilihManual = null;

async function loadScanAbsensi() {
    try {
        const statusHari = await fetchAPI('cekWFHToday');
        if (!statusHari || statusHari.success === false || typeof statusHari.isLibur !== 'boolean') {
            throw new Error(statusHari?.message || 'Status hari libur tidak dapat dipastikan.');
        }
        window.appStatusHari = statusHari;
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Jadwal Tidak Tersedia',
            text: 'Tidak dapat memastikan status hari libur. Scanner tidak dibuka. ' + (error.message || ''),
            confirmButtonColor: '#4f46e5'
        });
        return;
    }
    if (window.appStatusHari.isLibur) {
        Swal.fire({
            icon: 'error',
            title: 'Hari Libur',
            text: 'Saat ini adalah hari libur (' + window.appStatusHari.keterangan + '). Anda tidak dapat merekam presensi.',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }

    isScanning = false;
    setActiveMenu('Kelola Presensi');
    await showView('view-scanner');
    resetPilihanSiswaManual();
    muatSiswaManual();
    setTimeout(() => { startCamera('environment'); }, 500);
}

async function muatSiswaManual() {
    const hint = document.getElementById('manualSiswaHint');
    if (hint) hint.textContent = 'Memuat daftar siswa...';
    try {
        const response = await fetchAPI('getSiswaList', { token: currentUser?.token });
        if (!response?.success || !Array.isArray(response.data)) {
            throw new Error(response?.message || 'Daftar siswa tidak tersedia.');
        }
        const teacherClass = String(currentUser?.kelas || currentUser?.wali_kelas || '').trim().toLowerCase();
        siswaManual = response.data
            .map(student => ({
                nisn: String(student.nisn || student.NISN || '').replace(/^'+/, '').trim(),
                nama: String(student.nama || student.nama_siswa || '').trim(),
                kelas: String(student.kelas || student.kelas_siswa || '').trim(),
                status: String(student.status || 'aktif').trim().toLowerCase()
            }))
            .filter(student =>
                student.nisn &&
                student.nama &&
                !/non.?aktif|tidak aktif|inactive/.test(student.status) &&
                (currentUser?.role !== 'guru' || !teacherClass || student.kelas.toLowerCase() === teacherClass)
            );
        if (hint) hint.textContent = siswaManual.length
            ? 'Ketik minimal 1 huruf atau angka untuk melihat 3 rekomendasi.'
            : 'Tidak ada siswa aktif yang dapat dipilih.';
    } catch (error) {
        siswaManual = [];
        if (hint) hint.textContent = `Gagal memuat daftar siswa: ${error.message || error}`;
    }
}

function resetPilihanSiswaManual() {
    siswaTerpilihManual = null;
    rekomendasiSiswaManual = [];
    const search = document.getElementById('manualSiswaSearch');
    const suggestions = document.getElementById('manualSiswaSuggestions');
    const selected = document.getElementById('manualSiswaSelected');
    const button = document.getElementById('btnRekamManual');
    if (search) search.value = '';
    if (suggestions) {
        suggestions.innerHTML = '';
        suggestions.classList.add('hidden');
    }
    if (selected) {
        selected.innerHTML = '';
        selected.classList.add('hidden');
    }
    if (button) button.disabled = true;
}

function filterSiswaManual(keyword) {
    siswaTerpilihManual = null;
    const result = document.getElementById('scanResultManual');
    if (result) {
        result.classList.add('hidden');
        result.innerHTML = '';
    }
    const button = document.getElementById('btnRekamManual');
    const selected = document.getElementById('manualSiswaSelected');
    const suggestions = document.getElementById('manualSiswaSuggestions');
    const hint = document.getElementById('manualSiswaHint');
    if (button) button.disabled = true;
    if (selected) selected.classList.add('hidden');
    if (!suggestions) return;

    const query = String(keyword || '').trim().toLocaleLowerCase('id');
    if (!query) {
        suggestions.innerHTML = '';
        suggestions.classList.add('hidden');
        if (hint) hint.textContent = siswaManual.length
            ? 'Ketik minimal 1 huruf atau angka untuk melihat 3 rekomendasi.'
            : hint.textContent;
        return;
    }

    rekomendasiSiswaManual = siswaManual
        .filter(student => student.nama.toLocaleLowerCase('id').includes(query) || student.nisn.toLowerCase().includes(query))
        .sort((first, second) => {
            const rank = student => {
                const name = student.nama.toLocaleLowerCase('id');
                if (name === query || student.nisn.toLowerCase() === query) return 0;
                if (name.startsWith(query) || student.nisn.toLowerCase().startsWith(query)) return 1;
                return 2;
            };
            return rank(first) - rank(second) || first.nama.localeCompare(second.nama, 'id');
        })
        .slice(0, 3);

    if (!rekomendasiSiswaManual.length) {
        suggestions.innerHTML = '<div class="p-4 text-center text-xs text-gray-500">Siswa tidak ditemukan.</div>';
        suggestions.classList.remove('hidden');
        if (hint) hint.textContent = '';
        return;
    }

    suggestions.innerHTML = rekomendasiSiswaManual.map((student, index) => `
        <button type="button" onclick="pilihSiswaManual(${index})" class="w-full text-left p-3 hover:bg-indigo-50 border-b last:border-b-0 border-gray-100 flex items-center gap-3 transition">
            <span class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">${escapeScanHtml(student.nama.charAt(0).toUpperCase())}</span>
            <span class="min-w-0">
                <span class="block text-sm font-bold text-gray-800 truncate">${escapeScanHtml(student.nama)}</span>
                <span class="block text-xs text-gray-500"><span class="font-mono">${escapeScanHtml(student.nisn)}</span>${student.kelas ? ` · ${escapeScanHtml(student.kelas)}` : ''}</span>
            </span>
        </button>
    `).join('');
    suggestions.classList.remove('hidden');
    if (hint) hint.textContent = 'Pilih siswa yang benar dari daftar rekomendasi.';
}

function pilihSiswaManual(index) {
    const student = rekomendasiSiswaManual[index];
    if (!student) return;
    siswaTerpilihManual = student;
    const suggestions = document.getElementById('manualSiswaSuggestions');
    const selected = document.getElementById('manualSiswaSelected');
    const search = document.getElementById('manualSiswaSearch');
    const button = document.getElementById('btnRekamManual');
    if (suggestions) suggestions.classList.add('hidden');
    if (search) search.value = `${student.nama} (${student.nisn})`;
    if (selected) {
        selected.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Siswa dipilih</div><div class="font-bold text-gray-800">${escapeScanHtml(student.nama)}</div><div class="text-xs text-gray-600 mt-1">NISN ${escapeScanHtml(student.nisn)}${student.kelas ? ` · ${escapeScanHtml(student.kelas)}` : ''}</div>`;
        selected.classList.remove('hidden');
    }
    if (button) button.disabled = false;
}

async function rekamPresensiManual() {
    if (!siswaTerpilihManual) return;
    await recordAttendance(siswaTerpilihManual.nisn, 'manual');
}

function startCamera(mode) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            initCamera(mode);
        }).catch(err => initCamera(mode));
    } else {
        initCamera(mode);
    }
}

function initCamera(mode) {
    const loading = document.getElementById('camLoading');
    loading.classList.remove('hidden');

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => onScanSuccess(decodedText),
        (errorMessage) => { }
    ).then(() => {
        loading.classList.add('hidden');
        isScanning = false;
    }).catch((err) => {
        loading.classList.add('hidden');
        const resDiv = document.getElementById('scanResultQr');
        resDiv.classList.remove('hidden');
        resDiv.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-sm">Gagal Mengakses Kamera: ${err}</div>`;
    });
}

async function onScanSuccess(decodedText) {
    if (!decodedText || decodedText.trim() === "" || decodedText === "undefined") return;
    await recordAttendance(decodedText, 'qr');
}

async function recordAttendance(nisn, source) {
    if (!nisn || isScanning) return;
    if (isScanning) return;
    isScanning = true;

    if (source === 'qr') playScanSound();
    const manualButton = document.getElementById('btnRekamManual');
    if (manualButton) manualButton.disabled = true;

    const resultDiv = document.getElementById(source === 'manual' ? 'scanResultManual' : 'scanResultQr');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `<div class="bg-indigo-50 text-indigo-700 p-4 rounded-xl border border-indigo-100 flex items-center justify-center animate-pulse font-bold shadow-sm"><i class="fas fa-circle-notch fa-spin mr-3"></i> ${source === 'manual' ? 'Merekam presensi manual...' : 'Memproses Data...'}</div>`;

    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const result = await fetchAPI('scanAbsensi', {
            nisn,
            token: currentUser ? currentUser.token : null,
            clientDate: `${yyyy}-${mm}-${dd}`,
            clientTime: `${hh}:${min}:${ss}`
        });

        if (!result || !result.success) {
            const message = result?.message || 'Server tidak mengonfirmasi pencatatan presensi.';
            resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm font-bold"><div class="text-lg mb-1"><i class="fas fa-times-circle mr-2"></i>Presensi gagal</div><p class="text-sm font-medium">${escapeScanHtml(message)}</p></div>`;
            return;
        }

        const isPulang = result.type === 'pulang';
        const color = isPulang ? 'blue' : 'green';
        const scanType = isPulang ? 'Presensi Pulang' : 'Presensi Masuk';
        const scanTime = isPulang ? (result.jamPulang || `${hh}:${min}:${ss}`) : (result.jamDatang || `${hh}:${min}:${ss}`);
        const namaSiswa = result.nama || 'Siswa';
        const kelasSiswa = result.kelas || '';
        resultDiv.innerHTML = `<div class="bg-${color}-50 text-${color}-900 p-6 rounded-2xl border border-${color}-100 shadow-md animate-fade-in relative overflow-hidden"><div class="absolute top-0 right-0 p-4 opacity-10"><i class="fas fa-check-circle text-6xl"></i></div><h3 class="font-bold text-xl uppercase mb-1 tracking-tight">${escapeScanHtml(namaSiswa)}</h3><p class="text-sm font-semibold opacity-70 mb-4">${escapeScanHtml(kelasSiswa)}</p><div class="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-${color}-200 inline-block text-center min-w-[180px]"><div class="text-[10px] uppercase tracking-[0.2em] font-black opacity-70 mb-1">${scanType}</div><div class="text-sm font-bold uppercase opacity-80 mb-2">${escapeScanHtml(result.message || 'Berhasil')}</div><div class="text-3xl font-mono font-bold">${escapeScanHtml(scanTime)}</div></div><p class="text-xs mt-4 font-bold uppercase tracking-wide opacity-50">Siap untuk siswa berikutnya...</p></div>`;
        if (source === 'manual') resetPilihanSiswaManual();

    } catch (err) {
        resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center space-x-4"><div class="bg-red-100 p-3 rounded-full"><i class="fas fa-times text-xl"></i></div><div class="text-left"><h4 class="font-bold">Presensi gagal</h4><p class="text-sm opacity-90">${escapeScanHtml(err.message || 'Terjadi kesalahan sistem.')}</p></div></div>`;
    } finally {
        setTimeout(() => {
            isScanning = false;
            if (manualButton && siswaTerpilihManual) manualButton.disabled = false;
        }, 1000);
    }
}

function escapeScanHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function playScanSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') { ctx.resume(); }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "square";
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.15;

        oscillator.start();
        setTimeout(() => { oscillator.stop(); ctx.close(); }, 150);
    } catch (e) { console.error("Audio error: " + e); }
}

function stopAndBack(redirect = true) {
    if (html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
                isScanning = false;
                if (redirect && currentUser) returnToDashboard();
            }).catch(() => {
                try { html5QrCode.clear(); } catch (e) { }
                html5QrCode = null;
                isScanning = false;
                if (redirect && currentUser) returnToDashboard();
            });
        } catch (e) {
            try { html5QrCode.clear(); } catch (err) { }
            html5QrCode = null;
            isScanning = false;
            if (redirect && currentUser) returnToDashboard();
        }
    }
    else if (redirect && currentUser) returnToDashboard();
}

function returnToDashboard() {
    if (currentUser.role === 'admin') loadAdminDashboard();
    else if (currentUser.role === 'guru') loadGuruDashboard();
    else loadSiswaDashboard();
}