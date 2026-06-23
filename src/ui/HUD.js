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
      <div class="hud-tray"></div>
      <div class="hud-tip"><span class="hud-tip-ic">💧</span><span class="hud-tip-tx"></span></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.timerTxt = el.querySelector('.hud-timer-txt');
    this.timerFill = el.querySelector('.hud-timer-fill');
    this.countEl = el.querySelector('.hud-count');
    this.tray = el.querySelector('.hud-tray');
    this.tip = el.querySelector('.hud-tip');
    this.tipTx = el.querySelector('.hud-tip-tx');
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

  reset() {
    this.chips.forEach((c) => c.classList.remove('done'));
    this.setCount(0);
    this.setTime(120);
    this.el.classList.remove('low');
  }
}
