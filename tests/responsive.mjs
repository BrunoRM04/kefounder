// Chequeo de pantallas: recorre todas las rutas del sitio (público, usuario y panel) en 16
// tamaños, del celular más angosto a un monitor 2K, y mide lo que se puede medir sin mirar:
//   1. desborde horizontal de la página (y de los contenedores con scroll propio, como el panel)
//   2. botones, enlaces y campos cortados por el borde de la pantalla
//   3. contenido tapado por barras fijas (barra inferior, barra de acciones) o fuera de alcance
//   4. texto que se sale de botones, pastillas, pestañas y etiquetas
//   5. errores de JS, de consola y respuestas de la API con error
//   6. (solo aviso) botones chicos para el dedo en pantallas táctiles
// Levanta su propio servidor con una base temporal (demo + una cuenta de administración
// descartable), así que no toca la base real ni el servidor del puerto 3000.
//
// Requiere el frontend compilado: npm run build && npm run test:responsive
// Opciones (después de "--"):
//   --sizes 320x568,1366x768   solo esos tamaños (también: phones, tablets, desktops)
//   --group public,user,admin  solo esos grupos de rutas
//   --routes /,/chat/:match    solo esas rutas, como figuran en las listas ("/admin*" = prefijo)
//   --shots [320x568,…]        guarda capturas de cada pantalla en --out (de todos o esos tamaños)
//   --out <carpeta>            capturas y report.json (por defecto, en la carpeta temporal)
//   --workers 4                pestañas en paralelo
//   --debug                    muestra cuánto tarda cada medición
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { hashPassword } from '../server/auth.js';
import { now, openDb } from '../server/db.js';
import { seed } from '../server/seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 1) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next !== undefined && !next.startsWith('--')) { args[argv[i].slice(2)] = next; i += 1; } else args[argv[i].slice(2)] = true;
}
const list = (value) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : null);

const PORT = Number(process.env.RESPONSIVE_PORT || args.port || 3191);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(typeof args.out === 'string' ? args.out : path.join(os.tmpdir(), 'kefounder-responsive'));
const WORKERS = Math.max(1, Number(args.workers) || 4);
const SHOT_SIZES = args.shots === true ? null : list(args.shots);
const wantsShot = (vp) => Boolean(args.shots) && (!SHOT_SIZES || SHOT_SIZES.includes(vp.name));
const DEMO_PASSWORD = 'kefounder1234';

// ---------- Tamaños ----------
// touch: celulares y tablets (isMobile + hasTouch). El celular acostado (844×390) ya usa el
// diseño de escritorio por ancho, pero sigue siendo una pantalla táctil y muy baja.
const VIEWPORTS = [
  { name: '320x568', kind: 'phone' }, // iPhone SE (1.ª): el más angosto que soportamos
  { name: '360x740', kind: 'phone' }, // Android chico
  { name: '375x667', kind: 'phone' }, // iPhone SE / 8
  { name: '390x844', kind: 'phone' }, // iPhone 12–15
  { name: '412x915', kind: 'phone' }, // Pixel / Galaxy
  { name: '430x932', kind: 'phone' }, // iPhone Pro Max
  { name: '844x390', kind: 'phone' }, // celular acostado
  { name: '768x1024', kind: 'tablet' }, // iPad mini vertical
  { name: '820x1180', kind: 'tablet' }, // iPad Air vertical
  { name: '1024x768', kind: 'desktop' }, // iPad acostado / notebook chica
  { name: '1280x720', kind: 'desktop' },
  { name: '1366x768', kind: 'desktop' }, // la notebook más común
  { name: '1440x900', kind: 'desktop' },
  { name: '1536x864', kind: 'desktop' }, // 1920 con escala 125 % en Windows
  { name: '1920x1080', kind: 'desktop' },
  { name: '2560x1440', kind: 'desktop' }
].map((v) => {
  const [width, height] = v.name.split('x').map(Number);
  return { ...v, width, height, touch: v.kind !== 'desktop' };
});

// ---------- Rutas ----------
// Los ":nombre" se completan con ids reales que se buscan en la API (ver resolveIds).
// Una ruta puede ser un objeto con `click` para abrir una hoja o un menú antes de medir:
//   click: { role = 'button', name }  ·  expect: selector que tiene que aparecer
//   when(viewport): en qué tamaños tiene sentido · accounts: solo para esas cuentas
const PUBLIC_ROUTES = [
  '/bienvenida',
  '/ingresar',
  '/registro',
  '/revista',
  '/revista/:slug',
  '/revista/seccion/:section',
  '/revista/buscar',
  '/p/:project',
  '/no-existe'
];

