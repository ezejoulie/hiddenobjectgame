/**
 * Input.js — entrada unificada: teclado (WASD/flechas), arrastre de mouse/touch
 * para orbitar la cámara, y un acumulador de deltas de mirada.
 *
 * Expone:
 *  - moveVector(): {x, y} normalizado-ish del input direccional (teclado/joystick)
 *  - consumeLook(): {dx, dy} acumulado del arrastre desde el último frame
 *  - isDown(code): estado de una tecla
 *  - shieldPressed(): true una sola vez cuando se aprieta Espacio
 *
 * El joystick táctil se agregará en una iteración posterior; por ahora el touch
 * arrastra para mirar y el teclado mueve (suficiente para validar el look).
 */
export class Input {
  constructor(domElement) {
    this.el = domElement;
    this.keys = new Set();
    this.look = { dx: 0, dy: 0 };
    this._shieldQueued = false;
    this._locked = false; // pointer lock: mover el mouse = mover cámara (sin mantener)

    this._drag = null;

    // ---- teclado ----
    this._onKeyDown = (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code === 'Space') {
        this._shieldQueued = true;
        e.preventDefault();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);

    // ---- arrastre (mouse/touch) para mirar ----
    this._onPointerDown = (e) => {
      this._drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      this.el.setPointerCapture?.(e.pointerId);
    };
    this._onPointerMove = (e) => {
      // con pointer lock: cualquier movimiento del mouse gira la cámara
      if (this._locked) {
        this.look.dx += (e.movementX || 0);
        this.look.dy += (e.movementY || 0);
        return;
      }
      // sin lock: arrastrar (mantener apretado) — fallback y para touch
      if (!this._drag || e.pointerId !== this._drag.id) return;
      const sens = e.pointerType === 'mouse' ? 1.0 : 0.7;
      this.look.dx += (e.clientX - this._drag.x) * sens;
      this.look.dy += (e.clientY - this._drag.y) * sens;
      this._drag.x = e.clientX;
      this._drag.y = e.clientY;
    };
    this._onPointerUp = (e) => {
      if (this._drag && e.pointerId === this._drag.id) this._drag = null;
    };

    // click en la escena → activar pointer lock (mirar moviendo el mouse)
    this._onClick = () => {
      if (!this._locked && this.el.requestPointerLock) this.el.requestPointerLock();
    };
    this._onLockChange = () => {
      this._locked = document.pointerLockElement === this.el;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.el.addEventListener('pointerdown', this._onPointerDown);
    this.el.addEventListener('pointermove', this._onPointerMove);
    this.el.addEventListener('pointerup', this._onPointerUp);
    this.el.addEventListener('pointercancel', this._onPointerUp);
    this.el.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  /** Pide pointer lock (debe llamarse dentro de un gesto del usuario). */
  lock() {
    if (this.el.requestPointerLock) this.el.requestPointerLock();
  }
  isLocked() {
    return this._locked;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  /** Vector de movimiento direccional en ejes de pantalla (x derecha, y adelante). */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    return { x, y, mag: Math.min(1, m) };
  }

  /** Devuelve y resetea el delta de mirada acumulado. */
  consumeLook() {
    const out = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = 0;
    this.look.dy = 0;
    return out;
  }

  shieldPressed() {
    if (this._shieldQueued) {
      this._shieldQueued = false;
      return true;
    }
    return false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.el.removeEventListener('pointerdown', this._onPointerDown);
    this.el.removeEventListener('pointermove', this._onPointerMove);
    this.el.removeEventListener('pointerup', this._onPointerUp);
    this.el.removeEventListener('pointercancel', this._onPointerUp);
    this.el.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
