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
};
