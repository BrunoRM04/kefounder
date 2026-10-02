import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { createBots } from '../server/bots.js';
import { MIGRATION_IDS, now, openDb } from '../server/db.js';
import { createHub } from '../server/realtime.js';
import { seed } from '../server/seed.js';

let server;
let base;
let ctx;
let dataDir;
let admin;
const ADMIN_EMAIL = 'panel@kefounder.test';
const ADMIN_PASSWORD = 'panel-de-prueba-2026';
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

function client() {
  let cookie = '';
  let lastSetCookie = '';
  const call = async (method, url, body, headers = {}) => {
    const isBuffer = Buffer.isBuffer(body);
    const res = await fetch(base + url, {
      method,
      headers: { ...(body && !isBuffer ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? (isBuffer ? body : JSON.stringify(body)) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) { cookie = set.split(';')[0]; lastSetCookie = set; }
    const type = res.headers.get('content-type') || '';
    // Buffer conserva el BOM del CSV (res.text() lo descarta).
    const data = type.includes('json') ? await res.json().catch(() => null) : Buffer.from(await res.arrayBuffer()).toString('utf8');
    return { status: res.status, data, headers: res.headers };
  };
  return {
    get: (url) => call('GET', url),
    post: (url, body, headers) => call('POST', url, body ?? {}, headers),
    put: (url, body) => call('PUT', url, body),
    del: (url, body) => call('DELETE', url, body),
    setCookie: () => lastSetCookie
  };
}

const login = async (email, password = 'kefounder1234') => {
  const c = client();
  const res = await c.post('/api/auth/login', { email, password });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return c;
};

const register = async (name) => {
  const c = client();
  const email = `${name.toLowerCase().replace(/\s+/g, '')}${Date.now()}${Math.floor(Math.random() * 1000)}@test.dev`;
  const res = await c.post('/api/auth/register', { name, email, password: 'secreto123' });
  assert.equal(res.status, 201);
  return { c, id: res.data.user.id, email };
};

const onboard = (c) => c.put('/api/me/onboarding', { goal: 'join_project', roles: ['developer'], availability: 'h10_20', compensation: 'equity', skills: ['React'], country: 'Uruguay' });

const idOf = (email) => ctx.db.get('SELECT id FROM users WHERE email = ?', [email]).id;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-admin-'));
  const db = openDb(path.join(dataDir, 'test.db'));
  await seed(db, { reset: true });
  db.run(
    "INSERT INTO users (email, password_hash, name, role, segment, onboarded, email_verified, visible, settings, created_at) VALUES (?, ?, 'Panel Test', 'admin', 'staff', 0, 1, 0, '{}', ?)",
    [ADMIN_EMAIL, await hashPassword(ADMIN_PASSWORD), now()]
  );
  const hub = createHub();
  ctx = { db, hub, config: { demo: true, demoAccounts: [], uploadsDir: path.join(dataDir, 'uploads'), backupsDir: path.join(dataDir, 'backups'), distDir: dataDir } };
  ctx.bots = createBots(ctx, { enabled: false });
  const app = createApp(ctx);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
});

after(() => {
  ctx.bots.stop();
  ctx.hub.closeAll();
  server.closeAllConnections?.();
  server.close();
  ctx.db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('acceso al panel', () => {
  test('solo la cuenta con rol admin entra; su sesión dura menos', async () => {
    assert.equal((await client().get('/api/admin/overview')).status, 401);
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get('/api/admin/overview')).status, 403);
    assert.equal((await sol.get('/api/admin/users')).status, 403);
    assert.equal((await sol.post('/api/admin/system/backup')).status, 403);

    const fresh = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    assert.match(fresh.setCookie(), new RegExp(`Max-Age=${7 * 86400}`));
    const me = await fresh.get('/api/auth/me');
    assert.equal(me.data.user.role, 'admin');
    assert.equal((await fresh.get('/api/admin/overview')).status, 200);
  });

  test('las migraciones quedan registradas y abrir la base de nuevo no las repite', () => {
    const file = path.join(dataDir, 'again.db');
    openDb(file).close();
    const db = openDb(file);
    assert.deepEqual(db.all('SELECT id FROM schema_migrations').map((r) => r.id), MIGRATION_IDS);
    db.close();
  });

  test('la cuenta de administración nunca aparece en la app ni recibe conexiones', async () => {
    const sol = await login('sol@kefounder.demo');
    const adminId = idOf(ADMIN_EMAIL);
    const { data } = await sol.get('/api/discover?mode=people&limit=40');
    assert.ok(!data.items.some((p) => p.id === adminId));
    assert.equal((await admin.put('/api/me/onboarding', { goal: 'explore', roles: ['founder'], availability: 'exploring', compensation: 'unsure' })).status, 403);
    // Aunque alguien adivine su número y la cuenta tuviera perfil, no se puede ver ni contactar.
    ctx.db.run('UPDATE users SET onboarded = 1 WHERE id = ?', [adminId]);
    assert.equal((await sol.get(`/api/users/${adminId}`)).status, 404);
    assert.equal((await sol.post('/api/actions', { targetType: 'person', targetId: adminId, action: 'connect' })).status, 404);
    ctx.db.run('UPDATE users SET onboarded = 0 WHERE id = ?', [adminId]);
  });
});

describe('tableros', () => {
  test('resumen, métricas e ingresos separan cuentas reales de la demo', async () => {
    const real = await admin.get('/api/admin/overview');
    const all = await admin.get('/api/admin/overview?scope=all');
    assert.equal(real.status, 200);
    assert.ok(all.data.kpis.users.value > real.data.kpis.users.value, 'la demo suma cuentas solo en "todo"');
    assert.equal(all.data.plans.length, 4);
    assert.equal(all.data.funnel[0].key, 'registered');
    assert.ok(all.data.kpis.mrr.value > 0, 'las cuentas demo pagan planes');
    assert.equal(real.data.kpis.mrr.value, 0);

    const metric = await admin.get('/api/admin/metrics?metric=matches&range=30&scope=all');
    assert.equal(metric.data.series.length, 30);
    assert.ok(metric.data.total > 0);
    assert.equal(metric.data.total, metric.data.series.reduce((s, d) => s + d.value, 0));

    const bogus = await admin.get('/api/admin/metrics?metric=DROP&range=9999');
    assert.equal(bogus.data.metric, 'signups');
    assert.equal(bogus.data.range, 30);

    const summary = await admin.get('/api/admin/metrics/summary?range=7&scope=all');
    assert.equal(summary.data.metrics.length, 7);
    assert.ok(summary.data.breakdowns.roles.length > 0);

    const revenue = await admin.get('/api/admin/revenue?scope=all');
    assert.equal(revenue.data.paying, 3);
    assert.equal(revenue.data.mrr, 34.97);
    assert.equal(revenue.data.byPlan.find((p) => p.plan === 'pro').subscribers, 1);
  });

  test('búsqueda global por nombre, email o número', async () => {
    const byName = await admin.get('/api/admin/search?q=rodrigo');
    assert.ok(byName.data.users.some((u) => u.email === 'rodrigo@kefounder.demo'));
    const byProject = await admin.get('/api/admin/search?q=Brote');
    assert.ok(byProject.data.projects.some((p) => p.name === 'Brote'));
    const byId = await admin.get(`/api/admin/search?q=%23${idOf('ana@kefounder.demo')}`);
    assert.equal(byId.data.users[0].email, 'ana@kefounder.demo');
  });
});

describe('cuentas', () => {
  test('lista paginada con filtros y orden validados en el servidor', async () => {
    const page1 = await admin.get('/api/admin/users?segment=all&pageSize=25&page=1&sort=name&dir=asc');
    assert.equal(page1.data.items.length, 25);
    assert.ok(page1.data.total > 25);
    const names = page1.data.items.map((u) => u.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    const page2 = await admin.get('/api/admin/users?segment=all&pageSize=25&page=2&sort=name&dir=asc');
    assert.ok(!page2.data.items.some((u) => names.includes(u.name) && page1.data.items.find((x) => x.name === u.name).id === u.id));

    const bots = await admin.get('/api/admin/users?segment=bot&pageSize=100');
    assert.ok(bots.data.items.every((u) => u.segment === 'bot'));
    assert.equal(bots.data.segments.demo, 4);

    const injected = await admin.get('/api/admin/users?segment=all&sort=' + encodeURIComponent('id; DROP TABLE users') + '&dir=' + encodeURIComponent('asc; --'));
    assert.equal(injected.status, 200);
    assert.ok(ctx.db.get('SELECT COUNT(*) AS n FROM users').n > 0);

    const pro = await admin.get('/api/admin/users?segment=all&plan=pro');
    assert.ok(pro.data.items.length >= 1 && pro.data.items.every((u) => u.plan === 'pro'));
    const search = await admin.get('/api/admin/users?segment=all&q=' + encodeURIComponent('50%_'));
    assert.equal(search.data.total, 0, 'los comodines se escapan');
  });

  test('exportación CSV lista para Excel y protegida contra fórmulas', async () => {
    const { c } = await register('=HYPERLINK Malicioso');
    assert.ok(c);
    const res = await admin.get('/api/admin/users.csv?segment=real');
    assert.match(res.headers.get('content-type'), /text\/csv/);
    assert.match(res.headers.get('content-disposition'), /kefounder-usuarios-/);
    assert.equal(res.data.charCodeAt(0), 0xfeff);
    assert.ok(res.data.split('\r\n')[0].includes('Nombre;Email'));
    assert.ok(res.data.includes("'=HYPERLINK Malicioso"));
  });

  test('suspender cierra la sesión, bloquea el ingreso y oculta el perfil; reactivar lo devuelve', async () => {
    const { c, id, email } = await register('Cuenta Suspendible');
    await onboard(c);
    assert.equal((await admin.put(`/api/admin/users/${id}/status`, { status: 'suspended' })).status, 400, 'el motivo es obligatorio');
    assert.equal((await admin.put(`/api/admin/users/${id}/status`, { status: 'suspended', reason: 'Spam reiterado' })).status, 200);

    assert.equal((await c.get('/api/auth/me')).data.user, null);
    const blocked = await client().post('/api/auth/login', { email, password: 'secreto123' });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.data.code, 'suspended');
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get(`/api/users/${id}`)).status, 404);

    const detail = await admin.get(`/api/admin/users/${id}`);
    assert.equal(detail.data.user.status, 'suspended');
    assert.equal(detail.data.user.statusReason, 'Spam reiterado');
    assert.equal(detail.data.audit[0].action, 'user.suspend');

    await admin.put(`/api/admin/users/${id}/status`, { status: 'active' });
    assert.equal((await client().post('/api/auth/login', { email, password: 'secreto123' })).status, 200);
    assert.equal((await sol.get(`/api/users/${id}`)).status, 200);
  });

  test('un bot suspendido sale del mazo de Descubrir', async () => {
    const sol = await login('sol@kefounder.demo');
    const before = await sol.get('/api/discover?mode=people&limit=40');
    const target = before.data.items[0];
    await admin.put(`/api/admin/users/${target.id}/status`, { status: 'suspended', reason: 'Prueba de moderación' });
    const afterList = await sol.get('/api/discover?mode=people&limit=40');
    assert.ok(!afterList.data.items.some((p) => p.id === target.id));
    await admin.put(`/api/admin/users/${target.id}/status`, { status: 'active' });
  });

  test('no se puede suspender ni borrar la propia cuenta ni otra de administración', async () => {
    const selfId = idOf(ADMIN_EMAIL);
    assert.equal((await admin.put(`/api/admin/users/${selfId}/status`, { status: 'suspended', reason: 'x'.repeat(5) })).status, 403);
    assert.equal((await admin.del(`/api/admin/users/${selfId}`, { confirm: ADMIN_EMAIL, reason: 'nope' })).status, 403);
  });

  test('plan de cortesía: cambia el plan sin cobro y no suma al MRR', async () => {
    const { c, id } = await register('Cortesia Plan');
    const beforeRevenue = (await admin.get('/api/admin/revenue?scope=all')).data;
    const beforeMrr = beforeRevenue.mrr;
    assert.equal((await admin.put(`/api/admin/users/${id}/plan`, { plan: 'pro' })).status, 400, 'pide motivo');
    assert.equal((await admin.put(`/api/admin/users/${id}/plan`, { plan: 'pro', reason: 'Beta tester' })).status, 200);
    const me = await c.get('/api/auth/me');
    assert.equal(me.data.user.plan, 'pro');
    assert.equal(me.data.user.planPeriod, 'courtesy');
    const revenue = await admin.get('/api/admin/revenue?scope=all');
    assert.equal(revenue.data.mrr, beforeMrr);
    assert.ok(revenue.data.courtesy >= 1);
    const subs = await admin.get('/api/admin/subscriptions?scope=all&period=courtesy');
    assert.ok(subs.data.items.some((s) => s.user.id === id && s.amount === 0));
    await admin.put(`/api/admin/users/${id}/plan`, { plan: 'free', reason: 'Fin de la beta' });
    assert.equal((await c.get('/api/auth/me')).data.user.plan, 'free');
    const afterRevenue = (await admin.get('/api/admin/revenue?scope=all')).data;
    assert.equal(afterRevenue.canceledThisMonth, beforeRevenue.canceledThisMonth, 'quitar una cortesía no es una baja');
  });

  test('borrar una cuenta exige escribir su email', async () => {
    const { id, email } = await register('Cuenta Borrable');
    assert.equal((await admin.del(`/api/admin/users/${id}`, { confirm: 'otro@mail.com', reason: 'Pedido de la persona' })).status, 400);
    assert.equal((await admin.del(`/api/admin/users/${id}`, { confirm: email, reason: 'Pedido de la persona' })).status, 200);
    assert.equal(ctx.db.get('SELECT 1 FROM users WHERE id = ?', [id]), undefined);
    const log = await admin.get('/api/admin/audit?area=user');
    assert.ok(log.data.items.some((a) => a.action === 'user.delete' && a.summary.includes(email)));
  });
});

