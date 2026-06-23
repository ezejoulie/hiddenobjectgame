import * as THREE from 'three';
import { Exterior, mat } from './Exterior.js';
import { ESCUELA } from '../data/levels.config.js';

/**
 * Escuela.js — La Escuela: patio de recreo. Edificio escolar, mástil, juegos
 * (tobogán, hamacas, trepador, arenero), bancos, bebedero, cesto y cartel,
 * con árboles alrededor. Piso de pasto con un patio de baldosas.
 */
export class Escuela extends Exterior {
  constructor(opts = {}) {
    super(opts, ESCUELA, {
      sky: 0xbfe3f3, fog: [44, 140], hw: 18, hd: 15, flatR: 24, relief: true,
      ground: { type: 'grass', color: 0xffffff, repeat: 30 },
    });
  }

  _patio(cx, cz, w, d) {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xd8d2c4, 0.95));
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(cx, 0.02, cz);
    piso.receiveShadow = true;
    this.add(piso);
    // juntas (líneas) sutiles
    const lineMat = mat(0xb9b3a4, 0.95);
    for (let i = -w / 2 + 2; i < w / 2; i += 2) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, d), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(cx + i, 0.025, cz);
      this.add(l);
    }
  }

  _decorate() {
    this._entornoColinas({ trees: 22, grass: 18, mtns: 9 });

    // patio de baldosas frente al edificio
    this._patio(0, -2, 22, 16);

    // edificio escolar (estructura ALTA al fondo)
    this._prop('escuela', { x: 0, z: -12, height: 5.4, footprint: 12, collide: true, colliderR: 6.2 }, () => {
      this._box2(11, 4.5, 4, 0xe8c98a, 0, -12);
      this.colliders.push({ type: 'circle', x: 0, z: -12, r: 5.6 });
      const techo = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.5, 4.6), mat(0xb5562f, 0.9));
      techo.position.set(0, 4.75, -12);
      techo.castShadow = true;
      this.add(techo);
    });

    // mástil con bandera
    this._prop('mastil', { x: 13, z: -8, height: 4.5, collide: true, colliderR: 0.4 }, () => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.5, 8), mat(0xd8d8d8, 0.5, 0.6));
      p.position.set(13, 2.25, -8);
      p.castShadow = true;
      this.add(p);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), mat(0x4a90d9, 0.8));
      f.position.set(13.6, 4.0, -8);
      f.castShadow = true;
      this.add(f);
      this.colliders.push({ type: 'circle', x: 13, z: -8, r: 0.4 });
    });

    // juegos
    this._prop('tobogan', { x: -9, z: 4, height: 2.4, ry: 0.4, collide: true, colliderR: 1.8 },
      () => this._box2(2.4, 1.6, 1.2, 0xe0533f, -9, 4));
    this._prop('hamacas', { x: 9, z: 5, height: 2.4, ry: -0.3, collide: true, colliderR: 1.9 },
      () => this._box2(2.6, 2.2, 1.2, 0x46a0c8, 9, 5));
    this._prop('trepador', { x: 0, z: 7, height: 2.0, collide: true, colliderR: 1.6 },
      () => this._box2(2.0, 1.8, 2.0, 0xf2b134, 0, 7));
    this._prop('arenero', { x: -13, z: -2, footprint: 3.2, collide: true, colliderR: 1.7 },
      () => this._box2(3.0, 0.4, 3.0, 0xe8d3a3, -13, -2));
    this._prop('castillo', { x: 13, z: 8, height: 2.6, ry: -0.5, collide: true, colliderR: 1.8 });

    // bancos / cesto / bebedero / pizarrón / cartel
    [[-6, 9, 0.3], [6, 10, -0.4]].forEach(([x, z, ry]) =>
      this._prop('banco_plaza', { x, z, height: 0.85, ry, collide: true, colliderR: 0.9 },
        () => this._box2(1.4, 0.5, 0.5, 0x6b4a2f, x, z)) || this._prop('banco', { x, z, height: 0.85, ry, collide: true, colliderR: 0.9 }));
    this._prop('cesto', { x: 4, z: 11, height: 0.7, collide: true, colliderR: 0.4 });
    this._prop('bebedero_esc', { x: -4, z: -6, height: 0.9, collide: true, colliderR: 0.4 });
    this._prop('pizarron', { x: -14, z: 6, height: 1.6, ry: 0.6, collide: true, colliderR: 0.8 });
    this._prop('cartel_esc', { x: 6, z: 13, height: 1.8, ry: Math.PI, collide: true, colliderR: 0.5 });
    this._prop('aro_basquet', { x: 15, z: 0, height: 3.0, ry: -Math.PI / 2, collide: true, colliderR: 0.5 });

    // árboles del patio + arbustos + flores
    this._tree(-15, 10, 4.8, { collide: true, colliderR: 0.65 });
    this._tree(15, 11, 4.6, { collide: true, colliderR: 0.65 });
    this._tree(-16, -8, 5.0, { collide: true, colliderR: 0.7 });
    [[11, -4], [-11, 2], [4, -6]].forEach(([x, z]) => {
      if (!this._placeGLB('arbusto_red', { x, z, height: 0.85, ry: Math.random() * 6.28 }) &&
          !this._placeGLB('arbusto', { x, z, height: 0.8, ry: Math.random() * 6.28 }))
        this._arbustoPrim(x, z, 0.8);
    });
    [[-13, 12], [12, 13], [0, 12]].forEach(([x, z]) => this._flores(x, z, 5));
    [[-13, 4], [13, -10], [7, -4], [-7, 12]].forEach(([x, z]) => this._pastoCluster(x, z, 5, 2));
  }
}
