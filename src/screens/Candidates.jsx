import React, { useState } from 'react';
import { Heart, Lock, MessageCircle, Users, X } from 'lucide-react';
import { PIPELINE } from '../../shared/catalog.js';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, EmptyState, ErrorState, LockedBadge, Pill, Segmented, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { timeAgo } from '../lib/format.js';
import { useLoader, useMediaQuery } from '../lib/hooks.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';

function CandidateCard({ item, pipelineEnabled, busy, onRespond, onMove, onChat, draggable }) {
  const { showPaywall } = useApp();
  return (
    <article
      className={cx('interest-card', draggable && 'is-draggable')}
      draggable={draggable || undefined}
      onDragStart={draggable ? (e) => { e.dataTransfer.setData('text/plain', String(item.id)); e.dataTransfer.effectAllowed = 'move'; } : undefined}
    >
      <Link to={`/u/${item.person.id}`} className="interest-person" draggable={false}>
        <Avatar person={item.person} size={52} online={item.person.online} />
        <div>
          <strong>{item.person.name}</strong>
          <span>{item.person.headline}</span>
          <small>{item.person.location} · {timeAgo(item.createdAt)}</small>
        </div>
      </Link>
      {item.note && <p className="interest-note">“{item.note}”</p>}
      <div className="chip-row">{item.skills.map((s) => <Pill key={s}>{s}</Pill>)}</div>
      <div className="candidate-foot">
        <label className="pipeline-select">
          <span>Etapa</span>
          <select value={item.pipeline} onChange={(e) => onMove(item, e.target.value)} onMouseDown={(e) => { if (!pipelineEnabled) { e.preventDefault(); showPaywall(paywallFor('candidatesPanel')); } }}>
            {PIPELINE.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {!pipelineEnabled && <Lock size={13} />}
        </label>
        <div className="interest-actions">
          {item.status === 'pending' ? (
            <>
              <Button size="sm" variant="secondary" icon={<X size={15} />} disabled={busy} onClick={() => onRespond(item, false)}>Descartar</Button>
              <Button size="sm" icon={<Heart size={15} />} loading={busy} onClick={() => onRespond(item, true)}>Aceptar</Button>
            </>
          ) : item.matchId ? (
            <Button size="sm" variant="soft" icon={<MessageCircle size={15} />} onClick={() => onChat(item)}>Abrir chat</Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function Candidates({ params }) {
  const { me, fail, toast, celebrate, showPaywall } = useApp();
  const { navigate } = useRouter();
  const id = Number(params.id);
  const allowed = hasFeature(me, 'seeInterested');
  const { data, error, loading, reload, setData } = useLoader(() => (allowed ? api.get(`/projects/${id}/candidates`) : Promise.resolve(null)), [id, allowed]);
  const [stage, setStage] = useState('all');
  const [busy, setBusy] = useState(null);
  const [over, setOver] = useState(null);
  const wide = useMediaQuery('(min-width: 1100px)');

  if (!allowed) {
    return (
      <>
        <TopBar back="/proyectos" backLabel="Mis proyectos" title="Candidatos" />
        <Page width="sm">
          <EmptyState icon={<Lock size={20} />} title="Mirá quiénes quieren sumarse" text="Con Plus ves a cada persona interesada en tu proyecto y respondés al instante. Con Startup, además, los organizás por etapa." action={<Button onClick={() => showPaywall(paywallFor('seeInterested'))}>Desbloquear con Plus</Button>} />
        </Page>
      </>
    );
  }

  const update = (interestId, patch) => setData((d) => ({ ...d, items: d.items.map((i) => (i.id === interestId ? { ...i, ...patch } : i)) }));
  const respond = async (item, accept) => {
    setBusy(item.id);
    try {
      if (accept) {
        const { match } = await api.post(`/interests/${item.id}/accept`);
        update(item.id, { status: 'accepted', matchId: match.id, pipeline: item.pipeline === 'new' ? 'contacted' : item.pipeline });
        celebrate(match);
      } else {
        await api.post(`/interests/${item.id}/decline`);
        setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }));
        toast('Candidatura descartada');
      }
    } catch (err) { fail(err); } finally { setBusy(null); }
  };
  const movePipeline = async (item, next) => {
    if (!data.pipelineEnabled) { showPaywall(paywallFor('candidatesPanel')); return; }
    update(item.id, { pipeline: next });
    try { await api.put(`/interests/${item.id}/pipeline`, { stage: next }); } catch (err) { fail(err); reload({ silent: true }); }
  };

  const items = data?.items || [];
  const shown = stage === 'all' ? items : items.filter((i) => i.pipeline === stage);
  const board = wide && data?.pipelineEnabled && items.length > 0;
  const card = (item, draggable) => (
    <CandidateCard key={item.id} item={item} pipelineEnabled={data.pipelineEnabled} busy={busy === item.id} onRespond={respond} onMove={movePipeline} onChat={(i) => navigate(`/chat/${i.matchId}`)} draggable={draggable} />
  );

  return (
    <>
      <TopBar back="/proyectos" backLabel="Mis proyectos" title="Candidatos" />
      <Page width="md" className={cx('page-candidates', board && 'has-board')}>
        <PageHeading
          kicker={<><Users size={13} /> Panel de candidatos</>}
          title="Candidatos"
          text={board ? 'Arrastrá a cada persona a la etapa en la que está.' : 'Personas que quieren sumarse a tu proyecto.'}
          action={!data?.pipelineEnabled && <LockedBadge plan="startup" />}
        />
        {loading ? <Skeleton height={160} radius={18} /> : error ? <ErrorState error={error} onRetry={reload} /> : board ? (
          // En PC con Startup: tablero con una columna por etapa.
          <div className="board">
            {PIPELINE.map((p) => {
              const column = items.filter((i) => i.pipeline === p.id);
              return (
                <section
                  key={p.id}
                  className={cx('board-col', `is-${p.id}`, over === p.id && 'is-over')}
                  onDragOver={(e) => { e.preventDefault(); if (over !== p.id) setOver(p.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const item = items.find((i) => i.id === Number(e.dataTransfer.getData('text/plain')));
                    if (item && item.pipeline !== p.id) movePipeline(item, p.id);
                  }}
                >
                  <header><span>{p.label}</span><em>{column.length}</em></header>
                  <div className="board-list">
                    {column.map((item) => card(item, true))}
                    {!column.length && <p className="board-empty">Arrastrá candidatos acá</p>}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <Segmented
              className="page-tabs"
              value={stage}
              onChange={setStage}
              options={[{ id: 'all', label: 'Todos', count: items.length }, ...PIPELINE.map((p) => ({ id: p.id, label: p.label, count: items.filter((i) => i.pipeline === p.id).length || null }))]}
            />
            {!shown.length ? (
              <EmptyState icon={<Users size={20} />} title={items.length ? 'Nadie en esta etapa' : 'Todavía no hay candidatos'} text={items.length ? 'Mové candidatos entre etapas para organizar tu búsqueda.' : 'Compartí tu proyecto o completá la ficha para atraer más interés.'} action={!items.length && <Button variant="secondary" onClick={() => navigate(`/proyectos/${id}/editar`)}>Completar ficha</Button>} />
            ) : (
              <div className="interest-list">{shown.map((item) => card(item, false))}</div>
            )}
          </>
        )}
      </Page>
    </>
  );
}
