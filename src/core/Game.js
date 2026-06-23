import * as THREE from 'three';
import { Cacharro } from '../entities/Cacharro.js';
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
  constructor({ scene, getPlayer, spawns, hud, screens }) {
    this.scene = scene;
    this.getPlayer = getPlayer;
    this.spawns = spawns; // [[tipo,x,z], ...]
    this.hud = hud;
    this.screens = screens;

    this.cacharros = [];
    this.state = 'intro';
    this.time = DURACION;
    this.found = 0;
    this.score = 0;

    this._spawn();
  }

  _spawn() {
    this.spawns.forEach(([tipo, x, z], i) => {
      const c = new Cacharro(tipo, x, z);
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
    this.time = DURACION;
    this.found = 0;
    this.score = 0;
    this.hud.reset();
  }

  update(dt, t) {
    const player = this.getPlayer();
    const pp = player ? player.position : new THREE.Vector3();

    for (const c of this.cacharros) c.update(dt, t, pp);

    if (this.state !== 'playing') return;

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
        if (this.found >= this.cacharros.length) return this._win();
      }
    }
  }

  _win() {
    this.state = 'won';
    const restante = Math.floor(this.time);
    const stars = restante >= 60 ? 3 : restante >= 30 ? 2 : 1;
    const score = this.score + 500 + restante * 10;
    this.hud.hide();
    this.screens.win({ restante, score, stars, onReplay: () => this._replay() });
  }

  _lose() {
    this.state = 'lost';
    this.hud.hide();
    this.screens.lose({ encontrados: this.found, onRetry: () => this._replay() });
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
