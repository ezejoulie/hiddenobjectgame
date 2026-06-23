import * as THREE from 'three';

/**
 * Level.js — clase base de un nivel.
 *
 * Encapsula el grupo de la escena del nivel, sus colliders de jugador y los
 * meshes que la cámara usa para el anti-clipping (paredes). Cada nivel concreto
 * (Casa, Jardín, …) extiende esta clase y arma su geometría en build().
 */
export class Level {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Level';
    this.colliders = []; // colisión del jugador (cajas/círculos en XZ)
    this.wallMeshes = []; // meshes que la cámara raycastea para no atravesar
    this.spawn = new THREE.Vector3(0, 0, 0);
  }

  add(obj) {
    this.group.add(obj);
    return obj;
  }

  addTo(scene) {
    scene.add(this.group);
    return this;
  }

  dispose() {
    this.group.traverse((o) => {
      // No liberar geometría/material clonados del caché GLB (compartidos):
      // se reutilizan al volver a entrar a un nivel.
      if (o.userData && o.userData.shared) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.group.parent?.remove(this.group);
  }
}
