import crypto from 'node:crypto';
import { AVAILABILITY, COMPENSATION, COUNTRIES, GOALS, INDUSTRIES, LANGUAGES, ROLES, WORK_MODES } from '../../shared/catalog.js';
import { clearSessionCookie, hashPassword, requireAuth, requireOnboarded, sessionHash, verifyPassword } from '../auth.js';
import { personCompat } from '../compat.js';
import { now } from '../db.js';
import { requireFeature } from '../plans.js';
import { parseProject, parseUser, personMini, projectMini } from '../serializers.js';
import { deleteUserAccount, notify, syncBlockState } from '../services.js';
import { EMAIL_RE, HttpError, badRequest, notFound, daysAgo, idParam, imageUrl, intOrNull, oneOf, safeUrl, str, strList } from '../utils.js';
import { mePayload } from './auth.js';

// Convierte el cuerpo de la petición en columnas válidas. Solo toca lo que viene.
function profileColumns(db, user, body) {
  const cols = {};
  if ('name' in body) {
    const name = str(body.name, 80);
    if (name.length < 2) throw badRequest('Contanos tu nombre.', { field: 'name' });
    cols.name = name;
  }
  if ('headline' in body) cols.headline = str(body.headline, 80);
  if ('photo' in body) {
    const photo = body.photo === user.photo ? user.photo : imageUrl(db, user.id, body.photo);
    if (photo === null) throw badRequest('La foto no es válida.', { field: 'photo' });
    cols.photo = photo;
  }
  if ('city' in body) cols.city = str(body.city, 60);
  if ('country' in body) cols.country = oneOf(body.country, COUNTRIES, str(body.country, 40));
  if ('bio' in body) cols.bio = str(body.bio, 400);
  if ('goal' in body) cols.goal = oneOf(body.goal, GOALS, '');
  if ('roles' in body) cols.roles = JSON.stringify(strList(body.roles, { max: 5, allowed: ROLES.map((r) => r.id) }));
  if ('skills' in body) cols.skills = JSON.stringify(strList(body.skills, { max: 12, itemMax: 32 }));
  if ('interests' in body) cols.interests = JSON.stringify(strList(body.interests, { max: 8, allowed: INDUSTRIES }));
  if ('languages' in body) cols.languages = JSON.stringify(strList(body.languages, { max: 6, allowed: LANGUAGES }));
  if ('availability' in body) cols.availability = oneOf(body.availability, AVAILABILITY, '');
  if ('compensation' in body) cols.compensation = oneOf(body.compensation, COMPENSATION, '');
  if ('lookingFor' in body) cols.looking_for = str(body.lookingFor, 140);
  if ('workMode' in body) {
    cols.work_mode = oneOf(body.workMode, WORK_MODES, '');
    cols.work_mode_confirmed = cols.work_mode ? 1 : 0;
  }
  if ('experienceYears' in body) cols.experience_years = intOrNull(body.experienceYears, 0, 60);
  if ('experience' in body) {
    const list = Array.isArray(body.experience) ? body.experience : [];
    cols.experience = JSON.stringify(list.slice(0, 6).map((item) => ({
      title: str(item?.title, 80), org: str(item?.org, 80), period: str(item?.period, 40)
    })).filter((item) => item.title));
  }
  if ('age' in body) cols.age = intOrNull(body.age, 16, 99);
  if ('showAge' in body) cols.show_age = body.showAge ? 1 : 0;
  if ('timezone' in body) cols.timezone = str(body.timezone, 60);
  if (body.links && typeof body.links === 'object') {
    for (const key of ['linkedin', 'github', 'portfolio']) {
      if (key in body.links) {
        const url = safeUrl(body.links[key]);
        if (body.links[key] && !url) throw badRequest('Revisá el enlace ingresado.', { field: key });
        cols[key] = url;
      }
    }
  }
  return cols;
}

const CODE_TTL_MS = 15 * 60 * 1000;
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const updateUser = (db, userId, cols) => {
  const keys = Object.keys(cols);
  if (!keys.length) return;
  db.run(`UPDATE users SET ${keys.map((k) => `${k} = :${k}`).join(', ')} WHERE id = :id`, { ...cols, id: userId });
};

