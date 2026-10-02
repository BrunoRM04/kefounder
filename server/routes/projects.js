import { BRAND_ACCENTS } from '../../shared/theme.js';
import { AVAILABILITY, COUNTRIES, INDUSTRIES, PROJECT_COMPENSATION, PROJECT_ROLES, ROLES, STAGES, WORK_MODES, labelOf } from '../../shared/catalog.js';
import { requireOnboarded } from '../auth.js';
import { projectCompat } from '../compat.js';
import { now } from '../db.js';
import { hasFeature, limitOf, paywall, requireFeature, usage } from '../plans.js';
import { ownedProject, parseProject, parseUser, personMini, projectDetail } from '../serializers.js';
import { isBlocked } from '../services.js';
import { badRequest, daysAgo, forbidden, idParam, imageUrl, notFound, oneOf, safeUrl, str, strList } from '../utils.js';
import { recordView } from './discover.js';
import { relationship } from './people.js';

const ACCENTS = BRAND_ACCENTS;
function projectColumns(db, body, user, existing) {
  const imageValue = (value, current) => {
    if (current && value === current) return current;
    const url = imageUrl(db, user.id, value);
    if (url === null) throw badRequest('La imagen no es válida.');
    return url;
  };
  const cols = {};
  if ('name' in body) {
    const name = str(body.name, 60);
    if (name.length < 2) throw badRequest('Poné un nombre de al menos 2 letras.', { field: 'name' });
    cols.name = name;
  }
  if ('tagline' in body) cols.tagline = str(body.tagline, 140);
  if ('description' in body) cols.description = str(body.description, 1500);
  if ('problem' in body) cols.problem = str(body.problem, 700);
  if ('solution' in body) cols.solution = str(body.solution, 700);
  if ('stage' in body) cols.stage = oneOf(body.stage, STAGES, 'idea');
  if ('industry' in body) cols.industry = oneOf(body.industry, INDUSTRIES, str(body.industry, 40));
  if ('city' in body) cols.city = str(body.city, 60);
  if ('country' in body) cols.country = oneOf(body.country, COUNTRIES, str(body.country, 40));
  if ('workMode' in body) cols.work_mode = oneOf(body.workMode, WORK_MODES, 'remote');
  if ('website' in body) {
    const url = safeUrl(body.website);
    if (body.website && !url) throw badRequest('Revisá el sitio web.', { field: 'website' });
    cols.website = url;
  }
  if ('cover' in body) cols.cover = imageValue(body.cover, existing?.cover);
  if ('logo' in body) cols.logo = imageValue(body.logo, existing?.logo);
  if ('rolesNeeded' in body) {
    const list = Array.isArray(body.rolesNeeded) ? body.rolesNeeded : [];
    const roles = [];
    for (const item of list.slice(0, 6)) {
      const role = oneOf(item?.role, PROJECT_ROLES, '');
      if (!role || roles.some((r) => r.role === role)) continue;
      roles.push({
        role,
        dedication: oneOf(item?.dedication, AVAILABILITY, ''),
        compensation: oneOf(item?.compensation, PROJECT_COMPENSATION, ''),
        equity: str(item?.equity, 20),
        note: str(item?.note, 140)
      });
    }
    cols.roles_needed = JSON.stringify(roles);
  }
  if ('dedication' in body) cols.dedication = oneOf(body.dedication, AVAILABILITY, 'exploring');
  if ('compensation' in body) cols.compensation = oneOf(body.compensation, PROJECT_COMPENSATION, 'talk');
  if ('stack' in body) cols.stack = JSON.stringify(strList(body.stack, { max: 12, itemMax: 32 }));
  if ('team' in body) {
    const list = Array.isArray(body.team) ? body.team : [];
    const team = list.map((m) => ({ name: str(m?.name, 60), role: str(m?.role, 60) })).filter((m) => m.name).slice(0, 12);
    const previous = existing ? JSON.parse(existing.team || '[]').length : 0;
    if (team.length > 2 && team.length > previous && !hasFeature(user, 'teamProfile')) throw paywall(user, 'teamProfile');
    cols.team = JSON.stringify(team);
  }
  for (const [key, col] of [['hasUsers', 'has_users'], ['hasRevenue', 'has_revenue'], ['hasInvestment', 'has_investment']]) {
    if (key in body) cols[col] = body[key] ? 1 : 0;
  }
  return cols;
}

const canPublish = (project) => {
  const p = parseProject(project);
  if (!p.tagline) throw badRequest('Agregá una descripción corta antes de publicar.', { field: 'tagline' });
  if (!p.rolesNeeded.length) throw badRequest('Elegí al menos un perfil que buscás.', { field: 'rolesNeeded' });
};

