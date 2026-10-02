import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DPR_CAP, ENABLE_AO, ENABLE_BLOOM, QUALITY } from './Quality.js';

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
    // split-toning "tarde de verano": sombras apenas frías, luces cálidas
    shadowTint: { value: new THREE.Vector3(0.93, 0.98, 1.08) },
    highlightTint: { value: new THREE.Vector3(1.07, 1.0, 0.9) },
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
    uniform vec3 shadowTint;
    uniform vec3 highlightTint;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      // saturación (alrededor de la luminancia)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      // contraste suave
      col = (col - 0.5) * contrast + 0.5;
      col = max(col, 0.0);
      // split-toning según la luminancia
      float lt = smoothstep(0.04, 0.7, dot(col, vec3(0.2126, 0.7152, 0.0722)));
      col *= mix(shadowTint, highlightTint, lt);
      // viñeta ovalada
      float d = length(vUv - 0.5) * 1.41421356;   // 0 centro, ~1 esquina
      float v = smoothstep(outer, inner, d);        // 1 en el centro, 0 en los bordes
      float f = mix(dark, 1.0, v);
      gl_FragColor = vec4(col * f, c.a);
    }
  `,
};

/**
 * Contorno estilo dibujo animado a partir de la profundidad.
 * Usa la laplaciana de 1/z: en superficies planas es 0 (no dibuja líneas en el
 * piso ni en paredes, aunque se vean en ángulo rasante) y salta en las
 * siluetas. Se desvanece con la distancia para no ensuciar el fondo.
 */
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 500 },
    lineColor: { value: new THREE.Color(0x2a1a10) },
    strength: { value: 0.6 },
    fadeNear: { value: 14 },
    fadeFar: { value: 38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 lineColor;
    uniform float strength;
    uniform float fadeNear;
    uniform float fadeFar;
    float viewZ(vec2 uv){
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
    }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 px = 1.0 / resolution;
      float zc = viewZ(vUv);
      if (zc > cameraFar * 0.9) { gl_FragColor = c; return; } // cielo
      float wc = 1.0 / zc;
      float wl = 1.0 / viewZ(vUv - vec2(px.x, 0.0));
      float wr = 1.0 / viewZ(vUv + vec2(px.x, 0.0));
      float wd = 1.0 / viewZ(vUv - vec2(0.0, px.y));
      float wu = 1.0 / viewZ(vUv + vec2(0.0, px.y));
      float lap = max(abs(wl + wr - 2.0 * wc), abs(wd + wu - 2.0 * wc)) / wc;
      float e = smoothstep(0.035, 0.12, lap);
      float fade = 1.0 - smoothstep(fadeNear, fadeFar, zc);
      gl_FragColor = vec4(mix(c.rgb, lineColor * c.rgb, e * fade * strength), c.a);
    }
  `,
};

class DepthOutlinePass extends ShaderPass {
  constructor(camera) {
    super(OutlineShader);
    this.camera = camera;
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    this.uniforms.resolution.value.set(readBuffer.width, readBuffer.height);
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}

/**
 * PostFX.js — cadena de post-procesado con EffectComposer.
 *
 * Orden (PLAN, checklist puntos 5 y 6):
 *   RenderPass  → dibuja la escena en un buffer lineal HDR
 *   Outline     → contorno suave por profundidad (MEDIA/ALTA)
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
    saturation = 1.08,
    contrast = 1.09,
    // en móvil el GTAO se apaga solo (memoria de GPU limitada)
    enableAO = ENABLE_AO,
    enableBloom = ENABLE_BLOOM,
    enableVignette = true,
    // contorno: apagado en BAJA (un pass más de pantalla completa)
    enableOutline = QUALITY !== 'low',
  } = opts;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, DPR_CAP);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // --- Contorno (necesita la profundidad del RenderPass) ---
  let outline = null;
  if (enableOutline) {
    composer.renderTarget1.depthTexture = new THREE.DepthTexture(w, h);
    composer.renderTarget2.depthTexture = new THREE.DepthTexture(w, h);
    outline = new DepthOutlinePass(camera);
    composer.addPass(outline);
  }

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

  return { composer, passes: { renderPass, outline, gtao, bloom, vignette, output }, render, setSize, dispose };
}

