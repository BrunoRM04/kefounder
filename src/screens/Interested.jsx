import React, { useState } from 'react';
import { Bookmark, Clock, Heart, Lock, Sparkles, X } from 'lucide-react';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, EmptyState, ErrorState, Pill, ProjectLogo, Segmented, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { availabilityLabel, compensationLabel, firstName, timeAgo } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';

function LockedView({ count, previews = [], kind }) {
  const { showPaywall } = useApp();
  const { navigate } = useRouter();
  const feature = 'seeInterested';
  return (
    <div className="locked-view">
      <div className="locked-grid" aria-hidden="true">
        {Array.from({ length: Math.max(4, Math.min(6, count)) }).map((_, i) => (
          <div className="locked-card" key={i} style={{ background: previews[i]?.accent || '#D4E0DA' }}>
            <span />
            <i /><i />
          </div>
        ))}
      </div>
      <div className="locked-copy">
        <span className="paywall-spark"><Lock size={22} /></span>
        <h2>{count === 1 ? '1 persona' : `${count} personas`} {kind === 'saved' ? 'guardaron tu perfil o proyecto' : 'quieren conectar con vos'}</h2>
        <p>{kind === 'saved' ? 'Con Plus ves quiénes son y podés escribirles primero.' : 'Con Plus ves quiénes son y aceptás o rechazás al instante. Mientras tanto, aparecen primero en Descubrir: si conectás con ellas, es match.'}</p>
        <Button size="lg" onClick={() => showPaywall(paywallFor(feature))}>Ver quiénes son con Plus</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>Ir a descubrir</Button>
      </div>
    </div>
  );
}

