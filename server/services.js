import fs from 'node:fs';
import path from 'node:path';
import { now, parseJson } from './db.js';
import { brandAccent } from '../shared/theme.js';
import { hasFeature, limitOf, paywall, usage } from './plans.js';
import { parseProject, parseUser, personMini, projectMini } from './serializers.js';
import { HttpError, badRequest, firstName, notFound } from './utils.js';

// ---------- Notificaciones ----------

const CATEGORY = {
  interest: 'interests', interests_summary: 'interests',
  match: 'matches',
  message: 'messages', direct: 'messages',
  saved_project: 'activity', saved_profile: 'activity', project_views: 'activity', recommendations: 'activity',
  help_answer: 'help', help_accepted: 'help', help_award: 'help'
};

const PLACE = { 1: '1.º', 2: '2.º', 3: '3.º' };
const weekLabel = (key) => {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' });
};

export function counts(db, userId) {
  const notifications = db.get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]).n;
  const messages = db.get(
    `SELECT COUNT(*) AS n FROM messages m JOIN matches x ON x.id = m.match_id
     JOIN users a ON a.id = x.user_a JOIN users b ON b.id = x.user_b
     WHERE (x.user_a = ? OR x.user_b = ?) AND x.blocked_by IS NULL AND a.status = 'active' AND b.status = 'active'
       AND m.sender_id != ? AND m.read_at IS NULL`,
    [userId, userId, userId]
  ).n;
  const interests = db.get("SELECT COUNT(*) AS n FROM interests i JOIN users u ON u.id = i.from_user_id WHERE i.to_user_id = ? AND i.status = 'pending' AND u.status = 'active'", [userId]).n;
  // «Necesito ayuda con…»: pedidos abiertos de otras personas publicados desde tu última visita.
  const help = db.get(
    `SELECT COUNT(*) AS n FROM help_requests r JOIN users u ON u.id = r.user_id
     WHERE r.hidden = 0 AND r.status = 'open' AND u.status = 'active' AND r.user_id != :me
       AND r.created_at > COALESCE((SELECT json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.helpSeenAt') FROM users WHERE id = :me), :since)
       AND NOT EXISTS (SELECT 1 FROM help_answers a WHERE a.request_id = r.id AND a.user_id = :me)
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = r.user_id) OR (b.user_id = r.user_id AND b.blocked_id = :me))`,
    { me: userId, since: new Date(Date.now() - 7 * 86400000).toISOString() }
  ).n;
  return { notifications, messages, interests, help };
}

export const pushCounts = (ctx, userId) => ctx.hub.send(userId, 'counts', counts(ctx.db, userId));

