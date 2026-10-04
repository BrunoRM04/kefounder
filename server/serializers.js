import { parseJson } from './db.js';
import { planOf } from './plans.js';
import { brandAccent } from '../shared/theme.js';

export function parseUser(row) {
  if (!row) return null;
  return {
    ...row,
    work_mode: row.work_mode_confirmed ? row.work_mode : '',
    accent: brandAccent(row.accent, row.id),
    roles: parseJson(row.roles, []),
    skills: parseJson(row.skills, []),
    interests: parseJson(row.interests, []),
    languages: parseJson(row.languages, []),
    experience: parseJson(row.experience, []),
    settings: parseJson(row.settings, {})
  };
}

export function parseProject(row) {
  if (!row) return null;
  return {
    ...row,
    work_mode: row.work_mode_confirmed ? row.work_mode : '',
    accent: brandAccent(row.accent, row.id),
    rolesNeeded: parseJson(row.roles_needed, []),
    stack: parseJson(row.stack, []),
    team: parseJson(row.team, [])
  };
}

// Aceptan filas crudas de la base (JSON como texto) o ya parseadas.
const asUser = (user) => (Array.isArray(user.roles) ? user : parseUser(user));
const asProject = (project) => (Array.isArray(project.rolesNeeded) ? project : parseProject(project));

export const locationOf = (entity) => [entity.city, entity.country].filter(Boolean).join(', ');

export function completeness(user) {
  const u = asUser(user);
  const checks = [
    { key: 'photo', label: 'Agregá una foto', weight: 15, ok: Boolean(u.photo) },
    { key: 'headline', label: 'Contá tu rol principal', weight: 10, ok: Boolean(u.headline) },
    { key: 'bio', label: 'Escribí una bio corta', weight: 15, ok: u.bio.length >= 30 },
    { key: 'roles', label: 'Elegí tus roles', weight: 10, ok: u.roles.length > 0 },
    { key: 'skills', label: 'Sumá al menos 3 skills', weight: 10, ok: u.skills.length >= 3 },
    { key: 'location', label: 'Indicá tu ubicación', weight: 10, ok: Boolean(u.city || u.country) },
    { key: 'availability', label: 'Indicá tu disponibilidad', weight: 5, ok: Boolean(u.availability) },
    { key: 'compensation', label: 'Elegí qué compensación buscás', weight: 5, ok: Boolean(u.compensation) },
    { key: 'lookingFor', label: 'Contá qué estás buscando', weight: 5, ok: Boolean(u.looking_for) },
    { key: 'links', label: 'Conectá LinkedIn, GitHub o portfolio', weight: 10, ok: Boolean(u.linkedin || u.github || u.portfolio) },
    { key: 'experience', label: 'Sumá tu experiencia', weight: 5, ok: u.experience.length > 0 || u.experience_years !== null }
  ];
  const percent = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  return { percent, missing: checks.filter((c) => !c.ok).map(({ key, label }) => ({ key, label })) };
}

export function trustSignals(user) {
  const u = asUser(user);
  return {
    identity: Boolean(u.identity_verified),
    email: Boolean(u.email_verified),
    linkedin: Boolean(u.linkedin),
    github: Boolean(u.github),
    complete: completeness(u).percent >= 85
  };
}

export function isOnline(user, hub) {
  if (hub.isOnline(user.id)) return true;
  if (user.is_demo) return Boolean(user.settings?.demoOnline);
  return false;
}

// Lo mínimo para listas y avatares.
export function personMini(user, hub) {
  if (!user) return null;
  const u = asUser(user);
  return {
    id: u.id,
    name: u.name,
    photo: u.photo,
    accent: u.accent,
    headline: u.headline,
    roles: u.roles,
    location: locationOf(u),
    online: hub ? isOnline(u, hub) : false,
    lastActiveAt: u.last_active_at
  };
}

export function personCard(user, { hub, compat, currentProject } = {}) {
  const u = asUser(user);
  return {
    type: 'person',
    ...personMini(u, hub),
    age: u.show_age ? u.age : null,
    city: u.city,
    country: u.country,
    bio: u.bio,
    goal: u.goal,
    skills: u.skills,
    interests: u.interests,
    availability: u.availability,
    compensation: u.compensation,
    lookingFor: u.looking_for,
    workMode: u.work_mode,
    experienceYears: u.experience_years,
    languages: u.languages,
    currentProject: currentProject ? projectMini(currentProject) : null,
    match: compat || null,
    trust: trustSignals(u),
    boosted: planOf(u).features.priority
  };
}

