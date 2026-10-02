import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { createBots } from '../server/bots.js';
import { now, openDb } from '../server/db.js';
import { createHub } from '../server/realtime.js';
import { ensureSampleArticles } from '../server/revista.js';
import { seed } from '../server/seed.js';
import { parseArticle } from '../shared/revista.js';

let server;
let base;
let ctx;
let dataDir;
let admin;
const ADMIN = { email: 'redaccion@kefounder.test', password: 'redaccion-de-prueba-2026' };
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
const COVER = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40';

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
    const type = res.headers.get('content-type') || '';
    return { status: res.status, data: type.includes('json') ? await res.json() : await res.text() };
  };
  return { get: (u) => call('GET', u), post: (u, b, h) => call('POST', u, b ?? {}, h), put: (u, b) => call('PUT', u, b), del: (u, b) => call('DELETE', u, b) };
}

const login = async (email, password = 'kefounder1234') => {
  const c = client();
  assert.equal((await c.post('/api/auth/login', { email, password })).status, 200);
  return c;
};

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-revista-'));
  const db = openDb(path.join(dataDir, 'test.db'));
  await seed(db, { reset: true });
  db.run(
    "INSERT INTO users (email, password_hash, name, role, segment, onboarded, email_verified, visible, settings, created_at) VALUES (?, ?, 'Redacción', 'admin', 'staff', 0, 1, 0, '{}', ?)",
    [ADMIN.email, await hashPassword(ADMIN.password), now()]
  );
  // Un index.html mínimo para probar los datos para compartir que agrega el servidor.
  fs.writeFileSync(path.join(dataDir, 'index.html'), '<!doctype html><html><head><meta name="description" content="Original" /><title>KeFounder!</title></head><body></body></html>');
  ctx = { db, hub: createHub(), config: { demo: true, demoAccounts: [], uploadsDir: path.join(dataDir, 'uploads'), distDir: dataDir, root: dataDir } };
  ctx.bots = createBots(ctx, { enabled: false });
  const app = createApp(ctx, { serveDist: true });
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

