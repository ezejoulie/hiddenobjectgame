import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';
import { AssetLoader } from './core/AssetLoader.js';
import { Audio } from './core/Audio.js';
import { IS_MOBILE } from './core/Quality.js';

import { Player } from './entities/Player.js';
import { ThirdPersonCamera } from './systems/Camera.js';
import { Casa } from './levels/Casa.js';
import { Jardin } from './levels/Jardin.js';
import { Escuela } from './levels/Escuela.js';
import { Parque } from './levels/Parque.js';
import { Playa } from './levels/Playa.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';
import { Game, itemsDeSpawns } from './core/Game.js';
import { Cacharro } from './entities/Cacharro.js';
import { CACHARRO_TIPOS } from './data/cacharros.js';
import { CASA_LIVING, JARDIN, ESCUELA, PARQUE, PLAYA, NIVELES } from './data/levels.config.js';

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
  // escuela
  escuela: `${CF}815cdd67-9875-4090-a37a-d1ed4915497f.glb`,
  tobogan: `${CF}a4e4a773-3848-4909-8814-8fb0b1707858.glb`,
  hamacas: `${CF}57d2c7c4-0fe5-44b0-a225-100f02dc8c65.glb`,
  arenero: `${CF}96f4d585-c334-4fb6-96c6-6558676a20d3.glb`,
  trepador: `${CF}71efbd27-d583-40f8-9ccf-bae5d748ccac.glb`,
  castillo: `${CF}41c888c9-1607-4773-b995-f7f5ca2b5dd8.glb`,
  mastil: `${CF}70a8aa94-2c64-4af1-9a8e-c5c8caf002a4.glb`,
  cesto: `${CF}b6b5c69c-26bd-42e8-a286-906d008b5240.glb`,
  bebedero_esc: `${CF}fdf135d7-bc9a-4383-8e14-07a145df8d76.glb`,
  pizarron: `${CF}928ea3bb-0824-4bc4-8a70-f9bf649346e5.glb`,
  cartel_esc: `${CF}b1891686-53b7-4ef2-9dca-441b49e49172.glb`,
  aro_basquet: `${CF}850c44ef-a0d4-4d91-90a1-984461df2215.glb`,
  banco_plaza: `${CF}2cc9d88b-b6c9-4ec0-8e84-7b26b8069479.glb`,
  // parque
  glorieta: `${CF}e05778d0-d40b-48a3-a790-040be4102ef5.glb`,
  puente: `${CF}8cc55284-eddd-4f70-84e3-3844c141de8e.glb`,
  estanque: `${CF}22f2152c-b630-4b2e-8e41-3c2d2d6be283.glb`,
  tronco_caido: `${CF}81ddb424-1fe6-40c5-9983-e73a482f2241.glb`,
  cartel_parque: `${CF}37e83b0b-be6d-4a1b-a1ae-83387ee67c04.glb`,
  hongo: `${CF}3d6d6922-a516-4237-a4b5-6036ff42e65d.glb`,
  calesita: `${CF}70394fb5-580d-4800-9c1b-c844cc1840f3.glb`,
  subibaja: `${CF}225310d0-db84-4906-957f-a4eff00b612f.glb`,
  farol: `${CF}f413c406-ad1c-4983-8534-d8d176500be9.glb`,
  roca_grande: `${CF}20a5a656-fdc6-4196-80d9-b53dc4238d4d.glb`,
  // playa
  velero: `${CF}a8e12138-0b6a-4cfe-8f29-34a30d452fa5.glb`,
  bote: `${CF}5135f625-059c-4abd-90ae-d340b2b1ddb0.glb`,
  sombrilla: `${CF}eb4957c2-762f-4aa8-8331-b82a849a632b.glb`,
  reposera: `${CF}53500306-250f-475e-b520-bcae3ed3ed1c.glb`,
  muelle: `${CF}656e2739-db45-4d2b-886d-a9b4db974dd3.glb`,
  toalla: `${CF}dbd1375c-2928-4e0c-b7ed-646fc8089c58.glb`,
  caracol: `${CF}f87dafdc-f47b-431d-8a9c-51075a478008.glb`,
  roca_costera: `${CF}844a4822-7e04-4f1e-b992-ac35bf38872f.glb`,
  palmera_cocos: `${CF}c314c06a-8958-4b44-9901-04a203916841.glb`,
  boya: `${CF}f752a5dd-5a8c-41bf-a118-8eb86af0a86a.glb`,
  conservadora: `${CF}a64000b6-fba9-4ade-93db-0db9a5177509.glb`,
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

