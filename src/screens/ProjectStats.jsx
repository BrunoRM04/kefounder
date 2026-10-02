import React from 'react';
import { BarChart3, Bookmark, Eye, Heart, Lock, MessageCircle } from 'lucide-react';
import { BarList, ColumnChart, StatTile, dayData } from '../components/Charts.jsx';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { useLoader } from '../lib/hooks.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { useRouter } from '../lib/router.jsx';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export function LockedStats({ title = 'Estadísticas de proyecto' }) {
  const { showPaywall } = useApp();
  return (
    <div className="locked-stats">
      <div className="locked-stats-preview" aria-hidden="true">
        {[42, 58, 36, 70, 64, 88, 52, 76, 95, 60, 72, 84, 66, 90].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
      </div>
      <EmptyState
        icon={<Lock size={20} />}
        title={title}
        text="Mirá visualizaciones, guardados, intereses y matches día a día, y qué perfiles se interesan en tu proyecto. Disponible con Pro."
        action={<Button onClick={() => showPaywall(paywallFor('analytics'))}>Ver estadísticas con Pro</Button>}
      />
    </div>
  );
}

export default function ProjectStats({ params }) {
  const { me } = useApp();
  const { navigate } = useRouter();
  const id = Number(params.id);
  const allowed = hasFeature(me, 'analytics');
  const { data, error, loading, reload } = useLoader(() => (allowed ? api.get(`/projects/${id}/stats`) : Promise.resolve(null)), [id, allowed]);

  return (
    <>
      <TopBar back="/proyectos" backLabel="Mis proyectos" title="Estadísticas" />
      <Page width="md" className="page-stats">
        {!allowed ? (
          <>
            <PageHeading kicker={<><BarChart3 size={13} /> Pro</>} title="Estadísticas" text="Entendé cómo está funcionando tu proyecto." />
            <LockedStats />
          </>
        ) : loading ? (
          <div className="stats-skeleton"><Skeleton height={40} width="50%" /><Skeleton height={110} radius={18} /><Skeleton height={280} radius={18} /></div>
        ) : error ? <ErrorState error={error} onRetry={reload} /> : (
          <>
            <PageHeading
              kicker={<><BarChart3 size={13} /> Últimos 14 días</>}
              title={data.project.name}
              text="Cómo te descubre la comunidad."
              action={<Button variant="secondary" size="sm" onClick={() => navigate(`/proyectos/${id}/candidatos`)}>Ver candidatos</Button>}
            />
            <div className="kpi-row">
              <StatTile icon={<Eye size={14} />} label="Visualizaciones" value={data.totals.views} delta={data.totals.viewsPrev7 ? Math.round(((data.totals.views7 - data.totals.viewsPrev7) / data.totals.viewsPrev7) * 100) : null} />
              <StatTile icon={<Bookmark size={14} />} label="Guardados" value={data.totals.saves} />
              <StatTile icon={<Heart size={14} />} label="Intereses" value={data.totals.interests} />
              <StatTile icon={<MessageCircle size={14} />} label="Matches" value={data.totals.matches} />
            </div>

            <section className="card card-pad chart-card">
              <header className="chart-head">
                <h2>Visualizaciones por día</h2>
                <span>{data.totals.views7} en los últimos 7 días</span>
              </header>
              <ColumnChart data={dayData(data.byDay, 'views')} valueLabel="visualizaciones" />
            </section>

            <div className="stats-grid">
              <section className="card card-pad">
                <header className="chart-head"><h2>Conversión</h2></header>
                <div className="conversion">
                  <div><strong>{pct(data.totals.saves, data.totals.views)}%</strong><span>de quienes lo vieron lo guardaron</span></div>
                  <div><strong>{pct(data.totals.interests, data.totals.views)}%</strong><span>de quienes lo vieron quisieron sumarse</span></div>
                  <div><strong>{pct(data.totals.matches, data.totals.interests)}%</strong><span>de los interesados terminaron en match</span></div>
                </div>
              </section>
              <section className="card card-pad">
                <header className="chart-head"><h2>Perfiles interesados</h2><span>Por rol principal</span></header>
                {data.roles.length ? <BarList items={data.roles.map((r) => ({ label: r.label, value: r.count }))} /> : <p className="muted">Todavía no hay interesados. Compartí tu proyecto para empezar.</p>}
              </section>
            </div>
          </>
        )}
      </Page>
    </>
  );
}
