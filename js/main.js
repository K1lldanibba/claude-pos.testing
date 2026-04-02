// ═══════════════════════════════════════════════
// main.js — Orquestador Principal (Entry Point)
// ═══════════════════════════════════════════════

// ── Core ──
import { state } from './core/state.js';
import { subscribe } from './core/store.js';
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
// Cada key de state tiene mapeados sus renders.
// Cuando un componente llama notify('pedidos'),
// TODAS estas funciones se disparan automáticamente.
// ═══════════════════════════════════════════════

function cablearSuscripciones() {
    // Carrito — afecta: lista de items, total, badge, stock disponible
    subscribe('carrito', actualizarCarrito);
    subscribe('carrito', actualizarStockUI);

    // Pedidos en espera — afecta: chips de la barra, stock reservado, botón acción
    subscribe('pedidos', renderChips);
    subscribe('pedidos', actualizarStockUI);
    subscribe('pedidos', actualizarCarrito);

    // Horneadas — afecta: badges de stock en cards de salteñas
    subscribe('horneadas', actualizarStockUI);

    // Cola de ventas offline — afecta: indicador de sync
    subscribe('colaVentas', actualizarSyncUI);

    // Estado de caja — afecta: botón de cabecera, bloqueo de botones
    subscribe('estadoCaja', aplicarBloqueoCaja);
    subscribe('estadoCaja', actualizarBotonCabecera);

    // Pedido en edición — afecta: chips (cuál está activo), botón acción
    subscribe('editandoId', renderChips);
    subscribe('editandoId', actualizarCarrito);
}

// ═══════════════════════════════════════════════
// Mapeo Global — Compatibilidad con onclick HTML
// TODO: eliminar en Fase 1 (Event Delegation)
// ═══════════════════════════════════════════════

window.agregar = agregar;
window.quitar = quitar;
window.limpiarBorrador = limpiarBorrador;
window.accionPrincipal = accionPrincipal;
window.finalizarVenta = finalizarVenta;
window.confirmarPago = confirmarPago;
window.abrirSheet = abrirSheet;
window.cerrarSheet = cerrarSheet;
window.activarEdicion = activarEdicion;
window.terminarEdicion = terminarEdicion;
window.limpiarPedidoSheet = limpiarPedidoSheet;
window.confirmarAperturaCaja = confirmarAperturaCaja;
window.cerrarConfirm = cerrarConfirm;
window.ejecutarConfirm = ejecutarConfirm;
window.abrirHornoModal = abrirHornoModal;
window.cambiarTempHorno = cambiarTempHorno;
window.cerrarHornoModal = cerrarHornoModal;
window.guardarHornoActual = guardarHornoActual;
window.toggleMenu = toggleMenu;
window.cerrarMenu = cerrarMenu;
window.cambiarVista = cambiarVista;
window.cargarVentasDia = cargarVentasDia;
window.cerrarPago = cerrarPago;
window.mostrarErrorServidor = mostrarErrorServidor;
window.cambiarCierre = cambiarCierre;
window.ejecutarCierreCaja = ejecutarCierreCaja;
window.cerrarCierreModal = cerrarCierreModal;
window.abrirCierreCaja = abrirCierreCaja;
window.getCantidadReservada = getCantidadReservada;

window.iniciarDragTactil = iniciarDragTactil;
window.moverDragTactil = moverDragTactil;
window.terminarDragTactil = terminarDragTactil;

window.toggleCart = () => {
    state.cartCollapsed = !state.cartCollapsed;
    actualizarCarrito();
    document.getElementById('cartWidget').classList.toggle('collapsed', state.cartCollapsed);
};

// ═══════════════════════════════════════════════
// Inicialización
// ═══════════════════════════════════════════════

function init() {
    // 1. Cablear suscripciones ANTES de cargar datos
    //    para que cualquier cambio de estado durante
    //    la carga ya dispare los renders correctos
    cablearSuscripciones();

    // 2. Cargar estado persistido
    state.productos = [];
    cargarEstadoCaja();
    cargarHornoDia();
    cargarPedidos();
    state.contadorDia = cargarContadorDia();
    cargarColaVentas();

    // 3. Vincular botón de cabecera dinámico
    const btnCab = document.getElementById('hornoBtn');
    if (btnCab) {
        btnCab.onclick = () => {
            if (state.vistaActual === 'ventas') {
                abrirCierreCaja();
            } else if (state.estadoCaja === 'cerrada') {
                confirmarAperturaCaja();
            } else {
                abrirHornoModal();
            }
        };
    }

    // 4. Render inicial y cola offline
    setTimeout(() => {
        actualizarBotonCabecera();
        aplicarBloqueoCaja();
        actualizarSyncUI();
        if (state.colaVentas.length > 0) procesarColaVentas();
    }, 500);

    // 5. Cargar productos desde API
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
