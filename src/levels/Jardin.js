import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { JARDIN } from '../data/levels.config.js';

/**
 * Jardin.js — El Jardín: primer nivel exterior. Patio abierto con cerca,
 * árboles, arbustos, cantero de flores, galpón, rocas. Sin paredes internas:
 * recorrés al aire libre y juntás los 10 cacharros.
 */

const mat = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

const HW = 13; // medio ancho (x)
const HD = 11; // media profundidad (z)

export class Jardin extends Level {
  constructor(opts = {}) {
    super();
    this.cfg = JARDIN;
    this.spawn.set(this.cfg.spawn.x, 0, this.cfg.spawn.z);
    this.lights = [];
    this.models = opts.models || {};
    this._build();
  }

  _box(w, h, d, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.mat || mat(color, opts.rough, opts.metal));
    m.position.set(x, y, z);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = true;
    this.add(m);
    if (opts.collide) this.colliders.push(boxCollider(x, z, w, d, opts.pad || 0));
    return m;
  }

  _arbol(x, z, s = 1) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 1.5 * s, 10), mat(0x8a5a32));
    tronco.position.y = 0.75 * s;
    tronco.castShadow = true;
    g.add(tronco);
    const copaMat = mat(0x4a9a3c, 0.9);
    [[0, 2.1, 0, 0.95], [-0.6, 1.7, 0, 0.62], [0.6, 1.8, 0, 0.6], [0, 2.7, 0, 0.5]].forEach(([dx, dy, dz, r]) => {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), copaMat);
      c.position.set(dx * s, dy * s, dz * s);
      c.castShadow = true;
      g.add(c);
    });
    g.position.set(x, 0, z);
    this.add(g);
    this.colliders.push({ type: 'circle', x, z, r: 0.4 * s });
  }

  _arbusto(x, z, s = 1) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 1), mat(0x57a84a, 0.95));
    b.position.set(x, 0.32 * s, z);
    b.scale.y = 0.8;
    b.castShadow = true;
    b.receiveShadow = true;
    this.add(b);
  }

  _flores(x, z) {
    const g = new THREE.Group();
    const cols = [0xff5e5b, 0xffc93c, 0x9b59b6, 0xff8ac2, 0xff8a3d];
    for (let i = 0; i < 6; i++) {
      const fx = (Math.random() - 0.5) * 1.4;
      const fz = (Math.random() - 0.5) * 1.4;
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 5), mat(0x3e9a38));
      tallo.position.set(fx, 0.16, fz);
      const flor = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 7), mat(cols[i % 5]));
      flor.position.set(fx, 0.34, fz);
      g.add(tallo, flor);
    }
    g.position.set(x, 0, z);
    this.add(g);
  }

  _roca(x, z, s = 1) {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 * s, 0), mat(0xb8c2cc, 0.9));
    r.position.set(x, 0.25 * s, z);
    r.scale.y = 0.7;
    r.castShadow = true;
    r.receiveShadow = true;
    this.add(r);
    this.colliders.push({ type: 'circle', x, z, r: 0.35 * s });
  }

  _cerca(cx, cz, len, horiz) {
    // poste + travesaños; collider de pared fina a lo largo
    const n = Math.max(2, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (i * len) / n;
      const px = horiz ? cx + t : cx;
      const pz = horiz ? cz : cz + t;
      this._box(0.12, 0.9, 0.12, 0xfff1d8, px, 0.45, pz, { cast: true });
    }
    const w = horiz ? len : 0.12;
    const d = horiz ? 0.12 : len;
    this._box(w, 0.1, d, 0xfff1d8, cx, 0.62, cz, { cast: false });
    this._box(w, 0.1, d, 0xfff1d8, cx, 0.32, cz, { cast: false });
    this.colliders.push(boxCollider(cx, cz, horiz ? len : 0.25, horiz ? 0.25 : len));
  }

  _build() {
    // ---- piso de pasto ----
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 4, 2 * HD + 4), mat(0x6fb44a, 0.95));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    this.add(piso);

    // ---- sol exterior (sombras) ----
    const sun = new THREE.DirectionalLight(0xfff3da, 2.2);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.add(sun);
    this.add(sun.target);
    this.lights.push(sun);

    // ---- cerca perimetral ----
    this._cerca(0, -HD, 2 * HW, true);
    this._cerca(0, HD, 2 * HW, true);
    this._cerca(-HW, 0, 2 * HD, false);
    this._cerca(HW, 0, 2 * HD, false);

    // ---- galpón (rincón) ----
    this._box(3.2, 2.2, 2.6, 0xc06a4a, -HW + 2, 1.1, -HD + 1.8, { collide: true });
    const techo = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 4), mat(0x8a4a32));
    techo.position.set(-HW + 2, 2.75, -HD + 1.8);
    techo.rotation.y = Math.PI / 4;
    techo.castShadow = true;
    this.add(techo);

    // ---- vegetación ----
    [[HW - 2.5, -HD + 3, 1.4], [-3, -HD + 2.5, 1.1], [HW - 3, HD - 3, 1.3], [-HW + 3, HD - 3.5, 1.2], [4, 5, 1.0]].forEach(
      ([x, z, s]) => this._arbol(x, z, s)
    );
    [[6, -6], [-8, 4], [9, 8], [-9, 9], [2, -8], [-2, 7]].forEach(([x, z]) => this._arbusto(x, z, 1.1));
    [[0, -4], [-6, -2], [7, 2], [-4, 8]].forEach(([x, z]) => this._flores(x, z));
    this._roca(-10, -3, 1.2);
    this._roca(8, -8, 1.0);
    this._roca(10, 4, 0.9);

    // plantas GLB si están
    if (this.models.plant) {
      [[-5, 0], [5, -2]].forEach(([x, z]) => {
        const p = this.models.plant.clone(true);
        const box = new THREE.Box3().setFromObject(p);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        p.scale.multiplyScalar(1.3 / (Math.max(sz.x, sz.z) || 1));
        const b2 = new THREE.Box3().setFromObject(p);
        const c = new THREE.Vector3();
        b2.getCenter(c);
        p.position.set(x - c.x, -b2.min.y, z - c.z);
        p.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.add(p);
      });
    }
  }
}
