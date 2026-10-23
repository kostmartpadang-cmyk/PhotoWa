'use strict';
/* UI, kamera, interaksi kanvas, dan ekspor. Tidak ada yang disimpan:
   semua state hidup di memori halaman ini saja. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const state = {
  step: 'frame', layoutId: 'strip4', dup: false,
  photos: [], mirror: true,
  filter: 'normal', bright: 1, contrast: 1, sat: 1, vignette: 0, grain: 0, glow: 0, leak: false, stamp: false,
  padScale: 1, gapScale: 1,
  frame: { ...FRAME_DEFAULT },
  text: { title: 'PHOTOBOOTH', sub: '', showDate: true, font: 'Poppins', color: '#222222', scale: 1 },
  fx: 'none', fxAmount: 1,
  elements: [], selected: null,
  timer: 3, sound: true, zoom: 1, landCanvas: false, fitAll: false, fullStrip: false,
  dl: { fmt: 'png', dpi: 300, q: 0.95 },
};
let photoSeq = 1, elSeq = 1;

const LY = () => LAYOUTS[state.layoutId];
const count = () => LY().count;
const filled = () => state.photos.slice(0, count()).filter(Boolean).length;
const paperSize = () => { const l = LY(); return { w: l.w * (l.dup && state.dup ? 2 : 1), h: l.h }; };
/* mode 1 strip: strip ditaruh di tengah kertas 4×6 dengan ruang kosong kiri-kanan */
const centered = () => LY().dup && !state.dup && !state.fullStrip;
/* layout lanskap: opsional diletakkan di tengah kanvas potret 4×6 */
const landCanvas = () => LY().w > LY().h && state.landCanvas;
const outSize = () => { const pz = paperSize(); return landCanvas() ? { w: 1200, h: 1800 } : { w: centered() ? pz.w * 2 : pz.w, h: pz.h }; };
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const k = p.split('.'); const last = k.pop(); k.reduce((a, x) => a[x], o)[last] = v; };
const fmtVal = v => typeof v !== 'number' ? '' : (Number.isInteger(v) || Math.abs(v) >= 10 ? String(Math.round(v)) : v.toFixed(2));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* =====================================================================
   Foto
   ===================================================================== */
function setPhoto(i, canvas, src) {
  const th = document.createElement('canvas');
  const k = Math.min(1, 360 / canvas.width);
  th.width = Math.round(canvas.width * k); th.height = Math.round(canvas.height * k);
  th.getContext('2d').drawImage(canvas, 0, 0, th.width, th.height);
  state.photos[i] = { id: photoSeq++, canvas, src, thumb: th.toDataURL('image/jpeg', .7) };
}

async function fileToCanvas(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { bmp = await createImageBitmap(file); }
  const k = Math.min(1, 3600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

function targetSlots() {
  const n = count();
  if (retakeIdx != null) return [retakeIdx];
  const empty = [...Array(n).keys()].filter(i => !state.photos[i]);
  return empty.length ? empty : [...Array(n).keys()];
}

async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  const targets = targetSlots();
  if (list.length > targets.length) toast(`Hanya ${targets.length} foto pertama yang dipakai.`);
  for (let k = 0; k < Math.min(list.length, targets.length); k++) {
    try { setPhoto(targets[k], await fileToCanvas(list[k]), 'file'); }
    catch { toast('Gambar tidak bisa dibaca: ' + list[k].name); }
  }
  retakeIdx = null;
  afterPhotosChanged();
  if (filled() === count()) goStep('edit');
}

function makeDemo() {
  const emo = ['😎', '🥳', '😍', '🤩', '😜', '🥰'];
  const targets = [...Array(count()).keys()];
  targets.forEach(i => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1600, 1200);
    g.addColorStop(0, `hsl(${(i * 67 + 330) % 360},85%,72%)`); g.addColorStop(1, `hsl(${(i * 67 + 20) % 360},85%,62%)`);
    x.fillStyle = g; x.fillRect(0, 0, 1600, 1200);
    x.fillStyle = 'rgba(255,255,255,.25)';
    for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(200 + k * 190, 160 + (k % 3) * 400, 90, 0, 7); x.fill(); }
    x.font = '640px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emo[i % emo.length], 800, 620);
    setPhoto(i, c, 'demo');
  });
  retakeIdx = null;
  afterPhotosChanged();
  goStep('edit');
}

function afterPhotosChanged() {
  refreshThumbs(); refreshChips(); refreshPhotoPane(); updateNav(); requestRender();
}

/* =====================================================================
   Kamera
   ===================================================================== */
const video = $('#video');
let stream = null, facing = 'user', wantCam = false;
let shooting = false, cancelFlag = false, retakeIdx = null, curIdx = -1;

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    camError('Browser ini tidak mendukung kamera, atau halaman tidak dibuka lewat HTTPS. Kamu tetap bisa mengunggah foto.');
    return;
  }
  try {
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
    });
    video.srcObject = stream;
    await video.play();
    wantCam = true;
    $('#camPh').hidden = true;
    updateVideoStyle();
  } catch (e) {
    const m = {
      NotAllowedError: 'Akses kamera ditolak. Izinkan kamera lewat ikon gembok di address bar, lalu coba lagi.',
      NotFoundError: 'Kamera tidak ditemukan di perangkat ini.',
      NotReadableError: 'Kamera sedang dipakai aplikasi lain.',
    }[e.name] || 'Kamera tidak bisa diaktifkan (' + e.name + ').';
    camError(m + ' Kamu juga bisa mengunggah foto.');
  }
}
function camError(msg) {
  $('#camPh').hidden = false;
  $('#camMsg').innerHTML = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null; video.srcObject = null;
}
function updateVideoStyle() {
  video.style.filter = toCss(filterOps(state));
  updateCamAspect();
}
let camRot = 0, camExtra = 0;
function applyVideoTransform(car) {
  const mir = state.mirror && facing === 'user' ? 'scaleX(-1) ' : '';
  const side = camRot % 180 !== 0;
  video.style.width = side ? (100 / car) + '%' : '100%';
  video.style.height = side ? (car * 100) + '%' : '100%';
  video.style.transform = `translate(-50%,-50%) ${mir}rotate(${camRot}deg)`;
}
function updateCamAspect() {
  const slot = getSlots(LY(), state)[0], sar = slot.w / slot.h;
  const live = stream && video.videoWidth > 0;
  /* otomatis: layout lanskap -> kamera diputar jadi lanskap (dan sebaliknya); camExtra = putaran manual tambahan */
  const vp = live && video.videoWidth < video.videoHeight, vl = live && video.videoWidth > video.videoHeight;
  const base = live && ((sar > 1.1 && vp) || (sar < .9 && vl)) ? 90 : 0;
  camRot = (base + camExtra) % 360;
  const side = camRot % 180 !== 0;
  const car = live ? (side ? video.videoHeight / video.videoWidth : video.videoWidth / video.videoHeight) : sar;
  const cam = $('#cam'), g = $('#guide');
  cam.style.setProperty('--ar', car.toFixed(4));
  applyVideoTransform(car);
  /* kamera tampil utuh (tanpa zoom); kotak putus-putus = area yang akan masuk ke frame */
  const gw = sar > car ? 100 : sar / car * 100, gh = sar > car ? car / sar * 100 : 100;
  g.style.width = gw + '%'; g.style.height = gh + '%';
  g.hidden = !live || state.fitAll;
  const sh = LY().shape;
  g.style.borderRadius = sh === 'circle' ? '50%' : sh === 'rounded' ? '12%' : '0';
}

