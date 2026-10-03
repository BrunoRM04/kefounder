import { HELP_CATEGORIES, HELP_POINTS, labelOf } from '../shared/catalog.js';
import { now } from './db.js';
import { SAMPLE_HELP } from './help-samples.js';
import { notify } from './services.js';

// «Necesito ayuda con…»: alguien cuenta un problema, la comunidad propone soluciones y quienes
// ayudan suman puntos. El ranking es semanal (de lunes a domingo, hora del servidor) y al cerrar
// cada semana las tres primeras personas ganan un reconocimiento que queda en su perfil.
//
// Los puntos no se guardan: se calculan de las soluciones, los «Me sirvió» y las soluciones elegidas
// de la semana. Así, ocultar o borrar algo los descuenta solo. Para que nadie infle su puntaje:
// tus propias soluciones suman hasta 10 por semana, una misma persona te da hasta 30 por semana,
// el contenido de cuentas suspendidas no cuenta y el podio pide puntos de al menos dos personas.

export const HELP_STATUSES = ['open', 'solved', 'closed'];
export const categoryLabel = (id) => labelOf(HELP_CATEGORIES, id) || 'Otro tema';
const CLOSED_KEY = 'help_closed_week';

// ---------- Semanas ----------
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Clave de la semana: la fecha de su lunes (YYYY-MM-DD).
export const weekKey = (date = new Date()) => dayKey(weekStart(date));

export function shiftWeek(key, weeks) {
  const d = fromKey(key);
  d.setDate(d.getDate() + weeks * 7);
  return dayKey(d);
}

export function weekRange(key) {
  const start = fromKey(key);
  const end = fromKey(shiftWeek(key, 1));
  return { key, start: start.toISOString(), end: end.toISOString() };
}

// ---------- Estado real de un pedido ----------
// Un pedido «resuelto» deja de estarlo si la solución elegida se ocultó, se borró o es de una cuenta
// suspendida: vuelve a estar abierto para recibir otras soluciones.
export const solvedOkSql = (alias = 'r') => `EXISTS (SELECT 1 FROM help_answers sa JOIN users su ON su.id = sa.user_id
  WHERE sa.id = ${alias}.accepted_answer_id AND sa.hidden = 0 AND su.status = 'active')`;

export function effectiveStatus(db, r) {
  if (r.status !== 'solved') return r.status;
  return db.get(`SELECT ${solvedOkSql('r')} AS ok FROM help_requests r WHERE r.id = ?`, [r.id])?.ok ? 'solved' : 'open';
}

// ---------- Ranking ----------
const RANKING_SQL = `
  WITH ev AS (
    SELECT a.user_id AS uid, 0 AS src, :answerPts AS pts, 'answer' AS kind, a.created_at AS at
      FROM help_answers a JOIN help_requests r ON r.id = a.request_id JOIN users ru ON ru.id = r.user_id
     WHERE a.created_at >= :start AND a.created_at < :end AND a.hidden = 0 AND r.hidden = 0 AND a.user_id != r.user_id AND ru.status = 'active'
    UNION ALL
    SELECT a.user_id, v.user_id, :helpfulPts, 'helpful', v.created_at
      FROM help_votes v JOIN help_answers a ON a.id = v.answer_id JOIN help_requests r ON r.id = a.request_id
      JOIN users vu ON vu.id = v.user_id JOIN users ru ON ru.id = r.user_id
     WHERE v.created_at >= :start AND v.created_at < :end AND v.removed_at IS NULL AND a.hidden = 0 AND r.hidden = 0
       AND v.user_id != a.user_id AND vu.status = 'active' AND ru.status = 'active'
    UNION ALL
    SELECT a.user_id, r.user_id, :acceptedPts, 'accepted', r.accepted_at
      FROM help_requests r JOIN help_answers a ON a.id = r.accepted_answer_id JOIN users ru ON ru.id = r.user_id
     WHERE r.status = 'solved' AND r.accepted_at >= :start AND r.accepted_at < :end AND a.hidden = 0 AND r.hidden = 0
       AND r.user_id != a.user_id AND ru.status = 'active'
  ),
  per AS (
    SELECT uid, src,
      MIN(SUM(pts), CASE WHEN src = 0 THEN :selfCap ELSE :personCap END) AS pts,
      SUM(kind = 'accepted') AS accepted, SUM(kind = 'helpful') AS helpful, SUM(kind = 'answer') AS answers, MAX(at) AS last_at
    FROM ev GROUP BY uid, src
  )
  SELECT p.uid AS user_id, SUM(p.pts) AS points, SUM(p.accepted) AS accepted, SUM(p.helpful) AS helpful, SUM(p.answers) AS answers,
    SUM(p.src != 0) AS givers, MAX(p.last_at) AS last_at
    FROM per p JOIN users u ON u.id = p.uid
   WHERE u.status = 'active' AND u.role = 'user'
   GROUP BY p.uid
   ORDER BY points DESC, accepted DESC, helpful DESC, last_at ASC, p.uid ASC`;

