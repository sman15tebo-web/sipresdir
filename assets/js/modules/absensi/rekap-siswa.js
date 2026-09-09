// ============================================================
// LOGIKA REKAP ABSENSI & CETAK (SISWA)
// ============================================================
function loadRekapSiswa() {
    stopAndBack(false); setActiveMenu('Rekap Kehadiran'); showView('view-rekap-siswa');

    const curDate = new Date();
    const yearInput = document.getElementById('rs_tahun');
    if (yearInput && !yearInput.value) yearInput.value = curDate.getFullYear();

    const monthSelect = document.getElementById('rs_bulan');
    if (monthSelect && monthSelect.options.length === 0) {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        months.forEach((m, i) => { monthSelect.innerHTML += `<option value="${i + 1}" ${i === curDate.getMonth() ? 'selected' : ''}>${m}</option>`; });
    }
    document.getElementById('rs_result').classList.add('hidden');
}

async function cariRekapSiswa() {
    const bln = document.getElementById('rs_bulan').value;
    const thn = document.getElementById('rs_tahun').value;
    if (!bln || !thn) return;

    document.getElementById('rs_result').classList.add('hidden');
    document.getElementById('rs_loading').classList.remove('hidden');

    const startStr = `${thn}-${String(bln).padStart(2, '0')}-01`;
    const lastDay = new Date(thn, bln, 0).getDate();
    const endStr = `${thn}-${String(bln).padStart(2, '0')}-${lastDay}`;

    try {
        const filter = { tanggalMulai: startStr, tanggalAkhir: endStr, kelas: currentUser.kelas };
        const res = await fetchAPI('getAbsensiList', { filter: filter });

        document.getElementById('rs_loading').classList.add('hidden');
        document.getElementById('rs_result').classList.remove('hidden');

        if (res.success) {
            rs_currentData = res.data.filter(d => d.nisn == currentUser.nisn);
            renderTabelRekapSiswa(rs_currentData);
        } else {
            rs_currentData = []; renderTabelRekapSiswa([]);
        }
    } catch (e) {
        document.getElementById('rs_loading').classList.add('hidden');
        showAlert('error', 'Gagal memuat rekap server.');
    }
}

function renderTabelRekapSiswa(data) {
    const tbody = document.getElementById('tbody-rekap-siswa');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-5 text-center text-gray-400 italic">Tidak ada data kehadiran bulan ini.</td></tr>';
        return;
    }

    data.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    const getStatusColor = (s) => {
        if (s === 'Hadir') return 'bg-green-100 text-green-700';
        if (s === 'Izin') return 'bg-blue-100 text-blue-700';
        if (s === 'Sakit') return 'bg-yellow-100 text-yellow-700';
        if (s === 'Alpa') return 'bg-red-100 text-red-700'; return 'bg-gray-100 text-gray-600';
    };

    tbody.innerHTML = data.map(d => {
        let originalKet = String(d.keterangan || "-");
        let rawKet = originalKet.startsWith("Surat:") ? "Melampirkan Bukti" : originalKet;
        let ketHtml = ``;

        if (rawKet.includes("Maps:") && rawKet.includes("Foto:")) {
            const wfhSessions = rawKet.split('||');
            ketHtml = `<div class="flex flex-col items-start gap-1">`;

            wfhSessions.forEach(session => {
                const parts = session.split('|');
                let mapsLink = "", fotoLink = "", statusWfh = "";

                parts.forEach(p => {
                    if (p.includes("Maps:")) mapsLink = p.replace('Maps:', '').trim();
                    else if (p.includes("Foto:")) fotoLink = p.replace('Foto:', '').trim();
                    else if (p.trim() !== "" && !p.includes("Akurasi:") && !p.includes("[LAT:")) statusWfh = p.trim();
                });

                statusWfh = statusWfh.replace(/\[LAT:.*\]/, '').trim();

                let badgeHtml = statusWfh.includes("Terlambat")
                    ? `<div class="w-24 shrink-0"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-history"></i> ${statusWfh}</span></div>`
                    : `<div class="w-24 shrink-0"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate" title="${statusWfh}"><i class="fas fa-check-double"></i> ${statusWfh}</span></div>`;

                ketHtml += `
                <div class="flex flex-nowrap items-center gap-2 p-1 bg-gray-50 rounded-lg w-max">
                    ${badgeHtml}
                    <div class="flex flex-nowrap items-center gap-1">
                        <a href="${fotoLink}" target="_blank" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 py-1 px-2 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Foto</a>
                        <a href="${mapsLink}" target="_blank" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 py-1 px-2 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-map-marker-alt"></i> Map</a>
                    </div>
                </div>`;
            });
            ketHtml += `</div>`;
        }
        else if (originalKet.includes("Surat:")) {
            let suratLink = originalKet.replace('URL Surat:', '').replace('Surat:', '').trim();
            window.adminBuktiCache = window.adminBuktiCache || {};
            let uniqueId = d.tanggal || Math.random().toString(36).substring(7);
            window.adminBuktiCache[uniqueId] = suratLink;
            ketHtml = `
            <div class="flex flex-nowrap items-center gap-1 w-max p-1">
                <button onclick="lihatBuktiAdmin('${uniqueId}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded-lg text-[9px] font-bold transition shadow-sm inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-image"></i> Lihat Bukti</button>
            </div>`;
        }
        else if (rawKet.includes("Terlambat")) { ketHtml = `<div class="w-28"><span class="block text-center text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[9px] truncate"><i class="fas fa-history mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet.includes("Pulang Cepat")) { ketHtml = `<div class="w-28"><span class="block text-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[9px] truncate"><i class="fas fa-running mr-1"></i>${rawKet}</span></div>`; }
        else if (rawKet === "Tepat Waktu") { ketHtml = `<div class="w-28"><span class="block text-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-[9px] truncate"><i class="fas fa-check-double mr-1"></i>${rawKet}</span></div>`; }
        else { ketHtml = `<div class="w-28"><span class="block text-center text-gray-400 font-mono text-[9px] truncate">${rawKet}</span></div>`; }

        return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
            <td class="p-2 text-center text-gray-700 font-medium text-[10px] whitespace-nowrap">${new Date(d.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
            <td class="p-2 text-center"><span class="${getStatusColor(d.status)} px-2 py-1 rounded-lg text-[9px] font-bold">${d.status}</span></td>
            <td class="p-2">${ketHtml}</td>
        </tr>`;
    }).join('');
}

