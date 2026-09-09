// ============================================================
// PWA INSTALLATION LOGIC
// ============================================================
let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
                if (!reg.active || !reg.active.scriptURL.includes('sw.js')) {
                    await reg.unregister();
                }
            }
            const registration = await navigator.serviceWorker.register('sw.js');
        } catch (error) {
            console.error('SW Registration failed:', error);
        }
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installPopup = document.getElementById('pwaInstallPopup');
    if (installPopup) {
        setTimeout(() => {
            installPopup.classList.remove('-translate-y-full');
        }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('pwaInstallBtn');
    const closeBtn = document.getElementById('pwaCloseBtn');
    const installPopup = document.getElementById('pwaInstallPopup');

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (installPopup) installPopup.classList.add('-translate-y-full');
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (installPopup) installPopup.classList.add('-translate-y-full');
        });
    }

    const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    };

    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    if (isIos() && !isInStandaloneMode()) {
        if (installPopup) {
            const desc = installPopup.querySelector('p');
            if (desc) {
                desc.innerHTML = 'Ketuk ikon <i class="fas fa-share-square mx-1"></i> di bawah, lalu pilih <b>"Add to Home Screen"</b> untuk menginstal.';
            }

            if (installBtn) installBtn.classList.add('hidden');

            setTimeout(() => {
                installPopup.classList.remove('translate-y-full');
            }, 3000);
        }
    }
});
