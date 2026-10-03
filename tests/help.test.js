import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { HELP_POINTS } from '../shared/catalog.js';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { createBots } from '../server/bots.js';
import { now, openDb } from '../server/db.js';
import { closeWeek, qualifies, shiftWeek, weekKey, weekRange, weekRanking } from '../server/help.js';
import { createHub } from '../server/realtime.js';
import { seed } from '../server/seed.js';

let server;
let base;
let ctx;
let dataDir;
let admin;
const ADMIN = { email: 'ayuda@kefounder.test', password: 'ayuda-de-prueba-2026' };

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
const idOf = (key) => ctx.db.get('SELECT id FROM users WHERE email IN (?, ?)', [`${key}@kefounder.demo`, `${key}@demo.kefounder`]).id;
const notices = (key, type) => ctx.db.all('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY id DESC', [idOf(key), type]);
const pointsOf = (key, which = 'current') => {
  const k = which === 'last' ? shiftWeek(weekKey(), -1) : weekKey();
  return weekRanking(ctx.db, weekRange(k)).find((r) => r.user_id === idOf(key))?.points || 0;
};
const ask = (c, extra = {}) => c.post('/api/help', {
  category: 'producto',
  title: 'Necesito ayuda con ordenar el roadmap del trimestre',
  body: 'Tenemos más ideas que tiempo y el equipo es chico. ¿Cómo priorizan ustedes qué construir primero?',
  ...extra
});
const SOLUTION = 'Usá un tablero con impacto y esfuerzo: elegí tres apuestas por trimestre y medí una sola métrica por cada una.';

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-help-'));
  const db = openDb(path.join(dataDir, 'test.db'));
  await seed(db, { reset: true });
  db.run(
    "INSERT INTO users (email, password_hash, name, role, segment, onboarded, email_verified, visible, settings, created_at) VALUES (?, ?, 'Comunidad', 'admin', 'staff', 0, 1, 0, '{}', ?)",
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

describe('ranking semanal y podio', () => {
  test('la semana pasada de la demo cierra con podio, puntos con topes y aviso a quienes ganaron', async () => {
    const martin = await login('martin@kefounder.demo');
    const { status, data } = await martin.get('/api/help/ranking?week=last');
    assert.equal(status, 200);
    assert.equal(data.week.closed, true);
    // Federico: 2 soluciones (4) + elegidas por Sofía (20) y Martina (20, más 2 votos suyos: tope 30) + votos de otras personas.
    assert.deepEqual(data.podium.map((p) => [p.place, p.user.name, p.points]), [[1, 'Federico Blanco', 74], [2, 'Diego Castro', 51], [3, 'Martín López', 42]]);
    assert.equal(data.me.place, 3);
    assert.ok(data.history.length >= 1);
    assert.equal(notices('martin', 'help_award')[0] && JSON.parse(notices('martin', 'help_award')[0].data).place, 3);
    // Cerrar de nuevo la misma semana no duplica el podio.
    assert.deepEqual(closeWeek(ctx.db, shiftWeek(weekKey(), -1)), []);
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM help_awards WHERE week = ?', [shiftWeek(weekKey(), -1)]).n, 3);
  });

  test('la semana en curso muestra el podio parcial y tu posición', async () => {
    const ana = await login('ana@kefounder.demo');
    const { data } = await ana.get('/api/help/ranking');
    assert.equal(data.week.closed, false);
    assert.equal(data.podium[0].user.name, 'Emiliano Ruiz');
    assert.equal(data.podium[0].points, 37);
    assert.equal(data.me.rank, 2);
    assert.equal(data.me.points, 24);
    assert.equal(data.me.inPodium, true);
    assert.equal(data.me.toPodium, 0);
    // El ranking no muestra la ubicación ni la última conexión de nadie.
    assert.equal(data.podium[0].user.location, undefined);
    assert.equal(data.podium[0].user.lastActiveAt, undefined);
  });

  test('para el podio, los puntos tienen que venir de al menos dos personas', () => {
    const db = ctx.db;
    const at = now();
    const helper = idOf('tomas');
    const giver = idOf('nicolas');
    const req = db.run("INSERT INTO help_requests (user_id, category, title, body, created_at, updated_at, last_activity_at) VALUES (?, 'producto', 'una sola persona me da todo', 'Detalle de prueba para el podio con una sola persona.', ?, ?, ?)", [giver, at, at, at]).lastInsertRowid;
    const answer = db.run('INSERT INTO help_answers (request_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [req, helper, SOLUTION, at, at]).lastInsertRowid;
    db.run("UPDATE help_requests SET status = 'solved', accepted_answer_id = ?, accepted_at = ? WHERE id = ?", [answer, at, req]);
    const row = () => weekRanking(db, weekRange(weekKey())).find((r) => r.user_id === helper);
    assert.equal(row().points, 22);
    assert.equal(qualifies(row()), false);
    db.run('INSERT INTO help_votes (answer_id, user_id, created_at) VALUES (?, ?, ?)', [answer, idOf('paula'), at]);
    assert.equal(qualifies(row()), true);
    db.run('DELETE FROM help_requests WHERE id = ?', [req]);
  });

  test('tus propias soluciones suman hasta 10 por semana y una misma persona te da hasta 30', () => {
    const db = ctx.db;
    const helper = idOf('lautaro');
    const giver = idOf('nicolas');
    const at = now();
    const before = pointsOf('lautaro');
    const answers = [];
    for (let i = 0; i < 6; i += 1) {
      const req = db.run("INSERT INTO help_requests (user_id, category, title, body, created_at, updated_at, last_activity_at) VALUES (?, 'producto', ?, 'Detalle de prueba para el tope de puntos semanal.', ?, ?, ?)", [giver, `tope de puntos ${i}`, at, at, at]).lastInsertRowid;
      answers.push([req, db.run('INSERT INTO help_answers (request_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [req, helper, SOLUTION, at, at]).lastInsertRowid]);
    }
    assert.equal(pointsOf('lautaro') - before, HELP_POINTS.answerWeeklyCap);
    // La misma persona elige una solución (20) y vota otras tres (15): suman 30, no 35.
    db.run("UPDATE help_requests SET status = 'solved', accepted_answer_id = ?, accepted_at = ? WHERE id = ?", [answers[0][1], at, answers[0][0]]);
    for (const [, answerId] of answers.slice(1, 4)) db.run('INSERT INTO help_votes (answer_id, user_id, created_at) VALUES (?, ?, ?)', [answerId, giver, at]);
    assert.equal(pointsOf('lautaro') - before, HELP_POINTS.answerWeeklyCap + HELP_POINTS.perPersonWeeklyCap);
    // Un voto de otra persona suma aparte.
    db.run('INSERT INTO help_votes (answer_id, user_id, created_at) VALUES (?, ?, ?)', [answers[5][1], idOf('paula'), at]);
    assert.equal(pointsOf('lautaro') - before, HELP_POINTS.answerWeeklyCap + HELP_POINTS.perPersonWeeklyCap + HELP_POINTS.helpful);
    for (const [req] of answers) db.run('DELETE FROM help_requests WHERE id = ?', [req]);
    assert.equal(pointsOf('lautaro'), before);
  });
});

describe('pedidos y soluciones', () => {
  let requestId;

  test('publicar un pedido valida los datos y limita a 3 por día', async () => {
    const sol = await login('sol@kefounder.demo');
    assert.equal((await ask(sol, { category: '' })).status, 400);
    assert.equal((await ask(sol, { title: 'Necesito ayuda con algo' })).data.field, 'title');
    assert.equal((await ask(sol, { body: 'Muy corto' })).data.field, 'body');
    const created = await ask(sol);
    assert.equal(created.status, 201);
    // «Necesito ayuda con…» ya lo pone la app: se quita del título.
    assert.equal(created.data.request.title, 'ordenar el roadmap del trimestre');
    assert.equal(created.data.viewer.canAnswer, false);
    assert.equal(created.data.viewer.canEdit, true);
    requestId = created.data.request.id;
    assert.equal((await ask(sol, { title: 'contratar diseño freelance' })).status, 201);
    const third = await ask(sol, { title: 'abrir una cuenta en dólares' });
    assert.equal(third.status, 201);
    assert.equal((await ask(sol, { title: 'otro pedido más en el día' })).status, 429);
    assert.equal((await sol.del(`/api/help/${third.data.request.id}`)).status, 200);
  });

  test('la comunidad responde, el aviso se agrupa y quien pidió no puede responderse', async () => {
    const sol = await login('sol@kefounder.demo');
    const martin = await login('martin@kefounder.demo');
    const ana = await login('ana@kefounder.demo');
    assert.equal((await sol.post(`/api/help/${requestId}/answers`, { body: SOLUTION })).status, 400);
    assert.equal((await martin.post(`/api/help/${requestId}/answers`, { body: 'Corto' })).data.field, 'body');
    const first = await martin.post(`/api/help/${requestId}/answers`, { body: SOLUTION });
    assert.equal(first.status, 201);
    assert.equal(first.data.viewer.canAnswer, false);
    assert.equal((await martin.post(`/api/help/${requestId}/answers`, { body: SOLUTION })).status, 400);
    assert.equal((await ana.post(`/api/help/${requestId}/answers`, { body: 'Hacé una lista corta y validala con tres clientes antes de comprometer al equipo.' })).status, 201);
    const notice = notices('sol', 'help_answer')[0];
    assert.equal(JSON.parse(notice.data).count, 2);
    assert.equal(notice.read_at, null);
    // Con soluciones publicadas ya no se puede editar ni borrar, pero sí cerrar.
    const view = await sol.get(`/api/help/${requestId}`);
    assert.equal(view.data.answers.length, 2);
    assert.equal(view.data.viewer.canEdit, false);
    assert.equal(view.data.viewer.canDelete, false);
    assert.equal((await sol.put(`/api/help/${requestId}`, { category: 'producto', title: 'cambiar el título', body: 'Un cuerpo nuevo con suficiente detalle para pasar.' })).status, 400);
    assert.equal((await sol.del(`/api/help/${requestId}`)).status, 400);
    // Abrir el pedido marca como leído el aviso.
    assert.ok(ctx.db.get('SELECT read_at FROM notifications WHERE id = ?', [notice.id]).read_at);
  });

  test('«Me sirvió» se marca y se desmarca, y no vale votarse a sí mismo', async () => {
    const martin = await login('martin@kefounder.demo');
    const ana = await login('ana@kefounder.demo');
    const view = await ana.get(`/api/help/${requestId}`);
    const martinAnswer = view.data.answers.find((a) => a.author.name === 'Martín López');
    const before = pointsOf('martin');
    assert.equal((await martin.post(`/api/help/answers/${martinAnswer.id}/vote`)).status, 400);
    const voted = await ana.post(`/api/help/answers/${martinAnswer.id}/vote`);
    assert.equal(voted.data.answers.find((a) => a.id === martinAnswer.id).voted, true);
    assert.equal(pointsOf('martin') - before, HELP_POINTS.helpful);
    await ana.post(`/api/help/answers/${martinAnswer.id}/vote`);
    assert.equal(pointsOf('martin'), before);
    // Un voto viejo que se quita y se vuelve a marcar conserva su fecha: no suma en la semana en curso.
    const lastWeek = new Date(Date.now() - 8 * 86400000).toISOString();
    ctx.db.run('UPDATE help_votes SET created_at = ? WHERE answer_id = ? AND user_id = ?', [lastWeek, martinAnswer.id, idOf('ana')]);
    await ana.post(`/api/help/answers/${martinAnswer.id}/vote`);
    assert.equal(ctx.db.get('SELECT created_at FROM help_votes WHERE answer_id = ? AND user_id = ?', [martinAnswer.id, idOf('ana')]).created_at, lastWeek);
    assert.equal(pointsOf('martin'), before);
    await ana.post(`/api/help/answers/${martinAnswer.id}/vote`);
  });

  test('quien pidió elige la solución: suma puntos, avisa y se puede deshacer', async () => {
    const sol = await login('sol@kefounder.demo');
    const ana = await login('ana@kefounder.demo');
    const view = await sol.get(`/api/help/${requestId}`);
    const martinAnswer = view.data.answers.find((a) => a.author.name === 'Martín López');
    assert.equal((await ana.post(`/api/help/${requestId}/accept`, { answerId: martinAnswer.id })).status, 403);
    const before = pointsOf('martin');
    const accepted = await sol.post(`/api/help/${requestId}/accept`, { answerId: martinAnswer.id });
    assert.equal(accepted.data.request.status, 'solved');
    assert.equal(accepted.data.answers[0].accepted, true);
    assert.equal(pointsOf('martin') - before, HELP_POINTS.accepted);
    assert.equal(JSON.parse(notices('martin', 'help_accepted')[0].data).requestId, requestId);
    // La solución elegida no se puede borrar.
    const martin = await login('martin@kefounder.demo');
    assert.equal((await martin.del(`/api/help/answers/${martinAnswer.id}`)).status, 400);
    const undone = await sol.post(`/api/help/${requestId}/accept`, { answerId: null });
    assert.equal(undone.data.request.status, 'open');
    assert.equal(pointsOf('martin'), before);
    // Volver a elegir la misma solución no avisa de nuevo ni cambia la fecha de la elección.
    const acceptedAt = ctx.db.get('SELECT accepted_at FROM help_requests WHERE id = ?', [requestId]).accepted_at;
    await sol.post(`/api/help/${requestId}/accept`, { answerId: martinAnswer.id });
    assert.equal(notices('martin', 'help_accepted').length, 1);
    assert.equal(ctx.db.get('SELECT accepted_at FROM help_requests WHERE id = ?', [requestId]).accepted_at, acceptedAt);
    assert.equal(pointsOf('martin') - before, HELP_POINTS.accepted);
  });

  test('si la solución elegida se oculta, el pedido vuelve a estar abierto', async () => {
    const sol = await login('sol@kefounder.demo');
    const answerId = ctx.db.get('SELECT accepted_answer_id AS id FROM help_requests WHERE id = ?', [requestId]).id;
    await admin.put(`/api/admin/help/answers/${answerId}`, { hidden: true, reason: 'Prueba de moderación' });
    const view = await sol.get(`/api/help/${requestId}`);
    assert.equal(view.data.request.status, 'open');
    assert.equal(view.data.viewer.canAccept, true);
    const list = await sol.get('/api/help?tab=solved');
    assert.ok(!list.data.items.some((r) => r.id === requestId));
    await admin.put(`/api/admin/help/answers/${answerId}`, { hidden: false });
    assert.equal((await sol.get(`/api/help/${requestId}`)).data.request.status, 'solved');
  });

  test('bloquear a quien respondió no habilita a editar o borrar el pedido, ni a elegir su solución', async () => {
    const ana = await login('ana@kefounder.demo');
    const martin = await login('martin@kefounder.demo');
    const created = await ask(ana, { title: 'armar un programa de referidos', category: 'marketing' });
    const id = created.data.request.id;
    const answer = await martin.post(`/api/help/${id}/answers`, { body: SOLUTION });
    const answerId = answer.data.answers[0].id;
    await ana.post(`/api/users/${idOf('martin')}/block`);
    const view = await ana.get(`/api/help/${id}`);
    assert.equal(view.data.answers.length, 0);
    assert.equal(view.data.viewer.canEdit, false);
    assert.equal(view.data.viewer.canDelete, false);
    assert.equal((await ana.put(`/api/help/${id}`, { category: 'marketing', title: 'otro título distinto', body: 'Un cuerpo nuevo con suficiente detalle para pasar la validación.' })).status, 400);
    assert.equal((await ana.del(`/api/help/${id}`)).status, 400);
    assert.equal((await ana.post(`/api/help/${id}/accept`, { answerId })).status, 404);
    assert.equal(notices('martin', 'help_accepted').filter((n) => JSON.parse(n.data).requestId === id).length, 0);
    ctx.db.run('DELETE FROM blocks WHERE user_id = ?', [idOf('ana')]);
  });

  test('borrar y volver a publicar una solución no infla el aviso', async () => {
    const ana = await login('ana@kefounder.demo');
    const rodrigo = await login('rodrigo@kefounder.demo');
    const id = ctx.db.get("SELECT id FROM help_requests WHERE title = 'armar un programa de referidos'").id;
    const first = await rodrigo.post(`/api/help/${id}/answers`, { body: SOLUTION });
    const mineId = first.data.viewer.myAnswerId;
    await rodrigo.del(`/api/help/answers/${mineId}`);
    await rodrigo.post(`/api/help/${id}/answers`, { body: SOLUTION });
    const notice = notices('ana', 'help_answer').find((n) => JSON.parse(n.data).requestId === id && !n.read_at);
    // El aviso de Martín ya estaba leído: queda uno nuevo de Rodrigo, que cuenta una vez aunque publicó dos.
    assert.equal(JSON.parse(notice.data).count, 1);
    assert.equal(notice.actor_id, idOf('rodrigo'));
    await ana.get(`/api/help/${id}`);
  });

  test('cerrar y reabrir, y la lista por pestañas', async () => {
    const sol = await login('sol@kefounder.demo');
    const created = await ask(sol, { title: 'armar un equipo remoto en tres países', category: 'equipo' });
    const id = created.data.request.id;
    assert.equal((await sol.post(`/api/help/${id}/status`, { status: 'closed' })).data.request.status, 'closed');
    const martin = await login('martin@kefounder.demo');
    assert.equal((await martin.post(`/api/help/${id}/answers`, { body: SOLUTION })).status, 400);
    assert.equal((await sol.post(`/api/help/${id}/status`, { status: 'open' })).data.request.status, 'open');
    const unanswered = await martin.get('/api/help?tab=unanswered&category=equipo');
    assert.ok(unanswered.data.items.some((r) => r.id === id));
    assert.ok(unanswered.data.items.every((r) => r.answers === 0 && r.category === 'equipo'));
    const search = await martin.get(`/api/help?q=${encodeURIComponent('PAISES')}`);
    assert.ok(search.data.items.some((r) => r.id === id));
    const mine = await sol.get('/api/help?tab=mine');
    assert.ok(mine.data.items.every((r) => r.mine));
    assert.equal(mine.data.counts.mine, mine.data.items.length);
  });

  test('la barra superior avisa de pedidos nuevos hasta que entrás a verlos', async () => {
    const martin = await login('martin@kefounder.demo');
    await martin.get('/api/help');
    assert.equal((await martin.get('/api/auth/me')).data.user.counts.help, 0);
    const rodrigo = await login('rodrigo@kefounder.demo');
    await ask(rodrigo, { title: 'medir el costo de adquisición por canal', category: 'marketing' });
    assert.equal((await martin.get('/api/auth/me')).data.user.counts.help, 1);
    await martin.get('/api/help');
    assert.equal((await martin.get('/api/auth/me')).data.user.counts.help, 0);
  });

  test('quien bloqueó a alguien no ve sus pedidos, ni el aviso, ni sus datos en el ranking', async () => {
    const martin = await login('martin@kefounder.demo');
    const rodrigo = await login('rodrigo@kefounder.demo');
    await martin.get('/api/help');
    const created = await ask(rodrigo, { title: 'negociar con un proveedor grande', category: 'ventas' });
    assert.equal((await martin.get('/api/auth/me')).data.user.counts.help, 1);
    await martin.post(`/api/users/${idOf('rodrigo')}/block`);
    assert.equal((await martin.get('/api/auth/me')).data.user.counts.help, 0);
    const list = await martin.get('/api/help?category=ventas');
    assert.ok(!list.data.items.some((r) => r.id === created.data.request.id));
    assert.equal((await martin.get(`/api/help/${created.data.request.id}`)).status, 404);
    // Rodrigo sumó puntos esta semana: en el ranking de Martín aparece sin datos.
    const ranking = await martin.get('/api/help/ranking');
    const everyone = [...ranking.data.podium, ...ranking.data.items].map((r) => r.user.name);
    assert.ok(!everyone.includes('Rodrigo Barrios'));
    assert.ok(everyone.includes('Perfil no disponible'));
    ctx.db.run('DELETE FROM blocks WHERE user_id = ?', [idOf('martin')]);
  });
});

describe('perfil y moderación', () => {
  test('el reconocimiento aparece en el perfil propio y en el que ven los demás', async () => {
    const martin = await login('martin@kefounder.demo');
    const own = await martin.get('/api/help/people/me');
    assert.equal(own.data.awards[0].place, 3);
    assert.equal(own.data.stats.podiums[3], 1);
    assert.ok(own.data.week);
    const sol = await login('sol@kefounder.demo');
    const seen = await sol.get(`/api/help/people/${idOf('martin')}`);
    assert.equal(seen.data.awards.length, 1);
    assert.equal(seen.data.week, undefined);
    ctx.db.run('UPDATE users SET visible = 0 WHERE id = ?', [idOf('martin')]);
    assert.equal((await sol.get(`/api/help/people/${idOf('martin')}`)).status, 404);
    ctx.db.run('UPDATE users SET visible = 1 WHERE id = ?', [idOf('martin')]);
  });

  test('ocultar un pedido descuenta sus puntos, avisa y solo lo ve quien lo publicó', async () => {
    const valentina = ctx.db.get("SELECT id FROM help_requests WHERE title = 'repartir el equity con mi cofounder'").id;
    const before = pointsOf('emiliano');
    assert.equal((await admin.put(`/api/admin/help/${valentina}`, { hidden: true })).status, 400);
    assert.equal((await admin.put(`/api/admin/help/${valentina}`, { hidden: true, reason: 'Datos personales expuestos' })).status, 200);
    assert.ok(pointsOf('emiliano') < before);
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get(`/api/help/${valentina}`)).status, 404);
    assert.equal(JSON.parse(notices('valentina', 'help_hidden')[0].data).reason, 'Datos personales expuestos');
    const detail = await admin.get(`/api/admin/help/${valentina}`);
    assert.equal(detail.data.request.hidden, true);
    assert.equal(detail.data.audit[0].action, 'help.hide');
    await admin.put(`/api/admin/help/${valentina}`, { hidden: false });
    assert.equal(pointsOf('emiliano'), before);
  });

  test('una solución reportada se oculta desde Moderación', async () => {
    const answer = ctx.db.get("SELECT a.id, a.request_id FROM help_answers a JOIN users u ON u.id = a.user_id WHERE u.email = 'camila@demo.kefounder'");
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.post('/api/reports', { targetType: 'help_answer', targetId: answer.id, reason: 'Spam o publicidad' })).status, 201);
    const report = ctx.db.get("SELECT id FROM reports WHERE target_type = 'help_answer' AND target_id = ?", [answer.id]);
    const listed = await admin.get('/api/admin/reports?type=help_answer');
    assert.equal(listed.data.items[0].target.type, 'help_answer');
    assert.equal((await admin.get('/api/admin/help?status=reported')).data.items[0].id, answer.request_id);
    assert.equal((await admin.put(`/api/admin/reports/${report.id}`, { status: 'resolved', action: 'hide', resolution: 'Era publicidad de una herramienta' })).status, 200);
    assert.equal(ctx.db.get('SELECT hidden FROM help_answers WHERE id = ?', [answer.id]).hidden, 1);
    const view = await sol.get(`/api/help/${answer.request_id}`);
    assert.ok(!view.data.answers.some((a) => a.id === answer.id));
  });

  test('anular un reconocimiento lo saca del perfil', async () => {
    const ranking = await admin.get('/api/admin/help/ranking?week=last');
    const award = ranking.data.history[0].winners.find((w) => w.place === 3);
    assert.equal((await admin.put(`/api/admin/help/awards/${award.id}`, { revoked: true })).status, 400);
    assert.equal((await admin.put(`/api/admin/help/awards/${award.id}`, { revoked: true, reason: 'Votos entre cuentas de la misma persona' })).status, 200);
    const martin = await login('martin@kefounder.demo');
    assert.equal((await martin.get('/api/help/people/me')).data.awards.length, 0);
    // El puesto anulado queda vacío y la lista sigue en el 4.º, sin repetir números ni mostrar a quien se le anuló.
    const last = (await martin.get('/api/help/ranking?week=last')).data;
    assert.deepEqual(last.podium.map((p) => p.place), [1, 2]);
    assert.equal(last.items[0].rank, 4);
    assert.ok(!last.items.some((r) => r.user.name === 'Martín López'));
    await admin.put(`/api/admin/help/awards/${award.id}`, { revoked: false });
    assert.equal((await martin.get('/api/help/people/me')).data.awards.length, 1);
  });

  test('las cuentas sin sesión o sin perfil completo no entran', async () => {
    const anon = client();
    assert.equal((await anon.get('/api/help')).status, 401);
    assert.equal((await anon.get('/api/help/ranking')).status, 401);
    assert.equal((await client().get('/api/admin/help')).status, 401);
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get('/api/admin/help')).status, 403);
  });
});
