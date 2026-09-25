// ============================================================
// LOGIKA SCANNER PRESENSI
// ============================================================
let html5QrCode = null;
let isScanning = false;

function loadScanAbsensi() {
    if (window.appStatusHari && window.appStatusHari.isLibur) {
        Swal.fire({
            icon: 'error',
            title: 'Hari Libur',
            text: 'Saat ini adalah hari libur (' + window.appStatusHari.keterangan + '). Anda tidak dapat merekam presensi.',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }

    isScanning = false;
    setActiveMenu('Scan Presensi');
    showView('view-scanner');
    setTimeout(() => { startCamera('environment'); }, 500);
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
        const resDiv = document.getElementById('scanResult');
        resDiv.classList.remove('hidden');
        resDiv.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-sm">Gagal Mengakses Kamera: ${err}</div>`;
    });
}

async function onScanSuccess(decodedText) {
    if (!decodedText || decodedText.trim() === "" || decodedText === "undefined") return;
    if (isScanning) return;
    isScanning = true;

    playScanSound();

    const resultDiv = document.getElementById('scanResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `<div class="bg-indigo-50 text-indigo-700 p-4 rounded-xl border border-indigo-100 flex items-center justify-center animate-pulse font-bold shadow-sm"><i class="fas fa-circle-notch fa-spin mr-3"></i> Memproses Data...</div>`;

    const myRole = currentUser ? currentUser.role : '';
    const myKelas = currentUser ? currentUser.kelas : '';

    try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        // --- MENGGUNAKAN API GOOGLE APPS SCRIPT ---
        const result = await fetchAPI('scanAbsensi', {
            nisn: decodedText,
            role: myRole,
            kelasGuru: myKelas,
            token: currentUser ? currentUser.token : null,
            clientDate: `${yyyy}-${mm}-${dd}`,
            clientTime: `${hh}:${min}:${ss}`
        });

        if (result.success) {
            const color = result.type === 'datang' ? 'green' : 'blue';
            const scanType = result.type === 'datang' ? 'Presensi Masuk' : 'Presensi Pulang';
            const scanTime = result.type === 'datang' ? (result.jamDatang || result.waktu || '-') : (result.jamPulang || result.waktu || '-');
            resultDiv.innerHTML = `<div class="bg-${color}-50 text-${color}-900 p-6 rounded-2xl border border-${color}-100 shadow-md animate-fade-in relative overflow-hidden"><div class="absolute top-0 right-0 p-4 opacity-10"><i class="fas fa-check-circle text-6xl"></i></div><h3 class="font-bold text-xl uppercase mb-1 tracking-tight">${result.nama || "Siswa"}</h3><p class="text-sm font-semibold opacity-70 mb-4">${result.kelas || ""}</p><div class="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-${color}-200 inline-block text-center min-w-[180px]"><div class="text-[10px] uppercase tracking-[0.2em] font-black opacity-70 mb-1">${scanType}</div><div class="text-sm font-bold uppercase opacity-80 mb-2">Berhasil</div><div class="text-3xl font-mono font-bold">${scanTime}</div></div><p class="text-xs mt-4 font-bold uppercase tracking-wide opacity-50 animate-pulse">Siap untuk siswa berikutnya...</p></div>`;
            setTimeout(() => { isScanning = false; }, 3000);
        } else {
            resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center space-x-4"><div class="bg-red-100 p-3 rounded-full"><i class="fas fa-times text-xl"></i></div><div class="text-left"><h4 class="font-bold">Gagal!</h4><p class="text-sm opacity-90">${result.message}</p></div></div>`;
            setTimeout(() => { isScanning = false; }, 4000);
        }
    } catch (err) {
        resultDiv.innerHTML = `<div class="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center space-x-4"><div class="bg-red-100 p-3 rounded-full"><i class="fas fa-times text-xl"></i></div><div class="text-left"><h4 class="font-bold">Error Koneksi!</h4><p class="text-sm opacity-90">Gagal terhubung ke server.</p></div></div>`;
        setTimeout(() => { isScanning = false; }, 4000);
    }
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