export function serializeNotification(db, viewer, row) {
  const data = parseJson(row.data, {});
  // Una cuenta suspendida no se nombra ni se muestra en las notificaciones.
  const actorRow = row.actor_id ? db.get('SELECT * FROM users WHERE id = ?', [row.actor_id]) : null;
  const actor = actorRow && actorRow.status === 'active' ? parseUser(actorRow) : null;
  const project = row.project_id ? db.get('SELECT id, name, owner_id FROM projects WHERE id = ?', [row.project_id]) : null;
  const canSee = hasFeature(viewer, 'seeInterested');
  const name = actor ? firstName(actor.name) : 'Alguien';
  let title = '';
  let body = '';
  let link = '/';
  let hidden = false;

  switch (row.type) {
    case 'interest':
      hidden = !canSee;
      title = project
        ? `${canSee ? name : 'Alguien'} quiere sumarse a ${project.name}`
        : `${canSee ? name : 'Alguien'} quiere conectar con vos`;
      body = canSee ? (data.note || actor?.headline || 'Respondé desde tus solicitudes.') : 'Descubrí quién es con Plus. También aparece primero en Descubrir.';
      link = '/interesados';
      break;
    case 'interests_summary':
      title = `${data.count} personas mostraron interés en vos`;
      body = canSee ? 'Revisá quiénes son y respondé.' : 'Con Plus podés ver quiénes son.';
      link = '/interesados';
      break;
    case 'match':
      title = '¡Tenés un nuevo match!';
      body = `Vos y ${name} quieren construir juntos. Escribile para empezar.`;
      link = row.match_id ? `/chat/${row.match_id}` : '/matches';
      break;
    case 'message':
      title = data.count > 1 ? `${name} te envió ${data.count} mensajes` : 'Tenés un mensaje nuevo';
      body = `${name}: ${data.preview || ''}`;
      link = row.match_id ? `/chat/${row.match_id}` : '/matches';
      break;
    case 'direct':
      title = `${name} te envió un mensaje directo`;
      body = data.preview || '';
      link = row.match_id ? `/chat/${row.match_id}` : '/matches';
      break;
    case 'saved_project':
      hidden = !canSee;
      title = `${canSee ? name : 'Alguien'} guardó tu proyecto`;
      body = project ? project.name : '';
      link = project ? `/proyectos` : '/proyectos';
      break;
    case 'saved_profile':
      hidden = !canSee;
      title = `${canSee ? name : 'Alguien'} guardó tu perfil`;
      body = canSee ? (actor?.headline || '') : 'Con Plus ves quién guardó tu perfil.';
      link = '/interesados?tab=saved';
      break;
    case 'project_views':
      title = `Tu proyecto recibió ${data.count} visitas esta semana`;
      body = project ? `${project.name} está generando interés.` : '';
      link = project ? `/proyectos/${project.id}/estadisticas` : '/proyectos';
      break;
    case 'recommendations':
      title = `Encontramos ${data.count} perfiles compatibles con tu búsqueda`;
      body = 'Personas nuevas que comparten tus objetivos.';
      link = '/';
      break;
    case 'plan':
      title = `Tu plan ${data.planName} está activo`;
      body = 'Ya podés usar todas sus funciones.';
      link = '/planes';
      break;
    case 'identity_approved':
      title = 'Tu identidad está verificada';
      body = 'Tu perfil ya muestra la insignia de identidad verificada.';
      link = '/configuracion';
      break;
    case 'identity_rejected':
      title = 'No pudimos verificar tu identidad';
      body = data.reason ? `Motivo: ${data.reason}. Podés enviar otra foto.` : 'Podés enviar otra foto de tu documento desde Configuración.';
      link = '/configuracion';
      break;
    case 'report_reviewed':
      title = 'Revisamos tu reporte';
      body = 'Gracias por avisarnos: ya tomamos las medidas que correspondían.';
      link = '/notificaciones';
      break;
    case 'project_hidden':
      title = project ? `${project.name} quedó oculto` : 'Tu proyecto quedó oculto';
      body = data.reason ? `No aparece en Descubrir. Motivo: ${data.reason}` : 'No aparece en Descubrir mientras lo revisamos.';
      link = '/proyectos';
      break;
    case 'press_in_progress':
      title = `Estamos preparando la difusión de ${data.project || 'tu startup'}`;
      body = data.kind === 'nota' ? 'El equipo de KeFounder! ya está escribiendo tu nota para la Revista y el Instagram.' : 'El equipo de KeFounder! ya está preparando tu mención en la Revista y en Instagram.';
      link = '/proyectos';
      break;
    case 'press_published':
      title = `¡${data.project || 'Tu startup'} salió en la Revista KeFounder!!`;
      body = data.slug ? 'Mirá la nota y compartila. También está en nuestro Instagram.' : 'Ya está publicada en nuestro Instagram.';
      link = data.slug ? `/revista/${data.slug}` : '/proyectos';
      break;
    case 'press_rejected':
      title = `No pudimos publicar la difusión de ${data.project || 'tu startup'}`;
      body = data.reason ? `Motivo: ${data.reason}. Tu cupo sigue disponible.` : 'Tu cupo sigue disponible: podés volver a pedirla.';
      link = '/proyectos';
      break;
    case 'help_answer':
      title = data.count > 1 ? `${data.count} soluciones nuevas a tu pedido de ayuda` : `${name} te propuso una solución`;
      body = `Necesito ayuda con ${data.title || 'tu pedido'}`;
      link = data.requestId ? `/ayuda/${data.requestId}` : '/ayuda';
      break;
    case 'help_accepted':
      title = `${name} eligió tu solución`;
      body = `Sumaste puntos para el ranking semanal · Necesito ayuda con ${data.title || 'un pedido'}`;
      link = data.requestId ? `/ayuda/${data.requestId}` : '/ayuda';
      break;
    case 'help_award':
      title = `¡Terminaste ${PLACE[data.place] || 'en el podio'} en el ranking semanal!`;
      body = `Semana del ${weekLabel(data.week)} · ${data.points} puntos. El reconocimiento ya está en tu perfil.`;
      link = '/perfil';
      break;
    case 'help_hidden':
      title = data.kind === 'answer' ? 'Ocultamos una de tus soluciones' : 'Ocultamos tu pedido de ayuda';
      body = data.reason ? `Motivo: ${data.reason}` : 'No cumple las reglas de la comunidad.';
      link = data.requestId ? `/ayuda/${data.requestId}` : '/ayuda';
      break;
    case 'project_restored':
      title = project ? `${project.name} vuelve a estar visible` : 'Tu proyecto vuelve a estar visible';
      body = 'Ya aparece de nuevo en Descubrir.';
      link = '/proyectos';
      break;
    case 'welcome':
      title = 'Te damos la bienvenida a KeFounder!';
      body = 'Un perfil completo recibe hasta 3 veces más conexiones.';
      link = '/perfil';
      break;
    default:
      title = data.title || 'Novedad';
      body = data.body || '';
  }

  return {
    id: row.id,
    type: row.type,
    title,
    body,
    link,
    actor: actor && !hidden ? personMini(actor) : null,
    hidden,
    createdAt: row.created_at,
    read: Boolean(row.read_at)
  };
}

