import { REVISTA_FORMATS, REVISTA_SECTIONS, SLUG_RE, isArticleImage, parseArticle, readingMinutes, sectionLabel, slugify } from '../../shared/revista.js';
import { now, parseJson } from '../db.js';
import { removeSampleArticles } from '../revista.js';
import { badRequest, idParam, notFound, str, strList } from '../utils.js';
import { audit, conditions, dayKeys, likeTerm, oneOfOr, pageResult, paging, requireReason, searchTerm, sorting } from './common.js';
import { auditFor, notesFor, tasksFor } from './tracking.js';

// Revista desde el panel: borradores, programación, publicación, portada y lecturas.

const SECTION_IDS = REVISTA_SECTIONS.map((s) => s.id);
// Direcciones que usa la propia revista (/revista/buscar, /revista/seccion/…).
const RESERVED_SLUGS = ['buscar', 'seccion', 'nueva'];
const FORMAT_IDS = REVISTA_FORMATS.map((f) => f.id);
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBack = (n) => { const d = new Date(); d.setDate(d.getDate() - (n - 1)); return dayKey(d); };

// Estado visible: una nota publicada con fecha futura está "programada".
const stateOf = (a, at = now()) => (a.status !== 'published' ? 'draft' : a.published_at > at ? 'scheduled' : 'published');

