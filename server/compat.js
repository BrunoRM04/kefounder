import { AVAILABILITY, COMPENSATION, PROJECT_COMPENSATION, PROJECT_ROLES, ROLES, STAGES, labelOf } from '../shared/catalog.js';

// Sistema de compatibilidad entre personas, skills, proyectos, disponibilidad,
// etapa, compensación y objetivos. Devuelve un puntaje 0–100 y las razones.

const AVAIL_RANK = { exploring: 0, lt10: 1, h10_20: 2, h20_40: 3, fulltime: 4 };

const SEEKERS = ['create_project', 'find_cofounder', 'find_talent'];
const GOAL_REASON = {
  create_project: 'Quiere crear un proyecto',
  find_cofounder: 'Busca cofundador',
  join_project: 'Quiere sumarse a un proyecto',
  find_talent: 'Está sumando talento',
  explore: 'Está explorando ideas'
};
const goalFit = (a, b) => {
  if (!a || !b) return 0.6;
  if (a === 'explore' || b === 'explore') return 0.62;
  if (SEEKERS.includes(a) && b === 'join_project') return 1;
  if (a === 'join_project' && SEEKERS.includes(b)) return 1;
  if (a === 'find_cofounder' && b === 'find_cofounder') return 0.9;
  if ((a === 'create_project' && b === 'find_cofounder') || (a === 'find_cofounder' && b === 'create_project')) return 0.82;
  if (a === 'join_project' && b === 'join_project') return 0.45;
  if (a === 'find_talent' && b === 'find_talent') return 0.4;
  return 0.6;
};

const COMP_MATRIX = {
  equity: { equity: 1, mixed: 0.8, talk: 0.75, paid: 0.3, personal: 0.7, unsure: 0.7 },
  paid: { paid: 1, mixed: 0.85, talk: 0.7, equity: 0.3, personal: 0.2, unsure: 0.6 },
  mixed: { mixed: 1, equity: 0.8, paid: 0.85, talk: 0.8, personal: 0.4, unsure: 0.7 },
  personal: { personal: 1, equity: 0.7, talk: 0.7, mixed: 0.4, paid: 0.2, unsure: 0.7 },
  unsure: { unsure: 0.7, equity: 0.7, paid: 0.6, mixed: 0.7, talk: 0.8, personal: 0.7 },
  talk: { talk: 0.8, equity: 0.75, paid: 0.7, mixed: 0.8, personal: 0.7, unsure: 0.8 }
};
const compFit = (a, b) => (a && b ? COMP_MATRIX[a]?.[b] ?? 0.6 : 0.6);

const availFit = (a, b) => {
  if (!(a in AVAIL_RANK) || !(b in AVAIL_RANK)) return 0.6;
  if (a === 'exploring' || b === 'exploring') return 0.6;
  return 1 - Math.abs(AVAIL_RANK[a] - AVAIL_RANK[b]) / 4;
};

const jaccard = (a = [], b = []) => {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
};

const shared = (a = [], b = []) => {
  const B = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => B.has(x.toLowerCase()));
};

const roleFit = (a = [], b = []) => {
  if (!a.length || !b.length) return 0.6;
  const overlap = jaccard(a, b);
  const founderish = (list) => list.some((r) => r === 'founder' || r === 'ceo');
  // Founder + perfil técnico/diseño/growth es la combinación más buscada.
  if (founderish(a) !== founderish(b)) return 1;
  return 1 - overlap * 0.55;
};

const locationFit = (viewer, other, otherMode) => {
  if (viewer.country && other.country && viewer.country === other.country) return 1;
  if (otherMode === 'remote' || viewer.work_mode === 'remote') return 0.8;
  return 0.45;
};

// Qué roles de persona necesita un listado de roles de proyecto.
export const personRolesFor = (rolesNeeded = []) => {
  const out = new Set();
  for (const need of rolesNeeded) {
    const def = PROJECT_ROLES.find((r) => r.id === need.role || r.label === need.role);
    def?.maps.forEach((r) => out.add(r));
  }
  return [...out];
};

const needsFitFor = (rolesNeeded, personRoles) => {
  if (!rolesNeeded?.length) return { fit: 0.55, role: null };
  for (const need of rolesNeeded) {
    const def = PROJECT_ROLES.find((r) => r.id === need.role || r.label === need.role);
    if (def && def.id !== 'cofounder' && def.id !== 'advisor' && def.maps.some((r) => personRoles.includes(r))) return { fit: 1, role: def.label };
  }
  for (const need of rolesNeeded) {
    const def = PROJECT_ROLES.find((r) => r.id === need.role || r.label === need.role);
    if (def && def.maps.some((r) => personRoles.includes(r))) return { fit: 0.85, role: def.label };
  }
  return { fit: 0.25, role: null };
};

const finalize = (factors) => {
  const total = factors.reduce((sum, f) => sum + f.weight, 0);
  const raw = factors.reduce((sum, f) => sum + f.weight * f.value, 0) / total;
  const score = Math.round(52 + raw * 47);
  const reasons = factors
    .filter((f) => f.reason && f.value >= 0.75)
    .sort((a, b) => b.weight * b.value - a.weight * a.value)
    .map((f) => f.reason);
  const breakdown = factors.map((f) => ({ key: f.key, label: f.label, value: Math.round(f.value * 100) }));
  return { score: Math.min(99, Math.max(40, score)), reasons: reasons.slice(0, 4), breakdown };
};

