import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChartLine, ClipboardList, FolderKanban, LayoutDashboard, LogOut, Megaphone, Menu, Newspaper, ScrollText, Search, Server, ShieldAlert, Users, Wallet, X } from 'lucide-react';
import { Isotipo, Logotipo } from '../components/Brand.jsx';
import { Avatar, IconButton, ProjectLogo, Spinner, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { usePersisted } from '../lib/hooks.js';
import { Link, matchPath, useRouter } from '../lib/router.jsx';
import { AdminContext, Tabs } from './kit.jsx';
import '../styles/admin.css';

const Overview = lazy(() => import('./screens/Overview.jsx'));
const Metrics = lazy(() => import('./screens/Metrics.jsx'));
const Revenue = lazy(() => import('./screens/Revenue.jsx'));
const UsersList = lazy(() => import('./screens/Users.jsx'));
const UserDetail = lazy(() => import('./screens/UserDetail.jsx'));
const ProjectsList = lazy(() => import('./screens/Projects.jsx'));
const ProjectDetail = lazy(() => import('./screens/ProjectDetail.jsx'));
const Moderation = lazy(() => import('./screens/Moderation.jsx'));
const ReportDetail = lazy(() => import('./screens/ReportDetail.jsx'));
const Tasks = lazy(() => import('./screens/Tasks.jsx'));
const RevistaList = lazy(() => import('./screens/Revista.jsx'));
const ArticleEditor = lazy(() => import('./screens/ArticleEditor.jsx'));
const PressList = lazy(() => import('./screens/Press.jsx'));
const PressDetail = lazy(() => import('./screens/PressDetail.jsx'));
const Audit = lazy(() => import('./screens/Audit.jsx'));
const System = lazy(() => import('./screens/System.jsx'));

// Mapa del panel: cada sección con su lugar fijo en el menú. `scope`: usa el selector de datos reales/todo.
const ROUTES = [
  { path: '/admin', Screen: Overview, title: 'Resumen', scope: true },
  { path: '/admin/metricas', Screen: Metrics, title: 'Métricas', scope: true },
  { path: '/admin/ingresos', Screen: Revenue, title: 'Ingresos', scope: true },
  { path: '/admin/usuarios', Screen: UsersList, title: 'Usuarios' },
  { path: '/admin/usuarios/:id', Screen: UserDetail, title: 'Usuario' },
  { path: '/admin/proyectos', Screen: ProjectsList, title: 'Proyectos' },
  { path: '/admin/proyectos/:id', Screen: ProjectDetail, title: 'Proyecto' },
  { path: '/admin/moderacion', Screen: Moderation, title: 'Moderación' },
  { path: '/admin/moderacion/reportes/:id', Screen: ReportDetail, title: 'Reporte' },
  { path: '/admin/seguimiento', Screen: Tasks, title: 'Seguimiento' },
  { path: '/admin/revista', Screen: RevistaList, title: 'Revista' },
  { path: '/admin/revista/nueva', Screen: ArticleEditor, title: 'Nueva nota' },
  { path: '/admin/revista/:id', Screen: ArticleEditor, title: 'Nota', keyByPath: true },
  { path: '/admin/difusion', Screen: PressList, title: 'Difusión' },
  { path: '/admin/difusion/:id', Screen: PressDetail, title: 'Pedido de difusión' },
  { path: '/admin/auditoria', Screen: Audit, title: 'Auditoría' },
  { path: '/admin/sistema', Screen: System, title: 'Sistema' }
];

const NAV = [
  { group: 'Panorama', items: [
    { to: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
    { to: '/admin/metricas', label: 'Métricas', icon: ChartLine },
    { to: '/admin/ingresos', label: 'Ingresos', icon: Wallet }
  ] },
  { group: 'Gestión', items: [
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { to: '/admin/proyectos', label: 'Proyectos', icon: FolderKanban },
    { to: '/admin/moderacion', label: 'Moderación', icon: ShieldAlert, badge: (b) => b.reports + b.identity },
    { to: '/admin/seguimiento', label: 'Seguimiento', icon: ClipboardList, badge: (b) => b.tasks }
  ] },
  { group: 'Contenido', items: [
    { to: '/admin/revista', label: 'Revista', icon: Newspaper },
    { to: '/admin/difusion', label: 'Difusión', icon: Megaphone, badge: (b) => b.press || 0 }
  ] },
  { group: 'Control', items: [
    { to: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
    { to: '/admin/sistema', label: 'Sistema', icon: Server }
  ] }
];

function NotFoundAdmin() {
  return (
    <div className="adm-page">
      <div className="adm-empty adm-empty-page">
        <strong>Esta sección no existe</strong>
        <p>Volvé al resumen o elegí una sección del menú.</p>
        <Link to="/admin" className="btn btn-secondary btn-sm">Ir al resumen</Link>
      </div>
    </div>
  );
}

function SideNav({ badges, onNavigate }) {
  const { path } = useRouter();
  const { me, logout } = useApp();
  return (
    <>
      <Link to="/admin" className="adm-brand" onClick={onNavigate} aria-label="KeFounder!, panel de administración">
        <Isotipo size={30} />
        <span className="adm-brand-copy">
          <Logotipo height={16} />
          <small>Administración</small>
        </span>
      </Link>
      <nav className="adm-nav" aria-label="Secciones del panel">
        {NAV.map((section) => (
          <div key={section.group} className="adm-nav-group">
            <span className="adm-nav-title">{section.group}</span>
            {section.items.map((item) => {
              const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
              const count = item.badge ? item.badge(badges) : 0;
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} onClick={onNavigate} className={cx('adm-nav-link', active && 'is-active')} aria-current={active ? 'page' : undefined} title={item.label}>
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{item.label}</span>
                  {count > 0 && <em className="adm-nav-badge">{count > 99 ? '99+' : count}</em>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="adm-side-foot">
        <Avatar person={me} size={32} />
        <span className="adm-side-me">
          <strong>{me.name}</strong>
          <small>{me.email}</small>
        </span>
        <IconButton label="Cerrar sesión" className="adm-logout" onClick={logout}><LogOut size={17} /></IconButton>
      </div>
    </>
  );
}

// Búsqueda global: personas, proyectos y reportes (#número). Atajo: tecla "/".
function GlobalSearch() {
  const { navigate } = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const box = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setResults(null); return undefined; }
    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        const data = await api.get(`/admin/search?q=${encodeURIComponent(text)}`);
        if (alive) setResults(data);
      } catch { if (alive) setResults({ users: [], projects: [], reports: [], articles: [] }); }
    }, 220);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const items = results ? [
    ...results.users.map((u) => ({ key: `u${u.id}`, to: `/admin/usuarios/${u.id}`, kind: 'Persona', title: u.name, sub: u.email, icon: <Avatar person={u} size={28} /> })),
    ...results.projects.map((p) => ({ key: `p${p.id}`, to: `/admin/proyectos/${p.id}`, kind: 'Proyecto', title: p.name, sub: `de ${p.owner}`, icon: <ProjectLogo project={p} size={28} /> })),
    ...(results.articles || []).map((a) => ({ key: `a${a.id}`, to: `/admin/revista/${a.id}`, kind: 'Nota', title: a.title, sub: a.person || 'Revista', icon: <span className="adm-search-icon is-article"><Newspaper size={15} /></span> })),
    ...results.reports.map((r) => ({ key: `r${r.id}`, to: `/admin/moderacion/reportes/${r.id}`, kind: 'Reporte', title: `Reporte #${r.id}`, sub: r.reason, icon: <span className="adm-search-icon"><ShieldAlert size={15} /></span> }))
  ] : [];
  const go = (to) => { setOpen(false); setQ(''); input.current?.blur(); navigate(to); };

  return (
    <div className="adm-global-search" ref={box}>
      <Search size={16} />
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="Buscar personas, proyectos o #reporte"
        aria-label="Buscar en el panel"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
          if (e.key === 'Enter' && items[0]) go(items[0].to);
        }}
      />
      <kbd>/</kbd>
      {open && q.trim().length >= 2 && (
        <div className="adm-search-results" role="listbox">
          {!results && <div className="adm-search-empty">Buscando…</div>}
          {results && !items.length && <div className="adm-search-empty">Sin resultados para “{q.trim()}”.</div>}
          {items.map((item) => (
            <button key={item.key} type="button" role="option" aria-selected="false" className="adm-search-item" onClick={() => go(item.to)}>
              {item.icon}
              <span className="adm-li-copy"><strong>{item.title}</strong><small>{item.sub}</small></span>
              <em>{item.kind}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const { path } = useRouter();
  const [badges, setBadges] = useState({ reports: 0, identity: 0, tasks: 0, press: 0 });
  const [scope, setScope] = usePersisted('kefounder:admin:scope', 'real');
  const [drawer, setDrawer] = useState(false);

  const refreshBadges = useCallback(async () => {
    try { setBadges(await api.get('/admin/badges')); } catch { /* se reintenta en el próximo ciclo */ }
  }, []);
  useEffect(() => {
    refreshBadges();
    const t = window.setInterval(refreshBadges, 60000);
    window.addEventListener('focus', refreshBadges);
    return () => { window.clearInterval(t); window.removeEventListener('focus', refreshBadges); };
  }, [refreshBadges]);
  useEffect(() => { setDrawer(false); }, [path]);

  let route = null;
  let params = {};
  for (const r of ROUTES) {
    const m = matchPath(r.path, path);
    if (m) { route = r; params = m; break; }
  }
  const Screen = route?.Screen || NotFoundAdmin;
  useEffect(() => { document.title = `${route?.title || 'Panel'} · Administración · KeFounder!`; }, [route]);

  const value = useMemo(() => ({ badges, refreshBadges, scope, setScope }), [badges, refreshBadges, scope, setScope]);

  return (
    <AdminContext.Provider value={value}>
      <div className={cx('adm', drawer && 'has-drawer')}>
        <aside className="adm-side" aria-label="Menú del panel">
          <SideNav badges={badges} onNavigate={() => setDrawer(false)} />
        </aside>
        {drawer && <button type="button" className="adm-scrim" aria-label="Cerrar menú" onClick={() => setDrawer(false)} />}
        <div className="adm-body">
          <header className="adm-top">
            <IconButton label={drawer ? 'Cerrar menú' : 'Abrir menú'} className="adm-menu-btn" onClick={() => setDrawer((d) => !d)}>{drawer ? <X size={20} /> : <Menu size={20} />}</IconButton>
            <Link to="/admin" className="adm-top-brand" aria-label="Panel de administración"><Isotipo size={26} /></Link>
            <GlobalSearch />
            {route?.scope && (
              <Tabs
                value={scope}
                onChange={setScope}
                className="adm-scope"
                items={[{ id: 'real', label: 'Cuentas reales' }, { id: 'all', label: 'Incluir demo' }]}
              />
            )}
            {badges.reports + badges.identity > 0 && (
              <Link to="/admin/moderacion" className="adm-top-alert" title="Pendientes de moderación">
                <ShieldAlert size={16} /><span>{badges.reports + badges.identity}</span>
              </Link>
            )}
          </header>
          <main className="adm-main" id="adm-main">
            <Suspense fallback={<div className="adm-page"><Spinner /></div>}>
              <Screen key={route?.keyByPath ? path : route?.path || path} params={params} />
            </Suspense>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

