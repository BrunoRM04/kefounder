import { PAYWALL_COPY as COPY, PLANS, PLAN_ORDER, minimumPlanFor } from '../shared/catalog.js';
import { HttpError, startOfLocalDay, startOfLocalMonth } from './utils.js';

export const planOf = (user) => PLANS[user?.plan] || PLANS.free;
export const hasFeature = (user, feature) => Boolean(planOf(user).features[feature]);
export const limitOf = (user, key) => planOf(user).limits[key];

const nextPlanWith = (user, predicate) => {
  const start = PLAN_ORDER.indexOf(planOf(user).id) + 1;
  return PLAN_ORDER.slice(start).find((id) => predicate(PLANS[id])) || 'startup';
};

export function paywall(user, feature) {
  let requiredPlan;
  if (feature === 'connections' || feature === 'saves') requiredPlan = 'plus';
  else if (feature === 'projects') requiredPlan = nextPlanWith(user, (plan) => plan.limits.activeProjects > planOf(user).limits.activeProjects);
  else if (feature === 'directMessages') requiredPlan = nextPlanWith(user, (plan) => plan.limits.directMessagesPerMonth === null || plan.limits.directMessagesPerMonth > (planOf(user).limits.directMessagesPerMonth || 0));
  else requiredPlan = minimumPlanFor(feature);
  const copy = COPY[feature] || { title: 'Función de un plan pago', message: 'Mejorá tu plan para usar esta función.' };
  return new HttpError(402, copy.message, { code: 'paywall', feature, requiredPlan, title: copy.title });
}

export function requireFeature(user, feature) {
  if (!hasFeature(user, feature)) throw paywall(user, feature);
}

export function usage(db, user) {
  const connectionsToday = db.get('SELECT COUNT(*) AS n FROM interests WHERE from_user_id = ? AND created_at >= ?', [user.id, startOfLocalDay()]).n;
  const saves = db.get('SELECT COUNT(*) AS n FROM saves WHERE user_id = ?', [user.id]).n;
  const activeProjects = db.get("SELECT COUNT(*) AS n FROM projects WHERE owner_id = ? AND status = 'published'", [user.id]).n;
  const directThisMonth = db.get("SELECT COUNT(*) AS n FROM matches WHERE origin = 'direct' AND initiator_id = ? AND created_at >= ?", [user.id, startOfLocalMonth()]).n;
  const limits = planOf(user).limits;
  const remaining = (used, max) => (max === null ? null : Math.max(0, max - used));
  return {
    connectionsToday,
    connectionsLeft: remaining(connectionsToday, limits.connectionsPerDay),
    saves,
    savesLeft: remaining(saves, limits.saves),
    activeProjects,
    activeProjectsLeft: remaining(activeProjects, limits.activeProjects),
    directThisMonth,
    directLeft: remaining(directThisMonth, limits.directMessagesPerMonth)
  };
}
