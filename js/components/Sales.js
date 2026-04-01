import { state } from '../core/state.js';
import { getEmoji } from '../utils/utils.js';
import { obtenerVentasDiaAPI } from '../api/api.js';
import { showToast } from './Notify.js';

export function renderHorneadasHoy() {
    const container = document.getElementById('resumenHorneadas');
    const grid = document.getElementById('horneadasHoyGrid');
    if (!container || !grid) return;
    if (Object.keys(state.histHorneadasDia).length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    const ordenSrt = [
        "Salteña de Carne Normal",
        "Salteña de Carne Picante",
        "Salteña de Pollo Normal",
        "Salteña de Pollo Picante"
    ];

    let html = '';
    let totalGeneral = 0;

    ordenSrt.forEach(nom => {
        if (state.histHorneadasDia[nom] !== undefined) {
            const cant = state.histHorneadasDia[nom];
            totalGeneral += cant;
            const label = nom.replace(/Salteña de /i, '').replace(/Saltena de /i, '');
            html += `<div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">${getEmoji(nom)}</span>
                    <span style="color:var(--texto-suave);font-size:12px;font-weight:700;">${label}</span>
                </div>
                <span style="font-weight:900;color:var(--naranja);font-size:15px;background:rgba(230,126,34,0.15);padding:2px 8px;border-radius:12px;">${cant}</span>
            </div>`;
        }
    });

    for (let nom in state.histHorneadasDia) {
        if (!ordenSrt.includes(nom)) {
            const cant = state.histHorneadasDia[nom];
            totalGeneral += cant;
            const label = nom.replace(/Salteña de /i, '').replace(/Saltena de /i, '');
            html += `<div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">${getEmoji(nom)}</span>
                    <span style="color:var(--texto-suave);font-size:12px;font-weight:700;">${label}</span>
                </div>
                <span style="font-weight:900;color:var(--naranja);font-size:15px;background:rgba(230,126,34,0.15);padding:2px 8px;border-radius:12px;">${cant}</span>
            </div>`;
        }
    }
    if (totalGeneral > 0) {
        html += `<div style="grid-column:1/-1;background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🔥</span><span style="color:var(--texto);font-size:13px;font-weight:900;">Total Horneadas</span></div>
            <span style="font-weight:900;color:white;font-size:16px;background:var(--naranja);padding:2px 10px;border-radius:12px;">${totalGeneral}</span>
        </div>`;
    }
    grid.innerHTML = html;
}

export function renderVentasDia(data) {
    const lista = document.getElementById('listaPedidos');

    if (!data || !data.pedidos || data.pedidos.length === 0) {
        document.getElementById('rsPedidos').textContent = '0';
        document.getElementById('rsTotal').textContent = 'Bs.0';
        document.getElementById('rsGanancia').textContent = 'Bs.0';
        lista.innerHTML = '<div class="ventas-empty"><span class="empty-icon">🫓</span><p>Sin ventas registradas hoy todavía</p></div>';
        lista.innerHTML += `
    <div class="pedido-card" id="resumenHorneadas" style="margin-top:14px;display:none;">
      <div class="pedido-card-header">
        <span class="pedido-num" style="color:var(--naranja);">🔥 Horneadas del Día</span>
      </div>
      <div class="pedido-items" id="horneadasHoyGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--border);"></div>
    </div>`;
        renderHorneadasHoy();
        return;
    }

    document.getElementById('rsPedidos').textContent = data.totalPedidos;
    document.getElementById('rsTotal').textContent = 'Bs.' + data.totalVentas.toFixed(0);
    document.getElementById('rsGanancia').textContent = 'Bs.' + data.totalGanancia.toFixed(0);

    lista.innerHTML = data.pedidos.map(function (p) {
        const itemsHtml = p.items.map(function (item) {
            return '<div class="pedido-item">' +
                '<span class="pi-nombre">' + getEmoji(item.nombre) + ' ' + item.nombre + '</span>' +
                '<span class="pi-qty">×' + item.cantidad + '</span>' +
                '<span class="pi-precio">Bs.' + item.subtotal + '</span>' +
                '</div>';
        }).join('');

        const iconoPago = p.tipoPago === 'QR' ? '📲 ' : (p.tipoPago === 'Efectivo' ? '💵 ' : '');
        return '<div class="pedido-card">' +
            '<div class="pedido-card-header">' +
            '<span class="pedido-num">Pedido #' + p.numero + '</span>' +
            '<span class="pedido-hora">' + p.hora + '</span>' +
            '<span class="pedido-total">' + iconoPago + 'Bs.' + p.total + '</span>' +
            '</div>' +
            '<div class="pedido-items">' + itemsHtml + '</div>' +
            '</div>';
    }).join('');

    if (data.saltenas || data.totalJugos || data.pagos) {
        lista.innerHTML += `
    <div class="pedido-card" style="margin-top:14px;">
      <div class="pedido-card-header">
        <span class="pedido-num" style="color:var(--dorado);">🫓 Salteñas Vendidas del Día</span>
      </div>
      <div class="pedido-items" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--border);">
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🥟</span><span style="color:var(--texto-suave);font-size:12px;font-weight:700;">Carne Normal</span></div>
            <span style="font-weight:900;color:var(--dorado);font-size:15px;background:rgba(241,196,15,0.15);padding:2px 8px;border-radius:12px;">${data.saltenas.carneNormal}</span>
        </div>
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🥟</span><span style="color:var(--texto-suave);font-size:12px;font-weight:700;">Carne Picante</span></div>
            <span style="font-weight:900;color:var(--dorado);font-size:15px;background:rgba(241,196,15,0.15);padding:2px 8px;border-radius:12px;">${data.saltenas.carnePicante}</span>
        </div>
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🥟</span><span style="color:var(--texto-suave);font-size:12px;font-weight:700;">Pollo Normal</span></div>
            <span style="font-weight:900;color:var(--dorado);font-size:15px;background:rgba(241,196,15,0.15);padding:2px 8px;border-radius:12px;">${data.saltenas.polloNormal}</span>
        </div>
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🥟</span><span style="color:var(--texto-suave);font-size:12px;font-weight:700;">Pollo Picante</span></div>
            <span style="font-weight:900;color:var(--dorado);font-size:15px;background:rgba(241,196,15,0.15);padding:2px 8px;border-radius:12px;">${data.saltenas.polloPicante}</span>
        </div>
        <div style="grid-column:1/-1;background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🫓</span><span style="color:var(--texto);font-size:13px;font-weight:900;">Total Vendidas</span></div>
            <span style="font-weight:900;color:white;font-size:16px;background:var(--dorado);padding:2px 10px;border-radius:12px;">${data.saltenas.total}</span>
        </div>
      </div>
    </div>

    <div class="pedido-card" id="resumenHorneadas" style="margin-top:10px;display:none;">
      <div class="pedido-card-header">
        <span class="pedido-num" style="color:var(--naranja);">🔥 Horneadas del Día</span>
      </div>
      <div class="pedido-items" id="horneadasHoyGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--border);"></div>
    </div>

    <div class="pedido-card" style="margin-top:10px;">
      <div class="pedido-card-header">
        <span class="pedido-num" style="color:#3498db;">🧃 Jugos del día</span>
      </div>
      <div class="pedido-items" style="display:grid;grid-template-columns:1fr;gap:8px;padding:12px;border-top:1px solid var(--border);">
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🥤</span><span style="color:var(--texto-suave);font-size:13px;font-weight:700;">Total Vendidos</span></div>
            <span style="font-weight:900;color:#3498db;font-size:16px;background:rgba(52,152,219,0.15);padding:2px 10px;border-radius:12px;">${data.totalJugos}</span>
        </div>
      </div>
    </div>
  
  <div class="pedido-card" style="margin-top:10px;">
      <div class="pedido-card-header">
        <span class="pedido-num" style="color:#2ecc71;">💳 Tipos de pago</span>
      </div>
      <div class="pedido-items" style="display:grid;grid-template-columns:1fr;gap:8px;padding:12px;border-top:1px solid var(--border);">
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">📲</span><span style="color:var(--texto-suave);font-size:13px;font-weight:700;">QR (${data.pagos.qrCantidad} pedidos)</span></div>
            <span style="font-weight:900;color:#2ecc71;font-size:15px;background:rgba(46,204,113,0.15);padding:2px 10px;border-radius:12px;">Bs.${data.pagos.qrMonto.toFixed(0)}</span>
        </div>
        <div style="background:var(--bg);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">💵</span><span style="color:var(--texto-suave);font-size:13px;font-weight:700;">Efectivo (${data.pagos.efectivoCantidad} pedidos)</span></div>
            <span style="font-weight:900;color:#2ecc71;font-size:15px;background:rgba(46,204,113,0.15);padding:2px 10px;border-radius:12px;">Bs.${data.pagos.efectivoMonto.toFixed(0)}</span>
        </div>
      </div>
    </div>
  `;
    }
    renderHorneadasHoy();
}

export async function cargarVentasDia() {
    const btn = document.getElementById('recargarBtn');
    if (btn) btn.classList.add('loading');
    try {
        const data = await obtenerVentasDiaAPI();
        renderVentasDia(data);
    } catch (e) {
        showToast('❌ Error al cargar ventas');
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}
