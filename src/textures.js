import * as THREE from 'three';

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function addNoise(g, w, h, alpha = 0.06) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
}

function finish(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function concreteTexture() {
  const c = makeCanvas(512);
  const g = c.getContext('2d');
  g.fillStyle = '#3e3e44';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      const shade = 58 + Math.random() * 22;
      g.fillStyle = `rgb(${shade}, ${shade}, ${shade - 4})`;
      g.fillRect(x + 3, y + 3, 122, 122);
      for (let i = 0; i < 10; i++) {
        g.fillStyle = `rgba(15,15,18,${Math.random() * 0.22})`;
        g.fillRect(x + Math.random() * 128, y + Math.random() * 128, 2, 1);
      }
    }
  }
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(25,20,15,${Math.random() * 0.16})`;
    g.beginPath();
    g.arc(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 18, 0, Math.PI * 2);
    g.fill();
  }
  addNoise(g, 512, 512, 0.05);
  return finish(c);
}

export function brickTexture() {
  const c = makeCanvas(512);
  const g = c.getContext('2d');
  g.fillStyle = '#241a14';
  g.fillRect(0, 0, 512, 512);
  const bw = 64, bh = 24;
  for (let y = 0; y < 512; y += bh) {
    const offset = ((y / bh) % 2) * bw / 2;
    for (let x = -bw; x < 512 + bw; x += bw) {
      const r = 95 + Math.random() * 38;
      const gr = 55 + Math.random() * 22;
      const b = 38 + Math.random() * 18;
      g.fillStyle = `rgb(${r}, ${gr}, ${b})`;
      g.fillRect(x + offset + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = `rgba(20,12,8,${Math.random() * 0.3})`;
      g.fillRect(x + offset + 4 + Math.random() * (bw - 12), y + 4 + Math.random() * (bh - 12), 2, 1);
    }
  }
  addNoise(g, 512, 512, 0.07);
  return finish(c);
}

export function metalPanelTexture() {
  const c = makeCanvas(512);
  const g = c.getContext('2d');
  g.fillStyle = '#3a3a44';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      const shade = 55 + Math.random() * 12;
      g.fillStyle = `rgb(${shade}, ${shade}, ${shade + 6})`;
      g.fillRect(x + 4, y + 4, 120, 120);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === 0 || i === 3 || j === 0 || j === 3) {
            g.fillStyle = '#1c1c24';
            g.beginPath();
            g.arc(x + 12 + i * 32, y + 12 + j * 32, 2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.15)';
            g.beginPath();
            g.arc(x + 11 + i * 32, y + 11 + j * 32, 1, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      g.strokeStyle = '#1a1a22';
      g.lineWidth = 1;
      g.strokeRect(x + 4, y + 4, 120, 120);
    }
  }
  addNoise(g, 512, 512, 0.035);
  return finish(c);
}

export function woodCrateTexture() {
  const c = makeCanvas(256);
  const g = c.getContext('2d');
  g.fillStyle = '#5a3a1a';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    const shade = 95 + Math.random() * 35;
    g.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.62)}, ${Math.floor(shade * 0.38)})`;
    g.fillRect(0, y + 1, 256, 62);
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(40, 22, 8, ${Math.random() * 0.32})`;
      g.fillRect(0, y + Math.random() * 64, 256, 1);
    }
    g.fillStyle = '#1a0e06';
    g.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = '#2a1808';
    g.beginPath();
    g.arc(20 + Math.random() * 216, 20 + Math.random() * 216, 3, 0, Math.PI * 2);
    g.fill();
  }
  addNoise(g, 256, 256, 0.05);
  return finish(c);
}

// ============ SKY ============

function drawCloud(g, cx, baseY, spanX, spanY, tint = 'rgba(255,255,255,1)', shadowColor = 'rgba(70,90,115,0.18)', highlight = null) {
  // soft shadow under cloud base
  const shadow = g.createRadialGradient(cx, baseY, 0, cx, baseY, spanX * 0.55);
  shadow.addColorStop(0, shadowColor);
  shadow.addColorStop(1, shadowColor.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = shadow;
  g.beginPath();
  g.ellipse(cx, baseY + spanY * 0.2, spanX * 0.55, spanY * 0.35, 0, 0, Math.PI * 2);
  g.fill();

  const m = tint.match(/(\d+),\s*(\d+),\s*(\d+)/);
  const baseR = m ? +m[1] : 235;
  const baseG = m ? +m[2] : 238;
  const baseB = m ? +m[3] : 242;

  const hm = highlight ? highlight.match(/(\d+),\s*(\d+),\s*(\d+)/) : null;
  const hiR = hm ? +hm[1] : 255;
  const hiG = hm ? +hm[2] : 252;
  const hiB = hm ? +hm[3] : 244;

  // dim under-belly puffs (drawn first, behind)
  const bellyCount = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < bellyCount; i++) {
    const ox = (Math.random() - 0.5) * spanX * 0.85;
    const oy = (Math.random() * 0.35) * spanY * 0.4;
    const r = 14 + Math.random() * 22;
    const dim = 0.78;
    const rr = Math.floor(baseR * dim);
    const gg = Math.floor(baseG * dim);
    const bb = Math.floor(baseB * dim);
    const pg = g.createRadialGradient(cx + ox, baseY + oy, 0, cx + ox, baseY + oy, r);
    pg.addColorStop(0, `rgba(${rr},${gg},${bb},0.32)`);
    pg.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    g.fillStyle = pg;
    g.beginPath(); g.arc(cx + ox, baseY + oy, r, 0, Math.PI * 2); g.fill();
  }

  // mid-body main puffs (cumulus shape)
  const puffCount = 32 + Math.floor(Math.random() * 14);
  for (let i = 0; i < puffCount; i++) {
    const ox = (Math.random() - 0.5) * spanX;
    const xNorm = Math.abs(ox) / (spanX * 0.5);
    const yBias = Math.random() ** 1.6;
    const cap = (1 - xNorm * 0.85) * spanY;
    const oy = -yBias * cap;
    const r = (12 + Math.random() * 26) * (1 - xNorm * 0.30);

    const topness = -oy / Math.max(1, spanY);
    const bAdj = Math.floor(topness * 18);
    const rr = Math.min(255, baseR + bAdj);
    const gg = Math.min(255, baseG + bAdj);
    const bb = Math.min(255, baseB + bAdj);
    const a = 0.26 + Math.random() * 0.20 + topness * 0.12;

    const pg = g.createRadialGradient(cx + ox, baseY + oy, 0, cx + ox, baseY + oy, r);
    pg.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`);
    pg.addColorStop(0.55, `rgba(${rr},${gg},${bb},${a * 0.55})`);
    pg.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    g.fillStyle = pg;
    g.beginPath(); g.arc(cx + ox, baseY + oy, r, 0, Math.PI * 2); g.fill();
  }

  // bright sunlit highlights on tops
  const hiCount = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < hiCount; i++) {
    const ox = (Math.random() - 0.5) * spanX * 0.7;
    const xNorm = Math.abs(ox) / (spanX * 0.5);
    const oy = -(0.65 + Math.random() * 0.3) * spanY * (1 - xNorm * 0.6);
    const r = 8 + Math.random() * 14;
    const a = 0.18 + Math.random() * 0.18;
    const pg = g.createRadialGradient(cx + ox, baseY + oy, 0, cx + ox, baseY + oy, r);
    pg.addColorStop(0, `rgba(${hiR},${hiG},${hiB},${a})`);
    pg.addColorStop(1, `rgba(${hiR},${hiG},${hiB},0)`);
    g.fillStyle = pg;
    g.beginPath(); g.arc(cx + ox, baseY + oy, r, 0, Math.PI * 2); g.fill();
  }
}