const USER_ROUTES = [
  '/',
  '/matches',
  '/chat/:match',
  '/interesados',
  '/guardados',
  '/proyectos',
  '/proyectos/nuevo',
  '/proyectos/:own/editar',
  '/proyectos/:own/estadisticas',
  '/proyectos/:own/candidatos',
  '/perfil',
  '/perfil/editar',
  '/notificaciones',
  '/planes',
  '/configuracion',
  '/u/:person',
  '/p/:project',
  '/p/:own',
  '/ayuda',
  '/ayuda/ranking',
  '/ayuda/:help',
  '/no-existe',
  // Hojas y menús abiertos
  { path: '/ayuda', name: '/ayuda · pedir ayuda', click: { name: 'Pedir ayuda' }, expect: '.ask-form' },
  { path: '/', name: '/ · filtros', click: { name: 'Filtros y orden' } },
  { path: '/', name: '/ · mazo de proyectos', click: { role: 'tab', name: /^Proyectos/ }, expect: '.deck-card.is-top .dc-project-card' },
  { path: '/proyectos', name: '/proyectos · más opciones', click: { name: 'Más opciones' } },
  { path: '/chat/:match', name: '/chat/:match · más opciones', click: { name: 'Más opciones' } },
  // En la computadora las herramientas del chat están a la vista; el "+" es solo del celular.
  { path: '/chat/:match', name: '/chat/:match · adjuntar', click: { name: 'Adjuntar o compartir' }, when: (vp) => vp.width < 760 },
  { path: '/u/:person', name: '/u/:person · más opciones', click: { name: 'Más opciones' } },
  { path: '/planes', name: '/planes · checkout', click: { name: /^(Elegir|Cambiar a) Plus$/ } },
  { path: '/configuracion', name: '/configuracion · cambiar contraseña', click: { name: 'Cambiar contraseña' } },
  { path: '/interesados', name: '/interesados · paywall', click: { name: 'Ver quiénes son con Plus' }, accounts: ['sol'] }
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/metricas',
  '/admin/ingresos',
  '/admin/usuarios',
  '/admin/usuarios?segment=all',
  '/admin/usuarios/:user',
  '/admin/proyectos',
  '/admin/proyectos?segment=all',
  '/admin/proyectos/:project',
  '/admin/moderacion',
  '/admin/moderacion/reportes/:report',
  '/admin/seguimiento',
  '/admin/revista',
  '/admin/revista/nueva',
  '/admin/revista/:article',
  '/admin/difusion',
  '/admin/difusion/:press',
  '/admin/ayuda',
  '/admin/ayuda/ranking',
  '/admin/ayuda/:help',
  '/admin/auditoria',
  '/admin/sistema',
  '/admin/no-existe',
  // Hojas y menús abiertos
  { path: '/admin', name: '/admin · menú', click: { name: 'Abrir menú' }, expect: '.adm.has-drawer .adm-side', when: (vp) => vp.width < 760 },
  { path: '/admin/usuarios/:user', name: '/admin/usuarios/:user · cambiar plan', click: { name: 'Cambiar plan' } },
  { path: '/admin/seguimiento', name: '/admin/seguimiento · nueva tarea', click: { name: 'Nueva tarea' } }
];

const GROUPS = [
  { id: 'public', accounts: ['public'], routes: PUBLIC_ROUTES },
  { id: 'user', accounts: ['sol', 'rodrigo'], routes: USER_ROUTES },
  { id: 'admin', accounts: ['admin'], routes: ADMIN_ROUTES }
];

// Respuestas 4xx esperables mientras se carga una pantalla (todo lo demás cuenta como error).
const EXPECTED_4XX = [];

const CHECKS = {
  overflow: 'Desborde horizontal',
  cut: 'Controles cortados por el borde de la pantalla',
  reach: 'Contenido tapado por barras fijas o fuera de alcance',
  text: 'Texto que se sale de su caja o queda cortado',
  errors: 'Errores de JS, consola o API',
  action: 'No se pudo abrir la hoja o el menú',
  modal: 'Modal fuera de pantalla o que no se puede cerrar',
  tap: 'Botones chicos para el dedo (< 28 px) — aviso',
  select: 'Selectores donde la opción elegida no entra entera — aviso'
};
// Avisos: no hacen fallar la corrida. Un <select> angosto muestra la opción cortada, pero al
// abrirlo se lee entera; se avisa para revisar, sin bloquear.
const WARNINGS = new Set(['tap', 'select']);

// ---------- Filtros de la línea de comandos ----------
const sizeFilter = list(args.sizes);
const viewports = sizeFilter
  ? VIEWPORTS.filter((v) => sizeFilter.some((s) => s === v.name || s === `${v.kind}s` || s === 'all'))
  : VIEWPORTS;
const groupFilter = list(args.group || args.groups);
const routeFilter = list(args.routes);
const routeName = (r) => (typeof r === 'string' ? r : r.name);
// Una ruta entra si coincide su nombre (o su prefijo, con "*"); las hojas abiertas sobre una ruta
// entran también al pedir esa ruta.
const routeMatches = (r) => !routeFilter || routeFilter.some((f) => {
  const name = routeName(r);
  if (f.endsWith('*')) return name.startsWith(f.slice(0, -1));
  return name === f || (typeof r !== 'string' && r.path === f);
});
if (!viewports.length) { console.error(`Ningún tamaño coincide con --sizes ${args.sizes}`); process.exit(1); }

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('Falta el build del frontend. Corré primero: npm run build');
  process.exit(1);
}

