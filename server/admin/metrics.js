import { INDUSTRIES, PLANS, PLAN_ORDER, ROLES, STAGES, GOALS, labelOf } from '../../shared/catalog.js';
import { conditions, dayKeys, todayKey, localMidnight, metricScope, oneOfOr, pageResult, paging, pctChange, rangeOf, sendCsv, sorting, EXPORT_LIMIT, likeTerm, searchTerm } from './common.js';

// Qué cuentas entran en una métrica. El equipo interno nunca cuenta.
// "Todo" suma la demo (demo + bots); el equipo interno y las cuentas de prueba nunca cuentan.
const seg = (scope) => (alias) => (scope === 'all' ? `${alias}.segment IN ('real', 'demo', 'bot')` : `${alias}.segment = 'real'`);

// Cada métrica es una consulta agrupada por día local sobre columnas indexadas por fecha.
export const METRICS = {
  signups: {
    label: 'Registros',
    hint: 'Cuentas nuevas por día.',
    sql: (s) => `SELECT date(u.created_at, 'localtime') AS day, COUNT(*) AS value FROM users u
      WHERE u.created_at >= :since AND u.created_at < :until AND ${s('u')} GROUP BY day`
  },
  active: {
    label: 'Usuarios con actividad',
    hint: 'Personas que vieron, guardaron, conectaron o escribieron ese día.',
    distinct: true,
    sql: (s) => `SELECT e.day, COUNT(DISTINCT e.uid) AS value FROM (${ACTIVITY}) e JOIN users u ON u.id = e.uid
      WHERE ${s('u')} GROUP BY e.day`
  },
  connections: {
    label: 'Conexiones',
    hint: 'Solicitudes de conexión enviadas.',
    sql: (s) => `SELECT date(x.created_at, 'localtime') AS day, COUNT(*) AS value FROM interests x JOIN users u ON u.id = x.from_user_id
      WHERE x.created_at >= :since AND x.created_at < :until AND ${s('u')} GROUP BY day`
  },
  matches: {
    label: 'Matches',
    hint: 'Conexiones aceptadas por ambas partes.',
    sql: (s) => `SELECT date(x.created_at, 'localtime') AS day, COUNT(*) AS value FROM matches x
      JOIN users a ON a.id = x.user_a JOIN users b ON b.id = x.user_b
      WHERE x.created_at >= :since AND x.created_at < :until AND x.origin = 'match' AND (${s('a')} OR ${s('b')}) GROUP BY day`
  },
  messages: {
    label: 'Mensajes',
    hint: 'Mensajes enviados en conversaciones.',
    sql: (s) => `SELECT date(x.created_at, 'localtime') AS day, COUNT(*) AS value FROM messages x JOIN users u ON u.id = x.sender_id
      WHERE x.created_at >= :since AND x.created_at < :until AND x.kind != 'system' AND ${s('u')} GROUP BY day`
  },
  projects: {
    label: 'Proyectos publicados',
    hint: 'Proyectos que se publicaron por primera vez.',
    sql: (s) => `SELECT date(x.published_at, 'localtime') AS day, COUNT(*) AS value FROM projects x JOIN users u ON u.id = x.owner_id
      WHERE x.published_at >= :since AND x.published_at < :until AND ${s('u')} GROUP BY day`
  },
  revenue: {
    label: 'Ventas',
    hint: 'Cobros de planes (US$).',
    money: true,
    sql: (s) => `SELECT date(x.created_at, 'localtime') AS day, ROUND(SUM(x.amount), 2) AS value FROM subscriptions x JOIN users u ON u.id = x.user_id
      WHERE x.created_at >= :since AND x.created_at < :until AND x.amount > 0 AND ${s('u')} GROUP BY day`
  }
};
export const METRIC_IDS = Object.keys(METRICS);

// Eventos que cuentan como actividad (quién y cuándo).
const ACTIVITY = `
  SELECT date(created_at, 'localtime') AS day, viewer_id AS uid FROM views WHERE created_at >= :since AND created_at < :until
  UNION ALL SELECT date(created_at, 'localtime'), from_user_id FROM interests WHERE created_at >= :since AND created_at < :until
  UNION ALL SELECT date(created_at, 'localtime'), sender_id FROM messages WHERE created_at >= :since AND created_at < :until AND sender_id IS NOT NULL
  UNION ALL SELECT date(created_at, 'localtime'), user_id FROM saves WHERE created_at >= :since AND created_at < :until
  UNION ALL SELECT date(created_at, 'localtime'), user_id FROM passes WHERE created_at >= :since AND created_at < :until`;

