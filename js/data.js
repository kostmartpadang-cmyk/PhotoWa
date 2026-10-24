'use strict';

/* Ukuran dalam piksel pada 300 DPI.  600×1800 = 2×6 in, 1200×1800 = 4×6 in. */
const LAYOUTS = {
  /* ===== 4 foto ===== */
  grid4:   { name: 'Grid 2×2',     desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300 },
  circle4: { name: 'Bulat 2×2',    desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'circle' },
  rounded4:{ name: 'Kotak Bulat',  desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'rounded' },
  heart4:  { name: 'Hati 2×2',     desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'heart' },
  square4: { name: 'Kotak 2×2',    desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'square' },
  collage4a:{ name: 'Kolase 1+3',  desc: '4×6 in', w: 1200, h: 1800, count: 4, pad: 60, gap: 0, footer: 400, custom: [[60, 60, 1080, 700], [60, 800, 340, 600], [430, 800, 340, 600], [800, 800, 340, 600]] },
  collage4b:{ name: 'Kolase Samping', desc: '4×6 in', w: 1200, h: 1800, count: 4, pad: 60, gap: 0, footer: 360, custom: [[60, 60, 520, 1380], [620, 60, 520, 440], [620, 530, 520, 440], [620, 1000, 520, 440]] },
  stack4:  { name: 'Panorama 4',   desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 4, count: 4, pad: 60, gap: 30, footer: 220 },
  strip4h: { name: 'Strip Datar 4', desc: '6×2 in', w: 1800, h: 600, cols: 4, rows: 1, count: 4, pad: 30, gap: 20, footer: 90 },
  /* ===== 5 foto ===== */
  collage5:{ name: 'Kolase 1+4',   desc: '4×6 in', w: 1200, h: 1800, count: 5, pad: 60, gap: 0, footer: 290, custom: [[60, 60, 1080, 640], [60, 740, 530, 370], [610, 740, 530, 370], [60, 1140, 530, 370], [610, 1140, 530, 370]] },
  grid41:  { name: 'Grid 4+1',     desc: '4×6 in', w: 1200, h: 1800, count: 5, pad: 60, gap: 0, footer: 220, custom: [[60, 60, 530, 560], [610, 60, 530, 560], [60, 660, 530, 560], [610, 660, 530, 560], [60, 1260, 1080, 320]] },
  circle5: { name: 'Bulat 5',      desc: '4×6 in', w: 1200, h: 1800, count: 5, pad: 60, gap: 0, footer: 330, shape: 'circle', custom: [[130, 70, 420, 420], [650, 70, 420, 420], [390, 550, 420, 420], [130, 1030, 420, 420], [650, 1030, 420, 420]] },
  /* ===== lainnya ===== */
  duo:    { name: 'Duo Tumpuk',  desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 2, count: 2, pad: 70, gap: 40, footer: 260 },
  duoside:{ name: 'Duo Lanskap', desc: '6×4 in', w: 1800, h: 1200, cols: 2, rows: 1, count: 2, pad: 70, gap: 40, footer: 200 },
  grid6:  { name: 'Grid 2×3',    desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 3, count: 6, pad: 60, gap: 36, footer: 240 },
  collage:{ name: 'Kolase 3',    desc: '4×6 in', w: 1200, h: 1800, count: 3, pad: 60, gap: 0, footer: 320, custom: [[60, 60, 1080, 780], [60, 880, 530, 600], [610, 880, 530, 600]] },
  single: { name: 'Satu Foto',   desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300 },
  polaroid:{ name: 'Polaroid',   desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 90, gap: 0, footer: 520, shape: 'square' },
  wide:   { name: 'Lanskap',     desc: '6×4 in', w: 1800, h: 1200, cols: 1, rows: 1, count: 1, pad: 80, gap: 0, footer: 160 },
  circle1:{ name: 'Bulat Satu',  desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'circle' },
  heart1: { name: 'Hati',        desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'heart' },
  heart2: { name: 'Hati 2',      desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 2, count: 2, pad: 70, gap: 30, footer: 260, shape: 'heart' },
  star1:  { name: 'Bintang',     desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'star' },
  /* ===== tanpa teks: nt3 manual; versi "Polos" layout lain dibuat otomatis di bawah ===== */
  nt3: { name: 'Polos 3 Foto', desc: '4×6 in • tanpa teks', w: 1200, h: 1800, cols: 1, rows: 3, count: 3, pad: 60, gap: 36, footer: 0, notext: true },
  /* ===== strip 2×6 (satu strip) ===== */
  strip4:  { name: 'Strip 4 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 4, count: 4, pad: 40, gap: 28, footer: 210, dup: true },
  strip5:  { name: 'Strip 5 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 5, count: 5, pad: 36, gap: 20, footer: 150, dup: true },
  strip3: { name: 'Strip 3 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 3, count: 3, pad: 40, gap: 28, footer: 330, dup: true },
  strip2: { name: 'Strip 2 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 2, count: 2, pad: 40, gap: 28, footer: 330, dup: true },
  circle3:{ name: 'Bulat 3',     desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 3, count: 3, pad: 40, gap: 28, footer: 280, shape: 'circle', dup: true },
};

/* Buat versi "Polos" (tanpa teks, foto memenuhi kertas) untuk setiap layout yang punya footer. */
for (const [id, l] of Object.entries({ ...LAYOUTS })) {
  if (l.notext || !l.footer) continue;
  const n = { ...l, name: 'Polos ' + l.name, desc: l.desc + ' • tanpa teks', footer: 0, notext: true };
  if (l.custom) {
    const top = l.pad, bottom = Math.max(...l.custom.map(c => c[1] + c[3])), k = (l.h - l.pad - top) / (bottom - top);
    n.custom = l.custom.map(([x, y, w, h]) => [x, Math.round(top + (y - top) * k), w, Math.round(h * k)]);
  }
  LAYOUTS['nt_' + id] = n;
}

/* ops: daftar [fungsi, nilai] mengikuti spesifikasi CSS filter */
const FILTERS = [
  { id: 'normal',  name: 'Normal',  ops: [] },
  { id: 'bw',      name: 'Hitam Putih', ops: [['grayscale', 1], ['contrast', 1.1]] },
  { id: 'noir',    name: 'Noir',    ops: [['grayscale', 1], ['contrast', 1.5], ['brightness', 0.9]] },
  { id: 'sepia',   name: 'Sepia',   ops: [['sepia', 0.9]] },
  { id: 'vintage', name: 'Vintage', ops: [['sepia', 0.45], ['contrast', 0.95], ['saturate', 1.3], ['brightness', 1.05], ['hue-rotate', -10]] },
  { id: 'warm',    name: 'Hangat',  ops: [['sepia', 0.25], ['saturate', 1.3], ['brightness', 1.05], ['hue-rotate', -8]] },
  { id: 'cool',    name: 'Sejuk',   ops: [['saturate', 1.1], ['hue-rotate', 15], ['brightness', 1.03]] },
  { id: 'fade',    name: 'Pudar',   ops: [['contrast', 0.85], ['brightness', 1.12], ['saturate', 0.8]] },
  { id: 'vivid',   name: 'Vivid',   ops: [['saturate', 1.6], ['contrast', 1.1]] },
  { id: 'drama',   name: 'Dramatis', ops: [['contrast', 1.35], ['saturate', 1.2], ['brightness', 0.92]] },
  { id: 'pink',    name: 'Pink',    ops: [['sepia', 0.3], ['saturate', 1.5], ['hue-rotate', -30], ['brightness', 1.08]] },
  { id: 'film',    name: 'Film',    ops: [['contrast', 1.1], ['saturate', 0.9], ['sepia', 0.2], ['brightness', 1.02]] },
  { id: 'bright',  name: 'Cerah',     ops: [['brightness', 1.15], ['saturate', 1.2], ['contrast', 1.05]] },
  { id: 'peach',   name: 'Peach',     ops: [['sepia', 0.25], ['saturate', 1.4], ['hue-rotate', -15], ['brightness', 1.12], ['contrast', 0.95]] },
  { id: 'mint',    name: 'Mint',      ops: [['hue-rotate', 20], ['saturate', 1.2], ['brightness', 1.08], ['sepia', 0.1]] },
  { id: 'lav',     name: 'Lavender',  ops: [['hue-rotate', 235], ['saturate', 0.9], ['brightness', 1.1], ['sepia', 0.1]] },
  { id: 'sunset',  name: 'Senja',     ops: [['sepia', 0.4], ['saturate', 1.8], ['hue-rotate', -20], ['brightness', 1.05]] },
  { id: 'kodak',   name: 'Kodak',     ops: [['sepia', 0.15], ['contrast', 1.15], ['saturate', 1.25], ['hue-rotate', -5]] },
  { id: 'retro70', name: 'Retro 70s', ops: [['sepia', 0.55], ['saturate', 1.5], ['hue-rotate', -25], ['contrast', 0.9], ['brightness', 1.05]] },
  { id: 'cyber',   name: 'Cyber',     ops: [['hue-rotate', 300], ['saturate', 1.7], ['contrast', 1.2], ['brightness', 0.95]] },
  { id: 'matcha',  name: 'Matcha',    ops: [['hue-rotate', 40], ['sepia', 0.2], ['saturate', 1.1], ['brightness', 1.05]] },
  { id: 'ice',     name: 'Es',        ops: [['hue-rotate', 190], ['saturate', 0.8], ['brightness', 1.12], ['contrast', 0.95]] },
  { id: 'highkey', name: 'High Key',  ops: [['brightness', 1.25], ['contrast', 0.85], ['saturate', 0.9]] },
  { id: 'lowkey',  name: 'Low Key',   ops: [['brightness', 0.8], ['contrast', 1.4], ['saturate', 0.9]] },
  { id: 'silver',  name: 'Silver',    ops: [['grayscale', 1], ['brightness', 1.1], ['contrast', 0.9]] },
  { id: 'cinema',  name: 'Sinema',    ops: [['contrast', 1.25], ['saturate', 0.75], ['sepia', 0.15], ['hue-rotate', 8], ['brightness', 0.92]] },
  { id: 'gold',    name: 'Emas',      ops: [['sepia', 0.5], ['saturate', 1.6], ['brightness', 1.08], ['contrast', 1.05]] },
  { id: 'rose',    name: 'Mawar',     ops: [['sepia', 0.2], ['hue-rotate', -40], ['saturate', 1.3], ['brightness', 1.08]] },
  { id: 'moody',   name: 'Moody',   ops: [['contrast', 1.2], ['saturate', 0.7], ['brightness', 0.9], ['hue-rotate', 8]] },
];

const FONTS = [
  { name: 'Poppins', label: 'Poppins' },
  { name: 'Pacifico', label: 'Pacifico' },
  { name: 'Playfair Display', label: 'Playfair' },
  { name: 'Permanent Marker', label: 'Marker' },
  { name: 'Caveat', label: 'Caveat' },
  { name: 'Bebas Neue', label: 'Bebas Neue' },
  { name: 'Dancing Script', label: 'Dancing Script' },
  { name: 'Fredoka', label: 'Fredoka' },
  { name: 'Press Start 2P', label: 'Pixel' },
];

const PATTERNS = [
  ['dots', 'Polkadot'], ['stripes', 'Garis'], ['checker', 'Catur'], ['gingham', 'Gingham'],
  ['hearts', 'Hati'], ['stars', 'Bintang'], ['grid', 'Kotak-kotak'], ['diamonds', 'Berlian'], ['zigzag', 'Zigzag'],
];

const FRAME_DEFAULT = {
  bgType: 'solid', c1: '#ffffff', c2: '#ffd6e7', angle: 160,
  pattern: 'dots', patFg: '#ff8fb8', bgImg: null,
  style: 'none', styleColor: '#222222',
  radius: 0, pBorder: 0, pBorderColor: '#ffffff', shadow: false,
};

const FRAME_PRESETS = [
  { id: 'classic', name: 'Klasik',   frame: { c1: '#ffffff' }, text: { color: '#222222', font: 'Poppins' } },
  { id: 'film',    name: 'Film',     frame: { c1: '#111111', style: 'film', styleColor: '#f2f2f2' }, text: { color: '#f2f2f2', font: 'Bebas Neue' } },
  { id: 'blush',   name: 'Blush',    frame: { bgType: 'gradient', c1: '#ffe0ec', c2: '#ffb3d1', angle: 160, style: 'line', styleColor: '#ffffff', radius: 18 }, text: { color: '#a3194f', font: 'Pacifico' } },
  { id: 'peach',   name: 'Sunset',   frame: { bgType: 'gradient', c1: '#ffecd2', c2: '#fcb69f', angle: 170, radius: 10, shadow: true }, text: { color: '#7a3b2e', font: 'Dancing Script' } },
  { id: 'ocean',   name: 'Laut',     frame: { bgType: 'gradient', c1: '#a1c4fd', c2: '#c2e9fb', angle: 150, style: 'double', styleColor: '#ffffff', radius: 14 }, text: { color: '#1d3b6e', font: 'Fredoka' } },
  { id: 'polka',   name: 'Polkadot', frame: { bgType: 'pattern', pattern: 'dots', c1: '#ffe4ee', patFg: '#ff9bbd', radius: 16, pBorder: 8, pBorderColor: '#ffffff', shadow: true }, text: { color: '#c2185b', font: 'Fredoka' } },
  { id: 'gingham', name: 'Gingham',  frame: { bgType: 'pattern', pattern: 'gingham', c1: '#ffffff', patFg: '#ff7f9c', pBorder: 8, pBorderColor: '#ffffff', shadow: true }, text: { color: '#d6336c', font: 'Caveat' } },
  { id: 'mint',    name: 'Mint',     frame: { bgType: 'pattern', pattern: 'stripes', c1: '#e6fff4', patFg: '#bff0d8', radius: 12 }, text: { color: '#1b6b4a', font: 'Poppins' } },
  { id: 'lav',     name: 'Bintang',  frame: { bgType: 'pattern', pattern: 'stars', c1: '#e4d7ff', patFg: '#ffffff', radius: 20, pBorder: 6, pBorderColor: '#ffffff' }, text: { color: '#4b2e9a', font: 'Pacifico' } },
  { id: 'hearts',  name: 'Love',     frame: { bgType: 'pattern', pattern: 'hearts', c1: '#ffd1dc', patFg: '#ff7aa2', radius: 16, pBorder: 8, pBorderColor: '#ffffff', shadow: true }, text: { color: '#b01e4f', font: 'Dancing Script' } },
  { id: 'retro',   name: 'Retro',    frame: { c1: '#f4e3c1', style: 'line', styleColor: '#b5651d', pBorder: 6, pBorderColor: '#fff8e8', shadow: true }, text: { color: '#5a3a1a', font: 'Permanent Marker' } },
  { id: 'gold',    name: 'Luxe',     frame: { c1: '#1c1a17', style: 'double', styleColor: '#d4af37' }, text: { color: '#d4af37', font: 'Playfair Display' } },
  { id: 'pixel',   name: 'Pixel',    frame: { bgType: 'pattern', pattern: 'grid', c1: '#1a1033', patFg: '#2f2160', style: 'dots', styleColor: '#ff5d8f' }, text: { color: '#7cf7ff', font: 'Press Start 2P' } },
  { id: 'sakura',  name: 'Sakura',   frame: { bgType: 'gradient', c1: '#fff0f5', c2: '#ffc9dd', angle: 170, style: 'hearts', styleColor: '#ff7aa2', radius: 16, pBorder: 6, pBorderColor: '#ffffff', shadow: true }, text: { color: '#b0245a', font: 'Dancing Script' } },
  { id: 'y2k',     name: 'Y2K',      frame: { bgType: 'pattern', pattern: 'checker', c1: '#ffffff', patFg: '#ffd1f0', style: 'corners', styleColor: '#ff4fb8', pBorder: 8, pBorderColor: '#ff4fb8' }, text: { color: '#ff4fb8', font: 'Bebas Neue' } },
  { id: 'mocha',   name: 'Mocha',    frame: { c1: '#d9c2a7', style: 'double', styleColor: '#6b4a2f', pBorder: 6, pBorderColor: '#f5ebdd', shadow: true }, text: { color: '#4a2f1c', font: 'Playfair Display' } },
  { id: 'forest',  name: 'Hutan',    frame: { bgType: 'gradient', c1: '#134e5e', c2: '#71b280', angle: 160, style: 'line', styleColor: '#ffffff', radius: 12 }, text: { color: '#ffffff', font: 'Fredoka' } },
  { id: 'galaxy',  name: 'Galaksi',  frame: { bgType: 'pattern', pattern: 'stars', c1: '#0f1b3d', patFg: '#2a3f7a', style: 'corners', styleColor: '#ffd84d', radius: 10 }, text: { color: '#ffd84d', font: 'Pacifico' } },
  { id: 'candy',   name: 'Permen',   frame: { bgType: 'pattern', pattern: 'stripes', c1: '#ffffff', patFg: '#ffc2d9', radius: 26, pBorder: 8, pBorderColor: '#ffffff', shadow: true }, text: { color: '#e0457b', font: 'Fredoka' } },
  { id: 'sunny',   name: 'Ceria',    frame: { bgType: 'gradient', c1: '#fff176', c2: '#ffb300', angle: 160, style: 'scallop', styleColor: '#ffffff', radius: 14 }, text: { color: '#7a4300', font: 'Pacifico' } },
  { id: 'lilac',   name: 'Lilac',    frame: { c1: '#e8defa', style: 'scallop', styleColor: '#ffffff', radius: 18, shadow: true }, text: { color: '#5b3ea6', font: 'Dancing Script' } },
  { id: 'clean',   name: 'Bersih',   frame: { c1: '#fafafa', radius: 6, shadow: true }, text: { color: '#333333', font: 'Poppins' } },
  { id: 'bwcheck', name: 'Catur',    frame: { bgType: 'pattern', pattern: 'checker', c1: '#ffffff', patFg: '#111111', pBorder: 10, pBorderColor: '#ffffff', shadow: true }, text: { color: '#111111', font: 'Bebas Neue' } },
  { id: 'tropic',  name: 'Tropis',   frame: { bgType: 'gradient', c1: '#43e97b', c2: '#38f9d7', angle: 150, style: 'dots', styleColor: '#ffffff', radius: 20 }, text: { color: '#05603a', font: 'Pacifico' } },
  { id: 'cherry',  name: 'Cherry',   frame: { c1: '#7a0019', style: 'hearts', styleColor: '#ffb3c1', pBorder: 6, pBorderColor: '#ffd1dc' }, text: { color: '#ffd1dc', font: 'Dancing Script' } },
  { id: 'pastel',  name: 'Pastel',   frame: { bgType: 'gradient', c1: '#a8edea', c2: '#fed6e3', angle: 160, radius: 22, pBorder: 6, pBorderColor: '#ffffff', shadow: true }, text: { color: '#4a5a7a', font: 'Fredoka' } },
  { id: 'blueprint', name: 'Grid Biru', frame: { bgType: 'pattern', pattern: 'grid', c1: '#e3f2fd', patFg: '#90caf9', style: 'line', styleColor: '#1976d2', pBorder: 4, pBorderColor: '#ffffff' }, text: { color: '#0d47a1', font: 'Press Start 2P' } },
  { id: 'kraft',   name: 'Kraft',    frame: { c1: '#c8a97e', style: 'line', styleColor: '#ffffff', pBorder: 8, pBorderColor: '#fffaf0', shadow: true }, text: { color: '#fffaf0', font: 'Permanent Marker' } },
  { id: 'sky',     name: 'Langit',    frame: { bgType: 'gradient', c1: '#89f7fe', c2: '#66a6ff', angle: 170, style: 'scallop', styleColor: '#ffffff', radius: 16 }, text: { color: '#ffffff', font: 'Fredoka' } },
  { id: 'berry',   name: 'Berry',     frame: { bgType: 'gradient', c1: '#f093fb', c2: '#f5576c', angle: 160, style: 'line', styleColor: '#ffffff', radius: 20 }, text: { color: '#ffffff', font: 'Pacifico' } },
  { id: 'lemon',   name: 'Lemon',     frame: { bgType: 'pattern', pattern: 'dots', c1: '#fff9c4', patFg: '#ffe082', style: 'double', styleColor: '#fbc02d', radius: 12 }, text: { color: '#8d6e00', font: 'Fredoka' } },
  { id: 'sage',    name: 'Sage',      frame: { c1: '#cfe3d0', style: 'line', styleColor: '#ffffff', pBorder: 8, pBorderColor: '#ffffff', shadow: true, radius: 6 }, text: { color: '#3e5c43', font: 'Playfair Display' } },
  { id: 'noir2',   name: 'Hitam Putih', frame: { c1: '#000000', style: 'double', styleColor: '#ffffff' }, text: { color: '#ffffff', font: 'Bebas Neue' } },
  { id: 'diamond', name: 'Berlian',   frame: { bgType: 'pattern', pattern: 'diamonds', c1: '#1b2a49', patFg: '#2e4a7d', style: 'corners', styleColor: '#ffd84d' }, text: { color: '#ffd84d', font: 'Bebas Neue' } },
  { id: 'zigzag',  name: 'Zigzag',    frame: { bgType: 'pattern', pattern: 'zigzag', c1: '#fff3e0', patFg: '#ffb74d', radius: 10, pBorder: 6, pBorderColor: '#ffffff', shadow: true }, text: { color: '#e65100', font: 'Permanent Marker' } },
  { id: 'neon',    name: 'Neon',      frame: { c1: '#0d0221', style: 'line', styleColor: '#ff2ec4', pBorder: 4, pBorderColor: '#00f0ff' }, text: { color: '#00f0ff', font: 'Press Start 2P' } },
  { id: 'rosegold', name: 'Rose Gold', frame: { bgType: 'gradient', c1: '#f6d5d0', c2: '#e8b4b8', angle: 160, style: 'double', styleColor: '#b76e79', radius: 8 }, text: { color: '#8a4b55', font: 'Dancing Script' } },
  { id: 'sand',    name: 'Pasir',     frame: { c1: '#f3e9dc', style: 'dots', styleColor: '#c9a27e', radius: 12, shadow: true }, text: { color: '#7a5c3e', font: 'Playfair Display' } },
  { id: 'carnival', name: 'Karnaval', frame: { bgType: 'pattern', pattern: 'stripes', c1: '#ffffff', patFg: '#ff8a80', style: 'scallop', styleColor: '#ff5252', pBorder: 8, pBorderColor: '#ffffff' }, text: { color: '#d32f2f', font: 'Fredoka' } },
  { id: 'grape',   name: 'Anggur',    frame: { bgType: 'gradient', c1: '#8e2de2', c2: '#4a00e0', angle: 160, style: 'hearts', styleColor: '#ffd1ff', radius: 14 }, text: { color: '#ffffff', font: 'Dancing Script' } },
  { id: 'bubble',  name: 'Gelembung', frame: { bgType: 'pattern', pattern: 'dots', c1: '#e0f7fa', patFg: '#b2ebf2', radius: 30, pBorder: 10, pBorderColor: '#ffffff', shadow: true }, text: { color: '#00838f', font: 'Fredoka' } },
  { id: 'autumn',  name: 'Musim Gugur', frame: { bgType: 'gradient', c1: '#f6d365', c2: '#fda085', angle: 160, style: 'corners', styleColor: '#ffffff', radius: 10 }, text: { color: '#7b3f00', font: 'Caveat' } },
  { id: 'pinkchk', name: 'Pink Catur', frame: { bgType: 'pattern', pattern: 'checker', c1: '#ffffff', patFg: '#ffe0ec', style: 'corners', styleColor: '#ff6fa5', pBorder: 6, pBorderColor: '#ff6fa5' }, text: { color: '#ff6fa5', font: 'Pacifico' } },
  { id: 'starmint', name: 'Bintang Mint', frame: { bgType: 'pattern', pattern: 'stars', c1: '#d7fff1', patFg: '#ffffff', style: 'line', styleColor: '#1b7a5c', radius: 16 }, text: { color: '#1b7a5c', font: 'Fredoka' } },
  { id: 'night',   name: 'Malam',    frame: { bgType: 'gradient', c1: '#232526', c2: '#414345', angle: 180, radius: 8 }, text: { color: '#ffffff', font: 'Bebas Neue' } },
];

const EMOJI = {
  'Imut': ['❤️', '💖', '💕', '✨', '⭐', '🌟', '💫', '🎀', '🌸', '🌼', '🌈', '☁️', '🦋', '🐻', '🐰', '🐱', '🐶', '🐼', '🍓', '🍒', '🍭', '🍩', '🧁', '🍦'],
  'Pesta': ['🎉', '🎊', '🎈', '🎂', '🥳', '🎁', '🪩', '🎵', '🎶', '🔥', '💯', '👑', '🍾', '🥂', '🎤', '🎸'],
  'Gaya': ['🕶️', '👓', '🎩', '👒', '🧢', '💍', '🎧', '💄', '👠', '🧣', '🎓', '🤡', '👻', '😈', '🪄', '🧿'],
  'Wajah': ['😍', '😎', '🤩', '😜', '🥰', '😘', '🤪', '😇', '🥹', '😂', '🤭', '😏', '🥳', '😴', '🤓', '😱'],
  'Alam': ['🌻', '🌹', '🌺', '🍀', '🌴', '🌵', '🍁', '❄️', '☀️', '🌙', '⚡', '🌊', '🍄', '🐝', '🐚', '🌍'],
  'Cinta': ['💘', '💝', '💗', '💓', '💞', '💌', '🌹', '💐', '💍', '💑', '🫶', '💋', '😻', '🧸', '❣️', '💟'],
  'Makanan': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧋', '☕', '🍰', '🍪', '🍫', '🍉', '🍌', '🍑', '🥑', '🍣', '🍜'],
  'Hewan': ['🐭', '🐹', '🦊', '🐨', '🐯', '🦁', '🐸', '🐵', '🦄', '🐥', '🐧', '🐙', '🦖', '🐢', '🦈', '🐝'],
  'Musim': ['🎄', '🎅', '⛄', '🎃', '🐣', '🌷', '🏖️', '🌞', '🍂', '🎆', '🧧', '🪔', '🕌', '🌙', '🎑', '🎋'],
  'Hobi': ['⚽', '🏀', '🏸', '🎮', '📷', '🎨', '🎬', '🚗', '✈️', '🏝️', '⛺', '🎒', '📚', '💻', '🎹', '🛹'],
  'Simbol': ['✅', '❌', '🔔', '💎', '🔱', '☮️', '✌️', '🙏', '👏', '🙌', '💪', '🫡', '🤙', '👀', '🫰', '🤞'],
  'Seru': ['💬', '🗯️', '❗', '❓', '💥', '💢', '💤', '🆒', '🆕', '🔝', '📸', '🎞️', '🎬', '✌️', '👍', '🤟'],
};

/* Semua bentuk adalah path SVG pada kotak 100×100. fill:null = pakai warna pilihan. */
function circleD(cx, cy, r) { return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`; }
function polyD(n, rOut, rIn, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? rIn : rOut, a = (rot + i * 180 / n) * Math.PI / 180;
    d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1);
  }
  return d + 'Z';
}
const SHAPES = {
  heart:   { name: 'Hati',    paths: [{ d: 'M50 90C20 66 4 46 4 28C4 14 15 5 28 5C38 5 46 10 50 18C54 10 62 5 72 5C85 5 96 14 96 28C96 46 80 66 50 90Z' }] },
  star:    { name: 'Bintang', paths: [{ d: polyD(5, 48, 20) }] },
  sparkle: { name: 'Kilau',   paths: [{ d: 'M50 2C54 30 70 46 98 50C70 54 54 70 50 98C46 70 30 54 2 50C30 46 46 30 50 2Z' }] },
  burst:   { name: 'Letupan', paths: [{ d: polyD(12, 48, 34) }] },
  bolt:    { name: 'Petir',   paths: [{ d: 'M58 2L18 55H45L36 98L82 40H54Z' }] },
  cloud:   { name: 'Awan',    paths: [{ d: 'M25 78C8 78 2 62 10 52C14 45 22 43 28 46C30 30 46 22 58 28C66 20 82 24 85 38C99 40 101 62 86 78Z' }] },
  moon:    { name: 'Bulan',   paths: [{ d: 'M60 4A46 46 0 1 0 96 70A38 38 0 1 1 60 4Z' }] },
  flower:  { name: 'Bunga',   paths: [{ d: [0, 60, 120, 180, 240, 300].map(a => circleD(+(50 + 25 * Math.cos(a * Math.PI / 180)).toFixed(1), +(50 + 25 * Math.sin(a * Math.PI / 180)).toFixed(1), 20)).join('') }, { d: circleD(50, 50, 14), fill: '#ffd84d' }] },
  drop:    { name: 'Tetes',   paths: [{ d: 'M50 3C50 3 15 45 15 66C15 86 31 97 50 97C69 97 85 86 85 66C85 45 50 3 50 3Z' }] },
  diamond: { name: 'Berlian', paths: [{ d: 'M50 3L95 50L50 97L5 50Z' }] },
  crown:   { name: 'Mahkota', paths: [{ d: 'M8 82V30L30 52L50 16L70 52L92 30V82Z' }] },
  speech:  { name: 'Balon',   paths: [{ d: 'M12 10H88Q96 10 96 18V62Q96 70 88 70H44L22 92L26 70H12Q4 70 4 62V18Q4 10 12 10Z' }] },
  sun:     { name: 'Matahari', paths: [{ d: polyD(16, 48, 36) }, { d: circleD(50, 50, 24), fill: '#ffd84d' }] },
  arrow:   { name: 'Panah',   paths: [{ d: 'M8 38H60V14L94 50L60 86V62H8Z' }] },
  ribbon:  { name: 'Pita',    paths: [{ d: 'M2 25H98L84 50L98 75H2L16 50Z' }] },
  bow:     { name: 'Pita Bunga', paths: [{ d: 'M50 50C30 20 5 22 5 42C5 62 30 70 50 50C70 70 95 62 95 42C95 22 70 20 50 50ZM48 54L28 94L46 82ZM52 54L72 94L54 82Z' }, { d: circleD(50, 50, 9), fill: '#ffffff' }] },
  check:   { name: 'Centang', paths: [{ d: 'M8 52L22 38L40 56L78 16L92 30L40 84Z' }] },
  plus:    { name: 'Tambah',  paths: [{ d: 'M38 6H62V38H94V62H62V94H38V62H6V38H38Z' }] },
  badge:   { name: 'Lencana', paths: [{ d: polyD(20, 48, 42) }] },
  hex:     { name: 'Segi Enam', paths: [{ d: polyD(3, 48, 48) }] },
  triangle:{ name: 'Segitiga', paths: [{ d: 'M50 6L96 92H4Z' }] },
  leaf:    { name: 'Daun',    paths: [{ d: 'M10 90C10 40 40 10 92 8C90 60 60 90 10 90Z' }] },
  tulip:   { name: 'Tulip',   paths: [{ d: 'M50 8C30 8 18 28 22 48C26 64 38 72 50 72C62 72 74 64 78 48C82 28 70 8 50 8Z' }, { d: 'M47 70H53V96H47Z', fill: '#3ea35a' }] },
  pentagon:{ name: 'Perisai', paths: [{ d: 'M50 4L92 24V54C92 76 74 90 50 98C26 90 8 76 8 54V24Z' }] },
  circle:  { name: 'Bulat',   paths: [{ d: circleD(50, 50, 46) }] },
  ring:    { name: 'Cincin',  paths: [{ d: circleD(50, 50, 46) + circleD(50, 50, 32), rule: 'evenodd' }] },
};

const FX = [
  { id: 'none', name: 'Tanpa', ico: '🚫' },
  { id: 'bokeh', name: 'Bokeh', ico: '🫧' },
  { id: 'sparkle', name: 'Kilau', ico: '✨' },
  { id: 'confetti', name: 'Konfeti', ico: '🎊' },
  { id: 'hearts', name: 'Hati', ico: '💗' },
  { id: 'snow', name: 'Salju', ico: '❄️' },
];

/* Stiker gambar bawaan (file di assets/stickers). Tambah file baru + baris di sini. */
const STICKER_IMAGES = [
  { name: 'SABER', src: 'assets/stickers/saber-cloud.png' },
  { name: 'Expression of the Year', src: 'assets/stickers/expression-of-the-year.png' },
  { name: 'Spider-Man', src: 'assets/stickers/spiderman.png' },
  { name: 'Logo Laba-laba', src: 'assets/stickers/spider-logo.png' },
  { name: 'Spider-Man Menembak Jaring', src: 'assets/stickers/spiderman-web.png' },
  { name: 'Jaring Laba-laba', src: 'assets/stickers/spider-web.png' },
  { name: 'Kacamata Hitam', src: 'assets/stickers/sunglasses.png' },
  { name: 'Domba Lucu', src: 'assets/stickers/domba-lucu.png' },
  { name: 'Kucing Mengedip', src: 'assets/stickers/kucing.png' },
  { name: 'Kucing Oren Kaget', src: 'assets/stickers/kucing-oren.png' },
  { name: 'Kucing Bingung', src: 'assets/stickers/kucing-bingung.png' },
  { name: 'Kucing Mikir', src: 'assets/stickers/kucing-mikir.png' },
  { name: 'Kucing Menerawang', src: 'assets/stickers/kucing-pensive.png' },
];
