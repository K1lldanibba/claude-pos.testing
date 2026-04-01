import { state } from '../core/state.js';
import { getEmoji, esJugoLeche, esStockBajo } from '../utils/utils.js';
import { cargarProductosAPI } from '../api/api.js';
import { showToast } from './Notify.js';
// Circular import con Cart - seguro para acceso a nivel de función
import { actualizarCarrito, renderChips } from './Cart.js';
import { guardarOrdenProductos, cargarOrdenProductos } from '../core/storage.js';

let dragSrc = null;
let dragGhost = null;
let dragOver = null;
let longPressTimer = null;
let dragActivo = false;
let touchStartX = 0;
let touchStartY = 0;

export function getCantidadReservada(index, nombre) {
    let qty = 0;
    state.pedidos.forEach(pd => {
        if (pd.id !== state.editandoId && pd.items && pd.items[index]) {
            qty += pd.items[index];
        }
    });
    state.colaVentas.forEach(cv => {
        if (cv.payload && cv.payload.carrito) {
            const found = cv.payload.carrito.find(c => c.nombre === nombre);
            if (found) qty += found.cantidad;
        }
    });
    return qty;
}

export function actualizarStockUI() {
    if (!state.productos.length) return;
    
    let totalJugosTomados = 0;
    state.productos.forEach((p, idx) => {
        if (esJugoLeche(p.nombre)) {
            let qty = 0;
            if (state.editandoId !== null) {
                const pd = state.pedidos.find(x => x.id === state.editandoId);
                if (pd && pd.items[idx]) qty = pd.items[idx];
            } else {
                qty = state.carrito[idx] || 0;
            }
            totalJugosTomados += qty + getCantidadReservada(idx, p.nombre);
        }
    });

    state.productos.forEach((p, index) => {
        const card = document.getElementById(`card-${index}`);
        if (!card) return;
        const btnAdd = card.querySelector('.btn-add');
        const btnSub = card.querySelector('.btn-sub');

        let qtyEnCarrito = 0;
        if (state.editandoId !== null) {
            const pd = state.pedidos.find(x => x.id === state.editandoId);
            if (pd && pd.items[index]) qtyEnCarrito = pd.items[index];
        } else {
            qtyEnCarrito = state.carrito[index] || 0;
        }

        const qtyReservada = getCantidadReservada(index, p.nombre);
        const stockVal = p.stock !== undefined ? p.stock : 999;

        let stockRestante = 0;
        if (esJugoLeche(p.nombre)) {
            stockRestante = stockVal - totalJugosTomados;
        } else {
            stockRestante = stockVal - (qtyEnCarrito + qtyReservada);
        }

        card.classList.remove('sin-stock', 'stock-bajo');
        card.querySelectorAll('.badge-stock').forEach(b => b.remove());

        const esSaltena = p.nombre.toLowerCase().includes('salteña') || p.nombre.toLowerCase().includes('saltena');
        let horneadasDisponibles = null;
        if (esSaltena) {
            const completadas = state.horneadas[p.nombre] || 0;
            horneadasDisponibles = completadas - (qtyEnCarrito + qtyReservada);
        }

        const faltaStockFisico = stockVal <= 0 || stockRestante <= 0;
        const faltaHorneada = esSaltena && horneadasDisponibles <= 0;

        if (faltaStockFisico || faltaHorneada) {
            card.classList.add('sin-stock');
            if (btnAdd) btnAdd.disabled = true;
            if (faltaHorneada && !faltaStockFisico) {
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock agotado" style="background:var(--rojo);">Falta Hornear</div>`);
            } else {
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock agotado">Agotado</div>`);
            }
        } else if (esStockBajo(p.nombre, stockRestante)) {
            card.classList.add('stock-bajo');
            if (btnAdd) btnAdd.disabled = false;
            if (esSaltena) {
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock bajo">Stock ${stockRestante}</div>`);
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock" style="left:auto;right:6px;background:var(--rojo);color:white;box-shadow: 0 2px 8px rgba(192,57,43,0.4);">Horneadas ${horneadasDisponibles}</div>`);
            } else {
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock bajo">Quedan ${stockRestante}</div>`);
            }
        } else {
            if (btnAdd) btnAdd.disabled = false;
            if (esSaltena) {
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock bajo" style="background:var(--surface2);color:var(--texto-suave);box-shadow:none;">Stock ${stockRestante}</div>`);
                card.insertAdjacentHTML('afterbegin', `<div class="badge-stock" style="left:auto;right:6px;background:var(--rojo);color:white;box-shadow: 0 2px 8px rgba(192,57,43,0.4);">Horneadas ${horneadasDisponibles}</div>`);
            }
        }

        if (state.estadoCaja === 'cerrada') {
            if (btnAdd) btnAdd.disabled = true;
            if (btnSub) btnSub.disabled = true;
        } else {
            if (btnSub) btnSub.disabled = (qtyEnCarrito <= 0);
        }
    });
}

export function sincronizarCards(items) {
    state.productos.forEach((p, index) => {
        const badge = document.getElementById(`cant-${index}`);
        const card = document.getElementById(`card-${index}`);
        if (!badge || !card) return;
        const qty = items[index] || 0;
        badge.textContent = qty > 0 ? qty : '·';
        badge.classList.toggle('active', qty > 0);
        card.classList.toggle('in-cart', qty > 0);
    });
    actualizarStockUI();
}

export function renderSkeletons() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const s = document.createElement('div'); s.className = 'skeleton'; grid.appendChild(s);
    }
}