let actx;
function beep(f = 660, d = .09, type = 'sine', vol = .15) {
  if (!state.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d);
  } catch { /* audio opsional */ }
}

function captureFrame(i) {
  const vw = video.videoWidth, vh = video.videoHeight, side = camRot % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = side ? vh : vw; c.height = side ? vw : vh;
  const x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2); x.rotate(camRot * Math.PI / 180);
  x.drawImage(video, -vw / 2, -vh / 2);
  const d = x.getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40).data;
  let sum = 0; for (let k = 0; k < d.length; k += 4) sum += d[k] + d[k + 1] + d[k + 2];
  if (sum < 40) toast('Foto tampak hitam — pastikan kamera sudah menyala dan tidak tertutup.');
  setPhoto(i, c, facing === 'user' ? 'cam' : 'back');
}

async function runSession() {
  if (shooting) { cancelFlag = true; return; }
  if (!stream) { toast('Aktifkan kamera dulu, atau unggah foto.'); return; }
  const n = count();
  let targets = targetSlots();
  if (retakeIdx == null && filled() === n) state.photos.fill(null, 0, n);
  shooting = true; cancelFlag = false;
  updateShootBtn();
  const countEl = $('#count');
  for (const i of targets) {
    curIdx = i; refreshThumbs(); updateBadge();
    for (let t = state.timer; t > 0 && !cancelFlag; t--) {
      countEl.textContent = t;
      countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop');
      beep(660);
      await sleep(1000);
    }
    countEl.textContent = '';
    if (cancelFlag) break;
    beep(1200, .06, 'square', .08);
    const f = $('#flash'); f.classList.add('go'); setTimeout(() => f.classList.remove('go'), 260);
    captureFrame(i);
    afterPhotosChanged();
    await sleep(1100);
  }
  const aborted = cancelFlag;
  shooting = false; cancelFlag = false; curIdx = -1; retakeIdx = null;
  updateShootBtn(); updateBadge(); refreshThumbs();
  if (!aborted && filled() === n) { await sleep(400); goStep('edit'); }
}

function updateShootBtn() {
  const b = $('#btnShoot');
  b.classList.toggle('stop', shooting);
  b.title = shooting ? 'Hentikan' : 'Mulai berfoto';
}
function updateBadge() {
  const b = $('#shotBadge');
  if (shooting) { b.hidden = false; b.textContent = `Foto ${curIdx + 1} / ${count()}`; }
  else if (retakeIdx != null) { b.hidden = false; b.textContent = `Ambil ulang foto ${retakeIdx + 1}`; }
  else b.hidden = true;
}

function refreshThumbs() {
  const n = count(), s = getSlots(LY(), state)[0];
  $('#thumbs').innerHTML = Array.from({ length: n }, (_, i) => {
    const p = state.photos[i];
    const cls = ['th', p ? 'has' : '', curIdx === i || retakeIdx === i ? 'cur' : ''].join(' ');
    const mir = p && state.mirror && p.src === 'cam' ? 'transform:scaleX(-1)' : '';
    return `<button class="${cls}" data-th="${i}" style="aspect-ratio:${(s.w / s.h).toFixed(3)}">${p ? `<img src="${p.thumb}" style="${mir}" alt="Foto ${i + 1}">` : `<span>${i + 1}</span>`}</button>`;
  }).join('');
}

/* =====================================================================
   Navigasi langkah
   ===================================================================== */
function updateNav() {
  const none = filled() === 0;
  $$('#steps button').forEach(b => {
    b.classList.toggle('on', b.dataset.step === state.step);
    b.disabled = (b.dataset.step === 'edit' || b.dataset.step === 'download') && none;
  });
}

function goStep(s) {
  const late = s === 'edit' || s === 'download';
  if (late && filled() === 0) { toast('Ambil atau unggah foto dulu.'); return; }
  if (late && filled() < count()) toast('Masih ada slot kosong — kamu bisa isi nanti lewat tab Foto.');
  if (shooting) cancelFlag = true;
  state.step = s;
  if (s !== 'edit') state.selected = null;
  $('#v-frame').hidden = s !== 'frame';
  $('#v-capture').hidden = s !== 'capture';
  $('#v-edit').hidden = !late;
  $('#editPanel').hidden = s !== 'edit';
  $('#dlPanel').hidden = s !== 'download';
  $('#hint').hidden = s !== 'edit';
  if (s === 'capture') {
    updateCamAspect(); refreshThumbs(); updateBadge();
    if (wantCam && !stream) startCamera();
  } else {
    stopCamera();
    if (wantCam) {
      $('#camPh').hidden = false;
      $('#camMsg').innerHTML = 'Kamera dimatikan sementara.';
    }
    if (s === 'edit') {
      $('#btnBack').textContent = '← Foto'; $('#btnNext').textContent = 'Lanjut: Unduh →';
    } else if (s === 'download') {
      $('#btnBack').textContent = '← Edit'; $('#btnNext').textContent = 'Unduh sekarang ⬇';
      buildDownload();
    }
    fitCanvas();
  }
  buildElBar(); updateNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================================
   Kanvas edit & interaksi
   ===================================================================== */
const cv = $('#cv'), cx = cv.getContext('2d');
const cvF = $('#cvFrame'), cxF = cvF.getContext('2d');
let cssScale = 1, previewScale = 1, raf = 0, drag = null;

function fitCanvas() {
  if (state.step === 'capture') return;
  const pz = paperSize(), c = state.step === 'frame' ? cvF : cv, stage = c.parentElement;
  const availW = Math.max(200, stage.clientWidth - 8) * (innerWidth < 900 ? .72 : 1);
  const mobile = innerWidth < 900;
  const availH = mobile ? Math.max(260, innerHeight * .5) : Math.max(280, innerHeight - 200);
  cssScale = Math.min(availW / pz.w, availH / pz.h) * state.zoom;
  previewScale = Math.min(1, cssScale * Math.min(2, devicePixelRatio || 1));
  c.width = Math.round(pz.w * previewScale); c.height = Math.round(pz.h * previewScale);
  c.style.width = pz.w * cssScale + 'px'; c.style.height = pz.h * cssScale + 'px';
  requestRender();
}
function requestRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (state.step !== 'capture') try { renderPaper(state.step === 'frame' ? cxF : cx, previewScale, state, { ui: state.step === 'edit', k: cssScale }); }
    catch (err) { console.error(err); toast('Gagal menggambar: ' + err.message); } }); }

