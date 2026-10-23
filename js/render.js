'use strict';
/* Mesin render: satu fungsi renderPaper() dipakai untuk preview DAN ekspor,
   jadi hasil unduhan identik dengan yang terlihat. Semua koordinat dalam
   piksel 300 DPI; `scale` mengubahnya ke ukuran kanvas sebenarnya. */

const PI2 = Math.PI * 2;
const MEAS = document.createElement('canvas').getContext('2d');
const pathCache = {};
const P = d => pathCache[d] || (pathCache[d] = new Path2D(d));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getSlots(L, st) {
  let slots = [];
  if (L.custom) {
    slots = L.custom.map(([x, y, w, h]) => ({ x, y, w, h }));
  } else {
    const pad = L.pad * st.padScale, gap = L.gap * st.gapScale;
    const cw = Math.max(40, (L.w - 2 * pad - (L.cols - 1) * gap) / L.cols);
    const ch = Math.max(40, (L.h - 2 * pad - L.footer - (L.rows - 1) * gap) / L.rows);
    for (let r = 0; r < L.rows; r++)
      for (let c = 0; c < L.cols; c++)
        slots.push({ x: pad + c * (cw + gap), y: pad + r * (ch + gap), w: cw, h: ch });
  }
  const sh = L.shape || 'rect';
  if (sh === 'rect' || sh === 'rounded') return slots;
  return slots.map(s => { const m = Math.min(s.w, s.h); return { x: s.x + (s.w - m) / 2, y: s.y + (s.h - m) / 2, w: m, h: m }; });
}

/* Path bentuk slot foto; g = pembesaran (untuk bingkai foto) */
const SHAPE_D = { heart: SHAPES.heart.paths[0].d, star: SHAPES.star.paths[0].d };
function shapePath(s, kind, r, g) {
  const x = s.x - g, y = s.y - g, w = s.w + 2 * g, h = s.h + 2 * g, p = new Path2D();
  if (kind === 'circle') { p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, PI2); return p; }
  if (SHAPE_D[kind]) { p.addPath(P(SHAPE_D[kind]), new DOMMatrix([w / 100, 0, 0, h / 100, x, y])); return p; }
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

/* ---------- Filter warna (matriks 3×4, setara CSS filter) ---------- */
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function matMul(b, a) { // terapkan a lalu b
  const r = new Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) r[i * 4 + j] = b[i * 4] * a[j] + b[i * 4 + 1] * a[4 + j] + b[i * 4 + 2] * a[8 + j];
    r[i * 4 + 3] = b[i * 4] * a[3] + b[i * 4 + 1] * a[7] + b[i * 4 + 2] * a[11] + b[i * 4 + 3];
  }
  return r;
}
function opMatrix(n, v) {
  const c = Math.cos(v * Math.PI / 180), s = Math.sin(v * Math.PI / 180);
  switch (n) {
    case 'grayscale': { const k = 1 - Math.min(1, v); return [.2126 + .7874 * k, .7152 - .7152 * k, .0722 - .0722 * k, 0, .2126 - .2126 * k, .7152 + .2848 * k, .0722 - .0722 * k, 0, .2126 - .2126 * k, .7152 - .7152 * k, .0722 + .9278 * k, 0]; }
    case 'sepia': { const k = 1 - Math.min(1, v); return [.393 + .607 * k, .769 - .769 * k, .189 - .189 * k, 0, .349 - .349 * k, .686 + .314 * k, .168 - .168 * k, 0, .272 - .272 * k, .534 - .534 * k, .131 + .869 * k, 0]; }
    case 'saturate': return [.213 + .787 * v, .715 - .715 * v, .072 - .072 * v, 0, .213 - .213 * v, .715 + .285 * v, .072 - .072 * v, 0, .213 - .213 * v, .715 - .715 * v, .072 + .928 * v, 0];
    case 'hue-rotate': return [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, 0, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, 0, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072, 0];
    case 'brightness': return [v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0];
    case 'contrast': { const o = 127.5 * (1 - v); return [v, 0, 0, o, 0, v, 0, o, 0, 0, v, o]; }
    default: return IDENT;
  }
}
function filterOps(st) {
  const f = FILTERS.find(f => f.id === st.filter) || FILTERS[0];
  return [...f.ops, ['brightness', st.bright], ['contrast', st.contrast], ['saturate', st.sat]];
}
function filterMatrix(ops) { return ops.reduce((m, [n, v]) => matMul(opMatrix(n, v), m), IDENT); }
function toCss(ops) { return ops.map(([n, v]) => `${n}(${v}${n === 'hue-rotate' ? 'deg' : ''})`).join(' ') || 'none'; }

