import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { resolveCircle } from '../systems/Collision.js';

/**
 * Player.js — Mateo (nene/nena). Modos con la MISMA interfaz:
 *  - GLB con animación real (mixer), si el clip tiene duración válida.
 *  - GLB con CAMINATA PROCEDURAL: si el modelo es Mixamo en T-pose (sin
 *    animación útil), animamos los huesos `mixamorig` por código.
 *  - Primitivas: fallback si el GLB no carga.
 *
 * La caminata procedural rota los huesos en EJES DE MUNDO (no en los ejes
 * locales de cada hueso, que son impredecibles): el swing de piernas/brazos es
 * alrededor del eje X de mundo (plano sagital) y el "bajar los brazos" desde la
 * T-pose es alrededor del eje Z de mundo. Las constantes de abajo se ajustan
 * fácil si algún signo/eje quedó al revés.
 */

// ---- Constantes de la caminata procedural (ajustables) ----
const STEP_RATE = 9; // velocidad del ciclo
const LEG_SWING = 0.62; // amplitud de piernas (rad)
const KNEE_BEND = 0.75; // flexión de rodilla
const ARM_SWING = 0.4; // amplitud de brazos
const ARM_DOWN = 1.2; // cuánto se bajan los brazos desde la T-pose (rad)
const BODY_BOB = 0.04; // rebote vertical del cuerpo

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
    this.procWalk = null;

    // temporales reutilizables (sin alocar por frame)
    this._X = new THREE.Vector3(1, 0, 0);
    this._Z = new THREE.Vector3(0, 0, 1);
    this._qa = new THREE.Quaternion();
    this._qb = new THREE.Quaternion();

    this.mesh = null;
    if (opts.gltf && opts.gltf.scene) {
      try {
        this.mesh = this._buildGLB(opts.gltf, opts.targetHeight ?? 1.5);
        this.isGLB = true;
      } catch (e) {
        console.warn('Falló el personaje GLB, usando placeholder:', e);
        this.mesh = null;
        this.isGLB = false;
        this.mixer = null;
        this.procWalk = null;
      }
    }
    if (!this.mesh) this.mesh = this._buildPrimitive();
    this.shieldUntil = 0;
  }

  // ---------- Modo GLB ----------
  _buildGLB(gltf, targetH) {
    const model = skeletonClone(gltf.scene);
    model.updateMatrixWorld(true);

    // altura por la extensión del esqueleto (la geometría viene en bind-pose chica)
    const v = new THREE.Vector3();
    const boneBox = new THREE.Box3();
    let bones = 0;
    model.traverse((o) => {
      if (o.isBone) {
        v.setFromMatrixPosition(o.matrixWorld);
        boneBox.expandByPoint(v);
        bones += 1;
      }
    });
    let h = 0;
    if (bones >= 2 && isFinite(boneBox.min.y)) h = boneBox.getSize(new THREE.Vector3()).y;
    if (!(h > 0.01)) {
      const gs = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      h = gs.y > 0.01 ? gs.y : 1;
    }
    model.scale.setScalar(targetH / h);

    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    model.updateMatrixWorld(true);

    const g = new THREE.Group();
    g.add(model);

    // ¿hay animación REAL (duración > 0.2s)? si no, caminata procedural
    const hasRealAnim = (gltf.animations || []).some((c) => c.duration > 0.2);
    if (hasRealAnim) {
      this.mixer = new THREE.AnimationMixer(model);
      this._setupAnims(gltf.animations);
    } else {
      this.procWalk = this._setupProceduralWalk(model);
    }
    return g;
  }

  /** Encuentra huesos mixamorig y cachea su pose de reposo (mundo + local). */
  _setupProceduralWalk(model) {
    const want = [
      'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
      'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm',
    ];
    const found = {};
    model.traverse((o) => {
      if (!o.isBone) return;
      for (const w of want) {
        if (!found[w] && o.name.endsWith(w)) found[w] = o;
      }
    });
    if (!found.LeftUpLeg || !found.RightUpLeg) return null; // no es esqueleto mixamo

    const data = {};
    for (const k in found) {
      const b = found[k];
      const parentWorld = b.parent
        ? b.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
      data[k] = {
        bone: b,
        localRest: b.quaternion.clone(),
        parentWorld,
        parentWorldInv: parentWorld.clone().invert(),
      };
    }
    return data;
  }

  /** Aplica una rotación expresada en MUNDO (Rw) al hueso, sobre su reposo. */
  _applyWorld(d, Rw) {
    if (!d) return;
    // newLocal = parentWorldInv * Rw * parentWorld * localRest
    d.bone.quaternion
      .copy(d.parentWorldInv)
      .multiply(Rw)
      .multiply(d.parentWorld)
      .multiply(d.localRest);
  }

  _driveProcWalk(dt, mag) {
    const pw = this.procWalk;
    const X = this._X;
    const Z = this._Z;
    const qa = this._qa;
    const qb = this._qb;
    const moving = mag > 0.08;

    if (moving) this.walkPhase += dt * STEP_RATE * Math.max(0.5, mag);
    else this.walkPhase += dt * 1.4;

    const legSw = moving ? Math.sin(this.walkPhase) * LEG_SWING : 0;
    const armSw = moving ? Math.sin(this.walkPhase) * ARM_SWING : Math.sin(this.walkPhase) * 0.04;

    // --- Piernas: swing alrededor del eje X de mundo (opuestas entre sí) ---
    this._applyWorld(pw.LeftUpLeg, qa.setFromAxisAngle(X, legSw));
    this._applyWorld(pw.RightUpLeg, qa.setFromAxisAngle(X, -legSw));
    // rodillas: flexionan cuando la pierna va hacia atrás
    this._applyWorld(pw.LeftLeg, qa.setFromAxisAngle(X, Math.max(0, -legSw) * KNEE_BEND));
    this._applyWorld(pw.RightLeg, qa.setFromAxisAngle(X, Math.max(0, legSw) * KNEE_BEND));

    // --- Brazos: bajarlos desde T-pose (eje Z) + swing (eje X), opuestos a las piernas ---
    // izquierdo: baja con Rz(-ARM_DOWN); derecho: Rz(+ARM_DOWN)
    this._applyWorld(
      pw.LeftArm,
      qa.setFromAxisAngle(X, -armSw).multiply(qb.setFromAxisAngle(Z, -ARM_DOWN))
    );
    this._applyWorld(
      pw.RightArm,
      qa.setFromAxisAngle(X, armSw).multiply(qb.setFromAxisAngle(Z, ARM_DOWN))
    );
    // antebrazos: leve flexión fija para que no queden tiesos
    this._applyWorld(pw.LeftForeArm, qa.setFromAxisAngle(X, -0.25));
    this._applyWorld(pw.RightForeArm, qa.setFromAxisAngle(X, -0.25));

    return moving ? Math.abs(Math.sin(this.walkPhase)) * BODY_BOB : 0;
  }

  _setupAnims(animations) {
    const names = animations.map((c) => c.name);
    const find = (re) => names.find((n) => re.test(n));
    const moveName = find(/walk/i) || find(/run/i) || find(/mixamo/i) || names[0];
    const idleName = find(/idle/i);
    if (moveName) {
      const baseClip = animations.find((c) => c.name === moveName);
      const tracks = baseClip.tracks.filter((t) => !/Hips\.position$/i.test(t.name));
      this.moveAction = this.mixer.clipAction(new THREE.AnimationClip(baseClip.name, baseClip.duration, tracks));
      this.moveAction.play();
    }
    this.idleAction = idleName ? this.mixer.clipAction(animations.find((c) => c.name === idleName)) : null;
    if (this.idleAction) {
      this.idleAction.play();
      this.current = this.idleAction;
      if (this.moveAction) this.moveAction.setEffectiveWeight(0);
    } else if (this.moveAction) {
      this.moveAction.paused = true;
      this.current = this.moveAction;
    }
  }

  _crossTo(action, fade = 0.2) {
    if (!action || action === this.current) return;
    action.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = action;
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
    }

    // ----- animación -----
    if (this.isGLB) {
      if (this.procWalk) {
        bobY = this._driveProcWalk(dt, mag);
      } else if (this.mixer) {
        if (mag > 0.08) {
          if (this.moveAction) {
            this.moveAction.paused = false;
            this.moveAction.timeScale = 0.7 + mag * 0.7;
          }
          if (this.idleAction) this._crossTo(this.moveAction);
        } else if (this.idleAction) {
          this._crossTo(this.idleAction);
        } else if (this.moveAction) {
          this.moveAction.paused = true;
        }
      }
      if (this.mixer) this.mixer.update(dt);
    } else {
      // primitivas
      if (mag > 0.08) {
        this.walkPhase += dt * 10 * mag;
        const sw = Math.sin(this.walkPhase) * 0.7;
        this.legL.rotation.x = sw;
        this.legR.rotation.x = -sw;
        this.armL.rotation.x = -sw * 0.8;
        this.armR.rotation.x = sw * 0.8;
        bobY = Math.abs(Math.sin(this.walkPhase)) * 0.05;
      } else {
        const damp = 1 - Math.min(1, dt * 10);
        this.legL.rotation.x *= damp;
        this.legR.rotation.x *= damp;
        this.armL.rotation.x *= damp;
        this.armR.rotation.x *= damp;
      }
    }

    this.mesh.position.set(this.position.x, bobY, this.position.z);
    this.mesh.rotation.y = this.heading + this.facingOffset;
  }
}