// ---------- Base temporal y servidor aislado ----------
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-responsive-'));
const ADMIN = { email: 'staff@kefounder.test', password: `${crypto.randomBytes(18).toString('base64url')}9a` };
{
  const db = openDb(path.join(dataDir, 'kefounder.db'));
  await seed(db, { reset: true });
  // Igual que `npm run admin -- crear`, pero con una contraseña al azar que solo vive en memoria.
  const at = now();
  db.run(
    `INSERT INTO users (email, password_hash, name, headline, role, segment, status, onboarded, email_verified, visible, settings, created_at, last_active_at)
     VALUES (?, ?, 'Equipo de prueba', 'Administración', 'admin', 'staff', 'active', 0, 1, 0, ?, ?, NULL)`,
    [ADMIN.email, await hashPassword(ADMIN.password), JSON.stringify({ notifications: {} }), at]
  );
  db.close();
}

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), KEFOUNDER_DATA_DIR: dataDir, HOST: '127.0.0.1', KEFOUNDER_DEMO_BOTS: '0' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });
const cleanup = () => {
  server.kill();
  setTimeout(() => fs.rmSync(dataDir, { recursive: true, force: true }), 400);
};
process.on('SIGINT', () => { cleanup(); process.exit(130); });

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(`${BASE}/api/config`); if (r.ok) return; } catch { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`El servidor no arrancó en ${BASE}:\n${serverLog}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(`No se pudo ingresar con ${email}: ${res.status}`);
  const [name, ...rest] = res.headers.getSetCookie()[0].split(';')[0].split('=');
  return { name, value: rest.join('='), url: BASE };
}

const apiAs = (cookie) => async (url, { method = 'GET', body } = {}) => {
  const res = await fetch(`${BASE}/api${url}`, {
    method,
    headers: { Cookie: `${cookie.name}=${cookie.value}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
  return res.json();
};

// Ids reales para completar las rutas, y algo de contenido para que el panel no quede vacío.
async function resolveIds(cookies) {
  const api = { sol: apiAs(cookies.sol), rodrigo: apiAs(cookies.rodrigo), admin: apiAs(cookies.admin) };
  const ids = { public: {}, sol: {}, rodrigo: {}, admin: {} };
  const ownProject = async (who) => {
    const { items } = await api[who]('/me/projects');
    return (items.find((p) => p.status === 'published') || items[0]).id;
  };
  for (const who of ['sol', 'rodrigo']) {
    const { items } = await api[who]('/matches');
    ids[who].own = await ownProject(who);
    ids[who].match = items[0].id;
    ids[who].person = items[0].other.id;
  }
  // Un pedido de «Necesito ayuda con…» con soluciones (los de ejemplo de la demo).
  for (const who of ['sol', 'rodrigo']) ids[who].help = (await api[who]('/help?tab=solved')).items[0].id;
  // Cada cuenta mira un proyecto ajeno: el de la otra.
  ids.sol.project = ids.rodrigo.own;
  ids.rodrigo.project = ids.sol.own;

  const home = await (await fetch(`${BASE}/api/revista/home`)).json();
  ids.public = { slug: home.featured.slug, section: home.sections[0]?.id || 'startups', project: ids.rodrigo.own };

  // Reportes de los tres tipos para que moderación tenga qué mostrar.
  await api.sol('/reports', { method: 'POST', body: { targetType: 'match', targetId: ids.sol.match, reason: 'Spam', details: 'Mensajes repetidos con enlaces externos.' } });
  await api.sol('/reports', { method: 'POST', body: { targetType: 'project', targetId: ids.sol.project, reason: 'Información falsa', details: '' } });
  await api.rodrigo('/reports', { method: 'POST', body: { targetType: 'person', targetId: ids.rodrigo.person, reason: 'Perfil falso', details: 'La foto no coincide con la persona.' } });

  const user = (await api.admin('/admin/users?segment=all&q=rodrigo%40kefounder.demo')).items[0].id;
  const project = (await api.admin(`/admin/projects?segment=all&q=${ids.rodrigo.own}`)).items[0].id;
  const reports = (await api.admin('/admin/reports?status=all')).items;
  // El de una conversación es el más completo: muestra los últimos mensajes.
  const report = (reports.find((r) => r.target?.type === 'match') || reports[0]).id;
  const article = (await api.admin('/admin/articles')).items[0].id;
  const press = (await api.admin('/admin/press?status=all')).items[0].id;
  const help = (await api.admin('/admin/help?status=all')).items[0].id;
  try {
    await api.admin('/admin/tasks', { method: 'POST', body: { title: 'Llamar para renovar el plan', detail: 'Prueba de pantallas', priority: 'high', dueAt: new Date().toISOString().slice(0, 10), targetType: 'user', targetId: user } });
    await api.admin('/admin/notes', { method: 'POST', body: { targetType: 'user', targetId: user, body: 'Cliente de prueba: pidió factura a nombre de la empresa.' } });
  } catch (error) {
    console.warn(`  (no se pudo crear la tarea o la nota de prueba: ${error.message})`);
  }
  ids.admin = { user, project, report, article, press, help };
  return ids;
}

const fill = (template, values) => template.replace(/:([a-z]+)/g, (m, key) => {
  if (values[key] === undefined) throw new Error(`Falta el id ":${key}" para ${template}`);
  return String(values[key]);
});

