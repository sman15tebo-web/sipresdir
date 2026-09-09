// ============================================================
// LOGIKA CETAK KARTU SISWA (QR CODE)
// ============================================================
async function loadQRCodeSiswa(nisnParam, namaParam, kelasParam) {
    stopAndBack(false);
    if (currentUser && currentUser.role === 'siswa') setActiveMenu('Kartu Saya');
    await showView('view-kartu-siswa');

    const container = document.getElementById('kartuSiswaContainer');
    if (!container) {
        showAlert('error', 'Tampilan kartu siswa belum siap. Silakan coba lagi.');
        return;
    }
    container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i><p class="mt-2 text-sm text-gray-500">Memproses Data Kartu...</p></div>';

    const nama = namaParam || currentUser.nama || "Siswa";
    const nisn = nisnParam || currentUser.nisn || "1234567890";
    const kelas = kelasParam || currentUser.kelas || "X";
    const backFn = (currentUser.role === 'admin' || currentUser.role === 'guru') ? "loadDataSiswa()" : "loadSiswaDashboard()";

    try {
        const settingsResponse = await fetchAPI('getSettings');
        const dataServer = settingsResponse?.data || settingsResponse || {};
        const logoBase64 = dataServer.logo || 'assets/img/imgsipresdir.png';
        const logoInstansiBase64 = dataServer.logoInstansi || logoBase64;
        const namaSekolah = dataServer.namasekolah || 'Nama Sekolah';
        const namaInstansi = dataServer.namaInstansi || 'Instansi Pendidikan';

        container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-5">
            <div id="idCardElement" style="width: 320px; height: 510px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; position: relative; font-family: sans-serif; box-sizing: border-box; display: flex; flex-direction: column;">
                
                <div style="background: #312e81; padding: 25px 15px 15px 15px; text-align: center; color: white; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 160px;">
                    <div style="display: flex; gap: 15px; margin-bottom: 10px; justify-content: center;">
                        <img src="${logoInstansiBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                        <img src="${logoBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </div>
                    <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; opacity: 0.9; letter-spacing: 0.5px;">${namaInstansi}</div>
                    <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; line-height: 1.4; padding: 0 5px; word-wrap: break-word;">${namaSekolah}</div>
                    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; font-weight: 600;">KARTU PRESENSI DIGITAL</div>
                </div>

                <div style="flex: 1; padding: 15px 20px; text-align: center; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 130px; height: 130px; margin: 0 auto 10px auto; padding: 8px; background: white; border: 1px solid #f3f4f6; border-radius: 10px; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); box-sizing: border-box;">
                        <div id="hiddenQrTarget" style="width: 100%; height: 100%;"></div>
                    </div>
                    
                    <div style="font-size: 16px; font-weight: 800; color: #1f2937; margin-bottom: 2px; line-height: 1.2;">${nama}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px; font-family: monospace;">${nisn}</div>
                    
                    <div style="margin-bottom: auto;">
                        <span style="background: #eef2ff; color: #4f46e5; padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #e0e7ff;">${kelas}</span>
                    </div>
                    
                    <div style="width: 100%; border-top: 2px dashed #f3f4f6; padding-top: 10px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 15px;">
                        <span>ID: ${nisn}</span>
                        <span>VALID: ${new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex flex-col gap-3 w-[320px]">
                <button onclick="downloadCardAsPNG('${nama}')" class="w-full bg-indigo-600 text-white py-3 rounded-xl shadow-md font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i> Unduh Kartu Pribadi
                </button>
                <button onclick="${backFn}" class="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl shadow-sm font-bold text-sm hover:bg-gray-50 transition">
                    Tutup / Kembali
                </button>
            </div>
        </div>`;

        const qrTarget = document.getElementById('hiddenQrTarget');
        new QRCode(qrTarget, { text: String(nisn), width: 124, height: 124, correctLevel: QRCode.CorrectLevel.H });

        initAppConfigs();

    } catch (e) {
        container.innerHTML = `<div class="p-10 text-center text-red-500">Gagal memuat kartu: ${e.message || e}</div>`;
        showAlert('error', 'Gagal memuat kartu siswa: ' + (e.message || e));
    }
}

function downloadCardAsPNG(filename) {
    const element = document.getElementById('idCardElement');
    const btn = event.currentTarget;
    const oldTxt = btn.innerHTML;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Proses...";
    btn.disabled = true;

    html2canvas(element, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#ffffff", logging: false }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Kartu_${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        btn.innerHTML = oldTxt; btn.disabled = false;
    }).catch(err => {
        showAlert('error', "Gagal Unduh: " + err);
        btn.innerHTML = oldTxt; btn.disabled = false;
    });
}

async function cetakSemuaKartuSiswa() {
    const dataToPrint = tableState.siswa.filtered;

    if (!dataToPrint || dataToPrint.length === 0) {
        showAlert('error', 'Tidak ada data siswa untuk dicetak. Hapus filter pencarian jika perlu.');
        return;
    }

    showLoading();

    try {
        const settingsResponse = await fetchAPI('getSettings');
        const dataServer = settingsResponse?.data || settingsResponse || {};
        const logoBase64 = dataServer.logo || 'assets/img/imgsipresdir.png';
        const logoInstansiBase64 = dataServer.logoInstansi || logoBase64;
        const namaSekolah = dataServer.namasekolah || 'Nama Sekolah';
        const namaInstansi = dataServer.namaInstansi || 'Instansi Pendidikan';

        let container = document.getElementById('hiddenCardFactory');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hiddenCardFactory';
            container.style.cssText = 'position: fixed; top: 0; left: -9999px; z-index: -9999; pointer-events: none; background: white;';
            document.body.appendChild(container);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const cardW = 54;
        const cardH = 86;
        const marginX = (210 - (3 * cardW)) / 4;
        const marginY = (297 - (3 * cardH)) / 4;

        for (let i = 0; i < dataToPrint.length; i++) {
            const siswa = dataToPrint[i];

            document.getElementById('loadingText').innerHTML = `Memproses Kartu... <br><span class="text-[10px] text-gray-500 font-normal">${i + 1} dari ${dataToPrint.length} Siswa</span>`;

            container.innerHTML = `
            <div id="printCardTemplate" style="width: 320px; height: 510px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; position: relative; font-family: sans-serif; box-sizing: border-box; display: flex; flex-direction: column;">
                
                <div style="background: #312e81; padding: 25px 15px 15px 15px; text-align: center; color: white; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 160px;">
                    <div style="display: flex; gap: 15px; margin-bottom: 10px; justify-content: center;">
                        <img src="${logoInstansiBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                        <img src="${logoBase64}" style="height: 40px; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                    </div>
                    <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; opacity: 0.9; letter-spacing: 0.5px;">${namaInstansi}</div>
                    <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; line-height: 1.4; padding: 0 5px; word-wrap: break-word;">${namaSekolah}</div>
                    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #cbd5e1; font-weight: 600;">KARTU PRESENSI DIGITAL</div>
                </div>

                <div style="flex: 1; padding: 15px 20px; text-align: center; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 130px; height: 130px; margin: 0 auto 10px auto; padding: 8px; background: white; border: 1px solid #f3f4f6; border-radius: 10px; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); box-sizing: border-box;">
                        <div id="hiddenQrTarget" style="width: 100%; height: 100%;"></div>
                    </div>
                    
                    <div style="font-size: 16px; font-weight: 800; color: #1f2937; margin-bottom: 2px; line-height: 1.2;">${siswa.nama}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px; font-family: monospace;">${siswa.nisn}</div>
                    
                    <div style="margin-bottom: auto;">
                        <span style="background: #eef2ff; color: #4f46e5; padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; border: 1px solid #e0e7ff;">${siswa.kelas}</span>
                    </div>
                    
                    <div style="width: 100%; border-top: 2px dashed #f3f4f6; padding-top: 10px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 15px;">
                        <span>ID: ${siswa.nisn}</span>
                        <span>VALID: ${new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>`;

            const qrTarget = document.getElementById('hiddenQrTarget');
            new QRCode(qrTarget, { text: String(siswa.nisn), width: 124, height: 124, correctLevel: QRCode.CorrectLevel.H });

            await new Promise(resolve => setTimeout(resolve, 400)); // Beri waktu lebih lama agar QR & gambar benar-benar termuat

            const cardEl = document.getElementById('printCardTemplate');
            const canvas = await html2canvas(cardEl, { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            const col = i % 3;
            const row = Math.floor((i % 9) / 3);
            const x = marginX + col * (cardW + marginX);
            const y = marginY + row * (cardH + marginY);

            doc.addImage(imgData, 'JPEG', x, y, cardW, cardH);

            if ((i + 1) % 9 === 0 && i !== dataToPrint.length - 1) {
                doc.addPage();
            }
        }

        const pdfFileName = `Cetak_Kartu_Siswa_${new Date().getTime()}.pdf`;
        doc.save(pdfFileName);

        showAlert('success', 'PDF berhasil diunduh dengan proporsi nama sekolah yang lebih baik!');

    } catch (error) {
        console.error("Error Cetak PDF:", error);
        showAlert('error', 'Gagal mencetak kartu: ' + error.message);
    } finally {
        hideLoading();
    }
}

