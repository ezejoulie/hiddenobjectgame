import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Viñeta ovalada: nítido en el centro, cae suave hacia los bordes.
 * Usa length(vUv-0.5) sin corregir aspecto, así en pantallas anchas el
 * círculo se estira a un óvalo que sigue naturalmente la forma de la pantalla.
 *  - inner: radio (0..1) hasta donde la imagen queda 100% nítida/brillante
 *  - outer: radio donde la viñeta llega a su máximo
 *  - dark : brillo en el borde (1 = sin efecto, 0 = negro)
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    inner: { value: 0.55 },
    outer: { value: 1.18 },
    dark: { value: 0.52 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float inner;
    uniform float outer;
    uniform float dark;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = length(vUv - 0.5) * 1.41421356;   // 0 centro, ~1 esquina
      float v = smoothstep(outer, inner, d);        // 1 en el centro, 0 en los bordes
      float f = mix(dark, 1.0, v);
      gl_FragColor = vec4(c.rgb * f, c.a);
    }
  `,
};

/**
 * PostFX.js — cadena de post-procesado con EffectComposer.
 *
 * Orden (PLAN, checklist puntos 5 y 6):
 *   RenderPass  → dibuja la escena en un buffer lineal HDR
 *   GTAOPass    → ambient occlusion (contacto/sombras de contacto, "peso")
 *   UnrealBloom → glow SUTIL solo en specular brillante (no velo general)
 *   Vignette    → óvalo: centro nítido, bordes suaves
 *   OutputPass  → aplica tone mapping (ACES) + conversión a sRGB al final
 */
export function createPostFX(renderer, scene, camera, opts = {}) {
  const {
    aoRadius = 0.5,
    aoIntensity = 1.0,
    // Bloom bajo y con umbral alto: solo los brillos fuertes, sin velo
    bloomStrength = 0.1,
    bloomRadius = 0.35,
    bloomThreshold = 0.92,
    // Viñeta
    vignetteInner = 0.55,
    vignetteOuter = 1.18,
    vignetteDark = 0.52,
    enableAO = true,
    enableBloom = true,
    enableVignette = true,
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

  // --- Viñeta ovalada ---
  let vignette = null;
  if (enableVignette) {
    vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.inner.value = vignetteInner;
    vignette.uniforms.outer.value = vignetteOuter;
    vignette.uniforms.dark.value = vignetteDark;
    composer.addPass(vignette);
  }

  // --- Salida: tone mapping + sRGB (siempre al final) ---
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

  return { composer, passes: { renderPass, gtao, bloom, vignette, output }, render, setSize, dispose };
}

