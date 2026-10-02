import { INDUSTRIES, PROJECT_ROLES, STAGES, labelOf } from '../../shared/catalog.js';
import { now } from '../db.js';
import { parseProject } from '../serializers.js';
import { notify, serializeMessage } from '../services.js';
import { badRequest, forbidden, idParam, notFound, str } from '../utils.js';
import { EXPORT_LIMIT, SEGMENTS, audit, conditions, likeTerm, oneOfOr, pageResult, paging, requireReason, searchTerm, sendCsv, sorting } from './common.js';
import { auditFor, notesFor, tasksFor } from './tracking.js';

// Proyectos (lista, ficha y moderación) y reportes de la comunidad.

const person = (u) => (u ? { id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, status: u.status, segment: u.segment, role: u.role } : null);

function projectFilters(query) {
  const where = conditions();
  const segment = oneOfOr(query.segment, [...SEGMENTS, 'all'], 'real');
  if (segment !== 'all') where.add('u.segment = :segment', { segment });
  const status = oneOfOr(query.status, ['published', 'draft', 'paused']);
  if (status) where.add('p.status = :status', { status });
  const moderation = oneOfOr(query.moderation, ['ok', 'hidden']);
  if (moderation) where.add('p.moderation = :moderation', { moderation });
  const stage = oneOfOr(query.stage, STAGES.map((s) => s.id));
  if (stage) where.add('p.stage = :stage', { stage });
  const industry = oneOfOr(query.industry, INDUSTRIES);
  if (industry) where.add('p.industry = :industry', { industry });
  const q = searchTerm(query.q);
  if (q) {
    const id = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : 0;
    where.add("(p.id = :qid OR p.name LIKE :q ESCAPE '\\' OR p.tagline LIKE :q ESCAPE '\\' OR u.name LIKE :q ESCAPE '\\')", { qid: id, q: likeTerm(q) });
  }
  const order = sorting(query, { created: 'p.created_at', updated: 'p.updated_at', name: 'fold(p.name)' }, 'created', 'p.id');
  return { where, order };
}

const PROJECT_LIST = `SELECT p.id, p.name, p.tagline, p.logo, p.accent, p.stage, p.industry, p.status, p.moderation, p.created_at, p.updated_at, p.published_at,
    u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, u.segment AS owner_segment, u.status AS owner_status,
    (SELECT COUNT(*) FROM views v WHERE v.target_type = 'project' AND v.target_id = p.id) AS views,
    (SELECT COUNT(*) FROM interests i WHERE i.target_type = 'project' AND i.target_id = p.id) AS interests,
    (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'project' AND r.target_id = p.id AND r.status IN ('open', 'reviewing')) AS open_reports
  FROM projects p JOIN users u ON u.id = p.owner_id`;

const projectRow = (p) => ({
  id: p.id,
  name: p.name,
  tagline: p.tagline,
  logo: p.logo,
  accent: p.accent,
  stage: p.stage,
  industry: p.industry,
  status: p.status,
  moderation: p.moderation,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  publishedAt: p.published_at,
  views: p.views,
  interests: p.interests,
  openReports: p.open_reports,
  owner: { id: p.owner_id, name: p.owner_name, email: p.owner_email, segment: p.owner_segment, status: p.owner_status }
});

// Qué se reportó, con lo necesario para decidir sin salir de la pantalla.
function reportTarget(db, r) {
  if (r.target_type === 'person') {
    const u = db.get('SELECT * FROM users WHERE id = ?', [r.target_id]);
    return { type: 'person', exists: Boolean(u), user: person(u), label: u ? u.name : 'Cuenta eliminada' };
  }
  if (r.target_type === 'project') {
    const p = db.get('SELECT * FROM projects WHERE id = ?', [r.target_id]);
    const owner = p ? db.get('SELECT * FROM users WHERE id = ?', [p.owner_id]) : null;
    return {
      type: 'project',
      exists: Boolean(p),
      project: p ? { id: p.id, name: p.name, tagline: p.tagline, logo: p.logo, accent: p.accent, status: p.status, moderation: p.moderation } : null,
      user: person(owner),
      label: p ? p.name : 'Proyecto eliminado'
    };
  }
  const m = db.get('SELECT * FROM matches WHERE id = ?', [r.target_id]);
  // La persona reportada es la otra parte de la conversación de quien reportó.
  const member = m && r.reporter_id && (m.user_a === r.reporter_id || m.user_b === r.reporter_id);
  const otherId = member ? (m.user_a === r.reporter_id ? m.user_b : m.user_a) : null;
  const other = otherId ? db.get('SELECT * FROM users WHERE id = ?', [otherId]) : null;
  return { type: 'match', exists: Boolean(m), matchId: m?.id || null, user: person(other), label: other ? other.name : 'Conversación eliminada' };
}