export default function revistaAdminRoutes(router, ctx) {
  const { db } = ctx;

  // Imágenes: Unsplash o archivos subidos por administración. Las que ya tenía la nota no se revisan de nuevo
  // (así se puede seguir editando aunque quien la subió ya no sea parte del equipo).
  const image = (value, field, current = '') => {
    const url = str(value, 400);
    if (!url) return '';
    if (current && url === current) return url;
    if (!isArticleImage(url)) throw badRequest('La imagen no es válida. Subila desde el panel o usá una foto de Unsplash.', { field });
    if (url.startsWith('/uploads/') && !db.get("SELECT 1 FROM uploads f JOIN users u ON u.id = f.user_id WHERE f.filename = ? AND u.role = 'admin'", [url.slice(9)])) {
      throw badRequest('No encontramos esa imagen entre los archivos del panel.', { field });
    }
    return url;
  };

  const uniqueSlug = (base, exceptId = 0) => {
    const root = base || 'nota';
    let slug = RESERVED_SLUGS.includes(root) ? `${root}-1` : root;
    const stem = root.slice(0, 76).replace(/-+$/, '');
    for (let i = 2; db.get('SELECT 1 FROM articles WHERE slug = ? AND id != ?', [slug, exceptId]); i += 1) slug = `${stem}-${i}`;
    return slug;
  };

  function columns(body, existing) {
    const cols = {};
    const has = (key) => key in body;
    if (!existing || has('title')) {
      const title = str(body.title, 160);
      if (title.length < 6) throw badRequest('Poné un título de al menos 6 letras.', { field: 'title' });
      cols.title = title;
    }
    if (has('slug') && str(body.slug, 80)) {
      const slug = str(body.slug, 80).toLowerCase();
      if (!SLUG_RE.test(slug)) throw badRequest('La dirección solo puede tener letras minúsculas, números y guiones.', { field: 'slug' });
      if (RESERVED_SLUGS.includes(slug)) throw badRequest('Esa dirección está reservada por la revista. Probá con otra.', { field: 'slug' });
      if (db.get('SELECT 1 FROM articles WHERE slug = ? AND id != ?', [slug, existing?.id || 0])) throw badRequest('Ya hay otra nota con esa dirección.', { field: 'slug' });
      cols.slug = slug;
    } else if (!existing) {
      cols.slug = uniqueSlug(slugify(cols.title));
    }
    if (!existing || has('section')) {
      const section = oneOfOr(body.section, SECTION_IDS);
      if (!section) throw badRequest('Elegí una sección.', { field: 'section' });
      cols.section = section;
    }
    if (has('format')) cols.format = oneOfOr(body.format, FORMAT_IDS, 'perfil');
    if (has('dek')) cols.dek = str(body.dek, 300);
    if (has('body')) {
      if (typeof body.body === 'string' && body.body.length > 60000) throw badRequest('El texto supera el máximo de 60.000 caracteres.', { field: 'body' });
      cols.body = typeof body.body === 'string' ? body.body.replace(/\r\n?/g, '\n').trim() : '';
      cols.reading_minutes = readingMinutes(parseArticle(cols.body));
    }
    if (has('cover')) cols.cover = image(body.cover, 'cover', existing?.cover);
    if (has('coverCredit')) cols.cover_credit = str(body.coverCredit, 120);
    if (has('author')) cols.author = str(body.author, 80) || 'Redacción KeFounder!';
    if (body.person && typeof body.person === 'object') {
      if ('name' in body.person) cols.person_name = str(body.person.name, 80);
      if ('role' in body.person) cols.person_role = str(body.person.role, 80);
      if ('company' in body.person) cols.person_company = str(body.person.company, 80);
      if ('photo' in body.person) cols.person_photo = image(body.person.photo, 'personPhoto', existing?.person_photo);
    }
    if (has('projectId')) {
      if (body.projectId === null || body.projectId === '' || body.projectId === undefined) cols.project_id = null;
      else {
        const id = idParam(body.projectId);
        if (!db.get('SELECT 1 FROM projects WHERE id = ?', [id])) throw badRequest('Ese proyecto no existe.', { field: 'projectId' });
        cols.project_id = id;
      }
    }
    if (has('tags')) cols.tags = JSON.stringify(strList(body.tags, { max: 6, itemMax: 30 }));
    return cols;
  }

  const getArticle = (req) => {
    const article = db.get('SELECT * FROM articles WHERE id = ?', [idParam(req.params.id)]);
    if (!article) throw notFound('Esta nota ya no existe.');
    return article;
  };

  const listRow = (a, at) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    cover: a.cover,
    section: a.section,
    sectionLabel: sectionLabel(a.section),
    format: a.format,
    state: stateOf(a, at),
    featured: Boolean(a.featured),
    sample: Boolean(a.is_sample),
    person: a.person_name || '',
    author: a.author,
    views: a.views,
    views7: a.views7 ?? 0,
    readingMinutes: a.reading_minutes,
    publishedAt: a.published_at,
    updatedAt: a.updated_at
  });

  const detail = (a) => {
    const at = now();
    const days = dayKeys(30);
    const rows = Object.fromEntries(db.all('SELECT day, views FROM article_daily WHERE article_id = ? AND day >= ?', [a.id, days[0]]).map((r) => [r.day, r.views]));
    return {
      article: {
        id: a.id,
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        body: a.body,
        section: a.section,
        format: a.format,
        cover: a.cover,
        coverCredit: a.cover_credit,
        author: a.author,
        person: { name: a.person_name, role: a.person_role, company: a.person_company, photo: a.person_photo },
        projectId: a.project_id,
        project: a.project_id ? db.get('SELECT id, name, status, moderation FROM projects WHERE id = ?', [a.project_id]) || null : null,
        tags: parseJson(a.tags, []),
        state: stateOf(a, at),
        featured: Boolean(a.featured),
        sample: Boolean(a.is_sample),
        readingMinutes: a.reading_minutes,
        views: a.views,
        publishedAt: a.published_at,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      series: days.map((day) => ({ day, value: rows[day] || 0 })),
      notes: notesFor(db, 'article', a.id),
      tasks: tasksFor(db, 'article', a.id),
      audit: auditFor(db, 'article', a.id)
    };
  };

  router.get('/admin/articles', (req, res) => {
    const at = now();
    const where = conditions();
    const state = oneOfOr(req.query.state, ['published', 'scheduled', 'draft']);
    if (state === 'draft') where.add("a.status != 'published'");
    if (state === 'published') where.add("a.status = 'published' AND a.published_at <= :at", { at });
    if (state === 'scheduled') where.add("a.status = 'published' AND a.published_at > :at", { at });
    const section = oneOfOr(req.query.section, SECTION_IDS);
    if (section) where.add('a.section = :section', { section });
    const origin = oneOfOr(req.query.origin, ['own', 'sample']);
    if (origin) where.add(`a.is_sample = ${origin === 'sample' ? 1 : 0}`);
    const q = searchTerm(req.query.q);
    if (q) where.add("(fold(a.title) LIKE fold(:q) ESCAPE '\\' OR fold(a.person_name) LIKE fold(:q) ESCAPE '\\' OR fold(a.person_company) LIKE fold(:q) ESCAPE '\\' OR a.slug LIKE fold(:q) ESCAPE '\\')", { q: likeTerm(q) });
    const order = sorting(req.query, { published: "COALESCE(a.published_at, '')", updated: 'a.updated_at', views: 'a.views', title: 'fold(a.title)' }, 'updated', 'a.id');
    const page = paging(req.query);
    const since7 = daysBack(7);
    const total = db.get(`SELECT COUNT(*) AS n FROM articles a ${where.sql}`, where.params).n;
    const rows = db.all(
      `SELECT a.*, (SELECT COALESCE(SUM(d.views), 0) FROM article_daily d WHERE d.article_id = a.id AND d.day >= :since7) AS views7
       FROM articles a ${where.sql} ORDER BY ${order.sql} LIMIT :limit OFFSET :offset`,
      { ...where.params, since7, limit: page.pageSize, offset: page.offset }
    );
    const counts = db.get(
      `SELECT SUM(status = 'published' AND published_at <= :at) AS published, SUM(status = 'published' AND published_at > :at) AS scheduled,
         SUM(status != 'published') AS draft, SUM(is_sample) AS samples, COUNT(*) AS total FROM articles`, { at }
    );
    const reads = (from) => db.get('SELECT COALESCE(SUM(views), 0) AS n FROM article_daily WHERE day >= ?', [from]).n;
    res.json({
      ...pageResult(rows.map((a) => listRow(a, at)), total, page),
      counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v || 0])),
      reads: { days7: reads(since7), days30: reads(daysBack(30)) }
    });
  });

  router.get('/admin/articles/:id', (req, res) => res.json(detail(getArticle(req))));

  router.post('/admin/articles', (req, res) => {
    const body = req.body ?? {};
    const cols = columns(body, null);
    const at = now();
    const row = {
      format: 'perfil', dek: '', body: '', cover: '', cover_credit: '', author: 'Redacción KeFounder!', tags: '[]', reading_minutes: 1,
      ...cols, status: 'draft', featured: 0, is_sample: 0, created_by: req.user.id, created_at: at, updated_at: at
    };
    const keys = Object.keys(row);
    let id;
    try {
      id = db.run(`INSERT INTO articles (${keys.join(', ')}) VALUES (${keys.map((k) => `:${k}`).join(', ')})`, row).lastInsertRowid;
    } catch (error) {
      // Dos notas creadas a la vez con el mismo título: la segunda pide otra dirección.
      if (/UNIQUE constraint failed: articles\.slug/.test(error.message)) throw badRequest('Ya hay otra nota con esa dirección. Probá de nuevo.', { field: 'slug' });
      throw error;
    }
    audit(ctx, req, 'article.create', { type: 'article', id, summary: row.title });
    res.status(201).json(detail(db.get('SELECT * FROM articles WHERE id = ?', [id])));
  });

  router.put('/admin/articles/:id', (req, res) => {
    const article = getArticle(req);
    const cols = columns(req.body ?? {}, article);
    if (!Object.keys(cols).length) return res.json(detail(article));
    cols.updated_at = now();
    // Una nota publicada no puede quedar sin texto ni portada.
    const next = { ...article, ...cols };
    if (article.status === 'published' && (!next.body || !next.cover)) throw badRequest('Una nota publicada necesita texto y portada. Despublicala primero si querés vaciarla.');
    const keys = Object.keys(cols);
    db.run(`UPDATE articles SET ${keys.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`, { ...cols, id: article.id });
    audit(ctx, req, 'article.update', { type: 'article', id: article.id, summary: next.title, data: { fields: keys.filter((k) => k !== 'updated_at') } });
    res.json(detail(db.get('SELECT * FROM articles WHERE id = ?', [article.id])));
  });

  router.post('/admin/articles/:id/publish', (req, res) => {
    const article = getArticle(req);
    if (!article.body.trim()) throw badRequest('Escribí el texto de la nota antes de publicarla.', { field: 'body' });
    if (!article.cover) throw badRequest('Elegí una foto de portada antes de publicar.', { field: 'cover' });
    let publishedAt = article.published_at && article.published_at <= now() ? article.published_at : now();
    if (req.body?.publishedAt) {
      const t = Date.parse(req.body.publishedAt);
      if (Number.isNaN(t)) throw badRequest('Fecha de publicación inválida.', { field: 'publishedAt' });
      if (t > Date.now() + 366 * 86400000) throw badRequest('La fecha de publicación tiene que ser dentro del próximo año.', { field: 'publishedAt' });
      publishedAt = new Date(t).toISOString();
    }
    db.run("UPDATE articles SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?", [publishedAt, now(), article.id]);
    const scheduled = publishedAt > now();
    audit(ctx, req, scheduled ? 'article.schedule' : 'article.publish', { type: 'article', id: article.id, summary: `${article.title}${scheduled ? ` · ${publishedAt.slice(0, 16).replace('T', ' ')} UTC` : ''}` });
    res.json(detail(db.get('SELECT * FROM articles WHERE id = ?', [article.id])));
  });

  router.post('/admin/articles/:id/unpublish', (req, res) => {
    const article = getArticle(req);
    if (article.status !== 'published') return res.json(detail(article));
    db.run("UPDATE articles SET status = 'draft', featured = 0, updated_at = ? WHERE id = ?", [now(), article.id]);
    audit(ctx, req, 'article.unpublish', { type: 'article', id: article.id, summary: article.title });
    res.json(detail(db.get('SELECT * FROM articles WHERE id = ?', [article.id])));
  });

  router.put('/admin/articles/:id/featured', (req, res) => {
    const article = getArticle(req);
    const featured = Boolean(req.body?.featured);
    if (featured && article.status !== 'published') throw badRequest('Solo una nota publicada puede ir en la portada.');
    // La portada es una sola: elegir una nota saca a la anterior.
    db.tx(() => {
      if (featured) db.run('UPDATE articles SET featured = 0 WHERE featured = 1 AND id != ?', [article.id]);
      db.run('UPDATE articles SET featured = ?, updated_at = ? WHERE id = ?', [featured ? 1 : 0, now(), article.id]);
    });
    audit(ctx, req, featured ? 'article.feature' : 'article.unfeature', { type: 'article', id: article.id, summary: article.title });
    res.json(detail(db.get('SELECT * FROM articles WHERE id = ?', [article.id])));
  });

  router.delete('/admin/articles/samples', (req, res) => {
    const removed = removeSampleArticles(db);
    audit(ctx, req, 'article.samples_delete', { summary: `${removed} ${removed === 1 ? 'nota de ejemplo' : 'notas de ejemplo'}` });
    res.json({ ok: true, removed });
  });

  router.delete('/admin/articles/:id', (req, res) => {
    const article = getArticle(req);
    const reason = requireReason(req.body?.reason);
    db.run('DELETE FROM articles WHERE id = ?', [article.id]);
    db.run("DELETE FROM admin_notes WHERE target_type = 'article' AND target_id = ?", [article.id]);
    audit(ctx, req, 'article.delete', { type: 'article', id: article.id, summary: `${article.title} — ${reason}`, data: { slug: article.slug, views: article.views } });
    res.json({ ok: true });
  });
}