describe('verificación de identidad', () => {
  test('el documento queda pendiente; administración aprueba o rechaza con motivo', async () => {
    const { c, id } = await register('Identidad Pendiente');
    const upload = await c.post('/api/uploads', PNG, { 'Content-Type': 'image/png', 'X-File-Name': 'dni.png' });
    const sent = await c.post('/api/me/identity', { document: upload.data.url });
    assert.equal(sent.data.user.verification.identity, 'pending');

    const queue = await admin.get('/api/admin/identity?status=pending');
    const item = queue.data.items.find((i) => i.user.id === id);
    assert.ok(item);
    assert.equal(item.document, upload.data.url);
    assert.ok((await admin.get('/api/admin/badges')).data.identity >= 1);

    assert.equal((await admin.post(`/api/admin/users/${id}/identity`, { decision: 'reject' })).status, 400);
    await admin.post(`/api/admin/users/${id}/identity`, { decision: 'reject', reason: 'La foto está borrosa' });
    let me = (await c.get('/api/auth/me')).data.user;
    assert.equal(me.verification.identity, 'rejected');
    assert.equal(me.verification.identityNote, 'La foto está borrosa');

    await c.post('/api/me/identity', { document: upload.data.url });
    await admin.post(`/api/admin/users/${id}/identity`, { decision: 'approve' });
    me = (await c.get('/api/auth/me')).data.user;
    assert.equal(me.verification.identity, 'approved');
    assert.equal(me.trust.identity, true);
    const types = ctx.db.all('SELECT type FROM notifications WHERE user_id = ?', [id]).map((n) => n.type);
    assert.ok(types.includes('identity_rejected') && types.includes('identity_approved'));
  });
});

