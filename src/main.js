import * as THREE from 'three';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';
import { AssetLoader } from './core/AssetLoader.js';

import { Player } from './entities/Player.js';
import { ThirdPersonCamera } from './systems/Camera.js';
import { Casa } from './levels/Casa.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';
import { Game, itemsDeSpawns } from './core/Game.js';
import { CASA_LIVING } from './data/levels.config.js';

/**
 * main.js — Sprint 1 + integración del pack de assets.
 * Carga modelos GLB reales (con barra de progreso) y los usa en el living;
 * si un modelo no está, el nivel cae a su placeholder PBR.
 */

const BASE = import.meta.env.BASE_URL; // './' o '/'

// Muebles propios (Higgsfield) del prototipo viejo, servidos desde su CDN.
const CF = 'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/';

// Manifiesto de modelos del pack base (drop-in: agregar acá y usar en el nivel)
const MODELS = {
  sofa: `${BASE}assets/models/base/GlamVelvetSofa.glb`,
  armchair: `${BASE}assets/models/base/SheenChair.glb`,
  chair2: `${BASE}assets/models/base/ChairDamaskPurplegold.glb`,
  // muebles reales por ambiente (con fallback a primitivas si no cargan)
  heladera: `${CF}a3cf4c30-d531-4ac5-87b4-a9da99cec845.glb`,
  mesada: `${CF}03ace918-cec4-4f89-87d3-8e3db42e1622.glb`,
  banadera: `${CF}7e217d98-653e-41f9-ba8b-a9e2ce3b2b52.glb`,
  lavarropas: `${CF}4fefb51d-a3b2-4363-b3ee-564333133ea9.glb`,
  pileta: `${CF}6488016f-f663-40af-a78a-2607634fd150.glb`,
  cama: `${CF}a5fb8855-06c1-4302-be77-68445deadb38.glb`,
  ropero: `${CF}f4c9a58d-0aee-438f-ab0e-a4d5c6ba6dbb.glb`,
  vase: `${BASE}assets/models/base/GlassVaseFlowers.glb`,
  plant: `${BASE}assets/models/base/DiffuseTransmissionPlant.glb`,
  lamp: `${BASE}assets/models/base/IridescenceLamp.glb`,
};

// Personajes jugables (Mixamo → glTF, optimizados): nene y nena
const HEROES = {
  nene: `${BASE}assets/models/heroes/nene.glb`,
  nena: `${BASE}assets/models/heroes/nena.glb`,
};

// Selector nene/nena (UI mínima arriba a la derecha)
function buildHeroSelector(onPick) {
  const el = document.createElement('div');
  el.id = 'hero-sel';
  el.innerHTML = `
    <button data-h="nene">🧢 Nene</button>
    <button data-h="nena">🎀 Nena</button>`;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-h]');
    if (b) onPick(b.dataset.h);
  });
}

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

  // ---------- Cargar personajes (nene + nena, Mixamo→glTF) ----------
  const heroes = {};
  heroes.nene = await loader.loadGLTF(HEROES.nene).catch(() => null);
  heroes.nena = await loader.loadGLTF(HEROES.nena).catch(() => null);
  overlay.set(1);

  // ---------- Nivel ----------
  const casa = new Casa({ models });
  casa.addTo(scene);

  // ---------- Jugador (con selector nene/nena) ----------
  let player = null;
  function setHero(which) {
    const prevPos = player ? player.position.clone() : new THREE.Vector3(casa.spawn.x, 0, casa.spawn.z);
    const prevHeading = player ? player.heading : Math.PI;
    if (player) scene.remove(player.mesh);
    player = new Player({ gltf: heroes[which], targetHeight: 1.4 });
    player.position.copy(prevPos);
    player.heading = prevHeading;
    player.mesh.position.copy(prevPos);
    player.mesh.rotation.y = prevHeading;
    scene.add(player.mesh);
    document.querySelectorAll('#hero-sel button').forEach((b) =>
      b.classList.toggle('on', b.dataset.h === which)
    );
  }
  buildHeroSelector(setHero);
  setHero('nene');

  // ---------- Cámara 3ra persona ----------
  const tpCam = new ThirdPersonCamera(camera, { distance: 4.3, height: 1.4 });
  tpCam.setObstacles(casa.wallMeshes);
  tpCam.yaw = Math.PI;
  tpCam.update(player.position, 0);

  // ---------- Input ----------
  const input = new Input(renderer.domElement);

  // ---------- Juego (cacharros + timer + HUD + pantallas) ----------
  const spawns = CASA_LIVING.cacharros;
  const hud = new HUD(itemsDeSpawns(spawns));
  const screens = new Screens();
  const bounds = { x: CASA_LIVING.room.width / 2 - 1, z: CASA_LIVING.room.depth / 2 - 1 };
  const game = new Game({ scene, getPlayer: () => player, spawns, hud, screens, bounds });
  screens.intro({ nombre: CASA_LIVING.nombre, onStart: () => game.start() });

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

    game.update(dt, now);

    postfx.render(dt);
  }
  loop();
}

boot();
