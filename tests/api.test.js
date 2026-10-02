import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../server/app.js';
import { hashPassword, verifyPassword } from '../server/auth.js';
import { migrateDemoAccounts, migrateLegacyDbFile } from '../server/migrate.js';
import { createBots } from '../server/bots.js';
import { openDb } from '../server/db.js';
import { createHub } from '../server/realtime.js';
import { seed } from '../server/seed.js';

let server;
let base;
let ctx;
let dataDir;

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

// Cliente HTTP mínimo con cookie de sesión propia.
function client() {
  let cookie = '';
  const call = async (method, url, body, headers = {}) => {
    const isBuffer = Buffer.isBuffer(body);
    const res = await fetch(base + url, {
      method,
      headers: { ...(body && !isBuffer ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? (isBuffer ? body : JSON.stringify(body)) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
  return {
    get: (url) => call('GET', url),
    post: (url, body, headers) => call('POST', url, body ?? {}, headers),
    put: (url, body) => call('PUT', url, body),
    del: (url, body) => call('DELETE', url, body),
    cookie: () => cookie
  };
}

const login = async (email) => {
  const c = client();
  const res = await c.post('/api/auth/login', { email, password: 'kefounder1234' });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return c;
};

const waitFor = async (fn, timeout = 4000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
};

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-test-'));
  const db = openDb(path.join(dataDir, 'test.db'));
  await seed(db, { reset: true });
  const hub = createHub();
  ctx = { db, hub, config: { demo: true, demoAccounts: [], uploadsDir: path.join(dataDir, 'uploads'), distDir: dataDir } };
  ctx.bots = createBots(ctx, { enabled: true, speed: 0.01, acceptRate: 1 });
  const app = createApp(ctx);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  ctx.bots.stop();
  ctx.hub.closeAll();
  server.closeAllConnections?.();
  server.close();
  ctx.db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('autenticación y onboarding', () => {
  test('registro, onboarding obligatorio y descubrimiento', async () => {
    const c = client();
    const bad = await c.post('/api/auth/register', { name: 'A', email: 'x', password: '1' });
    assert.equal(bad.status, 400);

    const reg = await c.post('/api/auth/register', { name: 'Ana Test', email: 'ana@test.dev', password: 'secreto123' });
    assert.equal(reg.status, 201);
    assert.equal(reg.data.user.onboarded, false);

    const dup = await client().post('/api/auth/register', { name: 'Ana', email: 'ANA@test.dev', password: 'secreto123' });
    assert.equal(dup.status, 409);

    const blocked = await c.get('/api/discover?mode=people');
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.code, 'onboarding');

    const incomplete = await c.put('/api/me/onboarding', { goal: 'join_project' });
    assert.equal(incomplete.status, 400);

    const done = await c.put('/api/me/onboarding', {
      goal: 'join_project', roles: ['developer'], availability: 'h10_20', compensation: 'equity',
      name: 'Ana Test', city: 'Montevideo', country: 'Uruguay', headline: 'Backend developer', bio: 'Me gusta construir APIs que no se caen nunca.',
      skills: ['Node.js', 'PostgreSQL', 'AWS'], links: { github: 'github.com/ana' }
    });
    assert.equal(done.status, 200);
    assert.equal(done.data.user.onboarded, true);
    assert.equal(done.data.user.links.github, 'https://github.com/ana');
    assert.deepEqual(done.data.user.roles, ['developer']);
    assert.deepEqual(done.data.user.skills, ['Node.js', 'PostgreSQL', 'AWS']);
    assert.deepEqual(done.data.user.experience, []);
    // foto, "qué busca" y experiencia faltan: 100 - 15 - 5 - 5
    assert.equal(done.data.user.completeness.percent, 75);
    assert.equal(done.data.user.completeness.missing.length, 3);

    const people = await c.get('/api/discover?mode=people');
    assert.equal(people.status, 200);
    assert.ok(people.data.items.length > 5);
    for (const item of people.data.items) {
      assert.ok(item.match.score >= 40 && item.match.score <= 99);
      assert.equal(item.email, undefined, 'no se filtran emails');
      assert.equal(item.password_hash, undefined);
      assert.ok(Array.isArray(item.roles) && Array.isArray(item.skills), 'listas parseadas');
    }
    const projects = await c.get('/api/discover?mode=projects');
    assert.ok(projects.data.items.length >= 10);
    assert.ok(projects.data.items[0].owner.name);
    assert.ok(Array.isArray(projects.data.items[0].owner.roles));
    assert.ok(Array.isArray(projects.data.items[0].rolesNeeded));

    const logout = await c.post('/api/auth/logout');
    assert.equal(logout.status, 200);
    const me = await c.get('/api/auth/me');
    assert.equal(me.data.user, null);
  });

  test('login incorrecto', async () => {
    const res = await client().post('/api/auth/login', { email: 'sol@kefounder.demo', password: 'mala' });
    assert.equal(res.status, 401);
  });

  test('protección de origen en mutaciones', async () => {
    const sol = await login('sol@kefounder.demo');
    const res = await sol.post('/api/actions', { targetType: 'person', targetId: 1, action: 'pass' }, { Origin: 'http://evil.example' });
    assert.equal(res.status, 403);
  });
});

describe('descubrir, conectar y match', () => {
  test('quienes mostraron interés aparecen primero y conectar genera match', async () => {
    const sol = await login('sol@kefounder.demo');
    const me = await sol.get('/api/auth/me');
    assert.equal(me.data.user.counts.interests, 7);

    const received = await sol.get('/api/interests/received');
    assert.equal(received.data.locked, true, 'Free no ve quiénes son');
    assert.equal(received.data.count, 7);
    assert.equal(received.data.items.length, 0);

    const feed = await sol.get('/api/discover?mode=people');
    const first = feed.data.items[0];
    const res = await sol.post('/api/actions', { targetType: 'person', targetId: first.id, action: 'connect' });
    assert.equal(res.data.status, 'matched');
    assert.ok(res.data.match.id);

    const matches = await sol.get('/api/matches');
    assert.ok(matches.data.items.some((m) => m.id === res.data.match.id && m.status === 'new'));
  });

  test('límite diario de conexiones en Free', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Límite', email: 'limite@test.dev', password: 'secreto123' });
    await c.put('/api/me/onboarding', { goal: 'explore', roles: ['other'], availability: 'lt10', compensation: 'unsure', name: 'Límite' });
    const feed = await c.get('/api/discover?mode=people&limit=40');
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await c.post('/api/actions', { targetType: 'person', targetId: feed.data.items[i].id, action: 'connect' });
      if (i < 10) assert.equal(last.status, 200, JSON.stringify(last.data));
    }
    assert.equal(last.status, 402);
    assert.equal(last.data.code, 'paywall');
    assert.equal(last.data.feature, 'connections');
    assert.equal(last.data.requiredPlan, 'plus');
  });

  test('límite de guardados, pasar y deshacer', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Guarda', email: 'guarda@test.dev', password: 'secreto123' });
    await c.put('/api/me/onboarding', { goal: 'explore', roles: ['designer'], availability: 'lt10', compensation: 'equity', name: 'Guarda' });
    const feed = await c.get('/api/discover?mode=people&limit=40');
    for (let i = 0; i < 10; i += 1) {
      const r = await c.post('/api/actions', { targetType: 'person', targetId: feed.data.items[i].id, action: 'save' });
      assert.equal(r.status, 200);
    }
    const over = await c.post('/api/actions', { targetType: 'person', targetId: feed.data.items[10].id, action: 'save' });
    assert.equal(over.status, 402);
    assert.equal(over.data.feature, 'saves');

    const saved = await c.get('/api/saved');
    assert.equal(saved.data.people.length, 10);

    const target = feed.data.items[12].id;
    await c.post('/api/actions', { targetType: 'person', targetId: target, action: 'pass' });
    const after = await c.get('/api/discover?mode=people&limit=40');
    assert.ok(!after.data.items.some((i) => i.id === target));
    const undo = await c.post('/api/discover/undo', { targetType: 'person' });
    assert.equal(undo.data.item.id, target);
  });

  test('filtros avanzados requieren Plus', async () => {
    const sol = await login('sol@kefounder.demo');
    const basic = await sol.get('/api/discover?mode=people&role=developer');
    assert.equal(basic.status, 200);
    assert.ok(basic.data.items.every((p) => p.roles.includes('developer')));
    const adv = await sol.get('/api/discover?mode=people&skills=Python');
    assert.equal(adv.status, 402);
    assert.equal(adv.data.feature, 'advancedFilters');

    const martin = await login('martin@kefounder.demo');
    const ok = await martin.get('/api/discover?mode=projects&stage=mvp');
    assert.equal(ok.status, 200);
    assert.ok(ok.data.items.every((p) => p.stage === 'mvp'));
  });

  test('conectar con un proyecto de demo: el bot acepta y escribe', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Bot Test', email: 'bot@test.dev', password: 'secreto123' });
    await c.put('/api/me/onboarding', { goal: 'join_project', roles: ['developer'], availability: 'fulltime', compensation: 'equity', name: 'Bot Test' });
    const projects = await c.get('/api/discover?mode=projects');
    const target = projects.data.items.find((p) => p.owner.name !== 'Sol Ortega');
    const res = await c.post('/api/actions', { targetType: 'project', targetId: target.id, action: 'connect' });
    assert.equal(res.data.status, 'pending');
    const match = await waitFor(async () => (await c.get('/api/matches')).data.items[0]);
    assert.ok(match, 'el bot aceptó');
    assert.equal(match.project.id, target.id);
    const opening = await waitFor(async () => (await c.get(`/api/matches/${match.id}/messages`)).data.items.find((m) => m.kind === 'text'));
    assert.ok(opening, 'el bot mandó el primer mensaje');

    await c.post(`/api/matches/${match.id}/messages`, { kind: 'text', body: '¿Cuántas horas por semana podés dedicarle?' });
    const reply = await waitFor(async () => {
      const items = (await c.get(`/api/matches/${match.id}/messages`)).data.items;
      return items.length >= 4 && items[items.length - 1].senderId !== items[items.length - 2].senderId ? items[items.length - 1] : null;
    });
    assert.ok(reply, 'el bot respondió');
    assert.match(reply.body, /dedicarle|horas|sem/);
  });
});

