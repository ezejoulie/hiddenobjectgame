import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';
import { AssetLoader } from './core/AssetLoader.js';
import { Audio } from './core/Audio.js';
import { IS_MOBILE, QUALITY, setQuality, DPR_CAP } from './core/Quality.js';

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

// Modelos propios (Higgsfield → Tripo 3D), regenerados desde las imágenes de
// referencia y servidos desde el propio sitio: el CDN viejo dejó de responder (403).
const HF = `${BASE}assets/models/hf/`;
const hf = (k) => `${HF}${k}.glb`;

// Manifiesto de modelos (drop-in: agregar acá y usar en el nivel).
// Las claves sin modelo usan su fallback de primitivas.
const MODELS = {
  sofa: `${BASE}assets/models/base/GlamVelvetSofa.glb`,
  armchair: `${BASE}assets/models/base/SheenChair.glb`,
  chair2: `${BASE}assets/models/base/ChairDamaskPurplegold.glb`,
  // muebles por ambiente
  heladera: hf('heladera'),
  mesada: hf('mesada'),
  banadera: hf('banadera'),
  lavarropas: hf('lavarropas'),
  cama: hf('cama'),
  ropero: hf('ropero'),
  alacena: hf('alacena'),
  tele: hf('tele'),
  mesa_ratona: hf('mesa_ratona'),
  mesa_luz: hf('mesa_luz'),
  // jardín (exterior)
  arbol: hf('arbol'),
  arbol_frond: hf('arbol'),
  arbol_flor: hf('arbol_flor'),
  palmera: hf('palmera_cocos'),
  arbusto: hf('arbusto'),
  arbusto_red: hf('arbusto'),
  roca: hf('roca_grande'),
  roca_grande: hf('roca_grande'),
  banco: hf('banco'),
  cantero: hf('huerta'),
  cantero_flor: hf('cantero_flor'),
  macetero: hf('maceta'),
  huerta: hf('huerta'),
  cobertizo: hf('cobertizo'),
  sendero: hf('sendero'),
  fuente: hf('fuente'),
  fuente_jardin: hf('fuente'),
  pasto_alto: hf('pasto_alto'),
  // escuela
  cartel_esc: hf('cartel_esc'),
  banco_plaza: hf('banco'),
  // parque
  glorieta: hf('glorieta'),
  puente: hf('puente'),
  estanque: hf('estanque'),
  tronco_caido: hf('tronco_caido'),
  cartel_parque: hf('cartel_parque'),
  hongo: hf('hongo'),
  farol: hf('farol'),
  // playa
  reposera: hf('reposera'),
  muelle: hf('muelle'),
  toalla: hf('toalla'),
  caracol: hf('caracol'),
  roca_costera: hf('roca_costera'),
  palmera_cocos: hf('palmera_cocos'),
  vase: `${BASE}assets/models/base/GlassVaseFlowers.glb`,
  plant: `${BASE}assets/models/base/DiffuseTransmissionPlant.glb`,
  lamp: `${BASE}assets/models/base/IridescenceLamp.glb`,
};

// Giro (rad) que deja cada modelo HF con el frente hacia +Z, la convención de
// `ry` en los niveles (Tripo los genera mirando a +X o -Z según la imagen).
const YAW_FIX = {
  heladera: -Math.PI / 2, mesada: -Math.PI / 2, banadera: -Math.PI / 2, lavarropas: -Math.PI / 2,
  cama: -Math.PI / 2, ropero: -Math.PI / 2, alacena: -Math.PI / 2, tele: -Math.PI / 2,
  mesa_luz: -Math.PI / 2, cobertizo: -Math.PI / 2, reposera: -Math.PI / 2,
  cartel_esc: -Math.PI / 2, cartel_parque: -Math.PI / 2, banco: Math.PI, banco_plaza: Math.PI,
};

// Personajes jugables (Mixamo → glTF, optimizados)
const HEROES = {
  nene: `${BASE}assets/models/heroes/nene.glb`,
  nena: `${BASE}assets/models/heroes/nena.glb`,
};
// Denguín: sin modelo por ahora (el GLB vivía en el CDN caído) → versión procedural
const DENGUIN_URL = null;

