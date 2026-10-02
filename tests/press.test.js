import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { PLANS, PRESS } from '../shared/catalog.js';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { createBots } from '../server/bots.js';
import { now, openDb } from '../server/db.js';
import { createHub } from '../server/realtime.js';
import { seed } from '../server/seed.js';

let server;
let base;
let ctx;
let dataDir;
let admin;
const ADMIN = { email: 'difusion@kefounder.test', password: 'difusion-de-prueba-2026' };
const COVER = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449';

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  return { get: (u) => call('GET', u), post: (u, b) => call('POST', u, b ?? {}), put: (u, b) => call('PUT', u, b), del: (u, b) => call('DELETE', u, b) };
}
const login = async (email, password = 'kefounder1234') => {
  const c = client();
  assert.equal((await c.post('/api/auth/login', { email, password })).status, 200);
  return c;
};
const idOf = (email) => ctx.db.get('SELECT id FROM users WHERE email = ?', [email]).id;
const projectOf = (email, name) => ctx.db.get('SELECT id FROM projects WHERE owner_id = ? AND name = ?', [idOf(email), name]).id;
const notifications = (email, type) => ctx.db.all('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY id DESC', [idOf(email), type]);

const PITCH = 'Brote ayuda a los productores a regar solo lo necesario con sensores y datos. Ya ahorramos agua en 60 campos y queremos contar cómo armamos el equipo.';

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-press-'));
  const db = openDb(path.join(dataDir, 'test.db'));
  await seed(db, { reset: true });
  db.run(
    "INSERT INTO users (email, password_hash, name, role, segment, onboarded, email_verified, visible, settings, created_at) VALUES (?, ?, 'Redacción', 'admin', 'staff', 0, 1, 0, '{}', ?)",
    [ADMIN.email, await hashPassword(ADMIN.password), now()]
  );
  ctx = { db, hub: createHub(), config: { demo: true, demoAccounts: [], uploadsDir: path.join(dataDir, 'uploads'), distDir: dataDir } };
  ctx.bots = createBots(ctx, { enabled: false });
  const app = createApp(ctx);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  admin = await login(ADMIN.email, ADMIN.password);
});

