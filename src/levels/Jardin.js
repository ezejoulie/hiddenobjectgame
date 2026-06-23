import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { grassTexture } from '../core/Textures.js';
import { JARDIN } from '../data/levels.config.js';

/**
 * Jardin.js — El Jardín: nivel exterior abierto y envolvente en una loma.
 *
 * Una huerta de campo (cobertizo, canteros con verduras, fuente de piedra,
 * carretilla, banco, macetas, arbustos florecidos, sendero de piedra) sobre
 * pasto texturado con matas altas. El área jugable es plana; alrededor el
 * terreno sube en colinas con árboles REALES y montañas lejanas con niebla,
 * formando un cuenco que envuelve al jardín. No hay cerca: límite invisible.
 *
 * Modelos GLB normalizados por ALTURA o HUELLA, proporcionales al personaje
 * (~1.4 m); las estructuras quedan más altas que él. Fallback a primitivas.
 */

const mat = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

const PASTO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3DfretboJ3mEvg6Sf67bZOoyIiH/hf_20260612_044206_56015de1-3c48-43e9-9021-c07e45f3e506.png';

const SKY = 0x9bd6f0;
const HW = 18; // medio ancho jugable (x)
const HD = 15; // media profundidad jugable (z)
const FLAT_R = 24; // radio plano (área jugable); más allá empieza el relieve

// claves de árboles reales (variedad) para usar en todo el nivel
const TREE_KEYS = ['arbol', 'arbol_frond', 'arbol_flor'];

export class Jardin extends Level {
  constructor(opts = {}) {
    super();
    this.cfg = JARDIN;
    this.spawn.set(this.cfg.spawn.x, 0, this.cfg.spawn.z);
    this.lights = [];
    this.models = opts.models || {};
    this.butterflies = [];
    this.critters = [];
    this.water = null;
    this.scene = null;
    this._build();
  }

  addTo(scene) {
    this.scene = scene;
    scene.add(this.group);
    this._prevFog = scene.fog;
    scene.fog = new THREE.Fog(SKY, 40, 135);
    return this;
  }

  dispose() {
    if (this.scene) this.scene.fog = this._prevFog || null;
    super.dispose();
  }

  // ---------- relieve del terreno ----------
  // 0 en el centro (área jugable plana); sube en colinas hacia afuera.
  _terrainH(x, z) {
    const d = Math.hypot(x, z);
    const ramp = THREE.MathUtils.smoothstep(d, FLAT_R, FLAT_R + 24);
    const roll =
      Math.sin(x * 0.08) * Math.cos(z * 0.09) * 2.6 +
      Math.sin((x + z) * 0.05) * 2.2 +
      3.2;
    return ramp * Math.max(0, roll);
  }

  // ---------- helpers ----------

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

  /** Árbol real (variedad). baseY permite apoyarlo sobre el relieve. */
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

