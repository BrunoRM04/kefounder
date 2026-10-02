import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { now } from './db.js';
import { HttpError } from './utils.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'kefounder_session';
// Nombre anterior (FOUND): se acepta y se reemplaza solo, sin cerrar sesiones.
const LEGACY_COOKIE = 'found_session';
const SESSION_DAYS = 30;
// Las sesiones de administración duran menos: si alguien toma el equipo, el acceso vence antes.
const ADMIN_SESSION_DAYS = 7;
export const sessionDays = (user) => (user?.role === 'admin' ? ADMIN_SESSION_DAYS : SESSION_DAYS);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// Hash inutilizable para cuentas que no inician sesión (perfiles de demostración).
export const lockedPasswordHash = () => `locked$${crypto.randomBytes(8).toString('hex')}`;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const sessionHash = (token) => sha256(String(token || ''));

export function createSession(db, userId, days = SESSION_DAYS) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  db.run('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [sha256(token), userId, now(), expires]);
  return token;
}

export function destroySession(db, token) {
  if (token) db.run('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
}

export function readCookie(req, name = COOKIE) {
  const header = req.headers.cookie;
  if (!header) return '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

const sessionCookie = (req, token, days = SESSION_DAYS) => {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${secure ? '; Secure' : ''}`;
};
const expired = (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function setSessionCookie(req, res, token, days = SESSION_DAYS) {
  res.setHeader('Set-Cookie', [sessionCookie(req, token, days), expired(LEGACY_COOKIE)]);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [expired(COOKIE), expired(LEGACY_COOKIE)]);
}

export function sessionMiddleware(db) {
  return (req, res, next) => {
    let token = readCookie(req);
    if (!token) {
      token = readCookie(req, LEGACY_COOKIE);
      if (token) res.setHeader('Set-Cookie', [sessionCookie(req, token), expired(LEGACY_COOKIE)]);
    }
    req.sessionToken = token;
    req.user = null;
    if (token) {
      const row = db.get(
        // Una cuenta suspendida no tiene sesión válida aunque conserve la cookie.
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
        [sha256(token), now()]
      );
      if (row) {
        req.user = row;
        // Actualizamos la actividad como mucho una vez por minuto.
        const last = row.last_active_at ? Date.parse(row.last_active_at) : 0;
        if (Date.now() - last > 60000) db.run('UPDATE users SET last_active_at = ? WHERE id = ?', [now(), row.id]);
      }
    }
    next();
  };
}

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Iniciá sesión para continuar.'));
  next();
};

export const requireOnboarded = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Iniciá sesión para continuar.'));
  if (!req.user.onboarded) return next(new HttpError(409, 'Completá tu perfil para empezar.', { code: 'onboarding' }));
  next();
};

export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Iniciá sesión para continuar.'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'No tenés permiso para hacer esto.'));
  next();
};

// Limitador simple en memoria por IP + clave.
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (key) => {
    const t = Date.now();
    const entry = hits.get(key);
    if (!entry || t - entry.start > windowMs) {
      hits.set(key, { start: t, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}
