import { emojiMap } from '../core/constants.js';

export function getEmoji(nombre) {
    const n = nombre.toLowerCase();
    for (const [k, v] of Object.entries(emojiMap)) {
        if (n.includes(k)) return v;
    }
    return '🫓';
}

export function getFechaHoy() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

export function esStockBajo(nombre, stock) {
    const n = nombre.toLowerCase();
    if (n.includes("salteña") || n.includes("saltena")) return stock < 15;

    const esGaseosa = n.includes("cocacola") || n.includes("fanta") || n.includes("sprite") || n.includes("gaseosa");
    if (esGaseosa && n.includes("1l")) return stock < 2;
    if (esGaseosa && (n.includes("600ml") || n.includes("500ml"))) return stock < 3;
    if (esGaseosa && n.includes("300ml")) return stock < 5;
    if (esGaseosa && n.includes("190")) return stock < 7;

    if (n.includes("del valle") && n.includes("300ml")) return stock < 3;
    if (n.includes("frutin") && n.includes("600ml")) return stock < 5;
    if (n.includes("jugo") && !n.includes("agua")) return stock < 10;
    if (n.includes("caja")) return stock < 10;

    return false;
}

export function esJugoLeche(nombre) {
    const n = nombre.toLowerCase();
    return n.includes("jugo") && !n.includes("agua");
}

export function getHoraActual() {
    return new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
