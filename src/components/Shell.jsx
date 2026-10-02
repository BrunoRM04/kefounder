import React from 'react';
import { ArrowLeft, Bell, Bookmark, BriefcaseBusiness, Compass, Gem, MessageCircle, Settings } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { useApp } from '../lib/app.jsx';
import { firstName } from '../lib/format.js';
import { Link, useRouter } from '../lib/router.jsx';
import { Isotipo, Logotipo } from './Brand.jsx';
import { Avatar, IconButton, cx } from './ui.jsx';

const isDiscover = (p) => p === '/' || p.startsWith('/u/') || p.startsWith('/p/');
const isMatches = (p) => p.startsWith('/matches') || p.startsWith('/chat') || p.startsWith('/interesados');

export function Rail() {
  const { path } = useRouter();
  const { me, counts } = useApp();
  const items = [
    { to: '/', label: 'Descubrir', icon: <Compass size={21} strokeWidth={1.8} />, active: isDiscover(path) },
    { to: '/matches', label: 'Matches', icon: <MessageCircle size={21} strokeWidth={1.8} />, active: isMatches(path), badge: counts.messages, dot: counts.interests > 0 },
    { to: '/guardados', label: 'Guardados', icon: <Bookmark size={20} strokeWidth={1.8} />, active: path.startsWith('/guardados') },
    { to: '/proyectos', label: 'Mis proyectos', icon: <BriefcaseBusiness size={20} strokeWidth={1.8} />, active: path.startsWith('/proyectos') },
    { to: '/perfil', label: 'Perfil', icon: <Avatar person={me} size={24} />, active: path.startsWith('/perfil') }
  ];
  return (
    <aside className="rail" aria-label="Navegación principal">
      <Link to="/" className="rail-brand" aria-label="KeFounder!, inicio"><Isotipo size={40} /></Link>
      <nav className="rail-links">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={cx('rail-link', item.active && 'is-active')} aria-current={item.active ? 'page' : undefined}>
            <span className="rail-icon">
              {item.icon}
              {item.badge > 0 && <i className="badge">{item.badge > 99 ? '99+' : item.badge}</i>}
              {item.dot && !item.badge && <i className="dot" />}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="rail-bottom">
        <Link to="/planes" className={cx('rail-link rail-small', path.startsWith('/planes') && 'is-active')}>
          <span className="rail-icon"><Gem size={19} strokeWidth={1.8} /></span>
          <span>{PLANS[me?.plan]?.name || 'Free'}</span>
        </Link>
        <Link to="/configuracion" className={cx('rail-link rail-small', path.startsWith('/configuracion') && 'is-active')}>
          <span className="rail-icon"><Settings size={19} strokeWidth={1.8} /></span>
          <span>Ajustes</span>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const { path } = useRouter();
  const { me, counts } = useApp();
  const items = [
    { to: '/', label: 'Descubrir', icon: <Compass size={22} strokeWidth={1.8} />, active: isDiscover(path) },
    { to: '/matches', label: 'Matches', icon: <MessageCircle size={22} strokeWidth={1.8} />, active: isMatches(path), badge: counts.messages, dot: counts.interests > 0 },
    { to: '/guardados', label: 'Guardados', icon: <Bookmark size={21} strokeWidth={1.8} />, active: path.startsWith('/guardados') },
    { to: '/proyectos', label: 'Proyectos', icon: <BriefcaseBusiness size={21} strokeWidth={1.8} />, active: path.startsWith('/proyectos') },
    { to: '/perfil', label: 'Perfil', icon: <Avatar person={me} size={24} ring={path.startsWith('/perfil')} />, active: path.startsWith('/perfil') }
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={cx('bottom-link', item.active && 'is-active')} aria-current={item.active ? 'page' : undefined}>
          <span className="bottom-icon">
            {item.icon}
            {item.badge > 0 && <i className="badge">{item.badge > 99 ? '99+' : item.badge}</i>}
            {item.dot && !item.badge && <i className="dot" />}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Wordmark({ className, height = 19 }) {
  return <Link to="/" className={cx('wordmark', className)} aria-label="KeFounder!, inicio"><Logotipo height={height} /></Link>;
}

// Barra superior. brand: pantallas principales · back: pantallas apiladas.
export function TopBar({ title, back, backLabel, onBack, actions, note, transparent, className }) {
  const { me, counts } = useApp();
  const router = useRouter();
  const goBack = () => (onBack ? onBack() : router.back(back || '/'));
  return (
    <header className={cx('topbar', transparent && 'is-transparent', back !== undefined && 'has-back', className)}>
      <div className="topbar-inner">
        {back !== undefined ? (
          <div className="topbar-start">
            <button type="button" className="back-btn" onClick={goBack} aria-label={backLabel ? `Volver a ${backLabel}` : 'Volver'}>
              <ArrowLeft size={20} />
              {backLabel && <span>{backLabel}</span>}
            </button>
            {title && <h1 className="topbar-title">{title}</h1>}
          </div>
        ) : (
          <div className="topbar-start">
            <Wordmark />
            {title && <h1 className="topbar-title topbar-title-brand">{title}</h1>}
          </div>
        )}
        {note && <p className="topbar-note"><span>✳</span> {note}</p>}
        <div className="topbar-actions">
          {actions}
          {back === undefined && me && (
            <>
              <IconButton label="Notificaciones" badge={counts.notifications} onClick={() => router.navigate('/notificaciones')}>
                <Bell size={20} strokeWidth={1.8} />
              </IconButton>
              <Link to="/perfil" className="topbar-profile" aria-label="Tu perfil">
                <Avatar person={me} size={32} />
                <span>{firstName(me.name)}</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PageHeading({ kicker, title, text, action, className }) {
  return (
    <div className={cx('page-heading', className)}>
      <div>
        {kicker && <span className="kicker">{kicker}</span>}
        <h1>{title}<span className="accent-dot">.</span></h1>
        {text && <p>{text}</p>}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}

export function Page({ children, width = 'md', className }) {
  return (
    <div className={cx('page', className)}>
      <div className={cx('container', `container-${width}`)}>{children}</div>
    </div>
  );
}
