// Capturas de pantalla por ruta y tamaño + chequeo de desborde horizontal.
// Uso: node tests/shots.mjs --out <carpeta> [--user sol|martin|none] [--routes /,/matches] [--sizes mobile,desktop]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith('--') ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), []));
const BASE = args.base || 'http://localhost:3000';
const OUT = args.out || 'shots';
const USER = args.user || 'sol';
// --email para otras cuentas (p. ej. admin de prueba); la contraseña se toma de SHOTS_PASSWORD.
const EMAIL = args.email || `${USER}@kefounder.demo`;
const PASSWORD = process.env.SHOTS_PASSWORD || 'kefounder1234';
const ROUTES = (args.routes || '/').split(',');
const SIZES = {
  small: { width: 320, height: 640 },
  se: { width: 375, height: 667 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
  hd: { width: 1366, height: 768 },
  fhd: { width: 1920, height: 1080 },
  win: { width: 1536, height: 864 },
  tabletl: { width: 1024, height: 768 }
};
const sizes = (args.sizes || 'mobile,desktop').split(',');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(OUT, { recursive: true });

async function sessionCookie(email) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const raw = res.headers.get('set-cookie').split(';')[0];
  const [name, value] = raw.split('=');
  return { name, value, url: BASE };
}

const browser = await chromium.launch({ executablePath: CHROME });
const problems = [];
for (const size of sizes) {
  const viewport = SIZES[size] || SIZES.mobile;
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 760 ? 2 : 1, hasTouch: viewport.width < 760, isMobile: viewport.width < 760 });
  if (USER !== 'none') await context.addCookies([await sessionCookie(EMAIL)]);
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`[${size}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${size}] console: ${m.text()}`); });
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(Number(args.wait || 900));
    // body tiene overflow-x: hidden, así que se mide sin él y se buscan los elementos culpables.
    const overflow = await page.evaluate(() => {
      const w = window.innerWidth;
      const prev = [document.documentElement.style.overflowX, document.body.style.overflowX];
      document.documentElement.style.overflowX = 'visible';
      document.body.style.overflowX = 'visible';
      const sw = document.documentElement.scrollWidth;
      const clipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) return true;
        }
        return false;
      };
      const culprits = [...document.body.querySelectorAll('*')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el); })
        .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)))
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(el.getBoundingClientRect().right)}px)`);
      [document.documentElement.style.overflowX, document.body.style.overflowX] = prev;
      return { sw, w, culprits };
    });
    if (overflow.sw > overflow.w + 1 || overflow.culprits.length) problems.push(`[${size}] ${route}: desborde ${overflow.sw}px > ${overflow.w}px → ${overflow.culprits.join(', ')}`);
    // --metrics 1: cuánto scroll vertical sobra y qué parte del ancho disponible ocupa el contenido.
    if (args.metrics) {
      const m = await page.evaluate(() => {
        const main = document.querySelector('.adm-main') || document.querySelector('.main') || document.body;
        const box = main.getBoundingClientRect();
        let left = Infinity;
        let right = -Infinity;
        for (const el of main.querySelectorAll('*')) {
          if (el.closest('.topbar, .save-bar')) continue;
          const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!hasText && !/^(IMG|SVG|INPUT|TEXTAREA|SELECT|CANVAS)$/i.test(el.tagName)) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
        }
        // El panel de administración desplaza su propio contenedor, no la página.
        const inner = main.classList.contains('adm-main') && getComputedStyle(main).overflowY === 'auto';
        const height = inner ? main.scrollHeight : document.scrollingElement.scrollHeight;
        const view = inner ? main.clientHeight : window.innerHeight;
        return { extra: Math.round(((height - view) / view) * 100), width: Math.round(((right - left) / box.width) * 100) };
      });
      console.log(`${size.padEnd(8)} ${route.padEnd(34)} scroll extra ${String(m.extra).padStart(4)}%  ·  ancho usado ${String(m.width).padStart(3)}%`);
    }
    const name = `${size}${route.replace(/[/?=&]+/g, '_') || '_root'}`.replace(/_$/, '') || size;
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: args.full === '1' });
  }
  await context.close();
}
await browser.close();
console.log(problems.length ? problems.join('\n') : 'Sin problemas detectados.');