/**
 * @param viewer usuario que mira (fila parseada)
 * @param person persona objetivo (fila parseada)
 * @param viewerProjects proyectos publicados del viewer (parseados)
 */
export function personCompat(viewer, person, viewerProjects = []) {
  let needs = { fit: 0.6, role: null, project: null };
  for (const project of viewerProjects) {
    const fit = needsFitFor(project.rolesNeeded, person.roles);
    if (fit.fit > needs.fit) needs = { ...fit, project: project.name };
  }
  const sharedInterests = shared(person.interests, viewer.interests);
  const sharedLanguages = shared(person.languages, viewer.languages);
  const complementarySkills = person.skills.filter((s) => !viewer.skills.map((x) => x.toLowerCase()).includes(s.toLowerCase()));
  const personRole = labelOf(ROLES, person.roles[0]);
  return finalize([
    { key: 'needs', label: 'Perfil que buscás', weight: 0.2, value: needs.fit, reason: needs.project && needs.role ? `${needs.project} busca ${needs.role}` : null },
    { key: 'goal', label: 'Objetivos', weight: 0.2, value: goalFit(viewer.goal, person.goal), reason: GOAL_REASON[person.goal] || null },
    { key: 'roles', label: 'Roles complementarios', weight: 0.18, value: roleFit(viewer.roles, person.roles), reason: personRole ? `${personRole} complementa tu perfil` : null },
    { key: 'availability', label: 'Disponibilidad', weight: 0.14, value: availFit(viewer.availability, person.availability), reason: person.availability && person.availability === viewer.availability ? `Misma disponibilidad (${labelOf(AVAILABILITY, person.availability, 'short')})` : null },
    { key: 'compensation', label: 'Compensación', weight: 0.13, value: compFit(viewer.compensation, person.compensation), reason: person.compensation ? `Alineados en ${labelOf(COMPENSATION, person.compensation).toLowerCase()}` : null },
    { key: 'interests', label: 'Industrias en común', weight: 0.08, value: sharedInterests.length ? Math.min(1, 0.6 + sharedInterests.length * 0.2) : 0.45, reason: sharedInterests.length ? `Les interesa ${sharedInterests.slice(0, 2).join(' y ')}` : null },
    { key: 'location', label: 'Ubicación', weight: 0.05, value: locationFit(viewer, person, person.work_mode), reason: viewer.country && viewer.country === person.country ? `Ambos en ${person.country}` : null },
    { key: 'languages', label: 'Idiomas', weight: 0.02, value: sharedLanguages.length ? 1 : 0.5, reason: null },
    { key: 'skills', label: 'Skills complementarias', weight: 0.0001, value: complementarySkills.length ? 1 : 0.5, reason: complementarySkills.length ? `Suma ${complementarySkills.slice(0, 2).join(' y ')}` : null }
  ]);
}

export function projectCompat(viewer, project) {
  const needs = needsFitFor(project.rolesNeeded, viewer.roles);
  const stackOverlap = shared(project.stack, viewer.skills);
  const interestMatch = project.industry && viewer.interests.map((x) => x.toLowerCase()).includes(project.industry.toLowerCase());
  const joinGoal = { join_project: 1, find_cofounder: 0.85, explore: 0.7, create_project: 0.5, find_talent: 0.35 }[viewer.goal] ?? 0.6;
  const stageLabel = labelOf(STAGES, project.stage);
  return finalize([
    { key: 'needs', label: 'Buscan tu perfil', weight: 0.3, value: needs.fit, reason: needs.role ? `Buscan ${needs.role}` : null },
    { key: 'goal', label: 'Objetivos', weight: 0.14, value: joinGoal, reason: viewer.goal === 'join_project' ? 'Querés sumarte a un proyecto' : null },
    { key: 'skills', label: 'Stack y skills', weight: 0.14, value: project.stack.length ? Math.min(1, 0.45 + stackOverlap.length * 0.25) : 0.6, reason: stackOverlap.length ? `Usan ${stackOverlap.slice(0, 2).join(' y ')}` : null },
    { key: 'availability', label: 'Dedicación', weight: 0.13, value: availFit(viewer.availability, project.dedication), reason: project.dedication && project.dedication === viewer.availability ? `Piden ${labelOf(AVAILABILITY, project.dedication, 'short')}` : null },
    { key: 'compensation', label: 'Compensación', weight: 0.13, value: compFit(viewer.compensation, project.compensation), reason: project.compensation && compFit(viewer.compensation, project.compensation) >= 0.8 ? `Ofrecen ${labelOf(PROJECT_COMPENSATION, project.compensation).toLowerCase()}` : null },
    { key: 'interests', label: 'Industria', weight: 0.1, value: interestMatch ? 1 : 0.5, reason: interestMatch ? `Te interesa ${project.industry}` : null },
    { key: 'location', label: 'Modalidad', weight: 0.06, value: locationFit(viewer, project, project.work_mode), reason: project.work_mode === 'remote' ? 'Trabajo remoto' : viewer.country === project.country ? `En ${project.country}` : null },
    { key: 'stage', label: 'Etapa', weight: 0.0001, value: 1, reason: stageLabel && ['mvp', 'users', 'revenue', 'investment'].includes(project.stage) ? `Ya están en ${stageLabel}` : null }
  ]);
}
