import { now, parseJson } from '../db.js';
import { badRequest, idParam, notFound, str } from '../utils.js';
import { TARGET_TYPES, audit, conditions, dayKeyIn, oneOfOr, pageResult, paging, todayKey } from './common.js';

// Seguimiento interno: notas sobre cualquier cuenta, proyecto o reporte, tareas con
// vencimiento y el registro de auditoría de todo lo que se hizo desde el panel.

const TASK_STATUS = ['todo', 'doing', 'done'];
const PRIORITIES = ['high', 'normal', 'low'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Nombre legible del elemento vinculado (en lote, sin una consulta por fila).
function targetLabels(db, rows) {
  const ids = { user: new Set(), project: new Set(), report: new Set(), article: new Set() };
  for (const r of rows) if (r.target_type && ids[r.target_type]) ids[r.target_type].add(r.target_id);
  const labels = new Map();
  const load = (type, sql, label) => {
    const list = [...ids[type]];
    if (!list.length) return;
    for (const row of db.all(sql.replace('(?)', `(${list.map(() => '?').join(',')})`), list)) labels.set(`${type}:${row.id}`, label(row));
  };
  load('user', 'SELECT id, name FROM users WHERE id IN (?)', (r) => r.name);
  load('project', 'SELECT id, name FROM projects WHERE id IN (?)', (r) => r.name);
  load('report', 'SELECT id, reason FROM reports WHERE id IN (?)', (r) => `Reporte #${r.id} · ${r.reason}`);
  load('article', 'SELECT id, title FROM articles WHERE id IN (?)', (r) => `Nota: ${r.title}`);
  return (type, id) => (type ? { type, id, label: labels.get(`${type}:${id}`) || null } : null);
}

const noteRow = (n) => ({ id: n.id, body: n.body, createdAt: n.created_at, admin: n.admin_name || 'Administración', adminId: n.admin_id });

export const notesFor = (db, type, id) => db.all(
  'SELECT n.*, u.name AS admin_name FROM admin_notes n LEFT JOIN users u ON u.id = n.admin_id WHERE n.target_type = ? AND n.target_id = ? ORDER BY n.created_at DESC LIMIT 50',
  [type, id]
).map(noteRow);

export function serializeTasks(db, rows) {
  const today = todayKey();
  const target = targetLabels(db, rows);
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    detail: t.detail,
    status: t.status,
    priority: t.priority,
    dueAt: t.due_at,
    overdue: Boolean(t.status !== 'done' && t.due_at && t.due_at < today),
    dueToday: t.status !== 'done' && t.due_at === today,
    target: target(t.target_type, t.target_id),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    doneAt: t.done_at,
    createdBy: t.creator_name || null
  }));
}

const TASK_SELECT = 'SELECT t.*, u.name AS creator_name FROM admin_tasks t LEFT JOIN users u ON u.id = t.created_by';
const TASK_ORDER = `CASE t.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
  CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END, t.due_at ASC,
  CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.id DESC`;

export const tasksFor = (db, type, id) => serializeTasks(db, db.all(`${TASK_SELECT} WHERE t.target_type = ? AND t.target_id = ? ORDER BY ${TASK_ORDER} LIMIT 50`, [type, id]));

const auditRow = (a) => ({ id: a.id, action: a.action, targetType: a.target_type, targetId: a.target_id, summary: a.summary, data: parseJson(a.data, {}), createdAt: a.created_at, admin: a.admin_name || 'Administración' });
const AUDIT_SELECT = 'SELECT a.*, u.name AS admin_name FROM admin_audit a LEFT JOIN users u ON u.id = a.admin_id';

export const auditFor = (db, type, id) => db.all(`${AUDIT_SELECT} WHERE a.target_type = ? AND a.target_id = ? ORDER BY a.id DESC LIMIT 30`, [type, id]).map(auditRow);

function targetOf(db, body) {
  const type = oneOfOr(body?.targetType, TARGET_TYPES);
  if (!type) return { type: null, id: null };
  const id = idParam(body.targetId);
  const table = { user: 'users', project: 'projects', report: 'reports', article: 'articles' }[type];
  if (!db.get(`SELECT 1 FROM ${table} WHERE id = ?`, [id])) throw notFound('No encontramos el elemento vinculado.');
  return { type, id };
}

