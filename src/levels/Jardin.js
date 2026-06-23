import * as THREE from 'three';
import { Exterior, mat } from './Exterior.js';
import { JARDIN } from '../data/levels.config.js';

/**
 * Jardin.js — El Jardín: huerta de campo en una loma, envolvente.
 * Cobertizo, canteros con verduras, fuente, carretilla, banco, macetas,
 * arbustos florecidos, sendero de piedra, árboles reales y matas de pasto.
 */
export class Jardin extends Exterior {
  constructor(opts = {}) {
    super(opts, JARDIN, {
      sky: 0x9bd6f0, fog: [40, 135], hw: 18, hd: 15, flatR: 24, relief: true,
      ground: { type: 'grass', color: 0xffffff, repeat: 30 },
    });
  }

  _decorate() {
    this._entornoColinas({ trees: 26, grass: 22, mtns: 10 });

    // senderos de piedra
    this._sendero(0, 13, -2, 1, 9);
    this._sendero(-2, 1, -8, -5, 6);
    this._sendero(-2, 1, 9, -1, 7);

    // cobertizo (estructura alta) + árbol grande
    this._prop('cobertizo', { x: -9, z: -7, height: 3.6, ry: 0.5, collide: true, colliderR: 2.1 }, () => {
      this._box2(3.6, 3.2, 3.0, 0xc06a4a, -9, -7);
      this.colliders.push({ type: 'circle', x: -9, z: -7, r: 2.1 });
    });
    this._tree(-13.5, -8.5, 5.6, { collide: true, colliderR: 0.7 });

    // canteros / huerta con verduras
    [[0, 0], [3.6, -2], [-3.2, 1.5]].forEach(([x, z], i) => {
      this._prop('huerta', { x, z, footprint: 2.4, ry: (i % 2) * Math.PI / 2, collide: true, colliderR: 1.2 }, () => {
        this._box2(2.2, 0.4, 1.4, 0x8a5a32, x, z);
        this.colliders.push({ type: 'circle', x, z, r: 1.2 });
        for (let k = 0; k < 5; k++) {
          const v = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat([0xff7a3d, 0x6fbf4a, 0xff5e5b][k % 3]));
          v.position.set(x + (Math.random() - 0.5) * 1.6, 0.5, z + (Math.random() - 0.5) * 1.0);
          this.add(v);
        }
      });
    });

    // fuente de piedra
    if (!this._placeGLB('fuente_jardin', { x: 9, z: -1, height: 1.5, collide: true, colliderR: 1.0 }) &&
        !this._placeGLB('fuente', { x: 9, z: -1, height: 1.4, collide: true, colliderR: 1.0 })) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.5, 16), mat(0xbfc6cc, 0.7));
      base.position.set(9, 0.25, -1);
      base.castShadow = true;
      base.receiveShadow = true;
      this.add(base);
      this.colliders.push({ type: 'circle', x: 9, z: -1, r: 1.0 });
    }

    // carretilla / banco / macetas
    this._prop('carretilla', { x: -6, z: 8, height: 0.85, ry: 0.6, collide: true, colliderR: 0.9 },
      () => this._box2(1.2, 0.5, 0.6, 0x3aa0a0, -6, 8));
    this._prop('banco', { x: 8, z: 9, height: 0.9, ry: Math.PI, collide: true, colliderR: 0.9 },
      () => this._box2(1.4, 0.5, 0.5, 0x6b4a2f, 8, 9));
    [[6, 3], [-2, -4.5], [10.5, 4], [1.5, 11]].forEach(([x, z]) => {
      if (!this._placeGLB('macetero', { x, z, height: 0.6, ry: Math.random() * 6.28, collide: true, colliderR: 0.4 }) &&
          !this._placeGLB('cantero', { x, z, footprint: 0.9, collide: true, colliderR: 0.4 })) {
        this._flores(x, z, 5);
      }
    });

    // árboles grandes (reales) en los bordes
    this._tree(13, -9, 5.2, { collide: true, colliderR: 0.7 });
    this._tree(15, 9, 4.8, { collide: true, colliderR: 0.65 });
    this._tree(-15.5, 9.5, 5.0, { collide: true, colliderR: 0.7 });
    [[-16, -2], [16, 1]].forEach(([x, z]) => this._tree(x, z, 4.6, { collide: true, colliderR: 0.5, keys: ['pino', 'arbol'] }));

    // arbustos florecidos
    [[12, -4], [-12, 5], [13, 6], [-11, -3], [4, -8], [-5, 12]].forEach(([x, z]) => {
      if (!this._placeGLB('arbusto_red', { x, z, height: 0.9, ry: Math.random() * 6.28, jitter: 0.2 }) &&
          !this._placeGLB('arbusto', { x, z, height: 0.85, ry: Math.random() * 6.28, jitter: 0.2 }))
        this._arbustoPrim(x, z, 0.85);
      this._flores(x + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 1.2, 4);
    });

    // rocas
    this._prop('roca_grande', { x: -15, z: -12, height: 1.3, ry: 1, collide: true, colliderR: 1.0 },
      () => this._rocaPrim(-15, -12, 1.1));
    [[14, -12, 0.5], [11, 11, 0.45], [-9, 6, 0.4]].forEach(([x, z, h]) => {
      if (!this._placeGLB('roca', { x, z, height: h, ry: Math.random() * 6.28, collide: true, colliderR: h * 0.8 }))
        this._rocaPrim(x, z, h);
    });

    // matas de pasto alto en el jardín
    [[-13, 3], [12, -8], [6, 12], [-7, -11], [14, 4], [-15, -5], [9, -11], [-4, 9]].forEach(([x, z]) =>
      this._pastoCluster(x, z, 6, 2.2));

    // flores sueltas
    for (let i = 0; i < 10; i++) {
      this._flores((Math.random() - 0.5) * 2 * (this.HW - 2), (Math.random() - 0.5) * 2 * (this.HD - 2), 4);
    }

    // estanque chico
    this._lago(-13, 11, 2.6, 2.0);
  }
}
