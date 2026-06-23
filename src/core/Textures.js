import * as THREE from 'three';

/**
 * Textures.js — texturas procedurales (canvas), sin descargas.
 * Sirven para darle realismo barato a superficies grandes (piso) y a la
 * decoración (cuadros), manteniendo el repo liviano.
 */

/** Piso de madera: tablones con vetas, juntas y nudos. Tileable. */
export function woodFloorTexture(repeatX = 4, repeatY = 4) {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(0, 0, s, s);

  const planks = 5;
  const pw = s / planks;
  const tones = ['#9c6638', '#875530', '#a87142', '#7e5230', '#94613a'];

  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(i * pw, 0, pw, s);

    // vetas (líneas suaves a lo largo del tablón)
    for (let g = 0; g < 46; g++) {
      ctx.strokeStyle = `rgba(60,38,20,${0.04 + Math.random() * 0.07})`;
      ctx.lineWidth = 1;
      const y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(i * pw, y);
      ctx.bezierCurveTo(
        i * pw + pw * 0.3, y + (Math.random() - 0.5) * 7,
        i * pw + pw * 0.6, y + (Math.random() - 0.5) * 7,
        i * pw + pw, y + (Math.random() - 0.5) * 5
      );
      ctx.stroke();
    }

    // junta entre tablones
    ctx.fillStyle = 'rgba(38,24,12,0.55)';
    ctx.fillRect(i * pw, 0, 2, s);

    // algún nudo
    if (Math.random() < 0.6) {
      const x = i * pw + pw * (0.3 + Math.random() * 0.4);
      const y = Math.random() * s;
      const r = 3 + Math.random() * 4;
      ctx.fillStyle = 'rgba(48,28,14,0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.6, 0, 0, 7);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

/** Pasto: verde con manchas y briznas. Tileable, para el piso del jardín. */
export function grassTexture(repeat = 14) {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');

  // base con leve degradé
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#6fb84a');
  g.addColorStop(0.5, '#67b258');
  g.addColorStop(1, '#74c25a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  // manchas de tono (parches de pasto)
  const tones = ['#5da43f', '#7cc85e', '#83d066', '#5fae4c', '#6cbf52'];
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = tones[i % tones.length];
    ctx.globalAlpha = 0.10 + Math.random() * 0.18;
    const r = 6 + Math.random() * 26;
    ctx.beginPath();
    ctx.ellipse(Math.random() * s, Math.random() * s, r, r * 0.6, Math.random() * 3, 0, 7);
    ctx.fill();
  }

  // briznas finas
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const len = 3 + Math.random() * 5;
    ctx.strokeStyle = Math.random() < 0.5 ? '#4f9a38' : '#86d268';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - len);
    ctx.stroke();
  }

  // florcitas blancas/amarillas dispersas
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = ['#ffffff', '#fff0a8', '#ffd5e8'][i % 3];
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, 1.6 + Math.random() * 1.4, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

/** "Pinturas" para los cuadros. `index` elige el estilo (determinista). */
export function artTexture(index = 0) {
  const w = 256;
  const h = 192;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const style = index % 5;

  if (style === 0) {
    // atardecer
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffd28a');
    g.addColorStop(0.55, '#ff9e6b');
    g.addColorStop(1, '#7a4a8c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.42, 24, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#3a2a4a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.72);
    ctx.lineTo(w * 0.3, h * 0.8);
    ctx.lineTo(w * 0.55, h * 0.68);
    ctx.lineTo(w * 0.8, h * 0.82);
    ctx.lineTo(w, h * 0.72);
    ctx.lineTo(w, h);
    ctx.fill();
  } else if (style === 1) {
    // abstracto (bloques tipo Mondrian)
    const cols = ['#e0533f', '#f2b134', '#2f86c8', '#46b23a', '#9b59b6'];
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect((i * 53) % w, (i * 37) % h, 50 + ((i * 13) % 70), 44 + ((i * 17) % 56));
    }
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, ((i + 1) * h) / 5);
      ctx.lineTo(w, ((i + 1) * h) / 5);
      ctx.stroke();
    }
  } else if (style === 2) {
    // montañas
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#bfe3f5');
    g.addColorStop(1, '#e8f4ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6b8ca8';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.3, h * 0.38);
    ctx.lineTo(w * 0.62, h);
    ctx.fill();
    ctx.fillStyle = '#4a6b86';
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h);
    ctx.lineTo(w * 0.72, h * 0.5);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.38);
    ctx.lineTo(w * 0.24, h * 0.52);
    ctx.lineTo(w * 0.36, h * 0.52);
    ctx.fill();
  } else if (style === 3) {
    // mar
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9bd6f0');
    g.addColorStop(0.5, '#2f86c8');
    g.addColorStop(1, '#1b5e8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = h * 0.5 + i * 15;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin((x + i * 20) / 18) * 3);
      ctx.stroke();
    }
  } else {
    // jardín de flores
    ctx.fillStyle = '#cde8c0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3f8e58';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    const fc = ['#e0533f', '#f2b134', '#ffffff', '#ff8ac2'];
    for (let i = 0; i < 11; i++) {
      const x = 20 + (i * 53) % (w - 30);
      const y = h * 0.45 + (i * 29) % (h * 0.28);
      ctx.fillStyle = '#2f7a44';
      ctx.fillRect(x - 1, y, 2, 26);
      ctx.fillStyle = fc[i % fc.length];
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 7);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
