import React from 'react';
import { Download } from 'lucide-react';
import { PLANS } from '../../../shared/catalog.js';
import { ColumnChart } from '../../components/Charts.jsx';
import { useRouter } from '../../lib/router.jsx';
import {
  DataTable, Failed, FilterSelect, Kpi, Loading, PERIODS, PageHeader, Pagination, Panel, PersonCell, PlanTag, SearchBox, Status, Tabs,
  chartData, dateTime, num, optionsOf, useAdmin, useAdminData, useQueryState, usd
} from '../kit.jsx';

const RANGES = [{ id: '7', label: '7 días' }, { id: '30', label: '30 días' }, { id: '90', label: '90 días' }];
const DEFAULTS = { tab: 'resumen', range: '30', q: '', plan: '', status: '', period: '', sort: 'created', dir: 'desc', page: '1', pageSize: '25' };

function Summary({ scope, values, set }) {
  const { data, error, reload } = useAdminData(`/admin/revenue?scope=${scope}`);
  const sales = useAdminData(`/admin/metrics?metric=revenue&range=${values.range}&scope=${scope}`);
  if (error) return <Failed error={error} onRetry={reload} />;
  if (!data) return <Loading rows={6} />;
  return (
    <>
      <div className="adm-kpis is-6">
        <Kpi label="MRR" value={usd(data.mrr)} note="Ingreso mensual recurrente" />
        <Kpi label="ARR" value={usd(data.arr)} note="Ingreso anual (MRR × 12)" />
        <Kpi label="Suscripciones pagas" value={num(data.paying)} note={data.courtesy ? `+${num(data.courtesy)} de cortesía` : 'Sin cortesías'} />
        <Kpi label="Ticket promedio" value={usd(data.arpu)} note="Por suscripción, al mes" />
        <Kpi label="Altas del mes" value={num(data.newThisMonth)} note="Cobros desde el día 1" />
        <Kpi label="Bajas del mes" value={num(data.canceledThisMonth)} note="Cancelaciones del mes" />
      </div>
      <div className="adm-grid adm-revenue-grid">
        <Panel
          title="Ventas por día"
          hint={sales.data ? `${usd(sales.data.total)} en ${values.range} días` : ' '}
          className="adm-span-2"
          actions={<Tabs value={values.range} onChange={(range) => set({ range })} items={RANGES} className="is-small" />}
        >
          {sales.error ? <Failed error={sales.error} onRetry={sales.reload} /> : sales.data ? <ColumnChart data={chartData(sales.data.series)} valueLabel="US$ en ventas" height={180} /> : <Loading rows={5} />}
        </Panel>
        <Panel title="Por plan" hint="Suscripciones activas" flush>
          <table className="adm-compare">
            <thead><tr><th>Plan</th><th>Pagas</th><th>MRR</th><th>% MRR</th></tr></thead>
            <tbody>
              {data.byPlan.map((p) => (
                <tr key={p.plan}>
                  <td><PlanTag plan={p.plan} />{p.courtesy > 0 && <small className="adm-cell-note adm-nowrap"> +{p.courtesy}</small>}</td>
                  <td>{num(p.subscribers)}</td>
                  <td>{usd(p.mrr)}</td>
                  <td>{p.share}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td>{num(data.paying)}</td><td>{usd(data.mrr)}</td><td>{data.mrr ? '100%' : '—'}</td></tr></tfoot>
          </table>
        </Panel>
      </div>
    </>
  );
}

function Movements({ scope, values, set, apiQuery, active, reset }) {
  const { navigate } = useRouter();
  const { data, loading, error, reload } = useAdminData(`/admin/subscriptions?scope=${scope}&${apiQuery}`);
  const columns = [
    { key: 'user', label: 'Cuenta', primary: true, render: (s) => <PersonCell person={s.user} to={`/admin/usuarios/${s.user.id}`} /> },
    { key: 'plan', label: 'Plan', render: (s) => <PlanTag plan={s.plan} /> },
    { key: 'period', label: 'Período', render: (s) => PERIODS[s.period] || s.period },
    { key: 'amount', label: 'Monto', align: 'right', sort: 'amount', render: (s) => usd(s.amount) },
    { key: 'status', label: 'Estado', render: (s) => <Status kind="subscription" value={s.status} /> },
    { key: 'created', label: 'Alta', sort: 'created', render: (s) => dateTime(s.createdAt) },
    { key: 'ended', label: 'Fin', mobileHide: true, render: (s) => (s.endedAt ? dateTime(s.endedAt) : '—') }
  ];
  return (
    <div className="adm-table-page">
      <div className="adm-filters">
        <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder="Buscar por nombre o email" />
        <FilterSelect label="Plan" value={values.plan} onChange={(plan) => set({ plan })} options={['plus', 'pro', 'startup'].map((id) => ({ id, label: PLANS[id].name }))} />
        <FilterSelect label="Estado" value={values.status} onChange={(status) => set({ status })} options={optionsOf('subscription')} />
        <FilterSelect label="Período" value={values.period} onChange={(period) => set({ period })} options={Object.entries(PERIODS).map(([id, label]) => ({ id, label }))} />
        {active && <button type="button" className="adm-clear" onClick={reset}>Limpiar filtros</button>}
        <a className="btn btn-secondary btn-sm adm-export" href={`/api/admin/subscriptions.csv?scope=${scope}&${apiQuery}`} download><Download size={15} /><span>Exportar CSV</span></a>
      </div>
      {error ? <Failed error={error} onRetry={reload} /> : (
        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          sort={{ key: values.sort, dir: values.dir }}
          onSort={(key, dir) => set({ sort: key, dir: values.sort === key ? (values.dir === 'asc' ? 'desc' : 'asc') : dir })}
          onRowClick={(s) => navigate(`/admin/usuarios/${s.user.id}`)}
        />
      )}
      <Pagination data={data} onChange={set} />
    </div>
  );
}

export default function Revenue() {
  const { scope } = useAdmin();
  const query = useQueryState(DEFAULTS, { keep: ['tab', 'range'] });
  const { values, set } = query;
  return (
    <div className={values.tab === 'movimientos' ? 'adm-page is-table' : 'adm-page'}>
      <PageHeader
        title="Ingresos"
        subtitle="Suscripciones, ingreso recurrente y cobros."
        actions={<Tabs value={values.tab} onChange={(tab) => set({ tab })} items={[{ id: 'resumen', label: 'Resumen' }, { id: 'movimientos', label: 'Movimientos' }]} />}
      />
      {values.tab === 'movimientos' ? <Movements scope={scope} {...query} /> : <Summary scope={scope} values={values} set={set} />}
    </div>
  );
}