const FAR_FUTURE = '9999-12-31T00:00:00.000Z';

function series(db, metric, days, scope) {
  const rows = db.all(METRICS[metric].sql(seg(scope)), { since: localMidnight(days - 1), until: FAR_FUTURE });
  const byDay = new Map(rows.map((r) => [r.day, r.value]));
  return dayKeys(days).map((day) => ({ day, value: byDay.get(day) || 0 }));
}

function distinctActive(db, scope, since, until) {
  return db.get(`SELECT COUNT(DISTINCT e.uid) AS n FROM (${ACTIVITY}) e JOIN users u ON u.id = e.uid WHERE ${seg(scope)('u')}`, { since, until }).n;
}

function periodTotal(db, metric, scope, since, until) {
  if (METRICS[metric].distinct) return distinctActive(db, scope, since, until);
  const rows = db.all(METRICS[metric].sql(seg(scope)), { since, until });
  return Math.round(rows.reduce((sum, r) => sum + r.value, 0) * 100) / 100;
}

export function metricPayload(db, metric, days, scope) {
  const since = localMidnight(days - 1);
  const prevSince = localMidnight(days * 2 - 1);
  const total = periodTotal(db, metric, scope, since, FAR_FUTURE);
  const previous = periodTotal(db, metric, scope, prevSince, since);
  const { label, hint, money = false } = METRICS[metric];
  return { metric, label, hint, money, range: days, scope, series: series(db, metric, days, scope), total, previous, delta: pctChange(total, previous) };
}

// Embudo de activación de las cuentas creadas en el período.
export function funnel(db, scope, days) {
  const s = seg(scope)('u');
  const row = db.get(
    `SELECT COUNT(*) AS registered,
       SUM(u.onboarded) AS onboarded,
       SUM(EXISTS (SELECT 1 FROM interests i WHERE i.from_user_id = u.id)) AS connected,
       SUM(EXISTS (SELECT 1 FROM matches m WHERE m.user_a = u.id AND m.origin = 'match') OR EXISTS (SELECT 1 FROM matches m WHERE m.user_b = u.id AND m.origin = 'match')) AS matched,
       SUM(EXISTS (SELECT 1 FROM messages x WHERE x.sender_id = u.id AND x.kind != 'system')) AS messaged
     FROM users u WHERE u.created_at >= :since AND ${s}`,
    { since: localMidnight(days - 1) }
  );
  const base = row.registered || 0;
  return [
    ['registered', 'Se registraron'],
    ['onboarded', 'Completaron el perfil'],
    ['connected', 'Enviaron una conexión'],
    ['matched', 'Tuvieron un match'],
    ['messaged', 'Escribieron un mensaje']
  ].map(([key, label]) => ({ key, label, value: row[key] || 0, percent: base ? Math.round(((row[key] || 0) / base) * 100) : 0 }));
}

// Ingresos recurrentes: la suscripción activa más reciente de cada cuenta, llevada a valor mensual.
function activeSubscriptions(db, scope) {
  return db.all(
    `SELECT s.*, u.name, u.email FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'active' AND u.plan = s.plan AND ${seg(scope)('u')}
       AND s.id = (SELECT MAX(id) FROM subscriptions z WHERE z.user_id = s.user_id AND z.status = 'active')`
  );
}
const monthly = (s) => (s.period === 'yearly' ? s.amount / 12 : s.period === 'monthly' ? s.amount : 0);
const round2 = (n) => Math.round(n * 100) / 100;

