import * as THREE from 'three';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';
import { AssetLoader } from './core/AssetLoader.js';

import { Player } from './entities/Player.js';
import { ThirdPersonCamera } from './systems/Camera.js';
import { Casa } from './levels/Casa.js';
import { Jardin } from './levels/Jardin.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';
import { Game, itemsDeSpawns } from './core/Game.js';
import { CASA_LIVING, JARDIN, NIVELES } from './data/levels.config.js';

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
  alacena: `${CF}03634343-930e-4d02-9a28-d804d2ce78e3.glb`,
  tele: `${CF}82d48ff8-617f-4a73-bb7b-a127721bb1c0.glb`,
  mesa_ratona: `${CF}e5107612-6450-4585-be48-98d6f8d63889.glb`,
  mesa_luz: `${CF}1c5bc0b5-c8d5-4c3e-9bb9-7fcd641a3078.glb`,
  // jardín (exterior)
  arbol: `${CF}bd3c93d8-c764-4d30-9b69-56dfe2154bf2.glb`,
  arbol_frond: `${CF}441b91c8-308f-4f07-a586-30eab6642352.glb`,
  arbol_flor: `${CF}05f96aa7-9358-4967-ba6f-8d01618b15cb.glb`,
  pino: `${CF}c0d739d4-6e52-44b7-8104-c54bbeece589.glb`,
  palmera: `${CF}2eb4778f-02dd-4361-89f2-ed9d75acb6ba.glb`,
  arbusto: `${CF}fba18785-8c06-4d55-bf87-3a60916c229d.glb`,
  arbusto_red: `${CF}82327eab-15fe-462b-96f8-25f1cb726742.glb`,
  roca: `${CF}023bd0b4-495f-4483-9bee-f3de5c58112a.glb`,
  roca_grande: `${CF}20a5a656-fdc6-4196-80d9-b53dc4238d4d.glb`,
  banco: `${CF}e9a56aee-483f-4f64-a32c-241e7a72f94b.glb`,
  cantero: `${CF}44558271-09e4-4644-8ec7-ebd46dc3120e.glb`,
  cantero_flor: `${CF}3245b424-b0b5-4b87-9501-da3ec7c94fc4.glb`,
  macetero: `${CF}1042ffbf-5111-4cdd-acdb-95c08a428aca.glb`,
  huerta: `${CF}2b5a0f73-eab9-48e5-94bd-c0ec48e3456e.glb`,
  cobertizo: `${CF}736a1995-0f8b-4e1b-88f0-28bc458515af.glb`,
  carretilla: `${CF}3cb5db3b-1393-4d5a-95f4-79ded4b10994.glb`,
  sendero: `${CF}0ecf5138-5704-4d84-8a95-026244fae112.glb`,
  perro: `${CF}fc7764b2-2b75-4c0d-b96f-3dd260711fc9.glb`,
  fuente: `${CF}94905414-b9b1-490a-8aa4-8c023f882d85.glb`,
  fuente_jardin: `${CF}2d3c9ce1-71ae-4c1b-af92-8854d599a20a.glb`,
  pasto_alto: `${CF}2640c787-8cba-4b78-9c58-944e6dfbb2d5.glb`,
  vase: `${BASE}assets/models/base/GlassVaseFlowers.glb`,
  plant: `${BASE}assets/models/base/DiffuseTransmissionPlant.glb`,
  lamp: `${BASE}assets/models/base/IridescenceLamp.glb`,
};

// Personajes jugables (Mixamo → glTF, optimizados)
const HEROES = {
  nene: `${BASE}assets/models/heroes/nene.glb`,
  nena: `${BASE}assets/models/heroes/nena.glb`,
};
const DENGUIN_URL = `${CF}6f01a442-57d2-41f0-be11-587d0ffe4f80.glb`;

// Cacharros reales (GLB) por tipo, con fallback a primitiva
const CACHARRO_URLS = {
  balde: `${CF}2e210d1e-88a4-466c-9685-80a882dcff9c.glb`,
  tacho: `${CF}7fc43ae3-a607-4bca-bad6-501d4de2d615.glb`,
  regadera: `${CF}57daab7e-a92c-47e9-b46c-eef6440faf77.glb`,
  botella: `${CF}ae6965fa-c4cb-4082-b762-56650d036f7a.glb`,
  lata: `${CF}55a338ec-6a86-4834-9cc8-d3558e9f2cdb.glb`,
  vaso: `${CF}66c29bb0-14bf-4b5c-a632-aeac3de52b7c.glb`,
  florero: `${CF}3d81b496-7836-4c4a-ae93-0d0bc617eb4a.glb`,
  maceta: `${CF}4b328b48-3966-465c-b5b5-3b480f21fad9.glb`,
  bebedero: `${CF}3ee4d0fc-5561-48c2-a5a8-aeaa060a131c.glb`,
  frasco: `${CF}590439a9-f32c-4a13-9727-8d81c8a1f5a0.glb`, // bidón
};

