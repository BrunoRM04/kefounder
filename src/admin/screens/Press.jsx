import React from 'react';
import { CircleCheck } from 'lucide-react';
import { useRouter } from '../../lib/router.jsx';
import { DataTable, Empty, Failed, FilterSelect, PageHeader, Pagination, PersonCell, PlanTag, ProjectCell, Status, Tabs, ago, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { status: 'open', kind: '', page: '1', pageSize: '25' };

export default function Press() {
  const { navigate } = useRouter();
  const { values, set, apiQuery } = useQueryState(DEFAULTS, { keep: ['status'] });
  const { data, loading, error, reload } = useAdminData(`/admin/press?${apiQuery}`);
  const counts = data?.counts || {};

  const columns = [
    { key: 'project', label: 'Startup', primary: true, render: (r) => <ProjectCell project={r.project || { name: r.projectName }} to={`/admin/difusion/${r.id}`} sub={r.pitch} /> },
    { key: 'kind', label: 'Qué incluye', render: (r) => <span className="adm-cell-copy"><strong>{r.kindLabel}</strong><small>Plan <PlanTag plan={r.plan} /></small></span> },
    { key: 'owner', label: 'Pidió', mobileHide: true, render: (r) => (r.owner ? <PersonCell person={r.owner} to={`/admin/usuarios/${r.owner.id}`} /> : '—') },
    { key: 'created', label: 'Recibido', render: (r) => ago(r.createdAt) },
    { key: 'status', label: 'Estado', render: (r) => <Status kind="press" value={r.status} /> }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader title="Difusión" subtitle="Pedidos de las startups (planes Pro y Startup) para salir en la Revista y en Instagram." />
      <div className="adm-table-page">
        <div className="adm-filters">
          <Tabs value={values.status} onChange={(status) => set({ status })} items={[
            { id: 'open', label: 'Abiertos', count: data ? (counts.pending || 0) + (counts.in_progress || 0) : null },
            { id: 'pending', label: 'Pendientes', count: data ? counts.pending || 0 : null },
            { id: 'in_progress', label: 'En preparación', count: data ? counts.in_progress || 0 : null },
            { id: 'published', label: 'Publicados', count: data ? counts.published || 0 : null },
            { id: 'rejected', label: 'Rechazados' },
            { id: 'all', label: 'Todos' }
          ]} />
          <FilterSelect label="Tipo" value={values.kind} onChange={(kind) => set({ kind })} options={[{ id: 'nota', label: 'Nota propia (Startup)' }, { id: 'mencion', label: 'Mención (Pro)' }]} />
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            onRowClick={(r) => navigate(`/admin/difusion/${r.id}`)}
            empty={<Empty icon={<CircleCheck size={18} />} title={values.status === 'open' ? 'No hay pedidos de difusión abiertos' : 'No hay pedidos acá'} text="Las startups con plan Pro o Startup los envían desde «Mis proyectos». Llegan acá por orden de llegada." />}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
    </div>
  );
}