describe('proyectos y moderación', () => {
  test('ocultar un proyecto lo saca de Descubrir y del detalle; su founder lo ve marcado', async () => {
    const rodrigo = await login('rodrigo@kefounder.demo');
    const sol = await login('sol@kefounder.demo');
    const brote = (await rodrigo.get('/api/me/projects')).data.items.find((p) => p.name === 'Brote');
    assert.equal((await sol.get(`/api/projects/${brote.id}`)).status, 200);

    assert.equal((await admin.put(`/api/admin/projects/${brote.id}/moderation`, { moderation: 'hidden' })).status, 400);
    await admin.put(`/api/admin/projects/${brote.id}/moderation`, { moderation: 'hidden', reason: 'Datos de contacto en la descripción' });
    assert.equal((await sol.get(`/api/projects/${brote.id}`)).status, 404);
    assert.equal((await client().get(`/api/public/projects/${brote.id}`)).status, 404);
    const deck = await sol.get('/api/discover?mode=projects&limit=40');
    assert.ok(!deck.data.items.some((p) => p.id === brote.id));
    const own = (await rodrigo.get('/api/me/projects')).data.items.find((p) => p.id === brote.id);
    assert.equal(own.moderation, 'hidden');
    const notifications = (await rodrigo.get('/api/notifications')).data.items;
    assert.ok(notifications.some((n) => n.type === 'project_hidden' && n.body.includes('Datos de contacto')));

    const list = await admin.get('/api/admin/projects?segment=all&moderation=hidden');
    assert.ok(list.data.items.some((p) => p.id === brote.id));
    await admin.put(`/api/admin/projects/${brote.id}/moderation`, { moderation: 'ok' });
    assert.equal((await sol.get(`/api/projects/${brote.id}`)).status, 200);
  });

  test('reportes: cola por orden de llegada, resolución obligatoria y acción sobre la cuenta', async () => {
    const sol = await login('sol@kefounder.demo');
    const target = (await sol.get('/api/discover?mode=people&limit=40')).data.items[1];
    assert.equal((await sol.post('/api/reports', { targetType: 'person', targetId: target.id, reason: 'Spam o publicidad', details: 'Manda links raros' })).status, 201);

    const pending = await admin.get('/api/admin/reports');
    const report = pending.data.items.find((r) => r.target.user?.id === target.id);
    assert.ok(report);
    assert.equal(report.reporter.email, 'sol@kefounder.demo');
    assert.equal(report.status, 'open');

    await admin.put(`/api/admin/reports/${report.id}`, { status: 'reviewing' });
    assert.equal((await admin.put(`/api/admin/reports/${report.id}`, { status: 'resolved', action: 'suspend' })).status, 400);
    await admin.put(`/api/admin/reports/${report.id}`, { status: 'resolved', action: 'suspend', resolution: 'Spam confirmado' });

    assert.equal(ctx.db.get('SELECT status FROM users WHERE id = ?', [target.id]).status, 'suspended');
    const detail = await admin.get(`/api/admin/reports/${report.id}`);
    assert.equal(detail.data.report.status, 'resolved');
    assert.equal(detail.data.report.resolution, 'Spam confirmado');
    assert.equal(detail.data.report.handledBy, 'Panel Test');
    const soln = (await sol.get('/api/notifications')).data.items;
    assert.ok(soln.some((n) => n.type === 'report_reviewed'));
    await admin.put(`/api/admin/users/${target.id}/status`, { status: 'active' });
  });

  test('los reportes de una conversación muestran los últimos mensajes', async () => {
    const sol = await login('sol@kefounder.demo');
    const matches = (await sol.get('/api/matches')).data.items;
    const withMessages = matches.find((m) => m.lastMessage && m.lastMessage.kind === 'text');
    await sol.post('/api/reports', { targetType: 'match', targetId: withMessages.id, reason: 'Comportamiento inapropiado' });
    const report = (await admin.get('/api/admin/reports?type=match')).data.items.find((r) => r.target.matchId === withMessages.id);
    const detail = await admin.get(`/api/admin/reports/${report.id}`);
    assert.ok(detail.data.conversation.length > 0);
    assert.equal(detail.data.report.target.user.id, withMessages.other.id);
    await admin.put(`/api/admin/reports/${report.id}`, { status: 'dismissed', resolution: 'Conversación normal' });
  });
});