// mergeOn: campo de `data` que agrupa avisos sin leer del mismo tipo (p. ej. varias soluciones al mismo pedido).
export function notify(ctx, userId, type, { actorId = null, projectId = null, matchId = null, data = {}, mergeOn = null } = {}) {
  const { db, hub } = ctx;
  const recipient = parseUser(db.get('SELECT * FROM users WHERE id = ?', [userId]));
  if (!recipient) return null;
  const category = CATEGORY[type];
  if (category && recipient.settings?.notifications?.[category] === false) return null;
  // Entre personas bloqueadas no hay avisos.
  if (actorId && actorId !== userId && isBlocked(db, actorId, userId)) return null;

  let id;
  if (type === 'message' && matchId) {
    const existing = db.get("SELECT * FROM notifications WHERE user_id = ? AND type = 'message' AND match_id = ? AND read_at IS NULL", [userId, matchId]);
    if (existing) {
      const prev = parseJson(existing.data, {});
      const merged = { ...prev, ...data, count: (prev.count || 1) + 1 };
      db.run('UPDATE notifications SET data = ?, created_at = ? WHERE id = ?', [JSON.stringify(merged), now(), existing.id]);
      id = existing.id;
    }
  }
  if (!id && mergeOn && data[mergeOn] !== undefined) {
    const existing = db.get(`SELECT * FROM notifications WHERE user_id = ? AND type = ? AND read_at IS NULL AND json_extract(data, '$.${mergeOn}') = ?`, [userId, type, data[mergeOn]]);
    if (existing) {
      const prev = parseJson(existing.data, {});
      // Si la misma persona vuelve a hacer lo mismo (por ejemplo, borra y publica otra vez), no suma.
      const count = (prev.count || 1) + (existing.actor_id === actorId ? 0 : 1);
      db.run('UPDATE notifications SET data = ?, actor_id = ?, created_at = ? WHERE id = ?', [JSON.stringify({ ...prev, ...data, count }), actorId, now(), existing.id]);
      id = existing.id;
    }
  }
  if (!id) {
    id = db.run(
      'INSERT INTO notifications (user_id, type, actor_id, project_id, match_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, type, actorId, projectId, matchId, JSON.stringify({ count: 1, ...data }), now()]
    ).lastInsertRowid;
  }
  const row = db.get('SELECT * FROM notifications WHERE id = ?', [id]);
  const notification = serializeNotification(db, recipient, row);
  hub.send(userId, 'notification', notification);
  pushCounts(ctx, userId);
  return notification;
}

