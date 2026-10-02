import { PLANS, PLAN_ORDER, ROLES, labelOf } from '../../shared/catalog.js';
import { now, parseJson } from '../db.js';
import { enforceProjectLimit } from '../routes/billing.js';
import { completeness, parseUser } from '../serializers.js';
import { deleteUserAccount, notify, pushCounts } from '../services.js';
import { badRequest, forbidden, idParam, notFound, str } from '../utils.js';
import { EXPORT_LIMIT, SEGMENTS, audit, conditions, likeTerm, oneOfOr, pageResult, paging, requireReason, searchTerm, sendCsv, sorting } from './common.js';
import { notesFor, tasksFor, auditFor } from './tracking.js';

const IDENTITY = `json_extract(u.settings, '$.identity.status')`;

// Filtros de la lista de cuentas. Cada valor se valida contra su lista.
function userFilters(query) {
  const where = conditions();
  const segment = oneOfOr(query.segment, [...SEGMENTS, 'all'], 'real');
  if (segment !== 'all') where.add('u.segment = :segment', { segment });
  const plan = oneOfOr(query.plan, PLAN_ORDER);
  if (plan) where.add('u.plan = :plan', { plan });
  const status = oneOfOr(query.status, ['active', 'suspended']);
  if (status) where.add('u.status = :status', { status });
  const onboarding = oneOfOr(query.onboarding, ['done', 'pending']);
  if (onboarding) where.add(`u.onboarded = ${onboarding === 'done' ? 1 : 0}`);
  const identity = oneOfOr(query.identity, ['verified', 'pending', 'rejected', 'none']);
  if (identity === 'verified') where.add('u.identity_verified = 1');
  else if (identity === 'pending' || identity === 'rejected') where.add(`u.identity_verified = 0 AND ${IDENTITY} = :identity`, { identity });
  else if (identity === 'none') where.add(`u.identity_verified = 0 AND ${IDENTITY} IS NULL`);
  const activity = oneOfOr(query.activity, ['7', '30', 'dormant']);
  if (activity === 'dormant') where.add('(u.last_active_at IS NULL OR u.last_active_at < :dormant)', { dormant: new Date(Date.now() - 30 * 86400000).toISOString() });
  else if (activity) where.add('u.last_active_at >= :activeSince', { activeSince: new Date(Date.now() - Number(activity) * 86400000).toISOString() });
  const q = searchTerm(query.q);
  if (q) {
    const id = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : 0;
    where.add("(u.id = :qid OR u.name LIKE :q ESCAPE '\\' OR u.email LIKE :q ESCAPE '\\')", { qid: id, q: likeTerm(q) });
  }
  const order = sorting(query, { created: 'u.created_at', active: "COALESCE(u.last_active_at, '')", name: 'fold(u.name)' }, 'created', 'u.id');
  return { where, order, segment };
}

const identityStatus = (u) => (u.identity_verified ? 'verified' : parseJson(u.settings, {}).identity?.status || 'none');

const listRow = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  photo: u.photo,
  accent: u.accent,
  headline: u.headline,
  location: [u.city, u.country].filter(Boolean).join(', '),
  plan: u.plan,
  segment: u.segment,
  status: u.status,
  role: u.role,
  onboarded: Boolean(u.onboarded),
  emailVerified: Boolean(u.email_verified),
  identity: identityStatus(u),
  projects: u.projects,
  createdAt: u.created_at,
  lastActiveAt: u.last_active_at
});

