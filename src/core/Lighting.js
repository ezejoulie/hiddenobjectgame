import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SHADOW_SIZE } from './Quality.js';

/**
 * Lighting.js — iluminación reutilizable: IBL + esquema de tres puntos.
 *
 * El 80% del "wow" visual es la luz (PLAN, sección 3). Acá montamos:
 *  - IBL (Image-Based Lighting) vía RoomEnvironment + PMREM: da luz ambiental
 *    rica y reflejos a los materiales PBR sin necesidad de un HDRI externo.
 *    Más adelante se puede reemplazar por un HDRI por nivel.
 *  - Esquema de tres puntos: key (principal, con sombras), fill (relleno frío)
 *    y rim (contraluz que despega los objetos del fondo).
 */

/**
 * Genera un environment map prefiltrado (PMREM) a partir de RoomEnvironment
 * y lo asigna a scene.environment para que los MeshStandard/Physical lo usen.
 * Devuelve la textura para poder liberarla al cambiar de escena.
 */
export function setupEnvironment(renderer, scene, { asBackground = false } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  if (asBackground) scene.background = envTex;

  pmrem.dispose();
  return envTex;
}

/**
 * Esquema de tres puntos. Devuelve las luces para poder ajustarlas por nivel.
 * @param {THREE.Scene} scene
 * @param {object} opts  intensidades/colores opcionales
 */
export function setupLighting(scene, opts = {}) {
  const {
    keyColor = 0xfff1dd,
    keyIntensity = 2.4,
    fillColor = 0x9bb8ff,
    fillIntensity = 0.5,
    rimColor = 0xffffff,
    rimIntensity = 1.1,
    hemiSky = 0xbfd4ff,
    hemiGround = 0x4a4036,
    hemiIntensity = 0.45,
    shadowArea = 14,
  } = opts;

  const group = new THREE.Group();
  group.name = 'Lighting';

  // Relleno ambiental con gradiente cielo/suelo
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
  group.add(hemi);

  // KEY: luz principal cálida, proyecta sombras
  const key = new THREE.DirectionalLight(keyColor, keyIntensity);
  key.position.set(7, 11, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -shadowArea;
  key.shadow.camera.right = shadowArea;
  key.shadow.camera.top = shadowArea;
  key.shadow.camera.bottom = -shadowArea;
  // bias para evitar shadow acne / peter-panning
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  group.add(key);
  group.add(key.target);

  // FILL: relleno frío y suave desde el lado opuesto, sin sombras
  const fill = new THREE.DirectionalLight(fillColor, fillIntensity);
  fill.position.set(-8, 5, -3);
  group.add(fill);

  // RIM: contraluz que dibuja el borde de los objetos
  const rim = new THREE.DirectionalLight(rimColor, rimIntensity);
  rim.position.set(-4, 7, -10);
  group.add(rim);

  scene.add(group);
  return { group, hemi, key, fill, rim };
}