export default function projectRoutes(router, ctx) {
  const { db, hub } = ctx;

  const ownProject = (req) => {
    const project = db.get('SELECT * FROM projects WHERE id = ?', [idParam(req.params.id)]);
    if (!project) throw notFound('Este proyecto no existe.');
    if (project.owner_id !== req.user.id) throw forbidden();
    return project;
  };

  const ensureCanActivate = (user, excludeId = 0) => {
    const max = limitOf(user, 'activeProjects');
    if (max === null) return;
    const active = db.get("SELECT COUNT(*) AS n FROM projects WHERE owner_id = ? AND status = 'published' AND id != ?", [user.id, excludeId]).n;
    if (active >= max) throw paywall(user, 'projects');
  };

  const payload = (req, project) => ({ project: ownedProject(db, project), usage: usage(db, req.user) });

  router.get('/me/projects', requireOnboarded, (req, res) => {
    const rows = db.all('SELECT * FROM projects WHERE owner_id = ? ORDER BY CASE status WHEN \'published\' THEN 0 WHEN \'draft\' THEN 1 ELSE 2 END, updated_at DESC', [req.user.id]);
    res.json({ items: rows.map((p) => ownedProject(db, p)), usage: usage(db, req.user) });
  });

  router.post('/projects', requireOnboarded, (req, res) => {
    const body = req.body ?? {};
    const cols = projectColumns(db, body, req.user, null);
    if (!cols.name) throw badRequest('Poné un nombre para tu proyecto.', { field: 'name' });
    const total = db.get('SELECT COUNT(*) AS n FROM projects WHERE owner_id = ?', [req.user.id]).n;
    if (total >= 20) throw badRequest('Llegaste al máximo de proyectos guardados. Eliminá alguno para crear otro.');
    const at = now();
    const me = parseUser(req.user);
    const base = {
      owner_id: req.user.id,
      accent: ACCENTS[total % ACCENTS.length],
      city: me.city,
      country: me.country,
      created_at: at,
      updated_at: at,
      status: 'draft',
      ...cols
    };
    if (body.publish) canPublish({ roles_needed: '[]', stack: '[]', team: '[]', ...base });
    const keys = Object.keys(base);
    const id = db.run(`INSERT INTO projects (${keys.join(', ')}) VALUES (${keys.map((k) => `:${k}`).join(', ')})`, base).lastInsertRowid;
    let project = db.get('SELECT * FROM projects WHERE id = ?', [id]);
    let publishBlocked = null;
    if (body.publish) {
      try {
        ensureCanActivate(req.user, id);
        db.run("UPDATE projects SET status = 'published', published_at = ? WHERE id = ?", [now(), id]);
        project = db.get('SELECT * FROM projects WHERE id = ?', [id]);
      } catch (error) {
        // Sin cupo de proyectos activos: queda como borrador y avisamos qué plan lo permite.
        if (error.status !== 402) throw error;
        publishBlocked = { error: error.message, ...error.extra };
      }
    }
    res.status(201).json({ ...payload(req, project), publishBlocked });
  });

  router.get('/projects/:id', requireOnboarded, (req, res) => {
    const id = idParam(req.params.id);
    const project = parseProject(db.get('SELECT * FROM projects WHERE id = ?', [id]));
    const isOwner = project?.owner_id === req.user.id;
    const owner = project ? db.get('SELECT * FROM users WHERE id = ?', [project.owner_id]) : null;
    const listed = project?.status === 'published' && project.moderation === 'ok' && owner?.status === 'active';
    if (!project || (!isOwner && (!listed || isBlocked(db, req.user.id, project.owner_id)))) throw notFound('Este proyecto ya no está disponible.');
    const me = parseUser(req.user);
    const compat = isOwner ? null : projectCompat(me, project);
    if (!isOwner) recordView(ctx, me.id, 'project', id);
    res.json({
      project: {
        ...projectDetail(project, { owner, hub, compat: compat ? { score: compat.score, reasons: compat.reasons, breakdown: hasFeature(me, 'advancedCompat') ? compat.breakdown : null } : null }),
        status: project.status
      },
      relationship: { ...relationship(db, me, project.owner_id, { targetType: 'project', targetId: id }), owner: isOwner },
      usage: usage(db, me)
    });
  });

  router.put('/projects/:id', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    const cols = projectColumns(db, req.body ?? {}, req.user, project);
    cols.updated_at = now();
    const keys = Object.keys(cols);
    // Si el proyecto está publicado, los cambios deben dejarlo publicable; si no, se revierte todo.
    const updated = db.tx(() => {
      db.run(`UPDATE projects SET ${keys.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`, { ...cols, id: project.id });
      const row = db.get('SELECT * FROM projects WHERE id = ?', [project.id]);
      if (row.status === 'published') canPublish(row);
      return row;
    });
    res.json(payload(req, updated));
  });

  router.post('/projects/:id/publish', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    canPublish(project);
    if (project.status !== 'published') ensureCanActivate(req.user, project.id);
    db.run("UPDATE projects SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?", [now(), now(), project.id]);
    res.json(payload(req, db.get('SELECT * FROM projects WHERE id = ?', [project.id])));
  });

  router.post('/projects/:id/pause', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    db.run("UPDATE projects SET status = 'paused', updated_at = ? WHERE id = ?", [now(), project.id]);
    res.json(payload(req, db.get('SELECT * FROM projects WHERE id = ?', [project.id])));
  });

  router.post('/projects/:id/duplicate', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    const at = now();
    const copy = { ...project };
    delete copy.id;
    Object.assign(copy, { name: `${project.name} (copia)`.slice(0, 60), status: 'draft', created_at: at, updated_at: at, published_at: null });
    const keys = Object.keys(copy);
    const id = db.run(`INSERT INTO projects (${keys.join(', ')}) VALUES (${keys.map((k) => `:${k}`).join(', ')})`, copy).lastInsertRowid;
    res.status(201).json(payload(req, db.get('SELECT * FROM projects WHERE id = ?', [id])));
  });

  router.delete('/projects/:id', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    db.run('DELETE FROM projects WHERE id = ?', [project.id]);
    res.json({ ok: true, usage: usage(db, req.user) });
  });

  router.get('/projects/:id/stats', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    requireFeature(req.user, 'analytics');
    const id = project.id;
    const days = 14;
    const viewRows = db.all("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ? AND created_at >= ? GROUP BY day", [id, daysAgo(days)]);
    const interestRows = db.all("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM interests WHERE target_type = 'project' AND target_id = ? AND created_at >= ? GROUP BY day", [id, daysAgo(days)]);
    const byDay = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDay.push({ day, views: viewRows.find((r) => r.day === day)?.n || 0, interests: interestRows.find((r) => r.day === day)?.n || 0 });
    }
    const count = (sql, params) => db.get(sql, params).n;
    const views = count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ?", [id]);
    const saves = count("SELECT COUNT(*) AS n FROM saves WHERE target_type = 'project' AND target_id = ?", [id]);
    const interests = count("SELECT COUNT(*) AS n FROM interests WHERE target_type = 'project' AND target_id = ?", [id]);
    const matches = count('SELECT COUNT(*) AS n FROM matches WHERE project_id = ?', [id]);
    const views7 = count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ? AND created_at >= ?", [id, daysAgo(7)]);
    const viewsPrev7 = count("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ? AND created_at >= ? AND created_at < ?", [id, daysAgo(14), daysAgo(7)]);
    const interestedUsers = db.all("SELECT u.roles FROM interests i JOIN users u ON u.id = i.from_user_id WHERE i.target_type = 'project' AND i.target_id = ?", [id]);
    const roleCounts = {};
    for (const row of interestedUsers) {
      const roles = JSON.parse(row.roles || '[]');
      const main = roles[0] || 'other';
      roleCounts[main] = (roleCounts[main] || 0) + 1;
    }
    const roles = Object.entries(roleCounts).map(([role, n]) => ({ role, label: labelOf(ROLES, role) || 'Otro', count: n })).sort((a, b) => b.count - a.count);
    res.json({ project: { id, name: project.name }, totals: { views, saves, interests, matches, views7, viewsPrev7 }, byDay, roles });
  });

  router.get('/projects/:id/candidates', requireOnboarded, (req, res) => {
    const project = ownProject(req);
    requireFeature(req.user, 'seeInterested');
    const rows = db.all("SELECT * FROM interests WHERE target_type = 'project' AND target_id = ? AND status != 'declined' ORDER BY created_at DESC", [project.id]);
    res.json({
      pipelineEnabled: hasFeature(req.user, 'candidatesPanel'),
      items: rows.map((i) => {
        const u = db.get('SELECT * FROM users WHERE id = ?', [i.from_user_id]);
        const match = db.get('SELECT id FROM matches WHERE user_a = min(?, ?) AND user_b = max(?, ?)', [i.from_user_id, req.user.id, i.from_user_id, req.user.id]);
        return { id: i.id, status: i.status, pipeline: i.pipeline, note: i.note, createdAt: i.created_at, person: personMini(u, hub), skills: JSON.parse(u.skills || '[]').slice(0, 4), matchId: match?.id || null };
      })
    });
  });

  // Página pública para compartir un proyecto (sin sesión).
  router.get('/public/projects/:id', (req, res) => {
    const project = parseProject(db.get("SELECT * FROM projects WHERE id = ? AND status = 'published' AND moderation = 'ok'", [idParam(req.params.id)]));
    const owner = project ? db.get('SELECT * FROM users WHERE id = ?', [project.owner_id]) : null;
    if (!project || owner?.status !== 'active') throw notFound('Este proyecto no está disponible.');
    res.json({ project: projectDetail(project, { owner }) });
  });
}