async function downloadPDFRekapSiswa() {
    if (rs_currentData.length === 0) { showAlert('error', 'Tidak ada data untuk diunduh'); return; }

    const btn = document.getElementById('btnDownloadPDFSiswa');
    const originalTxt = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Proses PDF...'; btn.disabled = true;

    try {
        const blnText = document.getElementById('rs_bulan').options[document.getElementById('rs_bulan').selectedIndex].text;
        const thnText = document.getElementById('rs_tahun').value;

        const logoEl = document.querySelector('.dyn-logo');
        if (logoEl && document.getElementById('printLogoSiswa')) document.getElementById('printLogoSiswa').src = logoEl.src;

        const namaSekolahEl = document.querySelector('.dyn-namasekolah');
        if (namaSekolahEl && document.getElementById('printNamaSekolah')) document.getElementById('printNamaSekolah').textContent = namaSekolahEl.textContent;

        const provEl = document.querySelector('.dyn-provinsi');
        if (document.getElementById('printProvinsi')) {
            document.getElementById('printProvinsi').textContent = provEl ? provEl.textContent : (window.appConfig?.nama_dinas || '');
        }

        document.getElementById('printSiswaNama').textContent = currentUser.nama;
        document.getElementById('printSiswaNISN').textContent = currentUser.nisn;
        document.getElementById('printSiswaKelas').textContent = currentUser.kelas;
        document.getElementById('printSiswaPeriode').textContent = `${blnText} ${thnText}`;

        const tbodyPrint = document.getElementById('printTbodyRekapSiswa');
        tbodyPrint.innerHTML = rs_currentData.map((d, i) => `
            <tr>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${new Date(d.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-weight: bold; font-size: 10px;">${d.status}</td>
                <td style="border: 1px solid #000; padding: 0px 4px 8px 4px; text-align: center; font-size: 10px;">${(d.keterangan || '').startsWith('Surat:') ? 'Melampirkan Bukti' : (d.keterangan || '-')}</td>
            </tr>
        `).join('');

        const printArea = document.getElementById('printAreaRekapSiswa');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const canvas = await html2canvas(printArea, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: 800
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.6);

        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        doc.save(`Rekap_Absen_${currentUser.nama}_${blnText}_${thnText}.pdf`);

        showAlert('success', 'PDF Berhasil Diunduh!');
    } catch (error) {
        showAlert('error', 'Gagal membuat PDF. Coba kembali.');
    } finally {
        btn.innerHTML = originalTxt; btn.disabled = false;
    }
}
