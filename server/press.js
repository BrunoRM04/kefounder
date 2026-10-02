import { PRESS, PRESS_KINDS, PLANS } from '../shared/catalog.js';
import { now } from './db.js';

// Difusión: KeFounder! publica a la startup en la Revista y en Instagram (planes Pro y Startup).
// Cada plan tiene un cupo por período; un pedido rechazado o cancelado devuelve el cupo.

export const PRESS_STATUSES = ['pending', 'in_progress', 'published', 'rejected', 'canceled'];
const COUNTS_AGAINST = "status NOT IN ('rejected', 'canceled')";

export function pressAllowance(db, user) {
  const plan = PRESS[user.plan] || null;
  if (!plan) {
    return { enabled: false, requiredPlan: 'pro', options: Object.entries(PRESS).map(([id, p]) => ({ plan: id, planName: PLANS[id].name, ...p })) };
  }
  const since = new Date(Date.now() - plan.everyDays * 86400000).toISOString();
  const last = db.get(`SELECT created_at FROM press_requests WHERE user_id = ? AND kind = ? AND created_at >= ? AND ${COUNTS_AGAINST} ORDER BY created_at DESC LIMIT 1`, [user.id, plan.kind, since]);
  const nextAt = last ? new Date(Date.parse(last.created_at) + plan.everyDays * 86400000).toISOString() : null;
  return { enabled: true, available: !last, nextAt, plan: user.plan, planName: PLANS[user.plan].name, ...plan };
}

export function serializePress(db, r, { admin = false } = {}) {
  const article = r.article_id ? db.get('SELECT id, slug, title, status, published_at FROM articles WHERE id = ?', [r.article_id]) : null;
  const articlePublic = article && article.status === 'published' && article.published_at && article.published_at <= now();
  const item = {
    id: r.id,
    kind: r.kind,
    kindLabel: PRESS_KINDS[r.kind] || r.kind,
    plan: r.plan,
    status: r.status,
    projectId: r.project_id,
    projectName: r.project_name,
    pitch: r.pitch,
    spokesperson: r.spokesperson,
    spokespersonRole: r.spokesperson_role,
    instagram: r.instagram,
    website: r.website,
    contact: r.contact,
    response: r.response,
    instagramUrl: r.instagram_url,
    // Quien pidió la difusión solo ve el enlace a la nota cuando ya está publicada.
    article: article && (admin || articlePublic) ? { id: article.id, slug: article.slug, title: article.title, public: Boolean(articlePublic), status: article.status } : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at
  };
  return item;
}

export const pendingPressCount = (db) => db.get("SELECT COUNT(*) AS n FROM press_requests WHERE status = 'pending'").n;