/* ---------- Foto di dalam slot (di-cache supaya drag stiker tetap mulus) ---------- */
const slotCache = new Map();

function stepDown(src, sx, sy, sw, sh, W, H) {
  let cur = src, cx = sx, cy = sy, cw = sw, ch = sh;
  while (cw > W * 2) {
    const nw = Math.max(W, Math.ceil(cw / 2)), nh = Math.max(H, Math.ceil(ch / 2));
    const t = document.createElement('canvas');
    t.width = nw; t.height = nh;
    const tx = t.getContext('2d');
    tx.imageSmoothingQuality = 'high';
    tx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
    cur = t; cx = 0; cy = 0; cw = nw; ch = nh;
  }
  return { cur, cx, cy, cw, ch };
}

function stampText() {
  const d = new Date();
  return `'${String(d.getFullYear()).slice(2)} ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}`;
}

function buildSlot(photo, W, H, st) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  const src = photo.canvas, sr = src.width / src.height, dr = W / H;
  let sx = 0, sy = 0, sw = src.width, sh = src.height;
  if (sr > dr) { sw = sh * dr; sx = (src.width - sw) / 2; } else { sh = sw / dr; sy = (src.height - sh) / 2; }
  x.imageSmoothingQuality = 'high';
  if (st.mirror && photo.src === 'cam') { x.translate(W, 0); x.scale(-1, 1); }
  if (st.fitAll && Math.abs(sr - dr) > .02) {
    /* foto utuh: latar blur dari foto itu sendiri + foto penuh di tengah */
    const sm = document.createElement('canvas');
    sm.width = Math.max(2, W >> 4); sm.height = Math.max(2, H >> 4);
    const smx = sm.getContext('2d'); smx.imageSmoothingQuality = 'high';
    smx.drawImage(src, sx, sy, sw, sh, 0, 0, sm.width, sm.height);
    x.drawImage(sm, 0, 0, W, H);
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, W, H);
    const k = Math.min(W / src.width, H / src.height), dw = Math.round(src.width * k), dh = Math.round(src.height * k);
    const f = stepDown(src, 0, 0, src.width, src.height, dw, dh);
    x.drawImage(f.cur, f.cx, f.cy, f.cw, f.ch, Math.round((W - dw) / 2), Math.round((H - dh) / 2), dw, dh);
  } else {
    const d = stepDown(src, sx, sy, sw, sh, W, H);
    x.drawImage(d.cur, d.cx, d.cy, d.cw, d.ch, 0, 0, W, H);
  }
  x.setTransform(1, 0, 0, 1, 0, 0);

  const m = filterMatrix(filterOps(st));
  const grain = st.grain * 70;
  const identity = m.every((v, i) => v === IDENT[i]);
  if (!identity || grain) {
    const img = x.getImageData(0, 0, W, H), p = img.data, rnd = rng(photo.id * 7919 + W);
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2], n = grain ? (rnd() - .5) * grain : 0;
      p[i] = m[0] * r + m[1] * g + m[2] * b + m[3] + n;
      p[i + 1] = m[4] * r + m[5] * g + m[6] * b + m[7] + n;
      p[i + 2] = m[8] * r + m[9] * g + m[10] * b + m[11] + n;
    }
    x.putImageData(img, 0, 0);
  }

  if (st.glow > 0) {
    const a = document.createElement('canvas');
    a.width = Math.max(2, W >> 4); a.height = Math.max(2, H >> 4);
    const ax = a.getContext('2d');
    ax.imageSmoothingQuality = 'high';
    ax.drawImage(c, 0, 0, a.width, a.height);
    x.save();
    x.globalCompositeOperation = 'screen';
    x.globalAlpha = st.glow * .65;
    x.imageSmoothingQuality = 'high';
    x.drawImage(a, 0, 0, W, H);
    x.restore();
  }
  if (st.vignette > 0) {
    const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.hypot(W, H) * .55);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${st.vignette * .85})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  if (st.leak) {
    const g = x.createLinearGradient(W, 0, W * .25, H * .75);
    g.addColorStop(0, 'rgba(255,140,60,.8)');
    g.addColorStop(.45, 'rgba(255,60,120,.3)');
    g.addColorStop(1, 'rgba(255,60,120,0)');
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
  }
  if (st.stamp) {
    x.save();
    x.font = `700 ${Math.round(H * .07)}px "Courier New",monospace`;
    x.textAlign = 'right'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#ff9a2e'; x.shadowColor = 'rgba(255,110,0,.85)'; x.shadowBlur = H * .02;
    x.fillText(stampText(), W - H * .05, H - H * .05);
    x.restore();
  }
  return c;
}

