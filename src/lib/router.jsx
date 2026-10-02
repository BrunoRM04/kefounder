import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const RouterContext = createContext(null);

const readLocation = () => ({ path: window.location.pathname, search: window.location.search });

export function RouterProvider({ children }) {
  const [loc, setLoc] = useState(readLocation);
  // Una pantalla con cambios sin guardar puede pedir confirmación antes de salir.
  const guard = useRef(null);
  const setLeaveGuard = useCallback((fn) => { guard.current = fn; }, []);

  useEffect(() => {
    if (!window.history.state || typeof window.history.state.idx !== 'number') {
      window.history.replaceState({ idx: 0 }, '');
    }
    const onPop = () => setLoc(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false, keepScroll = false, force = false } = {}) => {
    const url = new URL(to, window.location.origin);
    const next = url.pathname + url.search;
    if (next === window.location.pathname + window.location.search) return;
    if (!force && guard.current && url.pathname !== window.location.pathname && !guard.current()) return;
    const idx = window.history.state?.idx ?? 0;
    if (replace) window.history.replaceState({ idx }, '', next);
    else window.history.pushState({ idx: idx + 1 }, '', next);
    setLoc(readLocation());
    if (!keepScroll) window.scrollTo(0, 0);
  }, []);

  const back = useCallback((fallback = '/') => {
    if (guard.current && !guard.current()) return;
    if ((window.history.state?.idx ?? 0) > 0) window.history.back();
    else navigate(fallback, { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({
    path: loc.path,
    query: new URLSearchParams(loc.search),
    navigate,
    back,
    setLeaveGuard
  }), [loc, navigate, back, setLeaveGuard]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

export function matchPath(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) {
      // Una dirección mal escrita (por ejemplo "%E0%A4") no rompe la pantalla: simplemente no coincide.
      try { params[p[i].slice(1)] = decodeURIComponent(s[i]); } catch { return null; }
    }
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, replace, children, onClick, ...props }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to, { replace });
      }}
      {...props}
    >
      {children}
    </a>
  );
}
