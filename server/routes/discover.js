import { EXPERIENCE_LEVELS, TEAM_SIZES } from '../../shared/catalog.js';
import { requireOnboarded } from '../auth.js';
import { compatPayload, personCompat, personRolesFor, projectCompat } from '../compat.js';
import { now } from '../db.js';
import { hasFeature, paywall, usage } from '../plans.js';
import { parseProject, parseUser, personCard, projectCard, teamSize } from '../serializers.js';
import { connect, isBlocked, notify } from '../services.js';
import { badRequest, daysAgo, idParam, str } from '../utils.js';

// Visibilidad prioritaria en el orden "Para vos": Pro suma un poco, Startup un poco más.
const BOOST = { pro: 3, startup: 5 };

const list = (value) => (typeof value === 'string' && value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []);
const lower = (arr) => arr.map((x) => String(x).toLowerCase());

export function parseFilters(query) {
  const basic = {
    role: str(query.role, 30),
    country: str(query.country, 40),
    workMode: str(query.workMode, 20),
    compensation: str(query.compensation, 20)
  };
  const advanced = {
    skills: list(query.skills),
    experience: str(query.experience, 20),
    industry: str(query.industry, 40),
    stage: str(query.stage, 20),
    availability: str(query.availability, 20),
    languages: list(query.languages),
    teamSize: str(query.teamSize, 20),
    hasUsers: query.hasUsers === '1',
    hasRevenue: query.hasRevenue === '1',
    hasInvestment: query.hasInvestment === '1'
  };
  const usesAdvanced = Object.values(advanced).some((v) => (Array.isArray(v) ? v.length : Boolean(v)));
  return { basic, advanced, usesAdvanced };
}

function personPasses(person, { basic, advanced }) {
  if (basic.role && !person.roles.includes(basic.role)) return false;
  if (basic.country && person.country !== basic.country) return false;
  if (basic.workMode && person.work_mode !== basic.workMode) return false;
  if (basic.compensation && person.compensation !== basic.compensation) return false;
  if (advanced.skills.length && !advanced.skills.some((s) => lower(person.skills).includes(s.toLowerCase()))) return false;
  if (advanced.experience) {
    const level = EXPERIENCE_LEVELS.find((l) => l.id === advanced.experience);
    if (level && (person.experience_years === null || person.experience_years < level.min || person.experience_years > level.max)) return false;
  }
  if (advanced.industry && !person.interests.includes(advanced.industry)) return false;
  if (advanced.availability && person.availability !== advanced.availability) return false;
  if (advanced.languages.length && !advanced.languages.some((l) => person.languages.includes(l))) return false;
  return true;
}

function projectPasses(project, { basic, advanced }) {
  if (basic.role && !personRolesFor(project.rolesNeeded).includes(basic.role)) return false;
  if (basic.country && project.country !== basic.country) return false;
  if (basic.workMode && project.work_mode !== basic.workMode) return false;
  const relevantNeeds = basic.role
    ? project.rolesNeeded.filter((need) => personRolesFor([need]).includes(basic.role))
    : project.rolesNeeded;
  if (basic.compensation) {
    // Cada perfil puede tener condiciones propias; si no las define, rigen las generales.
    const wanted = basic.compensation === 'personal' || basic.compensation === 'unsure' ? 'talk' : basic.compensation;
    const offers = relevantNeeds.map((need) => need.compensation || project.compensation);
    if (!offers.length) offers.push(project.compensation);
    if (!offers.some((offer) => offer === wanted || (wanted === 'equity' && offer === 'mixed'))) return false;
  }
  if (advanced.skills.length && !advanced.skills.some((s) => lower(project.stack).includes(s.toLowerCase()))) return false;
  if (advanced.industry && project.industry !== advanced.industry) return false;
  if (advanced.stage && project.stage !== advanced.stage) return false;
  if (advanced.availability) {
    const dedications = relevantNeeds.map((need) => need.dedication || project.dedication);
    if (!dedications.length) dedications.push(project.dedication);
    if (!dedications.includes(advanced.availability)) return false;
  }
  if (advanced.teamSize) {
    const size = TEAM_SIZES.find((t) => t.id === advanced.teamSize);
    const n = teamSize(project);
    if (size && (n < size.min || n > size.max)) return false;
  }
  if (advanced.hasUsers && !project.has_users) return false;
  if (advanced.hasRevenue && !project.has_revenue) return false;
  if (advanced.hasInvestment && !project.has_investment) return false;
  return true;
}