function getSlotImage(photo, sw, sh, scale, st) {
  const W = Math.max(2, Math.round(sw * scale)), H = Math.max(2, Math.round(sh * scale));
  const key = [photo.id, W, H, st.filter, st.bright, st.contrast, st.sat, st.vignette, st.grain, st.glow, st.leak, st.stamp, st.fitAll, st.mirror && photo.src === 'cam'].join('|');
  let c = slotCache.get(key);
  if (!c) {
    c = buildSlot(photo, W, H, st);
    slotCache.set(key, c);
    if (slotCache.size > 24) slotCache.delete(slotCache.keys().next().value);
  } else { slotCache.delete(key); slotCache.set(key, c); }
  return c;
}

/* ---------- Latar belakang & pola ---------- */
function drawPattern(ctx, w, h, type, bg, fg) {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg; ctx.strokeStyle = fg;
  switch (type) {
    case 'dots': {
      const s = 46;
      for (let y = 0, r = 0; y < h + s; y += s, r++)
        for (let x = (r % 2) * s / 2; x < w + s; x += s) { ctx.beginPath(); ctx.arc(x, y, 7, 0, PI2); ctx.fill(); }
      break;
    }
    case 'stripes':
      ctx.lineWidth = 18;
      for (let i = -h; i < w + h; i += 52) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
      break;
    case 'checker': {
      const s = 44;
      for (let y = 0; y * s < h; y++) for (let x = 0; x * s < w; x++) if ((x + y) % 2) ctx.fillRect(x * s, y * s, s, s);
      break;
    }
    case 'gingham':
      ctx.globalAlpha = .4;
      for (let y = 0; y < h; y += 80) ctx.fillRect(0, y, w, 40);
      for (let x = 0; x < w; x += 80) ctx.fillRect(x, 0, 40, h);
      ctx.globalAlpha = 1;
      break;
    case 'hearts': case 'stars': {
      const s = 84, path = P(type === 'hearts' ? SHAPES.heart.paths[0].d : SHAPES.star.paths[0].d);
      for (let y = 0, r = 0; y < h + s; y += s, r++)
        for (let x = (r % 2) * s / 2; x < w + s; x += s) {
          ctx.save(); ctx.translate(x, y); ctx.scale(.24, .24); ctx.translate(-50, -50); ctx.fill(path); ctx.restore();
        }
      break;
    }
    case 'grid':
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      break;
  }
}

