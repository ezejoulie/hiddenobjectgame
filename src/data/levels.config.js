/**
 * levels.config.js — datos por nivel (dimensiones, spawn, paletas, ítems).
 *
 * Por ahora solo describe el living de La Casa para el Sprint 1. Los spawns de
 * criaderos y el resto de los niveles se completan en sprints posteriores
 * (la lógica se porta del prototipo-viejo).
 */

export const CASA_LIVING = {
  nombre: 'La Casa',
  emoji: '🏠',
  interior: true,
  bg: '#c9d6e3',
  gate: 5,
  educa: true, // nivel tutorial: pausa educativa al juntar cada cacharro
  // casa grande con pasillo central. x∈[-11,11], z∈[-9,9]
  room: { width: 22, depth: 18, height: 3.0 },
  spawn: { x: 0, z: 4.5 }, // centro del ala sur (pasillo), no pegado a la puerta
  paleta: {
    pared: 0xeadfce,
    paredInt: 0xf0e6d6,
    paredZocalo: 0x9a6b45,
  },
  // 10 criaderos. Los PRIMEROS 5 están en la zona sur (accesible al arrancar);
  // al juntarlos se abre el portón y se accede a los otros 5 (zona norte).
  cacharros: [
    // --- ZONA SUR (primeros 5) ---
    ['tacho', -6, 2.6], // lavadero
    ['regadera', -9, 6.4], // lavadero
    ['maceta', 5, 2.6], // dormitorio
    ['lata', 9, 6.4], // dormitorio
    ['vaso', 0, 6], // pasillo
    // --- ZONA NORTE (tras el portón) ---
    ['balde', -6, -1], // cocina
    ['botella', -9, -3.6], // cocina
    ['frasco', 5, -1], // baño
    ['bebedero', 8.5, -3.6], // baño
    ['florero', -4, -6.2], // living
  ],
};

export const JARDIN = {
  nombre: 'El Jardín',
  emoji: '🌳',
  interior: false,
  bg: '#9bd6f0',
  gate: 0, // sin portón: juntás los 10 al aire libre
  // jardín abierto en una loma. Área jugable amplia (sin cerca, límite invisible).
  room: { width: 40, depth: 34 },
  spawn: { x: 0, z: 14 },
  // 10 criaderos repartidos por todo el jardín (sin colliders, se juntan por cercanía)
  cacharros: [
    ['balde', 8, 11],
    ['regadera', -9, 12],
    ['botella', 14, 2],
    ['lata', -14, 1],
    ['maceta', 2, 4],
    ['tacho', 16, -7],
    ['frasco', -15, -8],
    ['vaso', 4, -11],
    ['florero', -4, 14],
    ['bebedero', 11, -12],
  ],
};

export const ESCUELA = {
  nombre: 'La Escuela',
  emoji: '🏫',
  interior: false,
  bg: '#bfe3f3',
  gate: 0,
  room: { width: 38, depth: 32 },
  spawn: { x: 0, z: 13 },
  cacharros: [
    ['balde', 6, 10],
    ['tacho', -6, 10],
    ['maceta', 11, 3],
    ['regadera', -11, 4],
    ['vaso', 2, 2],
    ['botella', -4, -4],
    ['florero', 8, -2],
    ['lata', -10, -6],
    ['bebedero', 4, -8],
    ['frasco', 13, 7],
  ],
};

export const PARQUE = {
  nombre: 'El Parque',
  emoji: '🛝',
  interior: false,
  bg: '#9ad6ef',
  gate: 0,
  room: { width: 38, depth: 32 },
  spawn: { x: 0, z: 13 },
  cacharros: [
    ['balde', 4, 6],
    ['botella', -5, 2],
    ['lata', 7, 3],
    ['tacho', -13, -4],
    ['bebedero', 2, -5],
    ['regadera', -3, 11],
    ['maceta', 12, 6],
    ['vaso', 6, -10],
    ['florero', -8, 13],
    ['frasco', 13, -2],
  ],
};

export const PLAYA = {
  nombre: 'La Playa',
  emoji: '🏖️',
  interior: false,
  bg: '#bfe8f5',
  gate: 0,
  room: { width: 38, depth: 32 },
  spawn: { x: 0, z: 13 },
  cacharros: [
    ['balde', 5, 6],
    ['botella', -4, 4],
    ['lata', 8, 8],
    ['vaso', -8, 9],
    ['tacho', 12, 1],
    ['bebedero', -12, 2],
    ['maceta', 2, 11],
    ['frasco', -6, -3],
    ['regadera', 9, -4],
    ['florero', -2, 1],
  ],
};

// Registro de niveles para el mapa. `id` se mapea a su clase en main.js.
export const NIVELES = [
  { id: 'casa', nombre: 'La Casa', emoji: '🏠' },
  { id: 'jardin', nombre: 'El Jardín', emoji: '🌳' },
  { id: 'escuela', nombre: 'La Escuela', emoji: '🏫' },
  { id: 'parque', nombre: 'El Parque', emoji: '🛝' },
  { id: 'playa', nombre: 'La Playa', emoji: '🏖️' },
];
