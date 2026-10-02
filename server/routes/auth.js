import { BRAND_ACCENTS } from '../../shared/theme.js';
import { clearSessionCookie, createSession, destroySession, hashPassword, rateLimiter, requireAuth, sessionDays, setSessionCookie, verifyPassword } from '../auth.js';
import { now } from '../db.js';
import { usage } from '../plans.js';
import { selfUser } from '../serializers.js';
import { counts, notify } from '../services.js';
import { EMAIL_RE, HttpError, badRequest, str } from '../utils.js';

const ACCENTS = BRAND_ACCENTS;

export function mePayload(ctx, user) {
  return selfUser(ctx.db, user, { usage: usage(ctx.db, user), counts: counts(ctx.db, user.id) });
}

export default function authRoutes(router, ctx) {
  const { db, config } = ctx;
  const limiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 25 });

  router.get('/config', (_req, res) => {
    res.json({
      demo: config.demo,
      // Solo las cuentas que existen en esta base (una base vieja puede no tener las nuevas).
      demoAccounts: config.demo
        ? config.demoAccounts.filter(({ email }) => db.get('SELECT 1 FROM users WHERE email = ?', [email])).map(({ email, password, name, plan, headline }) => ({ email, password, name, plan, headline }))
        : []
    });
  });

  router.post('/auth/register', async (req, res) => {
    if (!limiter(`register:${req.ip}`)) throw new HttpError(429, 'Demasiados intentos. Probá de nuevo en unos minutos.');
    const body = req.body ?? {};
    const name = str(body.name, 80);
    const email = str(body.email, 160).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2) throw badRequest('Contanos tu nombre.', { field: 'name' });
    if (!EMAIL_RE.test(email)) throw badRequest('Ese email no parece válido.', { field: 'email' });
    if (password.length < 8) throw badRequest('La contraseña debe tener al menos 8 caracteres.', { field: 'password' });
    if (db.get('SELECT 1 FROM users WHERE email = ?', [email])) throw new HttpError(409, 'Ya existe una cuenta con ese email.', { field: 'email' });

    const hash = await hashPassword(password);
    const id = db.run(
      'INSERT INTO users (email, password_hash, name, accent, created_at, last_active_at, settings) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hash, name, ACCENTS[Math.floor(Math.random() * ACCENTS.length)], now(), now(), JSON.stringify({ notifications: {} })]
    ).lastInsertRowid;
    const token = createSession(db, id);
    setSessionCookie(req, res, token);
    const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
    notify(ctx, id, 'welcome');
    res.status(201).json({ user: mePayload(ctx, user) });
  });

  router.post('/auth/login', async (req, res) => {
    const body = req.body ?? {};
    const email = str(body.email, 160).toLowerCase();
    if (!limiter(`login:${req.ip}:${email}`)) throw new HttpError(429, 'Demasiados intentos. Probá de nuevo en unos minutos.');
    const password = typeof body.password === 'string' ? body.password : '';
    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, 'Email o contraseña incorrectos.');
    }
    if (user.status !== 'active') throw new HttpError(403, 'Tu cuenta está suspendida y por ahora no puede ingresar.', { code: 'suspended' });
    const days = sessionDays(user);
    const token = createSession(db, user.id, days);
    setSessionCookie(req, res, token, days);
    db.run('UPDATE users SET last_active_at = ? WHERE id = ?', [now(), user.id]);
    res.json({ user: mePayload(ctx, user) });
  });

  router.post('/auth/logout', (req, res) => {
    destroySession(db, req.sessionToken);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get('/auth/me', (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: mePayload(ctx, req.user) });
  });

  router.get('/events', requireAuth, (req, res) => {
    ctx.hub.connect(req, res, req.user.id);
    ctx.hub.send(req.user.id, 'counts', counts(db, req.user.id));
  });
}