describe('seguimiento', () => {
  test('tareas con vencimiento, vínculo y estados; notas internas', async () => {
    const anaId = idOf('ana@kefounder.demo');
    const yesterday = new Date(Date.now() - 86400000);
    const due = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    assert.equal((await admin.post('/api/admin/tasks', { title: 'x' })).status, 400);
    assert.equal((await admin.post('/api/admin/tasks', { title: 'Llamar', targetType: 'user', targetId: 999999 })).status, 404);
    const created = await admin.post('/api/admin/tasks', { title: 'Llamar a Ana por el plan anual', priority: 'high', dueAt: due, targetType: 'user', targetId: anaId });
    assert.equal(created.status, 201);
    assert.equal(created.data.task.overdue, true);
    assert.equal(created.data.task.target.label, ctx.db.get('SELECT name FROM users WHERE id = ?', [anaId]).name);

    const overdue = await admin.get('/api/admin/tasks?view=overdue');
    assert.ok(overdue.data.items.some((t) => t.id === created.data.task.id));
    assert.ok(overdue.data.counts.overdue >= 1);
    assert.ok((await admin.get('/api/admin/badges')).data.tasks >= 1);

    const done = await admin.put(`/api/admin/tasks/${created.data.task.id}`, { status: 'done' });
    assert.equal(done.data.task.status, 'done');
    assert.ok(done.data.task.doneAt);
    const userDetail = await admin.get(`/api/admin/users/${anaId}`);
    assert.ok(userDetail.data.tasks.some((t) => t.id === created.data.task.id));

    const note = await admin.post('/api/admin/notes', { targetType: 'user', targetId: anaId, body: 'Pidió factura con RUT.' });
    assert.equal(note.status, 201);
    assert.equal((await admin.get(`/api/admin/notes?targetType=user&targetId=${anaId}`)).data.items[0].body, 'Pidió factura con RUT.');
    await admin.del(`/api/admin/notes/${note.data.note.id}`);
    await admin.del(`/api/admin/tasks/${created.data.task.id}`);

    const log = await admin.get('/api/admin/audit?area=task');
    assert.deepEqual(log.data.items.slice(0, 3).map((a) => a.action), ['task.delete', 'task.done', 'task.create']);
  });
});

