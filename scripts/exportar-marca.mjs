// Exporta el isotipo y el logotipo de KeFounder! en todas sus variantes de color,
// como PNG sin fondo (varios tamaños) y SVG, a partir de la geometría oficial.
// Uso: node scripts/exportar-marca.mjs   (necesita Chrome; usa playwright-core)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { MARK, WORDMARK } from '../src/components/brand-geometry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'brand');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const C = { petroleo: '#345F63', terracota: '#C47F6A', crema: '#F1EDE4', tinta: '#252A2A', negro: '#000000', blanco: '#FFFFFF' };

// letras: color de la K / las letras · punto: color del punto del "!".
export const VARIANTS = [
  { id: 'color', letters: C.petroleo, dot: C.terracota, name: 'Color', use: 'Principal, sobre fondos claros (crema, blanco).', bg: C.crema },
  { id: 'negativo', letters: C.crema, dot: C.terracota, name: 'Negativo', use: 'Sobre fondos oscuros o petróleo.', bg: C.petroleo },
  { id: 'negativo-blanco', letters: C.blanco, dot: C.terracota, name: 'Negativo blanco', use: 'Sobre fotos o fondos muy oscuros.', bg: C.tinta },
  { id: 'tinta', letters: C.tinta, dot: C.terracota, name: 'Tinta', use: 'Sobre fondos claros cuando se busca más sobriedad.', bg: '#FFFFFF' },
  { id: 'mono-petroleo', letters: C.petroleo, dot: C.petroleo, name: 'Monocromo petróleo', use: 'Una sola tinta de marca.', bg: C.crema },
  { id: 'mono-negro', letters: C.negro, dot: C.negro, name: 'Monocromo negro', use: 'Impresión en blanco y negro, sellos, documentos.', bg: '#FFFFFF' },
  { id: 'mono-blanco', letters: C.blanco, dot: C.blanco, name: 'Monocromo blanco', use: 'Negativo de una tinta sobre cualquier fondo oscuro.', bg: C.negro },
  { id: 'mono-crema', letters: C.crema, dot: C.crema, name: 'Monocromo crema', use: 'Negativo de una tinta sobre petróleo o tinta.', bg: C.tinta }
];

const ISO_SIZES = [2048, 1024, 512, 256];
const LOGO_WIDTHS = [3000, 1500, 750];

const isoShapes = (v) => `<rect x="${MARK.stem.x}" y="${MARK.stem.y}" width="${MARK.stem.width}" height="${MARK.stem.height}" rx="${MARK.stem.rx}" fill="${v.letters}"/>`
  + `<circle cx="${MARK.dot.cx}" cy="${MARK.dot.cy}" r="${MARK.dot.r}" fill="${v.dot}"/>`
  + `<path d="${MARK.arm}" fill="none" stroke="${v.letters}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;

const logoShapes = (v) => {
  const b = WORDMARK.bang;
  return `<path d="${WORDMARK.d}" fill="${v.letters}"/>`
    + `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.rx}" fill="${v.letters}"/>`
    + `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="${v.dot}"/>`;
};

const svgDoc = (viewBox, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map((n) => Math.round(n * 100) / 100).join(' ')}" role="img" aria-label="${label}">${inner}</svg>\n`;

