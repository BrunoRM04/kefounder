// Exporta el isotipo y el logotipo de KeFounder! en todas sus variantes de color,
// como PNG sin fondo (varios tamaños) y SVG, a partir de la geometría oficial.
// También exporta la marca de la Revista KeFounder!: el mismo isotipo y logotipo con la palabra REVISTA.
// Uso: node scripts/exportar-marca.mjs   (necesita Chrome; usa playwright-core)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { MARK, WORDMARK, REVISTA_WORD } from '../src/components/brand-geometry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'brand');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const C = {
  petroleo: '#345F63', terracota: '#C47F6A', crema: '#F1EDE4', tinta: '#252A2A', negro: '#000000', blanco: '#FFFFFF',
  // Para la palabra REVISTA: la terracota del sitio (texto sobre claro) y una clara que contrasta sobre petróleo.
  terracotaOscura: '#935A48', terracotaClara: '#E2C4B7'
};

// letras: color de la K / las letras · punto: color del punto del "!" ·
// revista: color de la palabra REVISTA y su separador (contraste ≥ 3:1 sobre el fondo de la variante).
export const VARIANTS = [
  { id: 'color', letters: C.petroleo, dot: C.terracota, revista: C.terracotaOscura, name: 'Color', use: 'Principal, sobre fondos claros (crema, blanco).', bg: C.crema },
  { id: 'negativo', letters: C.crema, dot: C.terracota, revista: C.terracotaClara, name: 'Negativo', use: 'Sobre fondos oscuros o petróleo.', bg: C.petroleo },
  { id: 'negativo-blanco', letters: C.blanco, dot: C.terracota, revista: C.terracota, name: 'Negativo blanco', use: 'Sobre fotos o fondos muy oscuros.', bg: C.tinta },
  { id: 'tinta', letters: C.tinta, dot: C.terracota, revista: C.terracotaOscura, name: 'Tinta', use: 'Sobre fondos claros cuando se busca más sobriedad.', bg: '#FFFFFF' },
  { id: 'mono-petroleo', letters: C.petroleo, dot: C.petroleo, revista: C.petroleo, name: 'Monocromo petróleo', use: 'Una sola tinta de marca.', bg: C.crema },
  { id: 'mono-negro', letters: C.negro, dot: C.negro, revista: C.negro, name: 'Monocromo negro', use: 'Impresión en blanco y negro, sellos, documentos.', bg: '#FFFFFF' },
  { id: 'mono-blanco', letters: C.blanco, dot: C.blanco, revista: C.blanco, name: 'Monocromo blanco', use: 'Negativo de una tinta sobre cualquier fondo oscuro.', bg: C.negro },
  { id: 'mono-crema', letters: C.crema, dot: C.crema, revista: C.crema, name: 'Monocromo crema', use: 'Negativo de una tinta sobre petróleo o tinta.', bg: C.tinta }
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

// ---------- Revista KeFounder!: la palabra REVISTA junto a la marca ----------
const RV = REVISTA_WORD;
const CAP = 72; // altura de mayúscula del logotipo y de REVISTA_WORD (línea de base en y=0)
const r4 = (n) => Math.round(n * 10000) / 10000;
// REVISTA con su borde izquierdo en x, la línea de base en y y escala k.
const rvWord = (x, y, k, fill) => `<path transform="translate(${r4(x - RV.minX * k)} ${r4(y)}) scale(${r4(k)})" d="${RV.d}" fill="${fill}"/>`;

// Isotipo: la K! con REVISTA centrada debajo, del mismo ancho que la marca.
const RV_ISO_K = MARK.width / RV.width;
const RV_ISO_GAP = MARK.height * 0.16; // aire entre la marca y las mayúsculas
const rvIsoShapes = (v) => isoShapes(v)
  + rvWord((MARK.width - RV.width * RV_ISO_K) / 2, MARK.height + RV_ISO_GAP + CAP * RV_ISO_K, RV_ISO_K, v.revista);

// Logotipo: KeFounder! | REVISTA. El separador ocupa la altura de mayúscula y REVISTA va centrada en ella.
const RV_LOGO_K = 0.45; // mayúsculas de REVISTA al 45% de las del logotipo
const RV_LOGO_GAP = 26; // aire a cada lado del separador
const RV_RULE = 3.4; // grosor del separador
const wordmarkRight = Math.max(WORDMARK.minX + WORDMARK.width, WORDMARK.bang.cx + WORDMARK.bang.r);
const rvLogoShapes = (v) => {
  const x = wordmarkRight + RV_LOGO_GAP;
  return logoShapes(v)
    + `<rect x="${r4(x)}" y="${-CAP}" width="${RV_RULE}" height="${CAP}" rx="${RV_RULE / 2}" fill="${v.revista}"/>`
    + rvWord(x + RV_RULE + RV_LOGO_GAP, -CAP / 2 + (CAP * RV_LOGO_K) / 2, RV_LOGO_K, v.revista);
};

const svgDoc = (viewBox, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map((n) => Math.round(n * 100) / 100).join(' ')}" role="img" aria-label="${label}">${inner}</svg>\n`;

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

// Distancia máxima de la tinta a un punto: para que el isotipo entre entero en un avatar redondo.
async function reach(inner, cx, cy) {
  await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style="overflow:visible"><g id="g">${inner}</g></svg>`);
  return page.evaluate(([cx, cy]) => {
    let max = 0;
    for (const el of document.getElementById('g').children) {
      const m = el.getCTM();
      const far = (x, y, r = 0) => {
        const p = new DOMPoint(x, y).matrixTransform(m);
        max = Math.max(max, Math.hypot(p.x - cx, p.y - cy) + r * Math.hypot(m.a, m.b));
      };
      if (el.tagName === 'circle') far(el.cx.baseVal.value, el.cy.baseVal.value, el.r.baseVal.value);
      else if (el.tagName === 'rect') {
        // Esquinas redondeadas: el punto más lejano está en uno de los cuatro arcos.
        const { x, y, width: w, height: h } = el.getBBox();
        const r = Math.min(Number(el.getAttribute('rx') || 0), w / 2, h / 2);
        for (const [px, py] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) far(px, py, r);
      } else {
        const half = el.getAttribute('stroke') ? Number(el.getAttribute('stroke-width')) / 2 : 0;
        const len = el.getTotalLength();
        const steps = Math.ceil(len * 4);
        for (let i = 0; i <= steps; i += 1) {
          const pt = el.getPointAtLength((len * i) / steps);
          far(pt.x, pt.y, half);
        }
      }
    }
    return max;
  }, [cx, cy]);
}

async function renderPng(svg, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style></head><body>${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } });
}

// Isotipo: lienzo cuadrado, centrado, con aire alrededor.
// circlePad: además, la tinta queda dentro del círculo inscripto con ese aire (avatares redondos).
async function isoViewFor(shapes, { pad = 0.06, circlePad = null } = {}) {
  const box = await bbox(shapes(VARIANTS[0]));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let side = Math.max(box.width, box.height) / (1 - pad * 2);
  if (circlePad !== null) side = Math.max(side, (await reach(shapes(VARIANTS[0]), cx, cy)) / (0.5 - circlePad));
  return [cx - side / 2, cy - side / 2, side, side];
}

// Logotipo: recortado al texto, con un margen chico.
async function logoViewFor(shapes) {
  const box = await bbox(shapes(VARIANTS[0]));
  const margin = box.height * 0.08;
  return [box.x - margin, box.y - margin, box.width + margin * 2, box.height + margin * 2];
}

const written = [];
let svgCount = 0;

async function exportSet({ dir, prefix, label, isoView, iso, logoView, logo }) {
  fs.mkdirSync(path.join(dir, 'isotipo'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'logotipo'), { recursive: true });
  const logoRatio = logoView[3] / logoView[2];
  for (const v of VARIANTS) {
    const isoSvg = svgDoc(isoView, iso(v), label);
    fs.writeFileSync(path.join(dir, 'isotipo', `${prefix}-isotipo-${v.id}.svg`), isoSvg);
    for (const size of ISO_SIZES) {
      const file = path.join(dir, 'isotipo', `${prefix}-isotipo-${v.id}-${size}.png`);
      await renderPng(isoSvg, size, size, file);
      written.push(file);
    }
    const logoSvg = svgDoc(logoView, logo(v), label);
    fs.writeFileSync(path.join(dir, 'logotipo', `${prefix}-logotipo-${v.id}.svg`), logoSvg);
    for (const w of LOGO_WIDTHS) {
      const h = Math.round(w * logoRatio);
      const file = path.join(dir, 'logotipo', `${prefix}-logotipo-${v.id}-${w}.png`);
      await renderPng(logoSvg, w, h, file);
      written.push(file);
    }
    svgCount += 2;
  }
}

// Hoja de muestra: cada variante sobre el fondo para el que está pensada.
async function sampleSheet({ file, title, lead, isoView, iso, logoView, logo, css = '' }) {
  const cards = VARIANTS.map((v) => `
  <div class="card" style="background:${v.bg}">
    <div class="art">${svgDoc(isoView, iso(v), '').replace('<svg ', '<svg class="iso" ')}${svgDoc(logoView, logo(v), '').replace('<svg ', '<svg class="logo" ')}</div>
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
  .cap{font-size:15px;line-height:1.45}.cap span{opacity:.75;font-size:14px}${css}
</style></head><body><div class="wrap"><h1>${title}</h1>
<p class="lead">${lead}</p>${cards}</div></body></html>`;
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.setContent(sheet);
  await page.screenshot({ path: file, fullPage: true });
}

// ---------- KeFounder! ----------
const kf = { iso: isoShapes, logo: logoShapes, isoView: await isoViewFor(isoShapes), logoView: await logoViewFor(logoShapes) };
await exportSet({ dir: OUT, prefix: 'kefounder', label: 'KeFounder!', ...kf });
await sampleSheet({
  file: path.join(OUT, 'kefounder-variantes.png'),
  title: 'KeFounder! · Variantes del isotipo y el logotipo',
  lead: 'Archivos en public/brand/isotipo y public/brand/logotipo · PNG sin fondo (isotipo 2048/1024/512/256 px · logotipo 3000/1500/750 px de ancho) y SVG.',
  ...kf
});

// ---------- Revista KeFounder! ----------
// El isotipo de la Revista se piensa también como foto de perfil (Instagram la recorta en círculo).
const rv = { iso: rvIsoShapes, logo: rvLogoShapes, isoView: await isoViewFor(rvIsoShapes, { circlePad: 0.04 }), logoView: await logoViewFor(rvLogoShapes) };
await exportSet({ dir: path.join(OUT, 'revista'), prefix: 'kefounder-revista', label: 'Revista KeFounder!', ...rv });
await sampleSheet({
  file: path.join(OUT, 'revista', 'kefounder-revista-variantes.png'),
  title: 'Revista KeFounder! · Variantes del isotipo y el logotipo',
  lead: 'Archivos en public/brand/revista/isotipo y public/brand/revista/logotipo · PNG sin fondo (isotipo 2048/1024/512/256 px · logotipo 3000/1500/750 px de ancho) y SVG.',
  css: '.art{height:150px;gap:36px}.iso{height:150px;width:150px}.logo{height:auto;width:420px}',
  ...rv
});

await browser.close();
const fmt = (view) => view.map((n) => n.toFixed(1)).join(' ');
console.log(`${written.length} PNG + ${svgCount} SVG en public/brand/{isotipo,logotipo} y public/brand/revista/{isotipo,logotipo}`);
console.log(`Isotipo: ${fmt(kf.isoView)} · Logotipo: ${fmt(kf.logoView)} (proporción ${(kf.logoView[2] / kf.logoView[3]).toFixed(3)}:1)`);
console.log(`Revista · Isotipo: ${fmt(rv.isoView)} · Logotipo: ${fmt(rv.logoView)} (proporción ${(rv.logoView[2] / rv.logoView[3]).toFixed(3)}:1)`);
