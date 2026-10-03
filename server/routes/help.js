import { HELP_CATEGORIES } from '../../shared/catalog.js';
import { requireOnboarded } from '../auth.js';
import { now } from '../db.js';
import { categoryLabel, effectiveStatus, ensureWeeksClosed, helpPerson, helpProfile, notBlockedSql, rankingPayload, recentPlaces, requestCard, solvedOkSql, visibleRequestSql } from '../help.js';
import { isBlocked, notify, pushCounts } from '../services.js';
import { HttpError, badRequest, forbidden, idParam, notFound, oneOf, str } from '../utils.js';

const PAGE = 20;
const REQUESTS_PER_DAY = 3;
const ANSWERS_PER_DAY = 20;
const PREFIX_RE = /^\s*(yo\s+)?necesito\s+ayuda\s+con\s*/i;
const CURSOR_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)~(\d+)$/;

// Búsqueda sin tildes ni mayúsculas (igual que la función fold() de la base).
const fold = (value) => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const likeTerm = (q) => `%${fold(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// El título se muestra después de «Necesito ayuda con…»: si lo escribieron completo, se quita.
function cleanTitle(value) {
  const title = str(value, 160).replace(PREFIX_RE, '').replace(/[.…\s]+$/, '').trim();
  if (title.length < 8) throw badRequest('Contá en pocas palabras con qué necesitás ayuda.', { field: 'title' });
  if (title.length > 120) throw badRequest('El título puede tener hasta 120 caracteres.', { field: 'title' });
  return title;
}

function cleanBody(value, { min, field = 'body', message }) {
  const body = str(value, 2000);
  if (body.length < min) throw badRequest(message, { field });
  return body;
}

export default function helpRoutes(router, ctx) {
  const { db } = ctx;

  // `status` es el estado real: un «resuelto» cuya solución ya no se ve vuelve a estar abierto.
  const loadRequest = (id, me) => {
    const r = db.get('SELECT r.*, u.status AS author_status FROM help_requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?', [id]);
    // El contenido oculto lo sigue viendo solo quien lo publicó (con el aviso de moderación).
    if (!r || (r.user_id !== me.id && (r.hidden || r.author_status !== 'active' || isBlocked(db, me.id, r.user_id)))) throw notFound('Este pedido de ayuda ya no está disponible.');
    return { ...r, stored_status: r.status, status: effectiveStatus(db, r) };
  };

  const loadAnswer = (id, me) => {
    const a = db.get('SELECT * FROM help_answers WHERE id = ?', [id]);
    if (!a) throw notFound('Esta solución ya no está disponible.');
    const r = loadRequest(a.request_id, me);
    if (a.user_id !== me.id && (a.hidden || isBlocked(db, me.id, a.user_id))) throw notFound('Esta solución ya no está disponible.');
    return { a, r };
  };

  const touch = (requestId, at = now()) => db.run('UPDATE help_requests SET last_activity_at = ? WHERE id = ?', [at, requestId]);

  // Soluciones que cuentan para todos (sin mirar bloqueos): con ellas el pedido ya no se puede editar ni borrar.
  const publicAnswers = (requestId) => db.get(
    "SELECT COUNT(*) AS n FROM help_answers a JOIN users u ON u.id = a.user_id WHERE a.request_id = ? AND a.hidden = 0 AND u.status = 'active'",
    [requestId]
  ).n;

  function detail(r, me) {
    const author = db.get('SELECT * FROM users WHERE id = ?', [r.user_id]);
    const isAuthor = r.user_id === me.id;
    const solved = r.status === 'solved';
    const answers = db.all(
      `SELECT a.*,
         (SELECT COUNT(*) FROM help_votes v JOIN users vu ON vu.id = v.user_id
           WHERE v.answer_id = a.id AND v.user_id != a.user_id AND v.removed_at IS NULL AND vu.status = 'active') AS votes,
         EXISTS (SELECT 1 FROM help_votes v WHERE v.answer_id = a.id AND v.user_id = :me AND v.removed_at IS NULL) AS voted
       FROM help_answers a JOIN users u ON u.id = a.user_id
       WHERE a.request_id = :id AND u.status = 'active' AND (a.hidden = 0 OR a.user_id = :me) AND ${notBlockedSql('a.user_id')}
       ORDER BY (a.id = :accepted) DESC, votes DESC, a.created_at ASC, a.id ASC`,
      { me: me.id, id: r.id, accepted: solved ? r.accepted_answer_id : 0 }
    );
    const helpers = new Map(db.all(`SELECT * FROM users WHERE id IN (${[0, ...answers.map((a) => a.user_id)].join(',')})`).map((u) => [u.id, u]));
    const places = recentPlaces(db, [r.user_id, ...answers.map((a) => a.user_id)]);
    const mine = answers.find((a) => a.user_id === me.id);
    const locked = publicAnswers(r.id) > 0;
    return {
      request: {
        id: r.id,
        category: r.category,
        categoryLabel: categoryLabel(r.category),
        title: r.title,
        body: r.body,
        status: r.status,
        hidden: Boolean(r.hidden),
        hiddenReason: isAuthor ? r.hidden_reason : '',
        acceptedAnswerId: solved ? r.accepted_answer_id : null,
        author: helpPerson(author, places.get(r.user_id) || null),
        mine: isAuthor,
        createdAt: r.created_at
      },
      answers: answers.map((a) => ({
        id: a.id,
        body: a.body,
        author: helpPerson(helpers.get(a.user_id), places.get(a.user_id) || null),
        votes: a.votes,
        voted: Boolean(a.voted),
        mine: a.user_id === me.id,
        accepted: solved && a.id === r.accepted_answer_id,
        hidden: Boolean(a.hidden),
        hiddenReason: a.user_id === me.id ? a.hidden_reason : '',
        createdAt: a.created_at,
        editedAt: a.edited_at
      })),
      viewer: {
        canAnswer: !isAuthor && !mine && r.status === 'open' && !r.hidden,
        myAnswerId: mine?.id || null,
        canEdit: isAuthor && !r.hidden && !locked,
        canDelete: isAuthor && !locked,
        canClose: isAuthor && r.status === 'open' && !r.hidden,
        canReopen: isAuthor && r.status === 'closed' && !r.hidden,
        canAccept: isAuthor && !r.hidden && r.status !== 'closed'
      }
    };
  }

  // Al abrir tu pedido, los avisos de soluciones nuevas quedan leídos.
  const readNotices = (r, me) => {
    if (r.user_id !== me.id) return;
    const { changes } = db.run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND type = 'help_answer' AND json_extract(data, '$.requestId') = ? AND read_at IS NULL", [now(), me.id, r.id]);
    if (changes) pushCounts(ctx, me.id);
  };

  // ---------- Lista ----------
  router.get('/help', requireOnboarded, (req, res) => {
    ensureWeeksClosed(ctx);
    const me = req.user;
    const tab = oneOf(req.query.tab, ['open', 'unanswered', 'solved', 'mine'], 'open');
    const category = oneOf(req.query.category, HELP_CATEGORIES, '');
    const q = str(req.query.q, 80);
    const params = { me: me.id };
    const visible = visibleRequestSql('r', 'u');
    const solvedOk = solvedOkSql('r');
    const open = `(r.status = 'open' OR (r.status = 'solved' AND NOT ${solvedOk}))`;
    const answered = `EXISTS (SELECT 1 FROM help_answers a JOIN users au ON au.id = a.user_id WHERE a.request_id = r.id AND a.hidden = 0 AND au.status = 'active')`;
    const tabs = {
      open: `${visible} AND ${open}`,
      unanswered: `${visible} AND ${open} AND NOT ${answered}`,
      solved: `${visible} AND r.status = 'solved' AND ${solvedOk}`,
      // Lo propio se ve siempre, aunque esté oculto por moderación.
      mine: 'r.user_id = :me'
    };
    const filters = [];
    if (category) { filters.push('r.category = :category'); params.category = category; }
    if (q) { filters.push("fold(r.title || ' ' || r.body) LIKE :q ESCAPE '\\'"); params.q = likeTerm(q); }
    const extra = filters.length ? ` AND ${filters.join(' AND ')}` : '';
    // Paginación por cursor (fecha + id): si algo cambia de lugar mientras se lee, no se repite ni se saltea.
    const column = { open: 'r.last_activity_at', unanswered: 'r.created_at', solved: 'r.accepted_at', mine: 'r.created_at' }[tab];
    const cursor = CURSOR_RE.exec(String(req.query.cursor || ''));
    const after = cursor ? ` AND (${column} < :cv OR (${column} = :cv AND r.id < :cid))` : '';
    if (cursor) { params.cv = cursor[1]; params.cid = Number(cursor[2]); }

    const rows = db.all(
      `SELECT r.*, ${column} AS sort_value,
         CASE WHEN r.status = 'solved' AND NOT ${solvedOk} THEN 'open' ELSE r.status END AS eff_status,
         (SELECT COUNT(*) FROM help_answers a JOIN users au ON au.id = a.user_id
           WHERE a.request_id = r.id AND a.hidden = 0 AND au.status = 'active' AND ${notBlockedSql('a.user_id')}) AS answers,
         EXISTS (SELECT 1 FROM help_answers a WHERE a.request_id = r.id AND a.user_id = :me) AS answered
       FROM help_requests r JOIN users u ON u.id = r.user_id
       WHERE ${tabs[tab]}${extra}${after}
       ORDER BY ${column} DESC, r.id DESC LIMIT :limit`,
      { ...params, limit: PAGE + 1 }
    );
    const page = rows.slice(0, PAGE);
    const counts = {};
    const countParams = { me: me.id, ...(params.category ? { category: params.category } : {}), ...(params.q ? { q: params.q } : {}) };
    for (const [key, sql] of Object.entries(tabs)) {
      counts[key] = db.get(`SELECT COUNT(*) AS n FROM help_requests r JOIN users u ON u.id = r.user_id WHERE ${sql}${extra}`, countParams).n;
    }
    const authors = new Map(db.all(`SELECT * FROM users WHERE id IN (${[0, ...page.map((r) => r.user_id)].join(',')})`).map((u) => [u.id, u]));
    const places = recentPlaces(db, [...authors.keys()]);
    // Lo nuevo desde la última visita deja de marcarse en la barra superior.
    if (!cursor) db.run("UPDATE users SET settings = json_set(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.helpSeenAt', ?) WHERE id = ?", [now(), me.id]);
    const last = page[page.length - 1];
    res.json({
      items: page.map((r) => requestCard(r, authors.get(r.user_id), { meId: me.id, places })),
      nextCursor: rows.length > PAGE && last ? `${last.sort_value}~${last.id}` : null,
      counts
    });
  });

  router.post('/help', requireOnboarded, (req, res) => {
    const me = req.user;
    const body = req.body ?? {};
    const category = oneOf(body.category, HELP_CATEGORIES, '');
    if (!category) throw badRequest('Elegí de qué tema se trata.', { field: 'category' });
    const title = cleanTitle(body.title);
    const text = cleanBody(body.body, { min: 30, message: 'Contá un poco más: el contexto ayuda a que te den mejores soluciones.' });
    const today = db.get('SELECT COUNT(*) AS n FROM help_requests WHERE user_id = ? AND created_at >= ?', [me.id, new Date(Date.now() - 86400000).toISOString()]).n;
    if (today >= REQUESTS_PER_DAY) throw new HttpError(429, `Podés publicar hasta ${REQUESTS_PER_DAY} pedidos de ayuda por día. Probá de nuevo mañana.`);
    const at = now();
    const id = db.run(
      'INSERT INTO help_requests (user_id, category, title, body, created_at, updated_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [me.id, category, title, text, at, at, at]
    ).lastInsertRowid;
    res.status(201).json(detail(loadRequest(id, me), me));
  });

  // ---------- Ranking y perfiles ----------
  router.get('/help/ranking', requireOnboarded, (req, res) => {
    ensureWeeksClosed(ctx);
    const which = oneOf(req.query.week, ['current', 'last'], 'current');
    res.json(rankingPayload(db, req.user, which));
  });

  router.get('/help/people/:id', requireOnboarded, (req, res) => {
    ensureWeeksClosed(ctx);
    const me = req.user;
    const id = req.params.id === 'me' ? me.id : idParam(req.params.id);
    if (id !== me.id) {
      const u = db.get("SELECT * FROM users WHERE id = ? AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user'", [id]);
      if (!u || isBlocked(db, me.id, id)) throw notFound('Este perfil ya no está disponible.');
    }
    res.json(helpProfile(db, id, { self: id === me.id }));
  });

  // ---------- Soluciones ----------
  router.put('/help/answers/:id', requireOnboarded, (req, res) => {
    const me = req.user;
    const { a, r } = loadAnswer(idParam(req.params.id), me);
    if (a.user_id !== me.id) throw forbidden();
    if (r.status === 'solved' && a.id === r.accepted_answer_id) throw badRequest('Esta solución ya fue elegida: no se puede editar.');
    const text = cleanBody(req.body?.body, { min: 20, message: 'Escribí tu solución con un poco más de detalle.' });
    const at = now();
    db.run('UPDATE help_answers SET body = ?, updated_at = ?, edited_at = ? WHERE id = ?', [text, at, at, a.id]);
    res.json(detail(loadRequest(r.id, me), me));
  });

  router.delete('/help/answers/:id', requireOnboarded, (req, res) => {
    const me = req.user;
    const { a, r } = loadAnswer(idParam(req.params.id), me);
    if (a.user_id !== me.id) throw forbidden();
    if (r.status === 'solved' && a.id === r.accepted_answer_id) throw badRequest('Esta solución ya fue elegida: no se puede borrar.');
    db.run('DELETE FROM help_answers WHERE id = ?', [a.id]);
    res.json(detail(loadRequest(r.id, me), me));
  });

  // «Me sirvió»: se marca y se desmarca. No se puede votar lo propio. Al desmarcar, el voto queda
  // guardado como quitado: si se vuelve a marcar conserva su fecha original (no se «recicla» en otra semana).
  router.post('/help/answers/:id/vote', requireOnboarded, (req, res) => {
    const me = req.user;
    const { a, r } = loadAnswer(idParam(req.params.id), me);
    if (a.user_id === me.id) throw badRequest('No podés votar tu propia solución.');
    if (a.hidden || r.hidden) throw notFound('Esta solución ya no está disponible.');
    const existing = db.get('SELECT removed_at FROM help_votes WHERE answer_id = ? AND user_id = ?', [a.id, me.id]);
    if (!existing) db.run('INSERT INTO help_votes (answer_id, user_id, created_at) VALUES (?, ?, ?)', [a.id, me.id, now()]);
    else db.run('UPDATE help_votes SET removed_at = ? WHERE answer_id = ? AND user_id = ?', [existing.removed_at ? null : now(), a.id, me.id]);
    res.json(detail(loadRequest(r.id, me), me));
  });

  // ---------- Detalle de un pedido ----------
  router.get('/help/:id', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    readNotices(r, me);
    res.json(detail(r, me));
  });

  // Mientras nadie respondió, quien pidió ayuda puede corregir el pedido.
  router.put('/help/:id', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    if (r.user_id !== me.id) throw forbidden();
    if (!detail(r, me).viewer.canEdit) throw badRequest('Ya hay soluciones publicadas: el pedido no se puede cambiar. Podés cerrarlo y publicar otro.');
    const body = req.body ?? {};
    const category = oneOf(body.category, HELP_CATEGORIES, '');
    if (!category) throw badRequest('Elegí de qué tema se trata.', { field: 'category' });
    const title = cleanTitle(body.title);
    const text = cleanBody(body.body, { min: 30, message: 'Contá un poco más: el contexto ayuda a que te den mejores soluciones.' });
    db.run('UPDATE help_requests SET category = ?, title = ?, body = ?, updated_at = ? WHERE id = ?', [category, title, text, now(), r.id]);
    res.json(detail(loadRequest(r.id, me), me));
  });

  router.delete('/help/:id', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    if (r.user_id !== me.id) throw forbidden();
    if (!detail(r, me).viewer.canDelete) throw badRequest('Ya hay soluciones publicadas: en lugar de borrarlo, podés cerrarlo.');
    db.run('DELETE FROM help_requests WHERE id = ?', [r.id]);
    res.json({ ok: true });
  });

  // Cerrar sin elegir (ya no recibe soluciones) o volver a abrirlo.
  router.post('/help/:id/status', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    if (r.user_id !== me.id) throw forbidden();
    const status = oneOf(req.body?.status, ['open', 'closed'], '');
    if (!status) throw badRequest('Estado inválido.');
    if (r.status === 'solved') throw badRequest('Este pedido ya tiene una solución elegida.');
    if (r.hidden) throw badRequest('Este pedido está oculto por moderación.');
    db.run('UPDATE help_requests SET status = ?, updated_at = ? WHERE id = ?', [status, now(), r.id]);
    res.json(detail(loadRequest(r.id, me), me));
  });

  router.post('/help/:id/answers', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    if (r.user_id === me.id) throw badRequest('No podés responder tu propio pedido: esperá las soluciones de la comunidad.');
    if (r.hidden) throw notFound('Este pedido de ayuda ya no está disponible.');
    if (r.status !== 'open') throw badRequest('Este pedido ya no recibe soluciones.');
    if (db.get('SELECT 1 FROM help_answers WHERE request_id = ? AND user_id = ?', [r.id, me.id])) throw badRequest('Ya publicaste una solución en este pedido: podés editarla.');
    const text = cleanBody(req.body?.body, { min: 20, message: 'Escribí tu solución con un poco más de detalle.' });
    const today = db.get('SELECT COUNT(*) AS n FROM help_answers WHERE user_id = ? AND created_at >= ?', [me.id, new Date(Date.now() - 86400000).toISOString()]).n;
    if (today >= ANSWERS_PER_DAY) throw new HttpError(429, 'Llegaste al máximo de soluciones por hoy. ¡Gracias por ayudar tanto! Seguí mañana.');
    const at = now();
    db.run('INSERT INTO help_answers (request_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [r.id, me.id, text, at, at]);
    // Si un pedido ya resuelto volvió a abrirse (su solución elegida ya no se ve), queda abierto de verdad.
    db.run("UPDATE help_requests SET status = 'open' WHERE id = ? AND status = 'solved'", [r.id]);
    touch(r.id, at);
    notify(ctx, r.user_id, 'help_answer', { actorId: me.id, data: { requestId: r.id, title: r.title }, mergeOn: 'requestId' });
    res.status(201).json(detail(loadRequest(r.id, me), me));
  });

  // Quien pidió ayuda elige la solución que le sirvió (o deshace la elección).
  // Deshacer deja el pedido abierto pero recuerda la elección: si vuelve a elegir la misma solución,
  // se conserva la fecha original y no se avisa de nuevo.
  router.post('/help/:id/accept', requireOnboarded, (req, res) => {
    const me = req.user;
    const r = loadRequest(idParam(req.params.id), me);
    if (r.user_id !== me.id) throw forbidden('Solo quien pidió ayuda puede elegir la solución.');
    if (r.hidden) throw badRequest('Este pedido está oculto por moderación.');
    if (r.status === 'closed') throw badRequest('Volvé a abrir el pedido para elegir una solución.');
    const at = now();
    if (req.body?.answerId === null) {
      db.run("UPDATE help_requests SET status = 'open', updated_at = ? WHERE id = ? AND status = 'solved'", [at, r.id]);
      return res.json(detail(loadRequest(r.id, me), me));
    }
    const answer = db.get('SELECT * FROM help_answers WHERE id = ? AND request_id = ? AND hidden = 0', [idParam(req.body?.answerId), r.id]);
    if (!answer || !db.get("SELECT 1 FROM users WHERE id = ? AND status = 'active'", [answer.user_id]) || isBlocked(db, me.id, answer.user_id)) {
      throw notFound('Esta solución ya no está disponible.');
    }
    if (answer.id === r.accepted_answer_id) {
      if (r.status !== 'solved') db.run("UPDATE help_requests SET status = 'solved', updated_at = ?, last_activity_at = ? WHERE id = ?", [at, at, r.id]);
      return res.json(detail(loadRequest(r.id, me), me));
    }
    db.run("UPDATE help_requests SET status = 'solved', accepted_answer_id = ?, accepted_at = ?, updated_at = ?, last_activity_at = ? WHERE id = ?", [answer.id, at, at, at, r.id]);
    notify(ctx, answer.user_id, 'help_accepted', { actorId: me.id, data: { requestId: r.id, title: r.title } });
    res.json(detail(loadRequest(r.id, me), me));
  });
}
