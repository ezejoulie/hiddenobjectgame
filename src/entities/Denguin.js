import * as THREE from 'three';

/**
 * Denguin.js — el mosquito villano. Máquina de estados:
 *  - rondar: vuela merodeando la sala.
 *  - ataque: pica en picada hacia el jugador.
 *  - huye: se va a una esquina alta y vuelve a rondar.
 *
 * update() devuelve un evento: 'bite' (te picó), 'repelled' (lo frenó el
 * escudo) o null. La lógica de penalización/bonus la maneja el Game.
 */

const mat = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 });

function buildMosquito() {
  const g = new THREE.Group();

  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), mat(0x5b6770));
  cuerpo.scale.set(1, 1, 1.5);

  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), mat(0x7b8794));
  cabeza.position.set(0, 0.04, 0.22);

  const ojo = (x) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), mat(0xffffff, 0.3));
    b.position.set(x, 0.08, 0.3);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), mat(0x15324b, 0.3));
    p.position.set(x, 0.08, 0.34);
    return [b, p];
  };

  const trompa = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 8), mat(0x15324b));
  trompa.rotation.x = Math.PI / 2 + 0.3;
  trompa.position.set(0, -0.02, 0.38);

  // alas (translúcidas, baten)
  const alaMat = new THREE.MeshStandardMaterial({
    color: 0xdcecfb,
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const wing = (x) => {
    const piv = new THREE.Group();
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), alaMat);
    w.scale.set(1.5, 0.7, 1);
    w.position.x = x * 0.22;
    piv.add(w);
    piv.position.set(0, 0.14, -0.02);
    return piv;
  };
  const wL = wing(-1);
  const wR = wing(1);

  // patas
  const legMat = mat(0x15324b);
  const legs = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    [-1, 1].forEach((s) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), legMat);
      l.position.set(s * 0.1, -0.12, i * 0.1);
      l.rotation.z = s * 0.7;
      legs.add(l);
    });
  }

  g.add(cuerpo, cabeza, ...ojo(-0.06), ...ojo(0.06), trompa, wL, wR, legs);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });

  g.userData.wL = wL;
  g.userData.wR = wR;
  return g;
}

export class Denguin {
  constructor(bounds, model) {
    this.bounds = bounds; // { x: halfX, z: halfZ }
    if (model) {
      this.mesh = this._fromModel(model);
      this.isGLB = true;
    } else {
      this.mesh = buildMosquito();
      this.mesh.scale.setScalar(0.75);
      this.isGLB = false;
    }
    this.pos = new THREE.Vector3(2, 1.8, 2);
    this.mesh.position.copy(this.pos);

    this.mode = 'rondar';
    this.localT = 0; // reloj propio: NO avanza mientras el juego está en pausa
    this.nextAtk = 6; // primera picada ~6 s; luego cada 15 s
    this.invuln = 0;
    this.atkT = 0;
    this.roam = new THREE.Vector3(0, 1.8, 0);
    this.roamT = 0;
    this._tmp = new THREE.Vector3();
  }

