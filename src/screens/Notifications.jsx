import React, { useState } from 'react';
import { Bell, Bookmark, Eye, Gem, Heart, Lock, MessageCircle, Sparkles, Trash2, Users, X } from 'lucide-react';
import { ConfirmSheet } from '../components/Sheets.jsx';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, EmptyState, ErrorState, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp, useRealtime } from '../lib/app.jsx';
import { timeAgo } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { useRouter } from '../lib/router.jsx';

const ICONS = {
  interest: <Heart size={17} />, interests_summary: <Users size={17} />, match: <Sparkles size={17} />, message: <MessageCircle size={17} />,
  direct: <MessageCircle size={17} />, saved_project: <Bookmark size={17} />, saved_profile: <Bookmark size={17} />, project_views: <Eye size={17} />,
  recommendations: <Sparkles size={17} />, plan: <Gem size={17} />, welcome: <Sparkles size={17} />
};

const groupOf = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(iso) >= today) return 'Hoy';
  if (diff < 7 * 86400000) return 'Esta semana';
  return 'Antes';
};

export default function Notifications() {
  const { setCounts, fail, toast } = useApp();
  const { navigate } = useRouter();
  const { data, error, loading, reload, setData } = useLoader(() => api.get('/notifications'), []);
  const [confirmClear, setConfirmClear] = useState(false);

  useRealtime('notification', (n) => setData((d) => (d ? { items: [n, ...d.items.filter((x) => x.id !== n.id)] } : d)));
  useRealtime('reconnected', () => reload({ silent: true }));

  const open = async (n) => {
    if (!n.read) {
      setData((d) => ({ items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
      api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    navigate(n.link || '/');
  };
  const readAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setData((d) => ({ items: d.items.map((x) => ({ ...x, read: true })) }));
      setCounts({ notifications: 0 });
    } catch (err) { fail(err); }
  };

  const remove = async (n) => {
    setData((d) => ({ items: d.items.filter((x) => x.id !== n.id) }));
    try { await api.del(`/notifications/${n.id}`); } catch (err) { fail(err); reload({ silent: true }); }
  };
  const clearAll = async () => {
    try {
      await api.del('/notifications');
      setData({ items: [] });
      setCounts({ notifications: 0 });
      toast('Notificaciones borradas');
    } catch (err) { fail(err); }
  };

  const items = data?.items || [];
  const groups = ['Hoy', 'Esta semana', 'Antes'].map((g) => ({ g, list: items.filter((n) => groupOf(n.createdAt) === g) })).filter((x) => x.list.length);
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <TopBar back="/" title="Notificaciones" />
      <Page width="sm" className="page-notifications">
        <PageHeading
          kicker={<><Bell size={13} /> Al día</>}
          title="Notificaciones"
          text="Lo nuevo de las personas y proyectos que te interesan."
          action={items.length > 0 && (
            <div className="notif-actions">
              {unread > 0 && <Button variant="ghost" size="sm" onClick={readAll}>Marcar todo como leído</Button>}
              <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={() => setConfirmClear(true)}>Borrar todas</Button>
            </div>
          )}
        />
        {loading ? <div className="notif-list">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={76} radius={16} />)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
            : !items.length ? <EmptyState icon={<Bell size={20} />} title="Todavía no hay novedades" text="Cuando alguien quiera conectar, te escriba o guarde tu proyecto, lo vas a ver acá." />
              : groups.map(({ g, list }) => (
                <section key={g} className="notif-group">
                  <h2>{g}</h2>
                  <div className="notif-list">
                    {list.map((n) => (
                      <div className="notif-item" key={n.id}>
                        <button type="button" className={cx('notif', !n.read && 'is-unread')} onClick={() => open(n)}>
                          {n.actor ? <Avatar person={n.actor} size={44} /> : <span className={cx('notif-icon', n.hidden && 'is-hidden')}>{n.hidden ? <Lock size={16} /> : ICONS[n.type] || <Sparkles size={17} />}</span>}
                          <span className="notif-copy">
                            <strong>{n.title}</strong>
                            {n.body && <span>{n.body}</span>}
                            <time>{timeAgo(n.createdAt)}</time>
                          </span>
                          {!n.read && <i className="notif-dot" aria-label="Sin leer" />}
                        </button>
                        <button type="button" className="notif-remove" aria-label="Borrar notificación" title="Borrar" onClick={() => remove(n)}><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
      </Page>
      <ConfirmSheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Borrar todas las notificaciones?"
        text="Se eliminan de tu lista. Tus matches, mensajes y solicitudes no cambian."
        confirmLabel="Borrar todas"
        danger
        onConfirm={clearAll}
      />
    </>
  );
}