const selEl = () => state.elements.find(e => e.id === state.selected);
function select(id) { state.selected = id; buildElBar(); requestRender(); }

function toPaper(e) {
  const r = cv.getBoundingClientRect(), pz = paperSize();
  return { x: (e.clientX - r.left) / r.width * pz.w, y: (e.clientY - r.top) / r.height * pz.h };
}
function toUnit(p) { const w = LY().w, off = Math.floor(p.x / w) * w; return { x: p.x - off, y: p.y, off }; }
function toLocal(el, u) {
  const a = -el.rot * Math.PI / 180, dx = u.x - el.x, dy = u.y - el.y;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}
function elementAt(u) {
  for (let i = state.elements.length - 1; i >= 0; i--) {
    const el = state.elements[i], b = elBox(el), l = toLocal(el, u);
    if (Math.abs(l.x) <= b.w / 2 + 6 && Math.abs(l.y) <= b.h / 2 + 6) return el;
  }
  return null;
}

cv.addEventListener('pointerdown', e => {
  if (state.step !== 'edit') return;
  const p = toPaper(e), u = toUnit(p), sel = selEl();
  if (sel) {
    const h = handlePos(sel, cssScale), l = toLocal(sel, u);
    const hit = n => Math.hypot(l.x - h[n].x, l.y - h[n].y) <= h.hr * 1.7;
    if (hit('del')) { removeEl(sel); return; }
    if (hit('scale') || hit('rotate')) {
      drag = { mode: hit('scale') ? 'scale' : 'rotate', el: sel, off: u.off, size: sel.size, d: Math.hypot(u.x - sel.x, u.y - sel.y) || 1 };
      cv.setPointerCapture(e.pointerId); return;
    }
  }
  const el = elementAt(u);
  if (el) {
    select(el.id);
    drag = { mode: 'move', el, x: el.x, y: el.y, p0: p };
    cv.setPointerCapture(e.pointerId);
  } else select(null);
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = toPaper(e), el = drag.el, l = LY();
  if (drag.mode === 'move') {
    el.x = Math.max(-100, Math.min(l.w + 100, drag.x + p.x - drag.p0.x));
    el.y = Math.max(-100, Math.min(l.h + 100, drag.y + p.y - drag.p0.y));
  } else if (drag.mode === 'scale') {
    el.size = Math.max(20, Math.min(2400, drag.size * Math.hypot(p.x - drag.off - el.x, p.y - el.y) / drag.d));
  } else {
    let a = Math.atan2(p.y - el.y, p.x - drag.off - el.x) * 180 / Math.PI + 90;
    if (a > 180) a -= 360;
    for (const s of [-180, -90, -45, 0, 45, 90, 180]) if (Math.abs(a - s) < 4) a = s;
    el.rot = a;
  }
  syncBar(); requestRender();
});
const endDrag = () => { drag = null; };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

document.addEventListener('keydown', e => {
  if (state.step !== 'edit' || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const el = selEl(); if (!el) return;
  const d = e.shiftKey ? 20 : 4;
  if (e.key === 'Delete' || e.key === 'Backspace') { removeEl(el); e.preventDefault(); }
  else if (e.key.startsWith('Arrow')) {
    if (e.key === 'ArrowLeft') el.x -= d; if (e.key === 'ArrowRight') el.x += d;
    if (e.key === 'ArrowUp') el.y -= d; if (e.key === 'ArrowDown') el.y += d;
    e.preventDefault(); requestRender();
  } else if (e.key === 'Escape') select(null);
});

/* ---------- Elemen ---------- */
function addElement(props) {
  if (state.step !== 'edit') { toast('Buka langkah Edit untuk menambah elemen.'); return; }
  const l = LY(), j = () => (Math.random() - .5) * 60;
  const el = {
    id: elSeq++, x: l.w / 2 + j(), y: l.h / 2 + j(), rot: 0, flip: false, opacity: 1,
    shadow: false, outline: false, color: '#ff5d8f', font: 'Poppins', bold: false, size: 150, ...props,
  };
  state.elements.push(el);
  select(el.id);
}
const baseSize = () => Math.min(Math.min(LY().w, 1200) * .25, LY().h * .18);
function removeEl(el) {
  state.elements = state.elements.filter(e => e !== el);
  select(null);
}

function buildElBar() {
  const bar = $('#elBar'), el = selEl();
  if (!el || state.step !== 'edit') { bar.hidden = true; return; }
  bar.hidden = false;
  const txt = el.type === 'text', shp = el.type === 'shape';
  const names = { emoji: 'Stiker', shape: 'Bentuk', text: 'Teks', image: 'Gambar' };
  bar.innerHTML = `
    <div class="bar-row"><b>${names[el.type]} terpilih</b>
      <span class="grow"></span>
      <button data-act="flip" title="Balik">⇋</button>
      <button data-act="dup" title="Gandakan">⧉</button>
      <button data-act="front" title="Ke depan">▲</button>
      <button data-act="back" title="Ke belakang">▼</button>
      <button data-act="del" class="danger" title="Hapus">🗑</button>
    </div>
    ${txt ? `<div class="bar-row"><input type="text" data-el="content" maxlength="60" placeholder="Teks…">
      <select data-el="font">${FONTS.map(f => `<option value="${f.name}">${f.label}</option>`).join('')}</select></div>` : ''}
    <div class="bar-grid">
      <label class="sl"><span>Ukuran</span><input type="range" data-el="size" min="20" max="1200" step="1"></label>
      <label class="sl"><span>Putar</span><input type="range" data-el="rot" min="-180" max="180" step="1"></label>
      <label class="sl"><span>Transparan</span><input type="range" data-el="opacity" min="0.1" max="1" step="0.05"></label>
    </div>
    <div class="bar-row wrap">
      ${txt || shp ? '<label class="colr"><span>Warna</span><input type="color" data-el="color"></label>' : ''}
      ${txt ? '<label class="chk"><input type="checkbox" data-el="bold"> Tebal</label>' : ''}
      ${txt || shp ? '<label class="chk"><input type="checkbox" data-el="outline"> Garis tepi</label>' : ''}
      <label class="chk"><input type="checkbox" data-el="shadow"> Bayangan</label>
    </div>`;
  syncBar(true);
}
function syncBar(force) {
  const el = selEl(); if (!el) return;
  $$('[data-el]', $('#elBar')).forEach(i => {
    if (!force && document.activeElement === i) return;
    const v = el[i.dataset.el];
    if (i.type === 'checkbox') i.checked = !!v; else i.value = v;
  });
}
$('#elBar').addEventListener('input', e => {
  const el = selEl(), t = e.target; if (!el || !t.dataset.el) return;
  el[t.dataset.el] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
  requestRender();
});
$('#elBar').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'), el = selEl(); if (!b || !el) return;
  const arr = state.elements, i = arr.indexOf(el);
  switch (b.dataset.act) {
    case 'flip': el.flip = !el.flip; break;
    case 'dup': { const c = { ...el, id: elSeq++, x: el.x + 30, y: el.y + 30 }; arr.push(c); state.selected = c.id; buildElBar(); break; }
    case 'front': if (i < arr.length - 1) { arr.splice(i, 1); arr.push(el); } break;
    case 'back': if (i > 0) { arr.splice(i, 1); arr.unshift(el); } break;
    case 'del': removeEl(el); return;
  }
  requestRender();
});

