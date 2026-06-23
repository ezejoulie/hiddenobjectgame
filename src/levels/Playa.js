import * as THREE from 'three';
import { Exterior, mat } from './Exterior.js';
import { PLAYA } from '../data/levels.config.js';

/**
 * Playa.js — La Playa: arena, mar al norte con muelle, palmeras de coco,
 * sombrillas, reposeras, bote/velero, caracoles y rocas costeras. Sin colinas:
 * el horizonte es el mar (límite invisible en la orilla).
 */
export class Playa extends Exterior {
  constructor(opts = {}) {
    super(opts, PLAYA, {
      sky: 0xbfe8f5, fog: [48, 150], hw: 18, hd: 15, flatR: 100, relief: false,
      ground: { type: 'sand', color: 0xffffff, repeat: 22 },
    });
  }

  _decorate() {
    const HW = this.HW, HD = this.HD;

    // ---- mar al norte (más allá de la orilla / límite) ----
    this._agua(0, -HD - 55, 240, 120, { plane: true, color: 0x1f9fd6, opacity: 0.95, y: 0.06 });
    // franja de arena húmeda en la orilla
    const orilla = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 30, 4), mat(0xcdb98a, 0.85));
    orilla.rotation.x = -Math.PI / 2;
    orilla.position.set(0, 0.04, -HD + 0.5);
    orilla.receiveShadow = true;
    this.add(orilla);
    // espuma (línea clara)
    const espuma = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 30, 0.8), mat(0xf2f8fa, 0.6));
    espuma.rotation.x = -Math.PI / 2;
    espuma.position.set(0, 0.05, -HD - 1);
    this.add(espuma);

    // muelle hacia el mar
    this._prop('muelle', { x: 7, z: -HD - 3, height: 1.0, ry: 0, collide: false }, () => {
      const m = this._box2(2.2, 0.3, 8, 0x8a5a32, 7, -HD - 1);
      m.position.y = 0.5;
    });
    // bote / velero cerca de la orilla
    this._prop('bote', { x: -8, z: -HD - 1, height: 1.0, ry: 0.4, collide: true, colliderR: 1.4 });
    this._prop('velero', { x: 14, z: -HD - 8, height: 4.0, ry: -0.3, collide: false });
    this._prop('boya', { x: -2, z: -HD - 6, height: 0.8, collide: false });

    // ---- palmeras de coco (estructuras altas) ----
    [[-13, 8], [12, 9], [-15, -2], [15, 2], [-6, 11], [9, 12]].forEach(([x, z]) => {
      if (!this._placeGLB('palmera_cocos', { x, z, height: 5.2 + Math.random(), ry: Math.random() * 6.28, collide: true, colliderR: 0.5, jitter: 0.12 }) &&
          !this._placeGLB('palmera', { x, z, height: 4.6, ry: Math.random() * 6.28, collide: true, colliderR: 0.5 }))
        this._tree(x, z, 4.6, { collide: true, colliderR: 0.5, keys: ['palmera', 'arbol'] });
    });

    // ---- sombrillas + reposeras (zona de sol) ----
    [[-5, 3], [4, 5], [-10, 6]].forEach(([x, z]) => {
      this._prop('sombrilla', { x, z, height: 2.4, collide: true, colliderR: 0.5 }, () => {
        const palo = this._box2(0.1, 2.2, 0.1, 0xdddddd, x, z);
        palo.position.y = 1.1;
        const lona = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.7, 10), mat(0xe0533f, 0.85));
        lona.position.set(x, 2.2, z);
        lona.castShadow = true;
        this.add(lona);
      });
      this._prop('reposera', { x: x + 1.6, z: z + 0.4, height: 0.7, ry: 0.3, collide: true, colliderR: 0.7 },
        () => this._box2(0.8, 0.4, 1.6, 0x46a0c8, x + 1.6, z + 0.4));
    });

    // ---- conservadora + toalla + caracoles + rocas costeras ----
    this._prop('conservadora', { x: 1, z: 7, height: 0.6, collide: true, colliderR: 0.5 });
    this._prop('toalla', { x: -3, z: 8, footprint: 1.8, ry: 0.2 }, () => {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), mat(0xff8ac2, 0.9));
      t.rotation.x = -Math.PI / 2;
      t.position.set(-3, 0.05, 8);
      this.add(t);
    });
    [[6, -2], [-7, 1], [10, 5], [-2, 10]].forEach(([x, z]) =>
      this._prop('caracol', { x, z, height: 0.25, ry: Math.random() * 6.28 }));
    [[-15, -8, 1.2], [15, -7, 1.0], [11, -10, 0.8]].forEach(([x, z, h]) => {
      if (!this._placeGLB('roca_costera', { x, z, height: h, ry: Math.random() * 6.28, collide: true, colliderR: h * 0.8 }) &&
          !this._placeGLB('roca_grande', { x, z, height: h, collide: true, colliderR: h * 0.8 }))
        this._rocaPrim(x, z, h, 0xa8a090);
    });

    // pastos de duna dispersos
    [[-14, 12], [13, -3], [-12, -6], [8, 11]].forEach(([x, z]) => this._pastoCluster(x, z, 5, 2));
  }

  // perro en la arena, sin mariposas sobre el mar
  _spawnLife() {
    const dog = this._placeGLB('perro', { x: 3, z: 4, height: 0.55, ry: -0.6 });
    if (dog) this.critters.push({ g: dog, y0: dog.position.y, phase: 0 });
    const cols = [0xffffff, 0xffe08a, 0x9fd9ff];
    [[-6, 5], [5, 9], [-2, 2]].forEach(([x, z], i) => this._mariposa(x, z, cols[i % cols.length]));
  }
}
