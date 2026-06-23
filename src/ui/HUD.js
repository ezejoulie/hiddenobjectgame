/**
 * HUD.js — interfaz de juego. Panel superior en UNA sola línea (vidas, timer,
 * contador, portón y cuenta de picada); el resto son notificaciones flotantes
 * (flecha de Denguín, tips, alertas, flash, doble defensa, viñeta de peligro).
 */
export class HUD {
  constructor(items, opts = {}) {
    this.maxLives = opts.lives || 3;
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-bar">
        <div class="hud-lives"></div>
        <div class="hud-timer">
          <div class="hud-timer-txt">2:00</div>
          <div class="hud-timer-bar"><div class="hud-timer-fill"></div></div>
        </div>
        <div class="hud-count">0/${items.length}</div>
        <div class="hud-gate"></div>
        <div class="hud-nextbite">🦟 --</div>
      </div>
      <div class="hud-arrow">
        <div class="hud-arrow-dial"><div class="hud-arrow-needle"></div></div>
      </div>
      <div class="hud-tray"></div>
      <div class="hud-shield">
        <span class="hud-shield-ic">🛡️</span>
        <div class="hud-shield-col">
          <div class="hud-shield-lbl">Doble Defensa</div>
          <div class="hud-shield-bar"><div class="hud-shield-fill"></div></div>
        </div>
        <span class="hud-shield-state">Lista</span>
      </div>
      <div class="hud-tip"><span class="hud-tip-ic">💧</span><span class="hud-tip-tx"></span></div>
      <div class="hud-alert">🦟 ¡Denguín te quiere picar! ¡Escudo! (Espacio)</div>
      <div class="hud-defense"></div>
      <div class="hud-doble">⚡ ¡DOBLE DEFENSA! ⚡</div>
      <div class="hud-flash"></div>
      <div class="hud-danger"></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.timerTxt = el.querySelector('.hud-timer-txt');
    this.timerFill = el.querySelector('.hud-timer-fill');
    this.countEl = el.querySelector('.hud-count');
    this.livesEl = el.querySelector('.hud-lives');
    this.tray = el.querySelector('.hud-tray');
    this.tip = el.querySelector('.hud-tip');
    this.tipTx = el.querySelector('.hud-tip-tx');
    this.alert = el.querySelector('.hud-alert');
    this.defense = el.querySelector('.hud-defense');
    this.doble = el.querySelector('.hud-doble');
    this.flashEl = el.querySelector('.hud-flash');
    this.dangerEl = el.querySelector('.hud-danger');
    this.gateEl = el.querySelector('.hud-gate');
    this.arrowEl = el.querySelector('.hud-arrow');
    this.arrowNeedle = el.querySelector('.hud-arrow-needle');
    this.nextBiteEl = el.querySelector('.hud-nextbite');
    this.shieldEl = el.querySelector('.hud-shield');
    this.shieldFill = el.querySelector('.hud-shield-fill');
    this.shieldState = el.querySelector('.hud-shield-state');
    this.total = items.length;
    this.setLives(this.maxLives);

    this.chips = items.map((it, i) => {
      const c = document.createElement('div');
      c.className = 'hud-chip';
      const visual = it.thumb
        ? `<img class="hud-chip-img" src="${it.thumb}" alt="">`
        : `<span class="hud-chip-em">${it.emoji || '💧'}</span>`;
      c.innerHTML = `${visual}<span class="hud-chip-nm">${it.nombre}</span>`;
      c.dataset.i = i;
      this.tray.appendChild(c);
      return c;
    });
  }

  setTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timerTxt.textContent = `${m}:${String(s).padStart(2, '0')}`;
    this.timerFill.style.width = `${(seconds / 120) * 100}%`;
    this.el.classList.toggle('low', seconds <= 30);
  }

  setCount(n) {
    this.countEl.textContent = `${n}/${this.total}`;
    this.countEl.classList.remove('pop');
    void this.countEl.offsetWidth;
    this.countEl.classList.add('pop');
  }

  setLives(n) {
    n = Math.max(0, Math.min(this.maxLives, n));
    this.livesEl.innerHTML = '❤️'.repeat(n) + '🤍'.repeat(this.maxLives - n);
    this.livesEl.classList.remove('hit');
    void this.livesEl.offsetWidth;
    if (n < this.maxLives) this.livesEl.classList.add('hit');
  }

  markCollected(index) {
    if (this.chips[index]) this.chips[index].classList.add('done');
  }
  unmarkCollected(index) {
    if (this.chips[index]) this.chips[index].classList.remove('done');
  }

  setAlert(on) {
    this.alert.classList.toggle('show', !!on);
  }

  setDanger(v) {
    if (!this.dangerEl) return;
    const k = Math.max(0, Math.min(1, v));
    this.dangerEl.style.opacity = k.toFixed(2);
    this.dangerEl.classList.toggle('pulse', k > 0.45);
  }

  setDenguinArrow(angle, show) {
    if (!this.arrowEl) return;
    this.arrowEl.classList.toggle('show', !!show);
    if (show) this.arrowNeedle.style.transform = `rotate(${angle}rad)`;
  }

  /** Estado del escudo: frac 0..1 de recarga, ready=listo, active=en uso. */
  setShield(frac, ready, active) {
    if (!this.shieldEl) return;
    this.shieldFill.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
    this.shieldEl.classList.toggle('ready', ready && !active);
    this.shieldEl.classList.toggle('active', !!active);
    this.shieldState.textContent = active ? '¡ACTIVO!' : (ready ? '¡Lista! (Espacio)' : 'Cargando…');
  }

  setNextBite(secs, attacking) {
    if (!this.nextBiteEl) return;
    if (attacking) {
      this.nextBiteEl.textContent = '🦟 ¡Ataca!';
      this.nextBiteEl.classList.add('soon');
    } else {
      const s = Math.max(0, Math.ceil(secs));
      this.nextBiteEl.textContent = `🦟 ${s}s`;
      this.nextBiteEl.classList.toggle('soon', s <= 4);
    }
  }

  flash() {
    this.flashEl.classList.remove('show');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('show');
  }

  defensePopup(text) {
    this.defense.textContent = text;
    this.defense.classList.remove('show');
    void this.defense.offsetWidth;
    this.defense.classList.add('show');
  }

  dobleDefensa() {
    this.doble.classList.remove('show');
    void this.doble.offsetWidth;
    this.doble.classList.add('show');
  }

  setGate(found, threshold, open) {
    if (!this.gateEl) return;
    if (!threshold || threshold <= 0) {
      this.gateEl.style.display = 'none';
      return;
    }
    this.gateEl.style.display = '';
    if (open) {
      this.gateEl.textContent = '🔓 ¡Portón abierto!';
      this.gateEl.classList.add('open');
    } else {
      this.gateEl.textContent = `🔒 Portón: ${Math.max(0, threshold - found)}`;
      this.gateEl.classList.remove('open');
    }
  }

  showTip(nombre, tip) {
    this.tipTx.innerHTML = `<b>${nombre}:</b> ${tip}`;
    this.tip.classList.add('show');
    clearTimeout(this._tipTo);
    this._tipTo = setTimeout(() => this.tip.classList.remove('show'), 3500);
  }

  show() {
    this.el.classList.add('on');
  }
  hide() {
    this.el.classList.remove('on');
  }
  destroy() {
    this.el.remove();
  }

  reset() {
    this.chips.forEach((c) => c.classList.remove('done'));
    this.setCount(0);
    this.setTime(120);
    this.setLives(this.maxLives);
    this.el.classList.remove('low');
  }
}