export default function trackingRoutes(router, ctx) {
  const { db } = ctx;

  // ---------- Notas ----------
  router.get('/admin/notes', (req, res) => {
    const type = oneOfOr(req.query.targetType, TARGET_TYPES);
    if (!type) throw badRequest('Tipo inválido.');
    res.json({ items: notesFor(db, type, idParam(req.query.targetId)) });
  });

  router.post('/admin/notes', (req, res) => {
    const target = targetOf(db, req.body);
    if (!target.type) throw badRequest('Elegí a qué corresponde la nota.');
    const body = str(req.body?.body, 2000);
    if (body.length < 2) throw badRequest('Escribí la nota.', { field: 'body' });
    const id = db.run('INSERT INTO admin_notes (target_type, target_id, admin_id, body, created_at) VALUES (?, ?, ?, ?, ?)', [target.type, target.id, req.user.id, body, now()]).lastInsertRowid;
    audit(ctx, req, 'note.create', { type: target.type, id: target.id, summary: body.slice(0, 120) });
    const row = db.get('SELECT n.*, u.name AS admin_name FROM admin_notes n LEFT JOIN users u ON u.id = n.admin_id WHERE n.id = ?', [id]);
    res.status(201).json({ note: noteRow(row) });
  });

  router.delete('/admin/notes/:id', (req, res) => {
    const note = db.get('SELECT * FROM admin_notes WHERE id = ?', [idParam(req.params.id)]);
    if (!note) throw notFound('Esta nota ya no existe.');
    db.run('DELETE FROM admin_notes WHERE id = ?', [note.id]);
    audit(ctx, req, 'note.delete', { type: note.target_type, id: note.target_id, summary: note.body.slice(0, 120) });
    res.json({ ok: true });
  });

  // ---------- Tareas ----------
  const taskFilters = (query) => {
    const where = conditions();
    const today = todayKey();
    const view = oneOfOr(query.view, ['open', 'overdue', 'today', 'week', 'done', 'all'], 'open');
    if (view === 'open') where.add("t.status != 'done'");
    if (view === 'done') where.add("t.status = 'done'");
    if (view === 'overdue') where.add("t.status != 'done' AND t.due_at < :today", { today });
    if (view === 'today') where.add("t.status != 'done' AND t.due_at = :today", { today });
    if (view === 'week') where.add("t.status != 'done' AND t.due_at >= :today AND t.due_at <= :week", { today, week: dayKeyIn(6) });
    const priority = oneOfOr(query.priority, PRIORITIES);
    if (priority) where.add('t.priority = :priority', { priority });
    const type = oneOfOr(query.targetType, TARGET_TYPES);
    if (type) {
      where.add('t.target_type = :type', { type });
      if (query.targetId) where.add('t.target_id = :tid', { tid: idParam(query.targetId) });
    }
    return { where, view };
  };

  router.get('/admin/tasks', (req, res) => {
    const { where } = taskFilters(req.query);
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM admin_tasks t ${where.sql}`, where.params).n;
    const rows = db.all(`${TASK_SELECT} ${where.sql} ORDER BY ${TASK_ORDER} LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    const today = todayKey();
    const counts = db.get(
      `SELECT SUM(status != 'done') AS open, SUM(status != 'done' AND due_at < :today) AS overdue, SUM(status != 'done' AND due_at = :today) AS today,
         SUM(status = 'doing') AS doing, SUM(status = 'done') AS done FROM admin_tasks`, { today }
    );
    res.json({ ...pageResult(serializeTasks(db, rows), total, page), counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v || 0])) });
  });

  const taskColumns = (body, { partial }) => {
    const cols = {};
    if (!partial || 'title' in body) {
      const title = str(body.title, 140);
      if (title.length < 3) throw badRequest('Poné un título de al menos 3 letras.', { field: 'title' });
      cols.title = title;
    }
    if ('detail' in body) cols.detail = str(body.detail, 2000);
    if ('priority' in body) cols.priority = oneOfOr(body.priority, PRIORITIES, 'normal');
    if ('dueAt' in body) {
      if (body.dueAt && !DATE_RE.test(String(body.dueAt))) throw badRequest('Fecha inválida.', { field: 'dueAt' });
      cols.due_at = body.dueAt || null;
    }
    if ('status' in body) {
      const status = oneOfOr(body.status, TASK_STATUS);
      if (!status) throw badRequest('Estado inválido.');
      cols.status = status;
      cols.done_at = status === 'done' ? now() : null;
    }
    return cols;
  };

  router.post('/admin/tasks', (req, res) => {
    const body = req.body ?? {};
    const cols = taskColumns(body, { partial: false });
    const target = targetOf(db, body);
    const at = now();
    const row = { status: 'todo', priority: 'normal', detail: '', due_at: null, ...cols, target_type: target.type, target_id: target.id, created_by: req.user.id, created_at: at, updated_at: at };
    const keys = Object.keys(row);
    const id = db.run(`INSERT INTO admin_tasks (${keys.join(', ')}) VALUES (${keys.map((k) => `:${k}`).join(', ')})`, row).lastInsertRowid;
    audit(ctx, req, 'task.create', { type: target.type, id: target.id, summary: cols.title });
    res.status(201).json({ task: serializeTasks(db, [db.get(`${TASK_SELECT} WHERE t.id = ?`, [id])])[0] });
  });

  router.put('/admin/tasks/:id', (req, res) => {
    const task = db.get('SELECT * FROM admin_tasks WHERE id = ?', [idParam(req.params.id)]);
    if (!task) throw notFound('Esta tarea ya no existe.');
    const cols = taskColumns(req.body ?? {}, { partial: true });
    if (!Object.keys(cols).length) throw badRequest('No hay cambios.');
    cols.updated_at = now();
    const keys = Object.keys(cols);
    db.run(`UPDATE admin_tasks SET ${keys.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`, { ...cols, id: task.id });
    const action = cols.status && cols.status !== task.status ? (cols.status === 'done' ? 'task.done' : 'task.status') : 'task.update';
    audit(ctx, req, action, { type: task.target_type, id: task.target_id, summary: cols.title || task.title, data: cols.status ? { from: task.status, to: cols.status } : {} });
    res.json({ task: serializeTasks(db, [db.get(`${TASK_SELECT} WHERE t.id = ?`, [task.id])])[0] });
  });

  router.delete('/admin/tasks/:id', (req, res) => {
    const task = db.get('SELECT * FROM admin_tasks WHERE id = ?', [idParam(req.params.id)]);
    if (!task) throw notFound('Esta tarea ya no existe.');
    db.run('DELETE FROM admin_tasks WHERE id = ?', [task.id]);
    audit(ctx, req, 'task.delete', { type: task.target_type, id: task.target_id, summary: task.title });
    res.json({ ok: true });
  });

  // ---------- Auditoría ----------
  router.get('/admin/audit', (req, res) => {
    const where = conditions();
    const area = oneOfOr(req.query.area, ['user', 'identity', 'project', 'report', 'article', 'task', 'note', 'system']);
    if (area) where.add("a.action LIKE :area ESCAPE '\\'", { area: `${area}.%` });
    const type = oneOfOr(req.query.targetType, TARGET_TYPES);
    if (type) {
      where.add('a.target_type = :type', { type });
      if (req.query.targetId) where.add('a.target_id = :tid', { tid: idParam(req.query.targetId) });
    }
    const since = oneOfOr(req.query.since, ['1', '7', '30']);
    if (since) where.add('a.created_at >= :since', { since: new Date(Date.now() - Number(since) * 86400000).toISOString() });
    const page = paging(req.query);
    const total = db.get(`SELECT COUNT(*) AS n FROM admin_audit a ${where.sql}`, where.params).n;
    const rows = db.all(`${AUDIT_SELECT} ${where.sql} ORDER BY a.id DESC LIMIT :limit OFFSET :offset`, { ...where.params, limit: page.pageSize, offset: page.offset });
    res.json(pageResult(rows.map(auditRow), total, page));
  });
}
