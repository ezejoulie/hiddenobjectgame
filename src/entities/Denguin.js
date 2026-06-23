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
  constructor(bounds) {
    this.bounds = bounds; // { x: halfX, z: halfZ }
    this.mesh = buildMosquito();
    this.mesh.scale.setScalar(1.1);
    this.pos = new THREE.Vector3(2, 1.8, 2);
    this.mesh.position.copy(this.pos);

    this.mode = 'rondar';
    this.nextAtk = 8;
    this.invuln = 0;
    this.atkT = 0;
    this.roam = new THREE.Vector3(0, 1.8, 0);
    this.roamT = 0;
    this._tmp = new THREE.Vector3();
  }

  _pickRoam(t) {
    const bx = this.bounds.x - 1.5;
    const bz = this.bounds.z - 1.5;
    this.roam.set((Math.random() * 2 - 1) * bx, 1.5 + Math.random() * 1.0, (Math.random() * 2 - 1) * bz);
    this.roamT = t + 2.5 + Math.random() * 2;
  }

  update(dt, t, target, shieldActive) {
    let event = null;
    const dPj = this.pos.distanceTo(target);

    if (this.mode === 'rondar') {
      if (t > this.roamT) this._pickRoam(t);
      this.pos.lerp(this.roam, Math.min(1, dt * 1.2));
      if (t > this.nextAtk && t > this.invuln) {
        this.mode = 'ataque';
        this.atkT = t;
      }
    } else if (this.mode === 'ataque') {
      this._tmp.set(target.x, target.y + 1.3, target.z);
      const v = this._tmp.sub(this.pos);
      const d = v.length();
      if (d > 0.001) {
        v.normalize().multiplyScalar(Math.min(d, 4.6 * dt));
        this.pos.add(v);
      }
      if (shieldActive && dPj < 1.5) {
        this.mode = 'huye';
        this.invuln = t + 3;
        this.nextAtk = t + 11 + Math.random() * 4;
        event = 'repelled';
      } else if (!shieldActive && dPj < 0.95) {
        this.mode = 'huye';
        this.invuln = t + 3;
        this.nextAtk = t + 12 + Math.random() * 4;
        event = 'bite';
      } else if (t - this.atkT > 9) {
        this.mode = 'huye';
        this.nextAtk = t + 9 + Math.random() * 3;
      }
    } else {
      // huye
      if (!this._fleeTarget) {
        const sx = Math.sign(this.pos.x - target.x) || 1;
        const sz = Math.sign(this.pos.z - target.z) || 1;
        this._fleeTarget = new THREE.Vector3(sx * this.bounds.x, 2.6, sz * this.bounds.z);
      }
      this.pos.lerp(this._fleeTarget, Math.min(1, dt * 2));
      if (this.pos.distanceTo(this._fleeTarget) < 0.6) {
        this.mode = 'rondar';
        this._fleeTarget = null;
        this.roamT = 0;
      }
    }

    // aplicar + mirar al jugador + batir alas
    this.mesh.position.copy(this.pos);
    this.mesh.lookAt(target.x, this.pos.y, target.z);
    const flap = Math.sin(t * (this.mode === 'ataque' ? 55 : 38)) * 0.9;
    this.mesh.userData.wL.rotation.z = 0.5 + flap;
    this.mesh.userData.wR.rotation.z = -0.5 - flap;

    return event;
  }

  reset() {
    this.mode = 'rondar';
    this.nextAtk = 8;
    this.invuln = 0;
    this._fleeTarget = null;
    this.pos.set(2, 1.8, 2);
  }
}
