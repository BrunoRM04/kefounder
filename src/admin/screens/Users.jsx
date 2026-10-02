import React from 'react';
import { Download } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../../shared/catalog.js';
import { useRouter } from '../../lib/router.jsx';
import { DataTable, Failed, FilterSelect, PageHeader, Pagination, PersonCell, PlanTag, SearchBox, Status, Tabs, ago, dateShort, num, optionsOf, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { segment: 'real', q: '', plan: '', status: '', onboarding: '', identity: '', activity: '', sort: 'created', dir: 'desc', page: '1', pageSize: '25' };
const SEGMENT_TABS = [['real', 'Reales'], ['demo', 'Demo'], ['bot', 'Bots'], ['test', 'Prueba'], ['staff', 'Equipo'], ['all', 'Todas']];

export default function Users() {
  const { navigate } = useRouter();
  const { values, set, apiQuery, active, reset } = useQueryState(DEFAULTS, { keep: ['segment'] });
  const { data, loading, error, reload } = useAdminData(`/admin/users?${apiQuery}`);
  const segments = data?.segments || {};
  const all = Object.values(segments).reduce((a, b) => a + b, 0);

  const columns = [
    { key: 'person', label: 'Cuenta', primary: true, sort: 'name', sortDir: 'asc', render: (u) => <PersonCell person={u} to={`/admin/usuarios/${u.id}`} /> },
    { key: 'plan', label: 'Plan', render: (u) => <PlanTag plan={u.plan} /> },
    { key: 'status', label: 'Estado', render: (u) => <Status kind="userStatus" value={u.status} /> },
    { key: 'segment', label: 'Segmento', mobileHide: true, render: (u) => <Status kind="segment" value={u.segment} dot={false} /> },
    { key: 'profile', label: 'Perfil', render: (u) => (u.onboarded ? 'Completo' : <span className="adm-muted">Sin completar</span>) },
    { key: 'identity', label: 'Identidad', mobileHide: true, render: (u) => <Status kind="identity" value={u.identity} dot={false} /> },
    { key: 'projects', label: 'Proyectos', align: 'right', mobileHide: true, render: (u) => num(u.projects) },
    { key: 'created', label: 'Alta', sort: 'created', render: (u) => dateShort(u.createdAt) },
    { key: 'active', label: 'Última actividad', sort: 'active', render: (u) => ago(u.lastActiveAt) }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Usuarios"
        subtitle={data ? `${num(data.total)} ${data.total === 1 ? 'cuenta' : 'cuentas'} con estos filtros` : 'Cuentas registradas'}
        actions={<a className="btn btn-secondary btn-sm" href={`/api/admin/users.csv?${apiQuery}`} download><Download size={15} /><span>Exportar CSV</span></a>}
      />
      <div className="adm-table-page">
        <Tabs
          value={values.segment}
          onChange={(segment) => set({ segment })}
          className="adm-segment-tabs"
          items={SEGMENT_TABS.map(([id, label]) => ({ id, label, count: id === 'all' ? all : segments[id] ?? (data ? 0 : null) }))}
        />
        <div className="adm-filters">
          <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder="Nombre, email o #número" />
          <FilterSelect label="Plan" value={values.plan} onChange={(plan) => set({ plan })} options={PLAN_ORDER.map((id) => ({ id, label: PLANS[id].name }))} />
          <FilterSelect label="Estado" value={values.status} onChange={(status) => set({ status })} options={optionsOf('userStatus')} />
          <FilterSelect label="Perfil" value={values.onboarding} onChange={(onboarding) => set({ onboarding })} options={[{ id: 'done', label: 'Completo' }, { id: 'pending', label: 'Sin completar' }]} />
          <FilterSelect label="Identidad" value={values.identity} onChange={(identity) => set({ identity })} options={[{ id: 'verified', label: 'Verificada' }, { id: 'pending', label: 'En revisión' }, { id: 'rejected', label: 'Rechazada' }, { id: 'none', label: 'Sin enviar' }]} />
          <FilterSelect label="Actividad" value={values.activity} onChange={(activity) => set({ activity })} all="Cualquiera" options={[{ id: '7', label: 'Últimos 7 días' }, { id: '30', label: 'Últimos 30 días' }, { id: 'dormant', label: 'Inactivas +30 días' }]} />
          {active && <button type="button" className="adm-clear" onClick={reset}>Limpiar filtros</button>}
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            sort={{ key: values.sort, dir: values.dir }}
            onSort={(key, dir) => set({ sort: key, dir: values.sort === key ? (values.dir === 'asc' ? 'desc' : 'asc') : dir })}
            onRowClick={(u) => navigate(`/admin/usuarios/${u.id}`)}
            rowClass={(u) => (u.status === 'suspended' ? 'is-muted' : '')}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
    </div>
  );
}
