import React, { Suspense, lazy, useEffect } from 'react';
import { MatchCelebration, NotificationBanner, OfflineNotice, PaywallSheet, Toasts } from './components/Overlays.jsx';
import { IsotipoTile } from './components/Brand.jsx';
import { BottomNav, Rail } from './components/Shell.jsx';
import { Spinner, cx } from './components/ui.jsx';
import { AppProvider, useApp } from './lib/app.jsx';
import { RouterProvider, matchPath, useRouter } from './lib/router.jsx';

const Welcome = lazy(() => import('./screens/Welcome.jsx'));
const Login = lazy(() => import('./screens/Auth.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./screens/Auth.jsx').then((m) => ({ default: m.Register })));
const Onboarding = lazy(() => import('./screens/Onboarding.jsx'));
const Discover = lazy(() => import('./screens/Discover.jsx'));
const PersonDetail = lazy(() => import('./screens/PersonDetail.jsx'));
const ProjectDetail = lazy(() => import('./screens/ProjectDetail.jsx'));
const PublicProject = lazy(() => import('./screens/ProjectDetail.jsx').then((m) => ({ default: m.PublicProject })));
const Inbox = lazy(() => import('./screens/Inbox.jsx'));
const Interested = lazy(() => import('./screens/Interested.jsx'));
const Saved = lazy(() => import('./screens/Saved.jsx'));
const MyProjects = lazy(() => import('./screens/MyProjects.jsx'));
const ProjectWizard = lazy(() => import('./screens/ProjectWizard.jsx'));
const ProjectEdit = lazy(() => import('./screens/ProjectEdit.jsx'));
const ProjectStats = lazy(() => import('./screens/ProjectStats.jsx'));
const Candidates = lazy(() => import('./screens/Candidates.jsx'));
const Profile = lazy(() => import('./screens/Profile.jsx'));
const ProfileEdit = lazy(() => import('./screens/ProfileEdit.jsx'));
const Notifications = lazy(() => import('./screens/Notifications.jsx'));
const Plans = lazy(() => import('./screens/Plans.jsx'));
const Settings = lazy(() => import('./screens/Settings.jsx'));
const Help = lazy(() => import('./screens/Help.jsx'));
const HelpDetail = lazy(() => import('./screens/HelpDetail.jsx'));
const HelpRanking = lazy(() => import('./screens/HelpRanking.jsx'));
const NotFound = lazy(() => import('./screens/NotFound.jsx'));
// El panel de administración va en su propio paquete: solo lo descarga la cuenta admin.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
// La revista es pública: la puede leer cualquiera, con o sin cuenta.
const RevistaApp = lazy(() => import('./revista/RevistaApp.jsx'));
const isRevista = (path) => path === '/revista' || path.startsWith('/revista/');

// tab: pantalla principal con barra inferior en mobile · group: mantiene el estado entre rutas.
const ROUTES = [
  { path: '/', Screen: Discover, tab: true, className: 'is-discover' },
  { path: '/matches', Screen: Inbox, tab: true, group: 'inbox', className: 'is-inbox' },
  { path: '/chat/:id', Screen: Inbox, group: 'inbox', className: 'is-inbox is-chat' },
  { path: '/interesados', Screen: Interested },
  { path: '/guardados', Screen: Saved, tab: true },
  { path: '/proyectos', Screen: MyProjects, tab: true },
  { path: '/proyectos/nuevo', Screen: ProjectWizard, bare: true },
  { path: '/proyectos/:id/editar', Screen: ProjectEdit },
  { path: '/proyectos/:id/estadisticas', Screen: ProjectStats },
  { path: '/proyectos/:id/candidatos', Screen: Candidates },
  { path: '/perfil', Screen: Profile, tab: true },
  { path: '/perfil/editar', Screen: ProfileEdit },
  { path: '/notificaciones', Screen: Notifications },
  { path: '/planes', Screen: Plans },
  { path: '/configuracion', Screen: Settings },
  // «Necesito ayuda con…»: se entra desde la barra superior y desde Perfil (no ocupa lugar en el menú).
  { path: '/ayuda', Screen: Help },
  { path: '/ayuda/ranking', Screen: HelpRanking },
  { path: '/ayuda/:id', Screen: HelpDetail },
  { path: '/u/:id', Screen: PersonDetail, className: 'is-detail' },
  { path: '/p/:id', Screen: ProjectDetail, className: 'is-detail' }
];