export function recordView(ctx, viewerId, targetType, targetId) {
  const { db } = ctx;
  const recent = db.get('SELECT 1 FROM views WHERE viewer_id = ? AND target_type = ? AND target_id = ? AND created_at >= ?', [viewerId, targetType, targetId, daysAgo(0.5)]);
  if (recent) return;
  db.run('INSERT INTO views (viewer_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [viewerId, targetType, targetId, now()]);
  if (targetType === 'project') {
    const project = db.get('SELECT owner_id FROM projects WHERE id = ?', [targetId]);
    const week = db.get("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ? AND created_at >= ?", [targetId, daysAgo(7)]).n;
    if (project && week > 0 && week % 10 === 0) notify(ctx, project.owner_id, 'project_views', { projectId: targetId, data: { count: week } });
  }
}

export default function discoverRoutes(router, ctx) {
  const { db, hub } = ctx;

  // ¿Esta persona o proyecto puede aparecer en Descubrir para esta cuenta? (mismas reglas que el mazo)
  const listed = (meId, targetType, targetId) => {
    if (targetType === 'person') {
      if (targetId === meId) return false;
      const u = db.get("SELECT id FROM users WHERE id = ? AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user'", [targetId]);
      return Boolean(u) && !isBlocked(db, meId, targetId);
    }
    const p = db.get("SELECT p.owner_id FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND p.status = 'published' AND p.moderation = 'ok' AND u.status = 'active' AND u.visible = 1", [targetId]);
    return Boolean(p) && p.owner_id !== meId && !isBlocked(db, meId, p.owner_id);
  };

  const myProjects = (userId) => db.all("SELECT * FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok'", [userId]).map(parseProject);
  const latestProject = (userId) => parseProject(db.get("SELECT * FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok' ORDER BY updated_at DESC LIMIT 1", [userId]));

  router.get('/discover', requireOnboarded, (req, res) => {
    const me = parseUser(req.user);
    const mode = req.query.mode === 'projects' ? 'projects' : 'people';
    const filters = parseFilters(req.query);
    if (filters.usesAdvanced && !hasFeature(me, 'advancedFilters')) throw paywall(me, 'advancedFilters');
    const sort = ['compat', 'recent', 'active'].includes(req.query.sort) ? req.query.sort : 'compat';
    const limit = Math.min(40, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    // Quién ya mostró interés por mí: aparece primero (sube el match rate).
    const interestedIn = new Set(db.all("SELECT from_user_id FROM interests WHERE to_user_id = ? AND status = 'pending'", [me.id]).map((r) => r.from_user_id));

    let items;
    if (mode === 'people') {
      const rows = db.all(
        `SELECT u.* FROM users u
         WHERE u.id != :me AND u.onboarded = 1 AND u.visible = 1 AND u.status = 'active' AND u.role = 'user'
           AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.user_id = :me AND p.target_type = 'person' AND p.target_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM saves s WHERE s.user_id = :me AND s.target_type = 'person' AND s.target_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM interests i WHERE i.from_user_id = :me AND i.target_type = 'person' AND i.target_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = min(:me, u.id) AND m.user_b = max(:me, u.id))
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = u.id) OR (b.user_id = u.id AND b.blocked_id = :me))`,
        { me: me.id }
      ).map(parseUser).filter((u) => personPasses(u, filters));
      const projects = myProjects(me.id);
      items = rows.map((u) => ({ row: u, compat: personCompat(me, u, projects), boost: BOOST[u.plan] || 0, priority: interestedIn.has(u.id), activeAt: u.last_active_at || u.created_at, createdAt: u.created_at }));
    } else {
      const rows = db.all(
        `SELECT p.*, u.plan AS owner_plan FROM projects p JOIN users u ON u.id = p.owner_id
         WHERE p.status = 'published' AND p.moderation = 'ok' AND p.owner_id != :me AND u.visible = 1 AND u.status = 'active'
           AND NOT EXISTS (SELECT 1 FROM passes x WHERE x.user_id = :me AND x.target_type = 'project' AND x.target_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM saves s WHERE s.user_id = :me AND s.target_type = 'project' AND s.target_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM interests i WHERE i.from_user_id = :me AND i.target_type = 'project' AND i.target_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = min(:me, p.owner_id) AND m.user_b = max(:me, p.owner_id))
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = p.owner_id) OR (b.user_id = p.owner_id AND b.blocked_id = :me))`,
        { me: me.id }
      ).map(parseProject).filter((p) => projectPasses(p, filters));
      items = rows.map((p) => ({ row: p, compat: projectCompat(me, p), boost: BOOST[p.owner_plan] || 0, priority: interestedIn.has(p.owner_id), activeAt: p.updated_at, createdAt: p.published_at || p.created_at }));
    }

    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      if (sort === 'recent') return String(b.createdAt).localeCompare(String(a.createdAt));
      if (sort === 'active') return String(b.activeAt).localeCompare(String(a.activeAt));
      if ((a.compat.score === null) !== (b.compat.score === null)) return a.compat.score === null ? 1 : -1;
      const sa = (a.compat.score ?? 0) + a.boost;
      const sb = (b.compat.score ?? 0) + b.boost;
      return sb - sa;
    });

    const showBreakdown = hasFeature(me, 'advancedCompat');
    const shape = (compat) => compatPayload(compat, { advanced: showBreakdown, preview: true });
    const page = items.slice(0, limit).map((item) => {
      if (mode === 'people') return personCard(item.row, { hub, compat: shape(item.compat), currentProject: latestProject(item.row.id) });
      const owner = db.get('SELECT * FROM users WHERE id = ?', [item.row.owner_id]);
      return projectCard(item.row, { owner, hub, compat: shape(item.compat) });
    });

    const totalPeople = mode === 'people' ? items.length : null;
    const totalProjects = mode === 'projects' ? items.length : null;
    res.json({ mode, items: page, total: items.length, totals: { people: totalPeople, projects: totalProjects }, usage: usage(db, me) });
  });

  router.get('/discover/counts', requireOnboarded, (req, res) => {
    const me = req.user.id;
    const people = db.get(
      `SELECT COUNT(*) AS n FROM users u WHERE u.id != :me AND u.onboarded = 1 AND u.visible = 1 AND u.status = 'active' AND u.role = 'user'
        AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.user_id = :me AND p.target_type = 'person' AND p.target_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM saves s WHERE s.user_id = :me AND s.target_type = 'person' AND s.target_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM interests i WHERE i.from_user_id = :me AND i.target_type = 'person' AND i.target_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = min(:me, u.id) AND m.user_b = max(:me, u.id))
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = u.id) OR (b.user_id = u.id AND b.blocked_id = :me))`,
      { me }
    ).n;
    const projects = db.get(
      `SELECT COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.status = 'published' AND p.moderation = 'ok' AND p.owner_id != :me AND u.visible = 1 AND u.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM passes x WHERE x.user_id = :me AND x.target_type = 'project' AND x.target_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM saves s WHERE s.user_id = :me AND s.target_type = 'project' AND s.target_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM interests i WHERE i.from_user_id = :me AND i.target_type = 'project' AND i.target_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = min(:me, p.owner_id) AND m.user_b = max(:me, p.owner_id))
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = p.owner_id) OR (b.user_id = p.owner_id AND b.blocked_id = :me))`,
      { me }
    ).n;
    res.json({ people, projects });
  });

  router.post('/actions', requireOnboarded, (req, res) => {
    const { targetType, targetId, action, note } = req.body ?? {};
    if (!['person', 'project'].includes(targetType)) throw badRequest('Tipo inválido.');
    const id = idParam(targetId);
    const me = req.user;

    if (action === 'connect') {
      const result = connect(ctx, me, targetType, id, str(note, 280));
      return res.json({ ...result, usage: usage(db, me) });
    }

    if (action === 'pass') {
      if (!listed(me.id, targetType, id)) return res.json({ status: 'passed' });
      db.run('INSERT OR REPLACE INTO passes (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [me.id, targetType, id, now()]);
      return res.json({ status: 'passed' });
    }

    if (action === 'save') {
      if (!listed(me.id, targetType, id)) throw badRequest('Perfil no disponible.');
      const exists = db.get('SELECT 1 FROM saves WHERE user_id = ? AND target_type = ? AND target_id = ?', [me.id, targetType, id]);
      if (exists) return res.json({ status: 'saved', usage: usage(db, me) });
      const u = usage(db, me);
      if (u.savesLeft !== null && u.savesLeft <= 0) throw paywall(me, 'saves');
      let ownerId;
      let projectId = null;
      if (targetType === 'person') {
        const target = db.get("SELECT id FROM users WHERE id = ? AND onboarded = 1 AND status = 'active' AND role = 'user'", [id]);
        if (!target || target.id === me.id) throw badRequest('Perfil no disponible.');
        ownerId = target.id;
      } else {
        const project = db.get("SELECT p.id, p.owner_id FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND p.status = 'published' AND p.moderation = 'ok' AND u.status = 'active'", [id]);
        if (!project || project.owner_id === me.id) throw badRequest('Proyecto no disponible.');
        ownerId = project.owner_id;
        projectId = project.id;
      }
      if (isBlocked(db, me.id, ownerId)) throw badRequest('Perfil no disponible.');
      db.run('INSERT INTO saves (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [me.id, targetType, id, now()]);
      notify(ctx, ownerId, targetType === 'person' ? 'saved_profile' : 'saved_project', { actorId: me.id, projectId });
      return res.json({ status: 'saved', usage: usage(db, me) });
    }

    throw badRequest('Acción inválida.');
  });

  router.post('/discover/undo', requireOnboarded, (req, res) => {
    const targetType = req.body?.targetType === 'project' ? 'project' : 'person';
    const targetId = Number.parseInt(req.body?.targetId, 10);
    const last = Number.isInteger(targetId)
      ? db.get('SELECT * FROM passes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, targetType, targetId])
      : db.get('SELECT * FROM passes WHERE user_id = ? AND target_type = ? ORDER BY created_at DESC LIMIT 1', [req.user.id, targetType]);
    if (!last) return res.json({ item: null });
    db.run('DELETE FROM passes WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, targetType, last.target_id]);
    // Solo vuelve lo que todavía se podría ver en Descubrir.
    if (!listed(req.user.id, targetType, last.target_id)) return res.json({ item: null });
    const me = parseUser(req.user);
    if (targetType === 'person') {
      const u = parseUser(db.get('SELECT * FROM users WHERE id = ?', [last.target_id]));
      if (!u) return res.json({ item: null });
      const compat = personCompat(me, u, myProjects(me.id));
      return res.json({ item: personCard(u, { hub, compat: compatPayload(compat, { advanced: hasFeature(me, 'advancedCompat'), preview: true }), currentProject: latestProject(u.id) }) });
    }
    const p = parseProject(db.get('SELECT * FROM projects WHERE id = ?', [last.target_id]));
    if (!p) return res.json({ item: null });
    const compat = projectCompat(me, p);
    const owner = db.get('SELECT * FROM users WHERE id = ?', [p.owner_id]);
    res.json({ item: projectCard(p, { owner, hub, compat: compatPayload(compat, { advanced: hasFeature(me, 'advancedCompat'), preview: true }) }) });
  });

  router.post('/views', requireOnboarded, (req, res) => {
    const { targetType, targetId } = req.body ?? {};
    if (!['person', 'project'].includes(targetType)) throw badRequest('Tipo inválido.');
    const id = idParam(targetId);
    if (!(targetType === 'person' && id === req.user.id)) recordView(ctx, req.user.id, targetType, id);
    res.json({ ok: true });
  });

  router.get('/saved', requireOnboarded, (req, res) => {
    const me = parseUser(req.user);
    const rows = db.all('SELECT * FROM saves WHERE user_id = ? ORDER BY created_at DESC', [me.id]);
    const projects = myProjects(me.id);
    const advanced = hasFeature(me, 'advancedCompat');
    const people = [];
    const projectItems = [];
    for (const row of rows) {
      if (row.target_type === 'person') {
        if (!listed(me.id, 'person', row.target_id)) continue;
        const u = parseUser(db.get("SELECT * FROM users WHERE id = ? AND onboarded = 1 AND status = 'active' AND role = 'user'", [row.target_id]));
        if (u) people.push({ ...personCard(u, { hub, compat: compatPayload(personCompat(me, u, projects), { advanced, preview: true }), currentProject: latestProject(u.id) }), savedAt: row.created_at });
      } else {
        if (!listed(me.id, 'project', row.target_id)) continue;
        const p = parseProject(db.get("SELECT p.* FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND p.status = 'published' AND p.moderation = 'ok' AND u.status = 'active'", [row.target_id]));
        if (p) {
          const owner = db.get('SELECT * FROM users WHERE id = ?', [p.owner_id]);
          projectItems.push({ ...projectCard(p, { owner, hub, compat: compatPayload(projectCompat(me, p), { advanced, preview: true }) }), savedAt: row.created_at });
        }
      }
    }
    res.json({ people, projects: projectItems, usage: usage(db, me) });
  });

  router.delete('/saves/:type/:id', requireOnboarded, (req, res) => {
    const type = req.params.type === 'project' ? 'project' : 'person';
    db.run('DELETE FROM saves WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, type, idParam(req.params.id)]);
    res.json({ ok: true, usage: usage(db, req.user) });
  });
}
