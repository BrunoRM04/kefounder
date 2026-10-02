import { now } from '../db.js';
import { badRequest, str } from '../utils.js';

// Utilidades compartidas por todo el panel: paginación, orden, filtros, caché, CSV y auditoría.
// Todo lo que llega del navegador se valida contra listas cerradas antes de tocar el SQL.

export const PAGE_SIZES = [25, 50, 100];

export function paging(query) {
  const pageSize = PAGE_SIZES.includes(Number(query.pageSize)) ? Number(query.pageSize) : 25;
  const page = Math.min(100000, Math.max(1, Number.parseInt(query.page, 10) || 1));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export const pageResult = (items, total, { page, pageSize }) => ({
  items,
  total,
  page,
  pageSize,
  pages: Math.max(1, Math.ceil(total / pageSize))
});

// ORDER BY solo con columnas de la lista; siempre con desempate por id para que la paginación sea estable.
export function sorting(query, allowed, fallback, tieBreaker) {
  const key = Object.hasOwn(allowed, query.sort) ? query.sort : fallback;
  const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
  return { key, dir: dir.toLowerCase(), sql: `${allowed[key]} ${dir}, ${tieBreaker} ${dir}` };
}

// Constructor de WHERE con parámetros con nombre.
export function conditions() {
  const parts = [];
  const params = {};
  return {
    add(sql, values = {}) {
      parts.push(sql);
      Object.assign(params, values);
      return this;
    },
    get sql() { return parts.length ? `WHERE ${parts.join(' AND ')}` : ''; },
    params
  };
}

// LIKE con comodines escapados (se usa con ESCAPE '\').
export const likeTerm = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
export const searchTerm = (value) => str(value, 80);

export const oneOfOr = (value, list, fallback = '') => (list.includes(value) ? value : fallback);

// Segmentos: cuentas reales, cuentas demo con contraseña, perfiles bot, equipo interno y pruebas.
export const SEGMENTS = ['real', 'demo', 'bot', 'staff', 'test'];
// Las métricas cuentan solo cuentas reales, salvo que se pida explícitamente "todo".
export const metricScope = (value) => (value === 'all' ? 'all' : 'real');

// Fecha local del servidor como clave YYYY-MM-DD (así se guardan también los vencimientos de tareas).
export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayKey = () => dayKey(new Date());
export function dayKeyIn(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

// Días locales: claves YYYY-MM-DD desde hace `days - 1` días hasta hoy.
export function dayKeys(days) {
  const keys = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    keys.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

export function localMidnight(daysBack = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.toISOString();
}

export const RANGES = [7, 30, 90];
export const rangeOf = (value, fallback = 30) => (RANGES.includes(Number(value)) ? Number(value) : fallback);

export const pctChange = (current, previous) => {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Caché corta en memoria para tableros: evita recalcular agregados en cada visita.
// Cualquier acción del panel la vacía, así lo que se ve siempre refleja lo último que hiciste.
export function createCache(ttlMs = 30000) {
  const store = new Map();
  return {
    get(key, fn) {
      const hit = store.get(key);
      if (hit && Date.now() - hit.at < ttlMs) return hit.value;
      const value = fn();
      store.set(key, { at: Date.now(), value });
      if (store.size > 300) store.delete(store.keys().next().value);
      return value;
    },
    clear: () => store.clear()
  };
}

// CSV para Excel en español: separador ";", BOM UTF-8 y celdas protegidas contra fórmulas.
const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function sendCsv(res, name, columns, rows) {
  const lines = [columns.map((c) => csvCell(c.label)).join(';')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(';'));
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kefounder-${name}-${stamp}.csv"`);
  res.send(`﻿${lines.join('\r\n')}\r\n`);
}

// Exportaciones con tope para no bloquear el servidor si la base crece mucho.
export const EXPORT_LIMIT = 50000;

export function audit(ctx, req, action, { type = null, id = null, summary = '', data = {} } = {}) {
  ctx.db.run(
    'INSERT INTO admin_audit (admin_id, action, target_type, target_id, summary, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, action, type, id, String(summary).slice(0, 300), JSON.stringify(data), now()]
  );
  ctx.adminCache?.clear();
}

export const requireReason = (value, message = 'Escribí el motivo: queda registrado en la auditoría.') => {
  const reason = str(value, 300);
  if (reason.length < 3) throw badRequest(message, { field: 'reason' });
  return reason;
};

export const TARGET_TYPES = ['user', 'project', 'report', 'article', 'press'];
