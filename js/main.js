// ═══════════════════════════════════════════════
// main.js — Orquestador Principal (Entry Point)
// ═══════════════════════════════════════════════

// ── Core ──
import { state } from './core/state.js';
import { subscribe } from './core/store.js';
import { initEvents } from './core/events.js';
import { cargarEstadoCaja, cargarHornoDia, cargarPedidos, cargarContadorDia, cargarColaVentas } from './core/storage.js';

// ── Utils ──
import { getFechaHoy } from './utils/utils.js';

// ── Componentes ──
import { showToast, actualizarSyncUI } from './components/Notify.js';
import { toggleMenu, cerrarMenu, cambiarVista, actualizarBotonCabecera } from './components/Navigation.js';
import {
    cargarProductos, aplicarBloqueoCaja, actualizarStockUI, getCantidadReservada,
    iniciarDragTactil, moverDragTactil, terminarDragTactil
} from './components/ProductGrid.js';
import { actualizarCarrito, renderChips, agregar, quitar, limpiarBorrador, accionPrincipal, procesarColaVentas } from './components/Cart.js';
import { cargarVentasDia } from './components/Sales.js';
import {
    cerrarSheet, cerrarConfirm, cerrarPago, cerrarHornoModal, cerrarCierreModal,
    abrirSheet, mostrarConfirm, ejecutarConfirm,
    abrirHornoModal, cambiarTempHorno, guardarHornoActual,
    confirmarAperturaCaja, finalizarVenta, confirmarPago,
    activarEdicion, terminarEdicion, limpiarPedidoSheet,
    abrirCierreCaja, cambiarCierre, ejecutarCierreCaja,
    mostrarErrorServidor
} from './components/Modals.js';

// ═══════════════════════════════════════════════
// Suscripciones Reactivas
// ═══════════════════════════════════════════════

function cablearSuscripciones() {
    subscribe('carrito',    actualizarCarrito);
    subscribe('carrito',    actualizarStockUI);

    subscribe('pedidos',    renderChips);
    subscribe('pedidos',    actualizarStockUI);
    subscribe('pedidos',    actualizarCarrito);

    subscribe('horneadas',  actualizarStockUI);

    subscribe('colaVentas', actualizarSyncUI);

    subscribe('estadoCaja', aplicarBloqueoCaja);
    subscribe('estadoCaja', actualizarBotonCabecera);

    subscribe('editandoId', renderChips);
    subscribe('editandoId', actualizarCarrito);
}

// ═══════════════════════════════════════════════
// Mapeo Global — compatibilidad con HTML dinámico
// generado por Modals.js (horno, cierre de caja)
// TODO: eliminar en Parte B cuando Modals.js
//       migre sus templates a data-action
// ═══════════════════════════════════════════════

window.abrirSheet           = abrirSheet;
window.mostrarErrorServidor = mostrarErrorServidor;
window.getCantidadReservada = getCantidadReservada;

// ═══════════════════════════════════════════════
// Inicialización
// ═══════════════════════════════════════════════

function init() {
    // 1. Router de eventos — primero para capturar
    //    cualquier click que ocurra durante la carga
    initEvents();

    // 2. Suscripciones reactivas
    cablearSuscripciones();

    // 3. Estado persistido
    state.productos = [];
    cargarEstadoCaja();
    cargarHornoDia();
    cargarPedidos();
    state.contadorDia = cargarContadorDia();
    cargarColaVentas();

    // 4. Render inicial y cola offline
    setTimeout(() => {
        actualizarBotonCabecera();
        aplicarBloqueoCaja();
        actualizarSyncUI();
        if (state.colaVentas.length > 0) procesarColaVentas();
    }, 500);

    // 5. Productos desde API
    cargarProductos();

    // 6. Monitor de cambio de día
    configurarMonitoreoDia();
}

// ═══════════════════════════════════════════════
// Monitor de Media Noche
// ═══════════════════════════════════════════════

const appFechaInit = getFechaHoy();

function verificarCambioDeDia() {
    if (appFechaInit !== getFechaHoy()) {
        showToast('🔄 Cambio de día. Sincronizando sistema...', 'warning');
        setTimeout(() => location.reload(), 2000);
    }
}

function configurarMonitoreoDia() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) verificarCambioDeDia();
    });
    setInterval(verificarCambioDeDia, 600000);
}

document.addEventListener('DOMContentLoaded', init);
