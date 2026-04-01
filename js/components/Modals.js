import { state } from '../core/state.js';
import { COLORES } from '../core/constants.js';
import { getEmoji } from '../utils/utils.js';
import { guardarPedidos, guardarEstadoCaja, guardarHornoEstado, guardarColaVentas } from '../core/storage.js';
import { registrarProduccionAPI, obtenerVentasDiaAPI } from '../api/api.js';
import { showToast } from './Notify.js';
import { renderChips, actualizarCarrito, limpiarBorrador, procesarColaVentas } from './Cart.js';
import { getCantidadReservada, actualizarStockUI, sincronizarCards, aplicarBloqueoCaja } from './ProductGrid.js';
import { actualizarBotonCabecera } from './Navigation.js';

// ── Cerrar modales ──

export function cerrarSheet() {
    state.sheetId = null;
    document.getElementById('bottomSheet').classList.remove('abierto');
    document.getElementById('overlay').classList.remove('visible');
    renderChips();
}

export function cerrarConfirm() {
    document.getElementById('confirmOverlay').classList.remove('visible');
    window.confirmCallback = null;
}

export function cerrarPago() {
    document.getElementById('pagoOverlay').classList.remove('visible');
    state.pedidoPendienteId = null;
}

export function cerrarHornoModal() {
    document.getElementById('hornoOverlay').classList.remove('visible');
}

export function cerrarCierreModal() {
    document.getElementById('cierreOverlay').classList.remove('visible');
}

// ── Confirmación genérica ──

export function mostrarConfirm(titulo, msg, callback, okText = 'Eliminar', okColor = 'var(--rojo)', icon = '🗑') {
    const cTitle = document.getElementById('confirmTitle');
    const cMsg = document.getElementById('confirmMsg');
    const okBtn = document.getElementById('confirmOkBtn');
    
    if (cTitle) cTitle.textContent = titulo;
    if (cMsg) cMsg.innerText = msg; 

    if (okBtn) {
        okBtn.textContent = okText;
        okBtn.style.background = okColor;
    }

    const iconEl = document.querySelector('.confirm-box .confirm-icon');
    if (iconEl) iconEl.textContent = icon;

    window.confirmCallback = callback;
    document.getElementById('confirmOverlay').classList.add('visible');
}

export function ejecutarConfirm() {
    if (typeof window.confirmCallback === 'function') {
        window.confirmCallback();
    }
    cerrarConfirm();
}

// ── Bottom Sheet (Pedido) ──

export function abrirSheet(id) {
    if (state.editandoId !== null) return;
    const p = state.pedidos.find(p => p.id === id);
    if (!p) return;
    state.sheetId = id;

    const color = COLORES[p.colorIdx];
    document.getElementById('sheetDot').style.background = color.dot;
    document.getElementById('sheetTitulo').textContent = `Pedido #${p.numeroDia}`;

    let html = '';
    for (const k in p.items) {
        if (p.items[k] > 0) {
            const prod = state.productos[k];
            const sub = prod.precio * p.items[k];
            html += `<div class="sheet-item">
                <span class="si-emoji">${getEmoji(prod.nombre)}</span>
                <span class="si-name">${prod.nombre}</span>
                <span class="si-qty">×${p.items[k]}</span>
                <span class="si-price">Bs.${sub}</span>
            </div>`;
        }
    }
    document.getElementById('sheetItems').innerHTML = html;
    document.getElementById('sheetTotal').textContent = p.total;

    document.getElementById('bottomSheet').classList.add('abierto');
    document.getElementById('overlay').classList.add('visible');
    renderChips();
}

// ── Edición de pedido ──

export function activarEdicion() {
    if (state.sheetId === null) return;
    state.editandoId = state.sheetId;
    const p = state.pedidos.find(x => x.id === state.editandoId);
    cerrarSheet();

    document.getElementById('editBar').classList.add('visible');
    document.getElementById('editBarTxt').textContent = `Editando Pedido #${p.numeroDia}`;

    sincronizarCards(p.items);
    actualizarCarrito();
    renderChips();
}

