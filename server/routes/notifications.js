import { requireOnboarded } from '../auth.js';
import { now } from '../db.js';
import { pushCounts, serializeNotification } from '../services.js';
import { idParam } from '../utils.js';

export default function notificationRoutes(router, ctx) {
  const { db } = ctx;

  router.get('/notifications', requireOnboarded, (req, res) => {
    const rows = db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 80', [req.user.id]);
    res.json({ items: rows.map((row) => serializeNotification(db, req.user, row)) });
  });

  router.post('/notifications/read-all', requireOnboarded, (req, res) => {
    db.run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [now(), req.user.id]);
    pushCounts(ctx, req.user.id);
    res.json({ ok: true });
  });

  router.delete('/notifications', requireOnboarded, (req, res) => {
    db.run('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    pushCounts(ctx, req.user.id);
    res.json({ ok: true });
  });

  router.delete('/notifications/:id', requireOnboarded, (req, res) => {
    db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [idParam(req.params.id), req.user.id]);
    pushCounts(ctx, req.user.id);
    res.json({ ok: true });
  });

  router.post('/notifications/:id/read', requireOnboarded, (req, res) => {
    db.run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', [now(), idParam(req.params.id), req.user.id]);
    pushCounts(ctx, req.user.id);
    res.json({ ok: true });
  });
}
