import { PLANS, PLAN_ORDER } from '../../shared/catalog.js';
import { requireAuth } from '../auth.js';
import { now } from '../db.js';
import { notify } from '../services.js';
import { badRequest } from '../utils.js';
import { mePayload } from './auth.js';

// Al bajar de plan quedan publicados solo los proyectos más recientes que entren en el límite.
export function enforceProjectLimit(db, userId, planId) {
  const max = PLANS[planId]?.limits.activeProjects;
  if (max === null || max === undefined) return 0;
  const active = db.all("SELECT id FROM projects WHERE owner_id = ? AND status = 'published' ORDER BY updated_at DESC", [userId]);
  const excess = active.slice(max);
  for (const project of excess) db.run("UPDATE projects SET status = 'paused', updated_at = ? WHERE id = ?", [now(), project.id]);
  return excess.length;
}

// Suscripciones en modo demostración: no hay cobro real.
// Para producción, reemplazar /billing/checkout por una sesión de Stripe/Mercado Pago
// y activar el plan desde el webhook de pago confirmado.
export default function billingRoutes(router, ctx) {
  const { db } = ctx;

  router.get('/plans', (_req, res) => {
    res.json({ plans: PLAN_ORDER.map((id) => PLANS[id]) });
  });

  router.get('/billing/history', requireAuth, (req, res) => {
    res.json({ items: db.all('SELECT plan, period, amount, status, created_at AS createdAt FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 20', [req.user.id]) });
  });

  router.post('/billing/checkout', requireAuth, (req, res) => {
    const planId = req.body?.plan;
    const period = req.body?.period === 'yearly' ? 'yearly' : 'monthly';
    const plan = PLANS[planId];
    if (!plan || planId === 'free') throw badRequest('Elegí un plan válido.');
    const renews = new Date();
    if (period === 'yearly') renews.setFullYear(renews.getFullYear() + 1);
    else renews.setMonth(renews.getMonth() + 1);
    const amount = period === 'yearly' ? plan.yearly : plan.monthly;
    db.tx(() => {
      db.run("UPDATE subscriptions SET status = 'replaced', ended_at = ? WHERE user_id = ? AND status = 'active'", [now(), req.user.id]);
      db.run("INSERT INTO subscriptions (user_id, plan, period, amount, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)", [req.user.id, planId, period, amount, now()]);
      db.run('UPDATE users SET plan = ?, plan_period = ?, plan_renews_at = ? WHERE id = ?', [planId, period, renews.toISOString(), req.user.id]);
      enforceProjectLimit(db, req.user.id, planId);
    });
    notify(ctx, req.user.id, 'plan', { data: { planName: plan.name } });
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: mePayload(ctx, user), receipt: { plan: plan.name, period, amount, renewsAt: renews.toISOString(), demo: true } });
  });

  router.post('/billing/cancel', requireAuth, (req, res) => {
    db.tx(() => {
      db.run("UPDATE subscriptions SET status = 'canceled', ended_at = ? WHERE user_id = ? AND status = 'active'", [now(), req.user.id]);
      db.run("UPDATE users SET plan = 'free', plan_period = NULL, plan_renews_at = NULL WHERE id = ?", [req.user.id]);
      enforceProjectLimit(db, req.user.id, 'free');
    });
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: mePayload(ctx, user) });
  });
}