describe('chat en tiempo real y permisos', () => {
  test('mensajes, lectura y eventos SSE', async () => {
    const sol = await login('sol@kefounder.demo');
    const martin = await login('martin@kefounder.demo');
    const match = (await sol.get('/api/matches')).data.items.find((m) => m.other.name === 'Martín López');
    assert.ok(match);
    assert.equal(match.status, 'unanswered');

    // Martín escucha eventos
    const controller = new AbortController();
    const events = [];
    const stream = await fetch(`${base}/api/events`, { headers: { Cookie: martin.cookie() }, signal: controller.signal });
    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          events.push(decoder.decode(value));
        }
      } catch { /* abortado */ }
    })();
    await waitFor(() => events.join('').includes('event: ready'));

    const sent = await sol.post(`/api/matches/${match.id}/messages`, { kind: 'text', body: '¡Dale Martín! ¿El jueves a las 18?' });
    assert.equal(sent.status, 201);
    const got = await waitFor(() => events.join('').includes('¡Dale Martín!'));
    assert.ok(got, 'Martín recibió el mensaje por SSE');
    controller.abort();

    const meMartin = await martin.get('/api/auth/me');
    assert.ok(meMartin.data.user.counts.messages >= 1);
    const thread = await martin.get(`/api/matches/${match.id}/messages`);
    assert.equal(thread.data.items.at(-1).body, '¡Dale Martín! ¿El jueves a las 18?');
    const after = await martin.get('/api/auth/me');
    assert.ok(after.data.user.counts.messages < meMartin.data.user.counts.messages, 'se marcaron como leídos');

    const meeting = await sol.post(`/api/matches/${match.id}/messages`, { kind: 'meeting', meta: { slots: [new Date(Date.now() + 86400000).toISOString()], link: 'meet.google.com/abc-defg-hij' } });
    assert.equal(meeting.status, 201);
    assert.equal(meeting.data.message.meta.link, 'https://meet.google.com/abc-defg-hij');
    const badLink = await sol.post(`/api/matches/${match.id}/messages`, { kind: 'link', meta: { url: 'javascript:alert(1)' } });
    assert.equal(badLink.status, 400);
  });

  test('no se puede leer un chat ajeno ni editar un proyecto ajeno', async () => {
    const sol = await login('sol@kefounder.demo');
    const martin = await login('martin@kefounder.demo');
    const foreign = (await sol.get('/api/matches')).data.items.find((m) => m.other.name === 'Mateo Silva');
    const read = await martin.get(`/api/matches/${foreign.id}/messages`);
    assert.equal(read.status, 403);
    const own = (await sol.get('/api/me/projects')).data.items[0];
    const edit = await martin.put(`/api/projects/${own.id}`, { name: 'Hackeado' });
    assert.equal(edit.status, 403);
    const draft = (await sol.get('/api/me/projects')).data.items.find((p) => p.status === 'draft');
    const hidden = await martin.get(`/api/projects/${draft.id}`);
    assert.equal(hidden.status, 404, 'los borradores no son públicos');
  });

  test('bloquear oculta el perfil y la conversación', async () => {
    const sol = await login('sol@kefounder.demo');
    const lucia = (await sol.get('/api/matches')).data.items.find((m) => m.other.name === 'Lucía Fernández');
    await sol.post(`/api/users/${lucia.other.id}/block`);
    const matches = await sol.get('/api/matches');
    assert.ok(!matches.data.items.some((m) => m.id === lucia.id));
    const profile = await sol.get(`/api/users/${lucia.other.id}`);
    assert.equal(profile.status, 404);
    await sol.del(`/api/me/blocks/${lucia.other.id}`);
    const restored = await sol.get('/api/matches');
    assert.ok(restored.data.items.some((m) => m.id === lucia.id));
  });
});