export function revenueSummary(db, scope) {
  const subs = activeSubscriptions(db, scope);
  const paying = subs.filter((s) => monthly(s) > 0);
  const mrr = round2(paying.reduce((sum, s) => sum + monthly(s), 0));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const since = monthStart.toISOString();
  const s = seg(scope)('u');
  const newThisMonth = db.get(`SELECT COUNT(*) AS n FROM subscriptions x JOIN users u ON u.id = x.user_id WHERE x.created_at >= ? AND x.amount > 0 AND ${s}`, [since]).n;
  const canceledThisMonth = db.get(`SELECT COUNT(*) AS n FROM subscriptions x JOIN users u ON u.id = x.user_id WHERE x.status = 'canceled' AND x.ended_at >= ? AND x.amount > 0 AND ${s}`, [since]).n;
  const byPlan = PLAN_ORDER.filter((id) => id !== 'free').map((id) => {
    const list = paying.filter((x) => x.plan === id);
    const value = round2(list.reduce((sum, x) => sum + monthly(x), 0));
    return { plan: id, label: PLANS[id].name, subscribers: list.length, courtesy: subs.filter((x) => x.plan === id && monthly(x) === 0).length, mrr: value, share: mrr ? Math.round((value / mrr) * 100) : 0 };
  });
  return {
    mrr,
    arr: round2(mrr * 12),
    paying: paying.length,
    courtesy: subs.length - paying.length,
    arpu: paying.length ? round2(mrr / paying.length) : 0,
    newThisMonth,
    canceledThisMonth,
    byPlan
  };
}

const top = (rows, labeler, limit = 6) => rows
  .filter((r) => r.key)
  .map((r) => ({ label: labeler(r.key) || r.key, value: r.n }))
  .sort((a, b) => b.value - a.value)
  .slice(0, limit);

// Proyectos que más conexiones recibieron en el período.
export function topProjects(db, scope, days) {
  return db.all(
    `SELECT p.id, p.name, COUNT(*) AS n FROM interests i
     JOIN projects p ON p.id = i.target_id JOIN users u ON u.id = p.owner_id
     WHERE i.target_type = 'project' AND i.created_at >= :since AND ${seg(scope)('u')}
     GROUP BY p.id ORDER BY n DESC, p.name ASC LIMIT 6`,
    { since: localMidnight(days - 1) }
  ).map((r) => ({ id: r.id, label: r.name, value: r.n }));
}

export function breakdowns(db, scope) {
  const s = seg(scope)('u');
  const onboarded = `u.onboarded = 1 AND ${s}`;
  return {
    roles: top(db.all(`SELECT json_extract(u.roles, '$[0]') AS key, COUNT(*) AS n FROM users u WHERE ${onboarded} GROUP BY key`), (k) => labelOf(ROLES, k)),
    goals: top(db.all(`SELECT u.goal AS key, COUNT(*) AS n FROM users u WHERE ${onboarded} GROUP BY key`), (k) => labelOf(GOALS, k)),
    countries: top(db.all(`SELECT u.country AS key, COUNT(*) AS n FROM users u WHERE ${onboarded} GROUP BY key`), (k) => k),
    stages: top(db.all(`SELECT p.stage AS key, COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.status = 'published' AND ${s} GROUP BY key`), (k) => labelOf(STAGES, k)),
    industries: top(db.all(`SELECT p.industry AS key, COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.status = 'published' AND ${s} GROUP BY key`), (k) => (INDUSTRIES.includes(k) ? k : k))
  };
}


export function badges(db) {
  return {
    reports: db.get("SELECT COUNT(*) AS n FROM reports WHERE status IN ('open', 'reviewing')").n,
    identity: db.get("SELECT COUNT(*) AS n FROM users WHERE json_extract(settings, '$.identity.status') = 'pending' AND identity_verified = 0").n,
    tasks: db.get("SELECT COUNT(*) AS n FROM admin_tasks WHERE status != 'done' AND due_at IS NOT NULL AND due_at <= ?", [todayKey()]).n
  };
}

const mini = (u) => ({ id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, plan: u.plan, segment: u.segment, status: u.status, createdAt: u.created_at, lastActiveAt: u.last_active_at, onboarded: Boolean(u.onboarded) });

