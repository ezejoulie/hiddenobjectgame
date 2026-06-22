import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { createRenderer } from './core/Renderer.js';
import { setupEnvironment, setupLighting } from './core/Lighting.js';
import { createPostFX } from './core/PostFX.js';

/**
 * main.js — bootstrap del Sprint 0 ("look dev").
 *
 * Objetivo: validar el PIPELINE VISUAL antes que cualquier contenido.
 * Escena de prueba (cubo + esfera + showcase de materiales PBR) sobre un piso,
 * iluminada con IBL + tres puntos y pasada por GTAO + bloom + ACES.
 *
 * Criterio de aceptación (PLAN): esto tiene que verse hermoso. Si no, se ajusta
 * la luz/post antes de seguir al contenido.
 */

const canvas = document.getElementById('app');
const renderer = createRenderer(canvas);

// ---------- Escena y cámara ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe0f0'); // cielo suave para look-dev

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(4.2, 2.8, 5.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.7, 0);
controls.minDistance = 2.5;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.495; // no bajar de la línea del piso

// ---------- Iluminación: IBL + tres puntos ----------
setupEnvironment(renderer, scene); // reflejos + ambiente PBR
setupLighting(scene);

// ---------- Piso ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: '#cfd3d8', roughness: 0.96, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Objetos de prueba ----------

// Cubo: material mate, color cálido
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 1.3, 1.3),
  new THREE.MeshStandardMaterial({ color: '#e8633a', roughness: 0.5, metalness: 0.0 })
);
cube.position.set(-1.4, 0.65, 0);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// Esfera "héroe": physical con clearcoat (plástico pulido tipo juguete)
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.85, 64, 64),
  new THREE.MeshPhysicalMaterial({
    color: '#2f86c8',
    roughness: 0.18,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
  })
);
sphere.position.set(1.3, 0.85, 0.2);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// Showcase: fila de esferas variando roughness/metalness para ver el IBL
const showcase = new THREE.Group();
for (let i = 0; i < 5; i++) {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 48, 48),
    new THREE.MeshStandardMaterial({
      color: '#d8dade',
      metalness: i / 4, // 0 → 1
      roughness: 0.12 + (i / 4) * 0.5,
    })
  );
  s.position.set(-1.6 + i * 0.8, 0.32, -1.9);
  s.castShadow = true;
  s.receiveShadow = true;
  showcase.add(s);
}
scene.add(showcase);

// ---------- Post-procesado ----------
const postfx = createPostFX(renderer, scene, camera);

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
  const dt = clock.getDelta();

  cube.rotation.y += dt * 0.4;
  sphere.position.y = 0.85 + Math.sin(clock.elapsedTime * 1.4) * 0.08;

  controls.update();
  postfx.render(dt);
}
loop();