// Selector de personaje (sin etiquetas de género)
function buildHeroSelector(onPick) {
  const el = document.createElement('div');
  el.id = 'hero-sel';
  el.innerHTML = `
    <span class="hero-lbl">Personaje</span>
    <button data-h="nene">1</button>
    <button data-h="nena">2</button>`;
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

  // ---------- Cargar personajes + Denguín ----------
  const heroes = {};
  heroes.nene = await loader.loadGLTF(HEROES.nene).catch(() => null);
  heroes.nena = await loader.loadGLTF(HEROES.nena).catch(() => null);
  const denguinModel = await loader.loadGLTF(DENGUIN_URL).then((g) => g.scene).catch(() => null);

  // ---------- Cargar cacharros reales ----------
  await loader.preload(Object.values(CACHARRO_URLS), (p) => overlay.set(0.88 + p * 0.12));
  const cacharroModels = {};
  for (const [tipo, url] of Object.entries(CACHARRO_URLS)) {
    const s = loader.instance(url);
    if (s) cacharroModels[tipo] = s;
  }
  overlay.set(1);

  // ---------- Jugador (persiste entre niveles) ----------
  let player = null;
  function setHero(which) {
    const prevPos = player ? player.position.clone() : new THREE.Vector3(0, 0, 0);
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

  const tpCam = new ThirdPersonCamera(camera, { distance: 4.3, height: 1.4 });
  const input = new Input(renderer.domElement);
  const screens = new Screens();
  const postfx = createPostFX(renderer, scene, camera, { bloomStrength: 0.1, vignetteDark: 0.6 });

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    postfx.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ---------- Gestión de niveles ----------
  const LEVEL_CLASSES = { casa: Casa, jardin: Jardin };
  const LEVEL_CONFIGS = { casa: CASA_LIVING, jardin: JARDIN };
  let level = null;
  let game = null;
  let hud = null;

  function disposeLevel() {
    if (game) game.dispose();
    if (hud) hud.destroy();
    if (level) level.dispose();
    game = null;
    hud = null;
    level = null;
  }

  function startLevel(id) {
    disposeLevel();
    const Cls = LEVEL_CLASSES[id];
    const cfg = LEVEL_CONFIGS[id];
    level = new Cls({ models });
    level.addTo(scene);
    scene.background = new THREE.Color(cfg.bg || '#c9d6e3');

    player.position.set(level.spawn.x, 0, level.spawn.z);
    player.heading = Math.PI;
    player.mesh.position.copy(player.position);
    player.mesh.rotation.y = Math.PI;
    player.mesh.visible = true;
    tpCam.setObstacles(level.wallMeshes);
    tpCam.yaw = Math.PI;
    tpCam.update(player.position, 0);

    const dims = cfg.room || { width: 24, depth: 22 };
    const bounds = { x: dims.width / 2 - 1, z: dims.depth / 2 - 1 };
    hud = new HUD(itemsDeSpawns(cfg.cacharros));
    game = new Game({
      scene, getPlayer: () => player, spawns: cfg.cacharros, hud, screens,
      bounds, denguinModel, cacharroModels, level, gate: cfg.gate, onWin: showMap,
    });
    screens.intro({ onStart: () => game.start() });
  }

  function showMap() {
    disposeLevel();
    player.mesh.visible = false;
    screens.map(NIVELES, (id) => startLevel(id));
  }

  overlay.done();
  showMap();

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;

    if (level && game) {
      tpCam.applyLook(input.consumeLook());
      const move = input.moveVector();
      player.update(dt, move, tpCam.yaw, level.colliders);
      if (input.shieldPressed() && player.triggerShield(now)) hud.dobleDefensa();
      tpCam.update(player.position, dt);
      if (level.update) level.update(dt, now);
      game.update(dt, now);
    }

    postfx.render(dt);
  }
  loop();
}

boot();
