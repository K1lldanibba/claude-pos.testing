// ═══════════════════════════════════════════════
// js/core/state.js
// Estado central de la aplicación.
//
// SEPARACIÓN DE RESPONSABILIDADES:
//   sessionState  — cambia durante el día (carrito, pedidos, horneadas)
//   tenantConfig  — configuración del negocio (nombre, logo, productos)
//   config        — configuración técnica (apiUrl, flags)
//
// Los campos tenant_id, branch_id y session_id están definidos
// desde ahora para que api.js los incluya en los payloads canónicos.
// Por ahora son null — se poblarán cuando integremos Supabase Auth.
// ═══════════════════════════════════════════════

import { DEFAULT_API_URL } from './constants.js';

export const state = {

    // ── Estado de sesión (cambia durante el día) ──
    productos:          [],
    carrito:            {},
    pedidos:            [],
    horneadas:          {},
    histHorneadasDia:   {},
    tempHorneadas:      {},

    sheetId:            null,
    editandoId:         null,
    contadorId:         0,
    contadorDia:        0,

    estadoCaja:         'cerrada',  // 'abierta' | 'cerrada'
    vistaActual:        'pos',      // 'pos' | 'ventas'
    cartCollapsed:      false,

    procesandoCola:     false,
    colaVentas:         [],

    // Datos temporales para cierre de caja y pago
    datosCierre:        {},
    pedidoPendienteId:  null,

    // ── Configuración técnica ──
    config: {
        apiUrl:    DEFAULT_API_URL,

        // Identidad multi-tenant (null hasta integrar Supabase Auth)
        // Estos valores se poblarán desde el login en Fase 2
        tenantId:  null,
        branchId:  null,
        sessionId: null,  // ID de la sesión/caja del día actual

        // Modo debug — activa logging de payloads canónicos en api.js
        // Cambiar a true temporalmente para verificar el schema en consola
        debug: false,
    },
};

export function updateState(key, value) {
    state[key] = value;
}