// Cube skybox — six flat faces, no pole singularity.
// Seam alignment: top/bottom face colors are derived from sideStops endpoints so
// adjacent face edges share the same RGB exactly (no visible joins where cube faces meet).
export function makeSkyCube(opts) {
  const size = 512;
  const zenithColor = opts.sideStops[0][1];
  const nadirColor = opts.sideStops[opts.sideStops.length - 1][1];

  function newCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  // soft per-pixel dither to break 8-bit gradient banding
  function sprinkleNoise(g, amount = 0.012, sub = 4) {
    for (let y = 0; y < size; y += sub) {
      for (let x = 0; x < size; x += sub) {
        const a = (Math.random() - 0.5) * amount;
        if (a > 0) g.fillStyle = `rgba(255,255,255,${a})`;
        else g.fillStyle = `rgba(0,0,0,${-a})`;
        g.fillRect(x, y, sub, sub);
      }
    }
  }

  const top = newCanvas();
  const gT = top.getContext('2d');
  gT.fillStyle = zenithColor;
  gT.fillRect(0, 0, size, size);
  sprinkleNoise(gT, 0.010);

  const bot = newCanvas();
  const gB = bot.getContext('2d');
  gB.fillStyle = nadirColor;
  gB.fillRect(0, 0, size, size);
  sprinkleNoise(gB, 0.010);

  function makeSide(seed) {
    const c = newCanvas();
    const g = c.getContext('2d');

    const grad = g.createLinearGradient(0, 0, 0, size);
    opts.sideStops.forEach(([p, color]) => grad.addColorStop(p, color));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    // atmospheric scattering halo: brighten center-low region of a chosen face
    if (opts.scatter && seed === opts.scatter.face) {
      const { x, y, color, radius } = opts.scatter;
      const sg = g.createRadialGradient(x, y, 0, x, y, radius);
      sg.addColorStop(0, color);
      sg.addColorStop(0.5, color.replace(/[\d.]+\)$/, m => `${parseFloat(m) * 0.4})`));
      sg.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
      g.fillStyle = sg;
      g.fillRect(0, 0, size, size);
    }

    if (opts.celestial && seed === opts.celestial.face) {
      const { x, y, color, radius, glow, glowColor, glowRadius } = opts.celestial;
      if (glow) {
        const gg = g.createRadialGradient(x, y, 0, x, y, glowRadius);
        gg.addColorStop(0, glowColor);
        gg.addColorStop(0.45, glowColor.replace(/[\d.]+\)$/, m => `${parseFloat(m) * 0.5})`));
        gg.addColorStop(1, glowColor.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = gg;
        g.fillRect(0, 0, size, size);
      }
      // outer corona
      const cg = g.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.4);
      cg.addColorStop(0, color);
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg;
      g.beginPath(); g.arc(x, y, radius * 2.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = color;
      g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.fill();
    }

    if (opts.clouds) {
      const cnf = opts.clouds;
      const perFace = cnf.perFace ?? 5;
      const tint = cnf.tint || 'rgba(235,238,242,1)';
      const shadow = cnf.shadow || 'rgba(70,90,115,0.18)';
      const highlight = cnf.highlight || 'rgba(255,252,244,1)';
      const yMin = cnf.yMin ?? 0.18;
      const ySpan = cnf.ySpan ?? 0.32;
      const margin = 60;
      for (let i = 0; i < perFace; i++) {
        const cx = margin + Math.random() * (size - margin * 2);
        const cy = size * (yMin + Math.random() * ySpan);
        const spanX = (cnf.spanX ?? 80) + Math.random() * (cnf.spanXVar ?? 90);
        const spanY = (cnf.spanY ?? 22) + Math.random() * (cnf.spanYVar ?? 22);
        drawCloud(g, cx, cy, spanX, spanY, tint, shadow, highlight);
      }
    }

    if (opts.overcast) {
      g.fillStyle = opts.overcast;
      g.fillRect(0, 0, size, size);
    }

    if (opts.haze) {
      const hz = g.createLinearGradient(0, size * 0.55, 0, size);
      hz.addColorStop(0, 'rgba(0,0,0,0)');
      hz.addColorStop(0.7, opts.haze);
      hz.addColorStop(1, opts.haze);
      g.fillStyle = hz;
      g.fillRect(0, size * 0.55, size, size * 0.45);
    }

    sprinkleNoise(g, 0.012);

    // re-fill the very top/bottom rows with exact endpoint colors so seam matches
    g.fillStyle = zenithColor;
    g.fillRect(0, 0, size, 1);
    g.fillStyle = nadirColor;
    g.fillRect(0, size - 1, size, 1);

    return c;
  }

  const px = makeSide('px');
  const nx = makeSide('nx');
  const pz = makeSide('pz');
  const nz = makeSide('nz');

  const tex = new THREE.CubeTexture([px, nx, top, bot, pz, nz]);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

