import { AVAILABILITY, COMPENSATION, GOALS, PROJECT_COMPENSATION, PROJECT_ROLES, ROLES, STAGES, WORK_MODES, labelOf } from '../../shared/catalog.js';

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

export function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < DAY && startOfDay(t) === startOfDay(Date.now())) return `hace ${Math.floor(diff / 3600000)} h`;
  const days = Math.round((startOfDay(Date.now()) - startOfDay(t)) / DAY);
  if (days <= 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

export function shortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.round((startOfDay(Date.now()) - startOfDay(d)) / DAY);
  if (days === 0) return clock(iso);
  if (days === 1) return 'Ayer';
  if (days < 7) return d.toLocaleDateString('es-UY', { weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }).replace('.', '');
}

export const clock = (iso) => new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function dayLabel(iso) {
  const d = new Date(iso);
  const days = Math.round((startOfDay(Date.now()) - startOfDay(d)) / DAY);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  const label = d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function longDate(iso) {
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function slotLabel(iso) {
  const d = new Date(iso);
  const label = d.toLocaleString('es-UY', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const money = (n) => (n === 0 ? 'US$0' : `US$${n.toFixed(2).replace('.', ',')}`);

export function fileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '·';
export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const roleLabel = (id) => labelOf(ROLES, id);
export const rolesLabel = (ids = []) => ids.map(roleLabel).filter(Boolean).join(' · ');
export const availabilityLabel = (id, short = true) => labelOf(AVAILABILITY, id, short ? 'short' : 'label');
export const compensationLabel = (id) => labelOf(COMPENSATION, id);
export const projectCompensationLabel = (id) => labelOf(PROJECT_COMPENSATION, id);
export const stageLabel = (id) => labelOf(STAGES, id);
export const workModeLabel = (id) => labelOf(WORK_MODES, id);
export const goalLabel = (id) => labelOf(GOALS, id);
export const projectRoleLabel = (id) => labelOf(PROJECT_ROLES, id) || id;

// Enlaces seguros dentro de mensajes (solo http/https).
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/gi;
export function splitLinks(text = '') {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
    parts.push({ type: 'link', value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