fs.mkdirSync(path.join(OUT, 'isotipo'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'logotipo'), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

// Límites visuales exactos (incluye el grosor del trazo y las terminaciones redondeadas).
async function bbox(inner) {
  await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style="overflow:visible"><g id="g">${inner}</g></svg>`);
  return page.evaluate(() => {
    const g = document.getElementById('g');
    // getBBox no cuenta el trazo: se mide el trazo del brazo aparte.
    let { x, y, width, height } = g.getBBox();
    let x2 = x + width;
    let y2 = y + height;
    for (const p of g.querySelectorAll('path[stroke]')) {
      const half = Number(p.getAttribute('stroke-width')) / 2;
      const len = p.getTotalLength();
      for (let i = 0; i <= 400; i += 1) {
        const pt = p.getPointAtLength((len * i) / 400);
        x = Math.min(x, pt.x - half); y = Math.min(y, pt.y - half);
        x2 = Math.max(x2, pt.x + half); y2 = Math.max(y2, pt.y + half);
      }
    }
    return { x, y, width: x2 - x, height: y2 - y };
  });
}

async function renderPng(svg, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style></head><body>${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } });
}

const written = [];

// ---------- Isotipo: lienzo cuadrado, centrado, con aire alrededor ----------
const isoBox = await bbox(isoShapes(VARIANTS[0]));
const isoPad = 0.06;
const side = Math.max(isoBox.width, isoBox.height) / (1 - isoPad * 2);
const isoView = [isoBox.x + isoBox.width / 2 - side / 2, isoBox.y + isoBox.height / 2 - side / 2, side, side];

// ---------- Logotipo: recortado al texto, con un margen chico ----------
const logoBox = await bbox(logoShapes(VARIANTS[0]));
const margin = logoBox.height * 0.08;
const logoView = [logoBox.x - margin, logoBox.y - margin, logoBox.width + margin * 2, logoBox.height + margin * 2];
const logoRatio = logoView[3] / logoView[2];

for (const v of VARIANTS) {
  const iso = svgDoc(isoView, isoShapes(v), 'KeFounder!');
  fs.writeFileSync(path.join(OUT, 'isotipo', `kefounder-isotipo-${v.id}.svg`), iso);
  for (const size of ISO_SIZES) {
    const file = path.join(OUT, 'isotipo', `kefounder-isotipo-${v.id}-${size}.png`);
    await renderPng(iso, size, size, file);
    written.push(file);
  }
  const logo = svgDoc(logoView, logoShapes(v), 'KeFounder!');
  fs.writeFileSync(path.join(OUT, 'logotipo', `kefounder-logotipo-${v.id}.svg`), logo);
  for (const w of LOGO_WIDTHS) {
    const h = Math.round(w * logoRatio);
    const file = path.join(OUT, 'logotipo', `kefounder-logotipo-${v.id}-${w}.png`);
    await renderPng(logo, w, h, file);
    written.push(file);
  }
}

// ---------- Hoja de muestra: cada variante sobre el fondo para el que está pensada ----------
const cards = VARIANTS.map((v) => `
  <div class="card" style="background:${v.bg}">
    <div class="art">${svgDoc(isoView, isoShapes(v), '').replace('<svg ', '<svg class="iso" ')}${svgDoc(logoView, logoShapes(v), '').replace('<svg ', '<svg class="logo" ')}</div>
    <div class="cap" style="color:${['color', 'tinta', 'mono-petroleo', 'mono-negro'].includes(v.id) ? '#252A2A' : '#F1EDE4'}"><b>${v.name}</b> · ${v.id}<br><span>${v.use}</span></div>
  </div>`).join('');
const sheet = `<html><head><style>
  body{margin:0;background:#E9E9DF;font-family:'Segoe UI',system-ui,sans-serif}
  .wrap{padding:48px;display:grid;grid-template-columns:repeat(2,1fr);gap:24px;width:1500px;box-sizing:border-box}
  h1{grid-column:1/-1;margin:0 0 4px;font:800 34px 'Segoe UI';color:#252A2A;letter-spacing:-1px}
  p.lead{grid-column:1/-1;margin:0 0 12px;color:#5D6F70;font-size:16px}
  .card{border-radius:22px;padding:34px 34px 22px;display:flex;flex-direction:column;gap:22px;border:1px solid #CFD8D2}
  .art{display:flex;align-items:center;gap:40px;height:120px}
  .iso{height:120px;width:120px}.logo{height:62px;width:auto}
  .cap{font-size:15px;line-height:1.45}.cap span{opacity:.75;font-size:14px}
</style></head><body><div class="wrap"><h1>KeFounder! · Variantes del isotipo y el logotipo</h1>
<p class="lead">Archivos en public/brand/isotipo y public/brand/logotipo · PNG sin fondo (isotipo 2048/1024/512/256 px · logotipo 3000/1500/750 px de ancho) y SVG.</p>${cards}</div></body></html>`;
await page.setViewportSize({ width: 1500, height: 900 });
await page.setContent(sheet);
await page.screenshot({ path: path.join(OUT, 'kefounder-variantes.png'), fullPage: true });

await browser.close();
console.log(`${written.length} PNG + ${VARIANTS.length * 2} SVG en public/brand/isotipo y public/brand/logotipo`);
console.log(`Isotipo: ${isoView.map((n) => n.toFixed(1)).join(' ')} · Logotipo: ${logoView.map((n) => n.toFixed(1)).join(' ')} (proporción ${(1 / logoRatio).toFixed(3)}:1)`);