describe('planes, proyectos y estadísticas', () => {
  test('proyectos activos por plan, checkout y cancelación', async () => {
    const sol = await login('sol@kefounder.demo');
    const draft = (await sol.get('/api/me/projects')).data.items.find((p) => p.status === 'draft');
    const blocked = await sol.post(`/api/projects/${draft.id}/publish`);
    assert.equal(blocked.status, 402);
    assert.equal(blocked.data.requiredPlan, 'pro');

    const stats = await sol.get(`/api/projects/${draft.id}/stats`);
    assert.equal(stats.status, 402);

    const checkout = await sol.post('/api/billing/checkout', { plan: 'pro', period: 'yearly' });
    assert.equal(checkout.data.user.plan, 'pro');
    const published = await sol.post(`/api/projects/${draft.id}/publish`);
    assert.equal(published.status, 200);
    assert.equal(published.data.project.status, 'published');

    const conta = (await sol.get('/api/me/projects')).data.items.find((p) => p.name === 'ContaAI');
    const s = await sol.get(`/api/projects/${conta.id}/stats`);
    assert.equal(s.status, 200);
    assert.equal(s.data.byDay.length, 14);
    assert.ok(s.data.totals.views > 100);

    const received = await sol.get('/api/interests/received');
    assert.equal(received.data.locked, false);
    assert.ok(received.data.items.length > 0);
    const accept = await sol.post(`/api/interests/${received.data.items[0].id}/accept`);
    assert.ok(accept.data.match.id);

    const cancel = await sol.post('/api/billing/cancel');
    assert.equal(cancel.data.user.plan, 'free');
    const after = (await sol.get('/api/me/projects')).data.items.filter((p) => p.status === 'published');
    assert.equal(after.length, 1, 'al volver a Free queda un solo proyecto activo');
  });

  test('crear con "publicar" sin cupo deja un borrador y avisa el plan', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Cupo', email: 'cupo@test.dev', password: 'secreto123' });
    await c.put('/api/me/onboarding', { goal: 'create_project', roles: ['founder'], availability: 'fulltime', compensation: 'equity', name: 'Cupo' });
    const base = { tagline: 'Una idea con potencial enorme.', stage: 'idea', rolesNeeded: [{ role: 'cto' }], publish: true };
    const first = await c.post('/api/projects', { ...base, name: 'Primero' });
    assert.equal(first.data.project.status, 'published');
    assert.equal(first.data.publishBlocked, null);
    const second = await c.post('/api/projects', { ...base, name: 'Segundo' });
    assert.equal(second.status, 201);
    assert.equal(second.data.project.status, 'draft');
    assert.equal(second.data.publishBlocked.requiredPlan, 'pro');
    const invalid = await c.post('/api/projects', { name: 'Sin roles', tagline: 'Algo', publish: true });
    assert.equal(invalid.status, 400);
    assert.equal((await c.get('/api/me/projects')).data.items.length, 2, 'un proyecto inválido no se guarda');
  });

  test('crear, editar, duplicar y eliminar proyecto', async () => {
    const martin = await login('martin@kefounder.demo');
    const created = await martin.post('/api/projects', { name: 'Stacklab', tagline: 'Tu equipo técnico on-demand.', stage: 'idea', rolesNeeded: [{ role: 'designer', dedication: 'lt10', compensation: 'equity' }], dedication: 'lt10', compensation: 'equity', publish: true });
    assert.equal(created.status, 201);
    assert.equal(created.data.project.status, 'published');
    const id = created.data.project.id;
    const edited = await martin.put(`/api/projects/${id}`, { stack: ['React', 'Go'], website: 'stacklab.dev', team: [{ name: 'Lu', role: 'Design' }] });
    assert.deepEqual(edited.data.project.stack, ['React', 'Go']);
    assert.equal(edited.data.project.website, 'https://stacklab.dev/');
    const tooBig = await martin.put(`/api/projects/${id}`, { team: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
    assert.equal(tooBig.status, 402, 'perfil de equipo es de Startup');
    const copy = await martin.post(`/api/projects/${id}/duplicate`);
    assert.equal(copy.data.project.status, 'draft');
    assert.equal((await martin.del(`/api/projects/${copy.data.project.id}`)).status, 200);
    const publicPage = await client().get(`/api/public/projects/${id}`);
    assert.equal(publicPage.data.project.name, 'Stacklab');
  });

  test('estadísticas de perfil e historial', async () => {
    const martin = await login('martin@kefounder.demo');
    const stats = await martin.get('/api/me/stats');
    assert.equal(stats.status, 200);
    assert.ok(stats.data.views > 50);
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get('/api/me/stats')).status, 402);
    assert.equal((await sol.get('/api/me/history')).status, 402);
  });
});

