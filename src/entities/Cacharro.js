import * as THREE from 'three';
import { CACHARRO_TIPOS } from '../data/cacharros.js';

/**
 * Cacharro.js — un criadero recogible. Recipiente PBR con un disco de "agua"
 * adentro, un aro indicador que aparece cuando el jugador está cerca, y un
 * leve flote. Al juntarlo, se anima hacia arriba y desaparece.
 */

const aguaMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x35bdf2, roughness: 0.15, metalness: 0, emissive: 0x0a3550, emissiveIntensity: 0.3 });
const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function discoAgua(radio, y) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(radio, 28), aguaMat());
  d.rotation.x = -Math.PI / 2;
  d.position.y = y;
  return d;
}

// ---- modelado torneado (LatheGeometry): siluetas suaves, sin "polígonos" ----
const lathe = (pts, material, seg = 32) => {
  const m = new THREE.Mesh(
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg),
    material
  );
  return m;
};
const plastico = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0, side: THREE.DoubleSide });
const metal = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.28, metalness: 0.85, side: THREE.DoubleSide });
const vidrio = (c) => new THREE.MeshStandardMaterial({
  color: c, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
});
const ceramica = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.22, metalness: 0, side: THREE.DoubleSide });
const terracota = () => new THREE.MeshStandardMaterial({ color: 0xc8643c, roughness: 0.92, side: THREE.DoubleSide });
const aro = (r, tubo, y, material) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, tubo, 8, 40), material);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  return t;
};
const hoja = (x, y, z, ry, s = 1) => {
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 10, 8), mat(0x4caf50, 0.6));
  h.scale.set(0.45, 0.12, 1);
  h.position.set(x, y, z);
  h.rotation.set(0.5, ry, 0);
  return h;
};