function ReceivedList() {
  const { fail, toast, celebrate } = useApp();
  const { data, error, loading, reload, setData } = useLoader(() => api.get('/interests/received'), []);
  const [busy, setBusy] = useState(null);
  if (loading) return <div className="interest-list">{[0, 1, 2].map((i) => <Skeleton key={i} height={132} radius={18} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data.locked) return data.count ? <LockedView count={data.count} previews={data.previews} /> : <EmptyState icon={<Heart size={20} />} title="Todavía no hay solicitudes" text="Cuando alguien quiera conectar con vos, lo vas a ver acá." />;
  if (!data.items.length) return <EmptyState icon={<Heart size={20} />} title="Estás al día" text="No tenés solicitudes pendientes. Seguí descubriendo para generar nuevas conexiones." />;

  const respond = async (item, accept) => {
    setBusy(`${item.id}-${accept}`);
    try {
      if (accept) {
        const { match } = await api.post(`/interests/${item.id}/accept`);
        celebrate(match);
      } else {
        await api.post(`/interests/${item.id}/decline`);
        toast('Solicitud rechazada');
      }
      // Aceptar puede resolver varias solicitudes de la misma persona: se recarga la lista.
      // El contador global lo actualiza el servidor en tiempo real.
      setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id && (!accept || i.person.id !== item.person.id)) }));
      reload({ silent: true });
    } catch (err) { fail(err); reload({ silent: true }); } finally { setBusy(null); }
  };

  return (
    <div className="interest-list">
      {data.items.map((item) => (
        <article className="interest-card" key={item.id}>
          <Link to={`/u/${item.person.id}`} className="interest-person">
            <Avatar person={item.person} size={56} online={item.person.online} />
            <div>
              <strong>{item.person.name}</strong>
              <span>{item.person.headline}</span>
              <small>{item.person.location} · {timeAgo(item.createdAt)}</small>
            </div>
          </Link>
          {item.project && (
            <div className="interest-context"><ProjectLogo project={item.project} size={26} /> Quiere sumarse a <strong>{item.project.name}</strong></div>
          )}
          {item.note && <p className="interest-note">“{item.note}”</p>}
          <div className="chip-row">
            {item.person.skills.map((s) => <Pill key={s}>{s}</Pill>)}
            {item.person.availability && <Pill tone="muted">⏳ {availabilityLabel(item.person.availability)}</Pill>}
            {item.person.compensation && <Pill tone="muted">✦ {compensationLabel(item.person.compensation)}</Pill>}
          </div>
          <div className="interest-actions">
            <Button variant="secondary" icon={<X size={16} />} loading={busy === `${item.id}-false`} onClick={() => respond(item, false)}>Rechazar</Button>
            <Button icon={<Heart size={16} />} loading={busy === `${item.id}-true`} onClick={() => respond(item, true)}>Aceptar</Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function SavedByList() {
  const { data, error, loading, reload } = useLoader(() => api.get('/interests/saved-by'), []);
  if (loading) return <div className="interest-list">{[0, 1].map((i) => <Skeleton key={i} height={80} radius={18} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data.locked) return data.count ? <LockedView count={data.count} kind="saved" /> : <EmptyState icon={<Bookmark size={20} />} title="Nadie guardó tu perfil todavía" text="Un perfil completo con foto y proyectos aparece más en Descubrir." />;
  if (!data.items.length) return <EmptyState icon={<Bookmark size={20} />} title="Nadie guardó tu perfil todavía" text="Un perfil completo con foto y proyectos aparece más en Descubrir." />;
  return (
    <div className="simple-list">
      {data.items.map((item, i) => (
        <Link to={`/u/${item.person.id}`} className="simple-row" key={i}>
          <Avatar person={item.person} size={46} online={item.person.online} />
          <div><strong>{item.person.name}</strong><span>Guardó {item.project ? item.project.name : 'tu perfil'} · {timeAgo(item.createdAt)}</span></div>
          <Pill tone="accent">{item.person.headline?.split(' ')[0] || 'Perfil'}</Pill>
        </Link>
      ))}
    </div>
  );
}

function SentList() {
  const { fail, toast } = useApp();
  const { data, error, loading, reload, setData } = useLoader(() => api.get('/interests/sent'), []);
  const [busy, setBusy] = useState(null);
  if (loading) return <Skeleton height={80} radius={18} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.items.length) return <EmptyState icon={<Sparkles size={20} />} title="No tenés intereses pendientes" text="Cuando conectes con alguien, lo vas a ver acá hasta que responda." />;

  const withdraw = async (item) => {
    setBusy(item.id);
    try {
      await api.del(`/interests/${item.id}`);
      setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }));
      toast('Retiraste tu interés');
    } catch (err) { fail(err); } finally { setBusy(null); }
  };

  return (
    <div className="simple-list">
      {data.items.map((s) => (
        <div key={s.id} className="simple-row sent-item">
          <Link to={s.project ? `/p/${s.project.id}` : `/u/${s.person.id}`} className="sent-item-link">
            {s.project ? <ProjectLogo project={s.project} size={46} /> : <Avatar person={s.person} size={46} />}
            <div><strong>{s.project ? s.project.name : s.person.name}</strong><span>{s.project ? `Proyecto de ${firstName(s.person.name)}` : s.person.headline} · enviado {timeAgo(s.createdAt)}</span></div>
          </Link>
          <Pill tone="gold" icon={<Clock size={12} />}>Pendiente</Pill>
          <Button size="sm" variant="ghost" loading={busy === s.id} onClick={() => withdraw(s)}>Retirar</Button>
        </div>
      ))}
    </div>
  );
}

export default function Interested() {
  const { query, navigate } = useRouter();
  const tab = query.get('tab') || 'received';
  return (
    <>
      <TopBar back="/matches" backLabel="Matches" title="Interesados" />
      <Page width="sm" className="page-interested">
        <PageHeading kicker={<><Heart size={13} /> Solicitudes</>} title="Interesados" text="Personas que quieren construir con vos." />
        <Segmented
          className="page-tabs"
          value={tab}
          onChange={(id) => navigate(`/interesados${id === 'received' ? '' : `?tab=${id}`}`, { replace: true, keepScroll: true })}
          options={[{ id: 'received', label: 'Quieren conectar' }, { id: 'saved', label: 'Te guardaron' }, { id: 'sent', label: 'Enviadas' }]}
        />
        {tab === 'saved' ? <SavedByList /> : tab === 'sent' ? <SentList /> : <ReceivedList />}
      </Page>
    </>
  );
}
