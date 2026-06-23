/**
 * levels.config.js — datos por nivel (dimensiones, spawn, paletas, ítems).
 *
 * Por ahora solo describe el living de La Casa para el Sprint 1. Los spawns de
 * criaderos y el resto de los niveles se completan en sprints posteriores
 * (la lógica se porta del prototipo-viejo).
 */

export const CASA_LIVING = {
  nombre: 'La Casa',
  // envolvente de la casa (5 ambientes). x∈[-8,8], z∈[-6,6]
  room: { width: 16, depth: 12, height: 3.0 },
  spawn: { x: 0, z: 4.4 }, // living, junto a la puerta de entrada
  paleta: {
    pared: 0xeadfce,
    paredInt: 0xf0e6d6,
    paredZocalo: 0x9a6b45,
  },
  // 10 criaderos repartidos por TODA la casa: [tipo, x, z]
  cacharros: [
    // living (centro)
    ['florero', -1.8, 2.5],
    ['bebedero', 1.8, 3.6],
    // cocina (arriba-izq)
    ['balde', -6.6, -1.4],
    ['botella', -4.2, -4.6],
    // baño (arriba-der)
    ['frasco', 6.6, -1.6],
    ['vaso', 4.2, -4.6],
    // lavadero (abajo-izq)
    ['tacho', -6.6, 1.6],
    ['regadera', -4.2, 4.6],
    // dormitorio (abajo-der)
    ['maceta', 6.6, 1.6],
    ['lata', 4.2, 4.6],
  ],
};
