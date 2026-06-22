import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * PostFX.js — cadena de post-procesado con EffectComposer.
 *
 * Orden (PLAN, checklist puntos 5 y 6):
 *   RenderPass  → dibuja la escena en un buffer lineal HDR
 *   GTAOPass    → ambient occlusion (contacto/sombras de contacto, "peso")
 *   UnrealBloom → glow sutil en zonas brillantes (vida en luces/specular)
 *   OutputPass  → aplica tone mapping (ACES) + conversión a sRGB al final
 *
 * Importante: con composer, el tone mapping NO lo hace cada pass sino el
 * OutputPass al final, sobre el resultado lineal acumulado. Por eso RenderPass
 * trabaja en lineal y recién OutputPass mapea a pantalla.
 */
export function createPostFX(renderer, scene, camera, opts = {}) {
  const {
    aoRadius = 0.5,
    aoIntensity = 1.0,
    bloomStrength = 0.22,
    bloomRadius = 0.5,
    bloomThreshold = 0.85,
    enableAO = true,
    enableBloom = true,
  } = opts;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 2);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // --- Ambient Occlusion (GTAO) ---
  let gtao = null;
  if (enableAO) {
    gtao = new GTAOPass(scene, camera, w, h);
    gtao.output = GTAOPass.OUTPUT.Default; // AO mezclado con la imagen (beauty)
    gtao.blendIntensity = aoIntensity;
    // Parámetros suaves para un look estilizado, no agresivo
    gtao.updateGtaoMaterial({
      radius: aoRadius,
      distanceExponent: 1.0,
      thickness: 1.0,
      scale: 1.0,
      samples: 16,
      screenSpaceRadius: false,
    });
    composer.addPass(gtao);
  }

  // --- Bloom sutil ---
  let bloom = null;
  if (enableBloom) {
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), bloomStrength, bloomRadius, bloomThreshold);
    composer.addPass(bloom);
  }

  // --- Salida: tone mapping + sRGB ---
  const output = new OutputPass();
  composer.addPass(output);

  function setSize(width, height) {
    composer.setSize(width, height);
    if (gtao) gtao.setSize(width, height);
    if (bloom) bloom.setSize(width, height);
  }

  function render(deltaTime) {
    composer.render(deltaTime);
  }

  function dispose() {
    composer.dispose();
  }

  return { composer, passes: { renderPass, gtao, bloom, output }, render, setSize, dispose };
}