after(() => {
  ctx.bots.stop();
  ctx.hub.closeAll();
  server.closeAllConnections?.();
  server.close();
  ctx.db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('difusión en los planes', () => {
  test('Pro incluye una mención por semestre y Startup una nota propia por trimestre', () => {
    assert.equal(PLANS.free.features.pressMention, false);
    assert.equal(PLANS.plus.features.pressMention, false);
    assert.equal(PLANS.pro.features.pressMention, true);
    assert.equal(PLANS.pro.features.pressFeature, false);
    assert.equal(PLANS.startup.features.pressFeature, true);
    assert.deepEqual([PRESS.pro.kind, PRESS.pro.everyDays], ['mencion', 182]);
    assert.deepEqual([PRESS.startup.kind, PRESS.startup.everyDays], ['nota', 91]);
    assert.ok(PLANS.startup.benefits.some((b) => b.includes('Revista') && b.includes('Instagram')));
  });

  test('Free y Plus ven la invitación y el pedido muestra el paywall de Pro', async () => {
    for (const email of ['sol@kefounder.demo', 'ana@kefounder.demo']) {
      const c = await login(email);
      assert.equal((await c.get('/api/me/press')).data.allowance.enabled, false);
      const res = await c.post('/api/me/press', { projectId: 1, pitch: PITCH, spokesperson: 'Alguien' });
      assert.equal(res.status, 402);
      assert.equal(res.data.requiredPlan, 'pro');
    }
  });

  test('Pro: la mención pedida (pendiente) usa el cupo del semestre', async () => {
    const martin = await login('martin@kefounder.demo');
    const { data } = await martin.get('/api/me/press');
    assert.equal(data.allowance.kind, 'mencion');
    assert.equal(data.allowance.available, false);
    assert.equal(data.items[0].status, 'pending');
    const again = await martin.post('/api/me/press', { projectId: projectOf('martin@kefounder.demo', 'Formo'), pitch: PITCH, spokesperson: 'Martín' });
    assert.equal(again.status, 429);
    assert.equal(again.data.code, 'press_quota');
  });
});

describe('pedir difusión (Startup)', () => {
  test('valida el pedido, respeta el cupo y se puede cancelar mientras está pendiente', async () => {
    const rodrigo = await login('rodrigo@kefounder.demo');
    const brote = projectOf('rodrigo@kefounder.demo', 'Brote');
    const start = (await rodrigo.get('/api/me/press')).data;
    assert.equal(start.allowance.kind, 'nota');
    assert.equal(start.allowance.available, true);
    assert.ok(start.projects.some((p) => p.id === brote));

    assert.equal((await rodrigo.post('/api/me/press', { projectId: brote, pitch: 'Muy corto', spokesperson: 'Rodrigo' })).data.field, 'pitch');
    assert.equal((await rodrigo.post('/api/me/press', { projectId: brote, pitch: PITCH, spokesperson: 'Rodrigo', instagram: 'no es un usuario!' })).data.field, 'instagram');
    const foreign = projectOf('sol@kefounder.demo', 'ContaAI');
    assert.equal((await rodrigo.post('/api/me/press', { projectId: foreign, pitch: PITCH, spokesperson: 'Rodrigo' })).data.field, 'projectId');

    const sent = await rodrigo.post('/api/me/press', { projectId: brote, pitch: PITCH, spokesperson: 'Rodrigo Barrios', spokespersonRole: 'CEO', instagram: 'brote.agro', website: 'brote.com.py' });
    assert.equal(sent.status, 201);
    assert.equal(sent.data.items[0].instagram, '@brote.agro');
    assert.equal(sent.data.items[0].website, 'https://brote.com.py/');
    assert.equal(sent.data.allowance.available, false);
    assert.equal((await rodrigo.post('/api/me/press', { projectId: brote, pitch: PITCH, spokesperson: 'Rodrigo' })).status, 429);

    const canceled = await rodrigo.del(`/api/me/press/${sent.data.items[0].id}`);
    assert.equal(canceled.data.allowance.available, true, 'cancelar devuelve el cupo');
    assert.equal((await admin.put(`/api/admin/press/${sent.data.items[0].id}`, { status: 'in_progress' })).status, 400, 'un pedido cancelado no se trabaja');
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.del(`/api/me/press/${sent.data.items[0].id}`)).status, 403);
  });
});