/* =====================================================================
   Panel edit
   ===================================================================== */
const sl = (label, bind, min, max, step) => `<label class="sl"><span>${label}<output></output></span><input type="range" data-bind="${bind}" min="${min}" max="${max}" step="${step}"></label>`;
const ck = (label, bind) => `<label class="chk"><input type="checkbox" data-bind="${bind}"> ${label}</label>`;
const colr = (label, bind) => `<label class="colr"><span>${label}</span><input type="color" data-bind="${bind}"></label>`;
const fontOpts = FONTS.map(f => `<option value="${f.name}">${f.label}</option>`).join('');

const TABS = [
  ['photo', 'Foto', '📷', () => `${ck('Foto utuh (jangan dipotong)', 'fitAll')}<div id="photoList"></div>`],
  ['filter', 'Filter', '🎨', () => `
    <div class="chips" data-filters></div>
    ${sl('Kecerahan', 'bright', .5, 1.5, .01)}${sl('Kontras', 'contrast', .5, 1.5, .01)}${sl('Saturasi', 'sat', 0, 2, .01)}
    ${sl('Vinyet', 'vignette', 0, 1, .01)}${sl('Grain film', 'grain', 0, 1, .01)}${sl('Cahaya lembut (glow)', 'glow', 0, 1, .01)}
    <div class="opts">${ck('Mode cermin (foto selfie)', 'mirror')}${ck('Light leak', 'leak')}${ck('Cap tanggal retro', 'stamp')}</div>`],
  ['frame', 'Frame', '🖼️', () => `
    <h4>Tema</h4><div class="presets" data-presets></div>
    <h4>Latar</h4>
    <div class="bgc" id="bgc" data-t="solid">
      <select data-bind="frame.bgType"><option value="solid">Warna polos</option><option value="gradient">Gradien</option><option value="pattern">Pola</option><option value="image">Gambar sendiri</option></select>
      <div class="row2">${colr('Warna', 'frame.c1')}<span class="if-gradient">${colr('Warna 2', 'frame.c2')}</span><span class="if-pattern">${colr('Warna pola', 'frame.patFg')}</span></div>
      <div class="if-gradient">${sl('Sudut', 'frame.angle', 0, 360, 1)}</div>
      <label class="if-pattern sel"><span>Pola</span><select data-bind="frame.pattern">${PATTERNS.map(p => `<option value="${p[0]}">${p[1]}</option>`).join('')}</select></label>
      <div class="if-image"><label class="btn ghost">Pilih gambar latar<input type="file" id="bgFile" accept="image/*" hidden></label></div>
    </div>
    <h4>Hiasan tepi</h4>
    <div class="row2"><select data-bind="frame.style"><option value="none">Tanpa</option><option value="line">Garis</option><option value="double">Garis ganda</option><option value="dots">Titik-titik</option><option value="hearts">Hati</option><option value="scallop">Bergelombang</option><option value="corners">Sudut</option><option value="film">Rol film</option></select>${colr('Warna', 'frame.styleColor')}</div>
    <h4>Foto</h4>
    ${sl('Margin', 'padScale', .5, 2, .01)}${sl('Jarak antar foto', 'gapScale', 0, 2.5, .01)}${sl('Sudut membulat', 'frame.radius', 0, 140, 1)}${sl('Tebal bingkai foto', 'frame.pBorder', 0, 30, 1)}
    <div class="row2">${colr('Warna bingkai foto', 'frame.pBorderColor')}${ck('Bayangan', 'frame.shadow')}</div>`],
  ['sticker', 'Stiker', '⭐', () => `
    <div class="chips cats" id="emojiCats">${Object.keys(EMOJI).map((k, i) => `<button class="chip sm${i ? '' : ' on'}" data-cat="${k}">${k}</button>`).join('')}</div>
    <div class="egrid" id="emojiGrid"></div>
    <h4>Bentuk &amp; ikon</h4>
    <div class="row2">${'<label class="colr"><span>Warna bentuk</span><input type="color" id="shapeColor" value="#ff5d8f"></label>'}</div>
    <div class="sgrid" id="shapeGrid"></div>
    <h4>Stiker gambar</h4>
    <div class="sgrid" id="imgStickers">${STICKER_IMAGES.map((m, i) => `<button class="shp" data-imgsticker="${i}" title="${m.name}"><img src="${m.src}" alt="${m.name}" style="width:100%;display:block"></button>`).join('')}</div>
    <h4>Gambar / logo sendiri</h4>
    <label class="btn ghost">Unggah gambar (PNG, JPG, SVG)<input type="file" id="imgFile" accept="image/*" hidden></label>`],
  ['text', 'Teks', '🔤', () => `
    <h4>Teks bawah</h4>
    <input type="text" data-bind="text.title" placeholder="Judul" maxlength="40">
    <input type="text" data-bind="text.sub" placeholder="Sub judul (opsional)" maxlength="50">
    <div class="row2"><select data-bind="text.font">${fontOpts}</select>${colr('Warna', 'text.color')}</div>
    ${sl('Ukuran', 'text.scale', .5, 1.6, .01)}${ck('Tampilkan tanggal', 'text.showDate')}
    <h4>Teks bebas</h4>
    <input type="text" id="freeText" placeholder="Tulis sesuatu…" maxlength="60">
    <div class="row2"><select id="freeFont">${fontOpts}</select><label class="colr"><span>Warna</span><input type="color" id="freeColor" value="#ff5d8f"></label></div>
    <button class="btn primary full" id="btnAddText">+ Tambah teks ke foto</button>
    <div class="chips quick">${['Best Day Ever', 'Love You', 'Squad Goals', 'Happy Birthday', 'Mr & Mrs', 'Besties', 'Selamat!'].map(t => `<button class="chip sm" data-quick="${t}">${t}</button>`).join('')}</div>`],
  ['fx', 'Efek', '✨', () => `
    <div class="chips fxs">${FX.map(f => `<button class="chip fx" data-fx="${f.id}"><span>${f.ico}</span>${f.name}</button>`).join('')}</div>
    ${sl('Jumlah', 'fxAmount', .3, 2.5, .1)}
    <p class="mut">Efek tampil di atas foto dan di bawah stiker. Cocok dipadukan dengan Light leak &amp; Glow di tab Filter.</p>`],
];

