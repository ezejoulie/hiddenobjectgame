import * as THREE from 'three';
import { Cacharro } from '../entities/Cacharro.js';
import { Denguin } from '../entities/Denguin.js';
import { resolveCircle } from '../systems/Collision.js';
import { CACHARRO_TIPOS } from '../data/cacharros.js';

/**
 * Game.js — orquesta el bucle de juego: spawnea los criaderos, lleva el timer,
 * detecta la recogida por cercanía y resuelve victoria/derrota.
 *
 * `getPlayer()` devuelve el jugador actual (puede cambiar por el selector
 * nene/nena), así que siempre leemos la posición vigente.
 */
const DURACION = 120;
const RADIO_PICKUP = 1.15;

export class Game {
  constructor({ scene, getPlayer, spawns, hud, screens, bounds, denguinModel, cacharroModels, level, gate, onWin, onComplete, audio, educa, thumbs }) {
    this.scene = scene;
    this.getPlayer = getPlayer;
    this.spawns = spawns; // [[tipo,x,z], ...]
    this.hud = hud;
    this.screens = screens;
    this.cacharroModels = cacharroModels || {};
    this.level = level; // para abrir el portón
    this.gateAt = gate || 0; // 0 = sin portón
    this.onWin = onWin; // volver al mapa
    this.onComplete = onComplete; // registrar nivel ganado (medalla)
    this.audio = audio || null;
    this.educa = !!educa; // pausa educativa al juntar (nivel tutorial)
    this.thumbs = thumbs || {};
    this.bounds = bounds || { x: 8, z: 8 };
    this._gateOpened = false;
    this.paused = false;

    this.maxLives = 3;
    this.lives = 3;
    this.cacharros = [];
    this.fx = []; // partículas de efecto al juntar
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
    this.state = 'intro';
    this.time = DURACION;
    this.found = 0;
    this.score = 0;

    this._spawn();

    // Denguín
    this.denguin = new Denguin(bounds || { x: 3.5, z: 3.5 }, denguinModel);
    this.scene.add(this.denguin.mesh);

    // burbuja de escudo ROJA (sigue al jugador, visible al defender)
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        transparent: true,
        opacity: 0,
        roughness: 0.1,
        metalness: 0,
        emissive: 0xff2a1f,
        emissiveIntensity: 0.7,
        depthWrite: false,
      })
    );
    this.scene.add(this.shieldBubble);
  }

  _spawn() {
    // Para que ningún cacharro quede metido DENTRO de un mueble/prop lo corremos
    // apenas hacia afuera de su huella. Solo usamos las huellas (círculos), NO
    // las paredes, y si el empuje lo mandaría lejos, lo dejamos donde estaba
    // (mejor un poco tapado que inalcanzable → el juego siempre se puede pasar).
    const occ = ((this.level && this.level.occupied) || []).map((o) => ({ type: 'circle', x: o.x, z: o.z, r: o.r }));
    this.spawns.forEach(([tipo, x, z], i) => {
      let nx = x, nz = z;
      if (occ.length) {
        const [rx, rz] = resolveCircle(x, z, 0.4, occ);
        if (Math.hypot(rx - x, rz - z) <= 1.6) { nx = rx; nz = rz; }
      }
      const c = new Cacharro(tipo, nx, nz, this.cacharroModels[tipo]);
      c.index = i;
      this.scene.add(c.group);
      this.cacharros.push(c);
    });
  }

  _clear() {
    this.cacharros.forEach((c) => this.scene.remove(c.group));
    this.cacharros = [];
  }

  start() {
    this.screens.hide();
    this.state = 'playing';
    this.denguin.reset(); // primera picada ~6 s desde que arranca el juego
    this.hud.show();
    this.hud.setLives(this.lives);
    if (this.gateAt > 0) {
      this.hud.showTip('🚪 El portón', `Juntá los primeros ${this.gateAt} cacharros del ala sur y se abre el portón del pasillo para pasar a las otras alas de la casa.`);
    }
  }

  reset() {
    this._clear();
    this._spawn();
    this._gateOpened = false;
    this.paused = false;
    if (this.level && this.level.resetGate) this.level.resetGate();
    this.denguin.reset();
    this.time = DURACION;
    this.found = 0;
    this.score = 0;
    this.lives = this.maxLives;
    this.hud.reset();
    this.hud.setAlert(false);
  }

  isPaused() {
    return this.paused;
  }

  update(dt, t) {
    const player = this.getPlayer();
    const pp = player ? player.position : new THREE.Vector3();
    const shieldActive = !!player && player.shieldUntil > t;

    for (const c of this.cacharros) c.update(dt, t, pp);
    this._updateFx(dt);

    // burbuja de escudo: SOLO visible al defender (doble defensa)
    this.shieldBubble.position.set(pp.x, pp.y + 0.95, pp.z);
    const targetOp = shieldActive ? 0.32 + Math.sin(t * 10) * 0.08 : 0;
    this.shieldBubble.material.opacity += (targetOp - this.shieldBubble.material.opacity) * Math.min(1, dt * 8);
    this.shieldBubble.visible = shieldActive || this.shieldBubble.material.opacity > 0.02;

    // pausa educativa: congela timer/Denguín mientras se lee la info
    if (this.paused) {
      this.hud.setAlert(false);
      this.hud.setDanger(0);
      if (this.audio) this.audio.setBuzz(0);
      return;
    }

    if (this.state !== 'playing') {
      this.denguin.update(dt, t, pp, shieldActive); // sigue volando de fondo
      this.hud.setAlert(false);
      this.hud.setDanger(0);
      if (this.audio) this.audio.setBuzz(0);
      return;
    }

    // ----- Denguín -----
    const ev = this.denguin.update(dt, t, pp, shieldActive);
    this.hud.setAlert(this.denguin.mode === 'ataque' && !shieldActive);

    // peligro (viñeta roja) + zumbido según cercanía del Denguín
    const dD = Math.hypot(this.denguin.pos.x - pp.x, this.denguin.pos.z - pp.z);
    let danger = dD < 6 ? 1 - dD / 6 : 0;
    if (this.denguin.mode === 'ataque') danger = Math.max(danger, 0.55);
    if (shieldActive) danger *= 0.25; // con escudo, menos tensión
    this.hud.setDanger(danger);
    if (this.audio) this.audio.setBuzz(dD < 8 ? 1 - dD / 8 : 0);
    this.hud.setNextBite(this.denguin.nextAtk - this.denguin.localT, this.denguin.mode === 'ataque');

    // barra de recarga del escudo (Doble Defensa, cooldown 8 s)
    const SHIELD_CD = 8;
    const rem = player ? Math.max(0, (player.shieldCd || 0) - t) : 0;
    this.hud.setShield(rem <= 0 ? 1 : 1 - rem / SHIELD_CD, rem <= 0, shieldActive);
    if (ev === 'bite') {
      this.hud.setAlert(false);
      this.hud.flash();
      if (this.audio) this.audio.bite();
      this.lives -= 1;
      this.hud.setLives(this.lives);
      if (this.lives <= 0) return this._lose('picado');
      this._disperse(3);
    } else if (ev === 'repelled') {
      this.score += 50;
      this.hud.defensePopup('¡Defensa! +50');
      if (this.audio) this.audio.shield();
    }

    // indicador del portón (solo si el nivel tiene)
    this.hud.setGate(this.found, this.gateAt, this._gateOpened);

    // timer
    this.time = Math.max(0, this.time - dt);
    this.hud.setTime(this.time);
    if (this.time <= 0) return this._lose();

    // recogida por cercanía
    for (const c of this.cacharros) {
      if (c.collected || c.collecting > 0) continue;
      const d = Math.hypot(pp.x - c.position.x, pp.z - c.position.z);
      if (d < RADIO_PICKUP && c.startCollect()) {
        this.found += 1;
        this.score += 100;
        this.hud.setCount(this.found);
        this.hud.markCollected(c.index);
        this.hud.showTip(c.info.nombre, c.info.tip);
        this._fxBurst(c.position, c.info.color || 0x6fd962);
        if (this.audio) this.audio.pick();
        if (this.gateAt > 0 && !this._gateOpened && this.found >= this.gateAt && this.level && this.level.openGate) {
          this._gateOpened = true;
          this.level.openGate();
          this.hud.showTip('¡Portón abierto! 🔓', 'Volvé al pasillo y seguí hacia el norte (cocina, baño, living).');
        }
        const last = this.found >= this.cacharros.length;
        // pausa educativa (nivel tutorial): muestra el elemento + cómo prevenir
        if (this.educa && this.screens.educa) {
          this.paused = true;
          this.screens.educa({
            info: c.info,
            thumb: this.thumbs[c.tipo],
            n: this.found,
            total: this.cacharros.length,
            onContinue: () => {
              this.paused = false;
              this.screens.hide();
              if (last) this._win();
            },
          });
          return;
        }
        if (last) return this._win();
      }
    }
  }

  /** Estallido de partículas al juntar un cacharro. */
  _fxBurst(pos, color) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      m.position.set(pos.x, 0.5, pos.z);
      const ang = (i / n) * Math.PI * 2;
      const sp = 1.5 + Math.random() * 1.5;
      this.fxGroup.add(m);
      this.fx.push({
        mesh: m, life: 0.6, max: 0.6,
        vx: Math.cos(ang) * sp, vy: 2 + Math.random() * 1.5, vz: Math.sin(ang) * sp,
      });
    }
    // anillo expansivo
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.18, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.08, pos.z);
    this.fxGroup.add(ring);
    this.fx.push({ mesh: ring, life: 0.5, max: 0.5, ring: true });
  }

  _updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i];
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      if (p.ring) {
        const s = 1 + (1 - k) * 10;
        p.mesh.scale.set(s, s, s);
        p.mesh.material.opacity = 0.9 * k;
      } else {
        p.vy -= 6 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = k;
      }
      if (p.life <= 0) {
        this.fxGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.fx.splice(i, 1);
      }
    }
  }

  /** Picadura: dispersa hasta n cacharros ya juntados a nuevos lugares
   *  (penalización: hay que volver a buscarlos). */
  _disperse(n) {
    const pp = this.getPlayer() ? this.getPlayer().position : new THREE.Vector3();
    let done = 0;
    for (let i = this.cacharros.length - 1; i >= 0 && done < n; i--) {
      const c = this.cacharros[i];
      if (c.collected) {
        c.collected = false;
        c.collecting = 0;
        c.group.visible = true;
        c.body.scale.setScalar(1);
        c.body.position.y = 0.04;
        // reubicar lejos del jugador para que tenga que buscarlo de nuevo
        const [nx, nz] = this._scatterSpot(pp);
        c.position.set(nx, 0, nz);
        c.group.position.set(nx, 0, nz);
        this.found = Math.max(0, this.found - 1);
        this.hud.unmarkCollected(c.index);
        done += 1;
      }
    }
    this.hud.setCount(this.found);
    if (done > 0) this.hud.showTip('¡Te picó Denguín!', '¡Se te volaron cacharros y se escondieron! Buscalos de nuevo. Usá el escudo (Espacio).');
  }

  /** Elige un punto dentro de los límites, lejos del jugador. */
  _scatterSpot(pp) {
    const bx = Math.max(2, this.bounds.x - 1);
    const bz = Math.max(2, this.bounds.z - 1);
    let nx = 0, nz = 0;
    for (let k = 0; k < 12; k++) {
      nx = (Math.random() * 2 - 1) * bx;
      nz = (Math.random() * 2 - 1) * bz;
      if (Math.hypot(nx - pp.x, nz - pp.z) > 5) break;
    }
    return [nx, nz];
  }

  _win() {
    this.state = 'won';
    if (this.audio) this.audio.win();
    if (this.onComplete) this.onComplete();
    const restante = Math.floor(this.time);
    const stars = restante >= 60 ? 3 : restante >= 30 ? 2 : 1;
    const score = this.score + 500 + restante * 10;
    this.hud.hide();
    this.screens.win({ restante, score, stars, onReplay: () => this._replay(), onMap: this.onWin });
  }

  _lose(reason) {
    this.state = 'lost';
    if (this.audio) this.audio.lose();
    this.hud.hide();
    this.screens.lose({ encontrados: this.found, reason, onRetry: () => this._replay(), onMap: this.onWin });
  }

  dispose() {
    if (this.audio) this.audio.setBuzz(0);
    this._clear();
    if (this.denguin) this.scene.remove(this.denguin.mesh);
    if (this.shieldBubble) this.scene.remove(this.shieldBubble);
    if (this.fxGroup) {
      this.fx.forEach((p) => {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      });
      this.fx = [];
      this.scene.remove(this.fxGroup);
    }
  }

  _replay() {
    this.reset();
    this.start();
  }
}

/** Construye la lista de ítems (tipo + emoji + nombre) para el HUD, en orden de spawn. */
export function itemsDeSpawns(spawns) {
  return spawns.map(([tipo]) => {
    const c = CACHARRO_TIPOS[tipo] || {};
    return { tipo, nombre: c.nombre || tipo, emoji: c.emoji || '💧' };
  });
}
