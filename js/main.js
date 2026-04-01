// ═══════════════════════════════════════════════
// main.js — Orquestador Principal (Entry Point)
// ═══════════════════════════════════════════════

// ── Core ──
import { state } from './core/state.js';
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
// Mapeo Global — Compatibilidad con onclick HTML
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
    state.productos = [];
    cargarEstadoCaja();
    cargarHornoDia();
    cargarPedidos();
    state.contadorDia = cargarContadorDia();
    cargarColaVentas();

    // Vinculación del botón de cabecera dinámico
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

    setTimeout(() => {
        actualizarBotonCabecera();
        aplicarBloqueoCaja();
        actualizarSyncUI();
        if (state.colaVentas.length > 0) procesarColaVentas();
    }, 500);

    cargarProductos();
    
    // Configurar monitor de cambio de día a media noche
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
    // Revisar cuando la PWA vuelve a primer plano
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) verificarCambioDeDia();
    });
    // Revisar también cada 10 minutos por si se queda la pantalla encendida
    setInterval(verificarCambioDeDia, 600000);
}

document.addEventListener('DOMContentLoaded', init);
