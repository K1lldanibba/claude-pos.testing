import { DEFAULT_API_URL } from './constants.js';

export const state = {
    productos: [],
    carrito: {},
    pedidos: [],
    horneadas: {},
    histHorneadasDia: {},
    tempHorneadas: {},
    
    sheetId: null,
    editandoId: null,
    contadorId: 0,
    contadorDia: 0,
    
    estadoCaja: 'cerrada',
    vistaActual: 'pos',
    cartCollapsed: false,
    
    procesandoCola: false,
    colaVentas: [],
    
    // Datos temporales para cierre de caja
    datosCierre: {},
    pedidoPendienteId: null,

    config: {
        apiUrl: DEFAULT_API_URL,
    }
};

export function updateState(key, value) {
    state[key] = value;
}
