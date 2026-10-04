// ============================================================
// ROUTER & VIEW LOADER
// ============================================================

const viewCache = {};

function normalizeViewHTML(viewId, html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const root = template.content.firstElementChild;

    // View files historically contain a wrapper with the same ID as the
    // empty container in index.html. Keep only its contents to avoid nested
    // duplicate IDs and conflicting hidden/active styles.
    if (root && root.id === viewId && root.classList.contains('view-section')) {
        return root.innerHTML;
    }
    return html;
}

async function loadHTML(viewId) {
    const filename = viewId.replace('view-', '') + '.html';
    
    // Khusus loginPage, tidak ada awalan view-
    const actualFileName = viewId === 'loginPage' ? 'login.html' : filename;

    if (viewCache[viewId]) {
        return viewCache[viewId];
    }
    
    try {
        let html = '';
        // Cek jika berjalan di aplikasi Desktop (Offline Mode)
        if (window.electronAPI) {
            html = await window.electronAPI.getView(actualFileName);
        } else {
            // Berjalan di Web (Online Mode)
            const response = await fetch(`views/${actualFileName}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            html = await response.text();
        }
        
        viewCache[viewId] = html;
        return html;
    } catch (error) {
        console.error(`Gagal memuat view: ${actualFileName}`, error);
        return `<div class="p-8 text-center text-red-500 font-bold">Gagal memuat antarmuka ${actualFileName}</div>`;
    }
}

async function showView(viewId) {
    if (typeof showLoading === 'function') showLoading();

    try {
        if (viewId === 'loginPage') {
            const loginContainer = document.getElementById('loginPage');
            if (loginContainer && loginContainer.innerHTML.trim() === '') {
                const html = await loadHTML('loginPage');
                loginContainer.innerHTML = html;
            }
            if (loginContainer) loginContainer.classList.remove('hidden');
            const dash = document.getElementById('dashboardContainer');
            if (dash) dash.classList.add('hidden');

            if (typeof updateViewUI === 'function') updateViewUI(viewId);
            return;
        }

        const targetEl = document.getElementById(viewId);
        if (targetEl) {
            if (targetEl.innerHTML.trim() === '') {
                const html = await loadHTML(viewId);
                targetEl.innerHTML = normalizeViewHTML(viewId, html);

                if (typeof initViewComponents === 'function') {
                    initViewComponents(viewId);
                }
            }
        }

        if (typeof updateViewUI === 'function') updateViewUI(viewId);
    } catch (error) {
        console.error('showView error:', error);
        if (typeof showAlert === 'function') {
            showAlert('error', 'Halaman gagal dimuat. Silakan refresh atau coba lagi.');
        }
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

async function preloadViews(viewIds) {
    for (const viewId of viewIds) {
        const targetEl = document.getElementById(viewId);
        if (!targetEl || targetEl.innerHTML.trim() !== '') continue;
        const html = await loadHTML(viewId);
        targetEl.innerHTML = normalizeViewHTML(viewId, html);
        if (typeof initViewComponents === 'function') initViewComponents(viewId);
    }
}

window.showView = showView;
window.loadHTML = loadHTML;
window.preloadViews = preloadViews;
