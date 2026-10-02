// Prueba end-to-end en un navegador real (Chrome) contra un servidor aislado.
// Requiere el frontend compilado: npm run build && npm run test:e2e
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.E2E_PORT || 3190);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.E2E_SHOTS || path.join(os.tmpdir(), 'kefounder-e2e-shots');
fs.mkdirSync(OUT, { recursive: true });

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('Falta el build del frontend. Corré primero: npm run build');
  process.exit(1);
}

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-e2e-'));
const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), KEFOUNDER_DATA_DIR: dataDir, HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

const results = [];
const step = async (name, fn) => {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start} ms)`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  ✗ ${name}\n      ${error.message.split('\n')[0]}`);
  }
};
const expect = (cond, message) => { if (!cond) throw new Error(message); };

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`${BASE}/api/config`); if (r.ok) return; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`El servidor no arrancó:\n${serverLog}`);
}

const errors = [];
const watch = (page, label) => {
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`[${label}] ${m.text()}`); });
};

async function loginContext(browser, email, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 760, isMobile: viewport.width < 760 });
  const page = await context.newPage();
  watch(page, email);
  await page.goto(`${BASE}/ingresar`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('kefounder1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(`${BASE}/`);
  return { context, page };
}

const overlap = (a, b) => a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME });
  console.log(`\nKeFounder! e2e · ${BASE}\n`);

  // ---------- Registro y onboarding ----------
  const ctxNew = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctxNew.newPage();
  watch(p, 'nuevo');

  await step('bienvenida → registro → onboarding completo', async () => {
    await p.goto(BASE);
    await p.waitForURL(/bienvenida/);
    await p.getByRole('button', { name: 'Crear mi cuenta' }).click();
    await p.getByLabel('Nombre y apellido').fill('Paz Testeo');
    await p.getByLabel('Email').fill(`paz${Date.now()}@test.dev`);
    await p.getByLabel('Contraseña', { exact: true }).fill('secreto123');
    await p.getByRole('button', { name: 'Crear cuenta' }).click();
    await p.waitForURL(/onboarding/);
    await p.screenshot({ path: path.join(OUT, '00-onboarding.png') });
    await p.getByRole('radio', { name: /Sumarme a un proyecto/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('checkbox', { name: /Developer/ }).click();
    await p.getByRole('checkbox', { name: /Designer/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('radio', { name: /10–20 horas/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('radio', { name: /^Equity$/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByLabel('Rol principal').fill('Frontend developer');
    await p.getByLabel('Ciudad').fill('Montevideo');
    await p.getByLabel('Bio corta').fill('Me gusta construir interfaces simples que la gente disfruta usar.');
    await p.getByLabel('Skills').fill('React');
    await p.keyboard.press('Enter');
    await p.getByRole('button', { name: 'Empezar a descubrir' }).click();
    await p.waitForURL(`${BASE}/`);
    await p.locator('.deck-card.is-top').waitFor();
  });

  await step('descubrir en mobile: tarjeta y acciones sin superponerse con la barra inferior', async () => {
    const boxes = await p.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null; };
      return { card: r('.deck-card.is-top'), actions: r('.deck-actions'), nav: r('.bottom-nav'), connect: r('.round-connect') };
    });
    expect(boxes.card && boxes.actions && boxes.nav, 'faltan elementos en pantalla');
    expect(!overlap(boxes.actions, boxes.nav), 'los botones de acción se superponen con la barra inferior');
    expect(!overlap(boxes.card, boxes.actions), 'la tarjeta se superpone con los botones');
    expect(boxes.connect.y + boxes.connect.height <= boxes.nav.y, 'Conectar queda debajo de la barra');
    await p.screenshot({ path: path.join(OUT, '01-descubrir.png') });
  });

  await step('swipe a la derecha con el dedo envía interés', async () => {
    const name = await p.locator('.deck-card.is-top h2').first().innerText();
    const box = await p.locator('.deck-card.is-top').boundingBox();
    const y = box.y + box.height * 0.4;
    await p.mouse.move(box.x + box.width / 2, y);
    await p.mouse.down();
    for (let i = 1; i <= 12; i += 1) await p.mouse.move(box.x + box.width / 2 + i * 22, y + i);
    await p.mouse.up();
    await p.locator('.toast', { hasText: /Interés enviado|te quedan/ }).waitFor({ timeout: 4000 });
    const next = await p.locator('.deck-card.is-top h2').first().innerText();
    expect(next !== name, 'la tarjeta no avanzó');
  });

  await step('pasar, guardar y deshacer', async () => {
    const first = await p.locator('.deck-card.is-top h2').first().innerText();
    await p.getByRole('button', { name: 'Pasar' }).click();
    await p.waitForTimeout(450);
    await p.getByRole('button', { name: 'Volver a la anterior' }).click();
    await p.waitForTimeout(350);
    const back = await p.locator('.deck-card.is-top h2').first().innerText();
    expect(back === first, `deshacer no volvió a la tarjeta (${back} ≠ ${first})`);
    await p.getByRole('button', { name: 'Guardar', exact: true }).click();
    await p.locator('.toast', { hasText: 'Guardado' }).waitFor({ timeout: 4000 });
  });

  await step('cambiar Personas → Proyectos → Personas mantiene cada mazo en su modo', async () => {
    const person = await p.locator('.deck-card.is-top h2').first().innerText();
    await p.getByRole('tab', { name: /Proyectos/ }).click();
    await p.locator('.deck-card.is-top .dc-project-card').waitFor();
    await p.getByRole('tab', { name: /Personas/ }).click();
    await p.locator('.deck-card.is-top').waitFor();
    expect(await p.locator('.deck-card.is-top .dc-project-card').count() === 0, 'quedó una tarjeta de proyecto en Personas');
    const again = await p.locator('.deck-card.is-top h2').first().innerText();
    expect(again === person, `el mazo de personas cambió (${again} ≠ ${person})`);
  });

  await step('filtro avanzado muestra el paywall de Plus y el checkout activa el plan', async () => {
    await p.getByRole('button', { name: 'Filtros y orden' }).click();
    await p.locator('.filter-advanced-body').click({ position: { x: 20, y: 20 } });
    await p.locator('.paywall h2', { hasText: 'Filtros avanzados' }).waitFor();
    await p.getByRole('button', { name: 'Elegir Plus' }).click();
    await p.getByRole('button', { name: 'Confirmar Plus' }).click();
    await p.locator('.checkout-done').waitFor();
    await p.getByRole('button', { name: 'Empezar a usarlo' }).click();
    await p.keyboard.press('Escape');
    const plan = await p.evaluate(async () => (await (await fetch('/api/auth/me')).json()).user.plan);
    expect(plan === 'plus', `el plan quedó en ${plan}`);
  });

  await step('conectar con un proyecto: el founder de demo acepta y escribe (tiempo real)', async () => {
    await p.keyboard.press('Escape');
    await p.getByRole('tab', { name: /Proyectos/ }).click();
    await p.locator('.deck-card.is-top').waitFor();
    // Hasta 3 intentos: los perfiles demo aceptan ~80% de las veces.
    let matched = false;
    for (let i = 0; i < 3 && !matched; i += 1) {
      // La aceptación puede llegar justo después de la espera: su celebración taparía el botón.
      if (await p.locator('.celebration').count()) { matched = true; break; }
      await p.getByRole('button', { name: 'Conectar', exact: true }).click();
      matched = await p.locator('.celebration').waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
    }
    expect(matched, 'no apareció la celebración de match');
    await p.screenshot({ path: path.join(OUT, '02-match.png') });
    await p.locator('.celebration').getByRole('button', { name: 'Enviar mensaje' }).click();
    await p.waitForURL(/\/chat\//);
    await p.locator('.msg:not(.is-mine) .msg-bubble p').first().waitFor({ timeout: 15000 });
  });

  // Un reintento de conexión puede generar otro match más tarde: se cierra su celebración.
  const dismissCelebration = async () => {
    await p.waitForTimeout(300);
    if (await p.locator('.celebration').count()) await p.locator('.celebration').getByRole('button', { name: 'Seguir descubriendo' }).click();
  };

  await step('chat: enviar mensaje, ver "escribiendo…" y recibir respuesta', async () => {
    await dismissCelebration();
    const before = await p.locator('.msg:not(.is-mine)').count();
    await p.getByLabel('Mensaje', { exact: true }).fill('¡Hola! ¿Cuántas horas por semana le dedican hoy?');
    await p.locator('.composer-send').click();
    await p.locator('.msg.is-mine', { hasText: 'Cuántas horas' }).waitFor();
    await p.locator('.thread-person span.is-typing, .typing-bubble').first().waitFor({ timeout: 6000 });
    await p.waitForFunction((n) => document.querySelectorAll('.msg:not(.is-mine)').length > n, before, { timeout: 10000 });
    await p.locator('.msg.is-mine .is-read').last().waitFor({ timeout: 4000 });
    await p.screenshot({ path: path.join(OUT, '03-chat.png') });
  });

  await step('proponer reunión desde el chat', async () => {
    await dismissCelebration();
    await p.getByRole('button', { name: 'Adjuntar o compartir' }).click();
    await p.getByRole('button', { name: 'Proponer reunión' }).click();
    await p.getByLabel('Enlace de videollamada o agenda').fill('meet.google.com/abc-defg-hij');
    await p.getByRole('button', { name: 'Enviar propuesta' }).click();
    await p.locator('.msg-meeting').last().waitFor();
  });

  await step('interesados visibles con Plus', async () => {
    await p.goto(`${BASE}/interesados`);
    await p.locator('.page-heading h1').waitFor();
    const locked = await p.locator('.locked-view').count();
    expect(locked === 0, 'con Plus no debería estar bloqueado');
  });

  await step('crear proyecto con el asistente de 8 pasos', async () => {
    await p.goto(`${BASE}/proyectos/nuevo`);
    await p.getByLabel('Nombre del proyecto').fill('Brújula');
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByLabel('Descripción corta').fill('Orientación vocacional con mentores reales.');
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByLabel('El problema').fill('Los jóvenes eligen carrera sin hablar con nadie que la ejerza.');
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('radio', { name: /Validación/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('button', { name: 'Designer' }).click();
    await p.getByRole('button', { name: 'Growth' }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('radio', { name: /Menos de 10/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.getByRole('radio', { name: /^Equity/ }).click();
    await p.getByRole('button', { name: 'Continuar' }).click();
    await p.locator('.wizard-preview-card').waitFor();
    await p.screenshot({ path: path.join(OUT, '04-wizard.png') });
    await p.getByRole('button', { name: 'Publicar' }).click();
    await p.waitForURL(/\/proyectos\/\d+\/editar/);
    await p.locator('.edit-status', { hasText: 'Publicado' }).waitFor();
  });

  await step('editar el proyecto y guardar', async () => {
    await p.getByLabel('Solución').fill('Charlas de 30 minutos con profesionales que eligieron esa carrera.');
    await p.getByRole('button', { name: 'Guardar cambios' }).click();
    await p.locator('.toast', { hasText: 'Cambios guardados' }).waitFor();
  });
  await ctxNew.close();

  // ---------- Tiempo real entre dos personas ----------
  await step('chat en tiempo real entre Sol y Martín', async () => {
    const sol = await loginContext(browser, 'sol@kefounder.demo', { width: 1280, height: 800 });
    const martin = await loginContext(browser, 'martin@kefounder.demo');
    const matchId = await sol.page.evaluate(async () => (await (await fetch('/api/matches')).json()).items.find((m) => m.other.name === 'Martín López').id);
    await martin.page.goto(`${BASE}/chat/${matchId}`);
    await martin.page.locator('.thread-head').waitFor();
    await sol.page.goto(`${BASE}/chat/${matchId}`);
    await sol.page.getByLabel('Mensaje', { exact: true }).fill('¿Te sirve el jueves a las 18 para la demo?');
    await sol.page.keyboard.press('Enter');
    await martin.page.locator('.msg:not(.is-mine)', { hasText: 'jueves a las 18' }).waitFor({ timeout: 5000 });
    await martin.page.getByLabel('Mensaje', { exact: true }).fill('¡Perfecto, ahí estoy!');
    await martin.page.locator('.composer-send').click();
    await sol.page.locator('.msg:not(.is-mine)', { hasText: 'Perfecto, ahí estoy' }).waitFor({ timeout: 5000 });
    await sol.page.locator('.msg.is-mine .is-read').last().waitFor({ timeout: 5000 });
    await sol.page.screenshot({ path: path.join(OUT, '05-realtime-desktop.png') });
    await martin.page.screenshot({ path: path.join(OUT, '06-realtime-mobile.png') });
    await sol.context.close();
    await martin.context.close();
  });

  await step('match instantáneo al conectar con alguien que ya te eligió', async () => {
    const sol = await loginContext(browser, 'sol@kefounder.demo');
    await sol.page.getByRole('tab', { name: /Personas/ }).click();
    await sol.page.locator('.deck-card.is-top').waitFor();
    await sol.page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await sol.page.locator('.celebration').waitFor({ timeout: 4000 });
    await sol.context.close();
  });

  // ---------- Panel de administración ----------
  // La cuenta se crea con la consola (npm run admin), igual que en producción. Contraseña descartable.
  const ADMIN = { email: 'e2e-admin@kefounder.test', password: `e2e-${Date.now()}-panel` };
  await step('consola: crear la cuenta de administración', async () => {
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/admin-cli.js', 'crear', '--email', ADMIN.email, '--nombre', 'Admin E2E'], {
      cwd: root, env: { ...process.env, KEFOUNDER_DATA_DIR: dataDir, KEFOUNDER_ADMIN_PASSWORD: ADMIN.password }, encoding: 'utf8'
    });
    expect(r.status === 0, r.stderr || r.stdout);
  });

  const adminLogin = async (viewport) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 760 ? 2 : 1, hasTouch: viewport.width < 760, isMobile: viewport.width < 760 });
    const page = await context.newPage();
    watch(page, 'admin');
    await page.goto(`${BASE}/ingresar`);
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(`${BASE}/admin`);
    return { context, page };
  };

  await step('administración: entra directo al panel y ve el resumen', async () => {
    const { context, page } = await adminLogin({ width: 1366, height: 768 });
    await page.getByRole('heading', { name: 'Resumen' }).waitFor();
    await page.getByRole('tab', { name: 'Incluir demo' }).click();
    await page.locator('.adm-kpi').first().waitFor();
    await page.goto(`${BASE}/`);
    await page.waitForURL(`${BASE}/admin`);
    await page.screenshot({ path: path.join(OUT, '10-admin-resumen.png') });
    await context.close();
  });

  await step('administración: buscar una cuenta y darle un plan de cortesía con motivo', async () => {
    const { context, page } = await adminLogin({ width: 1366, height: 768 });
    await page.getByRole('link', { name: 'Usuarios' }).click();
    await page.getByRole('tab', { name: /Demo/ }).click();
    await page.getByPlaceholder('Nombre, email o #número').fill('sol@');
    await page.locator('.adm-table tbody tr', { hasText: 'sol@kefounder.demo' }).first().click();
    await page.waitForURL(/\/admin\/usuarios\/\d+/);
    await page.getByRole('button', { name: 'Cambiar plan' }).click();
    const sheet = page.getByRole('dialog', { name: 'Cambiar plan' });
    await sheet.getByRole('button', { name: /Pro/ }).click();
    await sheet.getByRole('button', { name: 'Cambiar plan' }).click();
    await sheet.locator('.form-error').waitFor();
    await sheet.locator('textarea').fill('Prueba e2e: beta tester');
    await sheet.getByRole('button', { name: 'Cambiar plan' }).click();
    await page.locator('.adm-entity-pills .plan-badge', { hasText: 'cortesía' }).waitFor();
    await page.getByRole('tab', { name: 'Historial' }).click();
    await page.getByText('Cambió el plan').waitFor();
    await page.screenshot({ path: path.join(OUT, '11-admin-usuario.png') });
    const me = await (await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sol@kefounder.demo', password: 'kefounder1234' }) })).json();
    expect(me.user.plan === 'pro' && me.user.planPeriod === 'courtesy', `plan ${me.user.plan}/${me.user.planPeriod}`);
    await context.close();
  });

  await step('administración: tarea de seguimiento y búsqueda global', async () => {
    const { context, page } = await adminLogin({ width: 1366, height: 768 });
    await page.getByRole('link', { name: /Seguimiento/ }).click();
    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nueva tarea' });
    await sheet.getByPlaceholder('Ej.: llamar para renovar el plan').fill('Revisar el lanzamiento (e2e)');
    await sheet.getByRole('button', { name: 'Crear tarea' }).click();
    const row = page.locator('.adm-table tbody tr', { hasText: 'Revisar el lanzamiento (e2e)' });
    await row.waitFor();
    await row.getByRole('button', { name: 'Marcar como hecha' }).click();
    await row.waitFor({ state: 'detached' });
    await page.getByLabel('Buscar en el panel').fill('Brote');
    await page.locator('.adm-search-item', { hasText: 'Brote' }).first().waitFor();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/admin\/proyectos\/\d+/);
    await page.getByRole('button', { name: 'Ocultar proyecto' }).waitFor();
    await context.close();
  });

  await step('administración en el celular: menú desplegable sin desbordes', async () => {
    const { context, page } = await adminLogin({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.locator('.adm.has-drawer .adm-side').waitFor();
    await page.getByRole('link', { name: /Moderación/ }).click();
    await page.getByRole('heading', { name: 'Moderación' }).waitFor();
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(!wide, 'la página desborda horizontalmente');
    await page.screenshot({ path: path.join(OUT, '12-admin-mobile.png') });
    await context.close();
  });

  // ---------- Revista ----------
  await step('revista: desde la bienvenida, sin cuenta, se lee una nota', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    watch(page, 'lector');
    await page.goto(`${BASE}/bienvenida`);
    await page.getByRole('link', { name: /Leé la Revista KeFounder!/ }).click();
    await page.waitForURL(`${BASE}/revista`);
    const lead = page.locator('.rv-hero-copy h1 a');
    const title = (await lead.textContent()).trim();
    await lead.click();
    await page.getByRole('heading', { level: 1, name: title }).waitFor();
    await page.locator('.rv-body .rv-b-q').first().waitFor();
    await page.getByRole('button', { name: 'Copiar enlace' }).waitFor();
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(!wide, 'la nota desborda horizontalmente en el celular');
    await page.screenshot({ path: path.join(OUT, '13-revista-nota-mobile.png') });
    await page.getByRole('link', { name: 'Startups' }).first().click();
    await page.getByRole('heading', { level: 1, name: 'Startups' }).waitFor();
    await context.close();
  });

  await step('revista en el panel: escribir, publicar y verla en la revista', async () => {
    const { context, page } = await adminLogin({ width: 1366, height: 768 });
    await page.getByRole('link', { name: 'Revista' }).click();
    await page.getByRole('button', { name: 'Nueva nota' }).first().click();
    await page.getByPlaceholder('Título de la nota').fill('Entrevista e2e: construir desde Montevideo');
    await page.getByPlaceholder(/Bajada/).fill('Una nota de prueba escrita desde el panel.');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await page.waitForURL(/\/admin\/revista\/\d+/);
    await page.getByLabel('Texto de la nota').fill('Una introducción.\n\nP: ¿Cómo empezó?\nR: Con una idea y muchas ganas.\n\n> Construir es elegir con quién.\n> — Founder e2e');
    await page.getByLabel('Enlace de imagen para Foto principal').fill('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40');
    await page.getByRole('button', { name: 'Usar' }).click();
    // Con cambios sin guardar, salir pide confirmación; si se cancela, se queda en la nota.
    let asked = false;
    page.once('dialog', (dialog) => { asked = true; dialog.dismiss(); });
    await page.locator('.adm-nav').getByRole('link', { name: 'Resumen' }).click();
    await page.waitForTimeout(300);
    expect(asked && /\/admin\/revista\/\d+/.test(page.url()), 'salir con cambios sin guardar no pidió confirmación');
    await page.getByRole('tab', { name: 'Vista previa' }).click();
    await page.locator('.adm-preview .rv-b-quote').waitFor();
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText(/Guardada/).waitFor();
    await page.getByRole('button', { name: 'Publicar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publicar ahora' }).click();
    await page.locator('.adm-entity-pills .adm-status', { hasText: 'Publicada' }).waitFor();
    await page.screenshot({ path: path.join(OUT, '14-admin-revista-editor.png') });
    await context.close();

    const reader = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const view = await reader.newPage();
    watch(view, 'lector');
    await view.goto(`${BASE}/revista/entrevista-e2e-construir-desde-montevideo`);
    await view.getByRole('heading', { level: 1, name: 'Entrevista e2e: construir desde Montevideo' }).waitFor();
    await view.locator('.rv-b-quote cite', { hasText: 'Founder e2e' }).waitFor();
    await reader.close();
  });

  await browser.close();
} catch (error) {
  console.error(error);
  results.push({ name: 'setup', ok: false, error: error.message });
} finally {
  server.kill();
  setTimeout(() => fs.rmSync(dataDir, { recursive: true, force: true }), 300);
}

const failed = results.filter((r) => !r.ok);
if (errors.length) {
  console.log('\nErrores de consola:');
  for (const e of [...new Set(errors)].slice(0, 10)) console.log(`  · ${e}`);
}
console.log(`\n${results.length - failed.length}/${results.length} pasos OK · capturas en ${OUT}\n`);
process.exit(failed.length || errors.length ? 1 : 0);