  _rocaPrim(x, z, h = 0.5) {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.8, 0), mat(0xb8c2cc, 0.9));
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

  /** Mata de pasto alto (GLB real, con fallback de briznas). */
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

  /** Cluster de matas de pasto para generar "lugares" con relieve. */
  _pastoCluster(cx, cz, n = 6, spread = 3) {
    for (let i = 0; i < n; i++) {
      const x = cx + (Math.random() - 0.5) * 2 * spread;
      const z = cz + (Math.random() - 0.5) * 2 * spread;
      this._pasto(x, z, this._terrainH(x, z));
    }
  }

  _sendero(x1, z1, x2, z2, n = 7) {
    const stone = mat(0xcdbf9c, 0.95);
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

  // ---------- entorno lejano (colinas con árboles reales + montañas) ----------

  _entorno() {
    // árboles REALES salpicando las colinas, apoyados en el relieve
    let placed = 0;
    for (let i = 0; i < 60 && placed < 26; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = FLAT_R + 4 + Math.random() * 30;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad * 0.9;
      const h = 4.5 + Math.random() * 2.5;
      this._tree(x, z, h, { baseY: this._terrainH(x, z), noShadow: true, keys: TREE_KEYS });
      placed++;
    }
    // matas de pasto en las laderas (relieve verde)
    for (let i = 0; i < 22; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = FLAT_R + Math.random() * 28;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad * 0.9;
      this._pastoCluster(x, z, 5, 2.5);
    }
    // montañas azuladas en el horizonte
    const mtnMat = mat(0x8fa9c4, 1.0);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.3;
      const rad = 82 + Math.random() * 22;
      const h = 18 + Math.random() * 22;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.85, h, 5), mtnMat);
      m.position.set(x, this._terrainH(x, z) + h * 0.34, z);
      this.add(m);
    }
  }

  // ---------- pond + mariposas ----------

  _lago(cx, cz, rx, rz) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(0x6a5238, 0.95));
    ground.scale.set(rx + 0.5, rz + 0.5, 1);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0.015, cz);
    ground.receiveShadow = true;
    this.add(ground);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2f9ad6, roughness: 0.12, metalness: 0, transparent: true,
      opacity: 0.9, emissive: 0x0d3b66, emissiveIntensity: 0.25,
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMat);
    water.scale.set(rx, rz, 1);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 0.05, cz);
    water.receiveShadow = true;
    this.add(water);
    this.water = water;
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

  _box2(w, h, d, color, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0.85));
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.add(m);
    return m;
  }

  // ---------- build ----------

  _build() {
    // ---- piso de pasto con RELIEVE (plano al centro, colinas afuera) ----
    const grassMat = mat(0xffffff, 0.96);
    grassMat.map = grassTexture(30);
    const geo = new THREE.PlaneGeometry(190, 190, 150, 150);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this._terrainH(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    const piso = new THREE.Mesh(geo, grassMat);
    piso.receiveShadow = true;
    this.add(piso);
    new THREE.TextureLoader().load(
      PASTO_URL,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(50, 50);
        t.anisotropy = 8;
        grassMat.map = t;
        grassMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    // ---- sol exterior ----
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

    // ---- entorno lejano envolvente (árboles reales + montañas) ----
    this._entorno();

    // ---- límite invisible (el espacio sigue, pero no avanzás) ----
    this.colliders.push(boxCollider(0, -HD, 2 * HW + 4, 1.5));
    this.colliders.push(boxCollider(0, HD, 2 * HW + 4, 1.5));
    this.colliders.push(boxCollider(-HW, 0, 1.5, 2 * HD + 4));
    this.colliders.push(boxCollider(HW, 0, 1.5, 2 * HD + 4));

    // ---- senderos de piedra ----
    this._sendero(0, 13, -2, 1, 9);
    this._sendero(-2, 1, -8, -5, 6);
    this._sendero(-2, 1, 9, -1, 7);

    // ---- cobertizo (estructura ALTA, más que el personaje) + árbol grande ----
    if (!this._placeGLB('cobertizo', { x: -9, z: -7, height: 3.6, ry: 0.5, collide: true, colliderR: 2.1 })) {
      this._box2(3.6, 3.2, 3.0, 0xc06a4a, -9, -7);
      this.colliders.push({ type: 'circle', x: -9, z: -7, r: 2.1 });
    }
    this._tree(-13.5, -8.5, 5.6, { collide: true, colliderR: 0.7 });

    // ---- canteros / huerta (verduras) en el centro ----
    const huertaSpots = [[0, 0], [3.6, -2], [-3.2, 1.5]];
    huertaSpots.forEach(([x, z], i) => {
      if (!this._placeGLB('huerta', { x, z, footprint: 2.4, ry: (i % 2) * Math.PI / 2, collide: true, colliderR: 1.2 })) {
        this._box2(2.2, 0.4, 1.4, 0x8a5a32, x, z);
        this.colliders.push({ type: 'circle', x, z, r: 1.2 });
        for (let k = 0; k < 5; k++) {
          const v = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat([0xff7a3d, 0x6fbf4a, 0xff5e5b][k % 3]));
          v.position.set(x + (Math.random() - 0.5) * 1.6, 0.5, z + (Math.random() - 0.5) * 1.0);
          this.add(v);
        }
      }
    });

    // ---- fuente de piedra ----
    if (!this._placeGLB('fuente_jardin', { x: 9, z: -1, height: 1.5, collide: true, colliderR: 1.0 }) &&
        !this._placeGLB('fuente', { x: 9, z: -1, height: 1.4, collide: true, colliderR: 1.0 })) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.5, 16), mat(0xbfc6cc, 0.7));
      base.position.set(9, 0.25, -1);
      base.castShadow = true;
      base.receiveShadow = true;
      this.add(base);
      this.colliders.push({ type: 'circle', x: 9, z: -1, r: 1.0 });
    }

    // ---- carretilla / banco / macetas ----
    if (!this._placeGLB('carretilla', { x: -6, z: 8, height: 0.85, ry: 0.6, collide: true, colliderR: 0.9 }))
      this._box2(1.2, 0.5, 0.6, 0x3aa0a0, -6, 8);
    if (!this._placeGLB('banco', { x: 8, z: 9, height: 0.9, ry: Math.PI, collide: true, colliderR: 0.9 }))
      this._box2(1.4, 0.5, 0.5, 0x6b4a2f, 8, 9);
    [[6, 3], [-2, -4.5], [10.5, 4], [1.5, 11]].forEach(([x, z]) => {
      if (!this._placeGLB('macetero', { x, z, height: 0.6, ry: Math.random() * 6.28, collide: true, colliderR: 0.4 }) &&
          !this._placeGLB('cantero', { x, z, footprint: 0.9, collide: true, colliderR: 0.4 })) {
        this._flores(x, z, 5);
      }
    });

    // ---- árboles grandes (reales) en los bordes del jardín ----
    this._tree(13, -9, 5.2, { collide: true, colliderR: 0.7 });
    this._tree(15, 9, 4.8, { collide: true, colliderR: 0.65 });
    this._tree(-15.5, 9.5, 5.0, { collide: true, colliderR: 0.7 });
    [[-16, -2], [16, 1]].forEach(([x, z]) => this._tree(x, z, 4.6, { collide: true, colliderR: 0.5, keys: ['pino', 'arbol'] }));

    // ---- arbustos florecidos ----
    [[12, -4], [-12, 5], [13, 6], [-11, -3], [4, -8], [-5, 12]].forEach(([x, z]) => {
      if (!this._placeGLB('arbusto_red', { x, z, height: 0.9, ry: Math.random() * 6.28, jitter: 0.2 }) &&
          !this._placeGLB('arbusto', { x, z, height: 0.85, ry: Math.random() * 6.28, jitter: 0.2 }))
        this._arbustoPrim(x, z, 0.85);
      this._flores(x + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 1.2, 4);
    });

    // ---- rocas ----
    if (!this._placeGLB('roca_grande', { x: -15, z: -12, height: 1.3, ry: 1, collide: true, colliderR: 1.0 }))
      this._rocaPrim(-15, -12, 1.1);
    [[14, -12, 0.5], [11, 11, 0.45], [-9, 6, 0.4]].forEach(([x, z, h]) => {
      if (!this._placeGLB('roca', { x, z, height: h, ry: Math.random() * 6.28, collide: true, colliderR: h * 0.8 }))
        this._rocaPrim(x, z, h);
    });

    // ---- matas de pasto alto en el jardín (relieve / "lugares") ----
    const pastoSpots = [[-13, 3], [12, -8], [6, 12], [-7, -11], [14, 4], [-15, -5], [9, -11], [-4, 9]];
    pastoSpots.forEach(([x, z]) => this._pastoCluster(x, z, 6, 2.2));

    // ---- flores sueltas ----
    for (let i = 0; i < 10; i++) {
      this._flores((Math.random() - 0.5) * 2 * (HW - 2), (Math.random() - 0.5) * 2 * (HD - 2), 4);
    }

    // ---- estanque chico + vida (perro, mariposas) ----
    this._lago(-13, 11, 2.6, 2.0);

    const dog = this._placeGLB('perro', { x: 4, z: 5, height: 0.55, ry: -0.6 });
    if (dog) this.critters.push({ g: dog, y0: dog.position.y, phase: 0 });

    const colsMar = [0xff8ac2, 0xffc93c, 0x7ad1ff, 0xff6b6b, 0xb388ff];
    [[2, 3], [-4, 7], [9, -2], [-7, 0], [6, 7], [0, -6]].forEach(([x, z], i) =>
      this._mariposa(x, z, colsMar[i % colsMar.length])
    );
  }

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
