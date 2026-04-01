import { state } from '../core/state.js';

async function fetchWithState(payload) {
    try {
        const res = await fetch(state.config.apiUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) {
        throw e;
    }
}

export async function cargarProductosAPI() {
    return await fetchWithState({ action: 'productos' });
}

export async function registrarProduccionAPI(registros, txId) {
    return await fetchWithState({ 
        action: 'registrarProduccion', 
        txId, 
        registros 
    });
}

export async function obtenerVentasDiaAPI() {
    return await fetchWithState({ action: 'ventasDia' });
}

export async function procesarVentaAPI(venta, tipoPago, numPedido, txId) {
    return await fetchWithState({
        action: 'vender',
        carrito: venta,
        tipoPago: tipoPago,
        numeroPedido: numPedido,
        txId: txId
    });
}