// ---------- Matches y mensajes ----------

export const pair = (x, y) => (x < y ? [x, y] : [y, x]);

export function findMatch(db, x, y) {
  const [a, b] = pair(x, y);
  return db.get('SELECT * FROM matches WHERE user_a = ? AND user_b = ?', [a, b]);
}

export function serializeMessage(row) {
  if (!row) return null;
  const meta = parseJson(row.meta, {});
  if (row.kind === 'project') meta.accent = brandAccent(meta.accent, meta.projectId);
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    kind: row.kind,
    body: row.body,
    meta,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}

export function serializeMatch(ctx, match, viewerId) {
  const { db, hub } = ctx;
  const otherId = match.user_a === viewerId ? match.user_b : match.user_a;
  const other = parseUser(db.get('SELECT * FROM users WHERE id = ?', [otherId]));
  const project = match.project_id ? parseProject(db.get("SELECT * FROM projects WHERE id = ? AND moderation = 'ok'", [match.project_id])) : null;
  const otherProject = !project
    ? parseProject(db.get("SELECT * FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok' ORDER BY updated_at DESC LIMIT 1", [otherId]))
    : null;
  const last = db.get('SELECT * FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT 1', [match.id]);
  const unread = db.get('SELECT COUNT(*) AS n FROM messages WHERE match_id = ? AND sender_id != ? AND read_at IS NULL', [match.id, viewerId]).n;
  const archived = Boolean(match.user_a === viewerId ? match.archived_a : match.archived_b);
  const realMessages = db.get("SELECT COUNT(*) AS n FROM messages WHERE match_id = ? AND kind != 'system'", [match.id]).n;
  let status = 'active';
  if (archived) status = 'archived';
  else if (!realMessages) status = 'new';
  else if (last && last.sender_id !== viewerId && last.kind !== 'system') status = 'unanswered';
  return {
    id: match.id,
    other: personMini(other, hub),
    project: project ? projectMini(project) : null,
    otherProject: otherProject ? projectMini(otherProject) : null,
    origin: match.origin,
    initiatedByMe: match.initiator_id === viewerId,
    createdAt: match.created_at,
    lastMessage: serializeMessage(last),
    lastMessageAt: match.last_message_at || match.created_at,
    unread,
    status,
    archived,
    blocked: Boolean(match.blocked_by)
  };
}

export function createMatch(ctx, x, y, { projectId = null, origin = 'match', initiatorId = null, silent = false } = {}) {
  const { db, hub } = ctx;
  const [a, b] = pair(x, y);
  const existing = findMatch(db, a, b);
  if (existing) return { match: existing, created: false };
  if (isBlocked(db, a, b) || !bothActive(db, a, b)) throw notFound('Este perfil ya no está disponible.');
  const created = now();
  const id = db.run(
    'INSERT INTO matches (user_a, user_b, project_id, origin, initiator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [a, b, projectId, origin, initiatorId, created]
  ).lastInsertRowid;
  const match = db.get('SELECT * FROM matches WHERE id = ?', [id]);
  if (origin === 'match') {
    db.run("INSERT INTO messages (match_id, sender_id, kind, body, meta, created_at, read_at) VALUES (?, NULL, 'system', 'match', '{}', ?, ?)", [id, created, created]);
  }
  if (!silent) {
    for (const userId of [a, b]) {
      if (origin === 'match') {
        hub.send(userId, 'match', serializeMatch(ctx, match, userId));
        notify(ctx, userId, 'match', { actorId: userId === a ? b : a, matchId: id, projectId });
      }
    }
  }
  return { match, created: true };
}

