import { state } from './state.js';
import { getFechaHoy } from '../utils/utils.js';

export function cargarContadorDia() {
    try {
        const saved = JSON.parse(localStorage.getItem('posContadorDia') || '{}');
        if (saved.fecha === getFechaHoy()) return saved.contador || 0;
    } catch (e) { }
    return 0;
}

export function guardarContadorDia(n) {
    localStorage.setItem('posContadorDia', JSON.stringify({ fecha: getFechaHoy(), contador: n }));
}

export function cargarHornoDia() {
    try {
        const saved = JSON.parse(localStorage.getItem('posHornoDia') || '{}');
        if (saved.fecha === getFechaHoy()) {
            state.horneadas = saved.data || {};
            state.histHorneadasDia = saved.historico || {};
        } else {
            state.horneadas = {};
            state.histHorneadasDia = {};
            guardarHornoEstado();
        }
    } catch (e) { 
        state.horneadas = {}; 
        state.histHorneadasDia = {}; 
    }
}

export function guardarHornoEstado() {
    localStorage.setItem('posHornoDia', JSON.stringify({ 
        fecha: getFechaHoy(), 
        data: state.horneadas, 
        historico: state.histHorneadasDia 
    }));
}

export function cargarEstadoCaja() {
    try {
        const saved = JSON.parse(localStorage.getItem('posEstadoCaja') || '{}');
        if (saved.fecha === getFechaHoy()) {
            state.estadoCaja = saved.estado || 'cerrada';
        } else {
            state.estadoCaja = 'cerrada';
        }
    } catch (e) { state.estadoCaja = 'cerrada'; }
}

export function guardarEstadoCaja() {
    localStorage.setItem('posEstadoCaja', JSON.stringify({ 
        fecha: getFechaHoy(), 
        estado: state.estadoCaja 
    }));
}

export function guardarPedidos() {
    localStorage.setItem('posPedidos', JSON.stringify({
        fecha: getFechaHoy(),
        pedidos: state.pedidos,
        contadorId: state.contadorId
    }));
}

export function cargarPedidos() {
    try {
        const hoy = getFechaHoy();
        const saved = JSON.parse(localStorage.getItem('posPedidos') || '{}');

        if (saved.fecha === hoy && Array.isArray(saved.pedidos)) {
            state.pedidos = saved.pedidos;
            state.contadorId = saved.contadorId || 0;
        } else if (saved.fecha && saved.fecha !== hoy) {
            localStorage.removeItem('posPedidos');
            localStorage.removeItem('posContadorDia');
            state.pedidos = [];
            state.contadorId = 0;
            state.contadorDia = 0;
        }
    } catch (e) { state.pedidos = []; }
}

export function cargarColaVentas() {
    try {
        const guardado = localStorage.getItem('posColaVentas');
        if (guardado) state.colaVentas = JSON.parse(guardado);
    } catch (e) { }
}

export function guardarColaVentas() {
    localStorage.setItem('posColaVentas', JSON.stringify(state.colaVentas));
}

export function guardarOrdenProductos(nombresArray) {
    localStorage.setItem('posOrden', JSON.stringify(nombresArray));
}

export function cargarOrdenProductos() {
    try {
        const item = localStorage.getItem('posOrden');
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
}