describe('regresiones de la revisión del panel', () => {
  const suspend = (id) => admin.put(`/api/admin/users/${id}/status`, { status: 'suspended', reason: 'Prueba de regresión' });
  const reactivate = (id) => admin.put(`/api/admin/users/${id}/status`, { status: 'active' });

  test('las solicitudes de una cuenta suspendida no se ven ni se pueden aceptar', async () => {
    const ana = await login('ana@kefounder.demo');
    const before = (await ana.get('/api/interests/received')).data.items;
    const target = before[0];
    await suspend(target.person.id);
    const after = (await ana.get('/api/interests/received')).data;
    assert.ok(!after.items.some((i) => i.id === target.id));
    assert.equal(after.count, before.length - 1);
    assert.equal((await ana.post(`/api/interests/${target.id}/accept`)).status, 404);
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)', [target.person.id, idOf('ana@kefounder.demo'), idOf('ana@kefounder.demo'), target.person.id]).n, 0);
    await reactivate(target.person.id);
    assert.ok((await ana.get('/api/interests/received')).data.items.some((i) => i.id === target.id));
  });

  test('una conversación con una cuenta suspendida se cierra hasta que se reactive', async () => {
    const ana = await login('ana@kefounder.demo');
    const match = (await ana.get('/api/matches')).data.items[0];
    await suspend(match.other.id);
    assert.ok(!(await ana.get('/api/matches')).data.items.some((m) => m.id === match.id));
    assert.equal((await ana.post(`/api/matches/${match.id}/messages`, { kind: 'text', body: 'Hola?' })).status, 404);
    await reactivate(match.other.id);
    assert.ok((await ana.get('/api/matches')).data.items.some((m) => m.id === match.id));
  });

  test('deshacer no revela cuentas que no se pueden ver en Descubrir', async () => {
    const sol = await login('sol@kefounder.demo');
    const adminId = idOf(ADMIN_EMAIL);
    await sol.post('/api/actions', { targetType: 'person', targetId: adminId, action: 'pass' });
    assert.equal((await sol.post('/api/discover/undo', { targetType: 'person', targetId: adminId })).data.item, null);
    const card = (await sol.get('/api/discover?mode=people&limit=5')).data.items[0];
    await sol.post('/api/actions', { targetType: 'person', targetId: card.id, action: 'pass' });
    await suspend(card.id);
    assert.equal((await sol.post('/api/discover/undo', { targetType: 'person', targetId: card.id })).data.item, null);
    await reactivate(card.id);
  });

  test('solo se reportan conversaciones propias', async () => {
    const sol = await login('sol@kefounder.demo');
    const foreign = ctx.db.get('SELECT id FROM matches WHERE user_a != ? AND user_b != ? LIMIT 1', [idOf('sol@kefounder.demo'), idOf('sol@kefounder.demo')]);
    assert.equal((await sol.post('/api/reports', { targetType: 'match', targetId: foreign.id, reason: 'Otro motivo' })).status, 404);
    assert.equal((await sol.post('/api/reports', { targetType: 'person', targetId: 999999, reason: 'Otro motivo' })).status, 404);
  });

  test('los guardados no muestran proyectos de founders suspendidos', async () => {
    const sol = await login('sol@kefounder.demo');
    const saved = (await sol.get('/api/saved')).data.projects[0];
    const ownerId = ctx.db.get('SELECT owner_id FROM projects WHERE id = ?', [saved.id]).owner_id;
    await suspend(ownerId);
    assert.ok(!(await sol.get('/api/saved')).data.projects.some((p) => p.id === saved.id));
    await reactivate(ownerId);
    assert.ok((await sol.get('/api/saved')).data.projects.some((p) => p.id === saved.id));
  });
});