const AUTH_ROUTES = { '/bienvenida': Welcome, '/ingresar': Login, '/registro': Register };

function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
}

function Splash() {
  return (
    <div className="splash">
      <span className="splash-mark"><IsotipoTile size={84} label="KeFounder!" /></span>
    </div>
  );
}

const TITLES = [
  ['/matches', 'Matches'], ['/chat/', 'Chat'], ['/interesados', 'Interesados'], ['/guardados', 'Guardados'],
  ['/proyectos/nuevo', 'Crear proyecto'], ['/proyectos', 'Mis proyectos'], ['/perfil', 'Tu perfil'], ['/notificaciones', 'Notificaciones'],
  ['/planes', 'Planes'], ['/configuracion', 'Configuración'], ['/ayuda/ranking', 'Ranking semanal'], ['/ayuda', 'Necesito ayuda con…'], ['/u/', 'Perfil'], ['/p/', 'Proyecto'], ['/onboarding', 'Tu perfil'],
  ['/ingresar', 'Ingresar'], ['/registro', 'Crear cuenta']
];

function Routes() {
  const { me } = useApp();
  const { path, query } = useRouter();

  useEffect(() => {
    if ((path.startsWith('/admin') && me?.role === 'admin') || isRevista(path)) return; // ponen su propio título
    const found = TITLES.find(([prefix]) => path.startsWith(prefix));
    document.title = found ? `${found[1]} · KeFounder!` : 'KeFounder! — personas para construir';
  }, [path, me?.role]);

  if (me === undefined) return <Splash />;
  if (isRevista(path)) return <RevistaApp />;

  const AuthScreen = AUTH_ROUTES[path];
  if (!me) {
    if (AuthScreen) return <AuthScreen />;
    const publicProject = matchPath('/p/:id', path);
    if (publicProject) return <PublicProject id={publicProject.id} />;
    const next = path !== '/' ? `?next=${encodeURIComponent(path + (query.toString() ? `?${query}` : ''))}` : '';
    return <Redirect to={`/bienvenida${next}`} />;
  }

  // La cuenta de administración usa solo el panel: no tiene perfil público ni aparece en Descubrir.
  if (me.role === 'admin') {
    if (path !== '/admin' && !path.startsWith('/admin/')) return <Redirect to={query.get('next')?.startsWith('/admin') ? query.get('next') : '/admin'} />;
    return <AdminApp />;
  }

  if (!me.onboarded) return path === '/onboarding' ? <Onboarding /> : <Redirect to="/onboarding" />;
  if (AuthScreen || path === '/onboarding') return <Redirect to={query.get('next') || '/'} />;

  let route = null;
  let params = {};
  for (const r of ROUTES) {
    const m = matchPath(r.path, path);
    if (m) { route = r; params = m; break; }
  }
  if (!route) route = { Screen: NotFound, path: '*' };
  const { Screen } = route;

  return (
    <div className={cx('app', route.tab && 'has-tabs', route.bare && 'is-bare', route.className)}>
      {!route.bare && <Rail />}
      <main className="main">
        <Suspense fallback={<div className="screen-loading"><Spinner /></div>}>
          <Screen key={route.group || path} params={params} />
        </Suspense>
      </main>
      {route.tab && <BottomNav />}
    </div>
  );
}

// Si una pantalla falla, se muestra un aviso con salida en lugar de una página en blanco.
// Al cambiar de dirección se vuelve a intentar.
class ScreenBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.path !== this.props.path && this.state.error) this.setState({ error: null }); }
  componentDidCatch(error) { console.error('[pantalla]', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="splash">
        <div className="empty">
          <h3>Algo salió mal en esta pantalla</h3>
          <p>Probá recargar. Si sigue pasando, volvé al inicio.</p>
          <div className="boundary-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Recargar</button>
            <a className="btn btn-secondary" href="/">Ir al inicio</a>
          </div>
        </div>
      </div>
    );
  }
}

function SafeRoutes() {
  const { path } = useRouter();
  return <ScreenBoundary path={path}><Routes /></ScreenBoundary>;
}

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <Suspense fallback={<Splash />}>
          <SafeRoutes />
        </Suspense>
        <Toasts />
        <NotificationBanner />
        <PaywallSheet />
        <MatchCelebration />
        <OfflineNotice />
      </AppProvider>
    </RouterProvider>
  );
}
