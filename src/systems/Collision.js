import * as THREE from 'three';

/**
 * Collision.js — colisiones simples en el plano XZ.
 *
 * Para este juego alcanza con resolver al jugador (círculo) contra:
 *  - cajas alineadas a ejes (muebles, paredes): {type:'box', min:{x,z}, max:{x,z}}
 *  - círculos (props redondos): {type:'circle', x, z, r}
 *
 * resolveCircle() empuja la posición fuera del obstáculo más cercano y se puede
 * llamar varias veces por frame (una por collider) para resolver esquinas.
 */

/** Crea un collider de caja a partir de un mesh/-grupo y su AABB en XZ. */
export function boxColliderFromObject(object, padding = 0) {
  const box = new THREE.Box3().setFromObject(object);
  return {
    type: 'box',
    min: { x: box.min.x - padding, z: box.min.z - padding },
    max: { x: box.max.x + padding, z: box.max.z + padding },
  };
}

/** Collider de caja a partir de centro + tamaño (en XZ). */
export function boxCollider(cx, cz, sx, sz, padding = 0) {
  return {
    type: 'box',
    min: { x: cx - sx / 2 - padding, z: cz - sz / 2 - padding },
    max: { x: cx + sx / 2 + padding, z: cz + sz / 2 + padding },
  };
}

/** Empuja (x,z) fuera de un único collider. Devuelve [x,z] corregidos. */
function pushOut(x, z, r, c) {
  if (c.type === 'circle') {
    const dx = x - c.x;
    const dz = z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + r;
    if (d < min && d > 1e-5) {
      const k = min / d;
      return [c.x + dx * k, c.z + dz * k];
    }
    return [x, z];
  }
  // caja: punto más cercano de la AABB al centro del círculo
  const nx = Math.max(c.min.x, Math.min(x, c.max.x));
  const nz = Math.max(c.min.z, Math.min(z, c.max.z));
  const dx = x - nx;
  const dz = z - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 > r * r) return [x, z]; // sin contacto

  if (d2 > 1e-8) {
    // fuera de la caja pero dentro del radio → empujar por la normal
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    return [x + dx * k, z + dz * k];
  }
  // centro dentro de la caja → empujar por el eje de menor penetración
  const toLeft = x - c.min.x;
  const toRight = c.max.x - x;
  const toBack = z - c.min.z;
  const toFront = c.max.z - z;
  const m = Math.min(toLeft, toRight, toBack, toFront);
  if (m === toLeft) return [c.min.x - r, z];
  if (m === toRight) return [c.max.x + r, z];
  if (m === toBack) return [x, c.min.z - r];
  return [x, c.max.z + r];
}

/** Resuelve el círculo (x,z,r) contra todos los colliders.
 *  Itera varias veces para estabilizar esquinas (evita que el jugador se trabe
 *  oscilando entre dos colliders vecinos). */
export function resolveCircle(x, z, r, colliders) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const c of colliders) {
      const nx = pushOut(x, z, r, c);
      if (nx[0] !== x || nx[1] !== z) moved = true;
      x = nx[0];
      z = nx[1];
    }
    if (!moved) break;
  }
  return [x, z];
}