// ---------- Mediciones dentro de la página ----------
// Se instala en cada pestaña antes de que cargue la app (window.__kfCheck).
function installChecks() {
  const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=tab], [role=button]';
  // Avisos pasajeros: aparecen y se van solos, no son barras.
  const TRANSIENT = '.toast-stack, .live-banner, .offline-notice';
  const css = (el) => getComputedStyle(el);
  const scrolls = (v) => v === 'auto' || v === 'scroll';

  const short = (el) => {
    const cls = [...el.classList].filter((c) => !/^(is|has)-/.test(c)).slice(0, 3);
    const id = el.id && !el.id.includes(':') ? `#${el.id}` : ''; // los ids de React (":r1:") cambian
    return el.tagName.toLowerCase() + id + (cls.length ? `.${cls.join('.')}` : '');
  };
  const describe = (el) => {
    let s = short(el);
    if (!el.classList.length && (!el.id || el.id.includes(':'))) {
      const parent = el.parentElement?.closest('[class]');
      if (parent) s = `${short(parent)} ${s}`;
    }
    const own = el.tagName === 'SELECT' ? el.closest('label')?.querySelector('span')?.textContent || el.options[el.selectedIndex]?.text : el.textContent;
    const label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || own || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return label ? `${s} "${label}"` : s;
  };

  // Rectángulo visible: recortado por los ancestros con overflow (salvo html/body, que se miden aparte).
  function visible(el) {
    if (el.closest('[aria-hidden="true"], [inert]')) return null;
    const s = css(el);
    if (s.visibility !== 'visible' || Number(s.opacity) === 0) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    const box = { l: rect.left, t: rect.top, r: rect.right, b: rect.bottom };
    let fixed = s.position === 'fixed';
    let fixedRoot = fixed ? el : null;
    let scrollX = false;
    let scrollY = false;
    let cutBy = null;
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const ps = css(p);
      if (Number(ps.opacity) === 0) return null;
      if (!fixed && (ps.overflowX !== 'visible' || ps.overflowY !== 'visible')) {
        const pr = p.getBoundingClientRect();
        if (ps.overflowX !== 'visible') {
          if (scrolls(ps.overflowX) && p.scrollWidth > p.clientWidth + 1) scrollX = true;
          else if (!cutBy && (box.l < pr.left - 2 || box.r > pr.right + 2)) cutBy = p;
          box.l = Math.max(box.l, pr.left);
          box.r = Math.min(box.r, pr.right);
        }
        if (ps.overflowY !== 'visible') {
          if (scrolls(ps.overflowY) && p.scrollHeight > p.clientHeight + 1) scrollY = true;
          else if (!cutBy && (box.t < pr.top - 2 || box.b > pr.bottom + 2)) cutBy = p;
          box.t = Math.max(box.t, pr.top);
          box.b = Math.min(box.b, pr.bottom);
        }
      }
      if (ps.position === 'fixed') { fixed = true; fixedRoot = p; }
    }
    if (box.r - box.l < 1 || box.b - box.t < 1) return null;
    return { ...box, rect, fixed, fixedRoot, scrollX, scrollY, cutBy };
  }

  // Con un modal abierto, solo cuenta lo que está en el modal.
  function scope() {
    const layers = [...document.querySelectorAll('.sheet-layer, [role=dialog][aria-modal=true], .celebration')].filter((el) => visible(el));
    const top = layers[layers.length - 1];
    return top ? top.closest('.sheet-layer') || top : document.body;
  }

  // Barras fijas: anchas, bajas y pegadas arriba (fijas o sticky) o abajo (fijas).
  function bars(vw, vh) {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const s = css(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') continue;
      if (el.closest(TRANSIENT) || s.visibility !== 'visible' || s.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.5 || r.height < 8 || r.height > vh * 0.4) continue;
      if (s.position === 'fixed' && r.bottom >= vh - 2 && r.top > vh * 0.4) out.push({ el, where: 'bottom', r });
      else if (r.top <= 2 && r.bottom < vh * 0.5) out.push({ el, where: 'top', r });
    }
    return out;
  }

  // Elementos que sobresalen de `limit` sin que un ancestor intermedio los recorte; se informa el
  // más externo (donde empieza el ancho de más) y el más interno (lo que lo empuja).
  function culprits(container, limit) {
    const inside = (el) => {
      for (let p = el.parentElement; p && p !== container && p !== document.body; p = p.parentElement) {
        if (css(p).overflowX !== 'visible') return false;
        if (css(p).position === 'fixed') return false;
      }
      return true;
    };
    const all = [...(container || document.body).querySelectorAll('*')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > limit + 1 && css(el).position !== 'fixed' && inside(el);
    });
    const set = new Set(all);
    return all.filter((el) => !set.has(el.parentElement)).slice(0, 3).map((outer) => {
      const inner = all.filter((el) => el !== outer && outer.contains(el) && ![...el.children].some((c) => set.has(c))).pop();
      const px = (el) => Math.round(el.getBoundingClientRect().right);
      return `${short(outer)} (${px(outer)}px)${inner ? ` ⊃ ${describe(inner)} (${px(inner)}px)` : ''}`;
    });
  }

  function overflow(vw, vh) {
    const out = [];
    const de = document.documentElement;
    const body = document.body;
    const prev = [de.style.overflowX, body.style.overflowX];
    de.style.overflowX = 'visible';
    body.style.overflowX = 'visible';
    const sw = de.scrollWidth;
    if (sw > vw + 1) out.push({ key: 'página', msg: `la página mide ${sw}px de ancho (pantalla ${vw}px) → ${culprits(null, vw).join(' · ') || 'sin culpable visible'}` });
    [de.style.overflowX, body.style.overflowX] = prev;
    // Contenedores grandes que scrollean en vertical (p. ej. el contenido del panel o una tabla
    // larga): tampoco deberían desplazarse en horizontal. Los carruseles y tablas comparativas
    // que solo se desplazan de costado son a propósito y no entran.
    for (const el of document.querySelectorAll('body *')) {
      const s = css(el);
      if (!scrolls(s.overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
      if (el.clientHeight < vh * 0.5 || el.clientWidth < vw * 0.5) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        const limit = el.getBoundingClientRect().left + el.clientLeft + el.clientWidth;
        out.push({ key: short(el), msg: `${short(el)} se desplaza en horizontal (${el.scrollWidth}px en ${el.clientWidth}px) → ${culprits(el, limit).join(' · ') || 'sin culpable visible'}` });
      }
    }
    return out;
  }

  function cut(vw, root) {
    const out = [];
    for (const el of root.querySelectorAll(INTERACTIVE)) {
      const v = visible(el);
      if (!v || v.scrollX) continue; // dentro de un carrusel con scroll: es a propósito
      if ((v.l < -1 && v.r > 0) || (v.r > vw + 1 && v.l < vw)) {
        out.push({ key: describe(el), msg: `${describe(el)} queda cortado (de ${Math.round(v.l)} a ${Math.round(v.r)}px en ${vw}px)` });
      }
    }
    return out;
  }

  // Texto que no entra en su caja: se sale de una tarjeta, celda, botón o etiqueta (y puede pisar
  // lo de al lado), o lo corta un contenedor con overflow oculto sin "…" (text-overflow no funciona
  // en flex ni grid, así que ahí se corta seco). También el texto elegido en un <select>.
  const ellipsisWorks = (el) => css(el).textOverflow === 'ellipsis' && !/flex|grid/.test(css(el).display);
  let canvas = null;
  function text(root) {
    const out = [];
    const selects = [];
    const seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const owner = n.parentElement;
      if (!n.textContent.trim() || !owner || owner.closest('svg, script, style, noscript, textarea, select')) continue;
      if (!visible(owner)) continue;
      const range = document.createRange();
      let rects = [];
      if (/pre-wrap|break-spaces/.test(css(owner).whiteSpace)) {
        // Con pre-wrap los espacios al final de cada línea "cuelgan" fuera de la caja sin verse:
        // se mide solo lo que no es espacio.
        for (const m of n.textContent.matchAll(/\S+/g)) {
          range.setStart(n, m.index);
          range.setEnd(n, m.index + m[0].length);
          rects.push(...range.getClientRects());
        }
      } else {
        range.selectNodeContents(n);
        rects = [...range.getClientRects()];
      }
      rects = rects.filter((r) => r.width > 0);
      if (!rects.length) continue;
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      // Se sube desde el texto hasta el primer contenedor del que sobresale.
      for (let p = owner; p && p !== document.body; p = p.parentElement) {
        const ps = css(p);
        const pr = p.getBoundingClientRect();
        const over = Math.max(right - pr.right, pr.left - left);
        if (scrolls(ps.overflowX)) break; // dentro de algo con scroll: se alcanza desplazando
        if (over > 2 && pr.width >= 4) {
          const clipped = ps.overflowX !== 'visible';
          if (!(clipped && ellipsisWorks(p)) && !seen.has(p)) {
            seen.add(p);
            out.push({ key: describe(p), msg: `${describe(p)}: "${n.textContent.trim().slice(0, 40)}" ${clipped ? 'queda cortado sin "…"' : 'se sale de la caja'} ${Math.round(over)}px` });
          }
          break;
        }
        // Lo que recorta o está posicionado en absoluto (insignias, etiquetas de gráficos) ya no
        // depende de los contenedores de más arriba.
        if (ps.overflowX !== 'visible' || ps.position === 'absolute' || ps.position === 'fixed') break;
      }
    }
    // El navegador corta seco el texto de la opción elegida si no entra en el selector.
    canvas ||= document.createElement('canvas').getContext('2d');
    for (const el of root.querySelectorAll('select')) {
      if (el.multiple || el.size > 1 || !visible(el)) continue;
      const label = el.options[el.selectedIndex]?.text?.trim();
      if (!label) continue;
      const s = css(el);
      canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const width = canvas.measureText(label).width + (parseFloat(s.letterSpacing) || 0) * label.length;
      // Con appearance: none la flecha es una imagen de fondo: el texto no puede pasar por debajo
      // (necesita unos 30 px a la derecha, aunque el padding sea menor).
      const arrow = s.appearance === 'none' && s.backgroundImage !== 'none' ? 30 : 0;
      const room = el.clientWidth - parseFloat(s.paddingLeft) - Math.max(parseFloat(s.paddingRight), arrow);
      if (width > room + 2) selects.push({ key: describe(el), msg: `${describe(el)}: "${label}" no entra (${Math.round(width)}px en ${Math.round(room)}px)` });
    }
    return { text: out, select: selects };
  }

  function taps(vw, root) {
    const out = [];
    for (const el of root.querySelectorAll('a[href], button, select, summary, [role=tab], [role=button]')) {
      if (el.disabled) continue;
      const v = visible(el);
      if (!v || v.r <= 0 || v.l >= vw) continue;
      const r = v.rect;
      if (r.width >= 28 && r.height >= 28) continue;
      // Los enlaces dentro de un párrafo quedan exceptuados (como en WCAG 2.5.8).
      if (el.tagName === 'A' && css(el).display === 'inline' && [...el.parentElement.childNodes].some((c) => c !== el && c.nodeType === 3 && c.textContent.trim())) continue;
      // Se agrupa por estructura (no por texto): las barras de un gráfico son un solo aviso.
      const parent = el.parentElement?.closest('[class]');
      out.push({ key: `${parent ? `${short(parent)} ` : ''}${short(el)}`, msg: `${describe(el)} mide ${Math.round(r.width)}×${Math.round(r.height)}px` });
    }
    return out;
  }

  // Al cargar: el primer título no puede quedar debajo de una barra superior fija.
  function heading(vw, vh, root) {
    const top = bars(vw, vh).filter((b) => b.where === 'top');
    if (!top.length) return [];
    const h = [...root.querySelectorAll('h1, h2')].find((el) => !top.some((b) => b.el.contains(el)) && visible(el));
    if (!h) return [];
    const v = visible(h);
    for (const b of top) {
      const y = Math.min(v.b - 1, v.t + 6);
      if (y > b.r.bottom || v.r < b.r.left || v.l > b.r.right) continue;
      const hit = document.elementFromPoint(Math.max(v.l + 4, b.r.left + 1), y);
      if (hit && b.el.contains(hit) && !h.contains(hit)) return [{ key: describe(h), msg: `el título ${describe(h)} queda debajo de ${short(b.el)}` }];
    }
    return [];
  }

  // Todo lo que scrollea, al fondo (ventana y contenedores con scroll propio).
  function scrollToEnd() {
    window.scrollTo(0, document.scrollingElement.scrollHeight);
    for (const el of document.querySelectorAll('body *')) {
      if (scrolls(css(el).overflowY) && el.scrollHeight > el.clientHeight + 1) el.scrollTop = el.scrollHeight;
    }
  }

  // Con todo scrolleado al fondo, ningún control puede quedar tapado por una barra fija ni
  // fuera de la pantalla (ya no hay forma de traerlo a la vista).
  function reach(vw, vh, root) {
    const bottom = bars(vw, vh).filter((b) => b.where === 'bottom');
    const out = [];
    for (const el of root.querySelectorAll(INTERACTIVE)) {
      if (bottom.some((b) => b.el.contains(el))) continue;
      const v = visible(el);
      if (!v || v.r <= 0 || v.l >= vw) continue; // fuera de pantalla a propósito (menús ocultos)
      if (v.cutBy) {
        out.push({ key: `${describe(el)} ✂ ${short(v.cutBy)}`, msg: `${describe(el)} queda recortado por ${short(v.cutBy)} (sin scroll)` });
        continue;
      }
      const stuck = v.fixed && !v.scrollY; // en algo fijo y sin scroll: lo que no entra, no se ve nunca
      if (v.b > vh + 1 || (stuck && v.t < -1)) {
        out.push({ key: describe(el), msg: `${describe(el)} queda fuera de la pantalla (de ${Math.round(v.t)} a ${Math.round(v.b)}px en ${vh}px de alto)` });
        continue;
      }
      if (v.b <= 0) continue; // quedó arriba: se alcanza subiendo
      for (const b of bottom) {
        const t = Math.max(v.t, b.r.top);
        const bt = Math.min(v.b, b.r.bottom);
        const l = Math.max(v.l, b.r.left);
        const r = Math.min(v.r, b.r.right);
        if (bt - t < 2 || r - l < 2) continue;
        const hit = document.elementFromPoint((l + r) / 2, (t + bt) / 2);
        if (hit && b.el.contains(hit) && !el.contains(hit)) {
          out.push({ key: `${describe(el)} ⟂ ${short(b.el)}`, msg: `${describe(el)} queda tapado ${Math.round(bt - t)}px por ${short(b.el)}` });
          break;
        }
      }
    }
    return out;
  }

  window.__kfCheck = {
    top({ vw, vh, touch }) {
      const root = scope();
      return {
        overflow: overflow(vw, vh),
        cut: cut(vw, root),
        ...text(root),
        reach: heading(vw, vh, root),
        tap: touch ? taps(vw, root) : []
      };
    },
    scrollToEnd,
    scrollable: () => document.scrollingElement.scrollHeight > window.innerHeight + 1,
    bottom({ vw, vh }) { return { reach: reach(vw, vh, scope()) }; },
    scrollTop() {
      window.scrollTo(0, 0);
      for (const el of document.querySelectorAll('body *')) if (el.scrollTop) el.scrollTop = 0;
    }
  };
}

