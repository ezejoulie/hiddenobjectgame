/**
 * Screens.js — modales de juego: intro, victoria y derrota.
 * Cada uno se muestra con un callback para el botón principal.
 */
export class Screens {
  constructor() {
    const el = document.createElement('div');
    el.id = 'screens';
    el.innerHTML = `
      <div class="scr-modal" id="scr-card">
        <div class="scr-emoji"></div>
        <h2 class="scr-title"></h2>
        <p class="scr-desc"></p>
        <div class="scr-stars"></div>
        <div class="scr-score"></div>
        <div class="scr-row"></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.emoji = el.querySelector('.scr-emoji');
    this.title = el.querySelector('.scr-title');
    this.desc = el.querySelector('.scr-desc');
    this.stars = el.querySelector('.scr-stars');
    this.score = el.querySelector('.scr-score');
    this.row = el.querySelector('.scr-row');
  }

  _btn(label, cls, onClick) {
    const b = document.createElement('button');
    b.className = `scr-btn ${cls || ''}`;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  _show({ emoji, title, desc, stars = '', score = '', buttons }) {
    this.emoji.textContent = emoji || '';
    this.title.textContent = title || '';
    this.desc.textContent = desc || '';
    this.stars.textContent = stars;
    this.score.textContent = score;
    this.row.innerHTML = '';
    buttons.forEach((b) => this.row.appendChild(this._btn(b.label, b.cls, b.onClick)));
    this.el.classList.add('on');
  }

  hide() {
    this.el.classList.remove('on');
  }

  intro({ nombre, onStart }) {
    this._show({
      emoji: '🏠',
      title: nombre,
      desc: 'Encontrá los 10 cacharros con agua antes de que se acabe el tiempo. ¡Acercate y los juntás!',
      buttons: [{ label: '¡Empezar!', cls: 'verde', onClick: onStart }],
    });
  }

  win({ restante, score, stars, onReplay }) {
    this._show({
      emoji: '🎉',
      title: '¡Misión cumplida!',
      desc: `Juntaste los 10 cacharros con ${restante}s de sobra.`,
      stars: '★'.repeat(stars) + '☆'.repeat(3 - stars),
      score: `${score} puntos`,
      buttons: [{ label: '🔁 Jugar de nuevo', cls: 'verde', onClick: onReplay }],
    });
  }

  lose({ encontrados, onRetry }) {
    this._show({
      emoji: '🦟',
      title: '¡Se acabó el tiempo!',
      desc: `Juntaste ${encontrados} de 10 cacharros. ¡Denguín sigue suelto! Probá de nuevo.`,
      buttons: [{ label: '🔁 Reintentar', cls: 'coral', onClick: onRetry }],
    });
  }
}
