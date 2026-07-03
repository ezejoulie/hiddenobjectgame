/**
 * Quality.js — calidad gráfica en 3 niveles (low / medium / high).
 * Se elige sola según el dispositivo la primera vez, queda guardada, y el
 * jugador puede cambiarla con el botón ⚙️ (recarga para aplicar).
 */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const IS_MOBILE =
  /iPhone|iPad|iPod|Android/i.test(ua) ||
  (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && window.innerWidth < 1100);

let saved = null;
try { saved = localStorage.getItem('pad-quality'); } catch { /* sin storage */ }
export const QUALITY = ['low', 'medium', 'high'].includes(saved) ? saved : (IS_MOBILE ? 'low' : 'high');

const PROFILES = {
  low:    { dpr: 1,   aa: false, ao: false, shadow: 0,    rain: 400,  grass: 450,  bloom: false },
  medium: { dpr: 1.5, aa: false, ao: false, shadow: 1024, rain: 800,  grass: 1200, bloom: true },
  high:   { dpr: 2,   aa: true,  ao: true,  shadow: 2048, rain: 1300, grass: 2400, bloom: true },
};
const P = PROFILES[QUALITY];

export const DPR_CAP = P.dpr;
export const ENABLE_AA = P.aa;
export const ENABLE_AO = P.ao;
export const SHADOWS_ON = P.shadow > 0;
export const SHADOW_SIZE = P.shadow || 512;
export const RAIN_DROPS = P.rain;
export const GRASS_N = P.grass;
export const ENABLE_BLOOM = P.bloom;

export function setQuality(q) {
  try { localStorage.setItem('pad-quality', q); } catch { /* sin storage */ }
  location.reload();
}
