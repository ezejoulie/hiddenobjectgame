import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { JARDIN } from '../data/levels.config.js';

/**
 * Jardin.js — El Jardín: primer nivel exterior.
 *
 * Patio-parque abierto a escala del personaje (~1.4 m): árboles, pinos,
 * palmeras, arbustos, canteros y rocas reales (GLB) más un lago con plantas
 * acuáticas, un perrito que mueve la cola y mariposas que revolotean.
 * Todo modelo GLB se normaliza por ALTURA o HUELLA para quedar proporcional;
 * si un modelo no cargó, cae a una primitiva equivalente.
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
    this.butterflies = [];
    this.critters = []; // perro, etc. (bob suave)
    this.water = null;
    this._build();
  }

  // ---------- helpers ----------

  _box(w, h, d, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.mat || mat(color, opts.rough, opts.metal));
    m.position.set(x, y, z);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = true;
    this.add(m);
    if (opts.collide) this.colliders.push(boxCollider(x, z, w, d, opts.pad || 0));
    return m;
  }

  /**
   * Coloca un GLB normalizado y proporcional al personaje.
   * @param {string} key  clave en this.models
   * @param {object} o    { x, z, height, footprint, ry, collide, colliderR, jitter }
   * Si se pasa `height`, escala para que mida eso de alto; si no, usa `footprint`
   * (ancho máximo en XZ). Apoya la base en el piso (min.y → 0).
   * Devuelve el grupo colocado, o null si el modelo no existe (usa fallback).
   */
  _placeGLB(key, o = {}) {
    const src = this.models[key];
    if (!src) return null;
    const g = src.clone(true);
    // medir
    let box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    box.getSize(size);
    let s = 1;
    if (o.height) s = o.height / (size.y || 1);
    else if (o.footprint) s = o.footprint / (Math.max(size.x, size.z) || 1);
    if (o.jitter) s *= 1 + (Math.random() - 0.5) * o.jitter;
    g.scale.multiplyScalar(s);
    // recalcular para apoyar en piso y centrar en XZ
    box = new THREE.Box3().setFromObject(g);
    const c = new THREE.Vector3();
    box.getCenter(c);
    g.position.set((o.x || 0) - c.x, -box.min.y, (o.z || 0) - c.z);
    if (o.ry != null) g.rotation.y = o.ry;
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.add(g);
    if (o.collide && o.colliderR) this.colliders.push({ type: 'circle', x: o.x, z: o.z, r: o.colliderR });
    else if (o.collide) {
      const b2 = new THREE.Box3().setFromObject(g);
      const sz = new THREE.Vector3();
      b2.getSize(sz);
      this.colliders.push(boxCollider(o.x, o.z, sz.x * 0.7, sz.z * 0.7));
    }
    return g;
  }

  // --- fallbacks primitivos (proporcionales al personaje) ---

  _arbolPrim(x, z, h = 3.2) {
    const g = new THREE.Group();
    const s = h / 3.2;
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.4 * s, 10), mat(0x8a5a32));
    tronco.position.y = 0.7 * s;
    tronco.castShadow = true;
    g.add(tronco);
    const copaMat = mat(0x4a9a3c, 0.9);
    [[0, 2.0, 0, 0.85], [-0.55, 1.6, 0, 0.55], [0.55, 1.7, 0, 0.52], [0, 2.5, 0, 0.45]].forEach(([dx, dy, dz, r]) => {
      const cc = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), copaMat);
      cc.position.set(dx * s, dy * s, dz * s);
      cc.castShadow = true;
      g.add(cc);
    });
    g.position.set(x, 0, z);
    this.add(g);
    this.colliders.push({ type: 'circle', x, z, r: 0.35 });
  }

  _arbustoPrim(x, z, h = 0.7) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.7, 1), mat(0x57a84a, 0.95));
    b.position.set(x, h * 0.45, z);
    b.scale.y = 0.8;
    b.castShadow = true;
    b.receiveShadow = true;
    this.add(b);
  }

  _rocaPrim(x, z, h = 0.5) {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.8, 0), mat(0xb8c2cc, 0.9));
    r.position.set(x, h * 0.5, z);
    r.scale.y = 0.7;
    r.castShadow = true;
    r.receiveShadow = true;
    this.add(r);
    this.colliders.push({ type: 'circle', x, z, r: h * 0.7 });
  }

  _flores(x, z) {
    const g = new THREE.Group();
    const cols = [0xff5e5b, 0xffc93c, 0x9b59b6, 0xff8ac2, 0xff8a3d];
    for (let i = 0; i < 7; i++) {
      const fx = (Math.random() - 0.5) * 1.3;
      const fz = (Math.random() - 0.5) * 1.3;
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), mat(0x3e9a38));
      tallo.position.set(fx, 0.15, fz);
      const flor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 7), mat(cols[i % 5]));
      flor.position.set(fx, 0.32, fz);
      g.add(tallo, flor);
    }
    g.position.set(x, 0, z);
    this.add(g);
  }

  /** Tronco/poste + travesaños de la cerca perimetral. */
  _cerca(cx, cz, len, horiz) {
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

  // ---------- lago ----------

  _lago(cx, cz, rx, rz) {
    // hueco de tierra húmeda + lámina de agua animada + juncos y nenúfares.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      mat(0x6a5238, 0.95)
    );
    ground.scale.set(rx + 0.5, rz + 0.5, 1);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0.015, cz);
    ground.receiveShadow = true;
    this.add(ground);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2f9ad6,
      roughness: 0.12,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      emissive: 0x0d3b66,
      emissiveIntensity: 0.25,
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMat);
    water.scale.set(rx, rz, 1);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 0.05, cz);
    water.receiveShadow = true;
    this.add(water);
    this.water = water;

    // collider: no se puede caminar dentro del agua (un poco más chico que el visual)
    this.colliders.push({ type: 'circle', x: cx, z: cz, r: Math.min(rx, rz) - 0.2 });

    // nenúfares
    const lily = mat(0x3ea35a, 0.85);
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.random() * 0.6;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.18 + Math.random() * 0.1, 12), lily);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(cx + Math.cos(ang) * rx * rr, 0.07, cz + Math.sin(ang) * rz * rr);
      this.add(pad);
    }
    // juncos en el borde
    const junco = mat(0x6f8f3a, 0.9);
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const jx = cx + Math.cos(ang) * (rx + 0.15);
      const jz = cz + Math.sin(ang) * (rz + 0.15);
      const h = 0.5 + Math.random() * 0.4;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 5), junco);
      c.position.set(jx, h / 2, jz);
      c.rotation.z = (Math.random() - 0.5) * 0.3;
      c.castShadow = true;
      this.add(c);
    }
  }

  // ---------- mariposas ----------

  _mariposa(x, z, color) {
    const g = new THREE.Group();
    const wingMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.15,
    });
    const shape = new THREE.CircleGeometry(0.09, 10);
    const lw = new THREE.Mesh(shape, wingMat);
    const rw = new THREE.Mesh(shape, wingMat);
    lw.position.x = -0.06;
    rw.position.x = 0.06;
    g.add(lw, rw);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), mat(0x222222));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    g.position.set(x, 1.0, z);
    this.add(g);
    this.butterflies.push({
      g, lw, rw,
      cx: x, cz: z,
      r: 1.2 + Math.random() * 1.6,
      speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      yBase: 0.8 + Math.random() * 0.8,
    });
  }

  // ---------- build ----------

  _build() {
    // piso de pasto (dos tonos para dar textura)
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW + 6, 2 * HD + 6), mat(0x6fb44a, 0.96));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    this.add(piso);
    // sendero claro en cruz (estético, no bloquea)
    const sendMat = mat(0xcdb892, 0.95);
    const sendV = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2 * HD), sendMat);
    sendV.rotation.x = -Math.PI / 2;
    sendV.position.set(0, 0.01, 0);
    sendV.receiveShadow = true;
    this.add(sendV);

    // sol exterior
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

    // cerca perimetral
    this._cerca(0, -HD, 2 * HW, true);
    this._cerca(0, HD, 2 * HW, true);
    this._cerca(-HW, 0, 2 * HD, false);
    this._cerca(HW, 0, 2 * HD, false);

    // ---- lago (centro-fondo, no pisa cacharros ni spawn) ----
    this._lago(-5, -3.5, 3.0, 2.4);

    // ---- árboles altos (~3.2 m), proporcionales al personaje ----
    const arboles = [[HW - 2.5, -HD + 3], [HW - 3, HD - 3], [-HW + 3, HD - 3.5], [4.5, 4.5]];
    arboles.forEach(([x, z]) => {
      if (!this._placeGLB('arbol', { x, z, height: 3.2, ry: Math.random() * 6.28, collide: true, colliderR: 0.45, jitter: 0.18 }))
        this._arbolPrim(x, z, 3.2);
    });
    // pinos
    [[-HW + 2.5, -HD + 2.5], [HW - 2.5, 6]].forEach(([x, z]) => {
      if (!this._placeGLB('pino', { x, z, height: 3.6, ry: Math.random() * 6.28, collide: true, colliderR: 0.4, jitter: 0.15 }))
        this._arbolPrim(x, z, 3.4);
    });
    // palmera junto al lago
    if (!this._placeGLB('palmera', { x: -8.5, z: -5.5, height: 3.8, ry: 0.4, collide: true, colliderR: 0.4 }))
      this._arbolPrim(-8.5, -5.5, 3.4);

    // ---- arbustos (~0.7 m) ----
    [[6, -6], [-8.5, 4], [9, 8], [2, -8.5], [-2, 7], [11, -1], [-11, -7]].forEach(([x, z]) => {
      if (!this._placeGLB('arbusto', { x, z, height: 0.7, ry: Math.random() * 6.28, jitter: 0.25 }))
        this._arbustoPrim(x, z, 0.7);
    });

    // ---- canteros de flores (~0.5 m de alto, huella ~1.4 m) ----
    [[6.5, 2.5], [-3.5, 8.5]].forEach(([x, z]) => {
      if (!this._placeGLB('cantero', { x, z, footprint: 1.5, ry: 0, collide: true, colliderR: 0.7 }))
        this._flores(x, z);
    });
    [[0, -7.5], [8, -8.5]].forEach(([x, z]) => this._flores(x, z));

    // ---- rocas (~0.5 m) ----
    [[-10.5, 0.5, 0.55], [8.5, -8.5, 0.5], [10.5, 4.5, 0.45]].forEach(([x, z, h]) => {
      if (!this._placeGLB('roca', { x, z, height: h, ry: Math.random() * 6.28, collide: true, colliderR: h * 0.8 }))
        this._rocaPrim(x, z, h);
    });

    // ---- banco (~0.85 m) ----
    if (!this._placeGLB('banco', { x: 3.5, z: 9, height: 0.85, ry: Math.PI, collide: true, colliderR: 0.8 }))
      this._box(1.4, 0.5, 0.5, 0x9a6b45, 3.5, 0.25, 9, { collide: true });

    // ---- fuente decorativa (~1.3 m) cerca del centro ----
    if (!this._placeGLB('fuente', { x: 4, z: -2.5, height: 1.3, collide: true, colliderR: 0.9 })) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.4, 16), mat(0xbfc6cc, 0.7));
      base.position.set(4, 0.2, -2.5);
      base.castShadow = true;
      base.receiveShadow = true;
      this.add(base);
      this.colliders.push({ type: 'circle', x: 4, z: -2.5, r: 0.95 });
    }

    // ---- perrito (animal) ----
    const dog = this._placeGLB('perro', { x: -2, z: 4.5, height: 0.55, ry: -0.6 });
    if (dog) this.critters.push({ g: dog, y0: dog.position.y, phase: 0 });
    else {
      // fallback: perrito primitivo simple
      const dg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 4, 8), mat(0xb07a44, 0.85));
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.32;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xb07a44, 0.85));
      head.position.set(0.32, 0.42, 0);
      dg.add(body, head);
      [[-0.18, 0.12], [0.18, 0.12], [-0.18, -0.12], [0.18, -0.12]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), mat(0x8a5e34));
        leg.position.set(lx, 0.14, lz);
        dg.add(leg);
      });
      dg.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      dg.position.set(-2, 0, 4.5);
      dg.rotation.y = -0.6;
      this.add(dg);
      this.critters.push({ g: dg, y0: 0, phase: 0 });
    }

    // ---- mariposas (animales que revolotean) ----
    const colsMar = [0xff8ac2, 0xffc93c, 0x7ad1ff, 0xff6b6b, 0xb388ff];
    [[2, 2], [-4, 6], [7, -3], [-6, -1], [5, 6]].forEach(([x, z], i) => this._mariposa(x, z, colsMar[i % colsMar.length]));

    // plantas GLB del pack base si están (relleno)
    if (this.models.plant) {
      [[-9, 7], [10, -5]].forEach(([x, z]) => {
        if (!this._placeGLB('plant', { x, z, height: 0.9, ry: Math.random() * 6.28 })) {
          this._arbustoPrim(x, z, 0.7);
        }
      });
    }
  }

  /** Anima agua, mariposas y bichos. La llama el loop principal. */
  update(dt, t) {
    if (this.water) {
      this.water.position.y = 0.05 + Math.sin(t * 1.2) * 0.01;
      this.water.material.emissiveIntensity = 0.22 + Math.sin(t * 2) * 0.06;
    }
    for (const b of this.butterflies) {
      const a = t * b.speed + b.phase;
      b.g.position.set(b.cx + Math.cos(a) * b.r, b.yBase + Math.sin(t * 2 + b.phase) * 0.35, b.cz + Math.sin(a) * b.r);
      b.g.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.phase) * 0.9;
      b.lw.rotation.y = flap;
      b.rw.rotation.y = -flap;
    }
    for (const c of this.critters) {
      c.g.position.y = c.y0 + Math.abs(Math.sin(t * 3 + c.phase)) * 0.04;
    }
  }
}
