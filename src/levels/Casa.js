import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { CASA_LIVING } from '../data/levels.config.js';
import { woodFloorTexture, artTexture } from '../core/Textures.js';

/**
 * Casa.js — La Casa completa: 5 ambientes (living, cocina, baño, lavadero,
 * dormitorio) con paredes y puertas, amueblados, bajo el pipeline visual.
 * El living usa GLB reales; el resto, primitivas PBR (placeholders).
 *
 * Planta:  x ∈ [-8, 8], z ∈ [-6, 6]
 *   COCINA(-)   |  LIVING  |  BAÑO(-)
 *   LAVADERO(+) |  (centro)|  DORMITORIO(+)
 */

const mat = (color, roughness = 0.85, metalness = 0.0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const HW = 8; // medio ancho (x)
const HD = 6; // media profundidad (z)
const H = 3; // alto de pared
const T = 0.2; // grosor de pared
const XI = 3; // pared interna vertical en x = ±XI

export class Casa extends Level {
  constructor(opts = {}) {
    super();
    this.cfg = CASA_LIVING;
    this.spawn.set(this.cfg.spawn.x, 0, this.cfg.spawn.z);
    this.lights = [];
    this.models = opts.models || {};
    this._build();
  }

  // ---- helpers ----
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

  /** pared con grosor + zócalo; registra collider y mesh para anti-clipping. */
  _wall(cx, cz, w, d) {
    this._box(w, H, d, this.cfg.paleta.pared, cx, H / 2, cz, { wall: true, collide: true });
    this._box(w + 0.01, 0.16, d + 0.01, this.cfg.paleta.paredZocalo, cx, 0.08, cz, { cast: false });
  }

  _placeModel(model, { footprint = 1, x = 0, z = 0, ry = 0, baseY = 0, collide = true, colliderPad = 0.06 } = {}) {
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

  _plant(x, z, h = 1.1) {
    if (this.models.plant) return this._placeModel(this.models.plant.clone(true), { footprint: 1.0, x, z });
    this._box(0.4, 0.4, 0.4, 0xb5651d, x, 0.2, z, { collide: true });
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat(0x3f8e58, 0.9));
    f.position.set(x, 0.4 + h * 0.45, z);
    f.castShadow = true;
    this.add(f);
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
      map: woodFloorTexture(3, 4),
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
    });
    this._floor(0, 0, 2 * XI + 0.4, 2 * HD, wood); // living (centro)
    this._floor(-5.5, -3, 5.2, 6.2, mat(0xe8d7b8, 0.8)); // cocina
    this._floor(5.5, -3, 5.2, 6.2, mat(0xbfe0e6, 0.7)); // baño
    this._floor(-5.5, 3, 5.2, 6.2, mat(0xd8c9a6, 0.8)); // lavadero
    this._floor(5.5, 3, 5.2, 6.2, mat(0xdcc8da, 0.8)); // dormitorio
  }

  _buildWalls() {
    // perímetro
    this._wall(0, -HD, 2 * HW, T); // norte
    this._wall(-HW, 0, T, 2 * HD); // oeste
    this._wall(HW, 0, T, 2 * HD); // este
    // sur con puerta de entrada (gap x∈[-1,1])
    this._wall(-4.5, HD, 7, T);
    this._wall(4.5, HD, 7, T);
    this._box(2, 0.5, T, this.cfg.paleta.pared, 0, H - 0.25, HD, {}); // dintel

    // paredes internas verticales (x=±3) con 2 puertas cada una (z≈-3 y z≈3)
    [-XI, XI].forEach((x) => {
      this._wall(x, -5, T, 2); // z[-6,-4]
      this._wall(x, 0, T, 4); // z[-2,2]
      this._wall(x, 5, T, 2); // z[4,6]
    });
    // paredes internas horizontales (z=0) que separan arriba/abajo en los laterales
    this._wall(-5.5, 0, 2 * (HW - XI), T);
    this._wall(5.5, 0, 2 * (HW - XI), T);
  }

  _buildLights() {
    // sol por la entrada (único caster de sombras)
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
    sun.position.set(2, 5, 10);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    this.add(sun);
    this.add(sun.target);
    this.lights.push(sun);

    // luz cálida de techo por ambiente (relleno, sin sombras)
    const cuartos = [
      [0, -3], [0, 3], [-5.5, -3], [5.5, -3], [-5.5, 3], [5.5, 3],
    ];
    cuartos.forEach(([x, z]) => {
      const p = new THREE.PointLight(0xfff0d0, 9, 8, 2);
      p.position.set(x, 2.7, z);
      this.add(p);
      this.lights.push(p);
    });
  }

  // ===================== AMBIENTES =====================

  _living() {
    // TV contra la pared norte (z=-6), sofá mirándola
    this._box(1.8, 0.5, 0.45, 0x8a8f96, 0, 0.25, -HD + 0.45, { collide: true });
    this._box(1.7, 0.95, 0.06, 0x101316, 0, 1.15, -HD + 0.3, { rough: 0.25, metal: 0.2 });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.82),
      new THREE.MeshStandardMaterial({ color: 0x16324a, emissive: 0x1d4e74, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    screen.position.set(0, 1.15, -HD + 0.34);
    this.add(screen);

    if (this.models.sofa) this._placeModel(this.models.sofa.clone(true), { footprint: 2.6, x: 0, z: -3.7, ry: Math.PI });
    else this._box(2.6, 0.7, 1.0, 0x4a7ea8, 0, 0.4, -3.7, { collide: true });

    // mesa ratona + alfombra
    const rug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 2.0), mat(0xcf5b54, 0.95));
    rug.position.set(0, 0.02, -4.6);
    rug.receiveShadow = true;
    this.add(rug);
    this._box(1.2, 0.08, 0.7, 0x6b4226, 0, 0.42, -4.7, { collide: true, rough: 0.4 });

    if (this.models.armchair) this._placeModel(this.models.armchair.clone(true), { footprint: 1.0, x: -2.1, z: -4.6, ry: 0.7 });
    if (this.models.chair2) this._placeModel(this.models.chair2.clone(true), { footprint: 1.0, x: 2.1, z: -4.6, ry: -0.7 });

    // biblioteca en rincón norte
    this._box(0.5, 2.1, 1.4, 0x7a5230, -2.6, 1.05, -5.3, { collide: true, rough: 0.6 });
    const bookColors = [0xc0432f, 0xe0a93a, 0x3f8e58, 0x2f6fa8, 0x9b59b6];
    for (let s = 0; s < 3; s++) {
      for (let b = 0; b < 4; b++) {
        const bk = this._box(0.2, 0.32, 0.15, bookColors[(s + b) % 5], -2.42, 0.5 + s * 0.55, -5.85 + b * 0.32, { cast: false });
        bk.rotation.y = Math.PI / 2;
      }
    }

    // cuadros pared norte + plantas junto a la entrada
    this._frame(1.6, 1.9, -HD + T / 2 + 0.03, 0, 0.7, 0.5, 0);
    this._frame(-1.2, 2.0, -HD + T / 2 + 0.03, 0, 0.5, 0.5, 3);
    this._plant(-2.5, 5.2, 1.4);
    this._plant(2.5, 5.2, 1.2);
  }

  _cocina() {
    // mesada en L contra norte y oeste
    this._box(4, 0.9, 0.6, 0xbfa98a, -5.3, 0.45, -HD + 0.5, { collide: true });
    this._box(0.6, 0.9, 3.2, 0xbfa98a, -HW + 0.45, 0.45, -3.4, { collide: true });
    // bacha
    this._box(0.5, 0.05, 0.4, 0x9aa7b2, -4.4, 0.92, -HD + 0.5, { cast: false, metal: 0.4, rough: 0.3 });
    // alacenas
    this._box(4, 0.7, 0.4, 0xcfc0a6, -5.3, 2.2, -HD + 0.35, {});
    // heladera
    this._box(0.95, 2.0, 0.85, 0xededed, -3.7, 1.0, -HD + 0.6, { collide: true, rough: 0.4 });
    this._box(0.06, 0.5, 0.04, 0xb0b6bc, -3.3, 1.2, -HD + 1.05, { cast: false, metal: 0.6, rough: 0.3 });
    // mesa + sillas
    this._box(1.4, 0.08, 0.9, 0xd2885a, -5.5, 0.78, -1.8, { collide: true });
    [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(([dx, dz]) =>
      this._box(0.08, 0.78, 0.08, 0x9a6b45, -5.5 + dx, 0.39, -1.8 + dz, { cast: false })
    );
    [[-1.3, -1.8], [-5.5, -0.6]].forEach(([x, z]) => this._box(0.4, 0.45, 0.4, 0xd2885a, x, 0.22, z, {}));
  }

  _bano() {
    // bañadera contra norte
    this._box(2.8, 0.55, 1.3, 0xf2f2f2, 5.5, 0.28, -HD + 0.75, { collide: true, rough: 0.3 });
    this._box(2.5, 0.06, 1.0, 0xbfe0e6, 5.5, 0.5, -HD + 0.75, { cast: false }); // agua
    // inodoro
    this._box(0.55, 0.45, 0.7, 0xffffff, HW - 0.6, 0.22, -2.6, { collide: true, rough: 0.4 });
    this._box(0.55, 0.6, 0.25, 0xffffff, HW - 0.6, 0.55, -2.95, { cast: false });
    // bacha + espejo
    this._box(0.7, 0.85, 0.5, 0xe8e8e8, 3.7, 0.42, -HD + 0.5, { collide: true });
    const esp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, roughness: 0.05, metalness: 0.9 }));
    esp.position.set(3.7, 1.7, -HD + T + 0.03);
    this.add(esp);
  }

  _lavadero() {
    // lavarropas
    this._box(0.9, 1.2, 0.9, 0xe8e8e8, -HW + 0.7, 0.6, HD - 0.7, { collide: true, rough: 0.4 });
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.28, 18), new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.2, metalness: 0.5 }));
    door.position.set(-HW + 0.7, 0.65, HD - 1.16);
    this.add(door);
    // pileta
    this._box(0.9, 0.9, 0.6, 0xd9d2c4, -5.3, 0.45, HD - 0.5, { collide: true });
    this._box(0.6, 0.06, 0.4, 0x9aa7b2, -5.3, 0.92, HD - 0.5, { cast: false });
    // estante con productos
    this._box(2.0, 0.06, 0.4, 0xcfc0a6, -4.2, 1.7, HD - 0.3, { cast: false });
    [[-4.8, 1.92], [-4.2, 1.92], [-3.6, 1.92]].forEach(([x, y]) =>
      this._box(0.18, 0.32, 0.18, [0x46b23a, 0x2f86c8, 0xe0a93a][(x * 10) % 3 | 0] || 0x46b23a, x, y, HD - 0.3, { cast: false })
    );
  }

  _dormitorio() {
    // cama
    this._box(2.6, 0.45, 3.4, 0xb7d0e8, 5.5, 0.32, 4.2, { collide: true, rough: 0.85 });
    this._box(2.6, 0.12, 3.0, 0xeaf2fb, 5.5, 0.56, 4.3, { cast: false }); // acolchado
    this._box(2.6, 0.7, 0.2, 0x9a6b45, 5.5, 0.5, HD - 0.2, {}); // respaldo
    this._box(0.9, 0.25, 0.5, 0xffffff, 5.5, 0.62, 2.9, { cast: false }); // almohada
    // mesa de luz
    this._box(0.5, 0.5, 0.5, 0xc8a87c, 3.8, 0.25, HD - 0.5, { collide: true });
    // ropero
    this._box(0.8, 2.3, 1.4, 0xa88c68, HW - 0.55, 1.15, 1.4, { collide: true, rough: 0.6 });
    // alfombra
    const rug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.03, 1.4), mat(0x9b6fb0, 0.95));
    rug.position.set(4.4, 0.02, 2.6);
    rug.receiveShadow = true;
    this.add(rug);
    // cuadro
    this._frame(5.5, 1.9, HD - T / 2 - 0.03, Math.PI, 0.6, 0.45, 2);
  }
}