export function postMessage(ctx, match, senderId, { kind = 'text', body = '', meta = {} }, { notifyType = 'message' } = {}) {
  const { db, hub } = ctx;
  if (match.blocked_by || isBlocked(db, match.user_a, match.user_b) || !bothActive(db, match.user_a, match.user_b)) throw new HttpError(403, 'Esta conversación no está disponible.');
  const created = now();
  const id = db.run(
    'INSERT INTO messages (match_id, sender_id, kind, body, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [match.id, senderId, kind, body, JSON.stringify(meta), created]
  ).lastInsertRowid;
  // Un mensaje nuevo desarchiva la conversación para ambas partes.
  db.run('UPDATE matches SET last_message_at = ?, archived_a = 0, archived_b = 0 WHERE id = ?', [created, match.id]);
  const message = serializeMessage(db.get('SELECT * FROM messages WHERE id = ?', [id]));
  const recipientId = match.user_a === senderId ? match.user_b : match.user_a;
  for (const userId of [match.user_a, match.user_b]) hub.send(userId, 'message', { matchId: match.id, message });

  const preview = kind === 'text' ? body.slice(0, 90)
    : kind === 'file' ? `📎 ${meta.name || 'Archivo'}`
      : kind === 'project' ? `Te compartió un proyecto: ${meta.name || ''}`
        : kind === 'meeting' ? '📅 Propuso una reunión'
          : body.slice(0, 90);
  notify(ctx, recipientId, notifyType, { actorId: senderId, matchId: match.id, data: { preview } });
  ctx.bots?.onMessage?.(match, message);
  return message;
}

export function markRead(ctx, match, readerId) {
  const at = now();
  const { changes } = ctx.db.run('UPDATE messages SET read_at = ? WHERE match_id = ? AND sender_id != ? AND read_at IS NULL', [at, match.id, readerId]);
  ctx.db.run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND match_id = ? AND type IN ('message', 'direct', 'match') AND read_at IS NULL", [at, readerId, match.id]);
  if (changes > 0) {
    const otherId = match.user_a === readerId ? match.user_b : match.user_a;
    ctx.hub.send(otherId, 'read', { matchId: match.id, at });
  }
  pushCounts(ctx, readerId);
}

// ---------- Conexiones ----------

export function interestTargetOwner(db, targetType, targetId) {
  if (targetType === 'person') {
    const user = db.get("SELECT * FROM users WHERE id = ? AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user'", [targetId]);
    if (!user) throw notFound('Este perfil ya no está disponible.');
    return { ownerId: user.id, project: null };
  }
  const project = db.get("SELECT p.* FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND u.status = 'active' AND u.visible = 1", [targetId]);
  if (!project || project.status !== 'published' || project.moderation !== 'ok') throw notFound('Este proyecto ya no está disponible.');
  return { ownerId: project.owner_id, project };
}

// Las dos cuentas de una conversación o conexión tienen que estar activas (no suspendidas).
export const bothActive = (db, x, y) => db.get("SELECT COUNT(*) AS n FROM users WHERE id IN (?, ?) AND status = 'active'", [x, y]).n === (x === y ? 1 : 2);

export function isBlocked(db, x, y) {
  return Boolean(db.get('SELECT 1 FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)', [x, y, y, x]));
}

// El estado del match refleja la tabla de bloqueos: bloqueado mientras exista
// un bloqueo en cualquiera de los dos sentidos.
export function syncBlockState(db, x, y) {
  const blocker = db.get('SELECT user_id FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?) ORDER BY created_at LIMIT 1', [x, y, y, x]);
  const [a, b] = pair(x, y);
  db.run('UPDATE matches SET blocked_by = ? WHERE user_a = ? AND user_b = ?', [blocker ? blocker.user_id : null, a, b]);
  if (blocker) {
    db.run("UPDATE interests SET status = 'declined', responded_at = ? WHERE status = 'pending' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))", [now(), x, y, y, x]);
  }
}

