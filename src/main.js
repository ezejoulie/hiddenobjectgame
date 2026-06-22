import * as THREE from 'three';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';
import { AssetLoader } from './core/AssetLoader.js';

import { Player } from './entities/Player.js';
import { ThirdPersonCamera } from './systems/Camera.js';
import { Casa } from './levels/Casa.js';

/**
 * main.js — Sprint 1 + integración del pack de assets.
 * Carga modelos GLB reales (con barra de progreso) y los usa en el living;
 * si un modelo no está, el nivel cae a su placeholder PBR.
 */

const BASE = import.meta.env.BASE_URL; // './' o '/'

// Manifiesto de modelos del pack base (drop-in: agregar acá y usar en el nivel)
const MODELS = {
  sofa: `${BASE}assets/models/base/GlamVelvetSofa.glb`,
  armchair: `${BASE}assets/models/base/SheenChair.glb`,
  chair2: `${BASE}assets/models/base/ChairDamaskPurplegold.glb`,
  vase: `${BASE}assets/models/base/GlassVaseFlowers.glb`,
  plant: `${BASE}assets/models/base/DiffuseTransmissionPlant.glb`,
  lamp: `${BASE}assets/models/base/IridescenceLamp.glb`,
};

// Personaje riggeado + animado (interino hasta el Mateo custom del Sprint 4)
const CHARACTER_URL = `${BASE}assets/models/heroes/RobotExpressive.glb`;

// ---------- Overlay de carga ----------
function makeLoadingOverlay() {
  const el = document.createElement('div');
  el.id = 'loading';
  el.innerHTML = `
    <div class="load-card">
      <div class="load-title">Cargando el living…</div>
      <div class="load-bar"><div class="load-fill"></div></div>
      <div class="load-pct">0%</div>
    </div>`;
  document.body.appendChild(el);
  const fill = el.querySelector('.load-fill');
  const pct = el.querySelector('.load-pct');
  return {
    set(p) {
      const v = Math.round(p * 100);
      fill.style.width = v + '%';
      pct.textContent = v + '%';
    },
    done() {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 500);
    },
  };
}

async function boot() {
  const overlay = makeLoadingOverlay();

  const canvas = document.getElementById('app');
  const renderer = createRenderer(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9d6e3');

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

  setupEnvironment(renderer, scene);
  const lights = setupLighting(scene, {
    keyIntensity: 0.45,
    fillIntensity: 0.3,
    rimIntensity: 0.4,
    hemiIntensity: 0.55,
  });
  lights.key.castShadow = false;

  // ---------- Cargar modelos del pack ----------
  const loader = new AssetLoader();
  await loader.preload(Object.values(MODELS), (p) => overlay.set(p * 0.85));
  const models = {};
  for (const [key, url] of Object.entries(MODELS)) {
    const s = loader.instance(url); // clon listo para usar
    if (s) models[key] = s;
  }

  // ---------- Cargar personaje riggeado ----------
  const charGltf = await loader.loadGLTF(CHARACTER_URL).catch((e) => {
    console.warn('No se pudo cargar el personaje, usando placeholder:', e);
    return null;
  });
  overlay.set(1);

  // ---------- Nivel ----------
  const casa = new Casa({ models });
  casa.addTo(scene);

  // ---------- Jugador ----------
  const player = new Player({ gltf: charGltf });
  player.setPosition(casa.spawn.x, 0, casa.spawn.z);
  scene.add(player.mesh);

  // ---------- Cámara 3ra persona ----------
  const tpCam = new ThirdPersonCamera(camera, { distance: 5.0, height: 1.45 });
  tpCam.setObstacles(casa.wallMeshes);
  tpCam.yaw = Math.PI;
  tpCam.update(player.position, 0);

  // ---------- Input ----------
  const input = new Input(renderer.domElement);

  // ---------- Post-procesado ----------
  const postfx = createPostFX(renderer, scene, camera, {
    bloomStrength: 0.1,
    vignetteDark: 0.6,
  });

  // ---------- Resize ----------
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    postfx.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  overlay.done();

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;

    tpCam.applyLook(input.consumeLook());
    const move = input.moveVector();
    player.update(dt, move, tpCam.yaw, casa.colliders);
    if (input.shieldPressed()) player.triggerShield(now);
    tpCam.update(player.position, dt);

    postfx.render(dt);
  }
  loop();
}

boot();