let curTab = 'photo', emojiCat = 'Imut';

function buildPanel() {
  $('#tabs').innerHTML = TABS.map(t => `<button data-tab="${t[0]}"><span>${t[2]}</span>${t[1]}</button>`).join('');
  $('#tabBody').innerHTML = TABS.map(t => `<div class="pane" data-pane="${t[0]}" hidden>${t[3]()}</div>`).join('');
  showTab('filter');

  const presetsHtml = FRAME_PRESETS.map(p => `<button class="pre" data-preset="${p.id}"><img src="${presetThumb(p)}" alt=""><span>${p.name}</span></button>`).join('');
  $$('[data-presets]').forEach(el => { el.innerHTML = presetsHtml; });

  const sg = $('#shapeGrid');
  sg.innerHTML = Object.entries(SHAPES).map(([k, s]) => `<button class="shp" data-shape="${k}" title="${s.name}"><svg viewBox="0 0 100 100">${s.paths.map(p => `<path d="${p.d}" fill="${p.fill || 'currentColor'}" fill-rule="${p.rule || 'nonzero'}"/>`).join('')}</svg></button>`).join('');
  sg.style.color = '#ff5d8f';
  showEmoji();
  updateFxChips();
}

function presetThumb(p) {
  const c = document.createElement('canvas'); c.width = 60; c.height = 90;
  const x = c.getContext('2d'), fr = { ...FRAME_DEFAULT, ...p.frame };
  x.scale(.1, .1);
  drawBackground(x, 600, 900, fr);
  drawEdgeStyle(x, { w: 600, h: 900 }, fr, 40);
  for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(110,110,120,.55)'; rrect(x, 60, 60 + i * 230, 480, 200, fr.radius); x.fill(); }
  x.fillStyle = p.text.color; x.globalAlpha = .9; rrect(x, 150, 790, 300, 36, 18); x.fill();
  return c.toDataURL();
}

function showTab(id) {
  curTab = id;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  $$('.pane').forEach(p => p.hidden = p.dataset.pane !== id);
  if (id === 'photo') refreshPhotoPane();
}

function showEmoji() {
  $('#emojiGrid').innerHTML = EMOJI[emojiCat].map(e => `<button data-emoji="${e}">${e}</button>`).join('');
  $$('#emojiCats .chip').forEach(c => c.classList.toggle('on', c.dataset.cat === emojiCat));
}

function updateFxChips() { $$('[data-fx]').forEach(b => b.classList.toggle('on', b.dataset.fx === state.fx)); }

function rotatePhoto(i, deg) {
  const p = state.photos[i]; if (!p) return;
  const src = p.canvas, side = deg % 180 !== 0, c = document.createElement('canvas');
  c.width = side ? src.height : src.width; c.height = side ? src.width : src.height;
  const x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2); x.rotate(deg * Math.PI / 180);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  setPhoto(i, c, p.src);
  afterPhotosChanged();
}

function refreshPhotoPane() {
  const box = $('#photoList'); if (!box) return;
  const sl = getSlots(LY(), state)[0], wantLandscape = sl.w / sl.h > 1.2;
  const bad = state.photos.slice(0, count()).some(p => p && wantLandscape && p.canvas.width < p.canvas.height);
  box.innerHTML = (bad ? '<p class="warn">Layout ini lanskap tetapi fotomu portrait, jadi hanya potongan tengahnya yang terlihat. Centang “Foto utuh” di atas atau putar fotonya dengan ⟲ / ⟳.</p>' : '') + Array.from({ length: count() }, (_, i) => {
    const p = state.photos[i];
    return `<div class="prow"><div class="pth">${p ? `<img src="${p.thumb}" alt="">` : '<span>—</span>'}</div>
      <div class="pmeta"><b>Foto ${i + 1}</b><small>${p ? `${p.canvas.width}×${p.canvas.height} px` : 'Kosong'}</small></div>
      ${p ? `<button class="btn ghost sm" data-rotp="${i}:270" title="Putar kiri">⟲</button><button class="btn ghost sm" data-rotp="${i}:90" title="Putar kanan">⟳</button>` : ''}
      <button class="btn ghost sm" data-retake="${i}">${p ? 'Ulangi' : 'Ambil'}</button></div>`;
  }).join('') + '<p class="mut">Ulangi memakai kamera atau unggah foto pengganti di langkah 2.</p>';
}

/* chip filter (dipakai di langkah 1 & tab Filter) */
function sampleThumb() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 96;
  const x = c.getContext('2d'), p = state.photos.find(Boolean);
  if (p) {
    const s = p.canvas, k = Math.min(s.width, s.height);
    x.drawImage(s, (s.width - k) / 2, (s.height - k) / 2, k, k, 0, 0, 96, 96);
  } else {
    const g = x.createLinearGradient(0, 0, 96, 96);
    g.addColorStop(0, '#ff9a8b'); g.addColorStop(.5, '#a1c4fd'); g.addColorStop(1, '#f6d365');
    x.fillStyle = g; x.fillRect(0, 0, 96, 96);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(48, 44, 22, 0, 7); x.fill();
  }
  return c.toDataURL('image/jpeg', .8);
}
function refreshChips() {
  const url = sampleThumb();
  $$('[data-filters]').forEach(box => {
    box.innerHTML = FILTERS.map(f => `<button class="chip ph${f.id === state.filter ? ' on' : ''}" data-filter="${f.id}"><img src="${url}" style="filter:${toCss(f.ops)}" alt=""><span>${f.name}</span></button>`).join('');
  });
}

