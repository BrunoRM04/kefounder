export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const notFound = (message = 'No encontramos lo que buscabas.') => new HttpError(404, message);
export const forbidden = (message = 'No tenés permiso para hacer esto.') => new HttpError(403, message);

export const str = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const strList = (value, { max = 20, itemMax = 60, allowed } = {}) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const clean = str(item, itemMax);
    if (!clean || seen.has(clean.toLowerCase())) continue;
    if (allowed && !allowed.includes(clean)) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
};

export const oneOf = (value, list, fallback = '') => {
  const ids = list.map((item) => (typeof item === 'string' ? item : item.id));
  return ids.includes(value) ? value : fallback;
};

export const intOrNull = (value, min = 0, max = 100) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
};

export const idParam = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
};

// Solo enlaces http(s) — evita javascript: y similares.
export const safeUrl = (value, max = 300) => {
  const clean = str(value, max);
  if (!clean) return '';
  const withProtocol = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return '';
    return url.toString();
  } catch {
    return '';
  }
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Imágenes aceptadas en perfiles y proyectos: un archivo propio ya subido o una foto de Unsplash.
const UPLOAD_IMAGE_RE = /^\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/;
const UNSPLASH_RE = /^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+$/;
export function imageUrl(db, userId, value) {
  const clean = str(value, 400);
  if (!clean) return '';
  if (UNSPLASH_RE.test(clean)) return clean;
  const match = UPLOAD_IMAGE_RE.exec(clean);
  if (match && db.get('SELECT 1 FROM uploads WHERE filename = ? AND user_id = ?', [match[1], userId])) return clean;
  return null;
}

export const startOfLocalDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const startOfLocalMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;

export const pick = (list, seed) => list[Math.abs(seed) % list.length];
