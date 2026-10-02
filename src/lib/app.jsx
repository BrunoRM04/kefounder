import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { deckStore } from './deck-store.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [me, setMe] = useState(undefined); // undefined: cargando · null: sin sesión
  const [config, setConfig] = useState({ demo: false, demoAccounts: [] });
  const [toasts, setToasts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [paywall, setPaywall] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [online, setOnline] = useState(true);
  const listeners = useRef(new Map());
  const celebrated = useRef(new Set());
  const activeChat = useRef(null);

  const refreshMe = useCallback(async () => {
    try {
      const { user } = await api.get('/auth/me');
      setMe(user);
      return user;
    } catch {
      setMe((current) => (current === undefined ? null : current));
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMe();
    api.get('/config').then(setConfig).catch(() => {});
  }, [refreshMe]);

  const emit = useCallback((event, data) => {
    listeners.current.get(event)?.forEach((fn) => fn(data));
  }, []);

  const on = useCallback((event, fn) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(fn);
    return () => listeners.current.get(event)?.delete(fn);
  }, []);

  const toast = useCallback((message, { tone = 'default', icon, duration = 2600 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((items) => [...items.slice(-2), { id, message, tone, icon }]);
    window.setTimeout(() => setToasts((items) => items.filter((t) => t.id !== id)), duration);
  }, []);

  const celebrate = useCallback((match) => {
    if (!match || celebrated.current.has(match.id)) return;
    celebrated.current.add(match.id);
    setCelebration(match);
  }, []);

  const fail = useCallback((error) => {
    if (error?.status === 402 && error.data?.code === 'paywall') {
      setPaywall(error.data);
      return;
    }
    if (error?.status === 401) {
      setMe(null);
      return;
    }
    toast(error?.message || 'Algo salió mal.', { tone: 'error' });
  }, [toast]);

  const setCounts = useCallback((counts) => setMe((m) => (m ? { ...m, counts: { ...m.counts, ...counts } } : m)), []);

  // Tiempo real: una conexión SSE por sesión.
  const meId = me?.id;
  const onboarded = me?.onboarded;

  // Otro usuario en la misma pestaña: el mazo en memoria no le pertenece.
  useEffect(() => { deckStore.clear(); }, [meId]);
  const [sseEpoch, setSseEpoch] = useState(0);
  useEffect(() => {
    if (!meId || !onboarded) return undefined;
    const source = new EventSource('/api/events');
    let dropped = false;
    let retry = null;
    const handlers = {
      counts: (data) => setCounts(data),
      notification: (data) => {
        emit('notification', data);
        const chatId = data.link?.startsWith('/chat/') ? Number(data.link.split('/')[2]) : null;
        if (chatId && chatId === activeChat.current) return;
        if (['message', 'direct', 'interest', 'match', 'saved_project', 'saved_profile'].includes(data.type)) setBanner({ ...data, key: Date.now() });
      },
      message: (data) => emit('message', data),
      message_updated: (data) => emit('message_updated', data),
      typing: (data) => emit('typing', data),
      read: (data) => emit('read', data),
      match: (data) => { emit('match', data); celebrate(data); },
      match_removed: (data) => emit('match_removed', data),
      ready: () => {
        setOnline(true);
        // Tras un corte, las pantallas abiertas se resincronizan (mensajes, listas).
        if (dropped || sseEpoch > 0) emit('reconnected', {});
        dropped = false;
      }
    };
    for (const [event, handler] of Object.entries(handlers)) {
      source.addEventListener(event, (e) => {
        try { handler(JSON.parse(e.data)); } catch { /* evento inválido */ }
      });
    }
    source.onerror = () => {
      setOnline(false);
      dropped = true;
      // Si el navegador cerró la conexión para siempre, se verifica la sesión y se reabre.
      if (source.readyState === EventSource.CLOSED && !retry) {
        retry = window.setTimeout(async () => {
          const user = await refreshMe();
          if (user) setSseEpoch((n) => n + 1);
        }, 3000);
      }
    };
    return () => { window.clearTimeout(retry); source.close(); };
  }, [meId, onboarded, emit, setCounts, celebrate, refreshMe, sseEpoch]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = window.setTimeout(() => setBanner(null), 4200);
    return () => window.clearTimeout(t);
  }, [banner]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* igual cerramos */ }
    celebrated.current.clear();
    setMe(null);
  }, []);

  const value = useMemo(() => ({
    me, setMe, refreshMe, config, counts: me?.counts || { notifications: 0, messages: 0, interests: 0 }, setCounts,
    on, toast, fail, paywall, showPaywall: setPaywall, celebration, celebrate, closeCelebration: () => setCelebration(null),
    banner, closeBanner: () => setBanner(null), toasts, logout, online, activeChat
  }), [me, refreshMe, config, setCounts, on, toast, fail, paywall, celebration, celebrate, banner, toasts, logout, online]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

export function useRealtime(event, handler) {
  const { on } = useApp();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => on(event, (data) => ref.current(data)), [on, event]);
}