/** Devuelve un grupo con el recipiente según el tipo (origen en el piso). */
function construir(tipo, color) {
  const g = new THREE.Group();

  switch (tipo) {
    case 'balde': {
      g.add(lathe([[0, 0], [0.16, 0], [0.17, 0.015], [0.215, 0.32], [0.232, 0.335], [0.232, 0.345], [0.214, 0.345]], plastico(color)));
      g.add(aro(0.226, 0.012, 0.34, plastico(color)));
      g.add(discoAgua(0.205, 0.28));
      const manija = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.01, 8, 32, Math.PI), metal(0xb8c2cc));
      manija.position.y = 0.33;
      manija.rotation.y = 0.35;
      g.add(manija);
      break;
    }
    case 'tacho': {
      g.add(lathe([[0, 0], [0.18, 0], [0.19, 0.02], [0.225, 0.47], [0.24, 0.48], [0.24, 0.495], [0.222, 0.495]], plastico(color)));
      [0.12, 0.24, 0.36].forEach((y) => g.add(aro(0.19 + y * 0.08, 0.008, y, plastico(0x5a6672))));
      g.add(discoAgua(0.215, 0.43));
      // tapa caída al costado (por eso junta agua)
      const tapa = lathe([[0, 0.03], [0.24, 0.03], [0.25, 0], [0.24, 0], [0, 0.015]], plastico(0x5a6672));
      tapa.position.set(0.33, 0.13, 0);
      tapa.rotation.z = 1.35;
      g.add(tapa);
      break;
    }
    case 'regadera': {
      g.add(lathe([[0, 0], [0.13, 0], [0.145, 0.015], [0.15, 0.22], [0.13, 0.255], [0.07, 0.28], [0.06, 0.29]], plastico(color)));
      g.add(discoAgua(0.06, 0.285));
      const pico = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.026, 0.34, 12), plastico(color));
      pico.position.set(-0.22, 0.24, 0);
      pico.rotation.z = 0.95;
      g.add(pico);
      const flor = lathe([[0, 0], [0.045, 0.01], [0.05, 0.03], [0.02, 0.05]], plastico(color));
      flor.position.set(-0.36, 0.34, 0);
      flor.rotation.z = 0.95 + Math.PI;
      g.add(flor);
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 24, Math.PI), plastico(color));
      asa.position.set(0.04, 0.27, 0);
      g.add(asa);
      break;
    }
    case 'botella': {
      // botella de PET tirada en el piso, con agua adentro
      const b = new THREE.Group();
      b.add(lathe([[0, 0], [0.06, 0], [0.066, 0.012], [0.066, 0.16], [0.052, 0.2], [0.022, 0.235], [0.022, 0.27], [0, 0.27]], vidrio(color)));
      const agua = lathe([[0, 0.004], [0.058, 0.004], [0.06, 0.012], [0.06, 0.12], [0, 0.12]], aguaMat());
      b.add(agua);
      const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), plastico(0x2f86c8));
      tapa.position.y = 0.285;
      b.add(tapa);
      const etiqueta = new THREE.Mesh(new THREE.CylinderGeometry(0.0675, 0.0675, 0.06, 28, 1, true), plastico(0xff8a3d));
      etiqueta.position.y = 0.09;
      b.add(etiqueta);
      b.rotation.z = Math.PI / 2;
      b.position.set(0.13, 0.067, 0);
      g.add(b);
      break;
    }
    case 'lata': {
      g.add(lathe([[0, 0], [0.058, 0], [0.066, 0.012], [0.066, 0.15], [0.058, 0.165], [0.056, 0.17]], metal(0xd8dde2)));
      const banda = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.067, 0.1, 32, 1, true), metal(color === 0xc8cdd2 ? 0xe0533f : color));
      banda.position.y = 0.08;
      g.add(banda);
      g.add(aro(0.058, 0.004, 0.169, metal(0xd8dde2)));
      g.add(discoAgua(0.054, 0.155));
      break;
    }
    case 'vaso': {
      g.add(lathe([[0, 0], [0.048, 0], [0.05, 0.008], [0.066, 0.18], [0.069, 0.182], [0.064, 0.182]], vidrio(0xe8f6ff)));
      g.add(lathe([[0, 0.006], [0.047, 0.006], [0.06, 0.12], [0, 0.12]], aguaMat()));
      break;
    }
    case 'florero': {
      g.add(lathe([[0, 0], [0.07, 0], [0.085, 0.02], [0.11, 0.1], [0.105, 0.17], [0.065, 0.26], [0.055, 0.3], [0.072, 0.34], [0.076, 0.35], [0.066, 0.35]], ceramica(color)));
      g.add(discoAgua(0.058, 0.32));
      const colores = [0xff5e5b, 0xffc93c, 0xff8ac2];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), mat(0x3e9a38));
        tallo.position.set(Math.cos(a) * 0.025, 0.42, Math.sin(a) * 0.025);
        tallo.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
        g.add(tallo);
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(colores[i], 0.5));
        f.position.set(Math.cos(a) * 0.055, 0.53, Math.sin(a) * 0.055);
        g.add(f);
      }
      break;
    }
    case 'bebedero': {
      // plato de mascota: pared gruesa torneada (sube y vuelve hacia adentro)
      g.add(lathe([[0, 0], [0.17, 0], [0.245, 0.085], [0.25, 0.1], [0.232, 0.1], [0.165, 0.03], [0, 0.03]], plastico(color)));
      g.add(discoAgua(0.205, 0.075));
      // hueso decorativo
      const hueso = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 8), plastico(0xffffff));
      hueso.rotation.set(0, 0.4, Math.PI / 2);
      hueso.position.set(0, 0.095, 0.236);
      g.add(hueso);
      break;
    }
    case 'maceta': {
      // platito con agua (¡el criadero!) + maceta de barro + planta
      g.add(lathe([[0, 0], [0.24, 0], [0.275, 0.04], [0.265, 0.045], [0.23, 0.012], [0, 0.012]], terracota()));
      g.add(discoAgua(0.25, 0.03));
      g.add(lathe([[0, 0.02], [0.13, 0.02], [0.175, 0.26], [0.195, 0.27], [0.195, 0.3], [0.178, 0.3]], terracota()));
      const tierra = new THREE.Mesh(new THREE.CircleGeometry(0.172, 24), mat(0x4a3424, 0.95));
      tierra.rotation.x = -Math.PI / 2;
      tierra.position.y = 0.27;
      g.add(tierra);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(hoja(Math.cos(a) * 0.07, 0.34 + (i % 2) * 0.04, Math.sin(a) * 0.07, -a, 1.4));
      }
      break;
    }
    case 'frasco': {
      // bidón de plástico con la tapa abierta
      const caja = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.13, 2, 2, 2), plastico(color === 0xbfe3f5 ? 0x2f86c8 : color));
      caja.position.y = 0.16;
      g.add(caja);
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 20, Math.PI), plastico(0x2f86c8));
      asa.position.set(-0.04, 0.32, 0);
      g.add(asa);
      g.add(lathe([[0.032, 0.32], [0.032, 0.365], [0.026, 0.365]], plastico(0xffc93c)));
      g.add(discoAgua(0.026, 0.355));
      break;
    }
    default: {
      g.add(lathe([[0, 0], [0.13, 0], [0.15, 0.28], [0.14, 0.28]], plastico(color)));
      g.add(discoAgua(0.13, 0.25));
    }
  }

  // los objetos chicos se agrandan para que se encuentren en el escenario
  // (en un contenedor interno: la animación de juntar escala el cuerpo exterior)
  const ESCALA = { botella: 1.7, lata: 2.0, vaso: 1.9, florero: 1.15, frasco: 1.2 };
  g.scale.setScalar(ESCALA[tipo] || 1);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

