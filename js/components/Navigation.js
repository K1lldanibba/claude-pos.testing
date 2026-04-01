import { state } from '../core/state.js';
import { cargarVentasDia } from './Sales.js';

export function actualizarBotonCabecera() {
    const btn = document.getElementById('hornoBtn');
    if (!btn) return;
    if (state.vistaActual === 'ventas') {
        btn.textContent = '🏁';
        btn.style.color = 'var(--rojo)';
        btn.style.boxShadow = '0 4px 12px rgba(192, 57, 43, 0.3)';
    } else if (state.estadoCaja === 'cerrada') {
        btn.textContent = '🔓';
        btn.style.color = 'var(--dorado)';
        btn.style.boxShadow = '0 4px 12px rgba(241, 196, 15, 0.3)';
    } else {
        btn.textContent = '🔥';
        btn.style.color = 'var(--naranja)';
        btn.style.boxShadow = '0 4px 12px rgba(255, 121, 0, 0.15)';
    }
}

export function toggleMenu() {
    const btn = document.getElementById('menuBtn');
    const dropdown = document.getElementById('menuDropdown');
    const overlay = document.getElementById('menuOverlay');
    const abierto = btn.classList.contains('abierto');

    btn.classList.toggle('abierto', !abierto);
    dropdown.classList.toggle('visible', !abierto);
    overlay.classList.toggle('visible', !abierto);
}

export function cerrarMenu() {
    const btn = document.getElementById('menuBtn');
    const dropdown = document.getElementById('menuDropdown');
    const overlay = document.getElementById('menuOverlay');
    if(btn) btn.classList.remove('abierto');
    if(dropdown) dropdown.classList.remove('visible');
    if(overlay) overlay.classList.remove('visible');
}

export function cambiarVista(v) {
    state.vistaActual = v;
    document.getElementById('vistaVentas').classList.toggle('oculta', v !== 'ventas');
    document.getElementById('productGrid').classList.toggle('oculta', v === 'ventas');
    document.querySelectorAll('.section-label, .bottom-bar').forEach(el => el.classList.toggle('oculta', v === 'ventas'));
    document.getElementById('cartWidget').classList.toggle('oculta', v === 'ventas');
    document.getElementById('headerSub').textContent = (v === 'ventas' ? 'Historial de Ventas' : 'Punto de Venta');

    document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('activo'));
    if (v === 'pos') document.getElementById('menuItemPOS').classList.add('activo');
    if (v === 'ventas') {
        document.getElementById('menuItemVentas').classList.add('activo');
        cargarVentasDia();
    }
    actualizarBotonCabecera();
}
