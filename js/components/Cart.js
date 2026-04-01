import { state } from '../core/state.js';
import { MAX_PEDIDOS, COLORES } from '../core/constants.js';
import { getEmoji, esJugoLeche } from '../utils/utils.js';
import { guardarPedidos, guardarContadorDia, guardarColaVentas, guardarHornoEstado } from '../core/storage.js';
import { procesarVentaAPI } from '../api/api.js';
import { showToast, actualizarSyncUI } from './Notify.js';
// Circular import con ProductGrid - seguro para acceso a nivel de función
import { getCantidadReservada, sincronizarCards, actualizarStockUI } from './ProductGrid.js';

export function actualizarCarrito() {
    const el = document.getElementById('cartItems');
    const badge = document.getElementById('cartCount');
    const total = document.getElementById('total');
    if (!el || !badge || !total) return;

    let sum = 0, count = 0, html = '';

    for (const k in state.carrito) {
        if (state.carrito[k] > 0) {
            const p = state.productos[k];
            const sub = p.precio * state.carrito[k];
            sum += sub; count += state.carrito[k];
            html += `<div class="cart-item">
                <span class="item-name">${getEmoji(p.nombre)} ${p.nombre}</span>
                <span class="item-qty">×${state.carrito[k]}</span>
                <span class="item-price">Bs.${sub}</span>
            </div>`;
        }
    }

    el.innerHTML = html || `<div style="text-align:center;padding:14px;color:var(--texto-suave);font-size:13px;opacity:0.6">Sin productos aún</div>`;
    total.innerHTML = `Total: <span>Bs.${sum}</span>`;
    badge.textContent = count;
    badge.classList.add('pop');
    setTimeout(() => badge.classList.remove('pop'), 300);

    if (state.editandoId === null) {
        const cartWidget = document.getElementById('cartWidget');
        cartWidget.classList.toggle('vacio', count === 0);
        cartWidget.classList.toggle('has-items', count > 0);
        if (count > 0 && state.cartCollapsed) {
            state.cartCollapsed = false;
            cartWidget.classList.remove('collapsed');
        }
    }

    const btn = document.getElementById('accionBtn');
    const lleno = state.pedidos.length >= MAX_PEDIDOS;
    btn.disabled = count === 0 || lleno;
    btn.className = 'modo-iniciar';
    btn.textContent = lleno ? '⚠️ Lleno' : '📋 INICIAR';
}

export function renderChips() {
    const row = document.getElementById('chipsRow');
    if (!row) return;
    row.innerHTML = '';

    state.pedidos.forEach((p) => {
        const chip = document.createElement('div');
        const esActivo = state.sheetId === p.id || state.editandoId === p.id;
        chip.className = `chip ${COLORES[p.colorIdx].chip}${esActivo ? ' activo' : ''}`;
        chip.id = `chip-${p.id}`;
        chip.innerHTML = `<span class="chip-label">#${p.numeroDia}</span><span class="chip-total">Bs.${p.total}</span>`;
        chip.onclick = () => {
            if (state.editandoId !== null) return;
            window.abrirSheet(p.id);
        };
        row.appendChild(chip);
    });

    for (let i = state.pedidos.length; i < MAX_PEDIDOS; i++) {
        const ghost = document.createElement('div');
        ghost.className = 'chip-vacio';
        ghost.textContent = '+';
        row.appendChild(ghost);
    }
}

export function agregar(index) {
    if (state.estadoCaja === 'cerrada') return;
    const p = state.productos[index];
    const stockVal = p.stock !== undefined ? p.stock : 999;

    let qtyEnCarrito = 0;
    if (state.editandoId !== null) {
        const pd = state.pedidos.find(x => x.id === state.editandoId);
        if (pd && pd.items[index]) qtyEnCarrito = pd.items[index];
    } else {
        qtyEnCarrito = state.carrito[index] || 0;
    }

    const qtyReservada = getCantidadReservada(index, p.nombre);

    if (esJugoLeche(p.nombre)) {
        let totalJugos = 0;
        state.productos.forEach((prod, i) => {
            if (esJugoLeche(prod.nombre)) {
                let q = 0;
                if (state.editandoId !== null) {
                    const pd = state.pedidos.find(x => x.id === state.editandoId);
                    if (pd && pd.items[i]) q = pd.items[i];
                } else {
                    q = state.carrito[i] || 0;
                }
                totalJugos += q + getCantidadReservada(i, prod.nombre);
            }
        });
        if (totalJugos >= stockVal) {
            showToast('⚠️ No hay más insumos para jugos/leche');
            return;
        }
    } else if (qtyEnCarrito + qtyReservada >= stockVal) {
        showToast('⚠️ Sin stock disponible');
        return;
    }

    const esSaltena = p.nombre.toLowerCase().includes('salteña') || p.nombre.toLowerCase().includes('saltena');
    if (esSaltena) {
        const completadas = state.horneadas[p.nombre] || 0;
        if (qtyEnCarrito + qtyReservada >= completadas) {
            showToast('🔥 ¡Falta hornear más!');
            return;
        }
    }

    if (state.editandoId !== null) {
        const pd = state.pedidos.find(x => x.id === state.editandoId);
        if (pd) {
            pd.items[index] = (pd.items[index] || 0) + 1;
            pd.total += p.precio;
            guardarPedidos();
        }
    } else {
        state.carrito[index] = (state.carrito[index] || 0) + 1;
    }

    sincronizarCards(state.editandoId !== null ? state.pedidos.find(x => x.id === state.editandoId).items : state.carrito);
    actualizarCarrito();
}

