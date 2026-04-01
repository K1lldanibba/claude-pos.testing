import { state } from '../core/state.js';

let toastTimer = null;

export function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export function actualizarSyncUI() {
    const ind = document.getElementById('syncIndicator');
    if (ind) {
        if (state.colaVentas.length > 0 || state.procesandoCola) {
            ind.innerHTML = '<div class="spinner"></div> Subiendo ' + (state.colaVentas.length || 1) + '...';
            ind.classList.add('visible');
        } else {
            ind.classList.remove('visible');
        }
    }
}