// Todas las personas con puntos en la semana, de mayor a menor.
export function weekRanking(db, range) {
  return db.all(RANKING_SQL, {
    start: range.start,
    end: range.end,
    answerPts: HELP_POINTS.answer,
    helpfulPts: HELP_POINTS.helpful,
    acceptedPts: HELP_POINTS.accepted,
    selfCap: HELP_POINTS.answerWeeklyCap,
    personCap: HELP_POINTS.perPersonWeeklyCap
  });
}

// Para el podio: el mínimo de puntos, y que vengan de al menos dos personas distintas.
export const qualifies = (r) => r.points >= HELP_POINTS.podiumMin && r.givers >= HELP_POINTS.podiumGivers;

const usersById = (db, ids) => {
  const list = [...new Set(ids)].filter(Boolean);
  if (!list.length) return new Map();
  return new Map(db.all(`SELECT * FROM users WHERE id IN (${list.map(() => '?').join(',')})`, list).map((u) => [u.id, u]));
};

const blockedWith = (db, viewerId) => (viewerId
  ? new Set(db.all('SELECT blocked_id AS id FROM blocks WHERE user_id = ? UNION SELECT user_id FROM blocks WHERE blocked_id = ?', [viewerId, viewerId]).map((r) => r.id))
  : new Set());

// Lo mínimo para mostrar a alguien en «Necesito ayuda con…»: sin ubicación ni última conexión.
// `visible` dice si su perfil se puede abrir (lo ocultó de Descubrir o no).
export const helpPerson = (u, place = null) => (u ? { id: u.id, name: u.name, photo: u.photo, accent: u.accent, headline: u.headline, visible: Boolean(u.visible), place } : null);

// En el ranking, quien bloqueó a quien mira (o fue bloqueado) aparece sin datos.
const rankPerson = (u, blocked) => {
  if (!u) return null;
  if (blocked.has(u.id)) return { id: -u.id, name: 'Perfil no disponible', photo: '', accent: '', headline: '', visible: false, place: null };
  return helpPerson(u);
};

