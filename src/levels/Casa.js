import * as THREE from 'three';
import { Level } from './Level.js';
import { boxCollider } from '../systems/Collision.js';
import { CASA_LIVING } from '../data/levels.config.js';

/**
 * Casa.js — Sprint 1: SOLO el living, compacto y lleno, bien iluminado.
 * Muebles de geometría PBR (placeholders) listos para cambiar por GLB del pack
 * base más adelante. Valida el look del PLAN contra el render objetivo.
 */

const mat = (color, roughness = 0.85, metalness = 0.0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

export class Casa extends Level {
  /** @param {{models?: Record<string, THREE.Object3D>}} opts modelos GLB ya cargados */
  constructor(opts = {}) {
    super();
    this.cfg = CASA_LIVING;
    this.spawn.set(this.cfg.spawn.x, 0, this.cfg.spawn.z);
    this.lights = [];
    this.models = opts.models || {};
    this._build();
  }

  /**
   * Coloca un modelo GLB normalizado: lo escala a un `footprint` (mayor lado en
   * XZ), lo centra, lo apoya en el piso, lo orienta y le arma un collider de su
   * caja. Devuelve el grupo. Esto hace que los GLB del pack sean drop-in sin
   * importar en qué unidades vengan.
   */
  _placeModel(model, { footprint = 1, x = 0, z = 0, ry = 0, baseY = 0, collide = true, colliderPad = 0.06 } = {}) {
    const inner = model;
    const box = new THREE.Box3().setFromObject(inner);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxXZ = Math.max(size.x, size.z) || 1;
    inner.scale.multiplyScalar(footprint / maxXZ);

    const box2 = new THREE.Box3().setFromObject(inner);
    const c = new THREE.Vector3();
    box2.getCenter(c);
    inner.position.x -= c.x;
    inner.position.z -= c.z;
    inner.position.y -= box2.min.y;

    const wrap = new THREE.Group();
    wrap.add(inner);
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

  /** Planta: usa el GLB real del pack si está, si no la primitiva. */
  _addPlant(x, z, footprint = 1.0) {
    if (this.models.plant) {
      return this._placeModel(this.models.plant.clone(true), { footprint, x, z });
    }
    return this._plant(x, z, { h: footprint * 1.4 });
  }

  /** Caja con material PBR; opcionalmente registra collider y/o pared. */
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

  /** Cuadro colgado: marco + obra, apoyado en una pared. `ry` orienta la pared. */
  _frame(x, y, z, ry, w, h, artColor) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), mat(0x3a2a1a, 0.6));
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    frame.receiveShadow = true;
    this.add(frame);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(artColor, 0.75));
    art.rotation.y = ry;
    // empujar la obra apenas por delante del marco (evita z-fighting)
    const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    art.position.set(x, y, z).addScaledVector(n, 0.03);
    this.add(art);
  }

  /** Planta en maceta sobre el piso, con clumps de follaje hasta altura `h`. */
  _plant(x, z, { h = 1.1, potColor = 0xb5651d } = {}) {
    const potH = 0.4;
    this._box(0.4, potH, 0.4, potColor, x, potH / 2, z, { collide: true, rough: 0.8 });
    const f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat(0x3f8e58, 0.9));
    f1.position.set(x, potH + h * 0.45, z);
    f1.castShadow = true;
    this.add(f1);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mat(0x4faa6a, 0.9));
    f2.position.set(x + 0.18, potH + h * 0.75, z - 0.1);
    f2.castShadow = true;
    this.add(f2);
    if (h > 1.05) {
      const f3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), mat(0x57b676, 0.9));
      f3.position.set(x - 0.14, potH + h * 0.95, z + 0.05);
      f3.castShadow = true;
      this.add(f3);
    }
  }

  _build() {
    const { width: W, depth: D, height: H } = this.cfg.room;
    const P = this.cfg.paleta;
    const hx = W / 2;
    const hz = D / 2;
    const t = 0.2; // grosor de pared

    // ---------- Piso (UNA sola capa PBR, sin solapamientos → sin z-fighting) ----------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      mat(P.piso, 0.7, 0.0)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // zócalo bajo perimetral (cálido)
    // ---------- Paredes ----------
    const wallMat = mat(P.pared, 0.95);
    const zocMat = mat(P.paredZocalo, 0.8);
    const mkWall = (w, d, x, z) => {
      this._box(w, H, d, P.pared, x, H / 2, z, { mat: wallMat, wall: true, collide: true });
      // zócalo
      this._box(w + 0.01, 0.18, d + 0.01, P.paredZocalo, x, 0.09, z, { mat: zocMat, cast: false });
    };
    mkWall(W, t, 0, -hz); // fondo (-Z)
    mkWall(t, D, -hx, 0); // izquierda (-X)
    mkWall(t, D, hx, 0); // derecha (+X)
    // frente (+Z) con vano de puerta: dos segmentos
    const doorGap = 1.4;
    const segW = (W - doorGap) / 2;
    mkWall(segW, t, -(doorGap / 2 + segW / 2), hz);
    mkWall(segW, t, doorGap / 2 + segW / 2, hz);
    // dintel sobre la puerta
    this._box(doorGap, 0.5, t, P.pared, 0, H - 0.25, hz, { mat: wallMat });

    // ---------- Ventana en la pared del fondo (luz natural) ----------
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xbfe3f5,
      emissive: 0xbfe3f5,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0,
    });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), winMat);
    win.position.set(-1.2, 1.7, -hz + t / 2 + 0.011);
    win.rotation.y = 0; // mira hacia +Z (al interior)
    this.add(win);
    // marco
    this._box(2.5, 1.6, 0.06, 0xffffff, -1.2, 1.7, -hz + t / 2 + 0.03, { rough: 0.6, cast: false });
    // luz que "entra" por la ventana — caster principal de sombras del living
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(-1.2, 3.4, -hz - 2);
    sun.target.position.set(1.5, 0, 1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 18;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    this.add(sun);
    this.add(sun.target);
    this.lights.push(sun);

    // ---------- Alfombra (capa fina al ras, no solapa el piso) ----------
    const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 2.4), mat(P.alfombra, 0.95));
    rug.position.set(0, 0.016, -1.4);
    rug.receiveShadow = true;
    this.add(rug);

    // ================= MUEBLES =================

    // ---- Sofá contra la pared del fondo, mirando a +Z ----
    const sofaZ = -hz + 0.8;
    if (this.models.sofa) {
      // GLB real del pack (Khronos GlamVelvetSofa). faceFix por si viene rotado.
      this._placeModel(this.models.sofa.clone(true), { footprint: 2.8, x: 0, z: sofaZ, ry: 0 });
    } else {
      const sofaColor = 0x4a7ea8;
      this._box(3.2, 0.5, 1.0, sofaColor, 0, 0.3, sofaZ, { collide: true, pad: 0.05 }); // base
      this._box(3.2, 0.7, 0.25, sofaColor, 0, 0.65, sofaZ - 0.42, {}); // respaldo
      this._box(0.28, 0.6, 1.0, sofaColor, -1.6, 0.6, sofaZ, {}); // apoyabrazos L
      this._box(0.28, 0.6, 1.0, sofaColor, 1.6, 0.6, sofaZ, {}); // apoyabrazos R
      this._box(1.4, 0.18, 0.8, 0x6fa0c8, -0.78, 0.62, sofaZ + 0.05, { rough: 0.9 });
      this._box(1.4, 0.18, 0.8, 0x6fa0c8, 0.78, 0.62, sofaZ + 0.05, { rough: 0.9 });
    }

    // ---- Sillones de acento (GLB reales) flanqueando la mesa ratona ----
    if (this.models.armchair) {
      this._placeModel(this.models.armchair.clone(true), { footprint: 1.1, x: 2.3, z: -0.4, ry: -0.9 });
    }
    if (this.models.chair2) {
      this._placeModel(this.models.chair2.clone(true), { footprint: 1.0, x: -2.3, z: -0.4, ry: 0.9 });
    }

    // ---- Mesa ratona ----
    const mtZ = -1.4;
    this._box(1.3, 0.08, 0.8, 0x6b4226, 0, 0.42, mtZ, { collide: true, rough: 0.4, metal: 0.0 }); // tapa
    [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([dx, dz]) =>
      this._box(0.08, 0.4, 0.08, 0x4a3018, dx, 0.2, mtZ + dz, { cast: false })
    );

    // ---- TV + mueble contra el frente (offset del vano de puerta) ----
    const tvX = -1.4;
    const tvZ = hz - 0.55;
    this._box(1.8, 0.5, 0.45, 0x8a8f96, tvX, 0.25, tvZ, { collide: true, rough: 0.5 }); // mueble
    // lámpara decorativa (GLB real) sobre el mueble de la TV
    if (this.models.lamp) {
      this._placeModel(this.models.lamp.clone(true), { footprint: 0.42, x: tvX + 0.7, z: tvZ, baseY: 0.5, collide: false });
    }
    this._box(1.7, 0.95, 0.06, 0x101316, tvX, 1.15, tvZ - 0.18, { rough: 0.25, metal: 0.2 }); // panel TV
    // brillo de pantalla
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.82),
      new THREE.MeshStandardMaterial({ color: 0x16324a, emissive: 0x1d4e74, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    screen.position.set(tvX, 1.15, tvZ - 0.14);
    screen.rotation.y = Math.PI;
    this.add(screen);

    // ---- Biblioteca contra la pared derecha ----
    const bx = hx - 0.35;
    this._box(0.5, 2.2, 1.8, 0x7a5230, bx, 1.1, -1.0, { collide: true, rough: 0.6 });
    // estantes con "libros" de colores
    const bookColors = [0xc0432f, 0xe0a93a, 0x3f8e58, 0x2f6fa8, 0x9b59b6];
    for (let s = 0; s < 4; s++) {
      const y = 0.4 + s * 0.5;
      for (let b = 0; b < 5; b++) {
        const bk = this._box(0.22, 0.34, 0.16, bookColors[(s + b) % 5], bx - 0.16, y, -1.7 + b * 0.32, { cast: false, rough: 0.8 });
        bk.rotation.y = Math.PI / 2;
      }
    }

    // ---- Lámpara de pie (rincón fondo-izq) con luz cálida ----
    const lampX = -hx + 0.6;
    const lampZ = -hz + 0.6;
    this._box(0.1, 1.5, 0.1, 0x2c2c2c, lampX, 0.75, lampZ, { cast: false });
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.32, 0.34, 18, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xfff0cf, emissive: 0xffd9a0, emissiveIntensity: 0.8, roughness: 0.7, side: THREE.DoubleSide })
    );
    shade.position.set(lampX, 1.55, lampZ);
    this.add(shade);
    // luz cálida de relleno (sin sombras: el caster es el sol de la ventana)
    const lampLight = new THREE.PointLight(0xffd9a0, 6, 7, 2);
    lampLight.position.set(lampX, 1.5, lampZ);
    this.add(lampLight);
    this.lights.push(lampLight);

    // ---- Planta (rincón fondo-der) — GLB real con fallback ----
    this._addPlant(hx - 0.6, -hz + 0.6, 0.95);

    // ---- Cuadro en la pared del fondo ----
    this._box(0.9, 0.6, 0.04, 0x3a2a1a, 1.6, 1.8, -hz + t / 2 + 0.03, { cast: false });
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.48),
      mat(0xe8a13a, 0.7)
    );
    art.position.set(1.6, 1.8, -hz + t / 2 + 0.06);
    this.add(art);

    // ---- Galería de cuadros extra ----
    // pared izquierda (mira a +X)
    this._frame(-hx + t / 2 + 0.03, 1.95, -1.4, Math.PI / 2, 0.5, 0.62, 0x4f86c8);
    this._frame(-hx + t / 2 + 0.03, 1.55, -0.3, Math.PI / 2, 0.42, 0.42, 0xe0703a);
    this._frame(-hx + t / 2 + 0.03, 1.88, 0.95, Math.PI / 2, 0.6, 0.4, 0x57a86a);
    // pared del fondo (otra obra)
    this._frame(3.0, 2.0, -hz + t / 2 + 0.03, 0, 0.5, 0.5, 0x8a5fb0);
    // pared del frente, a la derecha de la puerta
    this._frame(2.7, 1.85, hz - t / 2 - 0.03, Math.PI, 0.56, 0.42, 0xe8b84a);

    // ---- Plantas extra (rincones del frente) ----
    this._addPlant(-hx + 0.7, hz - 0.85, 1.0); // frente-izq
    this._addPlant(hx - 0.75, hz - 0.9, 0.9); // frente-der

    // ---- Florero con flores (GLB real) sobre la mesa ratona ----
    if (this.models.vase) {
      this._placeModel(this.models.vase.clone(true), { footprint: 0.42, x: 0.45, z: mtZ, baseY: 0.46, collide: false });
    } else {
      this._box(0.2, 0.2, 0.2, 0x9b59b6, 0.45, 0.56, mtZ, { rough: 0.7 });
      const miniLeaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), mat(0x4faa6a, 0.9));
      miniLeaf.position.set(0.45, 0.78, mtZ);
      miniLeaf.castShadow = true;
      this.add(miniLeaf);
    }
  }
}
