/**
 * Audio.js — música y SFX 100% procedurales (Web Audio API), sin descargas.
 *
 * Música: groove tipo cartoon (bombo + hats + bajo saltarín + melodía), con un
 * tema distinto por escena. SFX: pick, shield, bite, win, lose, click.
 * Zumbido del mosquito y lluvia como loops controlados por intensidad.
 */

// Un tema por escena (progresión del bajo, melodías, tempo, timbres).
const THEMES = {
  casa: {
    beat: 0.16, bass: 'square', mel: 'triangle',
    roots: [130.81, 196.0, 220.0, 174.61],
    melA: [523.25, 659.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25],
    melB: [659.25, 523.25, 587.33, 783.99, 880.0, 783.99, 659.25, 587.33],
  },
  jardin: {
    beat: 0.14, bass: 'square', mel: 'triangle',
    roots: [146.83, 220.0, 246.94, 196.0],
    melA: [587.33, 739.99, 659.25, 880.0, 739.99, 659.25, 587.33, 493.88],
    melB: [880.0, 739.99, 659.25, 587.33, 659.25, 739.99, 880.0, 987.77],
  },
  escuela: {
    beat: 0.13, bass: 'square', mel: 'square',
    roots: [130.81, 174.61, 196.0, 130.81],
    melA: [523.25, 523.25, 659.25, 659.25, 587.33, 587.33, 523.25, 392.0],
    melB: [659.25, 659.25, 783.99, 783.99, 659.25, 587.33, 523.25, 523.25],
  },
  parque: {
    beat: 0.18, bass: 'triangle', mel: 'sine',
    roots: [174.61, 130.81, 146.83, 116.54],
    melA: [698.46, 659.25, 587.33, 523.25, 587.33, 659.25, 698.46, 783.99],
    melB: [523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 523.25, 440.0],
  },
  playa: {
    beat: 0.15, bass: 'triangle', mel: 'sine',
    roots: [196.0, 146.83, 164.81, 130.81],
    melA: [783.99, 987.77, 880.0, 783.99, 659.25, 783.99, 880.0, 987.77],
    melB: [1174.66, 987.77, 880.0, 783.99, 880.0, 987.77, 1174.66, 880.0],
  },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this._musicTimer = null;
    this._step = 0;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);
  }

  /** Llamar tras un gesto (click "Empezar"). Reanuda el contexto. */
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
    return this.muted;
  }
  toggleMute() {
    return this.setMuted(!this.muted);
  }

  // ---------- síntesis básica ----------
  _tone(freq, t0, dur, { type = 'sine', gain = 0.2, out = null, attack = 0.01, release = 0.08 } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.linearRampToValueAtTime(gain * 0.7, t0 + dur);
    g.gain.linearRampToValueAtTime(0, t0 + dur + release);
    o.connect(g);
    g.connect(out || this.master);
    o.start(t0);
    o.stop(t0 + dur + release + 0.02);
  }

  _noise(t0, dur, { gain = 0.2, type = 'highpass', freq = 1200 } = {}) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // ---------- música (saltarina, tipo cartoon; un tema por escena) ----------
  startMusic(themeKey) {
    this._ensure();
    if (!this.ctx) return;
    const theme = THEMES[themeKey] || THEMES.casa;
    // si ya suena el mismo tema, no reiniciar
    if (this._musicTimer && this._themeKey === themeKey) return;
    this.stopMusic();
    this._themeKey = themeKey;
    this.theme = theme;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(0.26, this.ctx.currentTime + 0.8);
    this._bar = 0;
    this._nextBar = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx) return;
      while (this._nextBar < this.ctx.currentTime + 0.6) {
        this._emitBar(this._nextBar);
        this._nextBar += 16 * this.theme.beat;
      }
    };
    tick();
    this._musicTimer = setInterval(tick, 110);
  }

  /** Emite un compás del tema actual: bombo, hats, bajo saltarín y melodía. */
  _emitBar(t0) {
    const th = this.theme;
    const step = th.beat;
    const root = th.roots[this._bar % th.roots.length];
    const mel = this._bar % 2 ? th.melB : th.melA;
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * step;
      if (s === 0 || s === 8) this._tone(60, t, 0.13, { type: 'sine', gain: 0.16, out: this.musicGain, attack: 0.004, release: 0.07 });
      if (s % 2 === 1) this._noise(t, 0.025, { gain: 0.018, freq: 7000 });
      if (s % 4 === 0) this._tone(root, t, step * 1.5, { type: th.bass, gain: 0.06, out: this.musicGain, attack: 0.004, release: 0.05 });
      if (s % 4 === 2) this._tone(root * 1.5, t, step * 0.7, { type: th.bass, gain: 0.045, out: this.musicGain, attack: 0.004, release: 0.04 });
      if (s % 2 === 0) this._tone(mel[(s / 2) % 8], t, step * 1.2, { type: th.mel, gain: 0.06, out: this.musicGain, attack: 0.004, release: 0.06 });
    }
    this._bar++;
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
    this._themeKey = null;
    if (this.ctx && this.musicGain) this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
  }

  // ---------- lluvia (loop de ruido filtrado, controlado por intensidad) ----------
  _ensureRain() {
    if (this.rain || !this.ctx) return;
    // ruido continuo
    const n = 2 * this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    this.rain = src;
    this.rainGain = g;
  }

  /** v: 0..1 intensidad de lluvia → volumen del loop. */
  setRain(v) {
    this._ensure();
    this._ensureRain();
    if (!this.rainGain) return;
    this.rainGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.12, this.ctx.currentTime, 0.4);
  }

  // ---------- SFX ----------
  pick() {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(523, t, 0.09, { type: 'square', gain: 0.12 });
    this._tone(784, t + 0.08, 0.12, { type: 'square', gain: 0.12 });
  }
  shield() {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // "escudo arriba": barrido ascendente + brillo (power-up protector)
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.35);
    // armónico shimmer + chispa
    this._tone(1760, t + 0.05, 0.12, { type: 'sine', gain: 0.07 });
    this._tone(2640, t + 0.12, 0.14, { type: 'sine', gain: 0.05 });
    this._noise(t, 0.1, { gain: 0.05, freq: 3000 });
  }

  // ---------- zumbido del mosquito (loop, controlado por proximidad) ----------
  _ensureBuzz() {
    if (this.buzz || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 560;
    // vibrato (le da el "zzzz" del mosquito)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 45;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 4;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    osc.start();
    lfo.start();
    this.buzz = osc;
    this.buzzLfo = lfo;
    this.buzzGain = g;
  }

  /** v: 0..1 cercanía del Denguín → volumen del zumbido. */
  setBuzz(v) {
    this._ensure();
    this._ensureBuzz();
    if (!this.buzzGain) return;
    const target = Math.max(0, Math.min(1, v)) * 0.07;
    this.buzzGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }
  bite() {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(90, t, 0.18, { type: 'sawtooth', gain: 0.16 });
    this._tone(70, t + 0.1, 0.2, { type: 'sawtooth', gain: 0.14 });
  }
  win() {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, t + i * 0.12, 0.18, { type: 'triangle', gain: 0.14 }));
  }
  lose() {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 330, 262, 196].forEach((f, i) => this._tone(f, t + i * 0.14, 0.2, { type: 'triangle', gain: 0.13 }));
  }
  click() {
    this._ensure();
    if (!this.ctx) return;
    this._tone(660, this.ctx.currentTime, 0.05, { type: 'square', gain: 0.08 });
  }
}
