'use strict';

/* Ukuran dalam piksel pada 300 DPI.  600×1800 = 2×6 in, 1200×1800 = 4×6 in. */
const LAYOUTS = {
  strip4: { name: 'Strip 4 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 4, count: 4, pad: 40, gap: 28, footer: 210, dup: true },
  strip3: { name: 'Strip 3 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 3, count: 3, pad: 40, gap: 28, footer: 330, dup: true },
  strip2: { name: 'Strip 2 Foto', desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 2, count: 2, pad: 40, gap: 28, footer: 330, dup: true },
  duo:    { name: 'Duo Tumpuk',  desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 2, count: 2, pad: 70, gap: 40, footer: 260 },
  duoside:{ name: 'Duo Lanskap', desc: '6×4 in', w: 1800, h: 1200, cols: 2, rows: 1, count: 2, pad: 70, gap: 40, footer: 200 },
  grid4:  { name: 'Grid 2×2',    desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300 },
  grid6:  { name: 'Grid 2×3',    desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 3, count: 6, pad: 60, gap: 36, footer: 240 },
  collage:{ name: 'Kolase 3',    desc: '4×6 in', w: 1200, h: 1800, count: 3, pad: 60, gap: 0, footer: 320, custom: [[60, 60, 1080, 780], [60, 880, 530, 600], [610, 880, 530, 600]] },
  single: { name: 'Satu Foto',   desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300 },
  polaroid:{ name: 'Polaroid',   desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 90, gap: 0, footer: 520, shape: 'square' },
  wide:   { name: 'Lanskap',     desc: '6×4 in', w: 1800, h: 1200, cols: 1, rows: 1, count: 1, pad: 80, gap: 0, footer: 160 },
  circle4:{ name: 'Bulat 2×2',   desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'circle' },
  circle1:{ name: 'Bulat Satu',  desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'circle' },
  circle3:{ name: 'Bulat 3',     desc: '2×6 in', w: 600, h: 1800, cols: 1, rows: 3, count: 3, pad: 40, gap: 28, footer: 280, shape: 'circle', dup: true },
  rounded4:{ name: 'Kotak Bulat', desc: '4×6 in', w: 1200, h: 1800, cols: 2, rows: 2, count: 4, pad: 60, gap: 40, footer: 300, shape: 'rounded' },
  heart1: { name: 'Hati',        desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'heart' },
  heart2: { name: 'Hati 2',      desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 2, count: 2, pad: 70, gap: 30, footer: 260, shape: 'heart' },
  star1:  { name: 'Bintang',     desc: '4×6 in', w: 1200, h: 1800, cols: 1, rows: 1, count: 1, pad: 70, gap: 0, footer: 300, shape: 'star' },
};

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
  ['hearts', 'Hati'], ['stars', 'Bintang'], ['grid', 'Kotak-kotak'],
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
