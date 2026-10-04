import { AVAILABILITY, GOALS, PROJECT_ROLES, WORK_MODES, labelOf } from '../shared/catalog.js';

// Reglas orientativas calculadas con datos persistidos. Los factores sin datos
// quedan fuera del promedio y se muestran como "Sin datos" en el detalle Pro.
const goalIds = new Set(GOALS.map((goal) => goal.id));
const modeIds = new Set(WORK_MODES.map((mode) => mode.id));
const seekers = new Set(['create_project', 'find_cofounder', 'find_talent']);
const availabilityRank = { lt10: 1, h10_20: 2, h20_40: 3, fulltime: 4 };
const compensationFit = {
  equity: { equity: 1, mixed: 0.85, paid: 0.15, personal: 0.55 },
  paid: { paid: 1, mixed: 0.85, equity: 0.15, personal: 0.15 },
  mixed: { mixed: 1, equity: 0.85, paid: 0.85, personal: 0.4 },
  personal: { personal: 1, equity: 0.55, paid: 0.15, mixed: 0.4 }
};

const normalized = (value) => String(value || '').trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const shared = (left = [], right = []) => {
  const rightValues = new Set(right.map(normalized));
  return [...new Map(left.filter((value) => rightValues.has(normalized(value))).map((value) => [normalized(value), value])).values()];
};
const commonRatio = (left, right) => {
  if (!left?.length || !right?.length) return null;
  return shared(left, right).length / Math.min(new Set(left.map(normalized)).size, new Set(right.map(normalized)).size);
};
const goalFit = (viewer, other) => {
  if (!goalIds.has(viewer) || !goalIds.has(other)) return null;
  if (seekers.has(viewer) && other === 'join_project') return 1;
  if (viewer === 'join_project' && seekers.has(other)) return 1;
  if (viewer === 'find_cofounder' && other === 'find_cofounder') return 0.85;
  if ((viewer === 'create_project' && other === 'find_cofounder') || (viewer === 'find_cofounder' && other === 'create_project')) return 0.85;
  if (viewer === 'create_project' && other === 'create_project') return 0.7;
  if (viewer === 'explore' || other === 'explore') return 0.55;
  if (viewer === 'join_project' && other === 'join_project') return 0.35;
  if (viewer === 'find_talent' && other === 'find_talent') return 0.3;
  return 0.5;
};
const availabilityFit = (left, right) => {
  if (!(left in availabilityRank) || !(right in availabilityRank)) return null;
  return 1 - 0.75 * Math.abs(availabilityRank[left] - availabilityRank[right]) / 3;
};
const payFit = (left, right) => compensationFit[left]?.[right] ?? null;
const hasFounderRole = (roles) => roles.some((role) => role === 'founder' || role === 'ceo');
const rolesFit = (viewerRoles = [], otherRoles = []) => {
  if (!viewerRoles.length || !otherRoles.length) return null;
  if (hasFounderRole(viewerRoles) !== hasFounderRole(otherRoles)) return 0.95;
  const overlap = commonRatio(viewerRoles, otherRoles);
  if (overlap >= 0.8) return 0.45;
  if (overlap > 0) return 0.6;
  return 0.7;
};
const modeFit = (viewer, other) => {
  const left = viewer.work_mode;
  const right = other.work_mode;
  if (!modeIds.has(left) || !modeIds.has(right)) return null;
  if (left === 'remote' && right === 'remote') return 1;
  if (left === 'remote' || right === 'remote') return left === 'hybrid' || right === 'hybrid' ? 0.65 : 0.2;
  if (!viewer.country || !other.country || !viewer.city || !other.city) return null;
  const sameCountry = normalized(viewer.country) === normalized(other.country);
  const sameCity = sameCountry && normalized(viewer.city) === normalized(other.city);
  if (sameCity) return left === right ? 1 : 0.85;
  if (!sameCountry) return 0.15;
  return 0.25;
};
const modeReason = (viewer, other) => {
  if (viewer.work_mode === 'remote' && other.work_mode === 'remote') return 'Ambos prefieren trabajar en remoto';
  if (viewer.city && other.city && viewer.country && other.country
    && normalized(viewer.city) === normalized(other.city) && normalized(viewer.country) === normalized(other.country)
    && modeFit(viewer, other) >= 0.8) return 'Pueden colaborar en ' + other.city;
  return null;
};
const needDefinition = (need) => PROJECT_ROLES.find((role) => role.id === need?.role || role.label === need?.role);
const bestNeed = (project, person) => {
  const candidates = (project.rolesNeeded || []).map((need) => {
    const definition = needDefinition(need);
    if (!definition) return null;
    const matchesRole = definition.maps.some((role) => person.roles.includes(role));
    const roleFit = matchesRole ? (definition.id === 'cofounder' || definition.id === 'advisor' ? 0.85 : 1) : 0.1;
    const availability = availabilityFit(person.availability, need.dedication || project.dedication);
    const compensation = payFit(person.compensation, need.compensation || project.compensation);
    return {
      role: matchesRole ? definition.label : null,
      need,
      availability,
      compensation,
      fit: roleFit * (0.7 + 0.15 * (availability ?? 0.5) + 0.15 * (compensation ?? 0.5))
    };
  }).filter(Boolean);
  return candidates.sort((a, b) => b.fit - a.fit)[0] || null;
};

