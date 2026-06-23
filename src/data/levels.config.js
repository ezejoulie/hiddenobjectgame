/**
 * levels.config.js — datos por nivel (dimensiones, spawn, paletas, ítems).
 *
 * Por ahora solo describe el living de La Casa para el Sprint 1. Los spawns de
 * criaderos y el resto de los niveles se completan en sprints posteriores
 * (la lógica se porta del prototipo-viejo).
 */

export const CASA_LIVING = {
  nombre: 'La Casa',
  // casa grande con pasillo central. x∈[-11,11], z∈[-9,9]
  room: { width: 22, depth: 18, height: 3.0 },
  spawn: { x: 0, z: 7.5 }, // pasillo, junto a la entrada (sur)
  paleta: {
    pared: 0xeadfce,
    paredInt: 0xf0e6d6,
    paredZocalo: 0x9a6b45,
  },
  // 10 criaderos repartidos: 2 por ambiente. [tipo, x, z]
  cacharros: [
    // living (norte, ancho)
    ['florero', -4, -6.2],
    ['bebedero', 4, -7],
    // cocina (oeste-norte)
    ['balde', -6, -1],
    ['botella', -9, -3.6],
    // baño (este-norte)
    ['frasco', 5, -1],
    ['vaso', 8.5, -3.6],
    // lavadero (oeste-sur)
    ['tacho', -6, 2.6],
    ['regadera', -9, 6.4],
    // dormitorio (este-sur)
    ['maceta', 5, 2.6],
    ['lata', 9, 6.4],
  ],
};