export function terminarEdicion() {
    const p = state.pedidos.find(x => x.id === state.editandoId);
    if (!p || p.total === 0) {
        state.pedidos = state.pedidos.filter(x => x.id !== state.editandoId);
    }
    state.editandoId = null;
    guardarPedidos();
    document.getElementById('editBar').classList.remove('visible');

    limpiarBorrador();
    renderChips();
}

export function limpiarPedidoSheet() {
    if (state.sheetId === null) return;
    mostrarConfirm(
        '🗑 Eliminar Pedido',
        '¿Estás seguro de eliminar este pedido? Se perderán los datos.',
        function () {
            state.pedidos = state.pedidos.filter(p => p.id !== state.sheetId);
            guardarPedidos();
            cerrarSheet();
            actualizarStockUI();
            showToast('🗑 Pedido eliminado');
        }
    );
}

// ── Flujo de Venta/Pago ──

export function finalizarVenta() {
    if (state.sheetId === null) return;
    document.getElementById('pagoOverlay').classList.add('visible');
    state.pedidoPendienteId = state.sheetId;
}

export function confirmarPago(tipo) {
    const pId = state.pedidoPendienteId;
    const p = state.pedidos.find(x => x.id === pId);
    if (!p) return;

    const venta = Object.keys(p.items).map(k => ({
        nombre: state.productos[k].nombre,
        cantidad: p.items[k],
        precio: state.productos[k].precio
    }));

    const txId = 'V' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const nuevaVenta = {
        txId,
        payload: {
            action: 'vender',
            carrito: venta,
            tipoPago: tipo,
            numeroPedido: p.numeroDia,
            txId
        }
    };

    state.colaVentas.push(nuevaVenta);
    guardarColaVentas();

    state.pedidos = state.pedidos.filter(x => x.id !== pId);
    guardarPedidos();

    cerrarPago();
    cerrarSheet();
    showToast(`✅ Venta #${p.numeroDia} guardada`);

    procesarColaVentas();
    actualizarStockUI();
}

// ── Horno ──