// El filtro por rol del mazo usa exactamente las mismas equivalencias que el puntaje.
export const personRolesFor = (rolesNeeded = []) => {
  const out = new Set();
  for (const need of rolesNeeded) needDefinition(need)?.maps.forEach((role) => out.add(role));
  return [...out];
};

const finalize = (factors) => {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const known = factors.filter((factor) => factor.value !== null && Number.isFinite(factor.value));
  const knownWeight = known.reduce((sum, factor) => sum + factor.weight, 0);
  const score = knownWeight >= totalWeight * 0.45
    ? Math.round(100 * known.reduce((sum, factor) => sum + factor.weight * factor.value, 0) / knownWeight)
    : null;
  const reasons = known
    .filter((factor) => factor.reason && factor.value >= 0.75)
    .sort((left, right) => right.weight * right.value - left.weight * left.value)
    .map((factor) => factor.reason)
    .slice(0, 4);
  const breakdown = factors.map((factor) => ({
    key: factor.key,
    label: factor.label,
    value: factor.value === null ? null : Math.round(factor.value * 100)
  }));
  return { score, reasons, breakdown, coverage: Math.round(100 * knownWeight / totalWeight) };
};

export function personCompat(viewer, person, viewerProjects = []) {
  const projects = viewerProjects.filter((project) => project.status === 'published' && project.moderation === 'ok');
  const needs = projects.map((project) => {
    const need = bestNeed(project, person);
    return need ? { ...need, project: project.name } : null;
  }).filter(Boolean).sort((left, right) => right.fit - left.fit)[0] || null;
  const goal = goalFit(viewer.goal, person.goal);
  const roles = rolesFit(viewer.roles, person.roles);
  const availability = availabilityFit(viewer.availability, person.availability);
  const compensation = payFit(viewer.compensation, person.compensation);
  const interests = commonRatio(viewer.interests, person.interests);
  const languages = commonRatio(viewer.languages, person.languages);
  const location = modeFit(viewer, person);
  const newSkills = person.skills.filter((skill) => !viewer.skills.some((own) => normalized(own) === normalized(skill)));
  const skills = roles !== null && roles >= 0.75 && person.skills.length
    ? Math.min(0.95, 0.4 + newSkills.length * 0.18) : null;
  return finalize([
    { key: 'needs', label: 'Perfil que buscás', weight: 0.22, value: needs?.fit ?? null, reason: needs?.role ? needs.project + ' busca ' + needs.role : null },
    { key: 'goal', label: 'Objetivos', weight: 0.2, value: goal, reason: goal >= 0.75 && person.goal === 'join_project' ? 'Quiere sumarse a un proyecto' : goal >= 0.75 && person.goal === 'find_cofounder' ? 'Busca cofounder' : null },
    { key: 'roles', label: 'Roles complementarios', weight: 0.18, value: roles, reason: roles >= 0.75 ? 'Sus roles se complementan' : null },
    { key: 'availability', label: 'Disponibilidad', weight: 0.13, value: availability, reason: availability >= 0.75 ? 'Disponibilidad compatible (' + labelOf(AVAILABILITY, person.availability, 'short') + ')' : null },
    { key: 'compensation', label: 'Compensación', weight: 0.12, value: compensation, reason: compensation >= 0.8 ? 'Expectativas de compensación compatibles' : null },
    { key: 'interests', label: 'Industrias en común', weight: 0.07, value: interests, reason: interests > 0 ? 'Les interesa ' + shared(person.interests, viewer.interests).slice(0, 2).join(' y ') : null },
    { key: 'location', label: 'Modalidad y ubicación', weight: 0.04, value: location, reason: location >= 0.8 ? modeReason(viewer, person) : null },
    { key: 'languages', label: 'Idiomas', weight: 0.02, value: languages, reason: languages > 0 ? 'Comparten ' + shared(person.languages, viewer.languages)[0] : null },
    { key: 'skills', label: 'Skills complementarias', weight: 0.02, value: skills, reason: newSkills.length && skills >= 0.75 ? 'Aporta ' + newSkills.slice(0, 2).join(' y ') : null }
  ]);
}