export default function profileRoutes(router, ctx) {
  const { db, hub } = ctx;

  router.put('/me/onboarding', requireAuth, (req, res) => {
    if (req.user.role === 'admin') throw new HttpError(403, 'La cuenta de administración no tiene perfil público.');
    const body = req.body ?? {};
    const cols = profileColumns(db, req.user, body);
    if (!cols.goal) throw badRequest('Elegí qué estás buscando.', { field: 'goal' });
    if (!cols.roles || cols.roles === '[]') throw badRequest('Elegí al menos un rol.', { field: 'roles' });
    if (!cols.availability) throw badRequest('Indicá tu disponibilidad.', { field: 'availability' });
    if (!cols.compensation) throw badRequest('Elegí qué tipo de propuesta te interesa.', { field: 'compensation' });
    if (!cols.work_mode) throw badRequest('Elegí cómo preferís trabajar.', { field: 'workMode' });
    if (cols.work_mode !== 'remote' && (!cols.city || !cols.country)) throw badRequest('Indicá tu ciudad y país para trabajar de forma presencial o híbrida.', { field: 'city' });
    const first = !req.user.onboarded;
    updateUser(db, req.user.id, { ...cols, onboarded: 1 });
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (first) {
      const me = parseUser(user);
      const others = db.all("SELECT * FROM users WHERE id != ? AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user'", [me.id]).map(parseUser);
      const strong = others.filter((o) => personCompat(me, o).score >= 85).length;
      if (strong > 0) notify(ctx, me.id, 'recommendations', { data: { count: strong } });
    }
    res.json({ user: mePayload(ctx, user) });
  });

  router.put('/me/profile', requireAuth, (req, res) => {
    updateUser(db, req.user.id, profileColumns(db, req.user, req.body ?? {}));
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: mePayload(ctx, user) });
  });

  router.get('/me/settings', requireAuth, (req, res) => {
    const u = parseUser(req.user);
    res.json({
      notifications: { interests: true, matches: true, messages: true, activity: true, help: true, ...(u.settings.notifications || {}) },
      visible: Boolean(u.visible),
      showAge: Boolean(u.show_age)
    });
  });

  router.put('/me/settings', requireAuth, (req, res) => {
    const body = req.body ?? {};
    const u = parseUser(req.user);
    const notifications = { ...(u.settings.notifications || {}) };
    for (const key of ['interests', 'matches', 'messages', 'activity', 'help']) {
      if (body.notifications && key in body.notifications) notifications[key] = Boolean(body.notifications[key]);
    }
    const cols = { settings: JSON.stringify({ ...u.settings, notifications }) };
    if ('visible' in body) cols.visible = body.visible ? 1 : 0;
    if ('showAge' in body) cols.show_age = body.showAge ? 1 : 0;
    updateUser(db, u.id, cols);
    res.json({ ok: true, notifications, visible: 'visible' in body ? Boolean(body.visible) : Boolean(u.visible), showAge: 'showAge' in body ? Boolean(body.showAge) : Boolean(u.show_age) });
  });

  router.put('/me/email', requireAuth, async (req, res) => {
    const email = str(req.body?.email, 160).toLowerCase();
    if (!EMAIL_RE.test(email)) throw badRequest('Ese email no parece válido.', { field: 'email' });
    if (!(await verifyPassword(String(req.body?.password ?? ''), req.user.password_hash))) throw badRequest('La contraseña no es correcta.', { field: 'password' });
    if (email !== req.user.email.toLowerCase()) {
      if (db.get('SELECT 1 FROM users WHERE email = ? AND id != ?', [email, req.user.id])) throw new HttpError(409, 'Ya existe una cuenta con ese email.', { field: 'email' });
      const { emailVerification, ...settings } = parseUser(req.user).settings;
      updateUser(db, req.user.id, { email, email_verified: 0, settings: JSON.stringify(settings) });
    }
    res.json({ user: mePayload(ctx, db.get('SELECT * FROM users WHERE id = ?', [req.user.id])) });
  });

  // Verificación de email con un código de 6 dígitos. Sin proveedor de correo, el código
  // se muestra en la consola del servidor y, en modo demo, también en la respuesta.
  router.post('/me/email/verification', requireAuth, (req, res) => {
    if (req.user.email_verified) return res.json({ ok: true, verified: true });
    const { settings } = parseUser(req.user);
    const previous = settings.emailVerification;
    if (previous && Date.now() - Date.parse(previous.sentAt) < 30 * 1000) throw new HttpError(429, 'Esperá unos segundos antes de pedir otro código.');
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const sentAt = new Date();
    settings.emailVerification = { hash: hashCode(code), sentAt: sentAt.toISOString(), expiresAt: new Date(sentAt.getTime() + CODE_TTL_MS).toISOString(), attempts: 0 };
    updateUser(db, req.user.id, { settings: JSON.stringify(settings) });
    console.log(`[email] Código de verificación para ${req.user.email}: ${code}`);
    res.json({ ok: true, sentTo: req.user.email, ...(ctx.config.demo ? { demoCode: code } : {}) });
  });

  router.post('/me/email/verify', requireAuth, (req, res) => {
    const { settings } = parseUser(req.user);
    const pending = settings.emailVerification;
    if (req.user.email_verified) return res.json({ user: mePayload(ctx, req.user) });
    if (!pending) throw badRequest('Pedí un código primero.', { field: 'code' });
    if (Date.parse(pending.expiresAt) < Date.now()) throw badRequest('El código venció. Pedí uno nuevo.', { field: 'code' });
    if (pending.attempts >= 5) throw badRequest('Demasiados intentos. Pedí un código nuevo.', { field: 'code' });
    if (hashCode(str(req.body?.code, 12)) !== pending.hash) {
      settings.emailVerification = { ...pending, attempts: pending.attempts + 1 };
      updateUser(db, req.user.id, { settings: JSON.stringify(settings) });
      throw badRequest('El código no es correcto.', { field: 'code' });
    }
    delete settings.emailVerification;
    updateUser(db, req.user.id, { email_verified: 1, settings: JSON.stringify(settings) });
    res.json({ user: mePayload(ctx, db.get('SELECT * FROM users WHERE id = ?', [req.user.id])) });
  });

  // Verificación de identidad con la foto de un documento: queda en revisión hasta que
  // administración la apruebe o la rechace desde el panel (Moderación → Identidad).
  router.post('/me/identity', requireAuth, (req, res) => {
    if (req.user.identity_verified) return res.json({ user: mePayload(ctx, req.user) });
    const document = imageUrl(db, req.user.id, req.body?.document);
    if (!document || !document.startsWith('/uploads/')) throw badRequest('Subí una foto de tu documento.', { field: 'document' });
    const { settings } = parseUser(req.user);
    settings.identity = { status: 'pending', document, submittedAt: now() };
    updateUser(db, req.user.id, { identity_verified: 0, settings: JSON.stringify(settings) });
    res.json({ user: mePayload(ctx, db.get('SELECT * FROM users WHERE id = ?', [req.user.id])) });
  });

  router.put('/me/password', requireAuth, async (req, res) => {
    const { current = '', next = '' } = req.body ?? {};
    if (!(await verifyPassword(String(current), req.user.password_hash))) throw badRequest('La contraseña actual no es correcta.', { field: 'current' });
    if (String(next).length < 8) throw badRequest('La nueva contraseña debe tener al menos 8 caracteres.', { field: 'next' });
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(String(next)), req.user.id]);
    // Cierra las demás sesiones abiertas; la actual sigue activa.
    db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', [req.user.id, sessionHash(req.sessionToken)]);
    res.json({ ok: true });
  });

  router.delete('/me', requireAuth, async (req, res) => {
    const { password = '' } = req.body ?? {};
    if (!(await verifyPassword(String(password), req.user.password_hash))) throw badRequest('La contraseña no es correcta.', { field: 'password' });
    deleteUserAccount(ctx, req.user.id);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.post('/me/reset-passes', requireOnboarded, (req, res) => {
    const type = req.body?.type;
    if (type === 'person' || type === 'project') db.run('DELETE FROM passes WHERE user_id = ? AND target_type = ?', [req.user.id, type]);
    else db.run('DELETE FROM passes WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  });

  router.get('/me/stats', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'analytics');
    const id = req.user.id;
    const days = 14;
    const rows = db.all("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM views WHERE target_type = 'person' AND target_id = ? AND created_at >= ? GROUP BY day", [id, daysAgo(days)]);
    const byDay = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDay.push({ day, views: rows.find((r) => r.day === day)?.n || 0 });
    }
    res.json({
      views: db.get("SELECT COUNT(*) AS n FROM views WHERE target_type = 'person' AND target_id = ?", [id]).n,
      views7: db.get("SELECT COUNT(*) AS n FROM views WHERE target_type = 'person' AND target_id = ? AND created_at >= ?", [id, daysAgo(7)]).n,
      saves: db.get("SELECT COUNT(*) AS n FROM saves WHERE target_type = 'person' AND target_id = ?", [id]).n,
      interests: db.get('SELECT COUNT(*) AS n FROM interests WHERE to_user_id = ?', [id]).n,
      matches: db.get('SELECT COUNT(*) AS n FROM matches WHERE (user_a = ? OR user_b = ?) AND blocked_by IS NULL', [id, id]).n,
      byDay
    });
  });

  router.get('/me/history', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'history');
    const rows = db.all(
      `SELECT target_type, target_id, MAX(created_at) AS at FROM views WHERE viewer_id = ?
       GROUP BY target_type, target_id ORDER BY at DESC LIMIT 40`,
      [req.user.id]
    );
    const items = [];
    for (const row of rows) {
      if (row.target_type === 'person') {
        const u = db.get("SELECT * FROM users WHERE id = ? AND onboarded = 1 AND status = 'active' AND role = 'user'", [row.target_id]);
        if (u) items.push({ type: 'person', at: row.at, item: personMini(u, hub) });
      } else {
        const p = db.get("SELECT p.* FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND p.status = 'published' AND p.moderation = 'ok' AND u.status = 'active'", [row.target_id]);
        if (p) items.push({ type: 'project', at: row.at, item: projectMini(parseProject(p)) });
      }
    }
    res.json({ items });
  });

  router.get('/me/blocks', requireAuth, (req, res) => {
    const rows = db.all('SELECT u.* FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY b.created_at DESC', [req.user.id]);
    res.json({ items: rows.map((u) => personMini(u, hub)) });
  });

  router.delete('/me/blocks/:id', requireAuth, (req, res) => {
    const otherId = idParam(req.params.id);
    db.run('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?', [req.user.id, otherId]);
    // Si la otra persona también te bloqueó, la conversación sigue cerrada.
    syncBlockState(db, req.user.id, otherId);
    res.json({ ok: true });
  });

  router.post('/reports', requireAuth, (req, res) => {
    const { targetType, targetId, reason, details } = req.body ?? {};
    if (!['person', 'project', 'match', 'help', 'help_answer'].includes(targetType)) throw badRequest('Tipo inválido.');
    const id = idParam(targetId);
    if (!str(reason, 80)) throw badRequest('Elegí un motivo.');
    if (targetType === 'match') {
      const match = db.get('SELECT user_a, user_b FROM matches WHERE id = ?', [id]);
      if (!match || (match.user_a !== req.user.id && match.user_b !== req.user.id)) throw notFound('Esta conversación no está disponible.');
    } else if (targetType === 'person') {
      if (id === req.user.id || !db.get('SELECT 1 FROM users WHERE id = ?', [id])) throw notFound('Este perfil ya no está disponible.');
    } else if (targetType === 'help') {
      const r = db.get('SELECT user_id, hidden FROM help_requests WHERE id = ?', [id]);
      if (!r || r.hidden || r.user_id === req.user.id) throw notFound('Este pedido de ayuda ya no está disponible.');
    } else if (targetType === 'help_answer') {
      const a = db.get('SELECT user_id, hidden FROM help_answers WHERE id = ?', [id]);
      if (!a || a.hidden || a.user_id === req.user.id) throw notFound('Esta solución ya no está disponible.');
    } else if (!db.get('SELECT 1 FROM projects WHERE id = ?', [id])) {
      throw notFound('Este proyecto ya no está disponible.');
    }
    db.run('INSERT INTO reports (reporter_id, target_type, target_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, targetType, id, str(reason, 80), str(details, 600), now()]);
    res.status(201).json({ ok: true });
  });
}
