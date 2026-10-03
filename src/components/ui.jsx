import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Lock, X } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { imageSrc } from '../lib/media.js';
import { initials } from '../lib/format.js';
import { useLockBody } from '../lib/hooks.js';

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size = 'md', icon, iconRight, loading, block, className, children, type = 'button', ...props }) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', loading && 'is-loading', className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 size={16} className="spin" /> : icon}
      {children && <span>{children}</span>}
      {iconRight}
    </button>
  );
}

export function IconButton({ label, badge, dot, className, children, ...props }) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...props}>
      {children}
      {badge > 0 && <span className="badge">{badge > 99 ? '99+' : badge}</span>}
      {dot && !badge && <span className="dot" />}
    </button>
  );
}

export function Avatar({ person, size = 40, online, ring, className }) {
  const [broken, setBroken] = useState(false);
  const src = person?.photo && !broken ? imageSrc(person.photo, Math.max(96, size * 2)) : '';
  return (
    <span className={cx('avatar', ring && 'avatar-ring', className)} style={{ width: size, height: size, background: person?.accent || '#D4E0DA', fontSize: Math.max(11, size * 0.36) }}>
      {src ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} /> : <span>{initials(person?.name)}</span>}
      {online !== undefined && <i className={cx('presence', online && 'is-online')} />}
    </span>
  );
}

export function Pill({ tone = 'default', icon, children, className }) {
  return <span className={cx('pill', `pill-${tone}`, className)}>{icon}{children}</span>;
}

export function Chip({ active, onClick, children, icon, disabled, locked }) {
  return (
    <button type="button" className={cx('chip', active && 'is-active', locked && 'is-locked')} onClick={onClick} disabled={disabled} aria-pressed={Boolean(active)}>
      {active && !locked ? <Check size={14} /> : icon}
      <span>{children}</span>
      {locked && <Lock size={12} />}
    </button>
  );
}

export function ChipGroup({ options, value, onChange, multiple = false, max, locked, onLocked }) {
  const selected = multiple ? value || [] : value;
  const toggle = (id) => {
    if (locked) { onLocked?.(); return; }
    if (!multiple) { onChange(selected === id ? '' : id); return; }
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (!max || selected.length < max) onChange([...selected, id]);
  };
  return (
    <div className="chip-group">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = multiple ? selected.includes(id) : selected === id;
        return <Chip key={id} active={active} locked={locked} onClick={() => toggle(id)}>{label}</Chip>;
      })}
    </div>
  );
}

