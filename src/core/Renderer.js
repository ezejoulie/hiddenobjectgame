import * as THREE from 'three';

/**
 * Renderer.js — WebGLRenderer configurado con el pipeline de color correcto.
 *
 * Decisiones clave (checklist del PLAN, puntos 3 y 4):
 *  - ACESFilmicToneMapping: rango dinámico tipo cine, evita colores quemados.
 *  - outputColorSpace = sRGB: el color se ve como debe en pantalla.
 *  - PCFSoftShadowMap: sombras suaves (no escalonadas).
 *
 * Nota: cuando se usa EffectComposer (PostFX.js), el tone mapping y la
 * conversión a sRGB los aplica el OutputPass al final de la cadena. Aun así
 * dejamos toneMapping seteado acá porque el OutputPass lo lee del renderer.
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Color y tono
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06; // un toque más luminoso (colores con más punch)
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Sombras suaves
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return renderer;
}