// Cacharros (GLB) por tipo; los que no están usan el modelo procedural
const CACHARRO_URLS = {
  balde: hf('balde'),
  tacho: hf('tacho'),
  regadera: hf('regadera'),
  botella: hf('botella'),
  lata: hf('lata'),
  vaso: hf('vaso'),
  florero: hf('florero'),
  maceta: hf('maceta'),
  frasco: hf('frasco'), // bidón
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
    denguinModel = DENGUIN_URL ? await loader.loadGLTF(DENGUIN_URL).then((g) => g.scene).catch(() => null) : null;
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

  // ---------- Calidad gráfica (low/medium/high, recarga al cambiar) ----------
  const QLABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };
  const qBtn = document.createElement('button');
  qBtn.id = 'btn-quality';
  qBtn.innerHTML = `⚙️ <span>${QLABEL[QUALITY]}</span>`;
  qBtn.title = 'Calidad gráfica (si se traba, bajala)';
  qBtn.addEventListener('click', () => {
    const order = ['low', 'medium', 'high'];
    setQuality(order[(order.indexOf(QUALITY) + 1) % 3]);
  });
  document.body.appendChild(qBtn);

  const levelLoader = makeLevelLoader();

  // ---------- Pausa (botón ⏸ o tecla P) ----------
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'btn-pause';
  pauseBtn.textContent = '⏸';
  pauseBtn.title = 'Pausar (P)';
  pauseBtn.style.display = 'none';
  document.body.appendChild(pauseBtn);
  function togglePause() {
    if (!game || game.state !== 'playing') return;
    if (!game.paused) {
      game.paused = true;
      screens._show({
        emoji: '⏸️', title: 'Juego en pausa',
        desc: 'El tiempo y Denguín están congelados. ¡Tomate un respiro!',
        buttons: [
          { label: '▶️ Reanudar', cls: 'verde', onClick: () => { game.paused = false; screens.hide(); input.lock(); } },
          { label: '🗺️ Salir al mapa', cls: '', onClick: () => showMap() },
        ],
      });
    } else {
      game.paused = false;
      screens.hide();
      input.lock();
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') togglePause();
  });

  // cortina circular (transición con onda, estilo juegos toon)
  const wipeEl = document.createElement('div');
  wipeEl.id = 'wipe';
  document.body.appendChild(wipeEl);
  function wipe(fn) {
    wipeEl.classList.add('on');
    setTimeout(() => {
      // la cortina SIEMPRE se retira, aunque algo falle adentro (si no, la
      // pantalla quedaba tapada y no se podía jugar)
      try {
        fn();
      } catch (e) {
        console.error('[wipe]', e);
      } finally {
        setTimeout(() => wipeEl.classList.remove('on'), 120);
      }
    }, 480);
  }

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
      let s = loader.instance(url);
      if (s && YAW_FIX[k]) {
        // envolver: el nivel pisa la rotación del modelo con su `ry`
        s.rotation.y = YAW_FIX[k];
        s = new THREE.Group().add(s);
      }
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
    pauseBtn.style.display = '';
    const cfg = LEVEL_CONFIGS[id];
    levelLoader.show(cfg);
    const models = await loadLevelModels(id);
    if (loader.failed.size) {
      console.warn(`[assets] ${loader.failed.size} modelo(s) no cargaron (se usan primitivas):`, [...loader.failed]);
    }

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
    tpCam.snap();
    player.vx = 0;
    player.vz = 0;
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
    // giro 360° en frío detrás del loader: compila/precarga TODA la escena,
    // así girar rápido la cámara después no traba ni un frame
    for (let i = 0; i < 4; i++) {
      tpCam.yaw = Math.PI + (i * Math.PI) / 2;
      tpCam.snap();
      tpCam.update(player.position, 0);
      postfx.render(0);
    }
    tpCam.yaw = Math.PI;
    tpCam.snap();
    tpCam.update(player.position, 0);
    postfx.render(0);
    levelLoader.hide();

    const startGame = () => {
      audio.resume();
      wipe(() => {
        audio.startMusic(id); // música propia de cada escena
        game.start();
        input.lock(); // mirar con el mouse (sin mantener); Esc para soltar
      });
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
    pauseBtn.style.display = 'none';
    startMenuMusic(); // volver a la música de menú entre escenas
    player.mesh.visible = false;
    // recorrido OBLIGATORIO en orden: cada nivel se desbloquea al completar el anterior
    const niveles = NIVELES.map((n, i) => ({
      ...n,
      locked: i > 0 && !completed.has(NIVELES[i - 1].id),
    }));
    screens.map(niveles, (id) => wipe(() => startLevel(id)), { completed, onMedal: showDiploma });
  }

  // depuración (solo con ?debug en la URL): permite verificar niveles en tests
  if (location.search.includes('debug')) {
    window.__pad = {
      startLevel: (id) => startLevel(id),
      get game() { return game; },
      get level() { return level; },
      get failed() { return [...loader.failed]; },
      get player() { return player; },
      get cam() { return tpCam; },
    };
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

  // caché persistente de assets (modelos/texturas): carga una vez, queda guardado
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const _v = new THREE.Vector3();
  let wasPaused = false;
  let raining = false;
  let stepAcc = 0;
  // resolución adaptativa (truco de los juegos web fluidos): si el dispositivo
  // no llega a ~30 fps, baja la resolución interna en pasos imperceptibles y
  // la devuelve cuando sobra potencia. Nadie deja de jugar por trabarse.
  let ftAcc = 0, ftN = 0, lastAdj = 0, dprScale = 1;
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
        if (level.update) level.update(dt, now, player.position);
        // pasos al ritmo de la caminata real
        const spd = Math.hypot(player.vx || 0, player.vz || 0);
        if (spd > 0.6 && game.state === 'playing') {
          stepAcc += spd * dt;
          if (stepAcc > 1.35) {
            stepAcc = 0;
            audio.step();
          }
        } else {
          stepAcc = 0.9; // el primer paso suena enseguida al arrancar
        }
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

    // resolución adaptativa (medir fps reales y ajustar cada 2 s)
    ftAcc += dt;
    ftN += 1;
    if (now - lastAdj > 2 && ftAcc > 0) {
      const fps = ftN / ftAcc;
      ftAcc = 0; ftN = 0; lastAdj = now;
      if (level && game && game.state === 'playing') {
        let ns = dprScale;
        if (fps < 28 && dprScale > 0.55) ns = Math.max(0.55, dprScale - 0.15);
        else if (fps > 55 && dprScale < 1) ns = Math.min(1, dprScale + 0.1);
        if (ns !== dprScale) {
          dprScale = ns;
          const target = Math.min(window.devicePixelRatio, DPR_CAP) * dprScale;
          renderer.setPixelRatio(target);
          postfx.composer.setPixelRatio(target);
          onResize();
        }
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
