// Bangun versi produksi ke dist/: JS digabung + diobfuskasi, CSS & HTML diminify.
import fs from 'node:fs';
import JavaScriptObfuscator from 'javascript-obfuscator';
import CleanCSS from 'clean-css';
import { minify } from 'html-minifier-terser';

const OUT = 'dist';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(`${OUT}/js`, { recursive: true });
fs.mkdirSync(`${OUT}/css`, { recursive: true });
fs.cpSync('assets', `${OUT}/assets`, { recursive: true });

// Urutan sama dengan <script> di index.html (semua berbagi scope global).
const files = ['js/data.js', 'js/render.js', 'js/app.js'];
const src = files.map(f => fs.readFileSync(f, 'utf8')).join('\n;\n');
const js = JavaScriptObfuscator.obfuscate(src, {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  splitStrings: true,
  splitStringsChunkLength: 8,
  controlFlowFlattening: false, // dimatikan agar kanvas tetap cepat
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: true,
  renameGlobals: false,         // nama global dipakai atribut HTML / string
}).getObfuscatedCode();
fs.writeFileSync(`${OUT}/js/app.min.js`, js);

fs.writeFileSync(`${OUT}/css/style.min.css`, new CleanCSS({ level: 2 }).minify(fs.readFileSync('css/style.css', 'utf8')).styles);

let html = fs.readFileSync('index.html', 'utf8');
html = html
  .replace(/<script src="js\/(data|render)\.js[^"]*"><\/script>\s*/g, '')
  .replace(/<script src="js\/app\.js[^"]*"><\/script>/, `<script src="js/app.min.js?v=${Date.now()}"></script>`)
  .replace(/css\/style\.css\?v=\d+/, `css/style.min.css?v=${Date.now()}`);
html = await minify(html, { collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: true });
fs.writeFileSync(`${OUT}/index.html`, html);
console.log('OK ->', OUT);
