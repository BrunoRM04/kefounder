import { HELP_CATEGORIES } from '../../shared/catalog.js';
import { now } from '../db.js';
import { categoryLabel, ensureWeeksClosed, rankingPayload, recentPodiums } from '../help.js';
import { notify } from '../services.js';
import { badRequest, idParam, notFound, str } from '../utils.js';
import { audit, conditions, likeTerm, oneOfOr, pageResult, paging, requireReason, searchTerm } from './common.js';
import { auditFor, notesFor, tasksFor } from './tracking.js';

// «Necesito ayuda con…» desde el panel: moderar pedidos y soluciones, mirar el ranking
// y anular un reconocimiento si hubo trampa.

const person = (u) => (u ? { id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, plan: u.plan, status: u.status, segment: u.segment } : null);
const OPEN_REPORTS = "status IN ('open', 'reviewing')";

export default function helpAdminRoutes(router, ctx) {
  const { db } = ctx;

  const getRequest = (id) => {
    const r = db.get('SELECT * FROM help_requests WHERE id = ?', [id]);
    if (!r) throw notFound('Este pedido de ayuda ya no existe.');
    return r;
  };
  const user = (id) => person(db.get('SELECT * FROM users WHERE id = ?', [id]));

  router.get('/admin/help', (req, res) => {
    const where = conditions();
    const status = oneOfOr(req.query.status, ['open', 'solved', 'closed', 'hidden', 'reported', 'all'], 'all');
    if (status === 'hidden') where.add('r.hidden = 1');
    else if (status === 'reported') {
      where.add(`(EXISTS (SELECT 1 FROM reports x WHERE x.target_type = 'help' AND x.target_id = r.id AND x.${OPEN_REPORTS})
        OR EXISTS (SELECT 1 FROM reports x JOIN help_answers a ON a.id = x.target_id WHERE x.target_type = 'help_answer' AND a.request_id = r.id AND x.${OPEN_REPORTS}))`);
    } else if (status !== 'all') where.add('r.status = :status AND r.hidden = 0', { status });
    const category = oneOfOr(req.query.category, HELP_CATEGORIES.map((c) => c.id));
    if (category) where.add('r.category = :category', { category });
    const q = searchTerm(req.query.q);
    if (q) where.add("(r.title LIKE :q ESCAPE '\\' OR r.body LIKE :q ESCAPE '\\' OR u.name LIKE :q ESCAPE '\\' OR u.email LIKE :q ESCAPE '\\')", { q: likeTerm(q) });
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM help_requests r JOIN users u ON u.id = r.user_id ${where.sql}`, where.params).n;
    const rows = db.all(
      `SELECT r.*, u.name AS author_name, u.email AS author_email, u.photo AS author_photo, u.accent AS author_accent, u.status AS author_status,
         (SELECT COUNT(*) FROM help_answers a WHERE a.request_id = r.id) AS answers,
         (SELECT COUNT(*) FROM help_answers a WHERE a.request_id = r.id AND a.hidden = 1) AS hidden_answers,
         (SELECT COUNT(*) FROM reports x WHERE x.target_type = 'help' AND x.target_id = r.id AND x.${OPEN_REPORTS})
           + (SELECT COUNT(*) FROM reports x JOIN help_answers a ON a.id = x.target_id WHERE x.target_type = 'help_answer' AND a.request_id = r.id AND x.${OPEN_REPORTS}) AS open_reports
       FROM help_requests r JOIN users u ON u.id = r.user_id ${where.sql}
       ORDER BY r.last_activity_at DESC, r.id DESC LIMIT :limit OFFSET :offset`,
      { ...where.params, limit: page.pageSize, offset: page.offset }
    );
    const counts = db.get(`SELECT
        SUM(status = 'open' AND hidden = 0) AS open, SUM(status = 'solved' AND hidden = 0) AS solved,
        SUM(status = 'closed' AND hidden = 0) AS closed, SUM(hidden = 1) AS hidden, COUNT(*) AS total
      FROM help_requests`);
    res.json({
      ...pageResult(rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        categoryLabel: categoryLabel(r.category),
        status: r.status,
        hidden: Boolean(r.hidden),
        answers: r.answers,
        hiddenAnswers: r.hidden_answers,
        openReports: r.open_reports,
        sample: Boolean(r.is_sample),
        author: { id: r.user_id, name: r.author_name, email: r.author_email, photo: r.author_photo, accent: r.author_accent, status: r.author_status },
        createdAt: r.created_at,
        lastActivityAt: r.last_activity_at
      })), total, page),
      counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v || 0]))
    });
  });

  router.get('/admin/help/ranking', (req, res) => {
    ensureWeeksClosed(ctx);
    const which = oneOfOr(req.query.week, ['current', 'last'], 'current');
    res.json({ ...rankingPayload(db, null, which), history: recentPodiums(db, 12, { includeRevoked: true }) });
  });

  router.get('/admin/help/:id', (req, res) => {
    const r = getRequest(idParam(req.params.id));
    const answers = db.all(
      `SELECT a.*, (SELECT COUNT(*) FROM help_votes v WHERE v.answer_id = a.id AND v.user_id != a.user_id AND v.removed_at IS NULL) AS votes,
         (SELECT COUNT(*) FROM reports x WHERE x.target_type = 'help_answer' AND x.target_id = a.id AND x.${OPEN_REPORTS}) AS open_reports
       FROM help_answers a WHERE a.request_id = ? ORDER BY (a.id = ?) DESC, a.created_at ASC`,
      [r.id, r.accepted_answer_id ?? 0]
    );
    const reports = db.all(
      `SELECT x.id, x.reason, x.status, x.created_at, x.target_type, x.target_id FROM reports x
       WHERE (x.target_type = 'help' AND x.target_id = ?) OR (x.target_type = 'help_answer' AND x.target_id IN (SELECT id FROM help_answers WHERE request_id = ?))
       ORDER BY x.created_at DESC LIMIT 30`,
      [r.id, r.id]
    ).map((x) => ({ id: x.id, reason: x.reason, status: x.status, createdAt: x.created_at, targetType: x.target_type, targetId: x.target_id }));
    res.json({
      request: {
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.category,
        categoryLabel: categoryLabel(r.category),
        status: r.status,
        hidden: Boolean(r.hidden),
        hiddenReason: r.hidden_reason,
        sample: Boolean(r.is_sample),
        acceptedAnswerId: r.status === 'solved' ? r.accepted_answer_id : null,
        acceptedAt: r.accepted_at,
        author: user(r.user_id),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      answers: answers.map((a) => ({
        id: a.id,
        body: a.body,
        author: user(a.user_id),
        votes: a.votes,
        openReports: a.open_reports,
        accepted: r.status === 'solved' && a.id === r.accepted_answer_id,
        hidden: Boolean(a.hidden),
        hiddenReason: a.hidden_reason,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      })),
      reports,
      notes: notesFor(db, 'help', r.id),
      tasks: tasksFor(db, 'help', r.id),
      audit: auditFor(db, 'help', r.id)
    });
  });

  // Ocultar o volver a mostrar un pedido. Mientras está oculto no suma puntos para nadie.
  router.put('/admin/help/:id', (req, res) => {
    const r = getRequest(idParam(req.params.id));
    const hidden = Boolean(req.body?.hidden);
    if (hidden === Boolean(r.hidden)) return res.json({ ok: true });
    const reason = hidden ? requireReason(req.body?.reason, 'Escribí el motivo: se lo mostramos a quien publicó el pedido.') : str(req.body?.reason, 300);
    db.run('UPDATE help_requests SET hidden = ?, hidden_reason = ?, updated_at = ? WHERE id = ?', [hidden ? 1 : 0, hidden ? reason : '', now(), r.id]);
    if (hidden) notify(ctx, r.user_id, 'help_hidden', { data: { kind: 'request', requestId: r.id, reason } });
    audit(ctx, req, hidden ? 'help.hide' : 'help.restore', { type: 'help', id: r.id, summary: `Necesito ayuda con ${r.title}${reason ? ` — ${reason}` : ''}` });
    res.json({ ok: true });
  });

  router.put('/admin/help/answers/:id', (req, res) => {
    const a = db.get('SELECT * FROM help_answers WHERE id = ?', [idParam(req.params.id)]);
    if (!a) throw notFound('Esta solución ya no existe.');
    const hidden = Boolean(req.body?.hidden);
    if (hidden === Boolean(a.hidden)) return res.json({ ok: true });
    const reason = hidden ? requireReason(req.body?.reason, 'Escribí el motivo: se lo mostramos a quien publicó la solución.') : str(req.body?.reason, 300);
    db.run('UPDATE help_answers SET hidden = ?, hidden_reason = ?, updated_at = ? WHERE id = ?', [hidden ? 1 : 0, hidden ? reason : '', now(), a.id]);
    if (hidden) notify(ctx, a.user_id, 'help_hidden', { data: { kind: 'answer', requestId: a.request_id, reason } });
    const author = db.get('SELECT name FROM users WHERE id = ?', [a.user_id]);
    audit(ctx, req, hidden ? 'help.hide_answer' : 'help.restore_answer', { type: 'help', id: a.request_id, summary: `Solución de ${author?.name || 'cuenta eliminada'}${reason ? ` — ${reason}` : ''}`, data: { answerId: a.id } });
    res.json({ ok: true });
  });

  // Anular (o devolver) un reconocimiento del podio. El puesto no pasa a otra persona.
  router.put('/admin/help/awards/:id', (req, res) => {
    const award = db.get('SELECT * FROM help_awards WHERE id = ?', [idParam(req.params.id)]);
    if (!award) throw notFound('Este reconocimiento ya no existe.');
    const revoked = Boolean(req.body?.revoked);
    if (revoked === Boolean(award.revoked_at)) return res.json({ ok: true });
    const reason = revoked ? requireReason(req.body?.reason) : '';
    if (!revoked && !award.revoked_at) throw badRequest('Este reconocimiento está vigente.');
    db.run('UPDATE help_awards SET revoked_at = ?, revoked_reason = ? WHERE id = ?', [revoked ? now() : null, reason, award.id]);
    const u = db.get('SELECT name FROM users WHERE id = ?', [award.user_id]);
    audit(ctx, req, revoked ? 'help.revoke_award' : 'help.restore_award', { type: 'user', id: award.user_id, summary: `${u?.name || 'Cuenta'} · ${award.place}.º puesto, semana del ${award.week}${reason ? ` — ${reason}` : ''}` });
    res.json({ ok: true });
  });
}
