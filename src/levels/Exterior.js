import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { grassTexture, sandTexture } from '../core/Textures.js';

/**
 * Exterior.js — base de los niveles al aire libre (Jardín, Escuela, Parque,
 * Playa). Reúne lo común: terreno con relieve (plano en el área jugable, en
 * colinas afuera), piso texturado, sol, niebla aérea envolvente, colocación de
 * modelos GLB normalizados a escala del personaje, árboles reales, matas de
 * pasto, rocas, flores, estanque animado, perro y mariposas.
 *
 * Cada nivel concreto implementa `_decorate()` para poner sus props y define
 * sus parámetros (cielo, piso, tamaño) por el constructor.
 */

export const mat = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

const PASTO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3DfretboJ3mEvg6Sf67bZOoyIiH/hf_20260612_044206_56015de1-3c48-43e9-9021-c07e45f3e506.png';

const TREE_KEYS = ['arbol', 'arbol_frond', 'arbol_flor'];

export class Exterior extends Level {
  /**
   * @param {object} opts  { models }
   * @param {object} cfg    config del nivel (spawn, etc.)
   * @param {object} p      parámetros del exterior:
   *   { sky, fog:[near,far], hw, hd, flatR, relief, ground:{type:'grass'|'sand', color, repeat} }
   */
  constructor(opts, cfg, p = {}) {
    super();
    this.cfg = cfg;
    this.models = opts.models || {};
    this.spawn.set(cfg.spawn.x, 0, cfg.spawn.z);
    this.lights = [];
    this.butterflies = [];
    this.critters = [];
    this.waters = [];
    this.scene = null;

    this.sky = p.sky ?? 0x9bd6f0;
    this.fog = p.fog ?? [40, 135];
    this.HW = p.hw ?? 18;
    this.HD = p.hd ?? 15;
    this.flatR = p.flatR ?? 24;
    this.relief = p.relief !== false;
    this.ground = p.ground ?? { type: 'grass', color: 0xffffff, repeat: 30 };

    this._buildBase();
    this._decorate();
    this._spawnLife();
  }

  // ---- ciclo de vida (niebla en la escena) ----
  addTo(scene) {
    this.scene = scene;
    scene.add(this.group);
    this._prevFog = scene.fog;
    scene.fog = new THREE.Fog(this.sky, this.fog[0], this.fog[1]);
    return this;
  }
  dispose() {
    if (this.scene) this.scene.fog = this._prevFog || null;
    super.dispose();
  }

  // ---- relieve: 0 en el centro, sube en colinas afuera ----
  _terrainH(x, z) {
    if (!this.relief) return 0;
    const d = Math.hypot(x, z);
    const ramp = THREE.MathUtils.smoothstep(d, this.flatR, this.flatR + 24);
    const roll = Math.sin(x * 0.08) * Math.cos(z * 0.09) * 2.6 + Math.sin((x + z) * 0.05) * 2.2 + 3.2;
    return ramp * Math.max(0, roll);
  }