// ---------- Recorrido ----------
const problems = [];
const report = (p) => problems.push(p);
let done = 0;
let total = 0;

// Espera a que no haya pedidos en curso (la conexión de tiempo real /api/events no cuenta).
function trackNetwork(page) {
  const pending = new Set();
  let last = Date.now();
  page.on('request', (r) => { if (!r.url().includes('/api/events')) { pending.add(r); last = Date.now(); } });
  const finish = (r) => { if (pending.delete(r)) last = Date.now(); };
  page.on('requestfinished', finish);
  page.on('requestfailed', finish);
  return async ({ quiet = 350, max = 10000 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < max) {
      if (!pending.size && Date.now() - last >= quiet) return;
      await new Promise((r) => setTimeout(r, 40));
    }
  };
}

async function runJob(browser, { vp, group, account, routes, cookie, ids }) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.touch,
    hasTouch: vp.touch,
    reducedMotion: 'reduce', // sin animaciones: las medidas no dependen del momento de la captura
    locale: 'es-UY',
    timezoneId: 'America/Montevideo'
  });
  if (cookie) await context.addCookies([cookie]);
  // El panel arranca mostrando también los datos demo (si no, el resumen queda en cero).
  if (account === 'admin') await context.addInitScript(() => { try { localStorage.setItem('kefounder:admin:scope', '"all"'); } catch { /* sin storage */ } });
  await context.addInitScript(installChecks);
  const page = await context.newPage();
  const idle = trackNetwork(page);
  let current = null;
  const base = () => ({ group: group.id, account, viewport: vp.name, route: current?.name, path: current?.url });
  page.on('pageerror', (e) => current && report({ ...base(), check: 'errors', key: `JS: ${e.message.split('\n')[0]}`, msg: `error de JS: ${e.message.split('\n')[0]}` }));
  page.on('console', (m) => {
    if (!current || m.type() !== 'error') return;
    // Los recursos fallidos se informan abajo con su URL y estado.
    if (/Failed to load resource|favicon/.test(m.text())) return;
    report({ ...base(), check: 'errors', key: `consola: ${m.text().slice(0, 120)}`, msg: `consola: ${m.text().slice(0, 300)}` });
  });
  page.on('response', (res) => {
    if (!current || !res.url().startsWith(BASE)) return;
    const status = res.status();
    const url = res.url().slice(BASE.length);
    if (status < 400) return;
    if (status < 500 && EXPECTED_4XX.some((e) => e.status === status && e.test(url, account))) return;
    report({ ...base(), check: 'errors', key: `${status} ${res.request().method()} ${url.replace(/\d+/g, ':n')}`, msg: `${status} en ${res.request().method()} ${url}` });
  });

  for (const route of routes) {
    const spec = typeof route === 'string' ? { path: route, name: route } : route;
    current = { name: spec.name, url: fill(spec.path, ids) };
    const add = (check, items) => { for (const item of items) report({ ...base(), check, ...item }); };
    try {
      const T = [Date.now()];
      await page.goto(BASE + current.url, { waitUntil: 'load', timeout: 30000 });
      T.push(Date.now());
      await idle();
      T.push(Date.now());
      await page.evaluate(() => document.fonts.ready);
      if (spec.click) {
        const { role = 'button', name } = spec.click;
        try {
          await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click({ timeout: 5000 });
          await page.locator(spec.expect || '[role=dialog], [role=menu]').first().waitFor({ state: 'visible', timeout: 5000 });
          await idle({ quiet: 250, max: 5000 });
        } catch (error) {
          add('action', [{ key: spec.name, msg: `no se pudo abrir: ${error.message.split('\n')[0]}` }]);
          continue;
        }
      }
      await page.waitForTimeout(120);
      if (wantsShot(vp)) await shot(page, vp, account, spec.name, 'top');
      T.push(Date.now());
      const top = await page.evaluate((o) => window.__kfCheck.top(o), { vw: vp.width, vh: vp.height, touch: vp.touch });
      T.push(Date.now());
      for (const [check, items] of Object.entries(top)) add(check, items);
      // Al fondo: lo que haya cargado de más (listas infinitas) también tiene que quedar a la vista.
      await page.evaluate(() => window.__kfCheck.scrollToEnd());
      await idle({ quiet: 200, max: 4000 });
      await page.evaluate(() => window.__kfCheck.scrollToEnd());
      await page.waitForTimeout(80);
      T.push(Date.now());
      const bottom = await page.evaluate((o) => window.__kfCheck.bottom(o), { vw: vp.width, vh: vp.height });
      T.push(Date.now());
      if (spec.click && await page.locator('.sheet').count()) {
        const bounds = await page.locator('.sheet').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const close = element.querySelector('.sheet-close')?.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, closeVisible: Boolean(close && close.width >= 28 && close.height >= 28 && close.top >= 0 && close.bottom <= innerHeight) };
        });
        if (Math.abs(bounds.x) > 2 || Math.abs(bounds.y) > 2 || Math.abs(bounds.width - vp.width) > 2 || Math.abs(bounds.height - vp.height) > 2 || !bounds.closeVisible) {
          add('modal', [{ key: 'pantalla completa', msg: `modal ${Math.round(bounds.width)}×${Math.round(bounds.height)} en ${vp.name}; cierre visible: ${bounds.closeVisible}` }]);
        }
        await page.locator('.sheet-close').click();
        await page.locator('.sheet').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => add('modal', [{ key: 'cerrar', msg: 'el botón Cerrar no cierra el modal' }]));
        if (!await page.locator('.sheet').count()) {
          const { role = 'button', name } = spec.click;
          await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click();
          await page.locator('.sheet').waitFor({ state: 'visible', timeout: 3000 });
          await page.keyboard.press('Escape');
          await page.locator('.sheet').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => add('modal', [{ key: 'escape', msg: 'Escape no cierra el modal' }]));
        }
      }
      if (args.debug) console.log(`${vp.name} ${account} ${spec.name}: ${T.slice(1).map((t, i) => t - T[i]).join(' / ')} ms`);
      add('reach', bottom.reach);
      if (wantsShot(vp) && vp.touch && await page.evaluate(() => window.__kfCheck.scrollable())) await shot(page, vp, account, spec.name, 'bottom');
    } catch (error) {
      add('errors', [{ key: `carga: ${error.message.split('\n')[0]}`, msg: `no se pudo medir: ${error.message.split('\n')[0]}` }]);
    } finally {
      done += 1;
      if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${total} pantallas medidas…`);
    }
  }
  current = null;
  await context.close();
  // El detalle se va guardando: si la corrida se corta, lo medido hasta ahí no se pierde.
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(problems, null, 2));
  if (!process.stdout.isTTY) console.log(`  · ${vp.name} ${account}: ${routes.length} pantallas (${done}/${total})`);
}

async function shot(page, vp, account, name, phase) {
  const slug = name.normalize('NFD').replace(/\p{M}/gu, '').replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'inicio';
  const dir = path.join(OUT, vp.name);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${account}--${slug}${phase === 'bottom' ? '--fondo' : ''}.png`) });
}