// ---------- Cierre semanal y podio ----------
const meta = {
  get: (db, key) => db.get('SELECT value FROM app_meta WHERE key = ?', [key])?.value,
  set: (db, key, value) => db.run('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)])
};

// Guarda el podio de una semana terminada. Si ya tiene podio, no lo toca.
export function closeWeek(db, key) {
  if (db.get('SELECT 1 FROM help_awards WHERE week = ? LIMIT 1', [key])) return [];
  const top = weekRanking(db, weekRange(key)).filter(qualifies).slice(0, 3);
  const at = now();
  top.forEach((r, i) => db.run(
    'INSERT INTO help_awards (week, place, user_id, points, accepted, helpful, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [key, i + 1, r.user_id, r.points, r.accepted, r.helpful, at]
  ));
  return top.map((r, i) => ({ userId: r.user_id, place: i + 1, week: key, points: r.points }));
}

// Cierra todas las semanas terminadas que falten, en orden. `onAward` avisa a cada persona premiada.
export function closeWeeks(db, { onAward } = {}) {
  const current = weekKey();
  let last = meta.get(db, CLOSED_KEY);
  if (!last) {
    const first = db.get('SELECT MIN(created_at) AS at FROM help_requests').at;
    last = shiftWeek(first ? weekKey(new Date(first)) : current, -1);
  }
  const awarded = [];
  for (let key = shiftWeek(last, 1); key < current; key = shiftWeek(key, 1)) {
    db.tx(() => {
      awarded.push(...closeWeek(db, key));
      meta.set(db, CLOSED_KEY, key);
    });
  }
  if (onAward) for (const a of awarded) onAward(a);
  return awarded;
}

// Desde las rutas: como mucho un intento por semana y por proceso.
export function ensureWeeksClosed(ctx) {
  const key = weekKey();
  if (ctx.helpCheckedWeek === key) return;
  closeWeeks(ctx.db, { onAward: (a) => notify(ctx, a.userId, 'help_award', { data: { place: a.place, week: a.week, points: a.points } }) });
  ctx.helpCheckedWeek = key;
}

// Podio de la semana en curso: los tres primeros que cumplen las condiciones. Después, el resto en orden.
const podiumOf = (rows) => rows.filter(qualifies).slice(0, 3);

// Dónde está alguien y cuánto le falta para el podio de la semana en curso.
function standing(rows, userId) {
  const podium = podiumOf(rows);
  const rest = rows.filter((r) => !podium.includes(r));
  const mine = rows.find((r) => r.user_id === userId) || null;
  const podiumIndex = mine ? podium.indexOf(mine) : -1;
  const rank = !mine ? null : podiumIndex >= 0 ? podiumIndex + 1 : podium.length + rest.indexOf(mine) + 1;
  if (podiumIndex >= 0) return { rank, inPodium: true, toPodium: 0, needsGivers: false };
  const points = mine?.points || 0;
  const target = podium.length < 3 ? HELP_POINTS.podiumMin : Math.max(HELP_POINTS.podiumMin, podium[2].points + 1);
  // Con los puntos alcanzaría, pero vienen de una sola persona.
  return { rank, inPodium: false, toPodium: Math.max(0, target - points), needsGivers: points >= target };
}

// Podios de las últimas semanas cerradas.
export function recentPodiums(db, weeks = 6, { includeRevoked = false, viewerId = null } = {}) {
  const keys = db.all('SELECT DISTINCT week FROM help_awards ORDER BY week DESC LIMIT ?', [weeks]).map((r) => r.week);
  if (!keys.length) return [];
  const rows = db.all(`SELECT * FROM help_awards WHERE week IN (${keys.map(() => '?').join(',')}) ${includeRevoked ? '' : 'AND revoked_at IS NULL'} ORDER BY week DESC, place`, keys);
  const users = usersById(db, rows.map((r) => r.user_id));
  const blocked = blockedWith(db, viewerId);
  return keys.map((key) => ({
    ...weekRange(key),
    winners: rows.filter((r) => r.week === key).map((r) => ({
      id: r.id, place: r.place, points: r.points, accepted: r.accepted, helpful: r.helpful,
      revoked: Boolean(r.revoked_at), revokedReason: r.revoked_reason,
      user: rankPerson(users.get(r.user_id), blocked) || { id: -r.user_id, name: 'Cuenta eliminada', visible: false }
    }))
  }));
}

// ---------- Ranking para la app ----------
export function rankingPayload(db, viewer, which = 'current') {
  const currentKey = weekKey();
  const key = which === 'last' ? shiftWeek(currentKey, -1) : currentKey;
  const range = weekRange(key);
  const closed = key < currentKey;
  const rows = weekRanking(db, range);
  const blocked = blockedWith(db, viewer?.id);
  // Semana cerrada: el podio es el que se entregó (aunque después se haya ocultado algo).
  // Los puestos anulados quedan vacíos y quien los tenía sale de la lista.
  const allAwards = closed ? db.all('SELECT * FROM help_awards WHERE week = ? ORDER BY place', [key]) : [];
  const awards = allAwards.filter((a) => !a.revoked_at);
  const awardedIds = new Set(allAwards.map((a) => a.user_id));
  const podiumRows = closed ? [] : podiumOf(rows);
  const rest = closed ? rows.filter((r) => !awardedIds.has(r.user_id)) : rows.filter((r) => !podiumRows.includes(r));
  // La lista sigue después del último puesto del podio (si se anuló un puesto, no se repite el número).
  const offset = closed ? Math.max(0, ...allAwards.map((a) => a.place)) : podiumRows.length;
  const users = usersById(db, [...allAwards.map((a) => a.user_id), ...rows.slice(0, 60).map((r) => r.user_id)]);

  const podium = (closed
    ? awards.map((a) => ({ rank: a.place, place: a.place, points: a.points, accepted: a.accepted, helpful: a.helpful, user: rankPerson(users.get(a.user_id), blocked) }))
    : podiumRows.map((r, i) => ({ rank: i + 1, place: i + 1, points: r.points, accepted: r.accepted, helpful: r.helpful, user: rankPerson(users.get(r.user_id), blocked) }))
  ).filter((x) => x.user);
  const items = rest.slice(0, 50).map((r, i) => ({
    rank: offset + i + 1,
    points: r.points,
    accepted: r.accepted,
    helpful: r.helpful,
    answers: r.answers,
    user: rankPerson(users.get(r.user_id), blocked)
  })).filter((x) => x.user);

  let me = null;
  if (viewer) {
    const mine = rows.find((r) => r.user_id === viewer.id) || null;
    const award = awards.find((a) => a.user_id === viewer.id);
    const restIndex = rest.indexOf(mine);
    const live = closed ? null : standing(rows, viewer.id);
    me = {
      rank: award ? award.place : closed ? (restIndex >= 0 ? offset + restIndex + 1 : null) : live.rank,
      points: award ? award.points : mine?.points || 0,
      accepted: mine?.accepted || 0,
      helpful: mine?.helpful || 0,
      answers: mine?.answers || 0,
      place: award?.place || null,
      inPodium: closed ? Boolean(award) : live.inPodium,
      toPodium: closed ? 0 : live.toPodium,
      needsGivers: closed ? false : live.needsGivers
    };
  }
  return {
    week: { key, start: range.start, end: range.end, closed },
    podium,
    items,
    total: rows.length,
    me,
    podiumMin: HELP_POINTS.podiumMin,
    history: recentPodiums(db, 6, { viewerId: viewer?.id })
  };
}

// ---------- Perfil: reconocimientos y números ----------
export function helpProfile(db, userId, { self = false } = {}) {
  const awards = db.all('SELECT * FROM help_awards WHERE user_id = ? AND revoked_at IS NULL ORDER BY week DESC, place', [userId])
    .map((a) => ({ id: a.id, place: a.place, points: a.points, ...weekRange(a.week) }));
  const visible = "a.hidden = 0 AND r.hidden = 0 AND ru.status = 'active'";
  const base = 'FROM help_answers a JOIN help_requests r ON r.id = a.request_id JOIN users ru ON ru.id = r.user_id';
  const stats = {
    answers: db.get(`SELECT COUNT(*) AS n ${base} WHERE a.user_id = ? AND ${visible}`, [userId]).n,
    accepted: db.get(`SELECT COUNT(*) AS n ${base} WHERE a.user_id = ? AND r.accepted_answer_id = a.id AND r.status = 'solved' AND r.user_id != a.user_id AND ${visible}`, [userId]).n,
    helpful: db.get(`SELECT COUNT(*) AS n FROM help_votes v JOIN users vu ON vu.id = v.user_id JOIN help_answers a ON a.id = v.answer_id JOIN help_requests r ON r.id = a.request_id JOIN users ru ON ru.id = r.user_id
      WHERE a.user_id = ? AND v.user_id != a.user_id AND v.removed_at IS NULL AND vu.status = 'active' AND ${visible}`, [userId]).n,
    podiums: { 1: 0, 2: 0, 3: 0 }
  };
  for (const a of awards) stats.podiums[a.place] += 1;
  const out = { awards, stats };
  if (self) {
    const rows = weekRanking(db, weekRange(weekKey()));
    out.week = {
      ...weekRange(weekKey()),
      points: rows.find((r) => r.user_id === userId)?.points || 0,
      total: rows.length,
      ...standing(rows, userId)
    };
  }
  return out;
}

// Mejor puesto reciente (últimas 4 semanas cerradas) de cada persona: la medalla junto a su nombre.
export function recentPlaces(db, userIds) {
  const list = [...new Set(userIds)].filter(Boolean);
  if (!list.length) return new Map();
  const since = shiftWeek(weekKey(), -4);
  const rows = db.all(
    `SELECT user_id, MIN(place) AS place FROM help_awards WHERE revoked_at IS NULL AND week >= ? AND user_id IN (${list.map(() => '?').join(',')}) GROUP BY user_id`,
    [since, ...list]
  );
  return new Map(rows.map((r) => [r.user_id, r.place]));
}

// ---------- Pedidos y soluciones ----------
// Lo que ve cada persona: sin contenido oculto, sin cuentas suspendidas y sin quienes se bloquearon.
export const notBlockedSql = (column) => `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :me AND b.blocked_id = ${column}) OR (b.user_id = ${column} AND b.blocked_id = :me))`;
export const visibleRequestSql = (alias = 'r', author = 'u') => `${alias}.hidden = 0 AND ${author}.status = 'active' AND ${notBlockedSql(`${alias}.user_id`)}`;

export const excerpt = (text, max = 180) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

export function requestCard(row, author, { meId, places } = {}) {
  return {
    id: row.id,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    title: row.title,
    excerpt: excerpt(row.body),
    status: row.eff_status || row.status,
    hidden: Boolean(row.hidden),
    author: helpPerson(author, places?.get(author?.id) || null),
    answers: row.answers ?? 0,
    answeredByMe: Boolean(row.answered),
    mine: row.user_id === meId,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at
  };
}

// ---------- Ejemplos para la demo ----------
export function removeSampleHelp(db) {
  return db.run('DELETE FROM help_requests WHERE is_sample = 1').changes;
}

// Carga los pedidos de ejemplo una sola vez (si después se borran, no vuelven).
export function ensureSampleHelp(db, { force = false } = {}) {
  if (!force && meta.get(db, 'help_samples')) return 0;
  const userId = (key) => db.get('SELECT id FROM users WHERE email IN (?, ?)', [`${key}@kefounder.demo`, `${key}@demo.kefounder`])?.id;
  const current = weekStart();
  const lastStart = weekStart(new Date(current.getTime() - 3 * 86400000));
  const nowMs = Date.now();
  // Fracción de la semana → fecha. En la semana en curso, entre el lunes y este momento.
  const when = (week, f) => {
    if (week === 'last') return new Date(lastStart.getTime() + f * (current.getTime() - lastStart.getTime())).toISOString();
    return new Date(current.getTime() + f * Math.max(60000, nowMs - current.getTime() - 60000)).toISOString();
  };
  let created = 0;
  db.tx(() => {
    for (const s of SAMPLE_HELP) {
      const author = userId(s.user);
      if (!author) continue;
      const at = when(s.week, s.at);
      const requestId = db.run(
        `INSERT INTO help_requests (user_id, category, title, body, status, is_sample, created_at, updated_at, last_activity_at)
         VALUES (?, ?, ?, ?, 'open', 1, ?, ?, ?)`,
        [author, s.category, s.title, s.body, at, at, at]
      ).lastInsertRowid;
      let last = at;
      for (const a of s.answers) {
        const helper = userId(a.user);
        if (!helper || helper === author) continue;
        const answerAt = when(s.week, a.at);
        const answerId = db.run('INSERT INTO help_answers (request_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [requestId, helper, a.body, answerAt, answerAt]).lastInsertRowid;
        if (answerAt > last) last = answerAt;
        for (const [voter, f] of a.votes || []) {
          const voterId = userId(voter);
          if (voterId && voterId !== helper) db.run('INSERT OR IGNORE INTO help_votes (answer_id, user_id, created_at) VALUES (?, ?, ?)', [answerId, voterId, when(s.week, f)]);
        }
        if (a.accepted && s.acceptedAt) {
          const acceptedAt = when(s.week, s.acceptedAt);
          db.run("UPDATE help_requests SET status = 'solved', accepted_answer_id = ?, accepted_at = ? WHERE id = ?", [answerId, acceptedAt, requestId]);
          if (acceptedAt > last) last = acceptedAt;
        }
      }
      db.run('UPDATE help_requests SET last_activity_at = ?, updated_at = ? WHERE id = ?', [last, last, requestId]);
      created += 1;
    }
    meta.set(db, 'help_samples', now());
    // Si la semana de los ejemplos ya figuraba como cerrada (demo reiniciada), se vuelve a revisar:
    // las semanas que ya tienen podio no se tocan.
    const closed = meta.get(db, CLOSED_KEY);
    const firstWeek = dayKey(lastStart);
    if (closed && closed >= firstWeek) meta.set(db, CLOSED_KEY, shiftWeek(firstWeek, -1));
  });
  return created;
}
