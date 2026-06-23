import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { CASA_LIVING } from '../data/levels.config.js';
import { woodFloorTexture, artTexture } from '../core/Textures.js';

/**
 * Casa.js — La Casa grande, con PASILLO CENTRAL y 5 ambientes separados, para
 * que el jugador recorra. El living usa GLB reales; el resto, modelos propios
 * (con fallback a primitivas).
 *
 * Planta (x∈[-11,11], z∈[-9,9]):
 *   LIVING (norte, ancho, z[-9,-5])
 *   COCINA(z[-5,0],x<0)  | PASILLO | BAÑO(z[-5,0],x>0)
 *   LAVADERO(z[0,9],x<0) | (x[-2.5,2.5]) | DORMITORIO(z[0,9],x>0)
 *   entrada al sur (z=9)
 */

const mat = (color, roughness = 0.85, metalness = 0.0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const HW = 11; // medio ancho (x)
const HD = 9; // media profundidad (z)
const H = 3; // alto de pared
const T = 0.2; // grosor de pared
const HALL = 2.5; // medio ancho del pasillo
const DG = 2.6; // ancho de puerta

export class Casa extends Level {
  constructor(opts = {}) {
    super();
    this.cfg = CASA_LIVING;
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
    if (opts.wall) this.wallMeshes.push(m);
    return m;
  }

  _floor(cx, cz, w, d, material) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    f.rotation.x = -Math.PI / 2;
    f.position.set(cx, 0.01, cz);
    f.receiveShadow = true;
    this.add(f);
  }

  _wall(cx, cz, w, d) {
    this._box(w, H, d, this.cfg.paleta.pared, cx, H / 2, cz, { wall: true, collide: true });
    this._box(w + 0.01, 0.16, d + 0.01, this.cfg.paleta.paredZocalo, cx, 0.08, cz, { cast: false });
  }

  _placeModel(model, { footprint = 1, x = 0, z = 0, ry = 0, baseY = 0, collide = true, colliderPad = 0.04 } = {}) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxXZ = Math.max(size.x, size.z) || 1;
    model.scale.multiplyScalar(footprint / maxXZ);
    const box2 = new THREE.Box3().setFromObject(model);
    const c = new THREE.Vector3();
    box2.getCenter(c);
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box2.min.y;
    const wrap = new THREE.Group();
    wrap.add(model);
    wrap.position.set(x, baseY, z);
    wrap.rotation.y = ry;
    wrap.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.add(wrap);
    if (collide) {
      const fb = new THREE.Box3().setFromObject(wrap);
      this.colliders.push({
        type: 'box',
        min: { x: fb.min.x - colliderPad, z: fb.min.z - colliderPad },
        max: { x: fb.max.x + colliderPad, z: fb.max.z + colliderPad },
      });
    }
    return wrap;
  }

  _frame(x, y, z, ry, w, h, style) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05), mat(0x5a3a22, 0.5, 0.1));
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    frame.receiveShadow = true;
    this.add(frame);
    const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTexture(style), roughness: 0.65 }));
    art.rotation.y = ry;
    art.position.set(x, y, z).addScaledVector(n, 0.03);
    this.add(art);
  }

  _plant(x, z, h = 1.2) {
    if (this.models.plant) return this._placeModel(this.models.plant.clone(true), { footprint: 1.0, x, z });
    this._box(0.4, 0.4, 0.4, 0xb5651d, x, 0.2, z, { collide: true });
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat(0x3f8e58, 0.9));
    f.position.set(x, 0.4 + h * 0.45, z);
    f.castShadow = true;
    this.add(f);
  }

  /** Mueble real (GLB) si está, con un box de fallback. Los GLB NO colisionan
   *  (evita muros invisibles por bounding boxes grandes); las primitivas sí. */
  _mueble(key, opts, fb) {
    if (this.models[key]) return this._placeModel(this.models[key].clone(true), { collide: false, ...opts });
    if (fb) fb();
    return null;
  }

  /** Panel de color en una pared, para que cada ambiente se distinga. */
  _accent(x, y, z, w, h, ry, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    this.add(m);
  }

  _build() {
    this._buildFloors();
    this._buildWalls();
    this._buildLights();
    this._living();
    this._cocina();
    this._bano();
    this._lavadero();
    this._dormitorio();
  }

  _buildFloors() {
    const wood = new THREE.MeshPhysicalMaterial({
      map: woodFloorTexture(4, 4),
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
    });
    this._floor(0, -7, 2 * HW, 4, wood); // living (norte, ancho)
    this._floor(0, 2, 2 * HALL, 14, mat(0xcbb89a, 0.8)); // pasillo
    this._floor(-6.75, -2.5, 8.5, 5, mat(0xe8d7b8, 0.8)); // cocina
    this._floor(6.75, -2.5, 8.5, 5, mat(0xbfe0e6, 0.7)); // baño
    this._floor(-6.75, 4.5, 8.5, 9, mat(0xd8c9a6, 0.8)); // lavadero
    this._floor(6.75, 4.5, 8.5, 9, mat(0xdcc8da, 0.8)); // dormitorio
  }

  _buildWalls() {
    // perímetro
    this._wall(0, -HD, 2 * HW, T); // norte
    this._wall(-HW, 0, T, 2 * HD); // oeste
    this._wall(HW, 0, T, 2 * HD); // este
    // sur con puerta de entrada
    const sideW = (2 * HW - DG) / 2;
    this._wall(-(DG / 2 + sideW / 2), HD, sideW, T);
    this._wall(DG / 2 + sideW / 2, HD, sideW, T);
    this._box(DG, 0.5, T, this.cfg.paleta.pared, 0, H - 0.25, HD, {}); // dintel
    // puerta de entrada CERRADA
    this._box(DG - 0.1, 2.25, 0.12, 0x7a4a24, 0, 1.12, HD, { collide: true, pad: 0.05, rough: 0.6 });
    this._box(DG - 0.3, 2.0, 0.04, 0x8c5a2c, 0, 1.12, HD - 0.08, { cast: false });
    this._box(0.08, 0.08, 0.06, 0xf4b72e, 0.85, 1.05, HD - 0.1, { cast: false, metal: 0.6, rough: 0.3 });

    // pared living↔pasillo (z=-5) con abertura central (el ancho del pasillo)
    const lw = (2 * HW - 2 * HALL) / 2;
    this._wall(-(HALL + lw / 2), -5, lw, T);
    this._wall(HALL + lw / 2, -5, lw, T);

    // paredes del pasillo (x=±HALL) z[-5,9] con 2 puertas cada una (z=-2.5 y z=4.5)
    [-HALL, HALL].forEach((x) => {
      this._wall(x, -4.4, T, 1.2); // z[-5,-3.8]
      this._wall(x, 1.0, T, 4.4); // z[-1.2,3.2]
      this._wall(x, 7.4, T, 3.2); // z[5.8,9]
    });
    // paredes z=0 que separan norte/sur en los laterales
    this._wall(-6.75, 0, 2 * (HW - HALL), T);
    this._wall(6.75, 0, 2 * (HW - HALL), T);

    // PORTÓN con llave en el pasillo (z=0): bloquea hasta juntar los primeros 5
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(2 * HALL, 2.4, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xb05a2a, roughness: 0.5, metalness: 0.1 })
    );
    gate.position.set(0, 1.2, 0);
    gate.castShadow = true;
    gate.receiveShadow = true;
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.36, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf4b72e, metalness: 0.5, roughness: 0.3 })
    );
    lock.position.set(0, 0.1, 0.13);
    gate.add(lock);
    this.add(gate);
    this.gateMesh = gate;
    this.gateCollider = boxCollider(0, 0, 2 * HALL, 0.4);
    this.colliders.push(this.gateCollider);
  }

  /** Abre el portón (al juntar los primeros 5). */
  openGate() {
    if (this._gateOpen) return;
    this._gateOpen = true;
    this.colliders = this.colliders.filter((c) => c !== this.gateCollider);
    const m = this.gateMesh;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 600);
      m.position.y = 1.2 + k * 2.5;
      if (k < 1) requestAnimationFrame(tick);
      else m.visible = false;
    };
    tick();
  }

  resetGate() {
    this._gateOpen = false;
    if (this.gateMesh) {
      this.gateMesh.visible = true;
      this.gateMesh.position.y = 1.2;
    }
    if (this.gateCollider && !this.colliders.includes(this.gateCollider)) this.colliders.push(this.gateCollider);
  }

  _buildLights() {
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
    sun.position.set(3, 6, 12);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    this.add(sun);
    this.add(sun.target);
    this.lights.push(sun);

    const lamps = [
      [-5, -7], [5, -7], // living
      [0, -2], [0, 5], // pasillo
      [-6.75, -2.5], [6.75, -2.5], // cocina, baño
      [-6.75, 4.5], [6.75, 4.5], // lavadero, dormitorio
    ];
    lamps.forEach(([x, z]) => {
      const p = new THREE.PointLight(0xfff0d0, 9, 9, 2);
      p.position.set(x, 2.7, z);
      this.add(p);
      this.lights.push(p);
    });
  }

  // ===================== AMBIENTES =====================

  _living() {
    this._accent(0, 2.35, -HD + T / 2 + 0.03, 7, 0.7, 0, 0xe8633a); // coral
    // TV contra la pared norte (z=-9)
    this._mueble('tele', { footprint: 1.9, x: 0, z: -HD + 0.5, ry: 0 }, () => {
      this._box(1.9, 0.5, 0.45, 0x8a8f96, 0, 0.25, -HD + 0.45, { collide: true });
      this._box(1.8, 1.0, 0.06, 0x101316, 0, 1.2, -HD + 0.3, { rough: 0.25, metal: 0.2 });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.85), new THREE.MeshStandardMaterial({ color: 0x16324a, emissive: 0x1d4e74, emissiveIntensity: 0.5, roughness: 0.3 }));
      screen.position.set(0, 1.2, -HD + 0.34);
      this.add(screen);
    });
    // sofá mirando la TV
    this._mueble('sofa', { footprint: 2.8, x: 0, z: -6.4, ry: Math.PI }, () =>
      this._box(2.8, 0.7, 1.0, 0x4a7ea8, 0, 0.4, -6.4, { collide: true })
    );
    // alfombra + mesa ratona
    const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 2.0), mat(0xcf5b54, 0.95));
    rug.position.set(0, 0.05, -7.2);
    rug.receiveShadow = true;
    this.add(rug);
    this._mueble('mesa_ratona', { footprint: 1.3, x: 0, z: -7.3, ry: 0 }, () =>
      this._box(1.3, 0.08, 0.7, 0x6b4226, 0, 0.42, -7.3, { collide: true, rough: 0.4 })
    );
    // sillones
    this._mueble('armchair', { footprint: 1.1, x: -3.2, z: -6.8, ry: 0.6 });
    this._mueble('chair2', { footprint: 1.0, x: 3.2, z: -6.8, ry: -0.6 });
    // biblioteca rincón
    this._box(0.5, 2.1, 1.6, 0x7a5230, -HW + 0.45, 1.05, -7.5, { collide: true, rough: 0.6 });
    const bookColors = [0xc0432f, 0xe0a93a, 0x3f8e58, 0x2f6fa8, 0x9b59b6];
    for (let s = 0; s < 3; s++) {
      for (let b = 0; b < 4; b++) {
        const bk = this._box(0.22, 0.32, 0.16, bookColors[(s + b) % 5], -HW + 0.6, 0.5 + s * 0.55, -8.2 + b * 0.34, { cast: false });
        bk.rotation.y = Math.PI / 2;
      }
    }
    // plantas + cuadros
    this._plant(HW - 0.8, -8.2, 1.4);
    this._plant(-HW + 0.9, -5.6, 1.2);
    this._frame(3.2, 2.0, -HD + T / 2 + 0.03, 0, 0.8, 0.55, 0);
    this._frame(-3.2, 2.0, -HD + T / 2 + 0.03, 0, 0.6, 0.5, 3);
  }

  _cocina() {
    this._accent(-HW + T / 2 + 0.03, 2.3, -2.5, 4.5, 0.7, Math.PI / 2, 0xf2c94c); // amarillo
    // mesada contra la pared oeste (x=-11)
    this._mueble('mesada', { footprint: 4, x: -HW + 0.5, z: -2.5, ry: Math.PI / 2 }, () => {
      this._box(0.6, 0.9, 4, 0xbfa98a, -HW + 0.45, 0.45, -2.5, { collide: true });
      this._box(0.4, 0.05, 0.5, 0x9aa7b2, -HW + 0.45, 0.92, -2.5, { cast: false, metal: 0.4, rough: 0.3 });
    });
    // heladera rincón noroeste
    this._mueble('heladera', { footprint: 0.95, x: -HW + 0.7, z: -HD + 5.3, ry: 0 }, () =>
      this._box(0.95, 2.0, 0.85, 0xededed, -HW + 0.7, 1.0, -4.3, { collide: true, rough: 0.4 })
    );
    // alacena
    this._mueble('alacena', { footprint: 1.0, x: -6, z: -HD + 4.2, ry: 0 });
    // mesa + sillas
    this._box(1.5, 0.08, 0.95, 0xd2885a, -6, 0.78, -2.3, { collide: true });
    [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].forEach(([dx, dz]) =>
      this._box(0.08, 0.78, 0.08, 0x9a6b45, -6 + dx, 0.39, -2.3 + dz, { cast: false })
    );
  }

  _bano() {
    this._accent(HW - T / 2 - 0.03, 2.3, -2.5, 4.5, 0.7, Math.PI / 2, 0x5bc4f0); // celeste
    // bañadera contra la pared este (x=11)
    this._mueble('banadera', { footprint: 2.6, x: HW - 0.9, z: -2.5, ry: Math.PI / 2 }, () => {
      this._box(1.3, 0.55, 2.8, 0xf2f2f2, HW - 0.75, 0.28, -2.5, { collide: true, rough: 0.3 });
      this._box(1.0, 0.06, 2.5, 0xbfe0e6, HW - 0.75, 0.5, -2.5, { cast: false });
    });
    // inodoro + bacha
    this._box(0.55, 0.45, 0.7, 0xffffff, 3.4, 0.22, -4, { collide: true, rough: 0.4 });
    this._box(0.55, 0.6, 0.25, 0xffffff, 3.4, 0.55, -4.3, { cast: false });
    this._box(0.7, 0.85, 0.5, 0xe8e8e8, 4.0, 0.42, -HD + 0.5, { collide: true });
    const esp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, roughness: 0.05, metalness: 0.9 }));
    esp.position.set(4.0, 1.7, -HD + T + 0.03);
    this.add(esp);
  }

  _lavadero() {
    this._accent(-HW + T / 2 + 0.03, 2.3, 4.5, 4.5, 0.7, Math.PI / 2, 0x6fd99a); // verde menta
    this._mueble('lavarropas', { footprint: 0.9, x: -HW + 0.75, z: HD - 0.9, ry: 0 }, () => {
      this._box(0.9, 1.2, 0.9, 0xe8e8e8, -HW + 0.75, 0.6, HD - 0.9, { collide: true, rough: 0.4 });
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.28, 18), new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.2, metalness: 0.5 }));
      door.position.set(-HW + 0.75, 0.65, HD - 1.36);
      this.add(door);
    });
    this._mueble('pileta', { footprint: 0.9, x: -HW + 0.7, z: 5.5, ry: Math.PI / 2 }, () => {
      this._box(0.6, 0.9, 0.9, 0xd9d2c4, -HW + 0.5, 0.45, 5.5, { collide: true });
      this._box(0.5, 0.06, 0.6, 0x9aa7b2, -HW + 0.5, 0.92, 5.5, { cast: false });
    });
    // estante
    this._box(0.4, 0.06, 2.0, 0xcfc0a6, -HW + 0.3, 1.7, 3.0, { cast: false });
  }

  _dormitorio() {
    this._accent(HW - T / 2 - 0.03, 2.3, 4.5, 4.5, 0.7, Math.PI / 2, 0xb98fd9); // lila
    // cama
    this._mueble('cama', { footprint: 2.8, x: HW - 1.8, z: 6.2, ry: -Math.PI / 2 }, () => {
      this._box(2.6, 0.45, 3.4, 0xb7d0e8, HW - 1.8, 0.32, 6.2, { collide: true, rough: 0.85 });
      this._box(2.6, 0.12, 3.0, 0xeaf2fb, HW - 1.8, 0.56, 6.3, { cast: false });
      this._box(0.9, 0.25, 0.5, 0xffffff, HW - 1.8, 0.62, 7.6, { cast: false });
    });
    // mesa de luz
    this._mueble('mesa_luz', { footprint: 0.5, x: 3.6, z: 8.0, ry: 0 }, () =>
      this._box(0.5, 0.5, 0.5, 0xc8a87c, 3.6, 0.25, 8.0, { collide: true })
    );
    // ropero contra la pared este
    this._mueble('ropero', { footprint: 1.4, x: HW - 0.7, z: 1.6, ry: -Math.PI / 2 }, () =>
      this._box(0.8, 2.3, 1.4, 0xa88c68, HW - 0.55, 1.15, 1.6, { collide: true, rough: 0.6 })
    );
    // alfombra
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.6), mat(0x9b6fb0, 0.95));
    rug.position.set(5.5, 0.05, 3.5);
    rug.receiveShadow = true;
    this.add(rug);
    this._frame(6.75, 2.0, HD - T / 2 - 0.03, Math.PI, 0.6, 0.45, 2);
  }
}
