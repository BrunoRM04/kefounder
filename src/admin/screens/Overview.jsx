import React, { useState } from 'react';
import { Activity, BadgeCheck, CircleCheck, ClipboardList, Gem, Megaphone, HeartHandshake, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { BarList, ColumnChart } from '../../components/Charts.jsx';
import { Avatar } from '../../components/ui.jsx';
import { Link } from '../../lib/router.jsx';
import { Empty, Failed, FunnelList, Kpi, Loading, PageHeader, Panel, PlanTag, Tabs, ago, chartData, dueLabel, num, useAdmin, useAdminData, usd } from '../kit.jsx';

const TREND = [
  { id: 'signups', label: 'Registros' },
  { id: 'active', label: 'Activos' },
  { id: 'connections', label: 'Conexiones' },
  { id: 'matches', label: 'Matches' },
  { id: 'messages', label: 'Mensajes' }
];

function Trend({ scope }) {
  const [metric, setMetric] = useState('signups');
  const { data, error, reload } = useAdminData(`/admin/metrics?metric=${metric}&range=30&scope=${scope}`);
  return (
    <Panel
      title={data ? `${data.label} · últimos 30 días` : 'Tendencia'}
      hint={data ? `${num(data.total)} en total · ${data.hint}` : ' '}
      className="adm-span-2 adm-trend"
      actions={<Tabs value={metric} onChange={setMetric} items={TREND} className="is-small" />}
    >
      {error ? <Failed error={error} onRetry={reload} /> : data ? <ColumnChart data={chartData(data.series)} valueLabel={data.label.toLowerCase()} height={150} /> : <Loading rows={5} />}
    </Panel>
  );
}

function Queue({ queue }) {
  const { counts } = queue;
  const rows = [
    { to: '/admin/moderacion', icon: <ShieldAlert size={17} />, label: 'Reportes por revisar', value: counts.reports },
    { to: '/admin/moderacion?tab=identidad', icon: <BadgeCheck size={17} />, label: 'Identidades por verificar', value: counts.identity },
    { to: '/admin/seguimiento', icon: <ClipboardList size={17} />, label: 'Tareas vencidas o para hoy', value: counts.tasks },
    { to: '/admin/difusion', icon: <Megaphone size={17} />, label: 'Pedidos de difusión', value: counts.press || 0 }
  ];
  const clear = rows.every((r) => !r.value);
  return (
    <Panel title="Pendientes" hint="Lo que necesita tu atención" className="adm-queue">
      <ul className="adm-queue-counts">
        {rows.map((r) => (
          <li key={r.label}>
            <Link to={r.to} className={r.value ? 'has-items' : ''}>
              {r.icon}<span>{r.label}</span><strong>{num(r.value)}</strong>
            </Link>
          </li>
        ))}
      </ul>
      {clear && !queue.tasks.length ? (
        <Empty icon={<CircleCheck size={18} />} title="Todo al día" text="No hay reportes, verificaciones, tareas ni pedidos de difusión pendientes." />
      ) : queue.tasks.length > 0 && (
        <div className="adm-queue-tasks">
          <span className="adm-mini-title">Próximas tareas</span>
          <ul>
            {queue.tasks.slice(0, 4).map((t) => (
              <li key={t.id}>
                <Link to="/admin/seguimiento">
                  <span className={t.overdue ? 'adm-due is-overdue' : t.today ? 'adm-due is-today' : 'adm-due'}>{dueLabel(t.dueAt)}</span>
                  <span className="adm-queue-task-title">{t.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export default function Overview() {
  const { scope } = useAdmin();
  const { data, error, reload } = useAdminData(`/admin/overview?scope=${scope}`);
  const today = new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="adm-page">
      <PageHeader title="Resumen" subtitle={`${today.charAt(0).toUpperCase()}${today.slice(1)} · ${scope === 'real' ? 'solo cuentas reales' : 'incluye las cuentas demo'}`} />
      {error && <Failed error={error} onRetry={reload} />}
      {!data && !error && <Loading rows={6} />}
      {data && (
        <>
          {scope === 'real' && data.kpis.users.value === 0 && (
            <p className="adm-banner">Todavía no hay cuentas reales. Activá <strong>Incluir demo</strong> arriba para ver el tablero con los datos de ejemplo.</p>
          )}
          <div className="adm-kpis">
            <Kpi icon={<Users size={15} />} label="Cuentas" value={num(data.kpis.users.value)} note={`${num(data.kpis.users.newWeek)} nuevas en 7 días`} />
            <Kpi icon={<Activity size={15} />} label="Activas · 7 días" value={num(data.kpis.active.value)} delta={data.kpis.active.delta} deltaLabel="vs. 7 días previos" />
            <Kpi icon={<HeartHandshake size={15} />} label="Matches · 7 días" value={num(data.kpis.matches.value)} delta={data.kpis.matches.delta} deltaLabel="vs. 7 días previos" />
            <Kpi icon={<Gem size={15} />} label="Ingresos (MRR)" value={usd(data.kpis.mrr.value)} note={`${num(data.kpis.mrr.paying)} suscripciones pagas`} />
            <Kpi icon={<UserPlus size={15} />} label="Perfil completo" value={`${data.kpis.onboarding.value}%`} note={`${num(data.kpis.onboarding.done)} de ${num(data.kpis.onboarding.total)} cuentas`} />
          </div>
          <div className="adm-grid adm-overview-grid">
            <Trend scope={scope} />
            <Queue queue={data.queue} />
            <Panel title="Activación" hint="Cuentas creadas en los últimos 30 días">
              {data.funnel[0].value ? <FunnelList steps={data.funnel} /> : <Empty title="Sin registros en 30 días" />}
            </Panel>
            <Panel title="Cuentas por plan" hint="Plan actual de cada cuenta">
              <BarList items={data.plans.map((p) => ({ label: p.label, value: p.value }))} />
            </Panel>
            <Panel title="Últimos registros" actions={<Link to="/admin/usuarios" className="link-btn">Ver todos</Link>} className="adm-recent">
              {data.recentUsers.length ? (
                <ul className="adm-recent-list">
                  {data.recentUsers.map((u) => (
                    <li key={u.id}>
                      <Link to={`/admin/usuarios/${u.id}`}>
                        <Avatar person={u} size={30} />
                        <span className="adm-li-copy"><strong>{u.name}</strong><small>{u.onboarded ? u.email : 'Perfil sin completar'}</small></span>
                        <PlanTag plan={u.plan} />
                        <time>{ago(u.createdAt)}</time>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty title="Sin registros todavía" />}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
