import React, { useState } from 'react';
import { BarList, ColumnChart } from '../../components/Charts.jsx';
import { Empty, Failed, FunnelList, Kpi, Loading, PageHeader, Panel, Tabs, chartData, num, useAdmin, useAdminData, useQueryState, usd } from '../kit.jsx';

const RANGES = [{ id: '7', label: '7 días' }, { id: '30', label: '30 días' }, { id: '90', label: '90 días' }];
const DEFAULTS = { range: '30', metric: 'signups' };
const fmt = (m, value) => (m.money ? usd(value) : num(value));
const SHORT = { active: 'Activos', projects: 'Proyectos', connections: 'Conexiones' };

function Breakdown({ title, hint, tabs, data }) {
  const [tab, setTab] = useState(tabs[0].id);
  const items = data?.[tab] || [];
  return (
    <Panel title={title} hint={hint} actions={<Tabs value={tab} onChange={setTab} items={tabs} className="is-small" />}>
      {items.length ? <BarList items={items} /> : <Empty title="Sin datos para mostrar" />}
    </Panel>
  );
}

export default function Metrics() {
  const { scope } = useAdmin();
  const { values, set } = useQueryState(DEFAULTS);
  const summary = useAdminData(`/admin/metrics/summary?range=${values.range}&scope=${scope}`);
  const detail = useAdminData(`/admin/metrics?metric=${values.metric}&range=${values.range}&scope=${scope}`);
  const s = summary.data;
  const d = detail.data;

  return (
    <div className="adm-page">
      <PageHeader
        title="Métricas"
        subtitle="Crecimiento y uso de la plataforma, día por día."
        actions={<Tabs value={values.range} onChange={(range) => set({ range })} items={RANGES} />}
      />
      {summary.error && <Failed error={summary.error} onRetry={summary.reload} />}
      {!s && !summary.error && <Loading rows={6} />}
      {s && (
        <>
          <div className="adm-kpis is-7" role="group" aria-label="Elegí la métrica del gráfico">
            {s.metrics.map((m) => (
              <Kpi key={m.metric} label={SHORT[m.metric] || m.label} value={fmt(m, m.total)} delta={m.delta} deltaLabel={`antes ${fmt(m, m.previous)}`} newLabel="Nuevo · antes 0" active={values.metric === m.metric} onClick={() => set({ metric: m.metric })} />
            ))}
          </div>
          <div className="adm-grid adm-metrics-grid">
            <Panel title={d ? `${d.label} por día` : 'Por día'} hint={d?.hint} className="adm-span-2">
              {detail.error ? <Failed error={detail.error} onRetry={detail.reload} /> : d ? <ColumnChart data={chartData(d.series)} valueLabel={d.money ? 'US$ en ventas' : d.label.toLowerCase()} height={168} /> : <Loading rows={5} />}
            </Panel>
            <Panel title="Activación" hint={`Cuentas creadas en los últimos ${values.range} días`}>
              {s.funnel[0].value ? <FunnelList steps={s.funnel} /> : <Empty title="Sin registros en el período" />}
            </Panel>
            <Breakdown
              title="Cuentas"
              hint="Perfiles completos"
              data={s.breakdowns}
              tabs={[{ id: 'roles', label: 'Rol' }, { id: 'goals', label: 'Objetivo' }, { id: 'countries', label: 'País' }]}
            />
            <Breakdown
              title="Proyectos"
              hint="Publicados"
              data={s.breakdowns}
              tabs={[{ id: 'stages', label: 'Etapa' }, { id: 'industries', label: 'Industria' }]}
            />
            <Panel title="Proyectos con más interés" hint={`Conexiones recibidas en ${values.range} días`}>
              {s.topProjects.length ? <BarList items={s.topProjects} /> : <Empty title="Sin conexiones a proyectos en el período" />}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