function drawBackground(ctx, w, h, fr) {
  ctx.save();
  if (fr.bgType === 'gradient') {
    const a = (fr.angle - 90) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    const half = (Math.abs(w * cs) + Math.abs(h * sn)) / 2;
    const g = ctx.createLinearGradient(w / 2 - cs * half, h / 2 - sn * half, w / 2 + cs * half, h / 2 + sn * half);
    g.addColorStop(0, fr.c1); g.addColorStop(1, fr.c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (fr.bgType === 'pattern') {
    drawPattern(ctx, w, h, fr.pattern, fr.c1, fr.patFg);
  } else if (fr.bgType === 'image' && fr.bgImg) {
    const im = fr.bgImg, ir = im.width / im.height, dr = w / h;
    let sw = im.width, sh = im.height, sx = 0, sy = 0;
    if (ir > dr) { sw = sh * dr; sx = (im.width - sw) / 2; } else { sh = sw / dr; sy = (im.height - sh) / 2; }
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    ctx.fillStyle = fr.c1; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawEdgeStyle(ctx, L, fr, pad) {
  if (fr.style === 'none') return;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = fr.styleColor;
  if (fr.style === 'line') {
    ctx.lineWidth = 5; ctx.strokeRect(16, 16, L.w - 32, L.h - 32);
  } else if (fr.style === 'double') {
    ctx.lineWidth = 6; ctx.strokeRect(14, 14, L.w - 28, L.h - 28);
    ctx.lineWidth = 2; ctx.strokeRect(30, 30, L.w - 60, L.h - 60);
  } else if (fr.style === 'dots') {
    const s = 30, i = 16;
    for (let x = i; x <= L.w - i + 1; x += s) for (const y of [i, L.h - i]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, PI2); ctx.fill(); }
    for (let y = i + s; y < L.h - i; y += s) for (const x of [i, L.w - i]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, PI2); ctx.fill(); }
  } else if (fr.style === 'corners') {
    const a = 90, i = 22;
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (const [x, y, dx, dy] of [[i, i, 1, 1], [L.w - i, i, -1, 1], [i, L.h - i, 1, -1], [L.w - i, L.h - i, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x + dx * a, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * a); ctx.stroke();
    }
  } else if (fr.style === 'scallop') {
    const r = 15, s = r * 2;
    for (let x = r; x < L.w + r; x += s) for (const y of [0, L.h]) { ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill(); }
    for (let y = r; y < L.h + r; y += s) for (const x of [0, L.w]) { ctx.beginPath(); ctx.arc(x, y, r, 0, PI2); ctx.fill(); }
  } else if (fr.style === 'hearts') {
    const s = 44, hs = 22 / 100, heart = P(SHAPES.heart.paths[0].d);
    const put = (x, y) => { ctx.save(); ctx.translate(x, y); ctx.scale(hs, hs); ctx.translate(-50, -50); ctx.fill(heart); ctx.restore(); };
    for (let x = 22; x <= L.w - 22 + 1; x += s) { put(x, 20); put(x, L.h - 20); }
    for (let y = 20 + s; y < L.h - 20; y += s) { put(20, y); put(L.w - 20, y); }
  } else if (fr.style === 'film') {
    const hw = Math.max(10, Math.min(28, pad * .45)), hh = hw * 1.4, step = hh * 2.1;
    for (let y = step / 2 - hh / 2; y < L.h; y += step)
      for (const x of [(pad - hw) / 2, L.w - pad + (pad - hw) / 2]) { rrect(ctx, x, y, hw, hh, hw * .25); ctx.fill(); }
  }
  ctx.restore();
}

/* ---------- Efek overlay ---------- */
function drawFx(ctx, L, st) {
  if (st.fx === 'none') return;
  const rnd = rng(1234 + st.fx.charCodeAt(0) * 97);
  const n = Math.round(48 * st.fxAmount * (L.w * L.h) / (600 * 1800));
  const pick = a => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < n; i++) {
    const x = rnd() * L.w, y = rnd() * L.h, r = rnd();
    ctx.save();
    switch (st.fx) {
      case 'bokeh':
        ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .12 + rnd() * .25;
        ctx.fillStyle = pick(['#ffffff', '#ffd1e8', '#fff3b0', '#c9e7ff']);
        ctx.beginPath(); ctx.arc(x, y, 14 + r * 46, 0, PI2); ctx.fill(); break;
      case 'sparkle':
        ctx.globalAlpha = .55 + rnd() * .45; ctx.fillStyle = '#ffffff';
        ctx.translate(x, y); ctx.rotate(rnd() * .6); ctx.scale((10 + r * 30) / 50, (10 + r * 30) / 50); ctx.translate(-50, -50);
        ctx.fill(P(SHAPES.sparkle.paths[0].d)); break;
      case 'confetti':
        ctx.fillStyle = pick(['#ff5d8f', '#ffd84d', '#5dd6ff', '#8f7bff', '#5dff9a', '#ff9a5d']);
        ctx.translate(x, y); ctx.rotate(rnd() * PI2);
        ctx.fillRect(-7, -14 * (.5 + r), 14, 28 * (.5 + r)); break;
      case 'hearts': {
        const s = (22 + r * 40) / 100;
        ctx.globalAlpha = .55 + rnd() * .4; ctx.fillStyle = pick(['#ff5d8f', '#ff8fb8', '#ffc2d9', '#ff3d6e']);
        ctx.translate(x, y); ctx.rotate((rnd() - .5) * .8); ctx.scale(s, s); ctx.translate(-50, -50);
        ctx.fill(P(SHAPES.heart.paths[0].d)); break;
      }
      case 'snow':
        ctx.globalAlpha = .55 + rnd() * .4; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, 3 + r * 8, 0, PI2); ctx.fill(); break;
    }
    ctx.restore();
  }
}

/* ---------- Elemen (stiker / teks / gambar) ---------- */
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function elFont(el) { return `${el.bold ? '700 ' : ''}${el.size}px "${el.font}",sans-serif`; }

function elBox(el) {
  switch (el.type) {
    case 'text': MEAS.font = elFont(el); return { w: Math.max(20, MEAS.measureText(el.content || ' ').width), h: el.size * 1.25 };
    case 'image': return { w: el.size, h: el.size * el.ar };
    case 'emoji': return { w: el.size * 1.15, h: el.size * 1.15 };
    default: return { w: el.size, h: el.size };
  }
}

function drawElement(ctx, el, scale) {
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot * Math.PI / 180);
  if (el.flip) ctx.scale(-1, 1);
  ctx.globalAlpha = el.opacity;
  if (el.shadow) { ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14 * scale; ctx.shadowOffsetY = 5 * scale; }
  if (el.type === 'emoji') {
    ctx.font = `${el.size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(el.content, 0, el.size * .06);
  } else if (el.type === 'shape') {
    const sh = SHAPES[el.content];
    ctx.scale(el.size / 100, el.size / 100); ctx.translate(-50, -50);
    for (const p of sh.paths) {
      ctx.fillStyle = p.fill || el.color;
      ctx.fill(P(p.d), p.rule || 'nonzero');
      if (el.outline) { ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.stroke(P(p.d)); }
    }
  } else if (el.type === 'text') {
    ctx.font = elFont(el);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (el.outline) { ctx.lineWidth = el.size * .16; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.strokeText(el.content, 0, 0); }
    ctx.fillStyle = el.color;
    ctx.fillText(el.content, 0, 0);
  } else if (el.type === 'image') {
    const b = elBox(el);
    ctx.drawImage(el.img, -b.w / 2, -b.h / 2, b.w, b.h);
  }
  ctx.restore();
}

/* posisi handle dalam koordinat lokal elemen (dipakai menggambar & hit-test) */
function handlePos(el, k) {
  const b = elBox(el), pad = 10 / k, hr = 12 / k;
  return {
    hr, pad, b,
    scale: { x: b.w / 2 + pad, y: b.h / 2 + pad },
    rotate: { x: 0, y: -b.h / 2 - pad - hr * 2.6 },
    del: { x: -b.w / 2 - pad, y: -b.h / 2 - pad },
  };
}

function drawSelection(ctx, el, k) {
  const h = handlePos(el, k);
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot * Math.PI / 180);
  ctx.lineWidth = 2 / k; ctx.strokeStyle = '#ff5d8f'; ctx.setLineDash([8 / k, 6 / k]);
  ctx.strokeRect(-h.b.w / 2 - h.pad, -h.b.h / 2 - h.pad, h.b.w + 2 * h.pad, h.b.h + 2 * h.pad);
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(0, -h.b.h / 2 - h.pad); ctx.lineTo(h.rotate.x, h.rotate.y); ctx.stroke();
  for (const [name, glyph] of [['scale', '⤢'], ['rotate', '↻'], ['del', '✕']]) {
    const p = h[name];
    ctx.beginPath(); ctx.arc(p.x, p.y, h.hr, 0, PI2);
    ctx.fillStyle = name === 'del' ? '#ff4d4d' : '#ffffff'; ctx.fill();
    ctx.lineWidth = 2 / k; ctx.strokeStyle = '#ff5d8f'; ctx.stroke();
    ctx.fillStyle = name === 'del' ? '#fff' : '#ff5d8f';
    ctx.font = `700 ${h.hr * 1.3}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, p.x, p.y + h.hr * .08);
  }
  ctx.restore();
}

