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
    setActiveMenu(currentUser.role === 'admin' ? 'Kelola Disiplin' : 'Input Kasus Siswa');
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
            const violations = Array.isArray(res.data) ? res.data : [];
            violations.forEach(p => {
                if (p.id !== 'SYS_LATE' && p.id !== 'SYS_ALPA') {
                    const name = p.namaPelanggaran || p.nama_pelanggaran || '-';
                    opts += `<option value="${p.id}">${name} (+${p.poin || 0} Poin)</option>`;
                }
            });
            dropdown.innerHTML = violations.length > 0 ? opts : '<option value="">Belum ada jenis pelanggaran</option>';
        } else { dropdown.innerHTML = '<option value="">Gagal memuat.</option>'; }
    } catch (e) { dropdown.innerHTML = `<option value="">Gagal memuat: ${e.message || e}</option>`; }

    try {
        const resSiswa = await fetchAPI('getSiswaList', { token: currentUser.token });
        const source = resSiswa.success && Array.isArray(resSiswa.data) ? resSiswa.data : tableState.siswa.fullData;
        window.dataSiswaKasus = (Array.isArray(source) ? source : []).map(s => ({
            ...s,
            nama: s.nama || s.nama_siswa || '',
            nisn: s.nisn || s.NISN || '',
            kelas: s.kelas || s.kelas_siswa || ''
        })).filter(s => s.nama || s.nisn);
    } catch (e) {
        window.dataSiswaKasus = Array.isArray(tableState.siswa.fullData) ? tableState.siswa.fullData : [];
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
        String(s.nama || '').toLowerCase().includes(lowerKey) ||
        String(s.nisn || '').toLowerCase().includes(lowerKey)
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
            if (scannerKasusObj) {
                try { scannerKasusObj.clear(); } catch (e) { }
            }
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
        catatan: document.getElementById('kasusCatatan').value,
        guruPelapor: currentUser ? currentUser.username : 'Unknown'
    };

    try {
        const res = await fetchAPI('addKasusSiswa', { token: currentUser.token, data: data });
        hideLoading();
        btn.disabled = false; btn.innerHTML = originalText;

        if (res.success) {
            const student = window.dataSiswaKasus.find(s => String(s.nisn) === String(data.nisn));
            const violation = document.getElementById('kasusIdPelanggaran').selectedOptions[0];
            const violationLabel = violation ? violation.textContent : 'Jenis pelanggaran';
            Swal.fire({
                icon: 'success',
                title: 'Pelanggaran Berhasil Dicatat',
                html: `<div class="text-left"><p><b>Siswa:</b> ${student?.nama || data.nisn}</p><p><b>Pelanggaran:</b> ${violationLabel}</p><p><b>Poin:</b> ${res.poin ?? '-'}</p></div>`,
                confirmButtonText: 'OK',
                confirmButtonColor: '#4f46e5'
            });
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