export function connect(ctx, user, targetType, targetId, note = '') {
  const { db } = ctx;
  if (!['person', 'project'].includes(targetType)) throw badRequest('Tipo inválido.');
  const { ownerId, project } = interestTargetOwner(db, targetType, targetId);
  if (ownerId === user.id) throw badRequest('No podés conectar con vos.');
  if (isBlocked(db, user.id, ownerId)) throw notFound('Este perfil ya no está disponible.');

  const existingMatch = findMatch(db, user.id, ownerId);
  if (existingMatch && !existingMatch.blocked_by) {
    return { status: 'matched', match: serializeMatch(ctx, existingMatch, user.id), already: true };
  }

  const existing = db.get('SELECT * FROM interests WHERE from_user_id = ? AND target_type = ? AND target_id = ?', [user.id, targetType, targetId]);
  if (existing) return { status: existing.status === 'accepted' ? 'matched' : 'pending', already: true };

  const u = usage(db, user);
  if (u.connectionsLeft !== null && u.connectionsLeft <= 0) throw paywall(user, 'connections');

  return db.tx(() => {
    db.run('DELETE FROM passes WHERE user_id = ? AND target_type = ? AND target_id = ?', [user.id, targetType, targetId]);
    const interestId = db.run(
      'INSERT INTO interests (from_user_id, to_user_id, target_type, target_id, project_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, ownerId, targetType, targetId, project?.id ?? null, note.slice(0, 280), now()]
    ).lastInsertRowid;

    // ¿La otra persona ya mostró interés? Entonces es match.
    const reciprocal = db.all("SELECT * FROM interests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'", [ownerId, user.id]);
    if (reciprocal.length) {
      const at = now();
      db.run("UPDATE interests SET status = 'accepted', responded_at = ? WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'", [at, ownerId, user.id]);
      db.run("UPDATE interests SET status = 'accepted', responded_at = ? WHERE id = ?", [at, interestId]);
      const contextProject = project?.id ?? reciprocal.find((i) => i.project_id)?.project_id ?? null;
      const { match } = createMatch(ctx, user.id, ownerId, { projectId: contextProject, initiatorId: ownerId });
      pushCounts(ctx, user.id);
      return { status: 'matched', match: serializeMatch(ctx, match, user.id), remaining: usage(db, user).connectionsLeft };
    }

    const interest = db.get('SELECT * FROM interests WHERE id = ?', [interestId]);
    notify(ctx, ownerId, 'interest', { actorId: user.id, projectId: project?.id ?? null, data: { note: note.slice(0, 140) } });
    ctx.bots?.onInterest?.(interest);
    return { status: 'pending', remaining: usage(db, user).connectionsLeft };
  });
}

export function acceptInterest(ctx, interest) {
  const { db } = ctx;
  if (isBlocked(db, interest.from_user_id, interest.to_user_id) || !bothActive(db, interest.from_user_id, interest.to_user_id)) throw notFound('Este perfil ya no está disponible.');
  return db.tx(() => {
    const at = now();
    db.run("UPDATE interests SET status = 'accepted', responded_at = ? WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'", [at, interest.from_user_id, interest.to_user_id]);
    const { match } = createMatch(ctx, interest.from_user_id, interest.to_user_id, { projectId: interest.project_id, initiatorId: interest.from_user_id });
    pushCounts(ctx, interest.to_user_id);
    return match;
  });
}

export function declineInterest(ctx, interest) {
  ctx.db.run("UPDATE interests SET status = 'declined', responded_at = ? WHERE id = ?", [now(), interest.id]);
  pushCounts(ctx, interest.to_user_id);
}

// Borra una cuenta con todo lo que depende de ella (la base borra en cascada) y sus archivos.
export function deleteUserAccount(ctx, userId) {
  const { db, config, hub } = ctx;
  // Las imágenes que usa alguna nota de la revista se conservan (quedan sin dueño).
  const inRevista = (filename) => Boolean(db.get(
    "SELECT 1 FROM articles WHERE cover = :url OR person_photo = :url OR instr(body, :url) > 0 LIMIT 1",
    { url: `/uploads/${filename}` }
  ));
  const files = db.all('SELECT filename FROM uploads WHERE user_id = ?', [userId]).filter((f) => !inRevista(f.filename));
  db.tx(() => {
    for (const { filename } of files) db.run('DELETE FROM uploads WHERE filename = ?', [filename]);
    db.run('DELETE FROM users WHERE id = ?', [userId]);
  });
  hub?.disconnect?.(userId);
  for (const { filename } of files) fs.rm(path.join(config.uploadsDir, path.basename(filename)), { force: true }, () => {});
  return files.length;
}

export { limitOf };