/* ---------- Teks footer ---------- */
function drawFooterText(ctx, L, st, slotsBottom) {
  const t = st.text;
  const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const line2 = [t.sub, t.showDate ? date : ''].filter(Boolean).join(' • ');
  const title = t.title.trim();
  if (!title && !line2) return;
  const rem = L.h - slotsBottom;
  let fs = Math.min(rem * .36, L.w * .13) * t.scale;
  ctx.save();
  ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (title) {
    ctx.font = `${fs}px "${t.font}",sans-serif`;
    const mw = ctx.measureText(title).width, maxW = L.w * .88;
    if (mw > maxW) { fs *= maxW / mw; ctx.font = `${fs}px "${t.font}",sans-serif`; }
  }
  const sf = Math.min(fs * .42, L.w * .04) * (title ? 1 : 2.2);
  const cy = slotsBottom + rem / 2 - ((title && line2) ? 0 : 0);
  if (title && line2) {
    ctx.font = `${fs}px "${t.font}",sans-serif`;
    ctx.fillText(title, L.w / 2, cy - sf * .7);
    ctx.globalAlpha = .8;
    ctx.font = `${sf}px "${t.font}",sans-serif`;
    ctx.fillText(line2, L.w / 2, cy + fs * .5 + sf * .1);
  } else if (title) {
    ctx.font = `${fs}px "${t.font}",sans-serif`;
    ctx.fillText(title, L.w / 2, cy);
  } else {
    ctx.font = `${sf}px "${t.font}",sans-serif`;
    ctx.fillText(line2, L.w / 2, cy);
  }
  ctx.restore();
}

