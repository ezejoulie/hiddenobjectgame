/**
 * cacharros.js — los "criaderos": recipientes que juntan agua. Cada uno tiene
 * un nombre, un emoji y un tip educativo de prevención del dengue (se muestra
 * al juntarlo, y en pantalla completa en el nivel tutorial).
 */
export const CACHARRO_TIPOS = {
  balde: { nombre: 'Balde', emoji: '🪣', tip: '¡Dalo vuelta! Boca abajo no junta agua.', color: 0x27aae1 },
  florero: { nombre: 'Florero', emoji: '🏺', tip: 'Cambiá el agua cada 3 días o usá arena húmeda.', color: 0x9b59b6 },
  botella: { nombre: 'Botella', emoji: '🍾', tip: 'Tirala al tacho o guardala boca abajo.', color: 0x7fd4f5 },
  lata: { nombre: 'Lata', emoji: '🥫', tip: 'Aplastala y tirala a la basura.', color: 0xc8cdd2 },
  bebedero: { nombre: 'Bebedero', emoji: '🐶', tip: 'Cambiale el agua a la mascota todos los días.', color: 0xff5e5b },
  maceta: { nombre: 'Platito de maceta', emoji: '🪴', tip: 'El platito junta agua: vacialo y cepillalo.', color: 0xd2691e },
  regadera: { nombre: 'Regadera', emoji: '🚿', tip: 'Vaciala y guardala boca abajo.', color: 0x58c24b },
  tacho: { nombre: 'Tacho', emoji: '🗑️', tip: 'Mantenelo siempre bien tapado.', color: 0x7b8794 },
  vaso: { nombre: 'Vaso', emoji: '🥛', tip: 'No dejes vasos con agua dando vueltas.', color: 0xffd9e8 },
  frasco: { nombre: 'Frasco', emoji: '🫙', tip: 'Tapalo bien o tiralo.', color: 0xbfe3f5 },
};
