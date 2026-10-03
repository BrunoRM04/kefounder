import React from 'react';
import { CircleCheck, Trophy } from 'lucide-react';
import { HELP_CATEGORIES } from '../../../shared/catalog.js';
import { Link, useRouter } from '../../lib/router.jsx';
import { DataTable, Empty, Failed, FilterSelect, PageHeader, Pagination, PersonCell, SearchBox, Status, Tabs, ago, num, useAdminData, useQueryState } from '../kit.jsx';

// «Necesito ayuda con…» en el panel: todos los pedidos, con soluciones y reportes abiertos.

const DEFAULTS = { status: 'all', category: '', q: '', page: '1', pageSize: '25' };

export default function HelpList() {
  const { navigate } = useRouter();
  const { values, set, apiQuery } = useQueryState(DEFAULTS, { keep: ['status'] });
  const { data, loading, error, reload } = useAdminData(`/admin/help?${apiQuery}`);
  const counts = data?.counts || {};

  const columns = [
    { key: 'title', label: 'Pedido', primary: true, render: (r) => (
      <span className="adm-cell-copy">
        <strong title={`Necesito ayuda con ${r.title}`}>Necesito ayuda con {r.title}</strong>
        <small>{r.categoryLabel}{r.sample ? ' · ejemplo de la demo' : ''}</small>
      </span>
    ) },
    { key: 'author', label: 'Publicó', mobileHide: true, render: (r) => <PersonCell person={r.author} to={`/admin/usuarios/${r.author.id}`} /> },
    { key: 'answers', label: 'Soluciones', align: 'right', render: (r) => <span>{num(r.answers)}{r.hiddenAnswers ? <small className="adm-muted"> ({r.hiddenAnswers} ocultas)</small> : null}</span> },
    { key: 'reports', label: 'Reportes', align: 'right', mobileHide: true, render: (r) => (r.openReports ? <strong className="adm-alert-num">{r.openReports}</strong> : '—') },
    { key: 'activity', label: 'Actividad', render: (r) => ago(r.lastActivityAt) },
    { key: 'status', label: 'Estado', render: (r) => <Status kind="help" value={r.hidden ? 'hidden' : r.status} /> }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Necesito ayuda con…"
        subtitle="Pedidos de ayuda de la comunidad y sus soluciones. Lo que se oculta deja de verse y no suma puntos."
        actions={<Link to="/admin/ayuda/ranking" className="btn btn-secondary btn-sm"><Trophy size={15} /> Ranking y podios</Link>}
      />
      <div className="adm-table-page">
        <div className="adm-filters">
          <Tabs value={values.status} onChange={(status) => set({ status })} items={[
            { id: 'all', label: 'Todos', count: data ? counts.total : null },
            { id: 'open', label: 'Abiertos', count: data ? counts.open : null },
            { id: 'solved', label: 'Resueltos', count: data ? counts.solved : null },
            { id: 'closed', label: 'Cerrados', count: data ? counts.closed : null },
            { id: 'hidden', label: 'Ocultos', count: data ? counts.hidden : null },
            { id: 'reported', label: 'Con reportes' }
          ]} />
          <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder="Título, texto o persona" />
          <FilterSelect label="Tema" value={values.category} onChange={(category) => set({ category })} options={HELP_CATEGORIES} />
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            onRowClick={(r) => navigate(`/admin/ayuda/${r.id}`)}
            empty={<Empty icon={<CircleCheck size={18} />} title="No hay pedidos acá" text="Las personas publican sus pedidos desde «Necesito ayuda con…», en la barra superior de la app." />}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
    </div>
  );
}
