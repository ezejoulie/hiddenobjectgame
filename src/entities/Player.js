import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { resolveCircle } from '../systems/Collision.js';

/**
 * Player.js — Mateo. Dos modos con la MISMA interfaz:
 *  - GLB: personaje riggeado + animado (mixer Idle/Walking). Se usa si se le
 *    pasa un gltf {scene, animations}.
 *  - Primitivas: placeholder PBR (fallback si el GLB no carga).
 * El movimiento es en tercera persona relativo a la cámara, con colisión.
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
  constructor(opts = {}) {
    this.radius = 0.34;
    this.speed = 4.2;
    this.position = new THREE.Vector3();
    this.heading = Math.PI;
    this.walkPhase = 0;
    this.facingOffset = opts.facingOffset ?? 0;

    this.isGLB = false;
    this.mixer = null;
    this.actions = {};
    this.current = null;

    if (opts.gltf && opts.gltf.scene) {
      this.mesh = this._buildGLB(opts.gltf, opts.targetHeight ?? 1.55);
      this.isGLB = true;
    } else {
      this.mesh = this._buildPrimitive();
    }
    this.shieldUntil = 0;
  }

  // ---------- Modo GLB (riggeado + animado) ----------
  _buildGLB(gltf, targetH) {
    const model = skeletonClone(gltf.scene);

    // normalizar a la altura objetivo y apoyar en el piso
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = size.y > 0 ? targetH / size.y : 1;
    model.scale.setScalar(s);
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
        o.frustumCulled = false; // evita parpadeos del skinned mesh
      }
    });

    const g = new THREE.Group();
    g.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this._play('Idle', 0);
    return g;
  }

  _play(name, fade = 0.25) {
    const next = this.actions[name];
    if (!next || next === this.current) return;
    next.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
  }

  // ---------- Modo primitivas (fallback) ----------
  _buildPrimitive() {
    const g = new THREE.Group();
    g.name = 'MateoPrim';

    const skin = pbr(SKIN, 0.65);
    const shirt = pbr(SHIRT, 0.7);
    const shorts = pbr(SHORTS, 0.75);
    const shoe = pbr(SHOE, 0.6);
    const cap = pbr(CAP, 0.6);

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

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16), shirt);
    torso.position.y = 0.85;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), shirt);
    shoulders.scale.set(1, 0.6, 0.85);
    shoulders.position.y = 1.1;

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

  update(dt, move, camYaw, colliders) {
    const mag = Math.min(1, Math.hypot(move.x, move.y));
    let bobY = 0;

    if (mag > 0.08) {
      const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const dir = fwd.multiplyScalar(move.y).add(right.multiplyScalar(move.x)).normalize();

      const vel = this.speed * mag;
      this.position.x += dir.x * vel * dt;
      this.position.z += dir.z * vel * dt;

      if (colliders && colliders.length) {
        const [nx, nz] = resolveCircle(this.position.x, this.position.z, this.radius, colliders);
        this.position.x = nx;
        this.position.z = nz;
      }

      const target = Math.atan2(dir.x, dir.z);
      let diff = target - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);

      if (this.isGLB) {
        this._play('Walking');
        if (this.actions['Walking']) this.actions['Walking'].timeScale = 0.85 + mag * 0.5;
      } else {
        this.walkPhase += dt * 10 * mag;
        const sw = Math.sin(this.walkPhase) * 0.7;
        this.legL.rotation.x = sw;
        this.legR.rotation.x = -sw;
        this.armL.rotation.x = -sw * 0.8;
        this.armR.rotation.x = sw * 0.8;
        bobY = Math.abs(Math.sin(this.walkPhase)) * 0.05;
      }
    } else {
      if (this.isGLB) {
        this._play('Idle');
      } else {
        const damp = 1 - Math.min(1, dt * 10);
        this.legL.rotation.x *= damp;
        this.legR.rotation.x *= damp;
        this.armL.rotation.x *= damp;
        this.armR.rotation.x *= damp;
      }
    }

    if (this.mixer) this.mixer.update(dt);

    this.mesh.position.set(this.position.x, bobY, this.position.z);
    this.mesh.rotation.y = this.heading + this.facingOffset;
  }
}