export function overview(db, scope) {
  const s = seg(scope)('u');
  const week = localMidnight(6);
  const prevWeek = localMidnight(13);
  const users = db.get(`SELECT COUNT(*) AS n, SUM(u.onboarded) AS onboarded FROM users u WHERE ${s}`);
  const newWeek = db.get(`SELECT COUNT(*) AS n FROM users u WHERE u.created_at >= ? AND ${s}`, [week]).n;
  const newPrev = db.get(`SELECT COUNT(*) AS n FROM users u WHERE u.created_at >= ? AND u.created_at < ? AND ${s}`, [prevWeek, week]).n;
  const active = distinctActive(db, scope, week, FAR_FUTURE);
  const activePrev = distinctActive(db, scope, prevWeek, week);
  const matches = periodTotal(db, 'matches', scope, week, FAR_FUTURE);
  const matchesPrev = periodTotal(db, 'matches', scope, prevWeek, week);
  const revenue = revenueSummary(db, scope);
  const plans = db.all(`SELECT u.plan AS plan, COUNT(*) AS n FROM users u WHERE u.role = 'user' AND ${s} GROUP BY u.plan`);
  const today = todayKey();

  return {
    scope,
    kpis: {
      users: { value: users.n, newWeek, delta: pctChange(newWeek, newPrev) },
      active: { value: active, delta: pctChange(active, activePrev) },
      matches: { value: matches, delta: pctChange(matches, matchesPrev) },
      mrr: { value: revenue.mrr, paying: revenue.paying },
      onboarding: { value: users.n ? Math.round(((users.onboarded || 0) / users.n) * 100) : 0, done: users.onboarded || 0, total: users.n }
    },
    plans: PLAN_ORDER.map((id) => ({ plan: id, label: PLANS[id].name, value: plans.find((p) => p.plan === id)?.n || 0 })),
    funnel: funnel(db, scope, 30),
    queue: {
      counts: badges(db),
      reports: db.all("SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at, r.status FROM reports r WHERE r.status IN ('open', 'reviewing') ORDER BY r.created_at ASC LIMIT 4")
        .map((r) => ({ id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason, createdAt: r.created_at, status: r.status })),
      identity: db.all("SELECT id, name, email, photo, accent, json_extract(settings, '$.identity.submittedAt') AS submitted FROM users WHERE json_extract(settings, '$.identity.status') = 'pending' AND identity_verified = 0 ORDER BY submitted ASC LIMIT 4")
        .map((u) => ({ id: u.id, name: u.name, email: u.email, photo: u.photo, accent: u.accent, submittedAt: u.submitted })),
      tasks: db.all("SELECT id, title, priority, due_at, status FROM admin_tasks WHERE status != 'done' ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END LIMIT 5")
        .map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueAt: t.due_at, status: t.status, overdue: Boolean(t.due_at && t.due_at < today), today: t.due_at === today }))
    },
    recentUsers: db.all(`SELECT u.* FROM users u WHERE u.role = 'user' AND ${s} ORDER BY u.created_at DESC, u.id DESC LIMIT 6`).map(mini)
  };
}

