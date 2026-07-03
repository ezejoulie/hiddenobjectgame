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
    this.card = el.querySelector('#scr-card');
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
    // al mostrar un modal liberamos el mouse (pointer lock) para poder tocar botones
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    if (this.card) this.card.classList.remove('modal-mapa');
    this.emoji.textContent = emoji || '';
    this.title.textContent = title || '';
    if (descHtml) this.desc.innerHTML = descHtml;
    else this.desc.textContent = desc || '';
    this.stars.textContent = stars;
    this.score.textContent = score;
    this.row.innerHTML = '';
    this.row.classList.remove('scr-mapa');
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
        <p class="scr-note">🔓 Juntá los <b>primeros 5</b> y se abre el <b>portón</b> del pasillo para pasar a los demás cuartos.
        Nivel 1: <b>La Casa</b> 🏠 — próximamente El Jardín, La Escuela, El Parque y La Playa.</p>`,
      buttons: [{ label: '¡Empezar!', cls: 'verde', onClick: onStart }],
    });
  }

  win({ restante, score, stars, onReplay, onMap }) {
    const buttons = [{ label: '🔁 Jugar de nuevo', cls: 'verde', onClick: onReplay }];
    if (onMap) buttons.push({ label: '🗺️ Mapa', cls: '', onClick: onMap });
    this._show({
      emoji: '🎉',
      title: '¡Misión cumplida!',
      desc: `Juntaste los 10 cacharros con ${restante}s de sobra.`,
      stars: '★'.repeat(stars) + '☆'.repeat(3 - stars),
      score: `${score} puntos`,
      buttons,
    });
  }

  lose({ encontrados, reason, onRetry, onMap }) {
    const buttons = [{ label: '🔁 Reintentar', cls: 'coral', onClick: onRetry }];
    if (onMap) buttons.push({ label: '🗺️ Mapa', cls: '', onClick: onMap });
    const picado = reason === 'picado';
    this._show({
      emoji: picado ? '😵' : '🦟',
      title: picado ? '¡Denguín te picó 3 veces!' : '¡Se acabó el tiempo!',
      desc: picado
        ? `Te quedaste sin corazones. Juntaste ${encontrados} de 10 cacharros. ¡Usá el escudo (Espacio) para defenderte! Probá de nuevo.`
        : `Juntaste ${encontrados} de 10 cacharros. ¡Denguín sigue suelto! Probá de nuevo.`,
      buttons,
    });
  }

  /** Modo "historia": pantalla completa, animado, tap para avanzar. */
  story(beats, { onDone }) {
    this.hide();
    let el = this._storyEl;
    if (!el) {
      el = document.createElement('div');
      el.id = 'story';
      document.body.appendChild(el);
      this._storyEl = el;
    }
    let i = 0;
    const done = () => {
      el.classList.remove('on');
      el.innerHTML = '';
      el.onclick = null;
      onDone();
    };
    const render = () => {
      const b = beats[i];
      const last = i === beats.length - 1;
      el.innerHTML = `
        <button class="story-skip">Saltar ⏭</button>
        <div class="story-scene">
          ${b.logo ? `<img class="story-logo" src="${b.logo}" alt="">` : `<div class="story-big">${b.emoji}</div>`}
          <div class="story-lines">${(b.lines || []).map((l, k) => `<p style="animation-delay:${0.2 + k * 0.55}s">${l}</p>`).join('')}</div>
        </div>
        ${last ? `<button class="scr-btn verde story-go">${b.cta || '¡Vamos! 🚀'}</button>` : '<div class="story-next">Tocá para seguir ▶</div>'}
        <div class="story-dots">${beats.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>`;
      el.querySelector('.story-skip').onclick = (e) => { e.stopPropagation(); done(); };
      const go = el.querySelector('.story-go');
      if (go) {
        go.onclick = (e) => { e.stopPropagation(); done(); };
        el.onclick = null;
      } else {
        el.onclick = () => { i += 1; render(); };
      }
    };
    el.classList.add('on');
    render();
  }

  /** Portada: SOLO logo + botón; después cuenta la historia animada. */
  home({ onPlay }) {
    const logo = `${import.meta.env.BASE_URL}assets/img/logo.png`;
    this.story([{ logo, lines: [], cta: '¡Comenzar misión! 🧤' }], {
      onDone: () => this.story([
        { emoji: '🦟', lines: ['El mosquito <b>Denguín</b> anda suelto…', 'Llenó los barrios de <b>cacharros</b> con agua estancada.', '¡Ahí nacen sus crías! 💧'] },
        { emoji: '🧤', lines: ['Pero apareciste <b>VOS</b>.', 'Agente de la <b>Patrulla Anti-Dengue</b>. 🛡️'] },
        { emoji: '🗺️', lines: ['Tu misión: recorrer <b>5 lugares</b>', 'y eliminar <b>todos los cacharros</b>.', 'Sin agua acumulada… ¡no hay mosquito!'], cta: '¡Acepto la misión! 🚀' },
      ], { onDone: onPlay }),
    });
  }

  /** Diploma/medalla final: se gana al descacharrar todas las escenas. */
  diploma({ name, onMap, onDownload }) {
    const buttons = [];
    if (onDownload) buttons.push({ label: '📜 Descargar certificado', cls: 'verde', onClick: onDownload });
    buttons.push({ label: '🗺️ Volver al mapa', cls: '', onClick: onMap });
    this._show({
      emoji: '🏅',
      title: `¡${name || 'Agente'}, sos Defensor Anti-Dengue!`,
      descHtml: `
        <p class="scr-lead">¡Felicitaciones! Descacharraste <b>todos los lugares</b> y dejaste a
        Denguín sin criaderos. 🦟🚫</p>
        <p class="scr-note">Sin agua estancada, el mosquito no puede tener crías.
        <b>¡Sos un campeón anti-dengue!</b> 🛡️🏆</p>`,
      buttons,
    });
  }

  /** Selección de personaje + nombre (una vez por sesión). */
  heroSelect({ thumbs, onChosen }) {
    if (this.card) this.card.classList.remove('modal-mapa');
    this.emoji.textContent = '🕵️';
    this.title.textContent = 'Elegí tu personaje';
    this.desc.textContent = 'Te va a acompañar en toda la aventura.';
    this.stars.textContent = '';
    this.score.textContent = '';
    this.row.innerHTML = '';
    this.row.classList.remove('scr-mapa');

    const wrap = document.createElement('div');
    wrap.className = 'hero-pick';
    let chosen = 'nene';
    const cards = {};
    const cardsRow = document.createElement('div');
    cardsRow.className = 'hero-cards';
    ['nene', 'nena'].forEach((k, i) => {
      const b = document.createElement('button');
      b.className = 'hero-card' + (k === chosen ? ' on' : '');
      const vis = thumbs && thumbs[k]
        ? `<img src="${thumbs[k]}" alt="">`
        : `<span class="hero-av">${i === 0 ? '🧒' : '🧒'}</span>`;
      b.innerHTML = `${vis}<span class="hero-card-nm">Personaje ${i + 1}</span>`;
      b.addEventListener('click', () => {
        chosen = k;
        Object.values(cards).forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
      });
      cards[k] = b;
      cardsRow.appendChild(b);
    });
    wrap.appendChild(cardsRow);

    const nameRow = document.createElement('div');
    nameRow.className = 'hero-name-row';
    nameRow.innerHTML = `<label>Tu nombre de agente</label>
      <input class="hero-name-in" type="text" maxlength="14" placeholder="Escribí tu nombre">`;
    wrap.appendChild(nameRow);

    const go = this._btn('¡Comenzar la aventura! 🚀', 'verde', () => {
      const name = nameRow.querySelector('input').value.trim();
      onChosen(chosen, name);
    });
    go.classList.add('hero-go');
    wrap.appendChild(go);

    this.row.appendChild(wrap);
    this.el.classList.add('on');
  }

  /** Tutorial dinámico (modo historia, 4 pasos). */
  tutorial({ onDone }) {
    this.story([
      { emoji: '🪣', lines: ['Acercate a los <b>cacharros</b> para juntarlos.', 'La bandeja de abajo muestra los <b>10</b> que buscás. ✅'] },
      { emoji: '🕹️', lines: ['Movete con <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> o las flechas.', 'Hacé <b>click</b> y mové el mouse para mirar.', 'En celu: arrastrá con el dedo.'] },
      { emoji: '🦟', lines: ['Cada <b>15 segundos</b> Denguín viene a picarte.', 'Seguí la <b>flecha roja</b> y escuchá el zumbido…', 'Si te pica: perdés ❤️ y se te escapan cacharros.'] },
      { emoji: '🛡️', lines: ['Apretá <span class="kbd">Espacio</span> justo a tiempo:', '<b>¡DOBLE DEFENSA!</b> y Denguín sale volando. ⚡', 'Tenés ❤️❤️❤️ y 2 minutos. ¡Suerte, agente!'], cta: '¡Jugar! 🚀' },
    ], { onDone });
  }

  /** Pausa educativa (nivel tutorial): muestra el cacharro y cómo prevenir. */
  educa({ info, thumb, n, total, onContinue }) {
    const head = thumb ? `<img class="edu-img" src="${thumb}" alt="">` : '';
    this._show({
      emoji: thumb ? '' : (info.emoji || '💧'),
      title: `¡Encontraste un ${info.nombre.toLowerCase()}!`,
      descHtml: `
        ${head}
        <p class="scr-lead">${info.tip}</p>
        <p class="scr-note">💧 <b>Sin agua acumulada no hay mosquito:</b> el dengue se previene
        eliminando los cacharros donde el agua se queda quieta.</p>
        <div class="edu-prog">Cacharro <b>${n}</b> de <b>${total}</b> 🧤</div>`,
      buttons: [{ label: '¡Seguir buscando! 🔎', cls: 'verde', onClick: onContinue }],
    });
  }

  /** Mapa de niveles tipo "mundo de islas": pines sobre un camino serpenteante. */
  map(niveles, onPick, opts = {}) {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    const completed = opts.completed || new Set();
    const allDone = niveles.length > 0 && niveles.every((n) => completed.has(n.id));

    if (this.card) this.card.classList.add('modal-mapa');
    this.emoji.textContent = '🗺️';
    this.title.textContent = 'Elegí un mapa para descacharrar';
    this.desc.textContent = '¡Necesitamos tu ayuda para que Denguín no siga evolucionando! Tocá un lugar y eliminá los 10 cacharros con agua.';
    this.stars.textContent = '';
    this.score.textContent = '';
    this.row.innerHTML = '';
    this.row.classList.remove('scr-mapa');

    const pos = [[14, 76], [33, 46], [52, 72], [71, 42], [88, 66]];
    const pts = niveles.map((_, i) => pos[i] || [50, 50]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');

    const wrap = document.createElement('div');
    wrap.className = 'mapa-mundo';
    wrap.innerHTML =
      `<svg class="mapa-path" viewBox="0 0 100 90" preserveAspectRatio="none">` +
      `<path d="${d}" /></svg>`;

    niveles.forEach((n, i) => {
      const [x, y] = pos[i] || [50, 50];
      const done = completed.has(n.id);
      const b = document.createElement('button');
      b.className = 'isla' + (n.locked ? ' lock' : '') + (done ? ' done' : '');
      b.style.left = x + '%';
      b.style.top = y + '%';
      b.style.setProperty('--d', `${i * 0.08}s`);
      b.innerHTML =
        `<span class="isla-num">${i + 1}</span>` +
        `<span class="isla-pin">${n.emoji}</span>` +
        `<span class="isla-nm">${n.nombre}</span>` +
        (done ? '<span class="isla-done">✓</span>' : '') +
        (n.locked ? '<span class="isla-lock">🔒</span>' : '');
      if (!n.locked) b.addEventListener('click', () => onPick(n.id));
      wrap.appendChild(b);
    });

    // medalla/certificado: gris hasta descacharrar TODAS las escenas
    const medal = document.createElement('button');
    medal.className = 'isla-medal' + (allDone ? ' on' : '');
    medal.style.left = '50%';
    medal.style.top = '15%';
    medal.innerHTML =
      `<span class="medal-ic">🏅</span>` +
      `<span class="medal-nm">${allDone ? '¡Medalla!' : 'Medalla'}</span>` +
      `<span class="medal-sub">${[...completed].filter((id) => niveles.some((n) => n.id === id)).length}/${niveles.length}</span>`;
    if (allDone && opts.onMedal) medal.addEventListener('click', opts.onMedal);
    wrap.appendChild(medal);

    this.row.appendChild(wrap);
    this.el.classList.add('on');
  }
}
