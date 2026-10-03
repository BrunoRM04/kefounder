import React from 'react';
import { ArrowRight, LifeBuoy, Trophy } from 'lucide-react';
import { Medal, PointsRules, closesIn, placeLabel, standingText, weekLabel } from '../components/HelpParts.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, ErrorState, Segmented, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { firstName } from '../lib/format.js';
import { useLoader, usePersisted } from '../lib/hooks.js';
import { Link, useRouter } from '../lib/router.jsx';

// Ranking semanal de «Necesito ayuda con…»: podio, lista completa y podios anteriores.

const PersonLink = ({ user, children, className }) => (user.visible
  ? <Link to={`/u/${user.id}`} className={className}>{children}</Link>
  : <span className={className}>{children}</span>);

function Podium({ podium, meId }) {
  // Orden clásico: 2.º, 1.º, 3.º.
  const slots = [2, 1, 3].map((place) => podium.find((p) => p.place === place) || null);
  return (
    <div className="podium" role="list" aria-label="Podio">
      {slots.map((p, i) => (
        <div key={i} role="listitem" className={cx('podium-slot', `is-${[2, 1, 3][i]}`, !p && 'is-empty', p?.user.id === meId && 'is-me')}>
          {p ? (
            <PersonLink user={p.user} className="podium-person">
              <span className="podium-avatar"><Avatar person={p.user} size={[2, 1, 3][i] === 1 ? 64 : 52} /><Medal place={p.place} size="sm" /></span>
              <strong>{p.user.id === meId ? 'Vos' : firstName(p.user.name)}</strong>
              <small>{p.points} puntos</small>
            </PersonLink>
          ) : <span className="podium-person"><span className="podium-avatar"><span className="podium-placeholder">?</span><Medal place={[2, 1, 3][i]} size="sm" /></span><small>Libre</small></span>}
          <span className="podium-step" aria-hidden="true">{[2, 1, 3][i]}</span>
        </div>
      ))}
    </div>
  );
}

function RankRow({ row, meId }) {
  return (
    <li className={cx('rank-row', row.user.id === meId && 'is-me')}>
      <span className="rank-num">{row.rank}</span>
      <Avatar person={row.user} size={36} />
      <span className="rank-copy">
        <PersonLink user={row.user} className="rank-name">{row.user.id === meId ? `${row.user.name} (vos)` : row.user.name}</PersonLink>
        <small>{row.accepted ? `${row.accepted} ${row.accepted === 1 ? 'elegida' : 'elegidas'} · ` : ''}{row.helpful} «Me sirvió»{row.answers ? ` · ${row.answers} ${row.answers === 1 ? 'solución' : 'soluciones'}` : ''}</small>
      </span>
      <strong className="rank-points">{row.points}<small> pts</small></strong>
    </li>
  );
}

function MyWeek({ me, closed, podiumMin }) {
  const { navigate } = useRouter();
  let text;
  if (closed) text = me?.place ? `Terminaste ${placeLabel(me.place).replace(' puesto', '')} con ${me.points} puntos. El reconocimiento ya está en tu perfil.` : me?.rank ? `Terminaste ${me.rank}.º con ${me.points} puntos.` : 'No sumaste puntos esa semana.';
  else if (!me?.points) text = `Publicá soluciones en los pedidos abiertos y entrá al ranking. Para el podio hacen falta al menos ${podiumMin} puntos.`;
  else text = me.inPodium ? `${standingText(me)} ¡Que no te alcancen!` : standingText(me);
  return (
    <section className={cx('card my-week', !closed && me?.inPodium && 'is-podium')}>
      <span className="my-week-icon" aria-hidden="true">{me?.place ? <Medal place={me.place} /> : <Trophy size={19} />}</span>
      <p>{text}</p>
      {!closed && <Button size="sm" variant="secondary" icon={<LifeBuoy size={15} />} onClick={() => navigate('/ayuda')}>Ayudar</Button>}
      {closed && me?.place && <Link to="/perfil" className="link-btn">Ver en tu perfil <ArrowRight size={14} /></Link>}
    </section>
  );
}

function History({ weeks, meId }) {
  if (!weeks?.length) return null;
  return (
    <section className="card help-side-card podium-history">
      <header><h2>Podios anteriores</h2></header>
      <ul>
        {weeks.map((w) => (
          <li key={w.key}>
            <span className="podium-history-week">{weekLabel(w.start, w.end)}</span>
            <span className="podium-history-winners">
              {w.winners.map((x) => (
                <span key={x.id} className={cx(x.user.id === meId && 'is-me')}><Medal place={x.place} size="xs" /> {x.user.id === meId ? 'Vos' : firstName(x.user.name)}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HelpRanking() {
  const { me: viewer } = useApp();
  const [which, setWhich] = usePersisted('kefounder:help-ranking', 'current');
  const { data, error, loading, reload } = useLoader(() => api.get(`/help/ranking?week=${which}`), [which]);

  return (
    <>
      <TopBar back="/ayuda" backLabel="Necesito ayuda" title="Ranking semanal" />
      <Page width="lg" className="page-ranking">
        <div className="page-heading help-heading">
          <div>
            <span className="kicker"><Trophy size={13} /> Necesito ayuda con…</span>
            <h1>Ranking semanal<span className="accent-dot">.</span></h1>
            <p>Va de lunes a domingo. Las tres personas con más puntos ganan un reconocimiento que queda en su perfil.</p>
          </div>
        </div>
        <div className="help-layout">
          <div className="help-main">
            <Segmented className="page-tabs" value={which} onChange={setWhich} options={[{ id: 'current', label: 'Esta semana' }, { id: 'last', label: 'Semana pasada' }]} />
            {loading && !data ? (
              <><Skeleton height={64} radius={16} /><Skeleton height={220} radius={20} /><Skeleton height={200} radius={18} /></>
            ) : error ? <ErrorState error={error} onRetry={reload} /> : (
              <>
                <p className="ranking-week">
                  <strong>Semana del {weekLabel(data.week.start, data.week.end)}</strong>
                  <span>{data.week.closed ? 'Cerrada' : closesIn(data.week.end)}</span>
                </p>
                <MyWeek me={data.me} closed={data.week.closed} podiumMin={data.podiumMin} />
                <section className="card ranking-board">
                  <Podium podium={data.podium} meId={viewer?.id} />
                  {data.items.length > 0 ? (
                    <ol className="rank-list">{data.items.map((row) => <RankRow key={row.user.id} row={row} meId={viewer?.id} />)}</ol>
                  ) : !data.podium.length && (
                    <p className="ranking-empty">{data.week.closed ? 'Nadie llegó al podio esa semana.' : `Todavía nadie llegó a los ${data.podiumMin} puntos del podio. ¡Puede ser tuyo!`}</p>
                  )}
                </section>
              </>
            )}
          </div>
          <aside className="help-aside">
            <section className="card help-side-card">
              <header><h2>Cómo se suman puntos</h2></header>
              <PointsRules />
            </section>
            <History weeks={data?.history} meId={viewer?.id} />
          </aside>
        </div>
      </Page>
    </>
  );
}