  _fromModel(src) {
    const model = src.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxd = Math.max(size.x, size.y, size.z) || 1;
    model.scale.multiplyScalar(0.55 / maxd); // ~0.55 m (más chico)
    const box2 = new THREE.Box3().setFromObject(model);
    const c = new THREE.Vector3();
    box2.getCenter(c);
    model.position.sub(c); // centrar
    const g = new THREE.Group();
    g.add(model);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    // alas procedurales que baten (el GLB venía "duro")
    const alaMat = new THREE.MeshStandardMaterial({
      color: 0xdcecfb, transparent: true, opacity: 0.5, roughness: 0.2, side: THREE.DoubleSide,
    });
    const wing = (x) => {
      const piv = new THREE.Group();
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), alaMat);
      w.scale.set(1.5, 0.7, 1);
      w.position.x = x * 0.2;
      piv.add(w);
      piv.position.set(0, 0.16, -0.05);
      return piv;
    };
    const wL = wing(-1), wR = wing(1);
    g.add(wL, wR);
    g.userData.wL = wL;
    g.userData.wR = wR;
    return g;
  }

  _pickRoam(t, target) {
    // merodea DISPERSO por la escena, LEJOS del jugador (no lo tiene pegado).
    const minDist = Math.min(9, Math.max(this.bounds.x, this.bounds.z) * 0.55);
    let x = 0, z = 0;
    for (let k = 0; k < 8; k++) {
      x = (Math.random() * 2 - 1) * this.bounds.x;
      z = (Math.random() * 2 - 1) * this.bounds.z;
      if (Math.hypot(x - target.x, z - target.z) > minDist) break;
    }
    this.roam.set(x, 1.6 + Math.random() * 0.9, z);
    this.roamT = t + 2 + Math.random() * 2;
  }

  _flee(t) {
    this.mode = 'huye';
    this.invuln = t + 2.5;
    this._fleeTarget = null;
  }

  update(dt, t, target, shieldActive) {
    let event = null;
    // reloj propio: solo avanza cuando de verdad se actualiza (no en pausa),
    // así la cuenta para picar no "corre" mientras se lee el pop-up educativo.
    t = this.localT += dt;
    // distancia HORIZONTAL (ignora la altura: Denguín vuela sobre el jugador)
    const dH = Math.hypot(this.pos.x - target.x, this.pos.z - target.z);

    const ATK_EVERY = 15; // pica cada 15 s

    if (this.mode === 'rondar') {
      if (t > this.roamT) this._pickRoam(t, target);
      this.pos.lerp(this.roam, Math.min(1, dt * 1.1)); // merodeo calmo
      if (t > this.nextAtk && t > this.invuln) {
        this.mode = 'ataque'; // sale a buscar al jugador para picarlo
        this.atkT = t;
      }
    } else if (this.mode === 'ataque') {
      // se lanza en PICADA hacia el jugador (baja a la altura del cuerpo)
      this._tmp.set(target.x, target.y + 0.8, target.z);
      const v = this._tmp.sub(this.pos);
      const d = v.length();
      if (d > 0.001) {
        v.normalize().multiplyScalar(Math.min(d, 7.8 * dt)); // más rápido que el jugador
        this.pos.add(v);
      }
      if (shieldActive && dH < 1.8) {
        this._flee(t);
        this.nextAtk = t + ATK_EVERY;
        event = 'repelled'; // con escudo NO pica, lo frena
      } else if (!shieldActive && dH < 1.0) {
        this._flee(t);
        this.nextAtk = t + ATK_EVERY;
        event = 'bite'; // ¡pica! y se va (te saca cacharros)
      } else if (t - this.atkT > 6) {
        this._flee(t); // se cansó de perseguir
        this.nextAtk = t + ATK_EVERY;
      }
    } else {
      // huye LEJOS (se dispersa por la escena) y vuelve a rondar
      if (!this._fleeTarget) {
        const a = Math.random() * Math.PI * 2;
        const r = 9 + Math.random() * 4;
        this._fleeTarget = new THREE.Vector3(
          Math.max(-this.bounds.x, Math.min(this.bounds.x, target.x + Math.cos(a) * r)),
          2.4,
          Math.max(-this.bounds.z, Math.min(this.bounds.z, target.z + Math.sin(a) * r))
        );
      }
      this.pos.lerp(this._fleeTarget, Math.min(1, dt * 2.2));
      if (this.pos.distanceTo(this._fleeTarget) < 0.8) {
        this.mode = 'rondar';
        this._fleeTarget = null;
        this.roamT = 0;
      }
    }

    // aplicar posición + vibración de mosquito (más vivo) + yaw
    const buzz = (this.mode === 'ataque' ? 0.02 : 0.012);
    this.mesh.position.set(
      this.pos.x + Math.sin(t * 47) * buzz,
      this.pos.y + Math.sin(t * 60) * buzz + Math.sin(t * 3) * 0.04,
      this.pos.z + Math.cos(t * 53) * buzz
    );
    const ang = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    this.mesh.rotation.set(Math.sin(t * 6) * 0.06, ang, Math.sin(t * 7) * 0.05);
    if (this.mesh.userData.wL) {
      const flap = Math.sin(t * (this.mode === 'ataque' ? 60 : 42)) * 1.0;
      this.mesh.userData.wL.rotation.z = 0.5 + flap;
      this.mesh.userData.wR.rotation.z = -0.5 - flap;
    }

    return event;
  }

  reset() {
    this.mode = 'rondar';
    this.localT = 0;
    this.nextAtk = 6;
    this.invuln = 0;
    this.roamT = 0;
    this._fleeTarget = null;
    this.pos.set(2, 1.8, 2);
  }
}