function layoutCards() {
  return Object.entries(LAYOUTS).map(([id, l]) => {
    const sl = getSlots(l, { padScale: 1, gapScale: 1 }), sh = l.shape || 'rect';
    const cells = sl.map(c => `<i class="sh-${sh}" style="left:${c.x / l.w * 100}%;top:${c.y / l.h * 100}%;width:${c.w / l.w * 100}%;height:${c.h / l.h * 100}%"></i>`).join('');
    return `<button class="lay${id === state.layoutId ? ' on' : ''}" data-layout="${id}">
    <div class="lay-ico" style="aspect-ratio:${l.w}/${l.h}">${cells}</div>
    <span>${l.name}</span><small>${l.desc}</small></button>`;
  }).join('');
}

function setLayout(id) {
  state.layoutId = id;
  const l = LY();
  state.elements.forEach(e => { e.x = Math.min(e.x, l.w); e.y = Math.min(e.y, l.h); });
  $$('[data-layouts]').forEach(b => b.innerHTML = layoutCards());
  $$('.dup-wrap').forEach(w => w.hidden = !l.dup);
  updateCamAspect(); refreshThumbs(); refreshPhotoPane();
  if (state.step !== 'capture') { fitCanvas(); if (state.step === 'download') buildDownload(); }
}

function applyPreset(id) {
  const p = FRAME_PRESETS.find(x => x.id === id), img = state.frame.bgImg;
  state.frame = { ...FRAME_DEFAULT, bgImg: img, ...p.frame };
  Object.assign(state.text, p.text);
  syncBinds();
  $('#bgc').dataset.t = state.frame.bgType;
  $$('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === id));
  requestRender();
}

function loadImageFile(file, maxSide = 1600) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const w = im.naturalWidth || 300, h = im.naturalHeight || 300, k = Math.min(1, maxSide / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('gagal')); };
    im.src = url;
  });
}

/* ---------- binding generik ---------- */
function syncBinds() {
  $$('[data-bind]').forEach(t => {
    const v = getPath(state, t.dataset.bind);
    if (t.type === 'checkbox') t.checked = !!v; else t.value = v ?? '';
    const o = t.closest('label')?.querySelector('output');
    if (o) o.textContent = fmtVal(v);
  });
}
function onBind(path) {
  if (path === 'frame.bgType') $('#bgc').dataset.t = state.frame.bgType;
  if (path === 'dup') { fitCanvas(); if (state.step === 'download') buildDownload(); }
  if (path === 'padScale' || path === 'fitAll') updateCamAspect();
  if (path === 'zoom') fitCanvas();
  if (['mirror', 'bright', 'contrast', 'sat'].includes(path)) { updateVideoStyle(); refreshThumbs(); }
  requestRender();
}
document.addEventListener('input', e => {
  const t = e.target, path = t.dataset?.bind; if (!path) return;
  const v = t.type === 'checkbox' ? t.checked : (t.type === 'range' || t.dataset.num !== undefined) ? +t.value : t.value;
  setPath(state, path, v);
  const o = t.closest('label')?.querySelector('output'); if (o) o.textContent = fmtVal(v);
  if (t.type === 'checkbox') $$(`[data-bind="${path}"]`).forEach(x => { x.checked = v; });
  onBind(path);
});

/* ---------- klik delegasi ---------- */
document.addEventListener('click', e => {
  const q = s => e.target.closest(s);
  let b;
  if ((b = q('[data-tab]'))) return showTab(b.dataset.tab);
  if ((b = q('[data-layout]'))) return setLayout(b.dataset.layout);
  if ((b = q('[data-filter]'))) {
    state.filter = b.dataset.filter; updateVideoStyle();
    $$('[data-filter]').forEach(x => x.classList.toggle('on', x.dataset.filter === state.filter));
    return requestRender();
  }
  if ((b = q('[data-preset]'))) return applyPreset(b.dataset.preset);
  if ((b = q('[data-cat]'))) { emojiCat = b.dataset.cat; return showEmoji(); }
  if ((b = q('[data-emoji]'))) return addElement({ type: 'emoji', content: b.dataset.emoji, size: baseSize() });
  if ((b = q('[data-shape]'))) return addElement({ type: 'shape', content: b.dataset.shape, size: baseSize(), color: $('#shapeColor').value });
  if ((b = q('[data-imgsticker]'))) {
    const m = STICKER_IMAGES[+b.dataset.imgsticker];
    fetch(m.src).then(r => r.blob()).then(blob => loadImageFile(blob, 1200))
      .then(c => addElement({ type: 'image', img: c, ar: c.height / c.width, size: baseSize() * 1.1 }))
      .catch(() => toast('Stiker gambar gagal dimuat.'));
    return;
  }
  if ((b = q('[data-fx]'))) { state.fx = b.dataset.fx; updateFxChips(); return requestRender(); }
  if ((b = q('[data-quick]'))) return addElement({ type: 'text', content: b.dataset.quick, size: LY().w * .11, color: '#ffffff', outline: true, font: 'Pacifico', shadow: true });
  if ((b = q('[data-rotp]'))) { const [i, d] = b.dataset.rotp.split(':'); return rotatePhoto(+i, +d); }
  if ((b = q('[data-retake]'))) { retakeIdx = +b.dataset.retake; goStep('capture'); updateBadge(); refreshThumbs(); if (!stream) startCamera(); return; }
  if ((b = q('[data-timer]'))) { state.timer = +b.dataset.timer; return updateTimerSeg(); }
  if ((b = q('[data-th]'))) {
    if (shooting) return;
    const i = +b.dataset.th;
    if (!state.photos[i]) return;
    retakeIdx = i; refreshThumbs(); updateBadge();
    return stream ? runSession() : toast('Aktifkan kamera atau unggah foto pengganti.');
  }
  if ((b = q('[data-saveraw]'))) return saveRaw(+b.dataset.saveraw);
});
document.addEventListener('input', e => { if (e.target.id === 'shapeColor') $('#shapeGrid').style.color = e.target.value; });

