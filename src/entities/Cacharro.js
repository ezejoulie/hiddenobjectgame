import * as THREE from 'three';
import { CACHARRO_TIPOS } from '../data/cacharros.js';

/**
 * Cacharro.js — un criadero recogible. Recipiente PBR con un disco de "agua"
 * adentro, un aro indicador que aparece cuando el jugador está cerca, y un
 * leve flote. Al juntarlo, se anima hacia arriba y desaparece.
 */

const aguaMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x35bdf2, roughness: 0.15, metalness: 0, emissive: 0x0a3550, emissiveIntensity: 0.3 });
const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function discoAgua(radio, y) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(radio, 20), aguaMat());
  d.rotation.x = -Math.PI / 2;
  d.position.y = y;
  return d;
}

/** Devuelve un grupo con el recipiente según el tipo (origen en el piso). */
function construir(tipo, color) {
  const g = new THREE.Group();
  const cuerpoMat = mat(color, 0.5);

  switch (tipo) {
    case 'balde':
    case 'tacho': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.34, 18, 1, true), cuerpoMat);
      c.position.y = 0.17;
      const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18), mat(0x1b1f24));
      fondo.rotation.x = -Math.PI / 2;
      fondo.position.y = 0.01;
      g.add(c, fondo, discoAgua(0.2, 0.3));
      break;
    }
    case 'florero': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.34, 16), cuerpoMat);
      c.position.y = 0.17;
      const boca = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.06, 16), cuerpoMat);
      boca.position.y = 0.36;
      g.add(c, boca, discoAgua(0.085, 0.32));
      break;
    }
    case 'botella': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 14), mat(color, 0.2));
      c.position.set(0, 0.08, 0);
      c.rotation.z = Math.PI / 2;
      const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.1, 12), mat(color, 0.2));
      cuello.position.set(0.2, 0.08, 0);
      cuello.rotation.z = Math.PI / 2;
      g.add(c, cuello);
      break;
    }
    case 'lata':
    case 'frasco':
    case 'vaso': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.26, 16, 1, true), mat(color, tipo === 'lata' ? 0.3 : 0.15, tipo === 'lata' ? 0.6 : 0));
      c.position.y = 0.13;
      const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), mat(0x9aa7b2));
      fondo.rotation.x = -Math.PI / 2;
      fondo.position.y = 0.01;
      g.add(c, fondo, discoAgua(0.085, 0.22));
      break;
    }
    case 'bebedero': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.1, 18, 1, true), cuerpoMat);
      c.position.y = 0.05;
      const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), mat(0xd84845));
      fondo.rotation.x = -Math.PI / 2;
      fondo.position.y = 0.01;
      g.add(c, fondo, discoAgua(0.21, 0.08));
      break;
    }
    case 'maceta': {
      const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.05, 18), mat(0xe8884a));
      plato.position.y = 0.025;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.26, 16), mat(color));
      pot.position.y = 0.18;
      g.add(plato, discoAgua(0.24, 0.05), pot);
      break;
    }
    case 'regadera': {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.26), mat(color, 0.4));
      c.position.y = 0.16;
      const pico = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.34, 10), mat(color, 0.4));
      pico.rotation.z = Math.PI / 3;
      pico.position.set(-0.28, 0.26, 0);
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 16, Math.PI), mat(color, 0.4));
      asa.position.y = 0.3;
      g.add(c, pico, asa, discoAgua(0.14, 0.29));
      break;
    }
    default: {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.28, 16), cuerpoMat);
      c.position.y = 0.14;
      g.add(c, discoAgua(0.13, 0.28));
    }
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export class Cacharro {
  constructor(tipo, x, z) {
    this.tipo = tipo;
    this.info = CACHARRO_TIPOS[tipo] || { nombre: tipo, tip: '', color: 0x27aae1 };
    this.collected = false;
    this.collecting = 0; // animación de recogida (0..1)
    this.position = new THREE.Vector3(x, 0, z);
    this.phase = Math.random() * 6.28;

    this.group = new THREE.Group();
    this.body = construir(tipo, this.info.color);
    this.group.add(this.body);

    // aro indicador en el piso
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 28), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    this.group.add(this.ring);

    this.group.position.set(x, 0, z);
  }

  update(dt, t, playerPos) {
    if (this.collected) return;

    if (this.collecting > 0) {
      this.collecting = Math.min(1, this.collecting + dt * 2.2);
      const k = this.collecting;
      this.body.position.y = k * 1.4;
      this.body.rotation.y += dt * 10;
      const s = Math.max(0.001, 1 - k);
      this.body.scale.setScalar(s);
      this.ring.visible = false;
      if (this.collecting >= 1) {
        this.collected = true;
        this.group.visible = false;
      }
      return;
    }

    // flote suave
    this.body.position.y = Math.sin(t * 1.6 + this.phase) * 0.04 + 0.04;
    this.body.rotation.y = Math.sin(t * 0.5 + this.phase) * 0.2;

    // aro de cercanía
    const d = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);
    const near = d < 3;
    this.ring.visible = near;
    if (near) {
      const p = 1 + Math.sin(t * 5) * 0.12;
      this.ring.scale.set(p, p, 1);
      this.ring.material.opacity = 0.4 + Math.sin(t * 5) * 0.3;
    }
  }

  startCollect() {
    if (this.collected || this.collecting > 0) return false;
    this.collecting = 0.001;
    return true;
  }
}