const reportRow = (db, r) => ({
  id: r.id,
  reason: r.reason,
  details: r.details,
  status: r.status,
  resolution: r.resolution,
  createdAt: r.created_at,
  handledAt: r.handled_at,
  handledBy: r.handler_name || null,
  reporter: r.reporter_id ? person(db.get('SELECT * FROM users WHERE id = ?', [r.reporter_id])) : null,
  target: reportTarget(db, r),
  sameTarget: db.get('SELECT COUNT(*) AS n FROM reports WHERE target_type = ? AND target_id = ?', [r.target_type, r.target_id]).n
});

const REPORT_SELECT = 'SELECT r.*, h.name AS handler_name FROM reports r LEFT JOIN users h ON h.id = r.handled_by';

export default function contentRoutes(router, ctx) {
  const { db, hub } = ctx;

  // ---------- Proyectos ----------
  router.get('/admin/projects', (req, res) => {
    const { where, order } = projectFilters(req.query);
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.owner_id ${where.sql}`, where.params).n;
    const rows = db.all(`${PROJECT_LIST} ${where.sql} ORDER BY ${order.sql} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    const statuses = Object.fromEntries(db.all('SELECT status, COUNT(*) AS n FROM projects GROUP BY status').map((r) => [r.status, r.n]));
    const hidden = db.get("SELECT COUNT(*) AS n FROM projects WHERE moderation = 'hidden'").n;
    res.json({ ...pageResult(rows.map(projectRow), total, page), counts: { ...statuses, hidden } });
  });

  router.get('/admin/projects.csv', (req, res) => {
    const { where, order } = projectFilters(req.query);
    const rows = db.all(`${PROJECT_LIST} ${where.sql} ORDER BY ${order.sql} LIMIT ${EXPORT_LIMIT}`, where.params).map(projectRow);
    sendCsv(res, 'proyectos', [
      { label: 'ID', value: 'id' }, { label: 'Proyecto', value: 'name' }, { label: 'Descripción corta', value: 'tagline' },
      { label: 'Founder', value: (r) => r.owner.name }, { label: 'Email founder', value: (r) => r.owner.email }, { label: 'Segmento', value: (r) => r.owner.segment },
      { label: 'Estado', value: 'status' }, { label: 'Moderación', value: 'moderation' }, { label: 'Etapa', value: (r) => labelOf(STAGES, r.stage) || r.stage },
      { label: 'Industria', value: 'industry' }, { label: 'Visitas', value: 'views' }, { label: 'Interesados', value: 'interests' },
      { label: 'Creado', value: 'createdAt' }, { label: 'Publicado', value: 'publishedAt' }
    ], rows);
  });

  const getProject = (req) => {
    const project = db.get('SELECT * FROM projects WHERE id = ?', [idParam(req.params.id)]);
    if (!project) throw notFound('Este proyecto ya no existe.');
    return project;
  };

  router.get('/admin/projects/:id', (req, res) => {
    const p = parseProject(getProject(req));
    const owner = db.get('SELECT * FROM users WHERE id = ?', [p.owner_id]);
    const count = (sql, params = [p.id]) => db.get(sql, params).n;
    const week = new Date(Date.now() - 7 * 86400000).toISOString();
    res.json({
      project: {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        problem: p.problem,
        solution: p.solution,
        logo: p.logo,
        cover: p.cover,
        accent: p.accent,
        stage: p.stage,
        industry: p.industry,
        location: [p.city, p.country].filter(Boolean).join(', '),
        website: p.website,
        rolesNeeded: p.rolesNeeded.map((r) => labelOf(PROJECT_ROLES, r.role) || r.role),
        stack: p.stack,
        teamSize: 1 + p.team.length,
        status: p.status,
        moderation: p.moderation,
        moderationReason: p.moderation_reason,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        publishedAt: p.published_at
      },
      owner: person(owner),
      stats: {
        views: count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ?"),
        views7: count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ? AND created_at >= ?", [p.id, week]),
        saves: count("SELECT COUNT(*) AS n FROM saves WHERE target_type = 'project' AND target_id = ?"),
        interests: count("SELECT COUNT(*) AS n FROM interests WHERE target_type = 'project' AND target_id = ?"),
        matches: count('SELECT COUNT(*) AS n FROM matches WHERE project_id = ?'),
        reports: count("SELECT COUNT(*) AS n FROM reports WHERE target_type = 'project' AND target_id = ?")
      },
      reports: db.all(`${REPORT_SELECT} WHERE r.target_type = 'project' AND r.target_id = ? ORDER BY r.created_at DESC LIMIT 20`, [p.id])
        .map((r) => ({ id: r.id, reason: r.reason, status: r.status, createdAt: r.created_at })),
      notes: notesFor(db, 'project', p.id),
      tasks: tasksFor(db, 'project', p.id),
      audit: auditFor(db, 'project', p.id)
    });
  });

  const moderate = (req, project, moderation, reason) => {
    db.run('UPDATE projects SET moderation = ?, moderation_reason = ? WHERE id = ?', [moderation, moderation === 'hidden' ? reason : '', project.id]);
    notify(ctx, project.owner_id, moderation === 'hidden' ? 'project_hidden' : 'project_restored', { projectId: project.id, data: { reason } });
    audit(ctx, req, moderation === 'hidden' ? 'project.hide' : 'project.restore', { type: 'project', id: project.id, summary: `${project.name}${reason ? ` — ${reason}` : ''}` });
  };

  router.put('/admin/projects/:id/moderation', (req, res) => {
    const project = getProject(req);
    const moderation = oneOfOr(req.body?.moderation, ['ok', 'hidden']);
    if (!moderation) throw badRequest('Estado de moderación inválido.');
    if (moderation === project.moderation) return res.json({ ok: true });
    const reason = moderation === 'hidden' ? requireReason(req.body?.reason, 'Escribí el motivo: se lo mostramos a quien publicó el proyecto.') : str(req.body?.reason, 300);
    moderate(req, project, moderation, reason);
    res.json({ ok: true });
  });

  // ---------- Reportes ----------
  router.get('/admin/reports', (req, res) => {
    const where = conditions();
    const status = oneOfOr(req.query.status, ['open', 'reviewing', 'resolved', 'dismissed', 'pending', 'all'], 'pending');
    if (status === 'pending') where.add("r.status IN ('open', 'reviewing')");
    else if (status !== 'all') where.add('r.status = :status', { status });
    const type = oneOfOr(req.query.type, ['person', 'project', 'match']);
    if (type) where.add('r.target_type = :type', { type });
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM reports r ${where.sql}`, where.params).n;
    // Pendientes: primero los más viejos (orden de llegada); cerrados: primero los más recientes.
    const dir = status === 'pending' || status === 'open' || status === 'reviewing' ? 'ASC' : 'DESC';
    const rows = db.all(`${REPORT_SELECT} ${where.sql} ORDER BY r.created_at ${dir}, r.id ${dir} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    const counts = Object.fromEntries(db.all('SELECT status, COUNT(*) AS n FROM reports GROUP BY status').map((r) => [r.status, r.n]));
    res.json({ ...pageResult(rows.map((r) => reportRow(db, r)), total, page), counts });
  });

  const getReport = (req) => {
    const report = db.get(`${REPORT_SELECT} WHERE r.id = ?`, [idParam(req.params.id)]);
    if (!report) throw notFound('Este reporte ya no existe.');
    return report;
  };

  router.get('/admin/reports/:id', (req, res) => {
    const r = getReport(req);
    const item = reportRow(db, r);
    // En los reportes de conversación se muestran los últimos mensajes para poder decidir.
    let conversation = null;
    if (r.target_type === 'match' && item.target.exists) {
      const m = db.get('SELECT * FROM matches WHERE id = ?', [r.target_id]);
      const names = Object.fromEntries(db.all('SELECT id, name FROM users WHERE id IN (?, ?)', [m.user_a, m.user_b]).map((u) => [u.id, u.name]));
      conversation = db.all("SELECT * FROM messages WHERE match_id = ? AND kind != 'system' ORDER BY id DESC LIMIT 30", [m.id]).reverse()
        .map((msg) => ({ ...serializeMessage(msg), sender: names[msg.sender_id] || 'Cuenta eliminada', fromReporter: msg.sender_id === r.reporter_id }));
    }
    const related = db.all(`${REPORT_SELECT} WHERE r.target_type = ? AND r.target_id = ? AND r.id != ? ORDER BY r.created_at DESC LIMIT 10`, [r.target_type, r.target_id, r.id])
      .map((x) => ({ id: x.id, reason: x.reason, status: x.status, createdAt: x.created_at }));
    res.json({ report: item, conversation, related, notes: notesFor(db, 'report', r.id), tasks: tasksFor(db, 'report', r.id), audit: auditFor(db, 'report', r.id) });
  });

  router.put('/admin/reports/:id', (req, res) => {
    const report = getReport(req);
    const status = oneOfOr(req.body?.status, ['open', 'reviewing', 'resolved', 'dismissed']);
    if (!status) throw badRequest('Estado inválido.');
    const action = oneOfOr(req.body?.action, ['none', 'suspend', 'hide'], 'none');
    const resolution = str(req.body?.resolution, 600);
    const closing = status === 'resolved' || status === 'dismissed';
    if (closing && resolution.length < 3) throw badRequest('Anotá qué decidiste: queda en el historial del reporte.', { field: 'resolution' });
    const target = reportTarget(db, report);

    db.tx(() => {
      if (status === 'resolved' && action === 'suspend') {
        const u = target.user && db.get('SELECT * FROM users WHERE id = ?', [target.user.id]);
        if (!u) throw badRequest('La cuenta reportada ya no existe.');
        if (u.role === 'admin') throw forbidden('Las cuentas de administración no se suspenden desde el panel.');
        if (u.status !== 'suspended') {
          db.run("UPDATE users SET status = 'suspended', status_reason = ?, status_changed_at = ? WHERE id = ?", [`Reporte #${report.id}: ${resolution}`, now(), u.id]);
          db.run('DELETE FROM sessions WHERE user_id = ?', [u.id]);
          audit(ctx, req, 'user.suspend', { type: 'user', id: u.id, summary: `${u.name} · ${u.email} — Reporte #${report.id}: ${resolution}` });
        }
      }
      if (status === 'resolved' && action === 'hide') {
        const p = target.project && db.get('SELECT * FROM projects WHERE id = ?', [target.project.id]);
        if (!p) throw badRequest('Solo se pueden ocultar proyectos reportados.');
        if (p.moderation !== 'hidden') moderate(req, p, 'hidden', resolution);
      }
      db.run('UPDATE reports SET status = ?, resolution = ?, handled_by = ?, handled_at = ? WHERE id = ?', [status, closing ? resolution : report.resolution, req.user.id, now(), report.id]);
    });
    if (status === 'resolved' && action === 'suspend' && target.user) hub.disconnect(target.user.id);
    if (closing && report.reporter_id && report.status !== status) notify(ctx, report.reporter_id, 'report_reviewed', { data: { reportId: report.id } });
    const labels = { open: 'report.reopen', reviewing: 'report.review', resolved: 'report.resolve', dismissed: 'report.dismiss' };
    audit(ctx, req, labels[status], { type: 'report', id: report.id, summary: `#${report.id} · ${report.reason}${resolution ? ` — ${resolution}` : ''}`, data: { action } });
    res.json({ ok: true });
  });
}

