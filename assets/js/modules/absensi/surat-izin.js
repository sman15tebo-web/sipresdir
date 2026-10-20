// ==========================================
// CONTOH SURAT IZIN / SAKIT SISWA
// ==========================================

function bukaModalContohSurat() {
    if (window.settings && window.settings.url_template_surat) {
        window.open(window.settings.url_template_surat, '_blank');
        return;
    }

    let customTemplateUrl = window.appConfig && window.appConfig.url_template_surat ? window.appConfig.url_template_surat : null;

    let bodyContent = '';
    let footerContent = '';

    if (customTemplateUrl) {
        let isImage = customTemplateUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;

        if (isImage) {
            bodyContent = `
                <div class="p-4 text-center">
                    <p class="text-gray-600 mb-4 text-sm font-medium">Sekolah Anda telah menyediakan format template surat khusus:</p>
                    <img src="${customTemplateUrl}" alt="Template Surat" class="max-w-full h-auto mx-auto rounded-lg shadow border border-gray-200 mb-4 max-h-[60vh] object-contain">
                </div>
            `;
        } else {
            bodyContent = `
                <div class="p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
                    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                        <i class="fas fa-file-download"></i>
                    </div>
                    <h4 class="text-lg font-bold text-gray-800 mb-2">Template Surat Tersedia</h4>
                    <p class="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Sekolah telah menyediakan format khusus untuk surat izin/sakit. Silakan unduh file template tersebut.</p>
                </div>
            `;
        }

        footerContent = `
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition w-full sm:w-auto">
                Tutup
            </button>
            <a href="${customTemplateUrl}" target="_blank" download class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:emerald-700 shadow-md transition flex items-center justify-center gap-2 w-full sm:w-auto">
                <i class="fas fa-download"></i> Unduh File Template
            </a>
        `;
    } else {
        bodyContent = `
            <div class="p-6 overflow-y-auto bg-gray-50 text-sm text-gray-800 leading-relaxed font-serif" style="background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px;">
                <div class="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-200" id="teksContohSurat">
                    <p class="text-right mb-4">................., .................... 20...</p>
                    
                    <p class="mb-4">
                        Yth. Bapak/Ibu Wali Kelas<br>
                        Di Sekolah
                    </p>
                    
                    <p class="mb-4">Dengan hormat,</p>
                    <p class="mb-2">Yang bertanda tangan di bawah ini, selaku Orang Tua / Wali Murid dari:</p>
                    
                    <table class="mb-4 ml-4">
                        <tr><td class="pr-4 py-1">Nama</td><td>: .......................................</td></tr>
                        <tr><td class="pr-4 py-1">Kelas</td><td>: .......................................</td></tr>
                        <tr><td class="pr-4 py-1">NISN</td><td>: .......................................</td></tr>
                    </table>
                    
                    <p class="mb-4 text-justify">
                        Memberitahukan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada hari ini dikarenakan <strong>Sakit / Ada Keperluan Keluarga (Izin)*</strong>.
                    </p>
                    
                    <p class="mb-6 text-justify">
                        Demikian surat keterangan ini kami sampaikan agar dapat dimaklumi. Atas perhatian dan izin dari Bapak/Ibu, kami ucapkan terima kasih.
                    </p>
                    
                    <div class="flex justify-end mt-8">
                        <div class="text-center">
                            <p class="mb-16">Hormat kami,</p>
                            <p class="font-bold">( ....................................... )</p>
                            <p class="text-xs text-gray-500">Tanda tangan & Nama Terang</p>
                        </div>
                    </div>
                    
                    <p class="text-[10px] text-gray-400 mt-8 italic border-t pt-2">* Coret yang tidak perlu / Sesuaikan alasannya.</p>
                </div>
            </div>
        `;

        footerContent = `
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition w-full sm:w-auto">
                Tutup
            </button>
            <button type="button" onclick="unduhContohSurat()" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 w-full sm:w-auto">
                <i class="fas fa-file-word"></i> Unduh Surat (DOC)
            </button>
        `;
    }

    const htmlContent = `
        <div class="bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex justify-between items-center shrink-0">
                <h3 class="text-white font-bold text-lg flex items-center gap-2">
                    <i class="fas fa-file-alt"></i> Contoh Surat Keterangan
                </h3>
                <button type="button" onclick="closeModal()" class="text-blue-100 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            ${bodyContent}
            
            <div class="p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                ${footerContent}
            </div>
        </div>
    `;
    showModal(htmlContent);
}

function unduhContohSurat() {
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Contoh Surat Keterangan</title>
        <!--[if gte mso 9]>
        <xml>
            <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
            @page Section1 {
                size: 8.27in 11.69in; /* A4 size */
                margin: 2cm 2cm 2cm 2cm;
                mso-header-margin: 35.4pt;
                mso-footer-margin: 35.4pt;
                mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body, p, table, td, span { 
                font-family: 'Arial', sans-serif; 
                font-size: 12pt; 
                line-height: 1.5; 
            }
            p { margin: 0 0 10pt 0; }
        </style>
    </head>
    <body>
        <div class="Section1">
            <p style="text-align: right;">................., .................... 20...</p>
            <p>Yth. Bapak/Ibu Wali Kelas<br>Di Sekolah</p>
            <p>Dengan hormat,</p>
            <p>Yang bertanda tangan di bawah ini, selaku Orang Tua / Wali Murid dari:</p>
            <table style="margin-left: 20px; width: 100%;">
                <tr><td width="80" style="padding: 2px 0;">Nama</td><td style="padding: 2px 0;">: .......................................</td></tr>
                <tr><td width="80" style="padding: 2px 0;">Kelas</td><td style="padding: 2px 0;">: .......................................</td></tr>
                <tr><td width="80" style="padding: 2px 0;">NISN</td><td style="padding: 2px 0;">: .......................................</td></tr>
            </table>
            <p style="text-align: justify; margin-top: 10pt;">Memberitahukan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada hari ini dikarenakan <strong>Sakit / Ada Keperluan Keluarga (Izin)</strong>*.</p>
            <p style="text-align: justify;">Demikian surat keterangan ini kami sampaikan agar dapat dimaklumi. Atas perhatian dan izin dari Bapak/Ibu, kami ucapkan terima kasih.</p>
            <br>
            <table style="width: 100%;">
                <tr>
                    <td width="60%"></td>
                    <td width="40%" style="text-align: center;">
                        <p>Hormat kami,</p>
                        <br><br><br>
                        <p>( ....................................... )<br>Orang Tua / Wali Murid</p>
                    </td>
                </tr>
            </table>
            <p style="font-size: 10pt; color: #666; margin-top: 30pt;">* Coret yang tidak perlu / Sesuaikan alasannya.</p>
        </div>
    </body>
    </html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Contoh_Surat_Keterangan.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}