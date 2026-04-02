// ═══════════════════════════════════════════════
// js/core/store.js
// Proxy Reactivo + Sistema Pub/Sub
//
// RESPONSABILIDADES:
//   1. Envolver `state` en un Proxy que detecta
//      asignaciones directas (state.estadoCaja = ...)
//   2. Exponer subscribe(key, fn) para que main.js
//      cablee qué render se dispara ante cada cambio
//   3. Exponer notify(key) para mutaciones anidadas
//      (state.carrito[i]++, state.pedidos.push(...))
//      donde el Proxy no llega automáticamente
//
// FLUJO:
//   Mutación directa  → Proxy.set() → notify() → suscriptores
//   Mutación anidada  → componente llama notify() → suscriptores
//
// MIGRACIÓN FUTURA:
//   Cuando los componentes usen setState() en vez de
//   mutar state directo, el notify() manual desaparece
//   y todo pasa por el Proxy automáticamente.
// ═══════════════════════════════════════════════

import { state } from './state.js';

// ────────────────────────────────────────────────
// 1. Mapa de suscriptores
//    key del state → [fn, fn, ...]
// ────────────────────────────────────────────────

const _subs = new Map();

// ────────────────────────────────────────────────
// 2. API Pública
// ────────────────────────────────────────────────

/**
 * Registra una función que se ejecuta automáticamente
 * cuando la key del state cambia.
 *
 * Uso en main.js:
 *   subscribe('pedidos', () => renderChips());
 *   subscribe('pedidos', () => actualizarStockUI());
 *   // Ambas se disparan cuando state.pedidos cambia
 *
 * @param {string}   key — propiedad de state a observar
 * @param {Function} fn  — callback sin argumentos
 */
export function subscribe(key, fn) {
    if (!_subs.has(key)) _subs.set(key, []);
    _subs.get(key).push(fn);
}

/**
 * Dispara manualmente los suscriptores de una key.
 * Necesario para mutaciones anidadas donde el Proxy
 * no detecta el cambio automáticamente:
 *
 *   state.carrito[index]++     ← Proxy NO lo ve
 *   notify('carrito')          ← dispara renders manualmente
 *
 *   state.pedidos.push(p)      ← Proxy NO lo ve
 *   notify('pedidos')          ← dispara renders manualmente
 *
 * @param {string} key — propiedad de state a notificar
 */
export function notify(key) {
    const fns = _subs.get(key);
    if (!fns) return;
    fns.forEach(fn => {
        try {
            fn();
        } catch (e) {
            console.error(`[store] Error en suscriptor de "${key}":`, e);
        }
    });
}

/**
 * Muta una key del state y notifica automáticamente.
 * Alternativa más explícita a mutar state directo.
 * Los componentes pueden usarlo ya, o esperar al
 * refactor de Event Delegation.
 *
 *   setState('estadoCaja', 'cerrada');
 *   // equivale a: state.estadoCaja = 'cerrada' + notify()
 *
 * @param {string} key
 * @param {*}      value
 */
export function setState(key, value) {
    state[key] = value; // el Proxy lo intercepta y hace el notify
}

// ────────────────────────────────────────────────
// 3. Proxy Reactivo
//    Intercepta asignaciones directas a state:
//      state.estadoCaja = 'cerrada'  ✓ detectado
//      state.carrito[0] = 1          ✗ no detectado → usar notify()
// ────────────────────────────────────────────────

const _handler = {
    set(target, key, value) {
        const anterior = target[key];
        target[key] = value;

        // Solo notificar si el valor realmente cambió
        // (evita renders innecesarios por asignaciones idempotentes)
        if (anterior !== value) {
            notify(key);
        }

        return true; // obligatorio en Proxy.set
    },
};

// `store` es el state envuelto en el Proxy.
// Los componentes que quieran reactividad automática
// deben importar `store` en vez de `state` para sus mutaciones.
// Por ahora coexisten — la migración es gradual.
export const store = new Proxy(state, _handler);

// ────────────────────────────────────────────────
// 4. Dev helper
//    Lista las keys con suscriptores activos.
//    Útil para debugging en consola:
//      import { storeDebug } from './core/store.js'
//      storeDebug()
// ────────────────────────────────────────────────

export function storeDebug() {
    console.group('[store] Suscriptores activos');
    _subs.forEach((fns, key) => {
        console.log(`  ${key}: ${fns.length} suscriptor(es)`);
    });
    console.groupEnd();
}
