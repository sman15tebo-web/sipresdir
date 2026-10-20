// ============================================================
// ROUTER & VIEW LOADER
// ============================================================

const viewCache = {};
const viewLoadPromises = {};
let viewNavigationRequestId = 0;

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

    if (viewLoadPromises[viewId]) return viewLoadPromises[viewId];

    viewLoadPromises[viewId] = (async () => {
        try {
            let html = '';
            if (window.electronAPI) {
                html = await window.electronAPI.getView(actualFileName);
            } else {
                const response = await fetch(`views/${actualFileName}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                html = await response.text();
            }

            viewCache[viewId] = html;
            return html;
        } catch (error) {
            console.error(`Gagal memuat view: ${actualFileName}`, error);
            return `<div class="p-8 text-center text-red-500 font-bold">Gagal memuat antarmuka ${actualFileName}</div>`;
        } finally {
            delete viewLoadPromises[viewId];
        }
    })();

    return viewLoadPromises[viewId];
}

function showViewLoadingState(targetEl) {
    targetEl.dataset.viewLoading = 'true';
    targetEl.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat halaman...</div>';
}

async function showView(viewId) {
    const requestId = ++viewNavigationRequestId;
    const isLoginView = viewId === 'loginPage';
    if (isLoginView && typeof showLoading === 'function') showLoading();

    try {
        if (isLoginView) {
            const loginContainer = document.getElementById('loginPage');
            if (loginContainer && loginContainer.innerHTML.trim() === '') {
                const html = await loadHTML('loginPage');
                if (requestId !== viewNavigationRequestId) return;
                loginContainer.innerHTML = html;
            }
            if (requestId !== viewNavigationRequestId) return;
            if (loginContainer) loginContainer.classList.remove('hidden');
            const dash = document.getElementById('dashboardContainer');
            if (dash) dash.classList.add('hidden');
            if (typeof updateViewUI === 'function') updateViewUI(viewId);
            return;
        }

        const targetEl = document.getElementById(viewId);
        if (typeof updateViewUI === 'function') updateViewUI(viewId);
        if (targetEl && (targetEl.innerHTML.trim() === '' || targetEl.dataset.viewLoading === 'true')) {
            showViewLoadingState(targetEl);
            const html = await loadHTML(viewId);
            if (requestId !== viewNavigationRequestId) return;
            targetEl.innerHTML = normalizeViewHTML(viewId, html);
            delete targetEl.dataset.viewLoading;
            if (typeof initViewComponents === 'function') {
                initViewComponents(viewId);
            }
            if (typeof updateViewUI === 'function') updateViewUI(viewId);
        }
    } catch (error) {
        console.error('showView error:', error);
        if (requestId === viewNavigationRequestId && typeof showAlert === 'function') {
            showAlert('error', 'Halaman gagal dimuat. Silakan refresh atau coba lagi.');
        }
    } finally {
        if (isLoginView && typeof hideLoading === 'function') hideLoading();
    }
}

async function preloadViews(viewIds) {
    for (const viewId of viewIds) {
        const targetEl = document.getElementById(viewId);
        if (!targetEl || (targetEl.innerHTML.trim() !== '' && targetEl.dataset.viewLoading !== 'true')) continue;
        const html = await loadHTML(viewId);
        targetEl.innerHTML = normalizeViewHTML(viewId, html);
        delete targetEl.dataset.viewLoading;
        if (typeof initViewComponents === 'function') initViewComponents(viewId);
    }
}

window.showView = showView;
window.loadHTML = loadHTML;
window.preloadViews = preloadViews;