/* ---------- Satu lembar (unit) & seluruh kertas ---------- */
function drawUnit(ctx, L, st, scale, opts, first) {
  const pad = L.pad * st.padScale, fr = st.frame;
  drawBackground(ctx, L.w, L.h, fr);
  drawEdgeStyle(ctx, L, fr, pad);

  const slots = getSlots(L, st);
  let bottom = 0;
  slots.forEach((s, i) => {
    bottom = Math.max(bottom, s.y + s.h);
    const photo = st.photos[i];
    const sh = L.shape || 'rect', kind = sh === 'rounded' || sh === 'square' ? 'rect' : sh;
    const rad = sh === 'rounded' ? Math.min(s.w, s.h) * .2 : fr.radius;
    if (!photo) {
      ctx.save();
      ctx.fillStyle = 'rgba(128,128,128,.18)'; ctx.fill(shapePath(s, kind, rad, 0));
      ctx.fillStyle = 'rgba(128,128,128,.6)'; ctx.font = '700 60px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), s.x + s.w / 2, s.y + s.h / 2);
      ctx.restore();
      return;
    }
    const bw = fr.pBorder;
    if (bw > 0 || fr.shadow) {
      ctx.save();
      if (fr.shadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18 * scale; ctx.shadowOffsetY = 6 * scale; }
      ctx.fillStyle = bw > 0 ? fr.pBorderColor : '#000';
      ctx.fill(shapePath(s, kind, rad + bw, bw));
      ctx.restore();
    }
    ctx.save();
    ctx.clip(shapePath(s, kind, rad, 0));
    ctx.drawImage(getSlotImage(photo, s.w, s.h, scale, st), s.x, s.y, s.w, s.h);
    ctx.restore();
  });

  drawFooterText(ctx, L, st, bottom);
  drawFx(ctx, L, st);
  for (const el of st.elements) drawElement(ctx, el, scale);
  if (opts.ui && first) {
    const sel = st.elements.find(e => e.id === st.selected);
    if (sel) drawSelection(ctx, sel, opts.k || 1);
  }
}

function renderPaper(ctx, scale, st, opts = {}) {
  const L = LAYOUTS[st.layoutId], n = (L.dup && st.dup) ? 2 : 1;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, (opts.ox || 0) * scale, (opts.oy || 0) * scale);
  for (let c = 0; c < n; c++) {
    ctx.save();
    ctx.translate(c * L.w, 0);
    ctx.beginPath(); ctx.rect(0, 0, L.w, L.h); ctx.clip();
    drawUnit(ctx, L, st, scale, opts, c === 0);
    ctx.restore();
  }
  if (n === 2) { // garis potong tipis di tengah
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,.35)'; ctx.lineWidth = 2; ctx.setLineDash([14, 14]);
    ctx.beginPath(); ctx.moveTo(L.w, 0); ctx.lineTo(L.w, L.h); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- Metadata DPI agar ukuran cetak otomatis benar ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

async function setPngDpi(blob, dpi) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(buf.length + 21);
  out.set(buf.subarray(0, 33)); out.set(chunk, 33); out.set(buf.subarray(33), 54); // setelah signature + IHDR
  return new Blob([out], { type: 'image/png' });
}

async function setJpegDpi(blob, dpi) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf[2] === 0xFF && buf[3] === 0xE0 && buf[6] === 0x4A) { // JFIF sudah ada
    buf[13] = 1; buf[14] = dpi >> 8; buf[15] = dpi & 255; buf[16] = dpi >> 8; buf[17] = dpi & 255;
    return new Blob([buf], { type: 'image/jpeg' });
  }
  const app0 = new Uint8Array([0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
  const out = new Uint8Array(buf.length + app0.length);
  out.set(buf.subarray(0, 2)); out.set(app0, 2); out.set(buf.subarray(2), 2 + app0.length);
  return new Blob([out], { type: 'image/jpeg' });
}
