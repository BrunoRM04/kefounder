import { requireOnboarded } from '../auth.js';
import { compatPayload, personCompat } from '../compat.js';
import { now } from '../db.js';
import { hasFeature, paywall, usage } from '../plans.js';
import { parseProject, parseUser, personDetail } from '../serializers.js';
import { createMatch, findMatch, isBlocked, postMessage, pushCounts, serializeMatch, syncBlockState } from '../services.js';
import { badRequest, idParam, notFound, str } from '../utils.js';
import { recordView } from './discover.js';

export function relationship(db, me, otherId, { targetType = 'person', targetId = otherId } = {}) {
  const match = findMatch(db, me.id, otherId);
  const sent = db.get('SELECT id, status FROM interests WHERE from_user_id = ? AND target_type = ? AND target_id = ?', [me.id, targetType, targetId]);
  const saved = Boolean(db.get('SELECT 1 FROM saves WHERE user_id = ? AND target_type = ? AND target_id = ?', [me.id, targetType, targetId]));
  const received = hasFeature(me, 'seeInterested')
    ? db.get("SELECT id, note, project_id FROM interests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [otherId, me.id])
    : null;
  return {
    self: me.id === otherId,
    saved,
    sent: sent ? sent.status : null,
    sentId: sent && sent.status !== 'accepted' ? sent.id : null,
    matchId: match && !match.blocked_by ? match.id : null,
    receivedInterest: received ? { id: received.id, note: received.note } : null
  };
}

export default function peopleRoutes(router, ctx) {
  const { db, hub } = ctx;

  router.get('/users/:id', requireOnboarded, (req, res) => {
    const id = idParam(req.params.id);
    const me = parseUser(req.user);
    const row = parseUser(db.get('SELECT * FROM users WHERE id = ? AND onboarded = 1', [id]));
    if (!row || (id !== me.id && (!row.visible || row.status !== 'active' || row.role !== 'user' || isBlocked(db, me.id, id)))) throw notFound('Este perfil ya no está disponible.');
    const projects = db.all("SELECT * FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok' ORDER BY updated_at DESC", [id]).map(parseProject);
    const mine = db.all("SELECT * FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok'", [me.id]).map(parseProject);
    const compat = id === me.id ? null : personCompat(me, row, mine);
    const advanced = hasFeature(me, 'advancedCompat');
    if (id !== me.id) recordView(ctx, me.id, 'person', id);
    res.json({
      user: personDetail(row, {
        hub,
        projects,
        currentProject: projects[0] || null,
        compat: compat ? compatPayload(compat, { advanced }) : null
      }),
      relationship: relationship(db, me, id),
      usage: usage(db, me)
    });
  });

  // Mensaje directo sin match (Pro limitado, Startup ilimitado).
  router.post('/users/:id/direct', requireOnboarded, (req, res) => {
    const id = idParam(req.params.id);
    const me = req.user;
    if (id === me.id) throw badRequest('No podés escribirte a vos.');
    const body = str(req.body?.body, 1000);
    if (!body) throw badRequest('Escribí un mensaje.');
    const target = db.get("SELECT * FROM users WHERE id = ? AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user'", [id]);
    if (!target || isBlocked(db, me.id, id)) throw notFound('Este perfil ya no está disponible.');

    let match = findMatch(db, me.id, id);
    if (match?.blocked_by) throw notFound('Este perfil ya no está disponible.');
    if (!match) {
      const u = usage(db, me);
      if (u.directLeft !== null && u.directLeft <= 0) throw paywall(me, 'directMessages');
      match = createMatch(ctx, me.id, id, { origin: 'direct', initiatorId: me.id, silent: true }).match;
      postMessage(ctx, match, me.id, { kind: 'text', body }, { notifyType: 'direct' });
    } else {
      postMessage(ctx, match, me.id, { kind: 'text', body });
    }
    match = db.get('SELECT * FROM matches WHERE id = ?', [match.id]);
    res.status(201).json({ match: serializeMatch(ctx, match, me.id), usage: usage(db, me) });
  });

  router.post('/users/:id/block', requireOnboarded, (req, res) => {
    const id = idParam(req.params.id);
    if (id === req.user.id) throw badRequest('No podés bloquearte.');
    db.run('INSERT OR IGNORE INTO blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)', [req.user.id, id, now()]);
    syncBlockState(db, req.user.id, id);
    const match = findMatch(db, req.user.id, id);
    if (match) hub.send(id, 'match_removed', { matchId: match.id });
    pushCounts(ctx, req.user.id);
    pushCounts(ctx, id);
    res.json({ ok: true });
  });
}