export function renderProductos() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = '';
    state.productos.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'card'; card.id = `card-${index}`;
        const qty = state.carrito[index] || 0;
        if (qty > 0) card.classList.add('in-cart');
        
        // Asignamos eventos táctiles al card
        card.setAttribute('ontouchstart', `window.iniciarDragTactil(event, ${index})`);
        card.setAttribute('ontouchmove', `window.moverDragTactil(event)`);
        card.setAttribute('ontouchend', `window.terminarDragTactil(event)`);
        
        card.innerHTML = `
            <div class="drag-handle">⠿</div>
            <span class="card-emoji">${getEmoji(p.nombre)}</span>
            <h3>${p.nombre}</h3>
            <div class="precio">Bs.${p.precio}</div>
            <div class="controls">
                <button class="btn-sub" onclick="window.quitar(${index})">−</button>
                <span class="cant-badge ${qty > 0 ? 'active' : ''}" id="cant-${index}">${qty > 0 ? qty : '·'}</span>
                <button class="btn-add" onclick="window.agregar(${index})">+</button>
            </div>
        `;
        grid.appendChild(card);
    });
    actualizarStockUI();
    renderChips();
    actualizarCarrito();
}

export async function cargarProductos() {
    renderSkeletons();
    try {
        state.productos = await cargarProductosAPI();
        
        const orden = cargarOrdenProductos();
        if (orden && orden.length > 0) {
            state.productos.sort((a, b) => {
                const idxA = orden.indexOf(a.nombre);
                const idxB = orden.indexOf(b.nombre);
                // Si no existe en el orden guardado, lo tiramos al final
                const valA = idxA !== -1 ? idxA : 9999;
                const valB = idxB !== -1 ? idxB : 9999;
                return valA - valB;
            });
        }
        
        renderProductos();
    } catch (e) {
        showToast('❌ Error al cargar productos');
    }
}

export function aplicarBloqueoCaja() {
    const bloqueado = state.estadoCaja === 'cerrada';
    const accionBtn = document.getElementById('accionBtn');
    if (accionBtn && bloqueado) {
        accionBtn.disabled = true;
        accionBtn.textContent = '🔒 CAJA CERRADA';
        accionBtn.className = 'modo-iniciar';
    }
    document.querySelectorAll('.card .btn-add, .card .btn-sub').forEach(b => {
        if (bloqueado) {
            b.dataset.bloqueado = 'true';
            b.disabled = true;
        } else {
            delete b.dataset.bloqueado;
            b.disabled = false;
        }
    });
    actualizarStockUI();
    actualizarCarrito();
}

export function iniciarDragTactil(e, index) {
    if (e.target.closest('button')) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    longPressTimer = setTimeout(() => {
        dragActivo = true;
        dragSrc = index;

        const card = document.getElementById(`card-${index}`);
        if(card) card.classList.add('drag-origen');

        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        const p = state.productos[index];
        dragGhost.innerHTML = `
            <span class="card-emoji">${getEmoji(p.nombre)}</span>
            <h3>${p.nombre}</h3>
            <div class="precio">Bs.${p.precio}</div>
        `;
        document.body.appendChild(dragGhost);
        moverGhost(e.touches[0].clientX, e.touches[0].clientY);

        if (navigator.vibrate) navigator.vibrate(40);
        showToast('↕ Arrastra para reordenar');
    }, 600);
}

export function moverGhost(x, y) {
    if (!dragGhost) return;
    dragGhost.style.left = (x - 70) + 'px';
    dragGhost.style.top = (y - 60) + 'px';
}

export function moverDragTactil(e) {
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    
    if (!dragActivo && (dx > 8 || dy > 8)) {
        clearTimeout(longPressTimer);
        return;
    }
    if (!dragActivo) return;

    e.preventDefault();
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    moverGhost(x, y);

    dragGhost.style.display = 'none';
    const elDebajo = document.elementFromPoint(x, y);
    dragGhost.style.display = '';

    const cardDebajo = elDebajo?.closest('.card');
    const nuevoOver = cardDebajo ? parseInt(cardDebajo.id.replace('card-', '')) : null;

    if (nuevoOver !== dragOver) {
        if (dragOver !== null) document.getElementById(`card-${dragOver}`)?.classList.remove('drag-sobre');
        dragOver = nuevoOver;
        if (dragOver !== null && dragOver !== dragSrc) {
            document.getElementById(`card-${dragOver}`)?.classList.add('drag-sobre');
        }
    }
}

export function terminarDragTactil(e) {
    clearTimeout(longPressTimer);
    if (!dragActivo) return;

    if (dragGhost) { dragGhost.remove(); dragGhost = null; }

    const srcEl = document.getElementById(`card-${dragSrc}`);
    if(srcEl) srcEl.classList.remove('drag-origen');
    
    if (dragOver !== null) {
        const overEl = document.getElementById(`card-${dragOver}`);
        if(overEl) overEl.classList.remove('drag-sobre');
    }

    if (dragOver !== null && dragOver !== dragSrc) {
        // Swap arrays
        const temp = state.productos[dragSrc];
        state.productos[dragSrc] = state.productos[dragOver];
        state.productos[dragOver] = temp;

        guardarOrdenProductos(state.productos.map(p => p.nombre));

        const swapIndices = (obj) => {
            if (!obj) return;
            const tempVal = obj[dragSrc];
            if (obj[dragOver] !== undefined) obj[dragSrc] = obj[dragOver]; else delete obj[dragSrc];
            if (tempVal !== undefined) obj[dragOver] = tempVal; else delete obj[dragOver];
        };

        swapIndices(state.carrito);
        state.pedidos.forEach(pd => swapIndices(pd.items));

        renderProductos();
    }

    dragActivo = false;
    dragSrc = null;
    dragOver = null;
}
