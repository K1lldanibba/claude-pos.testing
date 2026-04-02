// ═══════════════════════════════════════════════
// js/api/api.js
// Capa de acceso a datos.
//
// ARQUITECTURA (3 capas internas):
//   1. _fetch()         — transporte HTTP puro
//   2. _toGAS_*()       — transformadores Schema → formato GAS actual
//   3. exports públicos — interfaz estable para el resto del frontend
//
// El UI (Cart.js, Modals.js, etc.) llama a los exports con argumentos
// sueltos tal como hoy. api.js ensambla internamente el salePayload
// con el schema nuevo y lo transforma a GAS antes de enviarlo.
//
// Cuando migremos a Supabase, SOLO cambian los transformadores _toGAS_*
// y la función _fetch(). El UI no se toca.
// ═══════════════════════════════════════════════

import { state } from '../core/state.js';

// ────────────────────────────────────────────────
// 1. Transporte
// ────────────────────────────────────────────────

async function _fetch(payload) {
    const res = await fetch(state.config.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return await res.json();
}

// ────────────────────────────────────────────────
// 2. Ensambladores de schema interno
//    Construyen el objeto canónico con snapshots
//    de nombre/precio para preservar histórico.
// ────────────────────────────────────────────────

/**
 * Construye un salePayload canónico.
 * Los snapshots de product_name y unit_price garantizan que
 * cambios futuros de precio no alteren registros históricos.
 *
 * @param {Array}  carrito    — [{nombre, cantidad, precio}]
 * @param {string} tipoPago   — 'QR' | 'Efectivo'
 * @param {number} numPedido  — número de pedido del día
 * @param {string} txId       — id de transacción único
 * @returns {Object} salePayload en formato schema nuevo
 */
function _buildSalePayload(carrito, tipoPago, numPedido, txId) {
    const items = carrito.map(c => ({
        product_name: c.nombre,       // snapshot — inmune a renombres futuros
        quantity:     c.cantidad,
        unit_price:   c.precio,       // snapshot — inmune a cambios de precio
        subtotal:     c.cantidad * c.precio,
    }));

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    return {
        tx_id:        txId,
        order_number: numPedido,
        payment_type: tipoPago,       // 'QR' | 'Efectivo'
        total,
        items,
        // Metadatos para futura integración con Supabase
        // Por ahora se ignoran en el transformador GAS
        tenant_id:  state.config.tenantId  || null,
        branch_id:  state.config.branchId  || null,
        session_id: state.config.sessionId || null,
        created_at: new Date().toISOString(),
    };
}

/**
 * Construye un productionPayload canónico.
 *
 * @param {Array}  registros  — [{producto, accion, cantidad, detalle}]
 * @param {string} txId
 * @returns {Object} productionPayload en formato schema nuevo
 */
function _buildProductionPayload(registros, txId) {
    return {
        tx_id:      txId,
        tenant_id:  state.config.tenantId  || null,
        branch_id:  state.config.branchId  || null,
        session_id: state.config.sessionId || null,
        created_at: new Date().toISOString(),
        records: registros.map(r => ({
            product_name: r.producto,
            action:       r.accion,    // 'HORNEADA' | 'APERTURA' | 'CIERRE_FREEZER' | etc.
            quantity:     r.cantidad,
            detail:       r.detalle || '',
        })),
    };
}

// ────────────────────────────────────────────────
// 3. Transformadores Schema → GAS
//    Traducen el schema canónico al formato que
//    Google Apps Script espera hoy.
//    Al migrar a Supabase, solo se reemplazan estas
//    funciones — el resto del archivo no cambia.
// ────────────────────────────────────────────────

function _toGAS_venta(salePayload) {
    return {
        action:        'vender',
        carrito:       salePayload.items.map(i => ({
            nombre:   i.product_name,
            cantidad: i.quantity,
            precio:   i.unit_price,
        })),
        tipoPago:      salePayload.payment_type,
        numeroPedido:  salePayload.order_number,
        txId:          salePayload.tx_id,
    };
}

function _toGAS_produccion(productionPayload) {
    return {
        action:    'registrarProduccion',
        txId:      productionPayload.tx_id,
        registros: productionPayload.records.map(r => ({
            producto: r.product_name,
            accion:   r.action,
            cantidad: r.quantity,
            detalle:  r.detail,
        })),
    };
}

// ────────────────────────────────────────────────
// 4. API Pública
//    Interfaz estable para Cart.js, Modals.js, etc.
//    Los argumentos son idénticos a la versión anterior
//    para no romper ningún llamador existente.
// ────────────────────────────────────────────────

/**
 * Carga el catálogo de productos desde GAS.
 */
export async function cargarProductosAPI() {
    return await _fetch({ action: 'productos' });
}

/**
 * Registra una producción (horneada, apertura, cierre, etc.)
 *
 * @param {Array}  registros — [{producto, accion, cantidad, detalle}]
 * @param {string} txId
 */
export async function registrarProduccionAPI(registros, txId) {
    const payload    = _buildProductionPayload(registros, txId);
    const gasPayload = _toGAS_produccion(payload);

    // payload (schema canónico) disponible para logging/debugging
    // o para enviar a Supabase en paralelo en el futuro
    _logPayload('produccion', payload);

    return await _fetch(gasPayload);
}

/**
 * Obtiene el resumen de ventas del día desde GAS.
 */
export async function obtenerVentasDiaAPI() {
    return await _fetch({ action: 'ventasDia' });
}

/**
 * Procesa una venta.
 * Ensambla el salePayload internamente con snapshots de
 * nombre/precio antes de transformar y enviar a GAS.
 *
 * @param {Array}  carrito    — [{nombre, cantidad, precio}]
 * @param {string} tipoPago   — 'QR' | 'Efectivo'
 * @param {number} numPedido
 * @param {string} txId
 */
export async function procesarVentaAPI(carrito, tipoPago, numPedido, txId) {
    const salePayload = _buildSalePayload(carrito, tipoPago, numPedido, txId);
    const gasPayload  = _toGAS_venta(salePayload);

    // salePayload (schema canónico) disponible para logging/debugging
    // o para enviar a Supabase en paralelo en el futuro
    _logPayload('venta', salePayload);

    return await _fetch(gasPayload);
}

// ────────────────────────────────────────────────
// 5. Utilidades internas
// ────────────────────────────────────────────────

/**
 * Log controlado de payloads canónicos.
 * En producción solo loggea en modo debug.
 * En el futuro este será el punto de envío dual
 * (GAS + Supabase en paralelo durante la migración).
 */
function _logPayload(type, payload) {
    if (state.config.debug) {
        console.groupCollapsed(`[api.js] payload:${type} — txId: ${payload.tx_id}`);
        console.log(JSON.stringify(payload, null, 2));
        console.groupEnd();
    }
}