export function quitar(index) {
    if (state.estadoCaja === 'cerrada') return;
    if (state.editandoId !== null) {
        const pd = state.pedidos.find(x => x.id === state.editandoId);
        if (pd && pd.items[index] > 0) {
            pd.items[index]--;
            pd.total -= state.productos[index].precio;
            if (pd.items[index] === 0) delete pd.items[index];
            guardarPedidos();
        }
    } else {
        if (state.carrito[index] > 0) {
            state.carrito[index]--;
            if (state.carrito[index] === 0) delete state.carrito[index];
        }
    }
    sincronizarCards(state.editandoId !== null ? state.pedidos.find(x => x.id === state.editandoId).items : state.carrito);
    actualizarCarrito();
}

export function limpiarBorrador() {
    state.carrito = {};
    sincronizarCards(state.carrito);
    actualizarCarrito();
}

export function accionPrincipal() {
    if (state.pedidos.length >= MAX_PEDIDOS) {
        showToast('⚠️ Máximo 4 pedidos en espera');
        return;
    }
    iniciarPedido();
}

export function iniciarPedido() {
    let items = {}, sum = 0;
    for (const k in state.carrito) {
        if (state.carrito[k] > 0) {
            items[k] = state.carrito[k];
            sum += state.productos[k].precio * items[k];
        }
    }
    if (sum === 0) return;

    state.contadorId++;
    state.contadorDia++;
    guardarContadorDia(state.contadorDia);

    const pedido = {
        id: Date.now(),
        numeroDia: state.contadorDia,
        items: items,
        total: sum,
        colorIdx: (state.contadorDia - 1) % COLORES.length
    };

    if (typeof Android !== 'undefined' && Android.tieneImpresora && Android.tieneImpresora()) {
        const itemsTicket = [];
        for (const k in items) {
            itemsTicket.push({
                nombre: state.productos[k].nombre,
                cantidad: items[k],
                precio: state.productos[k].precio
            });
        }
        const ticketData = {
            numeroDia: state.contadorDia,
            hora: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
            items: itemsTicket
        };
        Android.imprimirTicket(JSON.stringify(ticketData));
    }

    state.pedidos.push(pedido);
    guardarPedidos();
    limpiarBorrador();
    renderChips();
    showToast(`📋 Pedido #${pedido.numeroDia} iniciado`);
}

export async function procesarColaVentas() {
    if (state.procesandoCola || state.colaVentas.length === 0) return;
    state.procesandoCola = true;
    actualizarSyncUI();

    while (state.colaVentas.length > 0) {
        const vAct = state.colaVentas[0];
        try {
            const data = await procesarVentaAPI(
                vAct.payload.carrito,
                vAct.payload.tipoPago,
                vAct.payload.numeroPedido,
                vAct.payload.txId
            );

            if (data && data.error) {
                showToast(`❌ Pedido #${vAct.payload.numeroPedido} falló`);
                if (window.mostrarErrorServidor) {
                    window.mostrarErrorServidor(vAct.payload.numeroPedido, data.error, vAct.payload.carrito);
                }
            } else {
                showToast(`✅ #${vAct.payload.numeroPedido} ${vAct.payload.tipoPago} — Registrada`);

                if (vAct.payload && vAct.payload.carrito) {
                    vAct.payload.carrito.forEach(c => {
                        const n = c.nombre.toLowerCase();
                        if (n.includes('salteña') || n.includes('saltena')) {
                            const actual = state.horneadas[c.nombre] || 0;
                            state.horneadas[c.nombre] = Math.max(0, actual - c.cantidad);
                        }
                        if (esJugoLeche(c.nombre)) {
                            state.productos.forEach(px => {
                                if (esJugoLeche(px.nombre) && px.stock !== undefined) {
                                    px.stock = Math.max(0, px.stock - c.cantidad);
                                }
                            });
                        } else {
                            const pRef = state.productos.find(x => x.nombre === c.nombre);
                            if (pRef && pRef.stock !== undefined) {
                                pRef.stock = Math.max(0, pRef.stock - c.cantidad);
                            }
                        }
                    });
                }
            }

            state.colaVentas.shift();
            guardarColaVentas();
            guardarHornoEstado();
            actualizarStockUI();
            actualizarSyncUI();
        } catch (e) {
            console.warn("Retrying sync later...", e);
            break;
        }
    }
    state.procesandoCola = false;
    actualizarSyncUI();
}