// ---------- Resumen ----------
// Los problemas se agrupan por cuenta + ruta + elemento, con los tamaños donde aparecen. Los avisos
// se agrupan solo por elemento (el mismo botón chico se repite en muchas pantallas).
const compact = (items, max = 6) => (items.length > max ? `${items.slice(0, max).join(', ')} (+${items.length - max})` : items.join(', '));
function summarize() {
  const byCheck = new Map();
  for (const p of problems) {
    if (!byCheck.has(p.check)) byCheck.set(p.check, new Map());
    const key = WARNINGS.has(p.check) ? p.key : `${p.account}|${p.route}|${p.key}`;
    const groupMap = byCheck.get(p.check);
    if (!groupMap.has(key)) groupMap.set(key, { ...p, viewports: new Set(), routes: new Set() });
    groupMap.get(key).viewports.add(p.viewport);
    groupMap.get(key).routes.add(p.route);
  }
  let failures = 0;
  let warnings = 0;
  for (const check of Object.keys(CHECKS)) {
    const entries = [...(byCheck.get(check)?.values() || [])];
    if (!entries.length) continue;
    const warn = WARNINGS.has(check);
    if (warn) warnings += entries.length; else failures += entries.length;
    console.log(`
${warn ? '!' : '✗'} ${CHECKS[check]} (${entries.length})`);
    for (const e of entries) {
      const sizes = VIEWPORTS.filter((v) => e.viewports.has(v.name)).map((v) => v.name);
      if (warn) console.log(`  ${e.msg}
      en ${compact([...e.routes], 4)} · ${compact(sizes)}`);
      else console.log(`  [${e.account}] ${e.route} — ${e.msg}
      en ${compact(sizes)}`);
    }
  }
  return { failures, warnings };
}