describe('sistema', () => {
  test('estado, copia de seguridad, chequeo y limpieza', async () => {
    const status = await admin.get('/api/admin/system');
    assert.ok(status.data.database.bytes > 0);
    assert.deepEqual(status.data.database.migrations.map((m) => m.id), MIGRATION_IDS);
    assert.ok(status.data.database.tables.find((t) => t.name === 'users').rows > 0);

    const backup = await admin.post('/api/admin/system/backup');
    assert.equal(backup.status, 201);
    const file = path.join(ctx.config.backupsDir, backup.data.backup.name);
    assert.ok(fs.existsSync(file));
    const copy = openDb(file);
    assert.ok(copy.get('SELECT COUNT(*) AS n FROM users').n > 0);
    copy.close();
    assert.ok((await admin.get('/api/admin/system')).data.backups.items.some((b) => b.name === backup.data.backup.name));

    const check = await admin.post('/api/admin/system/check');
    assert.equal(check.data.ok, true);
    const cleanup = await admin.post('/api/admin/system/cleanup');
    assert.equal(cleanup.data.ok, true);
  });

  test('reiniciar la demo conserva las cuentas reales y las del equipo', async () => {
    const { id } = await register('Cuenta Real Persistente');
    const moved = await register('Cuenta Real Marcada Demo');
    // Aunque en el panel la marquen como demo, una cuenta real no se borra al reiniciar.
    await admin.put(`/api/admin/users/${moved.id}/segment`, { segment: 'demo' });
    await seed(ctx.db, { reset: true });
    assert.ok(ctx.db.get('SELECT 1 FROM users WHERE id = ?', [id]));
    assert.ok(ctx.db.get('SELECT 1 FROM users WHERE id = ?', [moved.id]));
    assert.ok(ctx.db.get("SELECT 1 FROM users WHERE email = ? AND role = 'admin'", [ADMIN_EMAIL]));
    assert.equal(ctx.db.get("SELECT COUNT(*) AS n FROM users WHERE email LIKE '%@kefounder.demo'").n, 4);
    assert.equal(ctx.db.get("SELECT COUNT(*) AS n FROM users WHERE segment = 'demo' AND email LIKE '%@kefounder.demo'").n, 4);
    assert.ok(ctx.db.get("SELECT COUNT(*) AS n FROM users WHERE segment = 'bot'").n > 10);
  });
});