// ---------- Overlay de carga ----------
function makeLoadingOverlay() {
  const el = document.createElement('div');
  el.id = 'loading';
  el.innerHTML = `
    <div class="load-card">
      <img class="load-logo" src="${BASE}assets/img/logo.png" alt="Patrulla Anti-Dengue">
      <div class="load-title">Cargando videojuego…</div>
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

// Overlay liviano para la transición entre niveles (lazy load de props).
function makeLevelLoader() {
  const el = document.createElement('div');
  el.id = 'loading';
  el.className = 'level-load';
  el.innerHTML = `
    <div class="load-card">
      <div class="load-title"></div>
      <div class="load-bar"><div class="load-fill"></div></div>
    </div>`;
  document.body.appendChild(el);
  el.style.display = 'none';
  const title = el.querySelector('.load-title');
  const fill = el.querySelector('.load-fill');
  return {
    show(cfg) {
      title.textContent = `Cargando ${cfg?.nombre || 'nivel'} ${cfg?.emoji || ''}…`;
      fill.style.width = '0%';
      el.classList.remove('hide');
      el.style.display = '';
    },
    set(p) {
      fill.style.width = Math.round(p * 100) + '%';
    },
    hide() {
      el.classList.add('hide');
      setTimeout(() => {
        if (el.classList.contains('hide')) el.style.display = 'none';
      }, 400);
    },
  };
}

// Mini-renderer para generar miniaturas PNG de modelos (cacharros, personajes).
function makeThumbRenderer(size = 120) {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setSize(size, size);
  r.setPixelRatio(1);
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x55606a, 1.5));
  const dir = new THREE.DirectionalLight(0xffffff, 1.6);
  dir.position.set(2, 4, 3);
  scene.add(dir);
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  const box = new THREE.Box3();
  const sz = new THREE.Vector3();
  const center = new THREE.Vector3();
  return {
    shot(obj3d, front = 0.95, top = 0.45) {
      scene.add(obj3d);
      box.setFromObject(obj3d);
      box.getSize(sz);
      box.getCenter(center);
      const maxd = Math.max(sz.x, sz.y, sz.z) || 0.5;
      const dist = maxd * 2.3;
      cam.position.set(center.x + dist * 0.5, center.y + dist * top, center.z + dist * front);
      cam.lookAt(center);
      r.render(scene, cam);
      const url = r.domElement.toDataURL('image/png');
      scene.remove(obj3d);
      return url;
    },
    dispose() {
      r.dispose();
    },
  };
}

// Certificado descargable (PNG) con el nombre del jugador.
function downloadCertificate(name) {
  const w = 1100, h = 780;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#eaf6ff'); g.addColorStop(1, '#dff3d6');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#1f9550'; x.lineWidth = 14; x.strokeRect(26, 26, w - 52, h - 52);
  x.strokeStyle = '#f4b72e'; x.lineWidth = 5; x.strokeRect(46, 46, w - 92, h - 92);
  x.textAlign = 'center'; x.fillStyle = '#15324b';
  x.font = 'bold 64px Georgia, serif';
  x.fillText('Certificado', w / 2, 170);
  x.font = 'bold 40px Georgia, serif';
  x.fillText('Defensor Anti-Dengue', w / 2, 230);
  x.font = '28px Georgia, serif';
  x.fillText('Se otorga a', w / 2, 330);
  x.fillStyle = '#1f9550'; x.font = 'bold 70px Georgia, serif';
  x.fillText((name || 'Agente').slice(0, 18), w / 2, 410);
  x.fillStyle = '#15324b'; x.font = '26px Georgia, serif';
  x.fillText('por descacharrar todos los lugares y dejar a Denguín', w / 2, 480);
  x.fillText('sin criaderos. ¡Sin agua estancada no hay mosquito!', w / 2, 520);
  x.font = '120px serif';
  x.fillText('🏅', w / 2, 650);
  x.font = '22px Georgia, serif';
  x.fillText('Patrulla Doble Defensa', w / 2, 710);
  const a = document.createElement('a');
  a.download = `certificado-${(name || 'agente').toLowerCase().replace(/\s+/g, '-')}.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
}

