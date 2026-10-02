import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, CircleCheck, Pencil, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { Avatar, Button, IconButton, Pill, ProjectLogo, Sheet, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { timeAgo } from '../lib/format.js';
import { Link, useRouter } from '../lib/router.jsx';

// ---------- Contexto del panel ----------
export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

// ---------- Formatos ----------
export const num = (n) => Number(n || 0).toLocaleString('es-UY');
export const usd = (n) => `US$ ${Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateShort = (iso) => (iso ? new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '—');
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—');
export const ago = (iso) => (iso ? timeAgo(iso) : '—');
export function bytes(n = 0) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${(n / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
}
export function duration(seconds = 0) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}
const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayKey = () => localKey(new Date());
export function dueLabel(key) {
  if (!key) return 'Sin fecha';
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const due = new Date(`${key}T12:00:00`);
  const days = Math.round((due - today) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  if (days < 0) return `Hace ${-days} días`;
  return due.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }).replace('.', '');
}

// Serie diaria → datos para el gráfico de columnas (etiquetas espaciadas según el rango).
export function chartData(series) {
  const step = series.length <= 14 ? 1 : series.length <= 31 ? 3 : 10;
  return series.map((d, i) => {
    const date = new Date(`${d.day}T12:00:00`);
    const last = i === series.length - 1;
    return {
      key: d.day,
      value: d.value,
      label: (series.length - 1 - i) % step === 0 || last ? String(date.getDate()) : '',
      full: date.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
    };
  });
}

// ---------- Estado de filtros en la URL ----------
// Los filtros viven en la dirección: se pueden guardar, compartir y el botón Atrás los respeta.
// `keep`: claves que no cuentan como filtro (pestañas) y que "Limpiar filtros" conserva.
export function useQueryState(defaults, { keep = [] } = {}) {
  const { path, query, navigate } = useRouter();
  const defaultsRef = useRef(defaults);
  const search = query.toString();
  const values = useMemo(() => {
    const params = new URLSearchParams(search);
    const out = { ...defaultsRef.current };
    for (const key of Object.keys(out)) {
      const v = params.get(key);
      if (v !== null) out[key] = v;
    }
    return out;
  }, [search]);
  const set = useCallback((patch) => {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === '' || value === null || value === undefined || String(value) === String(defaultsRef.current[key] ?? '')) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch)) next.delete('page');
    const text = next.toString();
    navigate(`${path}${text ? `?${text}` : ''}`, { replace: true, keepScroll: true });
  }, [search, path, navigate]);
  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== '' && value !== null && value !== undefined) params.set(key, value);
    return params.toString();
  }, [values]);
  const ignored = ['page', 'pageSize', 'sort', 'dir', ...keep];
  const active = Object.entries(values).some(([key, value]) => !ignored.includes(key) && String(value) !== String(defaultsRef.current[key] ?? ''));
  const keepKey = keep.join(',');
  const reset = useCallback(() => {
    const next = new URLSearchParams();
    const current = new URLSearchParams(search);
    for (const key of keepKey ? keepKey.split(',') : []) if (current.get(key) !== null) next.set(key, current.get(key));
    const text = next.toString();
    navigate(`${path}${text ? `?${text}` : ''}`, { replace: true, keepScroll: true });
  }, [navigate, path, search, keepKey]);
  return { values, set, apiQuery, active, reset };
}

// Carga que conserva los datos anteriores mientras llega la página siguiente (sin parpadeos).
export function useAdminData(url) {
  const { fail } = useApp();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api.get(url);
      if (id === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (error.status === 401) fail(error);
      if (id === seq.current) setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
  }, [url, fail]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

// ---------- Estructura ----------
export function PageHeader({ title, subtitle, actions, back, children }) {
  const router = useRouter();
  return (
    <header className="adm-head">
      <div className="adm-head-main">
        {back && <button type="button" className="adm-back" onClick={() => router.back(back.to)}><ChevronLeft size={16} />{back.label}</button>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="adm-head-actions">{actions}</div>}
      {children}
    </header>
  );
}

export function Panel({ title, hint, actions, children, className, flush }) {
  return (
    <section className={cx('adm-panel', flush && 'is-flush', className)}>
      {(title || actions) && (
        <header className="adm-panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <p>{hint}</p>}
          </div>
          {actions && <div className="adm-panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, delta, note, icon, active, onClick, deltaLabel = 'vs. período anterior', newLabel = 'Nuevo en este período' }) {
  const Tag = onClick ? 'button' : 'div';
  const hasDelta = delta !== undefined;
  const direction = delta === null ? 'new' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return (
    <Tag type={onClick ? 'button' : undefined} className={cx('adm-kpi', active && 'is-active', onClick && 'is-button')} onClick={onClick} aria-pressed={onClick ? Boolean(active) : undefined}>
      <span className="adm-kpi-label">{icon}{label}</span>
      <strong className="adm-kpi-value">{value}</strong>
      {hasDelta && (
        <span className={cx('adm-kpi-delta', `is-${direction}`)}>
          {direction === 'new' ? newLabel : <>{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'} {delta > 0 ? '+' : ''}{delta}% <small>{deltaLabel}</small></>}
        </span>
      )}
      {note && <span className="adm-kpi-note">{note}</span>}
    </Tag>
  );
}

export function KeyValue({ items }) {
  return (
    <dl className="adm-kv">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>
      ))}
    </dl>
  );
}

export function StatGrid({ items }) {
  return (
    <div className="adm-statgrid">
      {items.map(([label, value]) => <div key={label}><strong>{num(value)}</strong><span>{label}</span></div>)}
    </div>
  );
}

export function FunnelList({ steps }) {
  return (
    <ol className="adm-funnel">
      {steps.map((s, i) => (
        <li key={s.key}>
          <div className="adm-funnel-top"><span>{s.label}</span><strong>{num(s.value)}</strong><em>{i === 0 ? '100%' : `${s.percent}%`}</em></div>
          <span className="adm-funnel-track"><i style={{ width: `${i === 0 ? (s.value ? 100 : 0) : s.percent}%` }} /></span>
        </li>
      ))}
    </ol>
  );
}

export function Loading({ rows = 4 }) {
  return <div className="adm-loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={18} width={`${90 - i * 12}%`} />)}</div>;
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="adm-empty">
      {icon && <span className="adm-empty-icon">{icon}</span>}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Failed({ error, onRetry }) {
  return <Empty icon={<X size={18} />} title="No pudimos cargar esta sección" text={error?.message} action={onRetry && <Button size="sm" variant="secondary" onClick={() => onRetry()}>Reintentar</Button>} />;
}

// ---------- Estados con color ----------
const TONES = {
  userStatus: { active: ['accent', 'Activa'], suspended: ['warm', 'Suspendida'] },
  segment: { real: ['default', 'Real'], demo: ['muted', 'Demo'], bot: ['muted', 'Bot'], staff: ['solid', 'Equipo'], test: ['gold', 'Prueba'] },
  identity: { verified: ['accent', 'Verificada'], approved: ['accent', 'Verificada'], pending: ['gold', 'En revisión'], rejected: ['warm', 'Rechazada'], none: ['muted', 'Sin enviar'] },
  project: { published: ['accent', 'Publicado'], draft: ['muted', 'Borrador'], paused: ['gold', 'Pausado'] },
  moderation: { ok: ['default', 'Visible'], hidden: ['warm', 'Oculto'] },
  report: { open: ['warm', 'Nuevo'], reviewing: ['gold', 'En revisión'], resolved: ['accent', 'Resuelto'], dismissed: ['muted', 'Descartado'] },
  priority: { high: ['warm', 'Alta'], normal: ['default', 'Normal'], low: ['muted', 'Baja'] },
  task: { todo: ['default', 'Por hacer'], doing: ['gold', 'En curso'], done: ['accent', 'Hecha'] },
  subscription: { active: ['accent', 'Activa'], replaced: ['muted', 'Reemplazada'], canceled: ['warm', 'Cancelada'] }
};
export const toneLabel = (kind, value) => TONES[kind]?.[value]?.[1] || value;
export const optionsOf = (kind) => Object.entries(TONES[kind]).map(([id, [, label]]) => ({ id, label }));

export function Status({ kind, value, dot = true }) {
  const [tone, label] = TONES[kind]?.[value] || ['muted', value];
  return <Pill tone={tone} className="adm-status">{dot && <i className="status-dot" />}{label}</Pill>;
}

export function PlanTag({ plan, period }) {
  const p = PLANS[plan] || PLANS.free;
  return <span className={cx('plan-badge', `plan-${p.id}`, 'adm-plan')}>{p.name}{period === 'courtesy' ? ' · cortesía' : ''}</span>;
}

export const PERIODS = { monthly: 'Mensual', yearly: 'Anual', courtesy: 'Cortesía' };

export function PersonCell({ person, to, sub }) {
  const body = (
    <>
      <Avatar person={person} size={34} />
      <span className="adm-cell-copy">
        <strong>{person.name}</strong>
        <small>{sub ?? person.email}</small>
      </span>
    </>
  );
  return to ? <Link to={to} className="adm-cell">{body}</Link> : <span className="adm-cell">{body}</span>;
}

export function ProjectCell({ project, to, sub }) {
  const body = (
    <>
      <ProjectLogo project={project} size={34} />
      <span className="adm-cell-copy">
        <strong>{project.name}</strong>
        <small>{sub ?? (project.tagline || 'Sin descripción corta')}</small>
      </span>
    </>
  );
  return to ? <Link to={to} className="adm-cell">{body}</Link> : <span className="adm-cell">{body}</span>;
}

// ---------- Tabla ----------
export function DataTable({ columns, rows, loading, sort, onSort, onRowClick, empty, rowClass }) {
  const click = (row) => (event) => {
    if (!onRowClick || event.target.closest('a, button, input, select, textarea, label')) return;
    onRowClick(row);
  };
  return (
    <div className={cx('adm-table-wrap', loading && rows && 'is-refreshing')}>
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = Boolean(c.sort) && sort?.key === c.sort;
              return (
                <th key={c.key} className={cx(c.align && `is-${c.align}`, c.mobileHide && 'is-mobile-hide', c.className)} style={c.width ? { width: c.width } : undefined} aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button type="button" className={cx('adm-sort', sorted && 'is-sorted')} onClick={() => onSort(c.sort, c.sortDir || 'desc')}>
                      {c.label}
                      {sorted ? (sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} />}
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {!rows && loading && Array.from({ length: 8 }, (_, i) => (
            <tr key={`s${i}`} className="adm-skeleton-row">{columns.map((c) => <td key={c.key}><Skeleton height={14} width={c.primary ? '70%' : '50%'} /></td>)}</tr>
          ))}
          {rows && rows.length === 0 && (
            <tr className="adm-empty-row"><td colSpan={columns.length}>{empty || <Empty title="No hay resultados" text="Probá con otros filtros." />}</td></tr>
          )}
          {rows?.map((row) => (
            <tr key={row.id} className={cx(onRowClick && 'is-clickable', rowClass?.(row))} onClick={click(row)}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} className={cx(c.align && `is-${c.align}`, c.primary && 'is-primary', c.mobileHide && 'is-mobile-hide', c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ data, onChange }) {
  if (!data) return <div className="adm-pager" />;
  const { page, pages, total, pageSize } = data;
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="adm-pager">
      <span className="adm-pager-count">{num(from)}–{num(to)} de <strong>{num(total)}</strong></span>
      <label className="adm-pager-size">
        <span className="sr-only">Filas por página</span>
        <select value={pageSize} onChange={(e) => onChange({ pageSize: e.target.value, page: 1 })}>
          {[25, 50, 100].map((n) => <option key={n} value={n}>{n} por página</option>)}
        </select>
      </label>
      <div className="adm-pager-nav">
        <IconButton label="Página anterior" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })}><ChevronLeft size={17} /></IconButton>
        <span>{num(page)} / {num(pages)}</span>
        <IconButton label="Página siguiente" disabled={page >= pages} onClick={() => onChange({ page: page + 1 })}><ChevronRight size={17} /></IconButton>
      </div>
    </div>
  );
}

// ---------- Filtros ----------
export function SearchBox({ value, onChange, placeholder = 'Buscar' }) {
  const [draft, setDraft] = useState(value || '');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const sent = useRef(value || '');
  const commit = (text) => { sent.current = text; onChangeRef.current(text); };
  // Solo se reescribe el campo si el valor cambió desde afuera (limpiar filtros, Atrás).
  useEffect(() => {
    if ((value || '') !== sent.current) { sent.current = value || ''; setDraft(value || ''); }
  }, [value]);
  useEffect(() => {
    const next = draft.trim();
    if (next === sent.current) return undefined;
    const t = window.setTimeout(() => commit(next), 320);
    return () => window.clearTimeout(t);
  }, [draft]);
  return (
    <label className="adm-search">
      <Search size={16} />
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(draft.trim()); }} />
      {draft && <button type="button" aria-label="Borrar búsqueda" onClick={() => { setDraft(''); commit(''); }}><X size={14} /></button>}
    </label>
  );
}

export function FilterSelect({ label, value, options, onChange, all = 'Todos' }) {
  return (
    <label className={cx('adm-filter', value && 'is-set')}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all !== null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Tabs({ value, onChange, items, className }) {
  return (
    <div className={cx('adm-tabs', className)} role="tablist">
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={value === item.id} className={value === item.id ? 'is-active' : ''} onClick={() => onChange(item.id)}>
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && item.count !== null && <em>{num(item.count)}</em>}
        </button>
      ))}
    </div>
  );
}

// ---------- Hojas de confirmación ----------
// Toda acción que cambia algo pide un motivo cuando corresponde: queda en la auditoría.
export function ActionSheet({ open, onClose, title, text, confirmLabel = 'Confirmar', tone = 'primary', reason = true, reasonLabel = 'Motivo', reasonHint = 'Queda registrado en la auditoría.', placeholder, children, valid = true, onConfirm }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setValue(''); setError(''); setBusy(false); } }, [open]);
  const submit = async (event) => {
    event.preventDefault();
    if (reason && value.trim().length < 3) { setError('Escribí el motivo (al menos 3 letras).'); return; }
    setBusy(true);
    setError('');
    try {
      await onConfirm(value.trim());
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={text} size="sm">
      <form className="adm-sheet-form" onSubmit={submit}>
        {children}
        {reason && (
          <label className="field">
            <span className="field-label">{reasonLabel}</span>
            <textarea className="input textarea" rows={3} value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} placeholder={placeholder} data-autofocus />
            <span className="field-hint">{reasonHint}</span>
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="adm-sheet-actions">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant={tone} loading={busy} disabled={!valid}>{confirmLabel}</Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---------- Historial de auditoría ----------
export const ACTIONS = {
  'user.suspend': 'Suspendió la cuenta',
  'user.reactivate': 'Reactivó la cuenta',
  'user.plan': 'Cambió el plan',
  'user.segment': 'Cambió el segmento',
  'user.verify_email': 'Verificó el email',
  'user.logout': 'Cerró las sesiones',
  'user.delete': 'Eliminó la cuenta',
  'identity.approve': 'Aprobó la identidad',
  'identity.reject': 'Rechazó la identidad',
  'project.hide': 'Ocultó el proyecto',
  'project.restore': 'Restauró el proyecto',
  'report.review': 'Tomó el reporte',
  'report.resolve': 'Resolvió el reporte',
  'report.dismiss': 'Descartó el reporte',
  'report.reopen': 'Reabrió el reporte',
  'task.create': 'Creó una tarea',
  'task.update': 'Editó una tarea',
  'task.status': 'Cambió el estado de una tarea',
  'task.done': 'Completó una tarea',
  'task.delete': 'Eliminó una tarea',
  'note.create': 'Agregó una nota',
  'note.delete': 'Borró una nota',
  'system.backup': 'Hizo una copia de la base',
  'system.check': 'Revisó la integridad de la base',
  'system.cleanup': 'Hizo mantenimiento de la base',
  'system.admin_create': 'Se creó la cuenta de administración',
  'system.admin_password': 'Se cambió la contraseña de administración'
};
export const actionLabel = (action) => ACTIONS[action] || action;

export const targetLink = (type, id) => (type === 'user' ? `/admin/usuarios/${id}` : type === 'project' ? `/admin/proyectos/${id}` : type === 'report' ? `/admin/moderacion/reportes/${id}` : null);

export function AuditList({ items, showTarget = false, empty = 'Todavía no hay acciones registradas.' }) {
  if (!items?.length) return <p className="adm-muted-line">{empty}</p>;
  return (
    <ol className="adm-timeline">
      {items.map((a) => (
        <li key={a.id}>
          <i aria-hidden="true" />
          <div>
            <strong>{actionLabel(a.action)}</strong>
            {a.summary && <p>{a.summary}</p>}
            <small>
              {a.admin} · {dateTime(a.createdAt)}
              {showTarget && a.targetType && targetLink(a.targetType, a.targetId) && <> · <Link to={targetLink(a.targetType, a.targetId)}>Ver</Link></>}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- Notas internas ----------
export function NotesPanel({ targetType, targetId, notes, onChange }) {
  const { toast, fail } = useApp();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async (event) => {
    event.preventDefault();
    if (body.trim().length < 2) return;
    setBusy(true);
    try {
      await api.post('/admin/notes', { targetType, targetId, body: body.trim() });
      setBody('');
      toast('Nota guardada', { icon: <StickyNote size={14} /> });
      onChange();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await api.del(`/admin/notes/${id}`); onChange(); } catch (err) { fail(err); }
  };
  return (
    <div className="adm-notes">
      <form onSubmit={add} className="adm-note-form">
        <textarea className="input textarea" rows={2} value={body} maxLength={2000} placeholder="Agregá una nota interna (solo la ve administración)" onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" size="sm" variant="secondary" loading={busy} disabled={body.trim().length < 2}>Guardar nota</Button>
      </form>
      {notes?.length ? (
        <ul className="adm-note-list">
          {notes.map((n) => (
            <li key={n.id}>
              <p>{n.body}</p>
              <small>{n.admin} · {dateTime(n.createdAt)}</small>
              <IconButton label="Borrar nota" className="adm-note-remove" onClick={() => remove(n.id)}><Trash2 size={14} /></IconButton>
            </li>
          ))}
        </ul>
      ) : <p className="adm-muted-line">Sin notas todavía.</p>}
    </div>
  );
}

// ---------- Tareas ----------
export function TaskSheet({ open, onClose, task, target, onSaved }) {
  const { toast } = useApp();
  const [form, setForm] = useState({ title: '', detail: '', priority: 'normal', dueAt: '', status: 'todo' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    setForm(task ? { title: task.title, detail: task.detail || '', priority: task.priority, dueAt: task.dueAt || '', status: task.status } : { title: '', detail: '', priority: 'normal', dueAt: todayKey(), status: 'todo' });
  }, [open, task]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { title: form.title, detail: form.detail, priority: form.priority, dueAt: form.dueAt || null };
      if (task) await api.put(`/admin/tasks/${task.id}`, { ...payload, status: form.status });
      else await api.post('/admin/tasks', { ...payload, ...(target ? { targetType: target.type, targetId: target.id } : {}) });
      toast(task ? 'Tarea actualizada' : 'Tarea creada', { icon: <CircleCheck size={14} /> });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const linked = task?.target || (target ? { label: target.label } : null);
  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'} subtitle={linked?.label ? `Vinculada a ${linked.label}` : 'Seguimiento interno de administración'} size="sm">
      <form className="adm-sheet-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Qué hay que hacer</span>
          <input className="input" value={form.title} onChange={set('title')} maxLength={140} placeholder="Ej.: llamar para renovar el plan" data-autofocus />
        </label>
        <label className="field">
          <span className="field-label">Detalle <em>Opcional</em></span>
          <textarea className="input textarea" rows={3} value={form.detail} onChange={set('detail')} maxLength={2000} />
        </label>
        <div className="adm-form-row">
          <label className="field">
            <span className="field-label">Vence</span>
            <input className="input" type="date" value={form.dueAt} onChange={set('dueAt')} />
          </label>
          <label className="field">
            <span className="field-label">Prioridad</span>
            <select className="input select" value={form.priority} onChange={set('priority')}>
              {optionsOf('priority').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          {task && (
            <label className="field">
              <span className="field-label">Estado</span>
              <select className="input select" value={form.status} onChange={set('status')}>
                {optionsOf('task').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="adm-sheet-actions">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={busy} disabled={form.title.trim().length < 3}>{task ? 'Guardar cambios' : 'Crear tarea'}</Button>
        </div>
      </form>
    </Sheet>
  );
}

export function TaskItem({ task, onToggle, onEdit, showTarget = true }) {
  return (
    <li className={cx('adm-task', task.status === 'done' && 'is-done', task.overdue && 'is-overdue')}>
      <button type="button" className="adm-task-check" aria-label={task.status === 'done' ? 'Marcar como pendiente' : 'Marcar como hecha'} onClick={() => onToggle(task)}>
        {task.status === 'done' && <Check size={13} />}
      </button>
      <div className="adm-task-copy">
        <strong>{task.title}</strong>
        <small>
          <span className={cx('adm-due', task.overdue && 'is-overdue', task.dueToday && 'is-today')}>{dueLabel(task.dueAt)}</span>
          {task.priority !== 'normal' && <> · {toneLabel('priority', task.priority)}</>}
          {task.status === 'doing' && <> · En curso</>}
          {showTarget && task.target?.label && <> · <Link to={targetLink(task.target.type, task.target.id)}>{task.target.label}</Link></>}
        </small>
      </div>
      {onEdit && <IconButton label="Editar tarea" className="adm-task-edit" onClick={() => onEdit(task)}><Pencil size={14} /></IconButton>}
    </li>
  );
}

export function TasksPanel({ target, tasks, onChange }) {
  const { fail } = useApp();
  const { refreshBadges } = useAdmin();
  const [editing, setEditing] = useState(null);
  const toggle = async (task) => {
    try {
      await api.put(`/admin/tasks/${task.id}`, { status: task.status === 'done' ? 'todo' : 'done' });
      onChange();
      refreshBadges();
    } catch (err) { fail(err); }
  };
  const open = tasks?.filter((t) => t.status !== 'done') || [];
  const done = tasks?.filter((t) => t.status === 'done') || [];
  return (
    <div className="adm-tasks-panel">
      {open.length || done.length ? (
        <ul className="adm-task-list">
          {[...open, ...done.slice(0, 3)].map((t) => <TaskItem key={t.id} task={t} showTarget={false} onToggle={toggle} onEdit={setEditing} />)}
        </ul>
      ) : <p className="adm-muted-line">Sin tareas para este elemento.</p>}
      <Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => setEditing('new')}>Nueva tarea</Button>
      <TaskSheet open={Boolean(editing)} onClose={() => setEditing(null)} task={editing === 'new' ? null : editing} target={target} onSaved={() => { onChange(); refreshBadges(); }} />
    </div>
  );
}

// Seguimiento completo de un elemento: tareas, notas e historial en pestañas.
export function FollowUp({ target, data, onChange }) {
  const [tab, setTab] = useState('tasks');
  const openTasks = data.tasks?.filter((t) => t.status !== 'done').length || 0;
  return (
    <Panel title="Seguimiento" className="adm-followup">
      <Tabs
        value={tab}
        onChange={setTab}
        className="is-small"
        items={[
          { id: 'tasks', label: 'Tareas', count: openTasks || null },
          { id: 'notes', label: 'Notas', count: data.notes?.length || null },
          { id: 'history', label: 'Historial' }
        ]}
      />
      <div className="adm-followup-body">
        {tab === 'tasks' && <TasksPanel target={target} tasks={data.tasks} onChange={onChange} />}
        {tab === 'notes' && <NotesPanel targetType={target.type} targetId={target.id} notes={data.notes} onChange={onChange} />}
        {tab === 'history' && <AuditList items={data.audit} />}
      </div>
    </Panel>
  );
}
