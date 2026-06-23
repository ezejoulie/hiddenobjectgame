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

  _show({ emoji, title, desc, descHtml, stars = '', score = '', buttons }) {
    this.emoji.textContent = emoji || '';
    this.title.textContent = title || '';
    if (descHtml) this.desc.innerHTML = descHtml;
    else this.desc.textContent = desc || '';
    this.stars.textContent = stars;
    this.score.textContent = score;
    this.row.innerHTML = '';
    buttons.forEach((b) => this.row.appendChild(this._btn(b.label, b.cls, b.onClick)));
    this.el.classList.add('on');
  }

  hide() {
    this.el.classList.remove('on');
  }

  intro({ onStart }) {
    this._show({
      emoji: '🦟',
      title: 'Patrulla Anti-Dengue',
      descHtml: `
        <p class="scr-lead">Sos un <b>agente anti-dengue</b>. Recorré los ambientes y eliminá los
        <b>10 cacharros</b> con agua estancada antes de que se acabe el tiempo (2:00).
        Sin agua acumulada, no hay mosquito.</p>
        <div class="scr-how">
          <div>🕹️ <b>Moverte</b><span>WASD o flechas</span></div>
          <div>🖱️ <b>Cámara</b><span>arrastrá para girar</span></div>
          <div>🛡️ <b>Escudo</b><span>Espacio</span></div>
          <div>🦟 <b>Denguín</b><span>si te pica, dispersa cacharros</span></div>
        </div>
        <p class="scr-note">Nivel 1: <b>La Casa</b> 🏠 — próximamente El Jardín, La Escuela, El Parque y La Playa.
        Elegí tu personaje arriba a la derecha.</p>`,
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