export default function userRoutes(router, ctx) {
  const { db, hub } = ctx;

  const getUser = (req) => {
    const user = db.get('SELECT * FROM users WHERE id = ?', [idParam(req.params.id)]);
    if (!user) throw notFound('Esta cuenta ya no existe.');
    return user;
  };
  // El equipo interno no se gestiona desde el panel (se usa la consola: npm run admin).
  const manageable = (req, user) => {
    if (user.id === req.user.id) throw forbidden('No podés aplicar esta acción sobre tu propia cuenta.');
    if (user.role === 'admin') throw forbidden('Las cuentas de administración se gestionan desde la consola.');
    return user;
  };
  const LIST_SQL = 'SELECT u.*, (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id) AS projects FROM users u';

  router.get('/admin/users', (req, res) => {
    const { where, order } = userFilters(req.query);
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM users u ${where.sql}`, where.params).n;
    const rows = db.all(`${LIST_SQL} ${where.sql} ORDER BY ${order.sql} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    const segments = Object.fromEntries(db.all('SELECT segment, COUNT(*) AS n FROM users GROUP BY segment').map((r) => [r.segment, r.n]));
    res.json({ ...pageResult(rows.map(listRow), total, page), segments });
  });

  router.get('/admin/users.csv', (req, res) => {
    const { where, order } = userFilters(req.query);
    const rows = db.all(`${LIST_SQL} ${where.sql} ORDER BY ${order.sql} LIMIT ${EXPORT_LIMIT}`, where.params).map(listRow);
    sendCsv(res, 'usuarios', [
      { label: 'ID', value: 'id' }, { label: 'Nombre', value: 'name' }, { label: 'Email', value: 'email' }, { label: 'Ubicación', value: 'location' },
      { label: 'Plan', value: (r) => PLANS[r.plan]?.name || r.plan }, { label: 'Segmento', value: 'segment' }, { label: 'Estado', value: 'status' },
      { label: 'Perfil completo', value: (r) => (r.onboarded ? 'sí' : 'no') }, { label: 'Email verificado', value: (r) => (r.emailVerified ? 'sí' : 'no') },
      { label: 'Identidad', value: 'identity' }, { label: 'Proyectos', value: 'projects' }, { label: 'Alta', value: 'createdAt' }, { label: 'Última actividad', value: 'lastActiveAt' }
    ], rows);
  });

  router.get('/admin/users/:id', (req, res) => {
    const row = getUser(req);
    const u = parseUser(row);
    const id = u.id;
    const count = (sql, params = [id]) => db.get(sql, params).n;
    const identity = u.settings.identity || null;
    res.json({
      user: {
        id,
        name: u.name,
        email: u.email,
        photo: u.photo,
        accent: u.accent,
        headline: u.headline,
        bio: u.bio,
        location: [u.city, u.country].filter(Boolean).join(', '),
        roles: u.roles.map((r) => labelOf(ROLES, r) || r),
        skills: u.skills,
        links: { linkedin: u.linkedin, github: u.github, portfolio: u.portfolio },
        plan: u.plan,
        planPeriod: u.plan_period,
        planRenewsAt: u.plan_renews_at,
        segment: u.segment,
        status: u.status,
        statusReason: u.status_reason,
        statusChangedAt: u.status_changed_at,
        role: u.role,
        onboarded: Boolean(u.onboarded),
        visible: Boolean(u.visible),
        emailVerified: Boolean(u.email_verified),
        identity: {
          status: u.identity_verified ? 'verified' : identity?.status || 'none',
          document: identity?.document || '',
          submittedAt: identity?.submittedAt || null,
          reviewedAt: identity?.reviewedAt || null,
          reason: identity?.reason || ''
        },
        completeness: completeness(u).percent,
        createdAt: u.created_at,
        lastActiveAt: u.last_active_at,
        online: hub.isOnline(id)
      },
      stats: {
        interestsSent: count('SELECT COUNT(*) AS n FROM interests WHERE from_user_id = ?'),
        interestsReceived: count('SELECT COUNT(*) AS n FROM interests WHERE to_user_id = ?'),
        matches: count('SELECT COUNT(*) AS n FROM matches WHERE user_a = ? OR user_b = ?', [id, id]),
        messages: count("SELECT COUNT(*) AS n FROM messages WHERE sender_id = ? AND kind != 'system'"),
        saves: count('SELECT COUNT(*) AS n FROM saves WHERE user_id = ?'),
        views: count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'person' AND target_id = ?"),
        blockedBy: count('SELECT COUNT(*) AS n FROM blocks WHERE blocked_id = ?'),
        reportsAgainst: count("SELECT COUNT(*) AS n FROM reports WHERE (target_type = 'person' AND target_id = ?) OR (target_type = 'project' AND target_id IN (SELECT id FROM projects WHERE owner_id = ?))", [id, id]),
        reportsMade: count('SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ?'),
        sessions: count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?', [id, now()])
      },
      projects: db.all('SELECT id, name, tagline, logo, accent, status, moderation, stage, created_at FROM projects WHERE owner_id = ? ORDER BY created_at DESC', [id])
        .map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, logo: p.logo, accent: p.accent, status: p.status, moderation: p.moderation, stage: p.stage, createdAt: p.created_at })),
      subscriptions: db.all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 20', [id])
        .map((s) => ({ id: s.id, plan: s.plan, period: s.period, amount: s.amount, status: s.status, createdAt: s.created_at, endedAt: s.ended_at })),
      reports: db.all(
        `SELECT r.*, x.name AS reporter_name FROM reports r LEFT JOIN users x ON x.id = r.reporter_id
         WHERE (r.target_type = 'person' AND r.target_id = ?) OR (r.target_type = 'project' AND r.target_id IN (SELECT id FROM projects WHERE owner_id = ?))
         ORDER BY r.created_at DESC LIMIT 20`, [id, id]
      ).map((r) => ({ id: r.id, reason: r.reason, status: r.status, targetType: r.target_type, createdAt: r.created_at, reporter: r.reporter_name })),
      notes: notesFor(db, 'user', id),
      tasks: tasksFor(db, 'user', id),
      audit: auditFor(db, 'user', id)
    });
  });

  router.put('/admin/users/:id/status', (req, res) => {
    const user = manageable(req, getUser(req));
    const status = oneOfOr(req.body?.status, ['active', 'suspended']);
    if (!status) throw badRequest('Estado inválido.');
    if (status === user.status) return res.json({ ok: true });
    const reason = status === 'suspended' ? requireReason(req.body?.reason) : str(req.body?.reason, 300);
    db.tx(() => {
      db.run('UPDATE users SET status = ?, status_reason = ?, status_changed_at = ? WHERE id = ?', [status, reason, now(), user.id]);
      if (status === 'suspended') db.run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
    });
    if (status === 'suspended') hub.disconnect(user.id);
    audit(ctx, req, status === 'suspended' ? 'user.suspend' : 'user.reactivate', { type: 'user', id: user.id, summary: `${user.name} · ${user.email}${reason ? ` — ${reason}` : ''}` });
    res.json({ ok: true });
  });

  router.put('/admin/users/:id/plan', (req, res) => {
    const user = manageable(req, getUser(req));
    const plan = oneOfOr(req.body?.plan, PLAN_ORDER);
    if (!plan) throw badRequest('Elegí un plan válido.');
    if (plan === user.plan) throw badRequest('La cuenta ya tiene ese plan.');
    const reason = requireReason(req.body?.reason);
    db.tx(() => {
      db.run("UPDATE subscriptions SET status = ?, ended_at = ? WHERE user_id = ? AND status = 'active'", [plan === 'free' ? 'canceled' : 'replaced', now(), user.id]);
      // Plan de cortesía: sin cobro y sin vencimiento, hasta que se cambie de nuevo.
      if (plan !== 'free') db.run("INSERT INTO subscriptions (user_id, plan, period, amount, status, created_at) VALUES (?, ?, 'courtesy', 0, 'active', ?)", [user.id, plan, now()]);
      db.run('UPDATE users SET plan = ?, plan_period = ?, plan_renews_at = NULL WHERE id = ?', [plan, plan === 'free' ? null : 'courtesy', user.id]);
      enforceProjectLimit(db, user.id, plan);
    });
    if (plan !== 'free') notify(ctx, user.id, 'plan', { data: { planName: PLANS[plan].name } });
    audit(ctx, req, 'user.plan', { type: 'user', id: user.id, summary: `${user.name}: ${PLANS[user.plan]?.name || user.plan} → ${PLANS[plan].name} — ${reason}`, data: { from: user.plan, to: plan } });
    res.json({ ok: true });
  });

  router.put('/admin/users/:id/segment', (req, res) => {
    const user = manageable(req, getUser(req));
    const segment = oneOfOr(req.body?.segment, ['real', 'demo', 'bot', 'test']);
    if (!segment) throw badRequest('Segmento inválido.');
    if (segment === user.segment) return res.json({ ok: true });
    db.run('UPDATE users SET segment = ? WHERE id = ?', [segment, user.id]);
    audit(ctx, req, 'user.segment', { type: 'user', id: user.id, summary: `${user.name}: ${user.segment} → ${segment}`, data: { from: user.segment, to: segment } });
    res.json({ ok: true });
  });

  router.post('/admin/users/:id/identity', (req, res) => {
    const user = manageable(req, getUser(req));
    const decision = oneOfOr(req.body?.decision, ['approve', 'reject']);
    if (!decision) throw badRequest('Decisión inválida.');
    const { settings } = parseUser(user);
    if (!settings.identity?.document) throw badRequest('Esta cuenta no envió un documento.');
    const reason = decision === 'reject' ? requireReason(req.body?.reason, 'Contale a la persona por qué: lo va a ver en la notificación.') : '';
    settings.identity = { ...settings.identity, status: decision === 'approve' ? 'approved' : 'rejected', reason, reviewedAt: now(), reviewedBy: req.user.id };
    db.run('UPDATE users SET identity_verified = ?, settings = ? WHERE id = ?', [decision === 'approve' ? 1 : 0, JSON.stringify(settings), user.id]);
    notify(ctx, user.id, decision === 'approve' ? 'identity_approved' : 'identity_rejected', { data: { reason } });
    audit(ctx, req, decision === 'approve' ? 'identity.approve' : 'identity.reject', { type: 'user', id: user.id, summary: `${user.name}${reason ? ` — ${reason}` : ''}` });
    res.json({ ok: true });
  });

  router.post('/admin/users/:id/verify-email', (req, res) => {
    const user = manageable(req, getUser(req));
    if (user.email_verified) return res.json({ ok: true });
    const { emailVerification, ...settings } = parseUser(user).settings;
    db.run('UPDATE users SET email_verified = 1, settings = ? WHERE id = ?', [JSON.stringify(settings), user.id]);
    audit(ctx, req, 'user.verify_email', { type: 'user', id: user.id, summary: `${user.name} · ${user.email}` });
    res.json({ ok: true });
  });

  router.post('/admin/users/:id/logout', (req, res) => {
    const user = manageable(req, getUser(req));
    const { changes } = db.run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
    hub.disconnect(user.id);
    audit(ctx, req, 'user.logout', { type: 'user', id: user.id, summary: `${user.name}: ${changes} ${changes === 1 ? 'sesión cerrada' : 'sesiones cerradas'}` });
    res.json({ ok: true, closed: changes });
  });

  router.delete('/admin/users/:id', (req, res) => {
    const user = manageable(req, getUser(req));
    if (str(req.body?.confirm, 160).toLowerCase() !== user.email.toLowerCase()) throw badRequest('Escribí el email de la cuenta para confirmar.', { field: 'confirm' });
    const reason = requireReason(req.body?.reason);
    const others = db.all('SELECT DISTINCT CASE WHEN user_a = ? THEN user_b ELSE user_a END AS other FROM matches WHERE user_a = ? OR user_b = ?', [user.id, user.id, user.id]);
    deleteUserAccount(ctx, user.id);
    for (const { other } of others) pushCounts(ctx, other);
    audit(ctx, req, 'user.delete', { type: 'user', id: user.id, summary: `${user.name} · ${user.email} — ${reason}`, data: { plan: user.plan, segment: user.segment, createdAt: user.created_at } });
    res.json({ ok: true });
  });

  // Cola de verificación de identidad.
  router.get('/admin/identity', (req, res) => {
    const status = oneOfOr(req.query.status, ['pending', 'approved', 'rejected'], 'pending');
    const page = paging(req.query);
    const where = status === 'approved' ? `${IDENTITY} = 'approved'` : `u.identity_verified = 0 AND ${IDENTITY} = :status`;
    const params = status === 'approved' ? {} : { status };
    const total = db.get(`SELECT COUNT(*) AS n FROM users u WHERE ${where}`, params).n;
    const order = status === 'pending' ? 'ASC' : 'DESC';
    const rows = db.all(
      `SELECT u.* FROM users u WHERE ${where}
       ORDER BY json_extract(u.settings, '$.identity.submittedAt') ${order}, u.id ${order} LIMIT :limit OFFSET :offset`,
      { ...params, limit: page.pageSize, offset: page.offset }
    );
    res.json(pageResult(rows.map((row) => {
      const u = parseUser(row);
      const identity = u.settings.identity || {};
      return {
        user: { id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, headline: u.headline, location: [u.city, u.country].filter(Boolean).join(', '), segment: u.segment, createdAt: u.created_at },
        document: identity.document || '',
        submittedAt: identity.submittedAt || null,
        reviewedAt: identity.reviewedAt || null,
        reason: identity.reason || '',
        status: u.identity_verified ? 'approved' : identity.status
      };
    }), total, page));
  });
}