function updateTimerSeg() { $$('#timerSeg button').forEach(b => b.classList.toggle('on', +b.dataset.timer === state.timer)); }

/* =====================================================================
   Unduh
   ===================================================================== */
function buildDownload() {
  const pz = outSize(), iw = pz.w / 300, ih = pz.h / 300;
  const canShare = !!(navigator.canShare && navigator.share);
  const dpiBtn = (d, n) => `<button data-dpi="${d}" class="${state.dl.dpi === d ? 'on' : ''}">${n}<small>${Math.round(pz.w * d / 300)}×${Math.round(pz.h * d / 300)} px</small></button>`;
  $('#dlPanel').innerHTML = `
    <h3>Hasil akhir</h3>
    <p class="mut">Ukuran cetak <b>${iw}×${ih} inci</b> (${(iw * 2.54).toFixed(1)}×${(ih * 2.54).toFixed(1)} cm). Metadata DPI sudah ditanam di file sehingga ukuran cetaknya otomatis benar.</p>
    ${LY().dup ? `<h4>Ukuran kertas</h4>
    <div class="seg" id="paperSeg">
      <button data-paper="1" class="${state.dup ? 'on' : ''}">1200×1800<small>2 strip bersebelahan</small></button>
      <button data-paper="0" class="${!state.dup && !state.fullStrip ? 'on' : ''}">1200×1800<small>1 strip di tengah</small></button>
      <button data-paper="full" class="${!state.dup && state.fullStrip ? 'on' : ''}">600×1800<small>1 strip, tanpa kanvas</small></button>
    </div>` : ''}
    ${LY().w > LY().h ? `<h4>Ukuran kertas</h4>
    <div class="seg" id="landSeg">
      <button data-land="0" class="${state.landCanvas ? '' : 'on'}">1800×1200<small>Lanskap, tanpa kanvas</small></button>
      <button data-land="1" class="${state.landCanvas ? 'on' : ''}">1200×1800<small>Di tengah kanvas 4×6</small></button>
    </div>` : ''}
    <h4>Format</h4>
    <div class="seg" id="fmtSeg"><button data-fmt="png" class="${state.dl.fmt === 'png' ? 'on' : ''}">PNG<small>Tajam, file besar</small></button><button data-fmt="jpg" class="${state.dl.fmt === 'jpg' ? 'on' : ''}">JPG<small>File jauh lebih kecil</small></button></div>
    <h4>Kualitas</h4>
    <div class="seg" id="dpiSeg">${dpiBtn(300, 'Normal')}${dpiBtn(600, 'Ultra HD')}</div>
    <p class="mut">Ukuran file ditentukan oleh pilihan di atas, bukan oleh layar HP/laptop. <b>Normal</b> = 300 DPI, standar cetak lab foto (1200×1800 px). <b>Ultra HD</b> = 600 DPI (2400×3600 px), sangat tajam.</p>
    <div class="dl-actions">
      <button class="btn primary full big" id="btnDownload">⬇ Unduh gambar</button>
      <div class="row2"><button class="btn ghost" id="btnPrint">🖨 Cetak</button>${canShare ? '<button class="btn ghost" id="btnShare">↗ Bagikan</button>' : ''}</div>
    </div>
    <h4>Foto asli (tanpa frame)</h4>
    <div class="raws">${Array.from({ length: count() }, (_, i) => state.photos[i] ? `<button data-saveraw="${i}" class="raw"><img src="${state.photos[i].thumb}" alt=""><span>Foto ${i + 1}</span></button>` : '').join('')}</div>
    <button class="btn ghost full" id="btnNew">Mulai sesi baru</button>
    <p class="mut">Tips cetak: pilih kertas ${iw}×${ih} in dan skala <b>100% / Actual size</b> (jangan “fit to page”).</p>`;
}

$('#dlPanel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.land) { state.landCanvas = b.dataset.land === '1'; buildDownload(); }
  else if (b.dataset.paper) { state.dup = b.dataset.paper === '1'; state.fullStrip = b.dataset.paper === 'full'; syncBinds(); fitCanvas(); buildDownload(); }
  else if (b.dataset.fmt) { state.dl.fmt = b.dataset.fmt; $$('#fmtSeg button').forEach(x => x.classList.toggle('on', x === b)); }
  else if (b.dataset.dpi) { state.dl.dpi = +b.dataset.dpi; $$('#dpiSeg button').forEach(x => x.classList.toggle('on', x === b)); }
  else if (b.id === 'btnDownload') doDownload(b);
  else if (b.id === 'btnPrint') doPrint(b);
  else if (b.id === 'btnShare') doShare(b);
  else if (b.id === 'btnNew') newSession();
});