async function boot() {
  const canvas = document.getElementById('app');
  const renderer = createRenderer(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9d6e3');

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

  // IBL (luz de entorno). Si el dispositivo no la soporta (algunas GPUs de
  // celular fallan con PMREM), compensamos con más luz directa para que los
  // personajes/objetos PBR no queden negros.
  let iblOk = true;
  try {
    setupEnvironment(renderer, scene);
  } catch (e) {
    iblOk = false;
  }
  const lights = setupLighting(scene, {
    keyIntensity: iblOk ? 0.45 : 1.4,
    fillIntensity: iblOk ? 0.3 : 0.9,
    rimIntensity: 0.4,
    hemiIntensity: iblOk ? 0.55 : 1.6,
  });
  lights.key.castShadow = false;

  // ---------- Estado de sesión (assets se cargan al apretar "Jugar") ----------
  const loader = new AssetLoader();
  const heroes = {};
  let denguinModel = null;
  const cacharroModels = {};
  let cacharroThumbs = {};
  const heroThumbs = {};
  let player = null;
  let essentialsLoaded = false;
  let sessionName = 'Agente';
  let seenTutorial = false;

  const tpCam = new ThirdPersonCamera(camera, { distance: 4.3, height: 1.4 });
  const input = new Input(renderer.domElement);
  const screens = new Screens();
  const postfx = createPostFX(renderer, scene, camera, { bloomStrength: 0.1, vignetteDark: 0.6 });

  function setHero(which) {
    const prevPos = player ? player.position.clone() : new THREE.Vector3(0, 0, 0);
    const prevHeading = player ? player.heading : Math.PI;
    if (player) scene.remove(player.mesh);
    player = new Player({ gltf: heroes[which], targetHeight: 1.4 });
    player.position.copy(prevPos);
    player.heading = prevHeading;
    player.mesh.position.copy(prevPos);
    player.mesh.rotation.y = prevHeading;
    // "más 3D": sombra real (ancla al personaje al piso) + materiales con más
    // reflejo del entorno + luz de realce que lo sigue (lo despega del fondo)
    player.mesh.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        // NO recibe sombras: evita el "acné" de auto-sombreado que en algunos
        // dispositivos (sombras de 1024 en móvil) pintaba al personaje de negro
        o.receiveShadow = false;
        if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 1.3;
      }
    });
    const rim = new THREE.PointLight(0xfff2dd, 1.6, 4.5, 2);
    rim.position.set(0.3, 2.0, -0.9); // atrás-arriba: contorno cálido
    player.mesh.add(rim);
    scene.add(player.mesh);
  }

  // Carga esencial (personajes, Denguín, cacharros) + miniaturas.
  async function loadEssentials(overlay) {
    heroes.nene = await loader.loadGLTF(HEROES.nene).catch(() => null);
    heroes.nena = await loader.loadGLTF(HEROES.nena).catch(() => null);
    overlay.set(0.12);
    denguinModel = await loader.loadGLTF(DENGUIN_URL).then((g) => g.scene).catch(() => null);
    overlay.set(0.2);
    await loader.preload(Object.values(CACHARRO_URLS), (p) => overlay.set(0.2 + p * 0.7));
    for (const [tipo, url] of Object.entries(CACHARRO_URLS)) {
      const s = loader.instance(url);
      if (s) cacharroModels[tipo] = s;
    }
    overlay.set(0.92);
    // miniaturas (cacharros + personajes); opcionales.
    // En móvil NO: un segundo contexto WebGL + toDataURL dispara la memoria
    // y en iPhone tira la página (los chips usan emoji como fallback).
    try {
      if (IS_MOBILE) throw new Error('skip-thumbs-mobile');
      const tr = makeThumbRenderer();
      for (const tipo of Object.keys(CACHARRO_TIPOS)) {
        const c = new Cacharro(tipo, 0, 0, cacharroModels[tipo]);
        cacharroThumbs[tipo] = tr.shot(c.body);
      }
      for (const k of ['nene', 'nena']) {
        if (heroes[k] && heroes[k].scene) {
          try { heroThumbs[k] = tr.shot(skeletonClone(heroes[k].scene), 0.9, 0.25); } catch (e) { /* opcional */ }
        }
      }
      tr.dispose();
    } catch (e) { /* miniaturas opcionales */ }
    overlay.set(1);
  }

  // ---------- Audio (música + SFX) + botón de silencio ----------
  const audio = new Audio();
  const muteBtn = document.createElement('button');
  muteBtn.id = 'btn-mute';
  muteBtn.textContent = '🔊';
  muteBtn.title = 'Silenciar';
  muteBtn.addEventListener('click', () => {
    const m = audio.toggleMute();
    muteBtn.textContent = m ? '🔇' : '🔊';
    muteBtn.classList.toggle('off', m);
  });
  document.body.appendChild(muteBtn);

  // música de menú desde el primer gesto (antes de la primera escena),
  // distinta a la de los niveles. Los navegadores exigen un gesto para sonar.
  const startMenuMusic = () => {
    audio.resume();
    audio.startMusic('menu');
  };
  const firstGesture = () => {
    startMenuMusic();
    window.removeEventListener('pointerdown', firstGesture);
    window.removeEventListener('keydown', firstGesture);
  };
  window.addEventListener('pointerdown', firstGesture);
  window.addEventListener('keydown', firstGesture);

  const levelLoader = makeLevelLoader();

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
  const LEVEL_CLASSES = { casa: Casa, jardin: Jardin, escuela: Escuela, parque: Parque, playa: Playa };
  const LEVEL_CONFIGS = { casa: CASA_LIVING, jardin: JARDIN, escuela: ESCUELA, parque: PARQUE, playa: PLAYA };

  // Props GLB que usa cada nivel (lazy load al entrar). Lo que falte cae a
  // primitivas, así que no es crítico, pero conviene listarlo bien.
  const EXT = ['arbol', 'arbol_frond', 'arbol_flor', 'pasto_alto', 'perro']; // comunes a exteriores
  const LEVEL_MODEL_KEYS = {
    casa: ['sofa', 'armchair', 'chair2', 'heladera', 'mesada', 'banadera', 'lavarropas', 'pileta',
      'cama', 'ropero', 'alacena', 'tele', 'mesa_ratona', 'mesa_luz', 'vase', 'plant', 'lamp'],
    jardin: [...EXT, 'pino', 'arbusto', 'arbusto_red', 'banco', 'cantero', 'macetero', 'huerta',
      'cobertizo', 'carretilla', 'fuente', 'fuente_jardin', 'roca', 'roca_grande'],
    escuela: [...EXT, 'escuela', 'mastil', 'tobogan', 'hamacas', 'arenero', 'aro_basquet',
      'cesto', 'bebedero_esc', 'cartel_esc', 'farol'],
    parque: [...EXT, 'pino', 'arbusto', 'arbusto_red', 'banco', 'banco_plaza', 'calesita', 'subibaja',
      'hamacas', 'farol', 'glorieta', 'puente', 'hongo', 'tronco_caido', 'roca', 'roca_grande'],
    playa: ['perro', 'pasto_alto', 'arbol', 'palmera', 'palmera_cocos', 'bote', 'velero', 'boya',
      'sombrilla', 'reposera', 'muelle', 'toalla', 'caracol', 'conservadora', 'roca_costera', 'roca_grande'],
  };

  async function loadLevelModels(id) {
    const keys = LEVEL_MODEL_KEYS[id] || [];
    const urls = keys.map((k) => MODELS[k]).filter(Boolean);
    await loader.preload(urls, (p) => levelLoader.set(p));
    const models = {};
    for (const k of keys) {
      const url = MODELS[k];
      if (!url) continue;
      const s = loader.instance(url);
      if (s) models[k] = s;
    }
    return models;
  }

  // progreso: niveles completados (medalla al descacharrar todos), persistido
  const STORE_KEY = 'pad-completed-v1';
  const completed = (() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); } catch { return new Set(); }
  })();
  function markCompleted(id) {
    completed.add(id);
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...completed])); } catch (e) { /* sin storage */ }
  }

  let level = null;
  let game = null;
  let hud = null;
  let busy = false;

  function disposeLevel() {
    if (game) game.dispose();
    if (hud) hud.destroy();
    if (level) level.dispose();
    audio.setRain(0);
    raining = false;
    game = null;
    hud = null;
    level = null;
  }

  async function startLevel(id) {
    if (busy) return;
    busy = true;
    disposeLevel();
    player.mesh.visible = false;
    screens.hide();
    const cfg = LEVEL_CONFIGS[id];
    levelLoader.show(cfg);
    const models = await loadLevelModels(id);

    const Cls = LEVEL_CLASSES[id];
    level = new Cls({ models });
    level.addTo(scene);
    scene.background = new THREE.Color(cfg.bg || '#c9d6e3');

    player.position.set(level.spawn.x, 0, level.spawn.z);
    player.heading = Math.PI;
    player.mesh.position.copy(player.position);
    player.mesh.rotation.y = Math.PI;
    player.mesh.visible = true;
    tpCam.setObstacles(level.wallMeshes);
    // adentro bien cerca (menos clipping); rango de giro amplio (mirar abajo)
    tpCam.distance = cfg.interior ? 2.4 : 4.3;
    tpCam.minPitch = cfg.interior ? 0.28 : 0.12;
    tpCam.maxPitch = 1.45;
    tpCam.pitch = 0.55;
    tpCam.yaw = Math.PI;
    tpCam.update(player.position, 0);

    const dims = cfg.room || { width: 24, depth: 22 };
    const bounds = { x: dims.width / 2 - 1, z: dims.depth / 2 - 1 };
    const items = itemsDeSpawns(cfg.cacharros).map((it) => ({ ...it, thumb: cacharroThumbs[it.tipo] }));
    hud = new HUD(items);
    game = new Game({
      scene, getPlayer: () => player, spawns: cfg.cacharros, hud, screens,
      bounds, denguinModel, cacharroModels, level, gate: cfg.gate, onWin: showMap,
      onComplete: () => markCompleted(id), thumbs: cacharroThumbs,
      audio, educa: !!cfg.educa, relock: () => input.lock(),
    });
    // pre-compila shaders/materiales + corre un frame de toda la cadena de
    // post-proceso para que NO se trabe al arrancar el nivel
    renderer.compile(scene, camera);
    postfx.render(0);
    levelLoader.hide();

    const startGame = () => {
      audio.resume();
      audio.startMusic(id); // música propia de cada escena
      game.start();
      input.lock(); // mirar con el mouse (sin mantener); Esc para soltar
    };
    // la primera vez: tutorial paso a paso de la jugabilidad; después, intro corta
    if (!seenTutorial) {
      seenTutorial = true;
      screens.tutorial({ onDone: startGame });
    } else {
      screens.intro({ onStart: startGame });
    }
    busy = false;
  }

  function showMap() {
    disposeLevel();
    startMenuMusic(); // volver a la música de menú entre escenas
    player.mesh.visible = false;
    // recorrido OBLIGATORIO en orden: cada nivel se desbloquea al completar el anterior
    const niveles = NIVELES.map((n, i) => ({
      ...n,
      locked: i > 0 && !completed.has(NIVELES[i - 1].id),
    }));
    screens.map(niveles, (id) => startLevel(id), { completed, onMedal: showDiploma });
  }

  function showDiploma() {
    screens.diploma({ name: sessionName, onMap: showMap, onDownload: () => downloadCertificate(sessionName) });
  }

  // ---------- Flujo de inicio: portada → carga → personaje → mapa ----------
  async function onPlay() {
    if (!essentialsLoaded) {
      const overlay = makeLoadingOverlay();
      await loadEssentials(overlay);
      overlay.done();
      essentialsLoaded = true;
    }
    screens.heroSelect({
      thumbs: heroThumbs,
      onChosen: (which, name) => {
        sessionName = name || 'Agente';
        setHero(which);
        showMap();
      },
    });
  }

  screens.home({ onPlay });

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const _v = new THREE.Vector3();
  let wasPaused = false;
  let raining = false;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;

    if (level && game) {
      const paused = game.isPaused();
      if (!paused) {
        const look = input.consumeLook();
        // al volver de la pausa (pop-up educativo) descartamos el delta del
        // arrastre acumulado, para que la cámara NO pegue un salto.
        if (!wasPaused) tpCam.applyLook(look);
        wasPaused = false;
        if (level.update) level.update(dt, now);
        // lluvia (exteriores): el jugador va más lento y suena el loop de lluvia
        const rain = level.rainIntensity || 0;
        player.speedScale = level.speedFactor ? level.speedFactor() : 1;
        audio.setRain(game.state === 'playing' ? rain : 0);
        if (rain > 0.35 && !raining) {
          raining = true;
          if (game.state === 'playing') hud.showTip('🌧️ ¡Está lloviendo!', 'Te movés más lento bajo la lluvia. ¡Aprovechá cuando pare!');
        } else if (rain < 0.15) {
          raining = false;
        }
        const move = input.moveVector();
        player.update(dt, move, tpCam.yaw, level.colliders);
        if (input.shieldPressed() && player.triggerShield(now)) {
          hud.dobleDefensa();
          audio.shield();
        }
        tpCam.update(player.position, dt);
      } else {
        input.consumeLook(); // drenar mientras está en pausa
        wasPaused = true;
      }
      game.update(dt, now);

      // flecha que apunta hacia Denguín (ayuda para los chicos)
      const dgn = game.denguin;
      if (dgn && game.state === 'playing' && !paused) {
        const dist = Math.hypot(dgn.pos.x - player.position.x, dgn.pos.z - player.position.z);
        if (dist < 12) {
          _v.copy(dgn.pos);
          camera.worldToLocal(_v); // pasa a espacio cámara: +x derecha, -z adelante
          hud.setDenguinArrow(Math.atan2(_v.x, -_v.z), true);
        } else {
          hud.setDenguinArrow(0, false);
        }
      } else if (hud) {
        hud.setDenguinArrow(0, false);
      }
    }

    postfx.render(dt);
  }
  loop();
}

boot().catch((e) => {
  // si el arranque falla (GPU/memoria/red), mostrar un aviso en vez de negro
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;gap:12px;' +
    'align-items:center;justify-content:center;background:#0e2438;color:#fff;' +
    'font-family:system-ui;text-align:center;padding:24px';
  d.innerHTML = `<div style="font-size:2rem">🦟</div>
    <b>Ups, no pudimos arrancar el juego.</b>
    <span style="opacity:.8;font-size:.85rem;max-width:420px">${(e && e.message) || e}</span>
    <button onclick="location.reload()" style="padding:10px 22px;border-radius:12px;border:0;
      font-weight:800;background:#46b23a;color:#fff;cursor:pointer">Reintentar</button>`;
  document.body.appendChild(d);
});
