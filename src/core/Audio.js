/**
 * Audio.js — música y SFX 100% procedurales (Web Audio API), sin descargas.
 *
 * Música: pad suave + arpegio que recorre una progresión alegre (loop).
 * SFX: pick (juntar), shield (doble defensa), bite (picadura), win, lose, click.
 * Se arranca recién con un gesto del usuario (requisito de los navegadores).
 */
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

  // ---------- música ----------
  startMusic() {
    this._ensure();
    if (!this.ctx || this._musicTimer) return;
    this.musicGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.5);
    // progresión I–V–vi–IV en Do (alegre), notas en Hz
    const chords = [
      [262, 330, 392], // C
      [294, 370, 440], // ~G/D
      [220, 277, 330], // Am
      [175, 262, 349], // F
    ];
    const arp = [392, 523, 659, 523]; // arpegio agudo
    const beat = 0.5;
    const schedule = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const ch = chords[this._step % chords.length];
      // pad: acorde sostenido
      ch.forEach((f) =>
        this._tone(f, t, beat * 4 - 0.1, { type: 'triangle', gain: 0.05, out: this.musicGain, attack: 0.2, release: 0.3 })
      );
      // arpegio brillante
      for (let i = 0; i < 4; i++) {
        this._tone(arp[(this._step + i) % arp.length], t + i * beat, beat * 0.8, {
          type: 'sine', gain: 0.04, out: this.musicGain, attack: 0.02, release: 0.1,
        });
      }
      this._step++;
    };
    schedule();
    this._musicTimer = setInterval(schedule, 2000);
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
    if (this.ctx && this.musicGain) this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
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
