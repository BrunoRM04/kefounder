import { PLANS } from '../../shared/catalog.js';
import { slugify } from '../../shared/revista.js';
import { now } from '../db.js';
import { serializePress } from '../press.js';
import { notify } from '../services.js';
import { badRequest, idParam, notFound, str } from '../utils.js';
import { audit, conditions, oneOfOr, pageResult, paging, requireReason } from './common.js';
import { auditFor, notesFor, tasksFor } from './tracking.js';

// Difusión desde el panel: la cola de pedidos de las startups y su publicación en la Revista e Instagram.

const INSTAGRAM_URL_RE = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._/-]+\/?(\?.*)?$/;
const OPEN = "('pending', 'in_progress')";

export default function pressAdminRoutes(router, ctx) {
  const { db } = ctx;

  const getRequest = (req) => {
    const r = db.get('SELECT * FROM press_requests WHERE id = ?', [idParam(req.params.id)]);
    if (!r) throw notFound('Este pedido de difusión ya no existe.');
    return r;
  };

  const owner = (r) => {
    const u = db.get('SELECT id, name, email, photo, accent, plan, status FROM users WHERE id = ?', [r.user_id]);
    return u ? { id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, plan: u.plan, status: u.status } : null;
  };
  const project = (r) => (r.project_id ? db.get('SELECT id, name, tagline, logo, accent, status, moderation, website FROM projects WHERE id = ?', [r.project_id]) || null : null);

  router.get('/admin/press', (req, res) => {
    const where = conditions();
    const status = oneOfOr(req.query.status, ['open', 'pending', 'in_progress', 'published', 'rejected', 'canceled', 'all'], 'open');
    if (status === 'open') where.add(`r.status IN ${OPEN}`);
    else if (status !== 'all') where.add('r.status = :status', { status });
    const kind = oneOfOr(req.query.kind, ['mencion', 'nota']);
    if (kind) where.add('r.kind = :kind', { kind });
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM press_requests r ${where.sql}`, where.params).n;
    // Abiertos: primero los más viejos (orden de llegada). Cerrados: los más recientes.
    const dir = status === 'open' || status === 'pending' || status === 'in_progress' ? 'ASC' : 'DESC';
    const rows = db.all(`SELECT r.* FROM press_requests r ${where.sql} ORDER BY r.created_at ${dir}, r.id ${dir} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    const counts = Object.fromEntries(db.all('SELECT status, COUNT(*) AS n FROM press_requests GROUP BY status').map((x) => [x.status, x.n]));
    res.json({
      ...pageResult(rows.map((r) => ({ ...serializePress(db, r, { admin: true }), owner: owner(r), project: project(r) })), total, page),
      counts
    });
  });

  router.get('/admin/press/:id', (req, res) => {
    const r = getRequest(req);
    const u = owner(r);
    res.json({
      request: { ...serializePress(db, r, { admin: true }), owner: u, project: project(r), planName: PLANS[r.plan]?.name || r.plan, currentPlan: u?.plan || null },
      notes: notesFor(db, 'press', r.id),
      tasks: tasksFor(db, 'press', r.id),
      audit: auditFor(db, 'press', r.id)
    });
  });

  const reload = (id) => db.get('SELECT * FROM press_requests WHERE id = ?', [id]);
  const projectLabel = (r) => r.project_name || 'tu startup';

  router.put('/admin/press/:id', (req, res) => {
    const r = getRequest(req);
    const body = req.body ?? {};
    const cols = {};
    if ('instagramUrl' in body) {
      const url = str(body.instagramUrl, 300);
      if (url && !INSTAGRAM_URL_RE.test(url)) throw badRequest('Pegá el enlace de la publicación de Instagram (https://www.instagram.com/…).', { field: 'instagramUrl' });
      cols.instagram_url = url;
    }
    if ('articleId' in body) {
      if (!body.articleId) cols.article_id = null;
      else {
        const article = db.get('SELECT id FROM articles WHERE id = ?', [idParam(body.articleId)]);
        if (!article) throw badRequest('Esa nota de la revista no existe.', { field: 'articleId' });
        cols.article_id = article.id;
      }
    }
    const status = body.status ? oneOfOr(body.status, ['pending', 'in_progress', 'published', 'rejected']) : r.status;
    if (!status) throw badRequest('Estado inválido.');
    if (r.status === 'canceled') throw badRequest('La startup canceló este pedido.');
    if (['published', 'rejected', 'canceled'].includes(r.status) && status !== r.status && status !== 'in_progress') {
      throw badRequest('Este pedido ya está cerrado. Pasalo a «En preparación» para volver a trabajarlo.');
    }
    const next = { ...r, ...cols };
    if (status === 'published' && r.status !== 'published') {
      const article = next.article_id ? db.get('SELECT status, published_at FROM articles WHERE id = ?', [next.article_id]) : null;
      const articleLive = article && article.status === 'published' && article.published_at <= now();
      if (next.article_id && !articleLive) throw badRequest('La nota vinculada todavía no está publicada en la revista.');
      if (r.kind === 'nota' && !articleLive) throw badRequest('Una nota propia necesita su nota publicada en la revista.');
      if (!articleLive && !next.instagram_url) throw badRequest('Vinculá la nota de la revista o el enlace de Instagram antes de marcarla como publicada.');
      cols.published_at = now();
    }
    let reason = '';
    if (status === 'rejected' && r.status !== 'rejected') {
      reason = requireReason(body.response, 'Contale a la startup por qué: lo va a ver en su aviso.');
      cols.response = reason;
    } else if ('response' in body && status !== 'rejected') {
      cols.response = str(body.response, 300);
    }
    if (status !== r.status) cols.status = status;
    if (!Object.keys(cols).length) return res.json({ ok: true });
    cols.updated_at = now();
    cols.handled_by = req.user.id;
    const keys = Object.keys(cols);
    db.run(`UPDATE press_requests SET ${keys.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`, { ...cols, id: r.id });

    if (status !== r.status) {
      const fresh = reload(r.id);
      const article = fresh.article_id ? db.get('SELECT slug FROM articles WHERE id = ?', [fresh.article_id]) : null;
      if (status === 'in_progress') notify(ctx, r.user_id, 'press_in_progress', { projectId: r.project_id, data: { project: projectLabel(r), kind: r.kind } });
      if (status === 'published') notify(ctx, r.user_id, 'press_published', { projectId: r.project_id, data: { project: projectLabel(r), kind: r.kind, slug: article?.slug || '', instagramUrl: fresh.instagram_url } });
      if (status === 'rejected') notify(ctx, r.user_id, 'press_rejected', { projectId: r.project_id, data: { project: projectLabel(r), reason } });
    }
    const actions = { in_progress: 'press.take', published: 'press.publish', rejected: 'press.reject', pending: 'press.reopen' };
    audit(ctx, req, status !== r.status ? actions[status] : 'press.update', { type: 'press', id: r.id, summary: `${projectLabel(r)}${reason ? ` — ${reason}` : ''}` });
    res.json({ ok: true });
  });

  // Arma un borrador en la revista con los datos del pedido y lo vincula (queda «En preparación»).
  router.post('/admin/press/:id/draft', (req, res) => {
    const r = getRequest(req);
    if (r.article_id && db.get('SELECT 1 FROM articles WHERE id = ?', [r.article_id])) throw badRequest('Este pedido ya tiene una nota vinculada.');
    const p = project(r);
    const at = now();
    const base = r.kind === 'nota' && p?.tagline ? `${r.project_name}: ${p.tagline}` : `${r.project_name || 'Startup'}, una startup para seguir`;
    const title = base.slice(0, 160);
    let slug = slugify(title) || `difusion-${r.id}`;
    for (let i = 2; db.get('SELECT 1 FROM articles WHERE slug = ?', [slug]); i += 1) slug = `${slugify(title).slice(0, 76).replace(/-+$/, '') || 'difusion'}-${i}`;
    const articleId = db.run(
      `INSERT INTO articles (slug, section, format, title, dek, body, author, person_name, person_role, person_company, project_id, tags, status, promoted, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', 'Redacción KeFounder!', ?, ?, ?, ?, '[]', 'draft', 1, ?, ?, ?)`,
      [slug, r.kind === 'nota' ? 'startups' : 'startups', r.kind === 'nota' ? 'entrevista' : 'perfil', title, (p?.tagline || '').slice(0, 300), r.spokesperson, r.spokesperson_role, r.project_name, r.project_id, req.user.id, at, at]
    ).lastInsertRowid;
    // El pedido queda como nota interna en el borrador, para escribir con todo a mano.
    const brief = [`Pedido de difusión #${r.id} (${r.kind === 'nota' ? 'nota propia' : 'mención'}, plan ${PLANS[r.plan]?.name || r.plan}).`, `Qué quieren contar: ${r.pitch}`,
      `Vocero: ${r.spokesperson}${r.spokesperson_role ? ` (${r.spokesperson_role})` : ''}`, r.instagram && `Instagram: ${r.instagram}`, r.website && `Web: ${r.website}`, r.contact && `Contacto: ${r.contact}`].filter(Boolean).join('\n');
    db.run('INSERT INTO admin_notes (target_type, target_id, admin_id, body, created_at) VALUES (?, ?, ?, ?, ?)', ['article', articleId, req.user.id, brief, at]);
    const wasPending = r.status === 'pending';
    db.run("UPDATE press_requests SET article_id = ?, status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END, handled_by = ?, updated_at = ? WHERE id = ?", [articleId, req.user.id, at, r.id]);
    if (wasPending) notify(ctx, r.user_id, 'press_in_progress', { projectId: r.project_id, data: { project: projectLabel(r), kind: r.kind } });
    audit(ctx, req, 'press.draft', { type: 'press', id: r.id, summary: `${projectLabel(r)}: borrador «${title}»` });
    audit(ctx, req, 'article.create', { type: 'article', id: articleId, summary: `${title} (difusión #${r.id})` });
    res.status(201).json({ articleId });
  });
}