describe('difusión desde el panel', () => {
  test('solo administración ve la cola; los pendientes cuentan en los avisos del panel', async () => {
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get('/api/admin/press')).status, 403);
    const list = await admin.get('/api/admin/press');
    assert.ok(list.data.items.length >= 1);
    assert.ok(list.data.items.every((r) => ['pending', 'in_progress'].includes(r.status)));
    assert.ok((await admin.get('/api/admin/badges')).data.press >= 1);
  });

  test('nota propia: tomar, crear el borrador, publicar en la revista y avisar a la startup', async () => {
    const rodrigo = await login('rodrigo@kefounder.demo');
    const brote = projectOf('rodrigo@kefounder.demo', 'Brote');
    const sent = await rodrigo.post('/api/me/press', { projectId: brote, pitch: PITCH, spokesperson: 'Rodrigo Barrios', spokespersonRole: 'CEO' });
    const id = sent.data.items[0].id;

    await admin.put(`/api/admin/press/${id}`, { status: 'in_progress' });
    assert.ok(notifications('rodrigo@kefounder.demo', 'press_in_progress').length >= 1);
    assert.equal((await admin.put(`/api/admin/press/${id}`, { status: 'published' })).status, 400, 'una nota propia necesita su nota publicada');

    const draft = await admin.post(`/api/admin/press/${id}/draft`);
    assert.equal(draft.status, 201);
    const article = ctx.db.get('SELECT * FROM articles WHERE id = ?', [draft.data.articleId]);
    assert.equal(article.status, 'draft');
    assert.equal(article.promoted, 1);
    assert.equal(article.project_id, brote);
    assert.equal(article.person_name, 'Rodrigo Barrios');
    assert.ok(ctx.db.get("SELECT 1 FROM admin_notes WHERE target_type = 'article' AND target_id = ? AND body LIKE '%Qué quieren contar%'", [article.id]));
    assert.equal((await admin.post(`/api/admin/press/${id}/draft`)).status, 400, 'un solo borrador por pedido');
    assert.equal((await admin.put(`/api/admin/press/${id}`, { status: 'published' })).status, 400, 'el borrador todavía no está publicado');
    assert.equal((await rodrigo.get('/api/me/press')).data.items[0].article, null, 'la startup no ve el borrador');

    await admin.put(`/api/admin/articles/${article.id}`, { body: 'P: ¿Cómo empezó Brote?\nR: En una sobremesa familiar.', cover: COVER });
    await admin.post(`/api/admin/articles/${article.id}/publish`);
    assert.equal((await admin.put(`/api/admin/press/${id}`, { instagramUrl: 'https://evil.example/p/1' })).status, 400);
    const published = await admin.put(`/api/admin/press/${id}`, { status: 'published', instagramUrl: 'https://www.instagram.com/p/ABC123/' });
    assert.equal(published.status, 200);

    const notice = notifications('rodrigo@kefounder.demo', 'press_published')[0];
    assert.ok(notice);
    const mine = await rodrigo.get('/api/notifications');
    assert.ok(mine.data.items.some((n) => n.type === 'press_published' && n.link === `/revista/${article.slug}`));
    const item = (await rodrigo.get('/api/me/press')).data.items[0];
    assert.equal(item.status, 'published');
    assert.equal(item.article.slug, article.slug);
    assert.equal(item.instagramUrl, 'https://www.instagram.com/p/ABC123/');

    const pub = await client().get(`/api/revista/articles/${article.slug}`);
    assert.equal(pub.data.article.promoted, true, 'la nota se marca como Difusión');
    const actions = (await admin.get(`/api/admin/press/${id}`)).data.audit.map((a) => a.action);
    for (const action of ['press.take', 'press.draft', 'press.publish']) assert.ok(actions.includes(action), action);
  });

  test('rechazar pide motivo, avisa a la startup y le devuelve el cupo', async () => {
    const pending = ctx.db.get("SELECT id FROM press_requests WHERE user_id = ? AND status = 'pending'", [idOf('martin@kefounder.demo')]);
    assert.equal((await admin.put(`/api/admin/press/${pending.id}`, { status: 'rejected' })).status, 400);
    await admin.put(`/api/admin/press/${pending.id}`, { status: 'rejected', response: 'Falta una descripción completa del proyecto' });
    const martin = await login('martin@kefounder.demo');
    const { data } = await martin.get('/api/me/press');
    assert.equal(data.items[0].status, 'rejected');
    assert.equal(data.items[0].response, 'Falta una descripción completa del proyecto');
    assert.equal(data.allowance.available, true);
    const notes = (await martin.get('/api/notifications')).data.items;
    assert.ok(notes.some((n) => n.type === 'press_rejected' && n.body.includes('Falta una descripción completa')));
  });

  test('una mención se puede publicar solo con el enlace de Instagram', async () => {
    const martin = await login('martin@kefounder.demo');
    const sent = await martin.post('/api/me/press', { projectId: projectOf('martin@kefounder.demo', 'Formo'), pitch: PITCH, spokesperson: 'Martín López' });
    const id = sent.data.items[0].id;
    assert.equal((await admin.put(`/api/admin/press/${id}`, { status: 'published' })).status, 400);
    assert.equal((await admin.put(`/api/admin/press/${id}`, { status: 'published', instagramUrl: 'https://instagram.com/stories/kefounder/1' })).status, 200);
    assert.equal((await martin.get('/api/me/press')).data.items[0].status, 'published');
  });
});