async function exportBlob(fmt, dpi) {
  const pz = outSize(), l = LY(), fr = state.frame;
  /* Beberapa HP gagal menggambar kanvas besar (hasilnya kosong/transparan kecuali sebagian).
     Setelah menggambar, piksel latar diperiksa; kalau kosong, ulangi dengan resolusi lebih kecil. */
  let s = dpi / 300, c, tries = 0;
  for (;;) {
    c = document.createElement('canvas');
    c.width = Math.round(pz.w * s); c.height = Math.round(pz.h * s);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.fillStyle = (centered() || landCanvas()) && fr.bgType === 'image' ? '#ffffff' : (fr.c1 || '#ffffff');
    x.fillRect(0, 0, c.width, c.height);
    if (landCanvas()) { // skala layout lanskap agar lebarnya = lebar kanvas, lalu taruh di tengah
      const k = pz.w / l.w;
      renderPaper(x, s * k, state, { ui: false, oy: (pz.h / k - l.h) / 2 });
    } else {
      renderPaper(x, s, state, { ui: false, ox: centered() ? l.w / 2 : 0 });
    }
    const probe = x.getImageData(2, 2, 1, 1).data;
    const photoOk = !state.photos.slice(0, count()).some(Boolean) || photoPixelOk(x, c, l);
    if (probe[3] === 255 && (photoOk || tries >= 2)) break; // foto polos sewarna latar tidak boleh membuat gagal
    if (++tries > 3 || s <= .25) throw new Error('HP gagal membuat gambar. Coba pilih Normal atau tutup tab lain, lalu ulangi.');
    s /= 2; slotCache.clear();
    toast('Memori HP terbatas — resolusi diturunkan otomatis.');
  }
  const blob = await new Promise(r => c.toBlob(r, fmt === 'jpg' ? 'image/jpeg' : 'image/png', state.dl.q));
  if (!blob) throw new Error('Gagal membuat gambar (memori tidak cukup?). Coba resolusi lebih rendah.');
  return fmt === 'jpg' ? setJpegDpi(blob, dpi) : setPngDpi(blob, dpi);
}
/* true bila area foto pertama tidak sama persis dengan warna latar (artinya foto tergambar) */
function photoPixelOk(x, c, l) {
  const land = landCanvas(), sc = land ? c.width / l.w : c.width / outSize().w;
  const ox = land ? 0 : (centered() ? l.w / 2 : 0), oy = land ? (c.height / sc - l.h) / 2 : 0;
  const sl = getSlots(l, state)[0];
  const px = Math.round((ox + sl.x + sl.w / 2) * sc), py = Math.round((oy + sl.y + sl.h / 2) * sc);
  const d = x.getImageData(Math.max(0, px - 8), Math.max(0, py - 8), 16, 16).data;
  const bg = x.getImageData(2, 2, 1, 1).data;
  for (let i = 0; i < d.length; i += 4) if (d[i] !== bg[0] || d[i + 1] !== bg[1] || d[i + 2] !== bg[2]) return true;
  return false;
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
function saveBlob(blob, name) {
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function busy(btn, fn) {
  const t = btn.innerHTML; btn.disabled = true; btn.textContent = 'Memproses…';
  try { await fn(); } catch (err) { toast(err.message || 'Terjadi kesalahan.'); }
  btn.disabled = false; btn.innerHTML = t;
}
const doDownload = btn => busy(btn, async () => {
  const { fmt, dpi } = state.dl;
  saveBlob(await exportBlob(fmt, dpi), `photobooth-${stamp()}-${dpi}dpi.${fmt}`);
  toast('Gambar diunduh ✓');
});
const doPrint = btn => busy(btn, async () => {
  const blob = await exportBlob('png', 300), url = URL.createObjectURL(blob), pz = outSize();
  const im = new Image(); im.src = url; await im.decode();
  im.style.width = pz.w / 300 + 'in'; im.style.height = pz.h / 300 + 'in';
  const area = $('#printArea'); area.replaceChildren(im);
  const pg = document.createElement('style');
  pg.textContent = `@page{size:${pz.w / 300}in ${pz.h / 300}in;margin:0}`;
  document.head.appendChild(pg);
  window.print();
  setTimeout(() => { area.replaceChildren(); pg.remove(); URL.revokeObjectURL(url); }, 2000);
});
const doShare = btn => busy(btn, async () => {
  const blob = await exportBlob(state.dl.fmt, Math.min(state.dl.dpi, 300));
  const file = new File([blob], `photobooth-${stamp()}.${state.dl.fmt}`, { type: blob.type });
  if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Photobooth' });
  else throw new Error('Perangkat ini tidak mendukung berbagi file.');
});
async function saveRaw(i) {
  const p = state.photos[i]; if (!p) return;
  const c = document.createElement('canvas'); c.width = p.canvas.width; c.height = p.canvas.height;
  const x = c.getContext('2d');
  if (state.mirror && p.src === 'cam') { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(p.canvas, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .95));
  saveBlob(blob, `foto-${i + 1}-${stamp()}.jpg`);
}
function newSession() {
  if (!confirm('Mulai sesi baru? Foto dan hasil edit saat ini akan dihapus dari halaman ini.')) return;
  state.photos = []; state.elements = []; state.selected = null; retakeIdx = null;
  slotCache.clear();
  afterPhotosChanged();
  goStep('capture');
}

/* =====================================================================
   Inisialisasi
   ===================================================================== */
function init() {
  buildPanel();
  $$('[data-layouts]').forEach(b => b.innerHTML = layoutCards());
  refreshChips(); syncBinds(); updateTimerSeg(); updateFxChips();
  $$('.dup-wrap').forEach(w => w.hidden = !LY().dup);
  $$('[data-preset]')[0]?.classList.add('on');
  updateCamAspect(); refreshThumbs(); updateNav(); updateShootBtn();

  $('#steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) goStep(b.dataset.step); });
  $('#btnCam').addEventListener('click', startCamera);
  video.addEventListener('resize', updateCamAspect);
  video.addEventListener('loadedmetadata', updateCamAspect);
  $('#btnToCap').addEventListener('click', () => goStep('capture'));
  $('#btnToFrame').addEventListener('click', () => goStep('frame'));
  $('#btnShoot').addEventListener('click', runSession);
  $('#btnRot').addEventListener('click', () => { camExtra = (camExtra + 90) % 360; updateCamAspect(); });
  $('#btnSwitch').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; if (stream) startCamera(); });
  $('#fileIn').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  $('#btnClear').addEventListener('click', () => { if (shooting) return; state.photos = []; retakeIdx = null; afterPhotosChanged(); });
  $('#btnDemo').addEventListener('click', makeDemo);
  $('#btnToEdit').addEventListener('click', () => goStep('edit'));
  $('#btnBack').addEventListener('click', () => goStep(state.step === 'download' ? 'edit' : 'capture'));
  $('#btnNext').addEventListener('click', () => state.step === 'edit' ? goStep('download') : doDownload($('#btnDownload') || $('#btnNext')));

  $('#bgFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { state.frame.bgImg = await loadImageFile(f, 2400); state.frame.bgType = 'image'; syncBinds(); $('#bgc').dataset.t = 'image'; requestRender(); }
    catch { toast('Gambar tidak bisa dibaca.'); }
    e.target.value = '';
  });
  $('#imgFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const c = await loadImageFile(f); addElement({ type: 'image', img: c, ar: c.height / c.width, size: baseSize() * 1.3 }); }
    catch { toast('Gambar tidak bisa dibaca.'); }
    e.target.value = '';
  });
  $('#btnAddText').addEventListener('click', () => {
    const t = $('#freeText').value.trim() || 'Halo!';
    addElement({ type: 'text', content: t, font: $('#freeFont').value, color: $('#freeColor').value, size: LY().w * .1 });
    $('#freeText').value = '';
  });

  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitCanvas, 120); });
  FONTS.forEach(f => document.fonts.load(`32px "${f.name}"`).catch(() => { }));
  document.fonts.addEventListener?.('loadingdone', requestRender);
  window.addEventListener('beforeunload', e => { if (filled() > 0) { e.preventDefault(); e.returnValue = ''; } });
}
init();
goStep('frame');
window.addEventListener('error', e => toast('Error: ' + e.message));
window.addEventListener('unhandledrejection', e => toast('Error: ' + (e.reason?.message || e.reason)));
