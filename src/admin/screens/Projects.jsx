import React from 'react';
import { Download } from 'lucide-react';
import { INDUSTRIES, STAGES } from '../../../shared/catalog.js';
import { stageLabel } from '../../lib/format.js';
import { Link, useRouter } from '../../lib/router.jsx';
import { DataTable, Failed, FilterSelect, PageHeader, Pagination, ProjectCell, SearchBox, Status, Tabs, dateShort, num, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { segment: 'real', q: '', status: '', moderation: '', stage: '', industry: '', sort: 'created', dir: 'desc', page: '1', pageSize: '25' };

export default function Projects() {
  const { navigate } = useRouter();
  const { values, set, apiQuery, active, reset } = useQueryState(DEFAULTS, { keep: ['segment'] });
  const { data, loading, error, reload } = useAdminData(`/admin/projects?${apiQuery}`);
  const counts = data?.counts || {};

  const columns = [
    { key: 'project', label: 'Proyecto', primary: true, sort: 'name', sortDir: 'asc', render: (p) => <ProjectCell project={p} to={`/admin/proyectos/${p.id}`} /> },
    { key: 'owner', label: 'Founder', render: (p) => <Link to={`/admin/usuarios/${p.owner.id}`} className="adm-link">{p.owner.name}</Link> },
    { key: 'status', label: 'Estado', render: (p) => <Status kind="project" value={p.status} /> },
    { key: 'moderation', label: 'Moderación', render: (p) => (p.moderation === 'hidden' ? <Status kind="moderation" value="hidden" /> : <span className="adm-muted">Visible</span>) },
    { key: 'stage', label: 'Etapa', mobileHide: true, render: (p) => stageLabel(p.stage) },
    { key: 'views', label: 'Visitas', align: 'right', render: (p) => num(p.views) },
    { key: 'interests', label: 'Interesados', align: 'right', className: 'is-tablet-hide', render: (p) => num(p.interests) },
    { key: 'reports', label: 'Reportes', align: 'right', mobileHide: true, render: (p) => (p.openReports ? <strong className="adm-alert-num">{p.openReports}</strong> : '—') },
    { key: 'created', label: 'Creado', sort: 'created', render: (p) => dateShort(p.createdAt) }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Proyectos"
        subtitle={data ? `${num(data.total)} ${data.total === 1 ? 'proyecto' : 'proyectos'} con estos filtros` : 'Todos los proyectos'}
        actions={<a className="btn btn-secondary btn-sm" href={`/api/admin/projects.csv?${apiQuery}`} download><Download size={15} /><span>Exportar CSV</span></a>}
      />
      <div className="adm-table-page">
        <Tabs
          value={values.segment}
          onChange={(segment) => set({ segment })}
          className="adm-segment-tabs"
          items={[{ id: 'real', label: 'De cuentas reales' }, { id: 'demo', label: 'De cuentas demo' }, { id: 'bot', label: 'De bots' }, { id: 'all', label: 'Todos' }]}
        />
        <div className="adm-filters">
          <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder="Nombre, founder o #número" />
          <FilterSelect label="Estado" value={values.status} onChange={(status) => set({ status })} options={[
            { id: 'published', label: `Publicado${counts.published ? ` (${counts.published})` : ''}` },
            { id: 'draft', label: `Borrador${counts.draft ? ` (${counts.draft})` : ''}` },
            { id: 'paused', label: `Pausado${counts.paused ? ` (${counts.paused})` : ''}` }
          ]} />
          <FilterSelect label="Moderación" value={values.moderation} onChange={(moderation) => set({ moderation })} options={[{ id: 'ok', label: 'Visible' }, { id: 'hidden', label: `Oculto${counts.hidden ? ` (${counts.hidden})` : ''}` }]} />
          <FilterSelect label="Etapa" value={values.stage} onChange={(stage) => set({ stage })} all="Todas" options={STAGES.map((s) => ({ id: s.id, label: s.label }))} />
          <FilterSelect label="Industria" value={values.industry} onChange={(industry) => set({ industry })} all="Todas" options={INDUSTRIES.map((i) => ({ id: i, label: i }))} />
          {active && <button type="button" className="adm-clear" onClick={reset}>Limpiar filtros</button>}
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            sort={{ key: values.sort, dir: values.dir }}
            onSort={(key, dir) => set({ sort: key, dir: values.sort === key ? (values.dir === 'asc' ? 'desc' : 'asc') : dir })}
            onRowClick={(p) => navigate(`/admin/proyectos/${p.id}`)}
            rowClass={(p) => (p.moderation === 'hidden' ? 'is-muted' : '')}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
    </div>
  );
}