describe('regresiones de la revisión de código', () => {
  const newUser = async (name) => {
    const c = client();
    await c.post('/api/auth/register', { name, email: `${name.toLowerCase().replace(/\s/g, '')}${Date.now()}@test.dev`, password: 'secreto123' });
    const { data } = await c.put('/api/me/onboarding', { goal: 'join_project', roles: ['developer'], availability: 'h10_20', compensation: 'equity', name });
    return { c, id: data.user.id };
  };

  test('un bloqueo cruzado no se puede deshacer desde un solo lado', async () => {
    const a = await newUser('Ana Bloqueo');
    const b = await newUser('Beto Bloqueo');
    await a.c.post('/api/actions', { targetType: 'person', targetId: b.id, action: 'connect' });
    const res = await b.c.post('/api/actions', { targetType: 'person', targetId: a.id, action: 'connect' });
    assert.equal(res.data.status, 'matched');
    const matchId = res.data.match.id;
    await a.c.post(`/api/users/${b.id}/block`);
    await b.c.post(`/api/users/${a.id}/block`);
    await b.c.del(`/api/me/blocks/${a.id}`);
    const sent = await b.c.post(`/api/matches/${matchId}/messages`, { kind: 'text', body: 'hola?' });
    assert.equal(sent.status, 404, 'A sigue bloqueando a B');
    assert.ok(!(await a.c.get('/api/matches')).data.items.some((m) => m.id === matchId));
    await a.c.del(`/api/me/blocks/${b.id}`);
    assert.equal((await b.c.post(`/api/matches/${matchId}/messages`, { kind: 'text', body: 'hola' })).status, 201, 'sin bloqueos vuelve a funcionar');
  });

  test('quien fue bloqueado no puede aceptar el interés del que lo bloqueó', async () => {
    const a = await newUser('Ari Interes');
    const b = await newUser('Bea Interes');
    await b.c.post('/api/billing/checkout', { plan: 'plus', period: 'monthly' });
    await a.c.post('/api/actions', { targetType: 'person', targetId: b.id, action: 'connect' });
    await a.c.post(`/api/users/${b.id}/block`);
    const received = await b.c.get('/api/interests/received');
    assert.equal(received.data.items.length, 0, 'la solicitud ya no aparece');
    assert.equal((await b.c.get('/api/auth/me')).data.user.counts.interests, 0);
  });

  test('el mazo de proyectos excluye founders con los que ya hay match', async () => {
    const sol = await login('sol@kefounder.demo');
    const matched = (await sol.get('/api/matches')).data.items.map((m) => m.other.id);
    const projects = await sol.get('/api/discover?mode=projects&limit=40');
    assert.ok(projects.data.items.every((p) => !matched.includes(p.owner.id)));
  });

  test('bajar de plan con el checkout pausa los proyectos que exceden el límite', async () => {
    const u = await newUser('Pau Plan');
    await u.c.post('/api/billing/checkout', { plan: 'startup', period: 'monthly' });
    for (const name of ['Uno', 'Dos', 'Tres']) {
      await u.c.post('/api/projects', { name, tagline: 'Un proyecto de prueba.', rolesNeeded: [{ role: 'cto' }], publish: true });
    }
    await u.c.post('/api/billing/checkout', { plan: 'plus', period: 'monthly' });
    const published = (await u.c.get('/api/me/projects')).data.items.filter((p) => p.status === 'published');
    assert.equal(published.length, 1);
  });

  test('editar un proyecto publicado con datos inválidos no guarda nada', async () => {
    const u = await newUser('Val Idar');
    const { data } = await u.c.post('/api/projects', { name: 'Válido', tagline: 'Descripción correcta.', rolesNeeded: [{ role: 'cto' }], publish: true });
    const bad = await u.c.put(`/api/projects/${data.project.id}`, { tagline: '', name: 'Cambiado' });
    assert.equal(bad.status, 400);
    const after = (await u.c.get('/api/me/projects')).data.items[0];
    assert.equal(after.tagline, 'Descripción correcta.');
    assert.equal(after.name, 'Válido');
  });

  test('solo se aceptan imágenes propias subidas o de Unsplash', async () => {
    const u = await newUser('Ima Gen');
    for (const photo of ['/uploads/../api/users/5', 'https://images.unsplash.com/x"), url("https://evil.dev/a.png', '/uploads/00000000-0000-0000-0000-000000000000.png']) {
      assert.equal((await u.c.put('/api/me/profile', { photo })).status, 400, photo);
    }
    assert.equal((await u.c.put('/api/me/profile', { photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' })).status, 200);
  });

  test('cambiar la contraseña cierra las otras sesiones', async () => {
    const u = await newUser('Ses Iones');
    const email = (await u.c.get('/api/auth/me')).data.user.email;
    const other = client();
    await other.post('/api/auth/login', { email, password: 'secreto123' });
    assert.ok((await other.get('/api/auth/me')).data.user);
    await u.c.put('/api/me/password', { current: 'secreto123', next: 'otraclave123' });
    assert.equal((await other.get('/api/auth/me')).data.user, null, 'la otra sesión quedó cerrada');
    assert.ok((await u.c.get('/api/auth/me')).data.user, 'la sesión actual sigue');
  });

  test('deshacer restaura exactamente la tarjeta indicada', async () => {
    const u = await newUser('Des Hacer');
    const feed = (await u.c.get('/api/discover?mode=people&limit=5')).data.items;
    await u.c.post('/api/actions', { targetType: 'person', targetId: feed[0].id, action: 'pass' });
    await u.c.post('/api/actions', { targetType: 'person', targetId: feed[1].id, action: 'pass' });
    const undo = await u.c.post('/api/discover/undo', { targetType: 'person', targetId: feed[0].id });
    assert.equal(undo.data.item.id, feed[0].id);
    const again = (await u.c.get('/api/discover?mode=people&limit=40')).data.items.map((i) => i.id);
    assert.ok(again.includes(feed[0].id) && !again.includes(feed[1].id));
  });
});

describe('actividad de los perfiles demo', () => {
  test('la actividad ambiental genera interés con tope diario', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Ambiente', email: 'ambiente@test.dev', password: 'secreto123' });
    await c.put('/api/me/onboarding', { goal: 'join_project', roles: ['developer'], availability: 'h10_20', compensation: 'equity', name: 'Ambiente' });
    const ambient = createBots(ctx, { enabled: true });
    ambient.startAmbient({ everyMs: 20, perDay: 2 });
    const reached = await waitFor(async () => (await c.get('/api/auth/me')).data.user.counts.interests >= 2, 5000);
    await new Promise((r) => setTimeout(r, 300));
    ambient.stop();
    assert.ok(reached, 'llegaron solicitudes');
    assert.equal((await c.get('/api/auth/me')).data.user.counts.interests, 2, 'respeta el tope diario');
  });
});

describe('uploads y notificaciones', () => {
  test('sube imágenes válidas y rechaza tipos peligrosos', async () => {
    const sol = await login('sol@kefounder.demo');
    const ok = await sol.post('/api/uploads', PNG, { 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('foto perfil.png') });
    assert.equal(ok.status, 201);
    assert.match(ok.data.url, /^\/uploads\/.+\.png$/);
    const file = await fetch(base + ok.data.url);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/png');

    const svg = await sol.post('/api/uploads', Buffer.from('<svg onload="alert(1)"/>'), { 'Content-Type': 'image/svg+xml' });
    assert.equal(svg.status, 400);
    const fake = await sol.post('/api/uploads', Buffer.from('no soy png'), { 'Content-Type': 'image/png' });
    assert.equal(fake.status, 400);

    const photo = await sol.put('/api/me/profile', { photo: ok.data.url });
    assert.equal(photo.data.user.photo, ok.data.url);
    const evil = await sol.put('/api/me/profile', { photo: 'https://evil.example/x.png' });
    assert.equal(evil.status, 400);
  });

  test('las notificaciones ocultan nombres en Free y se pueden marcar como leídas', async () => {
    const sol = await login('sol@kefounder.demo');
    const list = await sol.get('/api/notifications');
    const interest = list.data.items.find((n) => n.type === 'interest');
    assert.ok(interest.title.startsWith('Alguien'));
    assert.equal(interest.actor, null);
    await sol.post('/api/notifications/read-all');
    const me = await sol.get('/api/auth/me');
    assert.equal(me.data.user.counts.notifications, 0);
  });
});

describe('planes: cada función habilitada o bloqueada según el plan', () => {
  const ACCOUNTS = { free: 'sol@kefounder.demo', plus: 'ana@kefounder.demo', pro: 'martin@kefounder.demo', startup: 'rodrigo@kefounder.demo' };
  const ORDER = ['free', 'plus', 'pro', 'startup'];
  // Función → habilitada en [Free, Plus, Pro, Startup]
  const EXPECT = {
    seeInterested: [false, true, true, true],
    advancedFilters: [false, true, true, true],
    history: [false, true, true, true],
    analytics: [false, false, true, true],
    advancedCompat: [false, false, true, true]
  };
  const PROJECTS = { free: 1, plus: 1, pro: 3, startup: 5 };
  const userId = (email) => ctx.db.get('SELECT id FROM users WHERE email = ?', [email]).id;

  for (const [i, plan] of ORDER.entries()) {
    test(`${plan}: funciones y límites`, async () => {
      const c = await login(ACCOUNTS[plan]);
      const me = (await c.get('/api/auth/me')).data.user;
      assert.equal(me.plan, plan);

      const received = await c.get('/api/interests/received');
      assert.equal(received.data.locked, !EXPECT.seeInterested[i], 'ver interesados');
      if (EXPECT.seeInterested[i]) assert.ok(received.data.items.every((item) => item.person?.name), 'con Plus se ven los nombres');
      assert.equal((await c.get('/api/interests/saved-by')).data.locked, !EXPECT.seeInterested[i], 'quién te guardó');
      assert.equal((await c.get('/api/me/history')).status, EXPECT.history[i] ? 200 : 402, 'historial');
      assert.equal((await c.get('/api/me/stats')).status, EXPECT.analytics[i] ? 200 : 402, 'estadísticas de perfil');
      assert.equal((await c.get('/api/discover?mode=people&skills=Figma')).status, EXPECT.advancedFilters[i] ? 200 : 402, 'filtros avanzados');

      const deck = await c.get('/api/discover?mode=people&limit=3');
      assert.ok(deck.data.items.length > 0);
      assert.equal(Boolean(deck.data.items[0].match?.breakdown), EXPECT.advancedCompat[i], 'compatibilidad avanzada');

      const u = me.usage;
      assert.equal(u.connectionsLeft === null, plan !== 'free', 'conexiones ilimitadas desde Plus');
      assert.equal(u.savesLeft === null, plan !== 'free', 'guardados ilimitados desde Plus');
      assert.equal(u.activeProjects + u.activeProjectsLeft, PROJECTS[plan], 'cupo de proyectos activos');
      if (plan === 'free' || plan === 'plus') assert.equal(u.directLeft, 0);
      if (plan === 'pro') assert.ok(u.directLeft >= 0 && u.directLeft <= 5);
      if (plan === 'startup') assert.equal(u.directLeft, null);
    });
  }

  test('mensajes sin match: Free y Plus bloqueados, Pro con cupo, Startup sin límite', async () => {
    const target = userId('micaela@demo.kefounder');
    const body = { body: 'Hola, me gustaría conversar sobre tu experiencia.' };
    assert.equal((await (await login(ACCOUNTS.free)).post(`/api/users/${target}/direct`, body)).status, 402);
    assert.equal((await (await login(ACCOUNTS.plus)).post(`/api/users/${target}/direct`, body)).status, 402);
    const martin = await login(ACCOUNTS.pro);
    const before = (await martin.get('/api/auth/me')).data.user.usage.directLeft;
    const pro = await martin.post(`/api/users/${target}/direct`, body);
    assert.equal(pro.status, 201);
    assert.equal(pro.data.usage.directLeft, before - 1);
    const startup = await (await login(ACCOUNTS.startup)).post(`/api/users/${target}/direct`, body);
    assert.equal(startup.status, 201);
    assert.equal(startup.data.usage.directLeft, null);
  });

  test('candidatos: Free bloqueado, Pro ve la lista, Startup organiza por etapa', async () => {
    const sol = await login(ACCOUNTS.free);
    const conta = (await sol.get('/api/me/projects')).data.items.find((p) => p.name === 'ContaAI');
    assert.equal((await sol.get(`/api/projects/${conta.id}/candidates`)).status, 402);
    assert.equal((await sol.get(`/api/projects/${conta.id}/stats`)).status, 402);

    const martin = await login(ACCOUNTS.pro);
    const formo = (await martin.get('/api/me/projects')).data.items.find((p) => p.name === 'Formo');
    const proList = await martin.get(`/api/projects/${formo.id}/candidates`);
    assert.equal(proList.data.pipelineEnabled, false);
    assert.ok(proList.data.items.length >= 2);
    assert.equal((await martin.put(`/api/interests/${proList.data.items[0].id}/pipeline`, { stage: 'interview' })).status, 402);
    assert.equal((await martin.get(`/api/projects/${formo.id}/stats`)).status, 200);

    const rodrigo = await login(ACCOUNTS.startup);
    const brote = (await rodrigo.get('/api/me/projects')).data.items.find((p) => p.name === 'Brote');
    const list = await rodrigo.get(`/api/projects/${brote.id}/candidates`);
    assert.equal(list.data.pipelineEnabled, true);
    const stages = new Set(list.data.items.map((i) => i.pipeline));
    for (const stage of ['new', 'contacted', 'interview', 'joined', 'discarded']) assert.ok(stages.has(stage), `hay candidatos en ${stage}`);
    const moved = await rodrigo.put(`/api/interests/${list.data.items[0].id}/pipeline`, { stage: 'interview' });
    assert.equal(moved.data.pipeline, 'interview');
  });

  test('perfil de equipo: más de 2 integrantes solo con Startup', async () => {
    const team = [{ name: 'Uno', role: 'CTO' }, { name: 'Dos', role: 'Diseño' }, { name: 'Tres', role: 'Ventas' }];
    const martin = await login(ACCOUNTS.pro);
    const formo = (await martin.get('/api/me/projects')).data.items.find((p) => p.name === 'Formo');
    assert.equal((await martin.put(`/api/projects/${formo.id}`, { team })).status, 402);
    assert.equal((await martin.put(`/api/projects/${formo.id}`, { team: team.slice(0, 2) })).status, 200);

    const rodrigo = await login(ACCOUNTS.startup);
    const created = await rodrigo.post('/api/projects', { name: 'Equipo grande', team });
    assert.equal(created.status, 201);
    assert.equal(created.data.project.team.length, 3);
    await rodrigo.del(`/api/projects/${created.data.project.id}`);
  });
});

describe('todo lo que se muestra se puede editar', () => {
  const PNG_FILE = { 'Content-Type': 'image/png', 'X-File-Name': 'dni.png' };

  test('retirar una solicitud enviada', async () => {
    const ana = await login('ana@kefounder.demo');
    const sent = (await ana.get('/api/interests/sent')).data.items;
    const pulso = sent.find((s) => s.project?.name === 'Pulso');
    const sofia = ctx.db.get("SELECT id FROM users WHERE email = 'sofia@demo.kefounder'").id;
    const anaId = (await ana.get('/api/auth/me')).data.user.id;
    ctx.db.run("INSERT INTO notifications (user_id, type, actor_id, project_id, data, created_at) VALUES (?, 'interest', ?, ?, '{}', ?)", [sofia, anaId, pulso.project.id, new Date().toISOString()]);

    assert.equal((await ana.del(`/api/interests/${pulso.id}`)).status, 200);
    assert.ok(!(await ana.get('/api/interests/sent')).data.items.some((s) => s.id === pulso.id));
    assert.equal(ctx.db.get("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'interest'", [sofia, anaId]).n, 0, 'la notificación del otro lado se borra');

    const orbita = sent.find((s) => s.project?.name === 'Orbita');
    assert.equal((await (await login('martin@kefounder.demo')).del(`/api/interests/${orbita.id}`)).status, 403);
    const accepted = ctx.db.get("SELECT id FROM interests WHERE from_user_id = ? AND status = 'accepted' LIMIT 1", [anaId]);
    assert.equal((await ana.del(`/api/interests/${accepted.id}`)).status, 400);
  });

  test('editar y eliminar mensajes propios', async () => {
    const sol = await login('sol@kefounder.demo');
    const martin = await login('martin@kefounder.demo');
    const match = (await sol.get('/api/matches')).data.items.find((m) => m.other.name === 'Martín López');
    const sent = await martin.post(`/api/matches/${match.id}/messages`, { kind: 'text', body: 'Mensaje con eror' });
    const id = sent.data.message.id;

    const edited = await martin.put(`/api/matches/${match.id}/messages/${id}`, { body: 'Mensaje corregido' });
    assert.equal(edited.data.message.body, 'Mensaje corregido');
    assert.ok(edited.data.message.meta.editedAt);
    assert.equal((await sol.put(`/api/matches/${match.id}/messages/${id}`, { body: 'no es mío' })).status, 403);
    const seen = (await sol.get(`/api/matches/${match.id}/messages`)).data.items.find((m) => m.id === id);
    assert.equal(seen.body, 'Mensaje corregido');

    const removed = await martin.del(`/api/matches/${match.id}/messages/${id}`);
    assert.equal(removed.data.message.kind, 'deleted');
    const gone = (await sol.get(`/api/matches/${match.id}/messages`)).data.items.find((m) => m.id === id);
    assert.equal(gone.kind, 'deleted');
    assert.equal(gone.body, '');
    assert.equal((await martin.put(`/api/matches/${match.id}/messages/${id}`, { body: 'otra vez' })).status, 400);
  });

  test('deshacer un match', async () => {
    const sol = await login('sol@kefounder.demo');
    const match = (await sol.get('/api/matches')).data.items.find((m) => m.other.name === 'Valentina Ramos');
    assert.equal((await sol.del(`/api/matches/${match.id}`)).status, 200);
    assert.ok(!(await sol.get('/api/matches')).data.items.some((m) => m.id === match.id));
    assert.equal((await sol.get(`/api/matches/${match.id}`)).status, 404);
  });

  test('borrar notificaciones una por una o todas', async () => {
    const rodrigo = await login('rodrigo@kefounder.demo');
    const items = (await rodrigo.get('/api/notifications')).data.items;
    assert.ok(items.length > 2);
    await rodrigo.del(`/api/notifications/${items[0].id}`);
    assert.equal((await rodrigo.get('/api/notifications')).data.items.length, items.length - 1);
    await rodrigo.del('/api/notifications');
    assert.equal((await rodrigo.get('/api/notifications')).data.items.length, 0);
    assert.equal((await rodrigo.get('/api/auth/me')).data.user.counts.notifications, 0);
  });

  test('cambiar el email y verificarlo con un código', async () => {
    const c = client();
    const email = `mail${Date.now()}@test.dev`;
    await c.post('/api/auth/register', { name: 'Correo Nuevo', email, password: 'secreto123' });
    assert.equal((await c.put('/api/me/email', { email: `otro${email}`, password: 'mala' })).status, 400);
    assert.equal((await c.put('/api/me/email', { email: 'sol@kefounder.demo', password: 'secreto123' })).status, 409);
    const changed = await c.put('/api/me/email', { email: `nuevo${email}`, password: 'secreto123' });
    assert.equal(changed.data.user.email, `nuevo${email}`);
    assert.equal(changed.data.user.verification.email, false);
    assert.equal((await client().post('/api/auth/login', { email: `nuevo${email}`, password: 'secreto123' })).status, 200);

    const start = await c.post('/api/me/email/verification');
    assert.match(start.data.demoCode, /^\d{6}$/);
    const wrong = start.data.demoCode === '000000' ? '111111' : '000000';
    assert.equal((await c.post('/api/me/email/verify', { code: wrong })).status, 400);
    const ok = await c.post('/api/me/email/verify', { code: start.data.demoCode });
    assert.equal(ok.data.user.verification.email, true);
    assert.equal(ok.data.user.trust.email, true);
  });

  test('verificar la identidad con la foto de un documento', async () => {
    const c = client();
    await c.post('/api/auth/register', { name: 'Docu Mento', email: `doc${Date.now()}@test.dev`, password: 'secreto123' });
    assert.equal((await c.post('/api/me/identity', { document: 'https://images.unsplash.com/photo-1' })).status, 400);
    const upload = await c.post('/api/uploads', PNG, PNG_FILE);
    const res = await c.post('/api/me/identity', { document: upload.data.url });
    // Queda en revisión hasta que administración la apruebe (ver tests/admin.test.js).
    assert.equal(res.data.user.verification.identity, 'pending');
    assert.equal(res.data.user.trust.identity, false);
  });

  test('la landing solo ofrece cuentas demo que existen en la base', async () => {
    const previous = ctx.config.demoAccounts;
    ctx.config.demoAccounts = [{ email: 'sol@kefounder.demo', password: 'x', name: 'Sol', plan: 'free', headline: '' }, { email: 'nadie@kefounder.demo', password: 'x', name: 'Nadie', plan: 'plus', headline: '' }];
    const { data } = await client().get('/api/config');
    ctx.config.demoAccounts = previous;
    assert.deepEqual(data.demoAccounts.map((a) => a.email), ['sol@kefounder.demo']);
  });
});

describe('cambio de nombre FOUND → KeFounder!', () => {
  test('la cookie de sesión anterior sigue funcionando y se reemplaza sola', async () => {
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sol@kefounder.demo', password: 'kefounder1234' }) });
    const token = res.headers.get('set-cookie').match(/kefounder_session=([^;]+)/)[1];
    const legacy = await fetch(`${base}/api/auth/me`, { headers: { Cookie: `found_session=${token}` } });
    assert.equal((await legacy.json()).user.name, 'Sol Ortega');
    assert.match(legacy.headers.get('set-cookie'), /kefounder_session=/);
  });

  test('la base data/found.db se migra a data/kefounder.db sin perder datos', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-migra-'));
    const legacy = openDb(path.join(dir, 'found.db'));
    legacy.run("INSERT INTO users (email, password_hash, name, created_at) VALUES ('real@correo.com', 'x', 'Persona real', ?)", [new Date().toISOString()]);
    legacy.close();
    assert.equal(migrateLegacyDbFile(path.join(dir, 'kefounder.db')), true);
    const migrated = openDb(path.join(dir, 'kefounder.db'));
    assert.equal(migrated.get("SELECT name FROM users WHERE email = 'real@correo.com'").name, 'Persona real');
    migrated.close();
    assert.ok(fs.existsSync(path.join(dir, 'found-legacy.db')), 'la original queda como respaldo');
    assert.equal(migrateLegacyDbFile(path.join(dir, 'kefounder.db')), false, 'solo migra una vez');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('las cuentas demo pasan al dominio y contraseña nuevos; las reales no se tocan', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-demo-'));
    const db = openDb(path.join(dir, 'kefounder.db'));
    await seed(db, { reset: true });
    db.run("UPDATE users SET email = replace(email, '@kefounder.demo', '@found.demo'), password_hash = ? WHERE email LIKE '%@kefounder.demo'", [await hashPassword('found1234')]);
    db.run("UPDATE users SET email = replace(email, '@demo.kefounder', '@demo.found') WHERE email LIKE '%@demo.kefounder'");
    db.run("INSERT INTO users (email, password_hash, name, created_at) VALUES ('yo@found.demo.uy', ?, 'Real', ?)", [await hashPassword('found1234'), new Date().toISOString()]);
    await migrateDemoAccounts(db);
    const sol = db.get("SELECT password_hash FROM users WHERE email = 'sol@kefounder.demo'");
    assert.ok(await verifyPassword('kefounder1234', sol.password_hash));
    assert.equal(db.get("SELECT COUNT(*) AS n FROM users WHERE email LIKE '%@demo.kefounder'").n, db.get('SELECT COUNT(*) AS n FROM users WHERE is_demo = 1').n);
    const real = db.get("SELECT password_hash FROM users WHERE email = 'yo@found.demo.uy'");
    assert.ok(await verifyPassword('found1234', real.password_hash), 'una cuenta real conserva su contraseña');
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
