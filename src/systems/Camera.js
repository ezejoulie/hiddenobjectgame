import * as THREE from 'three';

/**
 * Camera.js — cámara de tercera persona con anti-clipping de paredes.
 *
 * El usuario orbita con yaw/pitch (arrastre). La cámara quiere ubicarse a
 * `distance` detrás del objetivo (la cabeza del jugador). Antes de ubicarse,
 * hace un raycast desde el objetivo hacia esa posición: si una pared se cruza,
 * acerca la cámara hasta justo antes del impacto, para no atravesar muros
 * (lección del PLAN: cámara 3ra persona con anti-clipping).
 */
export class ThirdPersonCamera {
  constructor(camera, { distance = 5.2, height = 1.5 } = {}) {
    this.camera = camera;
    this.yaw = Math.PI; // mirando hacia -Z al arrancar
    this.pitch = 0.5;
    this.distance = distance;
    this.height = height;

    this.minPitch = 0.12;
    this.maxPitch = 1.2;
    this.lookSensitivity = 0.0045;

    this.obstacles = []; // meshes de pared para el raycast
    this._ray = new THREE.Raycaster();
    this._desired = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._currentDist = distance;
  }

  setObstacles(meshes) {
    this.obstacles = meshes || [];
  }

  /** Aplica el arrastre acumulado a yaw/pitch. */
  applyLook({ dx, dy }) {
    this.yaw -= dx * this.lookSensitivity;
    this.pitch = Math.min(this.maxPitch, Math.max(this.minPitch, this.pitch + dy * this.lookSensitivity));
  }

  /** Ubica la cámara detrás del jugador, evitando clipping de paredes. */
  update(playerPos, dt) {
    // objetivo: cabeza del jugador
    this._target.set(playerPos.x, playerPos.y + this.height, playerPos.z);

    // dirección desde el objetivo hacia la cámara (esférica)
    const cp = Math.cos(this.pitch);
    this._dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    let dist = this.distance;

    // anti-clipping: raycast objetivo → cámara deseada
    if (this.obstacles.length) {
      this._ray.set(this._target, this._dir);
      this._ray.far = this.distance;
      const hits = this._ray.intersectObjects(this.obstacles, true);
      if (hits.length) {
        // dejar un margen para que la cámara no quede pegada a la pared
        dist = Math.max(1.2, hits[0].distance - 0.3);
      }
    }

    // suavizar el cambio de distancia (evita "saltos" al cruzar paredes)
    const k = dt ? Math.min(1, dt * 12) : 1;
    this._currentDist += (dist - this._currentDist) * k;

    this._desired
      .copy(this._target)
      .addScaledVector(this._dir, this._currentDist);

    // seguridad: que la cámara nunca baje del piso (evita ver "por abajo")
    if (this._desired.y < 0.4) this._desired.y = 0.4;

    this.camera.position.copy(this._desired);
    this.camera.lookAt(this._target);
  }
}