export function projectCompat(viewer, project) {
  const need = bestNeed(project, viewer);
  const goal = !goalIds.has(viewer.goal) ? null : ({
    join_project: 1,
    find_cofounder: project.rolesNeeded.some((role) => role.role === 'cofounder') ? 0.9 : 0.6,
    explore: 0.55,
    create_project: 0.35,
    find_talent: 0.2
  })[viewer.goal];
  const skills = commonRatio(project.stack, viewer.skills);
  const availability = need?.availability ?? availabilityFit(viewer.availability, project.dedication);
  const compensation = need?.compensation ?? payFit(viewer.compensation, project.compensation);
  const interests = project.industry && viewer.interests.length
    ? Number(viewer.interests.some((industry) => normalized(industry) === normalized(project.industry))) : null;
  const location = modeFit(viewer, project);
  return finalize([
    { key: 'needs', label: 'Buscan tu perfil', weight: 0.34, value: need?.fit ?? null, reason: need?.role ? 'Buscan ' + need.role : null },
    { key: 'goal', label: 'Objetivos', weight: 0.12, value: goal, reason: viewer.goal === 'join_project' ? 'Querés sumarte a un proyecto' : viewer.goal === 'find_cofounder' && goal >= 0.75 ? 'Buscás un proyecto como cofounder' : null },
    { key: 'skills', label: 'Stack y skills', weight: 0.14, value: skills, reason: skills > 0 ? 'Usan ' + shared(project.stack, viewer.skills).slice(0, 2).join(' y ') : null },
    { key: 'availability', label: 'Dedicación', weight: 0.15, value: availability, reason: availability >= 0.75 ? 'Tu disponibilidad encaja con la dedicación pedida' : null },
    { key: 'compensation', label: 'Compensación', weight: 0.13, value: compensation, reason: compensation >= 0.8 ? 'Tu expectativa de compensación es compatible' : null },
    { key: 'interests', label: 'Industria', weight: 0.07, value: interests, reason: interests ? 'Te interesa ' + project.industry : null },
    { key: 'location', label: 'Modalidad y ubicación', weight: 0.05, value: location, reason: location >= 0.8 ? modeReason(viewer, project) : null }
  ]);
}

export function compatPayload(compat, { advanced = false, preview = false } = {}) {
  return {
    score: compat.score,
    coverage: compat.coverage,
    reasons: compat.reasons.slice(0, preview && !advanced ? 2 : 4),
    breakdown: advanced ? compat.breakdown : null
  };
}
