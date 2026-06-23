/**
 * HUD.js — interfaz de juego: timer (barra + texto), contador 0/10, bandeja de
 * ítems a encontrar (en orden de spawn, se marcan al juntarlos) y un toast con
 * el tip educativo.
 */
export class HUD {
  constructor(items) {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-top">
        <div class="hud-timer">
          <div class="hud-timer-txt">2:00</div>
          <div class="hud-timer-bar"><div class="hud-timer-fill"></div></div>
        </div>
        <div class="hud-count">0/${items.length}</div>
      </div>
      <div class="hud-gate"></div>
      <div class="hud-tray"></div>
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
    this.tray = el.querySelector('.hud-tray');
    this.tip = el.querySelector('.hud-tip');
    this.tipTx = el.querySelector('.hud-tip-tx');
    this.alert = el.querySelector('.hud-alert');
    this.defense = el.querySelector('.hud-defense');
    this.doble = el.querySelector('.hud-doble');
    this.flashEl = el.querySelector('.hud-flash');
    this.dangerEl = el.querySelector('.hud-danger');
    this.gateEl = el.querySelector('.hud-gate');
    this.total = items.length;

    this.chips = items.map((it, i) => {
      const c = document.createElement('div');
      c.className = 'hud-chip';
      c.innerHTML = `<span class="hud-chip-nm">${it.nombre}</span>`;
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

  /** Nivel de peligro 0..1 (Denguín cerca): tiñe los bordes de rojo y pulsa. */
  setDanger(v) {
    if (!this.dangerEl) return;
    const k = Math.max(0, Math.min(1, v));
    this.dangerEl.style.opacity = k.toFixed(2);
    this.dangerEl.classList.toggle('pulse', k > 0.45);
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
      this.gateEl.textContent = '🔓 Portón abierto — pasá al norte';
      this.gateEl.classList.add('open');
    } else {
      this.gateEl.textContent = `🔒 Portón: faltan ${Math.max(0, threshold - found)}`;
      this.gateEl.classList.remove('open');
    }
  }

  showTip(nombre, tip) {
    this.tipTx.innerHTML = `<b>${nombre}:</b> ${tip}`;
    this.tip.classList.add('show');
    clearTimeout(this._tipTo);
    this._tipTo = setTimeout(() => this.tip.classList.remove('show'), 3000);
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
    this.el.classList.remove('low');
  }
}