export const SKY_PRESETS = {
  clearNoon: () => makeSkyCube({
    sideStops: [
      [0.00, '#1d5aa8'],
      [0.18, '#2f74c4'],
      [0.40, '#5a93d8'],
      [0.62, '#8db8e4'],
      [0.80, '#bcd6e8'],
      [0.93, '#dde6ec'],
      [1.00, '#a8b4b8'],
    ],
    scatter: { face: 'pz', x: 256, y: 410, color: 'rgba(255,240,200,0.32)', radius: 280 },
    clouds: {
      perFace: 6, yMin: 0.20, ySpan: 0.30,
      spanX: 70, spanXVar: 100, spanY: 18, spanYVar: 22,
      tint: 'rgba(240,244,250,1)', shadow: 'rgba(70,100,135,0.22)', highlight: 'rgba(255,253,245,1)',
    },
    haze: 'rgba(220,235,250,0.4)',
  }),
  cloudyAfternoon: () => makeSkyCube({
    sideStops: [
      [0.00, '#5e6874'],
      [0.22, '#727c88'],
      [0.50, '#8f99a4'],
      [0.78, '#aeb8c0'],
      [0.92, '#b6bec4'],
      [1.00, '#8a8e92'],
    ],
    clouds: {
      perFace: 11, yMin: 0.12, ySpan: 0.5,
      spanX: 110, spanXVar: 130, spanY: 28, spanYVar: 28,
      tint: 'rgba(200,208,218,1)', shadow: 'rgba(50,60,72,0.32)', highlight: 'rgba(232,236,242,1)',
    },
    haze: 'rgba(150,160,170,0.38)',
  }),
  sunset: () => makeSkyCube({
    sideStops: [
      [0.00, '#0e1638'],
      [0.18, '#2a1c52'],
      [0.36, '#5e2856'],
      [0.55, '#a83a4a'],
      [0.72, '#ea7438'],
      [0.86, '#f4a868'],
      [0.96, '#d68040'],
      [1.00, '#3a1c10'],
    ],
    celestial: {
      face: 'pz', x: 256, y: 360, color: '#ffd078', radius: 24,
      glow: true, glowColor: 'rgba(255,180,80,0.6)', glowRadius: 220,
    },
    scatter: { face: 'pz', x: 256, y: 420, color: 'rgba(255,140,60,0.35)', radius: 320 },
    clouds: {
      perFace: 6, yMin: 0.18, ySpan: 0.32,
      spanX: 80, spanXVar: 110, spanY: 22, spanYVar: 22,
      tint: 'rgba(238,160,108,1)', shadow: 'rgba(70,20,12,0.38)', highlight: 'rgba(255,210,150,1)',
    },
    haze: 'rgba(255,130,70,0.35)',
  }),
  foggyMorning: () => makeSkyCube({
    sideStops: [
      [0.00, '#9aa4ae'],
      [0.30, '#aeb6be'],
      [0.55, '#bec4ca'],
      [0.78, '#c6cad0'],
      [1.00, '#aeb2b4'],
    ],
    overcast: 'rgba(192,198,206,0.32)',
    scatter: { face: 'pz', x: 256, y: 360, color: 'rgba(248,242,220,0.28)', radius: 260 },
    haze: 'rgba(220,224,228,0.7)',
  }),
  snowyDay: () => makeSkyCube({
    sideStops: [
      [0.00, '#8e9aa4'],
      [0.25, '#a4b0ba'],
      [0.50, '#bdc6d0'],
      [0.74, '#d4dce2'],
      [0.92, '#dde4e8'],
      [1.00, '#c4ccd2'],
    ],
    clouds: {
      perFace: 9, yMin: 0.16, ySpan: 0.4,
      spanX: 95, spanXVar: 110, spanY: 24, spanYVar: 28,
      tint: 'rgba(224,230,236,1)', shadow: 'rgba(70,80,92,0.22)', highlight: 'rgba(248,252,255,1)',
    },
    haze: 'rgba(218,226,232,0.5)',
  }),
};

export function skyGradient() { return SKY_PRESETS.clearNoon(); }

// ============ PARTICLE SPRITES ============

export function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0.0, 'rgba(180,200,220,0)');
  grad.addColorStop(0.45, 'rgba(190,210,230,0.95)');
  grad.addColorStop(1.0, 'rgba(180,200,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(12, 12, 0, 12, 12, 12);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 24, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function dustTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(220,230,240,0.6)');
  grad.addColorStop(1, 'rgba(220,230,240,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
