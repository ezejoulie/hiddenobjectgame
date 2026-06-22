import * as THREE from 'three';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';
import { Input } from './core/Input.js';

import { Player } from './entities/Player.js';
import { ThirdPersonCamera } from './systems/Camera.js';
import { Casa } from './levels/Casa.js';

/**
 * main.js — Sprint 1: Mateo en el living de La Casa.
 * Tercera persona, cámara con anti-clipping de paredes, sala compacta y llena,
 * todo bajo el pipeline visual del Sprint 0.
 */

const canvas = document.getElementById('app');
const renderer = createRenderer(canvas);

// ---------- Escena ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c9d6e3'); // se asoma por la puerta/ventana

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

// ---------- Iluminación ----------
setupEnvironment(renderer, scene); // IBL para los materiales PBR
// Para interior, el rig global aporta ambiente suave; las sombras las da el
// sol de la ventana (en Casa). Por eso bajamos el key global y le sacamos sombra.
const lights = setupLighting(scene, {
  keyIntensity: 0.45,
  fillIntensity: 0.3,
  rimIntensity: 0.4,
  hemiIntensity: 0.55,
});
lights.key.castShadow = false;

// ---------- Nivel ----------
const casa = new Casa();
casa.addTo(scene);

// ---------- Jugador ----------
const player = new Player();
player.setPosition(casa.spawn.x, 0, casa.spawn.z);
scene.add(player.mesh);

// ---------- Cámara 3ra persona ----------
const tpCam = new ThirdPersonCamera(camera, { distance: 5.0, height: 1.45 });
tpCam.setObstacles(casa.wallMeshes);
tpCam.yaw = Math.PI; // mirando hacia el fondo del living
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

// ---------- Loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;

  // mirar
  tpCam.applyLook(input.consumeLook());

  // mover (relativo a la cámara) + colisión
  const move = input.moveVector();
  player.update(dt, move, tpCam.yaw, casa.colliders);

  // escudo (placeholder por ahora)
  if (input.shieldPressed()) player.triggerShield(now);

  // cámara sigue al jugador, evitando paredes
  tpCam.update(player.position, dt);

  postfx.render(dt);
}
loop();
