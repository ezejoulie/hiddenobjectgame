/**
 * levels.config.js — datos por nivel (dimensiones, spawn, paletas, ítems).
 *
 * Por ahora solo describe el living de La Casa para el Sprint 1. Los spawns de
 * criaderos y el resto de los niveles se completan en sprints posteriores
 * (la lógica se porta del prototipo-viejo).
 */

export const CASA_LIVING = {
  nombre: 'La Casa — Living',
  // habitación compacta (lección del PLAN: nada de salas gigantes)
  room: { width: 8.5, depth: 8.5, height: 3.0 },
  spawn: { x: 0, z: 1.8 },
  // paleta cálida de interior
  paleta: {
    pared: 0xeadfce,
    paredZocalo: 0x9a6b45,
    piso: 0xb98c5a,
    alfombra: 0xcf5b54,
  },
  // 10 criaderos en piso libre (evitando muebles). [tipo, x, z]
  cacharros: [
    ['balde', 1.7, 2.5],
    ['florero', -1.7, 2.7],
    ['botella', 2.9, 0.8],
    ['lata', -2.9, 1.0],
    ['bebedero', 0.7, -0.5],
    ['maceta', -1.5, -2.6],
    ['regadera', 1.5, -2.6],
    ['tacho', 3.0, -2.4],
    ['vaso', -3.0, 2.4],
    ['frasco', 0.0, 3.2],
  ],
};