export default function metricRoutes(router, ctx) {
  const { db } = ctx;
  const cache = ctx.adminCache;

  router.get('/admin/badges', (_req, res) => res.json(badges(db)));

  router.get('/admin/overview', (req, res) => {
    const scope = metricScope(req.query.scope);
    res.json(cache.get(`overview:${scope}`, () => overview(db, scope)));
  });

  router.get('/admin/metrics', (req, res) => {
    const scope = metricScope(req.query.scope);
    const metric = oneOfOr(req.query.metric, METRIC_IDS, 'signups');
    const days = rangeOf(req.query.range);
    res.json(cache.get(`metric:${metric}:${days}:${scope}`, () => metricPayload(db, metric, days, scope)));
  });

  // Todas las métricas de un período de una vez: tarjetas del tablero de métricas.
  router.get('/admin/metrics/summary', (req, res) => {
    const scope = metricScope(req.query.scope);
    const days = rangeOf(req.query.range);
    res.json(cache.get(`summary:${days}:${scope}`, () => {
      const since = localMidnight(days - 1);
      const prevSince = localMidnight(days * 2 - 1);
      return {
        range: days,
        scope,
        metrics: METRIC_IDS.map((id) => {
          const total = periodTotal(db, id, scope, since, FAR_FUTURE);
          const previous = periodTotal(db, id, scope, prevSince, since);
          return { metric: id, label: METRICS[id].label, money: Boolean(METRICS[id].money), total, previous, delta: pctChange(total, previous) };
        }),
        funnel: funnel(db, scope, days),
        breakdowns: breakdowns(db, scope),
        topProjects: topProjects(db, scope, days)
      };
    }));
  });

  router.get('/admin/revenue', (req, res) => {
    const scope = metricScope(req.query.scope);
    res.json(cache.get(`revenue:${scope}`, () => revenueSummary(db, scope)));
  });

  const subscriptionQuery = (query) => {
    const where = conditions();
    const scope = metricScope(query.scope);
    where.add(seg(scope)('u'));
    const plan = oneOfOr(query.plan, PLAN_ORDER.filter((p) => p !== 'free'));
    if (plan) where.add('s.plan = :plan', { plan });
    const status = oneOfOr(query.status, ['active', 'replaced', 'canceled']);
    if (status) where.add('s.status = :status', { status });
    const period = oneOfOr(query.period, ['monthly', 'yearly', 'courtesy']);
    if (period) where.add('s.period = :period', { period });
    const q = searchTerm(query.q);
    if (q) where.add("(u.name LIKE :q ESCAPE '\\' OR u.email LIKE :q ESCAPE '\\')", { q: likeTerm(q) });
    const order = sorting(query, { created: 's.created_at', amount: 's.amount' }, 'created', 's.id');
    return { where, order };
  };
  const subscriptionRow = (s) => ({ id: s.id, plan: s.plan, period: s.period, amount: s.amount, status: s.status, createdAt: s.created_at, endedAt: s.ended_at, user: { id: s.user_id, name: s.name, email: s.email, segment: s.segment } });
  const SUBS_FROM = 'FROM subscriptions s JOIN users u ON u.id = s.user_id';

  router.get('/admin/subscriptions', (req, res) => {
    const { where, order } = subscriptionQuery(req.query);
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n ${SUBS_FROM} ${where.sql}`, where.params).n;
    const rows = db.all(`SELECT s.*, u.name, u.email, u.segment ${SUBS_FROM} ${where.sql} ORDER BY ${order.sql} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    res.json(pageResult(rows.map(subscriptionRow), total, page));
  });

  router.get('/admin/subscriptions.csv', (req, res) => {
    const { where, order } = subscriptionQuery(req.query);
    const rows = db.all(`SELECT s.*, u.name, u.email, u.segment ${SUBS_FROM} ${where.sql} ORDER BY ${order.sql} LIMIT ${EXPORT_LIMIT}`, where.params);
    sendCsv(res, 'suscripciones', [
      { label: 'ID', value: 'id' }, { label: 'Cuenta', value: 'name' }, { label: 'Email', value: 'email' }, { label: 'Segmento', value: 'segment' },
      { label: 'Plan', value: (r) => PLANS[r.plan]?.name || r.plan }, { label: 'Período', value: 'period' }, { label: 'Monto (US$)', value: (r) => String(r.amount).replace('.', ',') },
      { label: 'Estado', value: 'status' }, { label: 'Alta', value: 'created_at' }, { label: 'Fin', value: 'ended_at' }
    ], rows);
  });

  // Búsqueda global del panel: personas, proyectos y reportes (#id).
  router.get('/admin/search', (req, res) => {
    const q = searchTerm(req.query.q);
    if (q.length < 2) return res.json({ users: [], projects: [], reports: [] });
    const term = likeTerm(q);
    const id = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : 0;
    const users = db.all("SELECT * FROM users WHERE id = :id OR name LIKE :q ESCAPE '\\' OR email LIKE :q ESCAPE '\\' ORDER BY (id = :id) DESC, last_active_at DESC LIMIT 6", { id, q: term }).map(mini);
    const projects = db.all("SELECT p.id, p.name, p.tagline, p.logo, p.accent, p.status, p.moderation, u.name AS owner FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = :id OR p.name LIKE :q ESCAPE '\\' ORDER BY (p.id = :id) DESC, p.updated_at DESC LIMIT 6", { id, q: term })
      .map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, logo: p.logo, accent: p.accent, status: p.status, moderation: p.moderation, owner: p.owner }));
    const reports = id ? db.all('SELECT id, reason, status, target_type FROM reports WHERE id = ?', [id]).map((r) => ({ id: r.id, reason: r.reason, status: r.status, targetType: r.target_type })) : [];
    res.json({ users, projects, reports });
  });
}

export { mini as adminUserMini };