  // ---- colocación de un GLB normalizado y proporcional ----
  _placeGLB(key, o = {}) {
    const src = this.models[key];
    if (!src) return null;
    const g = src.clone(true);
    let box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    box.getSize(size);
    let s = 1;
    if (o.height) s = o.height / (size.y || 1);
    else if (o.footprint) s = o.footprint / (Math.max(size.x, size.z) || 1);
    if (o.jitter) s *= 1 + (Math.random() - 0.5) * o.jitter;
    g.scale.multiplyScalar(s);
    box = new THREE.Box3().setFromObject(g);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const baseY = o.baseY || 0;
    g.position.set((o.x || 0) - c.x, baseY - box.min.y, (o.z || 0) - c.z);
    if (o.ry != null) g.rotation.y = o.ry;
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = !o.noShadow;
        m.receiveShadow = true;
      }
    });
    this.add(g);
    if (o.collide && o.colliderR) this.colliders.push({ type: 'circle', x: o.x, z: o.z, r: o.colliderR });
    return g;
  }

  /** Coloca un prop GLB con collider (fallback opcional vía callback). */
  _prop(key, o = {}, fallback) {
    const g = this._placeGLB(key, o);
    if (!g && fallback) fallback();
    return g;
  }

  // ---- árboles reales (variedad) ----
  _tree(x, z, h, opts = {}) {
    const keys = opts.keys || TREE_KEYS;
    for (const k of keys) {
      if (this._placeGLB(k, {
        x, z, height: h, ry: Math.random() * 6.28,
        collide: opts.collide, colliderR: opts.colliderR || 0.55,
        jitter: 0.18, baseY: opts.baseY || 0, noShadow: opts.noShadow,
      })) return true;
    }
    this._arbolPrim(x, z, h, opts.baseY || 0);
    return false;
  }

  _arbolPrim(x, z, h = 3.2, baseY = 0) {
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
    g.position.set(x, baseY, z);
    this.add(g);
    this.colliders.push({ type: 'circle', x, z, r: 0.4 });
  }

  _arbustoPrim(x, z, h = 0.7, color = 0x57a84a) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.7, 1), mat(color, 0.95));
    b.position.set(x, h * 0.45, z);
    b.scale.y = 0.8;
    b.castShadow = true;
    b.receiveShadow = true;
    this.add(b);
  }

  _rocaPrim(x, z, h = 0.5, color = 0xb8c2cc) {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.8, 0), mat(color, 0.9));
    r.position.set(x, h * 0.5, z);
    r.scale.y = 0.7;
    r.castShadow = true;
    r.receiveShadow = true;
    this.add(r);
    this.colliders.push({ type: 'circle', x, z, r: h * 0.7 });
  }

  _flores(x, z, n = 8) {
    const g = new THREE.Group();
    const cols = [0xff5e5b, 0xffc93c, 0x9b59b6, 0xff8ac2, 0xff8a3d, 0xffffff];
    for (let i = 0; i < n; i++) {
      const fx = (Math.random() - 0.5) * 1.6;
      const fz = (Math.random() - 0.5) * 1.6;
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), mat(0x3e9a38));
      tallo.position.set(fx, 0.15, fz);
      const flor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 7), mat(cols[i % cols.length]));
      flor.position.set(fx, 0.32, fz);
      g.add(tallo, flor);
    }
    g.position.set(x, 0, z);
    this.add(g);
  }

  _pasto(x, z, baseY = 0) {
    if (this._placeGLB('pasto_alto', {
      x, z, height: 0.4 + Math.random() * 0.45, ry: Math.random() * 6.28, jitter: 0.35, baseY, noShadow: true,
    })) return;
    const g = new THREE.Group();
    const cols = [0x5fb84a, 0x4caf50, 0x6fc95a, 0x7ec96f];
    for (let k = 0; k < 5; k++) {
      const h = 0.28 + Math.random() * 0.34;
      const bl = new THREE.Mesh(new THREE.ConeGeometry(0.03, h, 4), mat(cols[k % cols.length], 0.9));
      bl.position.set((Math.random() - 0.5) * 0.45, h / 2, (Math.random() - 0.5) * 0.45);
      bl.rotation.z = (Math.random() - 0.5) * 0.5;
      g.add(bl);
    }
    g.position.set(x, baseY, z);
    this.add(g);
  }

  _pastoCluster(cx, cz, n = 6, spread = 3) {
    for (let i = 0; i < n; i++) {
      const x = cx + (Math.random() - 0.5) * 2 * spread;
      const z = cz + (Math.random() - 0.5) * 2 * spread;
      this._pasto(x, z, this._terrainH(x, z));
    }
  }

  _sendero(x1, z1, x2, z2, n = 7, color = 0xcdbf9c) {
    const stone = mat(color, 0.95);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.4;
      const z = z1 + (z2 - z1) * t + (Math.random() - 0.5) * 0.4;
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.42 + Math.random() * 0.12, 9), stone);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Math.random() * 3;
      p.scale.set(1, 0.8 + Math.random() * 0.3, 1);
      p.position.set(x, 0.02, z);
      p.receiveShadow = true;
      this.add(p);
    }
  }

  _box2(w, h, d, color, x, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.85));
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    this.add(m);
    return m;
  }

  // ---- agua (estanque chico o mar grande) ----
  _agua(cx, cz, rx, rz, opts = {}) {
    const waterMat = new THREE.MeshStandardMaterial({
      color: opts.color ?? 0x2f9ad6, roughness: 0.12, metalness: 0, transparent: true,
      opacity: opts.opacity ?? 0.9, emissive: 0x0d3b66, emissiveIntensity: 0.25,
    });
    const water = new THREE.Mesh(opts.plane ? new THREE.PlaneGeometry(rx, rz) : new THREE.CircleGeometry(1, 48), waterMat);
    if (!opts.plane) water.scale.set(rx, rz, 1);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, opts.y ?? 0.05, cz);
    water.receiveShadow = true;
    this.add(water);
    this.waters.push({ mesh: water, y: opts.y ?? 0.05 });
    return water;
  }

  _lago(cx, cz, rx, rz) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(0x6a5238, 0.95));
    ground.scale.set(rx + 0.5, rz + 0.5, 1);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0.015, cz);
    ground.receiveShadow = true;
    this.add(ground);
    this._agua(cx, cz, rx, rz);
    this.colliders.push({ type: 'circle', x: cx, z: cz, r: Math.min(rx, rz) - 0.2 });

    const lily = mat(0x3ea35a, 0.85);
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.random() * 0.6;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.18 + Math.random() * 0.1, 12), lily);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(cx + Math.cos(ang) * rx * rr, 0.07, cz + Math.sin(ang) * rz * rr);
      this.add(pad);
    }
    const junco = mat(0x6f8f3a, 0.9);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
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

  _mariposa(x, z, color) {
    const g = new THREE.Group();
    const wingMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.5, metalness: 0, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.15,
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
      g, lw, rw, cx: x, cz: z,
      r: 1.2 + Math.random() * 1.8, speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2, yBase: 0.8 + Math.random() * 0.9,
    });
  }

  // ---- base: piso con relieve, sol, límite invisible, entorno ----
  _buildBase() {
    const repeat = this.ground.repeat ?? 30;
    const gMat = mat(this.ground.color ?? 0xffffff, 0.96);
    gMat.map = this.ground.type === 'sand' ? sandTexture(Math.round(repeat * 0.6)) : grassTexture(repeat);
    const geo = new THREE.PlaneGeometry(190, 190, 150, 150);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this._terrainH(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const piso = new THREE.Mesh(geo, gMat);
    piso.receiveShadow = true;
    this.add(piso);
    if (this.ground.type === 'grass') {
      new THREE.TextureLoader().load(PASTO_URL, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(50, 50);
        t.anisotropy = 8;
        gMat.map = t;
        gMat.needsUpdate = true;
      }, undefined, () => {});
    }

    const sun = new THREE.DirectionalLight(0xfff3da, 2.2);
    sun.position.set(-10, 16, -8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.add(sun);
    this.add(sun.target);
    this.lights.push(sun);

    const HW = this.HW, HD = this.HD;
    this.colliders.push(boxCollider(0, -HD, 2 * HW + 4, 1.5));
    this.colliders.push(boxCollider(0, HD, 2 * HW + 4, 1.5));
    this.colliders.push(boxCollider(-HW, 0, 1.5, 2 * HD + 4));
    this.colliders.push(boxCollider(HW, 0, 1.5, 2 * HD + 4));
  }

  /** Colinas con árboles reales y montañas lejanas (cuenco envolvente). */
  _entornoColinas({ trees = 26, grass = 22, mtns = 10 } = {}) {
    let placed = 0;
    for (let i = 0; i < trees * 2 && placed < trees; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = this.flatR + 4 + Math.random() * 30;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad * 0.9;
      this._tree(x, z, 4.5 + Math.random() * 2.5, { baseY: this._terrainH(x, z), noShadow: true });
      placed++;
    }
    for (let i = 0; i < grass; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = this.flatR + Math.random() * 28;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad * 0.9;
      this._pastoCluster(x, z, 5, 2.5);
    }
    const mtnMat = mat(0x8fa9c4, 1.0);
    for (let i = 0; i < mtns; i++) {
      const ang = (i / mtns) * Math.PI * 2 + 0.3;
      const rad = 82 + Math.random() * 22;
      const h = 18 + Math.random() * 22;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.85, h, 5), mtnMat);
      m.position.set(x, this._terrainH(x, z) + h * 0.34, z);
      this.add(m);
    }
  }

  /** Perro + mariposas (vida). Llamado tras decorar; se puede sobreescribir. */
  _spawnLife(dogPos = [4, 5]) {
    const dog = this._placeGLB('perro', { x: dogPos[0], z: dogPos[1], height: 0.55, ry: -0.6 });
    if (dog) this.critters.push({ g: dog, y0: dog.position.y, phase: 0 });
    const cols = [0xff8ac2, 0xffc93c, 0x7ad1ff, 0xff6b6b, 0xb388ff];
    [[2, 3], [-4, 7], [9, -2], [-7, 0], [6, 7], [0, -6]].forEach(([x, z], i) =>
      this._mariposa(x, z, cols[i % cols.length])
    );
  }

  // subclases lo implementan
  _decorate() {}

  update(dt, t) {
    for (const w of this.waters) {
      w.mesh.position.y = w.y + Math.sin(t * 1.2) * 0.01;
      w.mesh.material.emissiveIntensity = 0.22 + Math.sin(t * 2) * 0.06;
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
