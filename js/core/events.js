// ═══════════════════════════════════════════════
// js/core/events.js
// Router Maestro de Eventos (Event Delegation)
//
// UN solo listener en document intercepta todos
// los clicks y los enruta por data-action.
//
// Los touch events del D&D táctil se delegan
// desde el contenedor #productGrid.
//
// CONVENCIÓN data-action:
//   <button data-action="agregar" data-index="2">
//   <div data-action="cambiarVista" data-vista="pos">
//   <button data-action="confirmarPago" data-tipo="QR">
// ═══════════════════════════════════════════════

import { state } from './state.js';

// Componentes — importados aquí para que el router
// sea el único punto de acoplamiento UI ↔ lógica
import { actualizarCarrito, renderChips, agregar, quitar, limpiarBorrador, accionPrincipal } from '../components/Cart.js';
import { toggleMenu, cerrarMenu, cambiarVista } from '../components/Navigation.js';
import { iniciarDragTactil, moverDragTactil, terminarDragTactil } from '../components/ProductGrid.js';
import { cargarVentasDia } from '../components/Sales.js';
import {
    cerrarSheet, cerrarConfirm, cerrarPago, cerrarHornoModal, cerrarCierreModal,
    ejecutarConfirm, abrirHornoModal,
    confirmarAperturaCaja, finalizarVenta, confirmarPago,
    activarEdicion, terminarEdicion, limpiarPedidoSheet,
    abrirCierreCaja, cambiarCierre, ejecutarCierreCaja,
    guardarHornoActual, cambiarTempHorno,
} from '../components/Modals.js';

// ────────────────────────────────────────────────
// 1. Mapa de Acciones
//    Cada key es el valor de data-action.
//    Recibe el elemento disparador para leer
//    sus data-* adicionales.
// ────────────────────────────────────────────────

const ACCIONES = {

    // ── Menú ──
    toggleMenu:     ()    => toggleMenu(),
    cerrarMenu:     ()    => cerrarMenu(),
    cambiarVista:   (el)  => { cambiarVista(el.dataset.vista); cerrarMenu(); },

    // ── Botón de cabecera (🔥 / 🔓 / 🏁) ──
    accionCabecera: ()    => {
        if (state.vistaActual === 'ventas')   return abrirCierreCaja();
        if (state.estadoCaja === 'cerrada')   return confirmarAperturaCaja();
        abrirHornoModal();
    },

    // ── Carrito ──
    toggleCart: () => {
        state.cartCollapsed = !state.cartCollapsed;
        actualizarCarrito();
        document.getElementById('cartWidget')
            .classList.toggle('collapsed', state.cartCollapsed);
    },
    limpiarBorrador: () => limpiarBorrador(),
    accionPrincipal: () => accionPrincipal(),

    // ── Cards de productos ──
    agregar: (el) => agregar(parseInt(el.dataset.index)),
    quitar:  (el) => quitar(parseInt(el.dataset.index)),

    // ── Barra de edición ──
    terminarEdicion: () => terminarEdicion(),

    // ── Bottom Sheet ──
    cerrarSheet:       () => cerrarSheet(),
    activarEdicion:    () => activarEdicion(),
    limpiarPedidoSheet:() => limpiarPedidoSheet(),
    finalizarVenta:    () => finalizarVenta(),

    // ── Vista ventas ──
    cargarVentasDia: () => cargarVentasDia(),

    // ── Modal de pago ──
    cerrarPago:    ()    => cerrarPago(),
    confirmarPago: (el)  => confirmarPago(el.dataset.tipo),

    // ── Modal de error de stock ──
    cerrarError: () => {
        document.getElementById('errorOverlay').classList.remove('visible');
    },

    // ── Modal horno ──
    cerrarHornoModal:  () => cerrarHornoModal(),
    guardarHornoActual:() => guardarHornoActual(),

    // ── Modal horno — controles dinámicos (generados en Modals.js) ──
    cambiarTempHorno: (el) => {
        cambiarTempHorno(
            parseInt(el.dataset.index),
            parseInt(el.dataset.delta)
        );
    },

    // ── Modal cierre de caja ──
    cerrarCierreModal:  () => cerrarCierreModal(),
    ejecutarCierreCaja: () => ejecutarCierreCaja(),

    // ── Modal cierre — controles dinámicos (generados en Modals.js) ──
    cambiarCierre: (el) => {
        cambiarCierre(
            el.dataset.nom,
            parseInt(el.dataset.idx),
            el.dataset.tipo,
            parseInt(el.dataset.delta)
        );
    },

    // ── Modal confirmación genérica ──
    cerrarConfirm:  () => cerrarConfirm(),
    ejecutarConfirm:() => ejecutarConfirm(),
};

// ────────────────────────────────────────────────
// 2. Router de Clicks
// ────────────────────────────────────────────────

function _onDocumentClick(e) {
    // Sube por el DOM desde el elemento clickeado
    // hasta encontrar un data-action o llegar a document
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const accion = target.dataset.action;
    const handler = ACCIONES[accion];

    if (!handler) {
        console.warn(`[events] Acción no registrada: "${accion}"`);
        return;
    }

    handler(target);
}

// ────────────────────────────────────────────────
// 3. Delegación de Touch — Drag & Drop táctil
//    Los eventos se capturan en el grid contenedor
//    para no necesitar listeners en cada card.
// ────────────────────────────────────────────────

function _onGridTouchStart(e) {
    // Si el dedo está sobre un botón, ignorar
    // (los botones + / − no deben activar el D&D)
    if (e.target.closest('button')) return;

    const card = e.target.closest('.card');
    if (!card) return;

    const index = parseInt(card.dataset.index);
    if (isNaN(index)) return;

    iniciarDragTactil(e, index);
}

function _onGridTouchMove(e) {
    moverDragTactil(e);
}

function _onGridTouchEnd(e) {
    terminarDragTactil(e);
}

// ────────────────────────────────────────────────
// 4. Inicialización
//    Llamar una vez desde main.js al arrancar.
// ────────────────────────────────────────────────

export function initEvents() {
    // Click global — delegado desde document
    document.addEventListener('click', _onDocumentClick);

    // Touch D&D — delegado desde el grid
    // Se espera a que el DOM esté listo para
    // que #productGrid exista al momento del bind
    const bindGrid = () => {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        grid.addEventListener('touchstart', _onGridTouchStart, { passive: false });
        grid.addEventListener('touchmove',  _onGridTouchMove,  { passive: false });
        grid.addEventListener('touchend',   _onGridTouchEnd,   { passive: false });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindGrid);
    } else {
        bindGrid();
    }
}
