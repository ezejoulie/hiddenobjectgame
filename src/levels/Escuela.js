import * as THREE from 'three';
import { Exterior, mat } from './Exterior.js';
import { ESCUELA } from '../data/levels.config.js';

/**
 * Escuela.js — La Escuela: una escuela en plena ciudad. Calle con cebra y
 * líneas, veredas de hormigón, locales con toldo, edificios alrededor, faroles
 * y, dentro del predio, el edificio escolar con su patio y juegos.
 */
export class Escuela extends Exterior {
  constructor(opts = {}) {
    super(opts, ESCUELA, {
      sky: 0xc7d3da, fog: [46, 150], hw: 18, hd: 15, flatR: 100, relief: false,
      ground: { type: 'urban', color: 0xffffff, repeat: 24 },
    });
  }

  // calle de asfalto con línea central y senda peatonal
  _calle(cz, depth) {
    const HW = this.HW;
    const asf = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 30, depth), mat(0x3a3d42, 0.95));
    asf.rotation.x = -Math.PI / 2;
    asf.position.set(0, 0.03, cz);
    asf.receiveShadow = true;
    this.add(asf);
    // línea central amarilla discontinua
    for (let x = -HW - 12; x < HW + 12; x += 3) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), mat(0xf2c23a, 0.6));
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.05, cz);
      this.add(l);
    }
    // senda peatonal (cebra) frente a la escuela
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, depth - 0.6), mat(0xeef0f0, 0.6));
      s.rotation.x = -Math.PI / 2;
      s.position.set(-1.6 + i * 0.7, 0.05, cz);
      this.add(s);
    }
    // cordón de la vereda
    const curb = new THREE.Mesh(new THREE.BoxGeometry(2 * HW + 30, 0.18, 0.25), mat(0xcfccc2, 0.9));
    curb.position.set(0, 0.09, cz - depth / 2 - 0.12);
    this.add(curb);
  }

  _patio(cx, cz, w, d) {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xd2c7b2, 0.95));
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(cx, 0.02, cz);
    piso.receiveShadow = true;
    this.add(piso);
    const lineMat = mat(0xb9b3a0, 0.95);
    for (let i = -w / 2 + 2; i < w / 2; i += 2) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, d), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(cx + i, 0.025, cz);
      this.add(l);
    }
  }

  _decorate() {
    const HW = this.HW;
    this._entornoCiudad({ buildings: 20 });

    // ---- calle + vereda al sur (donde aparece el jugador) ----
    this._calle(13.5, 3.6);

    // ---- predio escolar: patio de baldosas ----
    this._patio(0, -3, 22, 14);

    // ---- edificio escolar (alto) al fondo ----
    this._prop('escuela', { x: 0, z: -12, height: 5.6, footprint: 12, collide: true, colliderR: 6.2 }, () => {
      this._edificio(0, -12, 11, 4, 5.4, 0xe8c98a, { roof: 0xb5562f });
    });
    // mástil con bandera
    this._prop('mastil', { x: 13, z: -8, height: 4.5, collide: true, colliderR: 0.4 }, () => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.5, 8), mat(0xd8d8d8, 0.5, 0.6));
      p.position.set(13, 2.25, -8);
      p.castShadow = true;
      this.add(p);
      this.colliders.push({ type: 'circle', x: 13, z: -8, r: 0.4 });
    });

    // ---- locales/comercios con toldo a los costados ----
    this._edificio(-15.5, 6, 5, 5, 5.5, 0xd98c6a, { shop: 0xe0533f });
    this._edificio(-15.5, 0, 5, 5, 6.5, 0xc9d3dc, { shop: 0x46a0c8 });
    this._edificio(-15.5, -6, 5, 5, 5.0, 0xe0c98a, { shop: 0xf2b134 });
    this._edificio(15.5, 5, 5, 5, 7.0, 0xbfcab2, { shop: 0x6fbf4a });
    this._edificio(15.5, -3, 5, 5, 6.0, 0xd6c8dd, { shop: 0x9b59b6 });

    // ---- faroles a lo largo de la vereda ----
    [[-9, 11], [0, 11], [9, 11], [-13, 2], [13, 2]].forEach(([x, z]) =>
      this._prop('farol', { x, z, height: 3.0, collide: true, colliderR: 0.35 }, () => {
        const p = this._box2(0.14, 3.0, 0.14, 0x33373b, x, z);
        p.position.y = 1.5;
        const luz = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(0xffe9a8, 0.4));
        luz.position.set(x, 3.0, z);
        this.add(luz);
        this.colliders.push({ type: 'circle', x, z, r: 0.3 });
      }));

    // ---- juegos en el patio ----
    this._prop('tobogan', { x: -8, z: 3, height: 2.4, ry: 0.4, collide: true, colliderR: 1.8 },
      () => this._box2(2.4, 1.6, 1.2, 0xe0533f, -8, 3));
    this._prop('hamacas', { x: 8, z: 3, height: 2.4, ry: -0.3, collide: true, colliderR: 1.9 },
      () => this._box2(2.6, 2.2, 1.2, 0x46a0c8, 8, 3));
    this._prop('arenero', { x: 0, z: 6, footprint: 3.0, collide: true, colliderR: 1.6 },
      () => this._box2(3.0, 0.4, 3.0, 0xe8d3a3, 0, 6));
    this._prop('aro_basquet', { x: 11, z: -7, height: 3.0, ry: -Math.PI / 2, collide: true, colliderR: 0.5 });
    this._prop('cesto', { x: 4, z: 10, height: 0.7, collide: true, colliderR: 0.4 });
    this._prop('bebedero_esc', { x: -4, z: -6, height: 0.9, collide: true, colliderR: 0.4 });
    this._prop('cartel_esc', { x: -6, z: 10, height: 1.8, ry: Math.PI, collide: true, colliderR: 0.5 });

    // ---- algunos árboles de vereda (en cantero) ----
    [[-11, 8], [11, 8], [-3, -9]].forEach(([x, z]) => {
      this._box2(1.0, 0.3, 1.0, 0x6b5a44, x, z); // cantero
      this._tree(x, z, 3.4, { collide: true, colliderR: 0.45 });
    });
  }
}
