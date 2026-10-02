import { requireOnboarded } from '../auth.js';
import { now, parseJson } from '../db.js';
import { parseProject } from '../serializers.js';
import { bothActive, isBlocked, markRead, postMessage, pushCounts, serializeMatch, serializeMessage } from '../services.js';
import { badRequest, forbidden, idParam, notFound, safeUrl, str } from '../utils.js';

export default function matchRoutes(router, ctx) {
  const { db, hub } = ctx;

  const myMatch = (req) => {
    const match = db.get('SELECT * FROM matches WHERE id = ?', [idParam(req.params.id)]);
    if (!match || match.blocked_by) throw notFound('Esta conversación no está disponible.');
    if (match.user_a !== req.user.id && match.user_b !== req.user.id) throw forbidden();
    if (isBlocked(db, match.user_a, match.user_b) || !bothActive(db, match.user_a, match.user_b)) throw notFound('Esta conversación no está disponible.');
    return match;
  };

  router.get('/matches', requireOnboarded, (req, res) => {
    const me = req.user.id;
    const rows = db.all(
      `SELECT m.* FROM matches m JOIN users a ON a.id = m.user_a JOIN users b ON b.id = m.user_b
       WHERE (m.user_a = ? OR m.user_b = ?) AND m.blocked_by IS NULL AND a.status = 'active' AND b.status = 'active'
       ORDER BY COALESCE(m.last_message_at, m.created_at) DESC`,
      [me, me]
    );
    res.json({ items: rows.map((m) => serializeMatch(ctx, m, me)) });
  });

  router.get('/matches/:id', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    res.json({ match: serializeMatch(ctx, match, req.user.id) });
  });

  router.get('/matches/:id/messages', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 60));
    const before = Number.parseInt(req.query.before, 10);
    const rows = Number.isInteger(before)
      ? db.all('SELECT * FROM messages WHERE match_id = ? AND id < ? ORDER BY id DESC LIMIT ?', [match.id, before, limit + 1])
      : db.all('SELECT * FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT ?', [match.id, limit + 1]);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).reverse().map(serializeMessage);
    markRead(ctx, match, req.user.id);
    res.json({ items, hasMore });
  });

  router.post('/matches/:id/messages', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const { kind = 'text', body, meta = {} } = req.body ?? {};
    let message;
    if (kind === 'text') {
      const text = str(body, 2000);
      if (!text) throw badRequest('Escribí un mensaje.');
      message = { kind, body: text, meta: {} };
    } else if (kind === 'link') {
      const url = safeUrl(meta?.url || body, 500);
      if (!url) throw badRequest('Ese enlace no es válido.');
      message = { kind, body: str(meta?.text, 300), meta: { url } };
    } else if (kind === 'file') {
      const url = str(meta?.url, 300);
      const upload = url.startsWith('/uploads/') ? db.get('SELECT * FROM uploads WHERE filename = ? AND user_id = ?', [url.replace('/uploads/', ''), req.user.id]) : null;
      if (!upload) throw badRequest('No encontramos el archivo adjunto.');
      message = { kind, body: str(body, 500), meta: { url, name: upload.original_name, size: upload.size, mime: upload.mime } };
    } else if (kind === 'project') {
      const project = parseProject(db.get('SELECT * FROM projects WHERE id = ? AND owner_id = ?', [idParam(meta?.projectId), req.user.id]));
      if (!project) throw badRequest('Elegí uno de tus proyectos.');
      if (project.moderation !== 'ok') throw badRequest('Este proyecto está oculto por moderación y no se puede compartir.');
      message = { kind, body: str(body, 300), meta: { projectId: project.id, name: project.name, tagline: project.tagline, stage: project.stage, logo: project.logo, cover: project.cover, accent: project.accent, published: project.status === 'published' } };
    } else if (kind === 'meeting') {
      const slots = (Array.isArray(meta?.slots) ? meta.slots : []).map((s) => str(s, 40)).filter((s) => !Number.isNaN(Date.parse(s))).slice(0, 3);
      const link = safeUrl(meta?.link, 500);
      if (!slots.length && !link) throw badRequest('Proponé al menos un horario o un enlace.');
      message = { kind, body: str(body, 500), meta: { slots, link, duration: Math.min(180, Math.max(15, Number.parseInt(meta?.duration, 10) || 30)) } };
    } else {
      throw badRequest('Tipo de mensaje inválido.');
    }
    const saved = postMessage(ctx, match, req.user.id, message);
    res.status(201).json({ message: saved });
  });

  // Editar o eliminar un mensaje propio. Ambas partes lo ven actualizado en vivo.
  const ownMessage = (req, match) => {
    const message = db.get('SELECT * FROM messages WHERE id = ? AND match_id = ?', [idParam(req.params.messageId), match.id]);
    if (!message) throw notFound('Este mensaje ya no existe.');
    if (message.sender_id !== req.user.id) throw forbidden('Solo podés modificar tus mensajes.');
    if (message.kind === 'deleted') throw badRequest('Este mensaje fue eliminado.');
    return message;
  };

  // Las notificaciones sin leer no deben seguir mostrando el texto anterior.
  const refreshPreview = (match, message, preview) => {
    const recipientId = match.user_a === message.sender_id ? match.user_b : match.user_a;
    const old = message.body.slice(0, 90);
    for (const row of db.all("SELECT id, data FROM notifications WHERE user_id = ? AND match_id = ? AND type IN ('message', 'direct')", [recipientId, match.id])) {
      const data = parseJson(row.data, {});
      if (data.preview === old) db.run('UPDATE notifications SET data = ? WHERE id = ?', [JSON.stringify({ ...data, preview }), row.id]);
    }
    return recipientId;
  };

  const broadcast = (match, id) => {
    const message = serializeMessage(db.get('SELECT * FROM messages WHERE id = ?', [id]));
    for (const userId of [match.user_a, match.user_b]) hub.send(userId, 'message_updated', { matchId: match.id, message });
    return message;
  };

  router.put('/matches/:id/messages/:messageId', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const message = ownMessage(req, match);
    if (message.kind !== 'text') throw badRequest('Solo se pueden editar los mensajes de texto.');
    const text = str(req.body?.body, 2000);
    if (!text) throw badRequest('Escribí un mensaje.');
    db.run('UPDATE messages SET body = ?, meta = ? WHERE id = ?', [text, JSON.stringify({ ...parseJson(message.meta, {}), editedAt: now() }), message.id]);
    refreshPreview(match, message, text.slice(0, 90));
    res.json({ message: broadcast(match, message.id) });
  });

  router.delete('/matches/:id/messages/:messageId', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const message = ownMessage(req, match);
    db.run("UPDATE messages SET kind = 'deleted', body = '', meta = ?, read_at = COALESCE(read_at, ?) WHERE id = ?", [JSON.stringify({ deletedAt: now() }), now(), message.id]);
    const recipientId = refreshPreview(match, message, 'Mensaje eliminado');
    pushCounts(ctx, recipientId);
    res.json({ message: broadcast(match, message.id) });
  });

  router.post('/matches/:id/read', requireOnboarded, (req, res) => {
    markRead(ctx, myMatch(req), req.user.id);
    res.json({ ok: true });
  });

  router.post('/matches/:id/typing', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const otherId = match.user_a === req.user.id ? match.user_b : match.user_a;
    hub.send(otherId, 'typing', { matchId: match.id, userId: req.user.id });
    res.json({ ok: true });
  });

  // Deshacer el match: la conversación desaparece para ambos y no vuelven a cruzarse en Descubrir.
  router.delete('/matches/:id', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const me = req.user.id;
    const otherId = match.user_a === me ? match.user_b : match.user_a;
    db.tx(() => {
      db.run('DELETE FROM matches WHERE id = ?', [match.id]);
      db.run("UPDATE interests SET status = 'declined', responded_at = ? WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)", [now(), me, otherId, otherId, me]);
    });
    hub.send(otherId, 'match_removed', { matchId: match.id });
    pushCounts(ctx, me);
    pushCounts(ctx, otherId);
    res.json({ ok: true });
  });

  router.post('/matches/:id/archive', requireOnboarded, (req, res) => {
    const match = myMatch(req);
    const column = match.user_a === req.user.id ? 'archived_a' : 'archived_b';
    db.run(`UPDATE matches SET ${column} = ? WHERE id = ?`, [req.body?.archived === false ? 0 : 1, match.id]);
    res.json({ match: serializeMatch(ctx, db.get('SELECT * FROM matches WHERE id = ?', [match.id]), req.user.id) });
  });
}