describe('revista pública', () => {
  test('se lee sin cuenta: portada, secciones, búsqueda y nota', async () => {
    const anon = client();
    const home = await anon.get('/api/revista/home');
    assert.equal(home.status, 200);
    assert.ok(home.data.featured.featured, 'la portada es la nota destacada');
    assert.equal(home.data.latest.length, 4);
    assert.ok(!home.data.latest.some((a) => a.id === home.data.featured.id));
    assert.ok(home.data.mostRead.length === 5);
    assert.ok(home.data.quote?.text);

    const section = await anon.get('/api/revista/articles?section=inversion');
    assert.ok(section.data.items.length >= 1 && section.data.items.every((a) => a.section === 'inversion'));
    const bogus = await anon.get('/api/revista/articles?section=DROP');
    assert.equal(bogus.data.section, '');
    const found = await anon.get('/api/revista/articles?q=Brote');
    assert.ok(found.data.items.some((a) => a.slug.includes('brote')));
    assert.equal((await anon.get(`/api/revista/articles?q=${encodeURIComponent('100%_')}`)).data.total, 0);

    const detail = await anon.get(`/api/revista/articles/${home.data.featured.slug}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.data.article.blocks.some((b) => b.type === 'q') && detail.data.article.blocks.some((b) => b.type === 'quote'));
    assert.equal(detail.data.article.project.name, 'ContaAI', 'muestra el proyecto vinculado si es público');
    assert.equal(detail.data.preview, false);
    assert.equal(detail.data.related.length, 3);
  });

  test('las lecturas se cuentan una vez por persona cada 6 horas; administración no suma', async () => {
    const slug = (await client().get('/api/revista/home')).data.latest[0].slug;
    const views = () => ctx.db.get('SELECT views FROM articles WHERE slug = ?', [slug]).views;
    const start = views();
    assert.equal((await client().post(`/api/revista/articles/${slug}/view`)).data.counted, true);
    assert.equal((await client().post(`/api/revista/articles/${slug}/view`)).data.counted, false);
    assert.equal((await admin.post(`/api/revista/articles/${slug}/view`)).data.counted, false);
    assert.equal(views(), start + 1);
  });

  test('el formato nunca deja pasar HTML ni enlaces peligrosos', () => {
    const blocks = parseArticle('Hola <script>alert(1)</script> [x](javascript:alert(1)) **ok**\n\n![foto](https://evil.example/a.png)');
    assert.equal(blocks.length, 1, 'la imagen externa se descarta');
    const parts = blocks[0].text;
    assert.ok(parts.every((p) => p.t !== 'a'), 'el enlace javascript: queda como texto');
    assert.ok(parts.some((p) => p.t === 'b' && p.v === 'ok'));
    assert.ok(parts.find((p) => p.t === 'text').v.includes('<script>'), 'el HTML se muestra como texto, no se interpreta');
  });

  test('al compartir, la página trae título, resumen y foto de la nota', async () => {
    const home = (await client().get('/api/revista/home')).data;
    const res = await fetch(`${base}/revista/${home.featured.slug}`);
    const html = await res.text();
    assert.match(html, /<title>Sol Ortega: «La IA no reemplaza al contador, le devuelve las tardes» · Revista KeFounder!<\/title>/);
    assert.match(html, /<meta property="og:image" content="https:\/\/images\.unsplash\.com\/photo-[^"]+w=1200/);
    assert.match(html, /<meta property="og:type" content="article"/);
    assert.ok(!html.includes('content="Original"'));
    const generic = await (await fetch(`${base}/revista/seccion/startups`)).text();
    assert.match(generic, /og:title" content="Revista KeFounder!/);
    const other = await (await fetch(`${base}/matches`)).text();
    assert.ok(!other.includes('og:title'), 'el resto del sitio no cambia');
  });
});

describe('revista desde el panel', () => {
  test('solo administración gestiona notas', async () => {
    const sol = await login('sol@kefounder.demo');
    assert.equal((await sol.get('/api/admin/articles')).status, 403);
    assert.equal((await sol.post('/api/admin/articles', { title: 'Intento de nota', section: 'startups' })).status, 403);
    assert.equal((await client().get('/api/admin/articles')).status, 401);
  });

  test('borrador → publicar → programar → despublicar, con auditoría', async () => {
    assert.equal((await admin.post('/api/admin/articles', { title: 'Corta', section: 'startups' })).status, 400);
    assert.equal((await admin.post('/api/admin/articles', { title: 'Una nota sin sección' })).status, 400);
    const created = await admin.post('/api/admin/articles', { title: 'Lanzamiento: la nueva startup del mes', section: 'startups', format: 'noticia' });
    assert.equal(created.status, 201);
    const a = created.data.article;
    assert.equal(a.state, 'draft');
    assert.equal(a.slug, 'lanzamiento-la-nueva-startup-del-mes');
    assert.equal((await admin.post('/api/admin/articles', { title: 'Lanzamiento: la nueva startup del mes', section: 'startups' })).data.article.slug, 'lanzamiento-la-nueva-startup-del-mes-2');

    // Borrador: el público no lo ve; administración sí, como vista previa.
    assert.equal((await client().get(`/api/revista/articles/${a.slug}`)).status, 404);
    assert.equal((await admin.get(`/api/revista/articles/${a.slug}`)).data.preview, true);

    assert.equal((await admin.post(`/api/admin/articles/${a.id}/publish`)).status, 400, 'sin texto no se publica');
    await admin.put(`/api/admin/articles/${a.id}`, { body: 'P: ¿Qué hacen?\nR: Algo muy útil.', cover: COVER, tags: ['Uruguay', 'IA'] });
    const published = await admin.post(`/api/admin/articles/${a.id}/publish`);
    assert.equal(published.data.article.state, 'published');
    assert.equal((await client().get(`/api/revista/articles/${a.slug}`)).status, 200);
    assert.ok((await client().get('/api/revista/articles?section=startups')).data.items.some((x) => x.id === a.id));

    const later = new Date(Date.now() + 3 * 86400000).toISOString();
    const scheduled = await admin.post(`/api/admin/articles/${a.id}/publish`, { publishedAt: later });
    assert.equal(scheduled.data.article.state, 'scheduled');
    assert.equal((await client().get(`/api/revista/articles/${a.slug}`)).status, 404, 'programada: todavía no sale');
    assert.equal((await admin.get('/api/admin/articles?state=scheduled')).data.items[0].id, a.id);

    await admin.post(`/api/admin/articles/${a.id}/publish`, { publishedAt: new Date(Date.now() - 60000).toISOString() });
    assert.equal((await admin.put(`/api/admin/articles/${a.id}`, { body: '' })).status, 400, 'una publicada no se vacía');
    const unpublished = await admin.post(`/api/admin/articles/${a.id}/unpublish`);
    assert.equal(unpublished.data.article.state, 'draft');
    assert.equal((await client().get(`/api/revista/articles/${a.slug}`)).status, 404);

    const actions = unpublished.data.audit.map((x) => x.action);
    for (const action of ['article.create', 'article.update', 'article.publish', 'article.schedule', 'article.unpublish']) assert.ok(actions.includes(action), action);
  });

  test('portada, dirección reservada, imágenes y eliminación con motivo', async () => {
    const { data } = await admin.post('/api/admin/articles', { title: 'Nota para la portada del día', section: 'founders', body: 'Texto de la nota.', cover: COVER });
    const id = data.article.id;
    assert.equal((await admin.put(`/api/admin/articles/${id}/featured`, { featured: true })).status, 400, 'un borrador no va a la portada');
    await admin.post(`/api/admin/articles/${id}/publish`);
    await admin.put(`/api/admin/articles/${id}/featured`, { featured: true });
    assert.equal((await client().get('/api/revista/home')).data.featured.id, id, 'la destacada más reciente encabeza la portada');

    assert.equal((await admin.put(`/api/admin/articles/${id}`, { slug: 'buscar' })).status, 400);
    assert.equal((await admin.put(`/api/admin/articles/${id}`, { slug: 'Con Espacios' })).status, 400);
    assert.equal((await admin.put(`/api/admin/articles/${id}`, { cover: 'https://evil.example/foto.jpg' })).status, 400);

    // Solo sirven imágenes subidas por administración.
    const sol = await login('sol@kefounder.demo');
    const solUpload = await sol.post('/api/uploads', PNG, { 'Content-Type': 'image/png', 'X-File-Name': 'a.png' });
    assert.equal((await admin.put(`/api/admin/articles/${id}`, { cover: solUpload.data.url })).status, 400);
    const own = await admin.post('/api/uploads', PNG, { 'Content-Type': 'image/png', 'X-File-Name': 'portada.png' });
    assert.equal((await admin.put(`/api/admin/articles/${id}`, { cover: own.data.url, person: { name: 'Ana Rivas', photo: own.data.url } })).status, 200);

    assert.equal((await admin.del(`/api/admin/articles/${id}`, {})).status, 400, 'pide motivo');
    assert.equal((await admin.del(`/api/admin/articles/${id}`, { reason: 'Nota duplicada' })).status, 200);
    assert.equal(ctx.db.get('SELECT 1 FROM articles WHERE id = ?', [id]), undefined);
    assert.notEqual((await client().get('/api/revista/home')).data.featured.id, id);
  });

  test('las notas de ejemplo se quitan juntas, no vuelven y reiniciar la demo no toca las propias', async () => {
    const own = await admin.post('/api/admin/articles', { title: 'Nota propia que tiene que quedar', section: 'ecosistema' });
    const list = await admin.get('/api/admin/articles?origin=sample');
    assert.ok(list.data.counts.samples >= 10);
    const removed = await admin.del('/api/admin/articles/samples');
    assert.ok(removed.data.removed >= 10);
    assert.equal(ensureSampleArticles(ctx.db), 0, 'no se vuelven a cargar solas');
    assert.ok(ctx.db.get('SELECT 1 FROM articles WHERE id = ?', [own.data.article.id]));

    await seed(ctx.db, { reset: true });
    assert.ok(ctx.db.get('SELECT 1 FROM articles WHERE id = ?', [own.data.article.id]), 'la nota propia sigue');
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM articles WHERE is_sample = 1').n, 10, 'la demo vuelve con sus ejemplos');
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM articles WHERE is_sample = 1 AND project_id IS NOT NULL').n, 7, 'vinculadas a los proyectos nuevos de la demo');
  });

  test('regresiones: dirección válida con títulos repetidos, portada única y búsqueda sin tildes', async () => {
    const long = 'La startup uruguaya que ayuda a los estudios contables del interior a crece sin contratar más gente';
    const first = await admin.post('/api/admin/articles', { title: long, section: 'startups' });
    const second = await admin.post('/api/admin/articles', { title: long, section: 'startups' });
    assert.notEqual(first.data.article.slug, second.data.article.slug);
    assert.match(second.data.article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'sin guiones dobles');

    const make = async (title) => {
      const { data } = await admin.post('/api/admin/articles', { title, section: 'founders', body: 'Texto.', cover: COVER });
      await admin.post(`/api/admin/articles/${data.article.id}/publish`);
      return data.article.id;
    };
    const x = await make('Primera nota de portada del día');
    const y = await make('Segunda nota de portada del día');
    await admin.put(`/api/admin/articles/${x}/featured`, { featured: true });
    await admin.put(`/api/admin/articles/${y}/featured`, { featured: true });
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM articles WHERE featured = 1').n, 1, 'una sola nota de portada');
    await admin.put(`/api/admin/articles/${y}/featured`, { featured: false });
    assert.equal(ctx.db.get('SELECT COUNT(*) AS n FROM articles WHERE featured = 1').n, 0, 'sacarla no revive la anterior');

    await make('Sofía Méndez y la inversión en salud');
    const plain = await client().get('/api/revista/articles?q=mendez%20y%20la%20inversion');
    assert.equal(plain.data.total, 1, '"mendez" encuentra "Méndez" e "inversion" a "inversión"');
    assert.ok((await admin.get('/api/admin/articles?q=mendez')).data.items.length >= 1);
  });

  test('regresiones: las imágenes de una nota siguen sirviendo aunque quien las subió ya no esté', async () => {
    const other = { email: 'temporal@kefounder.test', password: 'temporal-de-prueba-2026' };
    ctx.db.run(
      "INSERT INTO users (email, password_hash, name, role, segment, onboarded, email_verified, visible, settings, created_at) VALUES (?, ?, 'Temporal', 'admin', 'staff', 0, 1, 0, '{}', ?)",
      [other.email, await hashPassword(other.password), now()]
    );
    const temp = await login(other.email, other.password);
    const upload = await temp.post('/api/uploads', PNG, { 'Content-Type': 'image/png', 'X-File-Name': 'portada.png' });
    const { data } = await admin.post('/api/admin/articles', { title: 'Nota con foto de otra persona', section: 'ecosistema', cover: upload.data.url });
    const id = data.article.id;
    // Deja de ser administración: la nota se sigue editando sin tocar la foto.
    ctx.db.run("UPDATE users SET role = 'user', segment = 'test' WHERE email = ?", [other.email]);
    assert.equal((await admin.put(`/api/admin/articles/${id}`, { title: 'Nota con foto de otra persona (editada)', cover: upload.data.url })).status, 200);
    // Y si se borra esa cuenta, la foto de la revista no se borra.
    const userId = ctx.db.get('SELECT id FROM users WHERE email = ?', [other.email]).id;
    const { deleteUserAccount } = await import('../server/services.js');
    deleteUserAccount(ctx, userId);
    assert.ok(ctx.db.get('SELECT 1 FROM uploads WHERE filename = ?', [upload.data.url.slice(9)]), 'el archivo sigue registrado');
    assert.equal((await fetch(base + upload.data.url)).status, 200);
  });

  test('regresiones: los ejemplos solo se vinculan a proyectos de la demo', async () => {
    const real = ctx.db.run("INSERT INTO users (email, password_hash, name, onboarded, settings, created_at) VALUES ('real-pulso@test.dev', 'x', 'Real', 1, '{}', ?)", [now()]).lastInsertRowid;
    ctx.db.run("INSERT INTO projects (owner_id, name, status, created_at, updated_at) VALUES (?, 'Pulso', 'published', ?, ?)", [real, now(), now()]);
    await seed(ctx.db, { reset: true });
    const linked = ctx.db.get("SELECT p.owner_id FROM articles a JOIN projects p ON p.id = a.project_id WHERE a.slug = 'sofia-mendez-pulso-de-la-guardia-a-la-startup'");
    assert.notEqual(linked.owner_id, real);
  });

  test('regresiones: enlaces internos raros no salen del sitio', () => {
    const href = (text) => parseArticle(text)[0].text.map((p) => p.href || null).filter(Boolean);
    assert.deepEqual(href('[a](/revista/x)'), ['/revista/x']);
    assert.deepEqual(href('[a](/\\evil.com)'), []);
    assert.deepEqual(href('[a](//evil.com)'), []);
    const image = parseArticle('![foto](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3)')[0];
    assert.equal(image.src, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40');
  });

  test('tareas y notas internas también se vinculan a una nota de la revista', async () => {
    const { data } = await admin.post('/api/admin/articles', { title: 'Entrevista pendiente con un founder', section: 'entrevistas' });
    const task = await admin.post('/api/admin/tasks', { title: 'Coordinar la entrevista', targetType: 'article', targetId: data.article.id });
    assert.equal(task.status, 201);
    assert.equal(task.data.task.target.label, 'Nota: Entrevista pendiente con un founder');
    const detail = await admin.get(`/api/admin/articles/${data.article.id}`);
    assert.equal(detail.data.tasks[0].title, 'Coordinar la entrevista');
    const search = await admin.get('/api/admin/search?q=pendiente');
    assert.ok(search.data.articles.some((a) => a.id === data.article.id));
  });
});