export class Cacharro {
  constructor(tipo, x, z, model) {
    this.tipo = tipo;
    this.info = CACHARRO_TIPOS[tipo] || { nombre: tipo, tip: '', color: 0x27aae1 };
    this.collected = false;
    this.collecting = 0; // animación de recogida (0..1)
    this.position = new THREE.Vector3(x, 0, z);
    this.phase = Math.random() * 6.28;

    this.group = new THREE.Group();
    this.body = model ? this._normalizeModel(model) : construir(tipo, this.info.color);
    this.group.add(this.body);

    // aro indicador en el piso
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 28), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    this.group.add(this.ring);

    // destello-faro: rombo dorado girando sobre el cacharro (se ve de lejos)
    const glow = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07),
      new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9, depthWrite: false })
    );
    glow.position.y = 0.95;
    this.glow = glow;
    this.group.add(glow);

    this.group.position.set(x, 0, z);
  }

  /** Normaliza un GLB de cacharro: ~0.5 m de alto, centrado y apoyado al piso. */
  _normalizeModel(src) {
    const model = src.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y > 0.01 ? size.y : 0.5;
    model.scale.multiplyScalar(0.5 / h);
    const box2 = new THREE.Box3().setFromObject(model);
    const c = new THREE.Vector3();
    box2.getCenter(c);
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box2.min.y;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const g = new THREE.Group();
    g.add(model);
    return g;
  }

  update(dt, t, playerPos) {
    if (this.collected) return;

    if (this.glow) {
      this.glow.visible = this.collecting === 0;
      this.glow.rotation.y += dt * 2.2;
      this.glow.position.y = 0.95 + Math.sin(t * 2 + this.phase) * 0.08;
      this.glow.material.opacity = 0.5 + Math.sin(t * 3 + this.phase) * 0.35;
    }

    if (this.collecting > 0) {
      this.collecting = Math.min(1, this.collecting + dt * 2.2);
      const k = this.collecting;
      this.body.position.y = k * 1.4;
      this.body.rotation.y += dt * 10;
      const s = Math.max(0.001, 1 - k);
      this.body.scale.setScalar(s);
      this.ring.visible = false;
      if (this.collecting >= 1) {
        this.collected = true;
        this.group.visible = false;
      }
      return;
    }

    // flote suave
    this.body.position.y = Math.sin(t * 1.6 + this.phase) * 0.04 + 0.04;
    this.body.rotation.y = Math.sin(t * 0.5 + this.phase) * 0.2;

    // aro de cercanía
    const d = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);
    const near = d < 3;
    this.ring.visible = near;
    if (near) {
      const p = 1 + Math.sin(t * 5) * 0.12;
      this.ring.scale.set(p, p, 1);
      this.ring.material.opacity = 0.4 + Math.sin(t * 5) * 0.3;
    }
  }

  startCollect() {
    if (this.collected || this.collecting > 0) return false;
    this.collecting = 0.001;
    return true;
  }
}