export function OptionList({ options, value, onChange, multiple = false, columns = 1 }) {
  const selected = multiple ? value || [] : value;
  return (
    <div className={cx('option-list', columns > 1 && `cols-${columns}`)} role={multiple ? 'group' : 'radiogroup'}>
      {options.map((opt) => {
        const active = multiple ? selected.includes(opt.id) : selected === opt.id;
        return (
          <button
            type="button"
            key={opt.id}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={active}
            className={cx('option', active && 'is-active')}
            onClick={() => {
              if (!multiple) onChange(opt.id);
              else onChange(active ? selected.filter((x) => x !== opt.id) : [...selected, opt.id]);
            }}
          >
            {opt.icon && <span className="option-icon">{opt.icon}</span>}
            <span className="option-copy">
              <strong>{opt.label}</strong>
              {opt.hint && <small>{opt.hint}</small>}
            </span>
            <span className="option-check">{active && <Check size={14} />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('segmented', `segmented-${size}`, className)} role="tablist">
      {options.map((opt) => (
        <button key={opt.id} type="button" role="tab" aria-selected={value === opt.id} className={value === opt.id ? 'is-active' : ''} onClick={() => onChange(opt.id)}>
          {opt.icon}
          <span>{opt.label}</span>
          {opt.count !== undefined && opt.count !== null && <em>{opt.count}</em>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <label className={cx('toggle-row', disabled && 'is-disabled')} htmlFor={id}>
      <span className="toggle-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input id={id} type="checkbox" className="toggle" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    </label>
  );
}

export function Field({ label, hint, error, counter, children, htmlFor, optional }) {
  return (
    <div className={cx('field', error && 'has-error')}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {optional && <em>Opcional</em>}
          {counter && <span className="field-counter">{counter}</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, optional, value, onChange, maxLength, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={inputId} counter={maxLength && value?.length > maxLength * 0.7 ? `${value.length}/${maxLength}` : null}>
      <input id={inputId} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} {...props} />
    </Field>
  );
}

export function TextArea({ label, hint, error, optional, value, onChange, maxLength, rows = 3, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={inputId} counter={maxLength ? `${value?.length || 0}/${maxLength}` : null}>
      <textarea id={inputId} className="input textarea" rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} {...props} />
    </Field>
  );
}

export function Select({ label, hint, optional, value, onChange, options, placeholder = 'Elegí una opción', id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} hint={hint} optional={optional} htmlFor={inputId}>
      <select id={inputId} className="input select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props}>
        <option value="">{placeholder}</option>
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.id;
          const l = typeof opt === 'string' ? opt : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </Field>
  );
}

// Entrada de etiquetas con sugerencias (skills, stack).
export function TagInput({ label, hint, value = [], onChange, suggestions = [], max = 12, placeholder = 'Escribí y presioná Enter' }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const add = (raw) => {
    const clean = raw.trim().replace(/,$/, '');
    if (!clean || value.some((v) => v.toLowerCase() === clean.toLowerCase()) || value.length >= max) return;
    onChange([...value, clean]);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()) && (!draft || s.toLowerCase().includes(draft.toLowerCase()))).slice(0, 10);
  return (
    <Field label={label} hint={hint} htmlFor={id} counter={`${value.length}/${max}`}>
      <div className="tag-input">
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button type="button" aria-label={`Quitar ${tag}`} onClick={() => onChange(value.filter((v) => v !== tag))}><X size={12} /></button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : placeholder}
          disabled={value.length >= max}
        />
      </div>
      {remaining.length > 0 && value.length < max && (
        <div className="tag-suggestions">
          {remaining.map((s) => <button type="button" key={s} onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
    </Field>
  );
}

export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', className, hideClose }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLockBody(open);
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const onKey = (e) => {
      if (document.querySelector('.celebration')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) { e.preventDefault(); panel.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => (panel.current?.querySelector('[data-autofocus]') || panel.current?.querySelector('.sheet-close') || panel.current)?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={cx('sheet', `sheet-${size}`, className)} role="dialog" aria-modal="true" aria-label={title || 'Ventana'} tabIndex={-1} ref={panel}>
        {(title || !hideClose) && (
          <header className="sheet-head">
            <div className="sheet-head-inner">
              <div>
                {title && <h2>{title}</h2>}
                {subtitle && <p>{subtitle}</p>}
              </div>
              {!hideClose && <IconButton label="Cerrar" className="sheet-close" onClick={onClose}><X size={20} /></IconButton>}
            </div>
          </header>
        )}
        <div className="sheet-body"><div className="sheet-body-inner">{children}</div></div>
        {footer && <footer className="sheet-foot"><div className="sheet-foot-inner">{footer}</div></footer>}
      </div>
    </div>,
    document.body
  );
}

// Menú de acciones: popover en desktop, hoja inferior en mobile.
export function ActionMenu({ open, onClose, items, title = 'Opciones', anchor = 'right' }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 759px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 759px)');
    const fn = () => setMobile(mql.matches);
    mql.addEventListener('change', fn);
    return () => mql.removeEventListener('change', fn);
  }, []);
  const ref = useRef(null);
  useEffect(() => {
    if (!open || mobile) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const t = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open, mobile, onClose]);
  if (!open) return null;
  const list = (
    <div className="menu-list">
      {items.filter(Boolean).map((item) => (
        <button type="button" key={item.label} className={cx('menu-item', item.danger && 'is-danger')} onClick={() => { onClose(); item.onClick(); }} disabled={item.disabled}>
          {item.icon}
          <span>{item.label}</span>
          {item.badge && <Pill tone="accent">{item.badge}</Pill>}
        </button>
      ))}
    </div>
  );
  if (mobile) return <Sheet open onClose={onClose} title={title} size="sm">{list}</Sheet>;
  return <div className={cx('menu-popover', `anchor-${anchor}`)} ref={ref} role="menu">{list}</div>;
}

export function Spinner({ label = 'Cargando' }) {
  return <div className="spinner" role="status" aria-label={label}><Loader2 size={22} className="spin" /></div>;
}

export function Skeleton({ height = 16, width = '100%', radius = 8, className }) {
  return <span className={cx('skeleton', className)} style={{ height, width, borderRadius: radius }} />;
}

export function EmptyState({ icon, title, text, action, compact }) {
  return (
    <div className={cx('empty', compact && 'empty-compact')}>
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon={<X size={20} />}
      title={error?.status === 404 ? 'No encontramos esto' : 'No pudimos cargar esta sección'}
      text={error?.message}
      action={onRetry && error?.status !== 404 ? <Button variant="secondary" onClick={() => onRetry()}>Reintentar</Button> : null}
    />
  );
}

export function Progress({ value, tone = 'accent' }) {
  return <div className={cx('progress', `progress-${tone}`)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Kicker({ children, icon }) {
  return <span className="kicker">{icon}{children}</span>;
}

export function PlanBadge({ plan, className }) {
  const p = PLANS[plan] || PLANS.free;
  return <span className={cx('plan-badge', `plan-${p.id}`, className)}>{p.name}</span>;
}

export function LockedBadge({ plan }) {
  return <span className="locked-badge"><Lock size={11} /> {PLANS[plan]?.name || 'Plus'}</span>;
}

export function Spark({ className }) {
  return <span className={cx('spark', className)} aria-hidden="true">✳</span>;
}

export function ProjectLogo({ project, size = 44 }) {
  const [broken, setBroken] = useState(false);
  const src = (project?.logo || '') && !broken ? imageSrc(project.logo, size * 2) : '';
  return (
    <span className="project-logo" style={{ width: size, height: size, background: project?.accent || '#D4E0DA', fontSize: size * 0.42 }}>
      {src ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span>{(project?.name || '✳').slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export function Cover({ src, accent, className, children, width = 1000, style }) {
  const url = imageSrc(src, width);
  return (
    <div className={cx('cover', !url && 'cover-empty', className)} style={{ backgroundColor: accent || '#D4E0DA', backgroundImage: url ? `url("${url}")` : undefined, ...style }}>
      {!url && <span className="cover-spark">✳</span>}
      {children}
    </div>
  );
}
