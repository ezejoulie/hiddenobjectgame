import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DPR_CAP, ENABLE_AO } from './Quality.js';

/**
 * Grade + viñeta ovalada: un solo pass barato que hace el "look" final.
 *  - saturation/contrast: grading sutil que hace reventar los colores
 *  - inner/outer/dark: viñeta (nítido en el centro, cae suave a los bordes)
 */
const GradeVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    inner: { value: 0.55 },
    outer: { value: 1.18 },
    dark: { value: 0.52 },
    saturation: { value: 1.15 },
    contrast: { value: 1.04 },
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
    uniform float saturation;
    uniform float contrast;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      // saturación (alrededor de la luminancia)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      // contraste suave
      col = (col - 0.5) * contrast + 0.5;
      col = max(col, 0.0);
      // viñeta ovalada
      float d = length(vUv - 0.5) * 1.41421356;   // 0 centro, ~1 esquina
      float v = smoothstep(outer, inner, d);        // 1 en el centro, 0 en los bordes
      float f = mix(dark, 1.0, v);
      gl_FragColor = vec4(col * f, c.a);
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
    // Viñeta + grade
    vignetteInner = 0.55,
    vignetteOuter = 1.18,
    vignetteDark = 0.52,
    saturation = 1.15,
    contrast = 1.04,
    // en móvil el GTAO se apaga solo (memoria de GPU limitada)
    enableAO = ENABLE_AO,
    enableBloom = true,
    enableVignette = true,
  } = opts;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, DPR_CAP);

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

  // --- Grade (saturación/contraste) + viñeta ovalada ---
  let vignette = null;
  if (enableVignette) {
    vignette = new ShaderPass(GradeVignetteShader);
    vignette.uniforms.inner.value = vignetteInner;
    vignette.uniforms.outer.value = vignetteOuter;
    vignette.uniforms.dark.value = vignetteDark;
    vignette.uniforms.saturation.value = saturation;
    vignette.uniforms.contrast.value = contrast;
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

