import * as THREE from 'three';
import { Cacharro } from '../entities/Cacharro.js';
import { Denguin } from '../entities/Denguin.js';
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
  constructor({ scene, getPlayer, spawns, hud, screens, bounds, denguinModel, cacharroModels, level, gate, onWin }) {
    this.scene = scene;
    this.getPlayer = getPlayer;
    this.spawns = spawns; // [[tipo,x,z], ...]
    this.hud = hud;
    this.screens = screens;
    this.cacharroModels = cacharroModels || {};
    this.level = level; // para abrir el portón
    this.gateAt = gate || 0; // 0 = sin portón
    this.onWin = onWin; // volver al mapa
    this._gateOpened = false;

    this.cacharros = [];
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
    this.spawns.forEach(([tipo, x, z], i) => {
      const c = new Cacharro(tipo, x, z, this.cacharroModels[tipo]);
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
    this.hud.show();
  }

  reset() {
    this._clear();
    this._spawn();
    this._gateOpened = false;
    if (this.level && this.level.resetGate) this.level.resetGate();
    this.denguin.reset();
    this.time = DURACION;
    this.found = 0;
    this.score = 0;
    this.hud.reset();
    this.hud.setAlert(false);
  }

  update(dt, t) {
    const player = this.getPlayer();
    const pp = player ? player.position : new THREE.Vector3();
    const shieldActive = !!player && player.shieldUntil > t;

    for (const c of this.cacharros) c.update(dt, t, pp);

    // burbuja de escudo
    this.shieldBubble.position.set(pp.x, pp.y + 0.95, pp.z);
    const targetOp = shieldActive ? 0.32 + Math.sin(t * 10) * 0.08 : 0;
    this.shieldBubble.material.opacity += (targetOp - this.shieldBubble.material.opacity) * Math.min(1, dt * 8);

    if (this.state !== 'playing') {
      this.denguin.update(dt, t, pp, shieldActive); // sigue volando de fondo
      this.hud.setAlert(false);
      return;
    }

    // ----- Denguín -----
    const ev = this.denguin.update(dt, t, pp, shieldActive);
    this.hud.setAlert(this.denguin.mode === 'ataque' && !shieldActive);
    if (ev === 'bite') {
      this.hud.setAlert(false);
      this.hud.flash();
      this._disperse(3);
    } else if (ev === 'repelled') {
      this.score += 50;
      this.hud.defensePopup('¡Defensa! +50');
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
        if (this.gateAt > 0 && !this._gateOpened && this.found >= this.gateAt && this.level && this.level.openGate) {
          this._gateOpened = true;
          this.level.openGate();
          this.hud.showTip('¡Portón abierto! 🔓', 'Volvé al pasillo y seguí hacia el norte (cocina, baño, living).');
        }
        if (this.found >= this.cacharros.length) return this._win();
      }
    }
  }

  /** Picadura: devuelve hasta n cacharros ya juntados (penalización). */
  _disperse(n) {
    let done = 0;
    for (let i = this.cacharros.length - 1; i >= 0 && done < n; i--) {
      const c = this.cacharros[i];
      if (c.collected) {
        c.collected = false;
        c.collecting = 0;
        c.group.visible = true;
        c.body.scale.setScalar(1);
        c.body.position.y = 0.04;
        this.found = Math.max(0, this.found - 1);
        this.hud.unmarkCollected(c.index);
        done += 1;
      }
    }
    this.hud.setCount(this.found);
    if (done > 0) this.hud.showTip('¡Te picó Denguín!', 'Algunos cacharros se dispersaron. ¡Usá el escudo (Espacio)!');
  }

  _win() {
    this.state = 'won';
    const restante = Math.floor(this.time);
    const stars = restante >= 60 ? 3 : restante >= 30 ? 2 : 1;
    const score = this.score + 500 + restante * 10;
    this.hud.hide();
    this.screens.win({ restante, score, stars, onReplay: () => this._replay(), onMap: this.onWin });
  }

  _lose() {
    this.state = 'lost';
    this.hud.hide();
    this.screens.lose({ encontrados: this.found, onRetry: () => this._replay(), onMap: this.onWin });
  }

  dispose() {
    this._clear();
    if (this.denguin) this.scene.remove(this.denguin.mesh);
    if (this.shieldBubble) this.scene.remove(this.shieldBubble);
  }

  _replay() {
    this.reset();
    this.start();
  }
}

/** Construye la lista de ítems (nombres) para el HUD, en orden de spawn. */
export function itemsDeSpawns(spawns) {
  return spawns.map(([tipo]) => ({ nombre: (CACHARRO_TIPOS[tipo] || {}).nombre || tipo }));
}
