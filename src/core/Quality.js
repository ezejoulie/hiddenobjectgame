/**
 * Quality.js — perfil de calidad según el dispositivo.
 *
 * En celulares (iOS/Android) el pipeline completo (GTAO + bloom + sombras 2048
 * + pixel ratio 2) consume demasiada memoria de GPU y WebKit mata la página
 * ("Ocurrió un problema varias veces"). Acá bajamos automáticamente:
 *  - pixel ratio máximo 1.5
 *  - ambient occlusion (GTAO) apagado
 *  - sombras de 1024 en vez de 2048
 *  - menos partículas (lluvia)
 */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const IS_MOBILE =
  /iPhone|iPad|iPod|Android/i.test(ua) ||
  (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && window.innerWidth < 1100);

export const DPR_CAP = IS_MOBILE ? 1.5 : 2;
export const SHADOW_SIZE = IS_MOBILE ? 1024 : 2048;
export const ENABLE_AO = !IS_MOBILE;
export const RAIN_DROPS = IS_MOBILE ? 600 : 1300;
