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
  // casa grande con pasillo central. x∈[-11,11], z∈[-9,9]
  room: { width: 22, depth: 18, height: 3.0 },
  spawn: { x: 0, z: 7.5 }, // pasillo, junto a la entrada (sur)
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
  spawn: { x: 0, z: 9 },
  // 10 criaderos repartidos por el patio (sin colliders, se juntan por cercanía)
  cacharros: [
    ['balde', 3, 7.5],
    ['regadera', -4, 7.5],
    ['botella', 7, 0],
    ['lata', -7, 0],
    ['maceta', 0, 2.5],
    ['tacho', 10, -3.5],
    ['frasco', -10, -4],
    ['vaso', 1.5, -7],
    ['florero', -1.5, 9.5],
    ['bebedero', 6, -7],
  ],
};

// Registro de niveles para el mapa. `id` se mapea a su clase en main.js.
export const NIVELES = [
  { id: 'casa', nombre: 'La Casa', emoji: '🏠' },
  { id: 'jardin', nombre: 'El Jardín', emoji: '🌳' },
  { id: 'escuela', nombre: 'La Escuela', emoji: '🏫', locked: true },
  { id: 'parque', nombre: 'El Parque', emoji: '🛝', locked: true },
  { id: 'playa', nombre: 'La Playa', emoji: '🏖️', locked: true },
];
