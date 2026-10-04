import React, { useState } from 'react';
import { ArrowRight, Bookmark, Eye, Heart, History, Lock, Sparkles } from 'lucide-react';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, EmptyState, ErrorState, Pill, Progress, ProjectLogo, Segmented, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { availabilityLabel, firstName, projectRoleLabel, stageLabel, timeAgo } from '../lib/format.js';
import { useLoader, usePersisted } from '../lib/hooks.js';
import { imageSrc } from '../lib/media.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';

function SavedCard({ item, onRemove, onConnect }) {
  const isProject = item.type === 'project';
  const to = isProject ? `/p/${item.id}` : `/u/${item.id}`;
  const image = isProject ? item.cover : item.photo;
  return (
    <article className="saved-card">
      <Link to={to} className="saved-card-media" style={{ backgroundColor: item.accent, backgroundImage: image ? `url("${imageSrc(image, 500)}")` : undefined }}>
        {!image && <span className="saved-initial">{isProject ? '✳' : item.name?.[0]}</span>}
        {item.match?.score != null && <span className="saved-score"><Sparkles size={11} fill="currentColor" /> {item.match.score}%</span>}
      </Link>
      <div className="saved-card-body">
        <Link to={to} className="saved-card-title">
          {isProject && <ProjectLogo project={item} size={26} />}
          <strong>{item.name}</strong>
        </Link>
        <span className="saved-card-sub">{isProject ? item.tagline : item.headline}</span>
        <div className="saved-card-meta">
          {isProject
            ? <><Pill tone="accent">{stageLabel(item.stage)}</Pill>{item.rolesNeeded?.[0] && <Pill>Busca {projectRoleLabel(item.rolesNeeded[0].role)}</Pill>}</>
            : <><Pill>{item.location || 'Remoto'}</Pill>{item.availability && <Pill tone="muted">{availabilityLabel(item.availability)}</Pill>}</>}
        </div>
        <div className="saved-card-actions">
          <button type="button" className="saved-remove" onClick={() => onRemove(item)} aria-label={`Quitar ${item.name} de guardados`}><Bookmark size={17} fill="currentColor" /></button>
          <Button size="sm" variant="soft" icon={<Heart size={15} />} onClick={() => onConnect(item)}>{isProject ? 'Quiero sumarme' : 'Conectar'}</Button>
        </div>
      </div>
    </article>
  );
}

function HistoryList() {
  const { me, showPaywall } = useApp();
  const allowed = hasFeature(me, 'history');
  const { data, loading, error, reload } = useLoader(() => (allowed ? api.get('/me/history') : Promise.resolve({ items: [] })), [allowed]);
  if (!allowed) {
    return (
      <EmptyState
        icon={<Lock size={20} />}
        title="Volvé a cualquier perfil que viste"
        text="El historial de perfiles y proyectos está disponible con Plus."
        action={<Button onClick={() => showPaywall(paywallFor('history'))}>Ver historial con Plus</Button>}
      />
    );
  }
  if (loading) return <Skeleton height={160} radius={18} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.items.length) return <EmptyState icon={<History size={20} />} title="Todavía no viste perfiles" text="Los perfiles y proyectos que abras van a aparecer acá." />;
  return (
    <div className="simple-list">
      {data.items.map((h) => (
        <Link key={`${h.type}-${h.item.id}`} to={h.type === 'project' ? `/p/${h.item.id}` : `/u/${h.item.id}`} className="simple-row">
          {h.type === 'project' ? <ProjectLogo project={h.item} size={44} /> : <Avatar person={h.item} size={44} />}
          <div><strong>{h.item.name}</strong><span>{h.type === 'project' ? h.item.tagline : h.item.headline}</span></div>
          <small className="simple-time"><Eye size={13} /> {timeAgo(h.at)}</small>
        </Link>
      ))}
    </div>
  );
}

export default function Saved() {
  const { me, setMe, fail, toast, celebrate } = useApp();
  const { navigate } = useRouter();
  const [tab, setTab] = usePersisted('kefounder:saved-tab', 'people');
  const { data, error, loading, reload, setData } = useLoader(() => api.get('/saved'), []);

  const remove = async (item) => {
    const key = item.type === 'project' ? 'projects' : 'people';
    setData((d) => ({ ...d, [key]: d[key].filter((i) => i.id !== item.id) }));
    try {
      const res = await api.del(`/saves/${item.type}/${item.id}`);
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      toast('Quitado de guardados');
    } catch (err) { fail(err); reload({ silent: true }); }
  };

  const connect = async (item) => {
    try {
      const res = await api.post('/actions', { targetType: item.type, targetId: item.id, action: 'connect' });
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      await api.del(`/saves/${item.type}/${item.id}`).catch(() => {});
      const key = item.type === 'project' ? 'projects' : 'people';
      setData((d) => ({ ...d, [key]: d[key].filter((i) => i.id !== item.id) }));
      if (res.status === 'matched') celebrate(res.match);
      else toast(`Interés enviado a ${item.type === 'project' ? item.name : firstName(item.name)}`, { icon: <Heart size={14} /> });
    } catch (err) { fail(err); }
  };

  const usage = data?.usage || me.usage;
  const limited = usage?.savesLeft !== null && usage?.savesLeft !== undefined;
  const list = tab === 'projects' ? data?.projects : data?.people;

  return (
    <>
      <TopBar note="Tu espacio para volver a lo que te interesó" />
      <Page width="md" className="page-saved">
        <PageHeading
          kicker={<><Bookmark size={13} /> Tu colección</>}
          title="Guardados"
          text="Personas y proyectos para revisar a tu ritmo."
          action={<Button variant="secondary" size="sm" icon={<Sparkles size={15} />} onClick={() => navigate('/')}>Explorar</Button>}
        />
        <Segmented
          className="page-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'people', label: 'Personas', count: data?.people.length ?? null },
            { id: 'projects', label: 'Proyectos', count: data?.projects.length ?? null },
            { id: 'history', label: 'Vistos' }
          ]}
        />

        {tab === 'history' ? <HistoryList /> : loading ? (
          <div className="saved-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={250} radius={18} />)}</div>
        ) : error ? <ErrorState error={error} onRetry={reload} /> : list.length ? (
          <div className="saved-grid">{list.map((item) => <SavedCard key={`${item.type}-${item.id}`} item={item} onRemove={remove} onConnect={connect} />)}</div>
        ) : (
          <EmptyState
            icon={<Bookmark size={22} />}
            title={`Todavía no guardaste ${tab === 'projects' ? 'proyectos' : 'personas'}`}
            text="Cuando encuentres algo que te interese, guardalo para volver después."
            action={<Button iconRight={<ArrowRight size={15} />} onClick={() => navigate('/')}>Ir a descubrir</Button>}
          />
        )}

        {limited && tab !== 'history' && (
          <div className="limit-note">
            <div>
              <strong>{usage.saves} de 10 guardados</strong>
              <span>Plan Free · guardados ilimitados con Plus</span>
            </div>
            <Progress value={(usage.saves / 10) * 100} />
            <Link to="/planes" className="link-btn">Mejorar plan <ArrowRight size={14} /></Link>
          </div>
        )}
      </Page>
    </>
  );
}