export function personDetail(user, opts = {}) {
  const u = asUser(user);
  return {
    ...personCard(u, opts),
    experience: u.experience,
    links: { linkedin: u.linkedin, github: u.github, portfolio: u.portfolio },
    timezone: u.timezone,
    projects: (opts.projects || []).map((p) => projectMini(p)),
    memberSince: u.created_at
  };
}

export function projectMini(project) {
  const p = asProject(project);
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    stage: p.stage,
    industry: p.industry,
    logo: p.logo,
    cover: p.cover,
    accent: p.accent,
    status: p.status
  };
}

export const teamSize = (project) => 1 + (project.team?.length || 0);

export function projectCard(project, { owner, hub, compat } = {}) {
  const p = asProject(project);
  return {
    type: 'project',
    ...projectMini(p),
    location: locationOf(p),
    city: p.city,
    country: p.country,
    workMode: p.work_mode,
    rolesNeeded: p.rolesNeeded,
    dedication: p.dedication,
    compensation: p.compensation,
    stack: p.stack,
    teamSize: teamSize(p),
    hasUsers: Boolean(p.has_users),
    hasRevenue: Boolean(p.has_revenue),
    hasInvestment: Boolean(p.has_investment),
    owner: owner ? personMini(owner, hub) : null,
    match: compat || null,
    createdAt: p.created_at,
    publishedAt: p.published_at
  };
}

export function projectDetail(project, opts = {}) {
  const p = asProject(project);
  return {
    ...projectCard(p, opts),
    description: p.description,
    problem: p.problem,
    solution: p.solution,
    website: p.website,
    team: p.team
  };
}

// Proyecto propio con métricas básicas (visibles en todos los planes).
export function ownedProject(db, project) {
  const p = asProject(project);
  const views = db.get("SELECT COUNT(*) AS n FROM views WHERE target_type = 'project' AND target_id = ?", [p.id]).n;
  const interested = db.get("SELECT COUNT(*) AS n FROM interests WHERE target_type = 'project' AND target_id = ?", [p.id]).n;
  const matches = db.get('SELECT COUNT(*) AS n FROM matches WHERE project_id = ?', [p.id]).n;
  const saves = db.get("SELECT COUNT(*) AS n FROM saves WHERE target_type = 'project' AND target_id = ?", [p.id]).n;
  return {
    ...projectDetail(p),
    hasUsers: Boolean(p.has_users),
    hasRevenue: Boolean(p.has_revenue),
    hasInvestment: Boolean(p.has_investment),
    stats: { views, interested, matches, saves },
    moderation: p.moderation || 'ok',
    updatedAt: p.updated_at
  };
}

export function selfUser(db, user, extra = {}) {
  const u = asUser(user);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    headline: u.headline,
    photo: u.photo,
    accent: u.accent,
    city: u.city,
    country: u.country,
    bio: u.bio,
    goal: u.goal,
    roles: u.roles,
    skills: u.skills,
    interests: u.interests,
    languages: u.languages,
    availability: u.availability,
    compensation: u.compensation,
    lookingFor: u.looking_for,
    workMode: u.work_mode,
    experienceYears: u.experience_years,
    experience: u.experience,
    age: u.age,
    showAge: Boolean(u.show_age),
    links: { linkedin: u.linkedin, github: u.github, portfolio: u.portfolio },
    timezone: u.timezone,
    role: u.role || 'user',
    plan: u.plan,
    planPeriod: u.plan_period,
    planRenewsAt: u.plan_renews_at,
    onboarded: Boolean(u.onboarded),
    visible: Boolean(u.visible),
    trust: trustSignals(u),
    verification: {
      email: Boolean(u.email_verified),
      emailCodeSent: Boolean(u.settings.emailVerification),
      identity: u.identity_verified ? 'approved' : u.settings.identity?.status || 'none',
      identityNote: !u.identity_verified && u.settings.identity?.status === 'rejected' ? u.settings.identity.reason || '' : ''
    },
    completeness: completeness(u),
    createdAt: u.created_at,
    ...extra
  };
}