export function abrirHornoModal() {
    const btn = document.getElementById('hornoBtn');
    if (btn) {
        btn.classList.add('horno-animado');
        setTimeout(() => btn.classList.remove('horno-animado'), 500);
    }
    const list = document.getElementById('horneadasItemsList');
    let html = '';
    state.tempHorneadas = {};

    state.productos.forEach((p, index) => {
        const n = p.nombre.toLowerCase();
        if (n.includes('salteña') || n.includes('saltena')) {
            let qtyEnCarrito = 0;
            if (state.editandoId !== null) {
                const pd = state.pedidos.find(x => x.id === state.editandoId);
                if (pd && pd.items[index]) qtyEnCarrito = pd.items[index];
            } else {
                qtyEnCarrito = state.carrito[index] || 0;
            }
            const qtyReservada = getCantidadReservada(index, p.nombre);
            const completadas = state.horneadas[p.nombre] || 0;
            const horneadasActuales = Math.max(0, completadas - (qtyEnCarrito + qtyReservada));

            state.tempHorneadas[index] = 0;

            html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
                <div style="flex:1;">
                    <div style="color:var(--texto);font-weight:700;font-size:14px;margin-bottom:4px;">${getEmoji(p.nombre)} ${p.nombre}</div>
                    <div style="color:var(--texto-suave);font-size:12px;">Disponibles: <span style="color:var(--naranja);font-weight:900;font-size:13px;">${horneadasActuales}</span></div>
                </div>
                <div class="controls" style="gap:6px;">
                    <button class="btn-sub" onclick="window.cambiarTempHorno(${index}, -1)" style="width:34px;height:34px;font-size:22px;">−</button>
                    <div class="cant-badge" id="tempHorno-${index}" style="min-width:32px;height:32px;font-size:16px;">+0</div>
                    <button class="btn-add" onclick="window.cambiarTempHorno(${index}, 1)" style="width:34px;height:34px;font-size:22px;background:var(--naranja);">+</button>
                </div>
            </div>`;
        }
    });
    list.innerHTML = html;
    document.getElementById('hornoOverlay').classList.add('visible');
}

export function cambiarTempHorno(index, delta) {
    const p = state.productos[index];
    const stockMaximo = p.stock !== undefined ? p.stock : 999;
    const actualmenteHorneadas = state.horneadas[p.nombre] || 0;
    const limitePermitido = Math.max(0, stockMaximo - actualmenteHorneadas);

    state.tempHorneadas[index] = Math.min(limitePermitido, Math.max(0, state.tempHorneadas[index] + delta));

    const badge = document.getElementById(`tempHorno-${index}`);
    if (!badge) return;
    badge.textContent = '+' + state.tempHorneadas[index];
    badge.classList.toggle('active', state.tempHorneadas[index] > 0);
    if (state.tempHorneadas[index] > 0) {
        badge.style.background = 'var(--naranja)';
        badge.style.color = 'white';
    } else {
        badge.style.background = '';
        badge.style.color = '';
    }
}

export function guardarHornoActual() {
    let resumenArr = [];
    let itemsParaAnadir = [];
    let total = 0;

    state.productos.forEach((p, index) => {
        if (state.tempHorneadas[index] > 0) {
            const cant = state.tempHorneadas[index];
            resumenArr.push(`${getEmoji(p.nombre)} ${p.nombre}: ${cant}`);
            itemsParaAnadir.push({ nombre: p.nombre, cantidad: cant });
            total += cant;
        }
    });

    if (itemsParaAnadir.length === 0) {
        cerrarHornoModal();
        return;
    }

    const mensaje = "¿Vas a confirmar que hornearas?:\n\n" +
        resumenArr.join("\n") +
        `\n\n🔥 Total a hornear: ${total}`;

    mostrarConfirm(
        "🔥 ¿Confirmar Horneadas?",
        mensaje,
        function () {
            itemsParaAnadir.forEach(item => {
                state.horneadas[item.nombre] = (state.horneadas[item.nombre] || 0) + item.cantidad;
                state.histHorneadasDia[item.nombre] = (state.histHorneadasDia[item.nombre] || 0) + item.cantidad;
            });
            guardarHornoEstado();
            actualizarStockUI();

            const txId = 'H' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
            const registros = itemsParaAnadir.map(item => ({
                producto: item.nombre, accion: 'HORNEADA', cantidad: item.cantidad, detalle: 'Registro horneada'
            }));

            registrarProduccionAPI(registros, txId)
                .then(() => showToast('🔥 Horneadas registradas en servidor'))
                .catch(() => showToast('🔥 Horneadas guardadas (sin conexión)'));

            cerrarHornoModal();
        },
        "Confirmar",
        "var(--verde)",
        "🔥"
    );
}

// ── Apertura de Caja ──

export function confirmarAperturaCaja() {
    mostrarConfirm(
        '🔓 Apertura de Caja',
        '¿Confirmas la apertura de caja para iniciar las ventas de hoy?',
        function () {
            state.estadoCaja = 'abierta';
            guardarEstadoCaja();
            actualizarBotonCabecera();
            aplicarBloqueoCaja();

            const txId = 'A' + Date.now();
            registrarProduccionAPI([{ producto: 'CAJA', accion: 'APERTURA', cantidad: 1, detalle: 'Inicio de día' }], txId)
                .then(() => showToast('🔓 Caja abierta en servidor'))
                .catch(() => showToast('🔓 Caja abierta localmente'));
        },
        'Confirmar',
        'var(--verde)',
        '🔓'
    );
}

// ── Cierre de Caja ──

export function abrirCierreModal(ventasMap) {
    state.datosCierre = {};
    let html = '';
    let hayDatos = false;

    const ordenProductos = [
        'Salteña de Carne Normal',
        'Salteña de Carne Picante',
        'Salteña de Pollo Normal',
        'Salteña de Pollo Picante'
    ];

    ordenProductos.forEach((nom, idx) => {
        const horneadasTotal = state.histHorneadasDia[nom] || 0;
        const vendidasTotal = ventasMap[nom] || 0;
        const sobrante = Math.max(0, horneadasTotal - vendidasTotal);
        const label = nom.replace(/Salteña de /i, '');

        if (horneadasTotal > 0) {
            hayDatos = true;
            state.datosCierre[nom] = { sobrante, freezer: 0, merma: 0, horneadas: horneadasTotal, vendidas: vendidasTotal };

            html += `<div style="background:var(--bg);padding:12px;border-radius:12px;margin-bottom:10px;border:1px solid var(--border);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:var(--texto);font-weight:700;font-size:14px;">${getEmoji(nom)} ${label}</span>
                    <span style="color:var(--naranja);font-weight:900;font-size:13px;">Sobran: <span id="cierre-sob-${idx}">${sobrante}</span></span>
                </div>
                <div style="display:flex;gap:4px;font-size:11px;color:var(--texto-suave);margin-bottom:10px;">
                    <span>🔥 Horneadas: ${horneadasTotal}</span>
                    <span>•</span>
                    <span>🛒 Vendidas: ${vendidasTotal}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div style="background:rgba(173,216,230,0.1);border:1px solid rgba(173,216,230,0.3);border-radius:10px;padding:8px;text-align:center;">
                        <div style="color:#add8e6;font-weight:900;font-size:11px;margin-bottom:6px;">❄️ Freezer</div>
                        <div class="controls" style="gap:4px;justify-content:center;">
                            <button class="btn-sub" onclick="window.cambiarCierre('${nom}',${idx},'freezer',-1)" style="width:30px;height:30px;font-size:18px;">−</button>
                            <div class="cant-badge" id="cierre-f-${idx}" style="min-width:28px;height:28px;font-size:14px;background:rgba(173,216,230,0.2);color:#add8e6;">0</div>
                            <button class="btn-add" onclick="window.cambiarCierre('${nom}',${idx},'freezer',1)" style="width:30px;height:30px;font-size:18px;background:#add8e6;">+</button>
                        </div>
                    </div>
                    <div style="background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.3);border-radius:10px;padding:8px;text-align:center;">
                        <div style="color:var(--rojo);font-weight:900;font-size:11px;margin-bottom:6px;">🗑️ Merma</div>
                        <div class="controls" style="gap:4px;justify-content:center;">
                            <button class="btn-sub" onclick="window.cambiarCierre('${nom}',${idx},'merma',-1)" style="width:30px;height:30px;font-size:18px;">−</button>
                            <div class="cant-badge" id="cierre-m-${idx}" style="min-width:28px;height:28px;font-size:14px;background:rgba(192,57,43,0.15);color:var(--rojo);">0</div>
                            <button class="btn-add" onclick="window.cambiarCierre('${nom}',${idx},'merma',1)" style="width:30px;height:30px;font-size:18px;background:var(--rojo);">+</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    });

    if (!hayDatos) {
        html = '<div style="text-align:center;padding:20px;color:var(--texto-suave);font-size:13px;">No se hornearon salteñas hoy.</div>';
    }

    document.getElementById('cierreItemsList').innerHTML = html;
    document.getElementById('cierreOverlay').classList.add('visible');
}

export function cambiarCierre(nom, idx, tipo, delta) {
    const data = state.datosCierre[nom];
    if (!data) return;

    const nuevoVal = Math.max(0, data[tipo] + delta);
    const otroTipo = tipo === 'freezer' ? 'merma' : 'freezer';

    if (nuevoVal + data[otroTipo] > data.sobrante) {
        showToast('⚠️ No puedes asignar más de ' + data.sobrante + ' sobrantes');
        return;
    }

    data[tipo] = nuevoVal;

    const badge = document.getElementById(`cierre-${tipo === 'freezer' ? 'f' : 'm'}-${idx}`);
    if (badge) {
        badge.textContent = nuevoVal;
        if (nuevoVal > 0) {
            badge.style.fontWeight = '900';
            badge.classList.add('active');
        } else {
            badge.style.fontWeight = '';
            badge.classList.remove('active');
        }
    }
}

export function ejecutarCierreCaja() {
    let totalSobrantes = 0;
    let registros = [];
    for (const nom in state.datosCierre) {
        const d = state.datosCierre[nom];
        totalSobrantes += d.sobrante;
        if (d.freezer > 0) registros.push({ producto: nom, accion: 'CIERRE_FREEZER', cantidad: d.freezer, detalle: 'Cierre a Freezer' });
        if (d.merma > 0) registros.push({ producto: nom, accion: 'CIERRE_MERMA', cantidad: d.merma, detalle: 'Cierre a Merma' });
    }

    mostrarConfirm(
        '🔒 ¿Cerrar Caja?',
        `Se registrarán los sobrantes y se bloquearán las ventas.\n\nSobrantes totales: ${totalSobrantes}`,
        function () {
            state.estadoCaja = 'cerrada';
            guardarEstadoCaja();

            // Limpiar horneadas disponibles al cerrar caja
            state.horneadas = {};
            guardarHornoEstado();

            const txId = 'C' + Date.now();
            registros.push({ producto: 'CAJA', accion: 'CIERRE', cantidad: 1, detalle: 'Fin de día' });

            registrarProduccionAPI(registros, txId)
                .then(() => showToast('🔒 Caja cerrada exitosamente'))
                .catch(() => showToast('🔒 Caja cerrada localmente'));

            cerrarCierreModal();
            actualizarBotonCabecera();
            aplicarBloqueoCaja();
        },
        'Cerrar Caja',
        'var(--rojo)',
        '🔒'
    );
}

export async function btnRecargarVentasCierre() {
    showToast('📊 Calculando ventas...');
    try {
        const data = await obtenerVentasDiaAPI();
        const salesMap = {};
        if (data && data.pedidos) {
            data.pedidos.forEach(p => {
                p.items.forEach(it => {
                    const nom = it.nombre;
                    salesMap[nom] = (salesMap[nom] || 0) + it.cantidad;
                });
            });
        }
        abrirCierreModal(salesMap);
    } catch (e) {
        showToast('❌ Error al obtener ventas para el cierre');
    }
}

export function abrirCierreCaja() {
    if (state.estadoCaja === 'cerrada') {
        showToast('🔒 La caja ya se encuentra cerrada');
        return;
    }
    btnRecargarVentasCierre();
}

// ── Error de servidor ──

export function mostrarErrorServidor(numPedido, mssg, carrito) {
    const overlay = document.getElementById('errorOverlay');
    const title = document.getElementById('errorTitle');
    const msg = document.getElementById('errorMsg');
    const itemsCont = document.getElementById('errorItems');
    if (!overlay || !title || !msg || !itemsCont) return;

    title.textContent = `Fallo en Pedido #${numPedido}`;
    msg.textContent = mssg;

    let htmlItems = '';
    if (carrito) {
        carrito.forEach(c => {
            htmlItems += `
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px;">
                    <span style="color:var(--texto);">${getEmoji(c.nombre)} ${c.nombre}</span>
                    <span style="color:var(--texto-suave);font-weight:900;">×${c.cantidad}</span>
                </div>`;
        });
    }
    itemsCont.innerHTML = htmlItems;
    overlay.classList.add('visible');
}
