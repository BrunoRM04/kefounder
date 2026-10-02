import React from 'react';
import { Link } from '../../lib/router.jsx';
import { DataTable, Empty, Failed, FilterSelect, PageHeader, Pagination, Tabs, actionLabel, dateTime, targetLink, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { area: '', since: '', page: '1', pageSize: '50' };
const AREAS = [
  { id: 'user', label: 'Cuentas' }, { id: 'identity', label: 'Identidad' }, { id: 'project', label: 'Proyectos' }, { id: 'report', label: 'Reportes' },
  { id: 'article', label: 'Revista' }, { id: 'press', label: 'Difusión' }, { id: 'task', label: 'Tareas' }, { id: 'note', label: 'Notas internas' }, { id: 'system', label: 'Sistema' }
];
const TARGET = { user: 'Cuenta', project: 'Proyecto', report: 'Reporte', article: 'Nota', press: 'Difusión' };

export default function Audit() {
  const { values, set, apiQuery } = useQueryState(DEFAULTS);
  const { data, loading, error, reload } = useAdminData(`/admin/audit?${apiQuery}`);
  const columns = [
    { key: 'when', label: 'Cuándo', width: 150, render: (a) => dateTime(a.createdAt) },
    { key: 'action', label: 'Acción', primary: true, render: (a) => <span className="adm-cell-copy"><strong>{actionLabel(a.action)}</strong><small>{a.summary || '—'}</small></span> },
    { key: 'target', label: 'Sobre', render: (a) => (a.targetType && targetLink(a.targetType, a.targetId) ? <Link to={targetLink(a.targetType, a.targetId)} className="adm-link">{TARGET[a.targetType]} #{a.targetId}</Link> : <span className="adm-muted">—</span>) },
    { key: 'admin', label: 'Quién', render: (a) => a.admin }
  ];
  return (
    <div className="adm-page is-table">
      <PageHeader title="Auditoría" subtitle="Registro de todo lo que se hizo desde el panel. No se puede editar ni borrar." />
      <div className="adm-table-page">
        <div className="adm-filters">
          <Tabs value={values.since} onChange={(since) => set({ since })} items={[{ id: '', label: 'Todo' }, { id: '1', label: '24 h' }, { id: '7', label: '7 días' }, { id: '30', label: '30 días' }]} />
          <FilterSelect label="Área" value={values.area} onChange={(area) => set({ area })} all="Todas" options={AREAS} />
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable columns={columns} rows={data?.items} loading={loading} empty={<Empty title="Sin acciones registradas" text="Cada cambio que hagas desde el panel aparece acá con fecha y detalle." />} />
        )}
        <Pagination data={data} onChange={set} />
      </div>
    </div>
  );
}
