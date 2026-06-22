import * as THREE from 'three';
import { resolveCircle } from '../systems/Collision.js';

/**
 * Player.js — Mateo, el agente. Movimiento en tercera persona relativo a la
 * cámara, con colisión circular contra los muebles/paredes y una animación de
 * caminata simple. El modelo es un placeholder PBR (primitivas); el héroe
 * Higgsfield entra en el Sprint 4 sin tocar esta lógica.
 */

const SKIN = 0xf0b48a;
const SHIRT = 0x2f86c8;
const SHORTS = 0x1b3b63;
const SHOE = 0xf4f4f5;
const CAP = 0x2a7de1;

function pbr(color, roughness = 0.7, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export class Player {
  constructor() {
    this.radius = 0.34;
    this.speed = 4.2;
    this.position = new THREE.Vector3();
    this.heading = Math.PI;
    this.walkPhase = 0;

    this.mesh = this._build();
    this.shieldUntil = 0;
  }

  _build() {
    const g = new THREE.Group();
    g.name = 'Mateo';

    const skin = pbr(SKIN, 0.65);
    const shirt = pbr(SHIRT, 0.7);
    const shorts = pbr(SHORTS, 0.75);
    const shoe = pbr(SHOE, 0.6);
    const cap = pbr(CAP, 0.6);

    // piernas (pivotes para animar)
    const mkLeg = (x) => {
      const leg = new THREE.Group();
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.42, 12), shorts);
      thigh.position.y = -0.21;
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), shoe);
      foot.scale.set(1, 0.55, 1.5);
      foot.position.set(0, -0.46, 0.05);
      leg.add(thigh, foot);
      leg.position.set(x, 0.5, 0);
      return leg;
    };
    this.legL = mkLeg(-0.13);
    this.legR = mkLeg(0.13);

    // torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16), shirt);
    torso.position.y = 0.85;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), shirt);
    shoulders.scale.set(1, 0.6, 0.85);
    shoulders.position.y = 1.1;

    // brazos
    const mkArm = (x) => {
      const arm = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 12), shirt);
      upper.position.y = -0.2;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skin);
      hand.position.y = -0.44;
      arm.add(upper, hand);
      arm.position.set(x, 1.12, 0);
      arm.rotation.z = x > 0 ? -0.12 : 0.12;
      return arm;
    };
    this.armL = mkArm(-0.3);
    this.armR = mkArm(0.3);

    // cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 20), skin);
    head.position.y = 1.52;
    const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), cap);
    capMesh.scale.set(1.04, 0.56, 1.04);
    capMesh.position.y = 1.63;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.22), cap);
    visor.position.set(0, 1.58, 0.28);

    g.add(this.legL, this.legR, torso, shoulders, this.armL, this.armR, head, capMesh, visor);

    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
  }

  triggerShield(now) {
    this.shieldUntil = now + 1.7;
  }

  /**
   * @param {number} dt
   * @param {{x:number,y:number,mag:number}} move  input direccional
   * @param {number} camYaw  yaw de la cámara para mover relativo a ella
   * @param {Array} colliders
   */
  update(dt, move, camYaw, colliders) {
    const mag = Math.min(1, Math.hypot(move.x, move.y));

    if (mag > 0.08) {
      // ejes relativos a la cámara
      const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const dir = fwd.multiplyScalar(move.y).add(right.multiplyScalar(move.x)).normalize();

      const vel = this.speed * mag;
      this.position.x += dir.x * vel * dt;
      this.position.z += dir.z * vel * dt;

      // colisión contra muebles/paredes
      if (colliders && colliders.length) {
        const [nx, nz] = resolveCircle(this.position.x, this.position.z, this.radius, colliders);
        this.position.x = nx;
        this.position.z = nz;
      }

      // girar hacia la dirección de movimiento
      const target = Math.atan2(dir.x, dir.z);
      let diff = target - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);

      // caminata
      this.walkPhase += dt * 10 * mag;
      const sw = Math.sin(this.walkPhase) * 0.7;
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      this.armL.rotation.x = -sw * 0.8;
      this.armR.rotation.x = sw * 0.8;
      this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.05;
    } else {
      // volver a reposo
      const damp = 1 - Math.min(1, dt * 10);
      this.legL.rotation.x *= damp;
      this.legR.rotation.x *= damp;
      this.armL.rotation.x *= damp;
      this.armR.rotation.x *= damp;
      this.mesh.position.y *= damp;
    }

    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
    this.mesh.rotation.y = this.heading;
  }
}