// ---------- Principal ----------
let exitCode = 0;
try {
  await waitForServer();
  const cookies = {
    sol: await login('sol@kefounder.demo', DEMO_PASSWORD),
    rodrigo: await login('rodrigo@kefounder.demo', DEMO_PASSWORD),
    admin: await login(ADMIN.email, ADMIN.password)
  };
  const ids = await resolveIds(cookies);

  const jobs = [];
  for (const vp of viewports) {
    for (const group of GROUPS) {
      if (groupFilter && !groupFilter.includes(group.id)) continue;
      for (const account of group.accounts) {
        const routes = group.routes.filter((r) => routeMatches(r)
          && (typeof r === 'string' || ((!r.when || r.when(vp)) && (!r.accounts || r.accounts.includes(account)))));
        if (routes.length) jobs.push({ vp, group, account, routes, cookie: cookies[account] || null, ids: ids[account] });
      }
    }
  }
  total = jobs.reduce((n, j) => n + j.routes.length, 0);
  if (!total) throw new Error('Ninguna ruta coincide con los filtros.');
  const routeCount = new Set(jobs.flatMap((j) => j.routes.map((r) => `${j.account}${routeName(r)}`))).size;
  console.log(`\nKeFounder! · chequeo de pantallas · ${BASE}`);
  console.log(`  ${routeCount} pantallas × ${viewports.length} tamaños = ${total} mediciones · ${WORKERS} en paralelo${args.shots ? ` · capturas en ${OUT}` : ''}\n`);

  const started = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const queue = [...jobs];
  await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await runJob(browser, job);
  }));
  await browser.close();
  if (process.stdout.isTTY) process.stdout.write('\n');

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(problems, null, 2));
  const { failures, warnings } = summarize();
  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\n${failures ? `✗ ${failures} problemas` : '✓ Sin problemas'}${warnings ? ` · ${warnings} avisos` : ''} · ${total} mediciones en ${secs}s · detalle en ${path.join(OUT, 'report.json')}\n`);
  exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  cleanup();
}
setTimeout(() => process.exit(exitCode), 500);
