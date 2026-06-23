import * as THREE from 'three';
import { Exterior, mat } from './Exterior.js';
import { PARQUE } from '../data/levels.config.js';

/**
 * Parque.js — El Parque: plaza arbolada con laguna y puente, glorieta, juegos
 * (calesita, subibaja, hamacas), bancos, faroles, troncos y hongos. Pasto con
 * relieve y árboles reales alrededor.
 */
export class Parque extends Exterior {
  constructor(opts = {}) {
    super(opts, PARQUE, {
      sky: 0x88c8e8, fog: [42, 138], hw: 18, hd: 15, flatR: 24, relief: true,
      // césped de plaza prolijo: tono más claro/amarillento que el jardín
      ground: { type: 'grass', color: 0xc6e2a2, repeat: 20 },
    });
  }

  _plaza(cx, cz, r) {
    const stone = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mat(0xcdbf9c, 0.95));
    stone.rotation.x = -Math.PI / 2;
    stone.position.set(cx, 0.02, cz);
    stone.receiveShadow = true;
    this.add(stone);
    // anillo de borde
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.3, r, 40), mat(0xb6a884, 0.95));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.025, cz);
    this.add(ring);
  }

  _decorate() {
    this._entornoColinas({ trees: 26, grass: 20, mtns: 10 });

    // plaza central pavimentada (diferencia el piso del jardín)
    this._plaza(0, 1, 4.5);

    // senderos
    this._sendero(0, 13, 0, -2, 9);
    this._sendero(0, -2, -10, -8, 7);
    this._sendero(0, -2, 11, 4, 7);

    // laguna con puente
    this._lago(-9, -8, 4.2, 3.2);
    this._prop('puente', { x: -9, z: -4.2, height: 0.9, ry: 0, collide: false }, () => {
      const p = this._box2(2.4, 0.3, 2.0, 0x8a5a32, -9, -4.2);
      p.position.y = 0.4;
    });

    // glorieta (estructura alta)
    this._prop('glorieta', { x: 10, z: -8, height: 3.4, collide: true, colliderR: 2.4 }, () => {
      const techo = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 8), mat(0xb5562f, 0.9));
      techo.position.set(10, 3.0, -8);
      techo.castShadow = true;
      this.add(techo);
      this.colliders.push({ type: 'circle', x: 10, z: -8, r: 2.2 });
    });

    // juegos
    this._prop('calesita', { x: -10, z: 6, height: 2.6, collide: true, colliderR: 2.0 },
      () => this._box2(3.0, 1.4, 3.0, 0xe0533f, -10, 6));
    this._prop('subibaja', { x: 9, z: 8, height: 0.9, ry: 0.4, collide: true, colliderR: 1.6 },
      () => this._box2(3.0, 0.4, 0.5, 0xf2b134, 9, 8));
    this._prop('hamacas', { x: 0, z: 9, height: 2.4, ry: 0.2, collide: true, colliderR: 1.9 },
      () => this._box2(2.6, 2.2, 1.2, 0x46a0c8, 0, 9));

    // bancos + faroles
    [[-5, 3, 0.4], [6, 1, -0.5], [3, 12, Math.PI], [-13, -1, 1]].forEach(([x, z, ry]) =>
      this._prop('banco_plaza', { x, z, height: 0.85, ry, collide: true, colliderR: 0.9 },
        () => this._box2(1.4, 0.5, 0.5, 0x6b4a2f, x, z)) || this._prop('banco', { x, z, height: 0.85, ry, collide: true, colliderR: 0.9 }));
    [[-3, -3], [7, -3], [-7, 11], [12, 11]].forEach(([x, z]) =>
      this._prop('farol', { x, z, height: 2.6, collide: true, colliderR: 0.35 }));

    // árboles grandes reales
    this._tree(-15, 11, 5.4, { collide: true, colliderR: 0.7 });
    this._tree(15, 12, 5.0, { collide: true, colliderR: 0.7 });
    this._tree(14, -2, 4.8, { collide: true, colliderR: 0.65 });
    this._tree(-15, 3, 5.2, { collide: true, colliderR: 0.7 });
    [[16, 5], [-16, -10]].forEach(([x, z]) => this._tree(x, z, 4.6, { collide: true, colliderR: 0.5, keys: ['pino', 'arbol'] }));

    // tronco caído + hongos + arbustos + rocas
    this._prop('tronco_caido', { x: -6, z: 12, height: 0.6, ry: 0.5, collide: true, colliderR: 1.2 });
    [[5, -6], [-12, 9], [12, 2]].forEach(([x, z]) =>
      this._prop('hongo', { x, z, height: 0.4, ry: Math.random() * 6.28 }));
    [[12, -4], [-13, 4], [4, -8], [-4, 11]].forEach(([x, z]) => {
      if (!this._placeGLB('arbusto_red', { x, z, height: 0.9, ry: Math.random() * 6.28 }) &&
          !this._placeGLB('arbusto', { x, z, height: 0.85, ry: Math.random() * 6.28 }))
        this._arbustoPrim(x, z, 0.85);
      this._flores(x, z, 4);
    });
    this._prop('roca_grande', { x: 14, z: -11, height: 1.2, collide: true, colliderR: 0.9 },
      () => this._rocaPrim(14, -11, 1.1));

    // matas de pasto + flores
    [[-14, -4], [13, 8], [7, -9], [-8, 13]].forEach(([x, z]) => this._pastoCluster(x, z, 6, 2.2));
    for (let i = 0; i < 8; i++) {
      this._flores((Math.random() - 0.5) * 2 * (this.HW - 2), (Math.random() - 0.5) * 2 * (this.HD - 2), 4);
    }
  }
}
