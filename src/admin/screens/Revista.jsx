import React, { useState } from 'react';
import { ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { REVISTA_SECTIONS } from '../../../shared/revista.js';
import { Button, Pill } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { imageSrc } from '../../lib/media.js';
import { Link, useRouter } from '../../lib/router.jsx';
import { ActionSheet, DataTable, Empty, Failed, FilterSelect, Kpi, PageHeader, Pagination, SearchBox, Status, Tabs, ago, dateShort, num, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { state: '', q: '', section: '', origin: '', sort: 'updated', dir: 'desc', page: '1', pageSize: '25' };

export function ArticleThumb({ src }) {
  const url = src ? imageSrc(src, 160) : '';
  return <span className="adm-thumb">{url ? <img src={url} alt="" loading="lazy" /> : <i>!</i>}</span>;
}

export default function Revista() {
  const { toast } = useApp();
  const { navigate } = useRouter();
  const { values, set, apiQuery, active, reset } = useQueryState(DEFAULTS, { keep: ['state'] });
  const { data, loading, error, reload } = useAdminData(`/admin/articles?${apiQuery}`);
  const [removing, setRemoving] = useState(false);
  const counts = data?.counts || {};

  const columns = [
    { key: 'title', label: 'Nota', primary: true, sort: 'title', sortDir: 'asc', render: (a) => (
      <Link to={`/admin/revista/${a.id}`} className="adm-cell">
        <ArticleThumb src={a.cover} />
        <span className="adm-cell-copy">
          <strong>{a.title}</strong>
          <small>{[a.person, a.sectionLabel].filter(Boolean).join(' · ')}{a.sample ? ' · Ejemplo' : ''}</small>
        </span>
      </Link>
    ) },
    { key: 'state', label: 'Estado', render: (a) => <Status kind="article" value={a.state} /> },
    { key: 'featured', label: 'Portada', align: 'right', mobileHide: true, render: (a) => (a.featured ? <Star size={15} className="adm-star" aria-label="En la portada" /> : <span className="adm-muted">—</span>) },
    { key: 'views', label: 'Lecturas', align: 'right', sort: 'views', render: (a) => num(a.views) },
    { key: 'views7', label: '7 días', align: 'right', mobileHide: true, render: (a) => num(a.views7) },
    { key: 'published', label: 'Publicación', sort: 'published', render: (a) => (a.publishedAt ? dateShort(a.publishedAt) : <span className="adm-muted">Sin fecha</span>) },
    { key: 'updated', label: 'Editada', sort: 'updated', mobileHide: true, render: (a) => ago(a.updatedAt) }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Revista"
        subtitle="Notas, entrevistas y noticias públicas: se leen sin cuenta en /revista."
        actions={(
          <>
            <a className="btn btn-secondary btn-sm" href="/revista" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /><span>Ver la revista</span></a>
            <Button size="sm" icon={<Plus size={15} />} onClick={() => navigate('/admin/revista/nueva')}>Nueva nota</Button>
          </>
        )}
      />
      <div className="adm-kpis adm-revista-kpis">
        <Kpi label="Publicadas" value={num(counts.published)} note={counts.samples ? `${num(counts.samples)} de ejemplo` : 'Todas propias'} />
        <Kpi label="Programadas" value={num(counts.scheduled)} note="Salen solas en su fecha" />
        <Kpi label="Borradores" value={num(counts.draft)} note="Solo los ve administración" />
        <Kpi label="Lecturas · 7 días" value={num(data?.reads.days7)} note="Personas distintas, cada 6 h" />
        <Kpi label="Lecturas · 30 días" value={num(data?.reads.days30)} note="Sin contar administración" />
      </div>
      <div className="adm-table-page">
        <div className="adm-filters">
          <Tabs value={values.state} onChange={(state) => set({ state })} items={[
            { id: '', label: 'Todas', count: data ? counts.total : null },
            { id: 'published', label: 'Publicadas', count: data ? counts.published : null },
            { id: 'scheduled', label: 'Programadas', count: data ? counts.scheduled : null },
            { id: 'draft', label: 'Borradores', count: data ? counts.draft : null }
          ]} />
          <SearchBox value={values.q} onChange={(q) => set({ q })} placeholder="Título o protagonista" />
          <FilterSelect label="Sección" value={values.section} onChange={(section) => set({ section })} all="Todas" options={REVISTA_SECTIONS.map((s) => ({ id: s.id, label: s.label }))} />
          <FilterSelect label="Origen" value={values.origin} onChange={(origin) => set({ origin })} options={[{ id: 'own', label: 'Propias' }, { id: 'sample', label: 'De ejemplo' }]} />
          {active && <button type="button" className="adm-clear" onClick={reset}>Limpiar filtros</button>}
          {counts.samples > 0 && <Button size="sm" variant="ghost" className="adm-export" icon={<Trash2 size={15} />} onClick={() => setRemoving(true)}>Quitar notas de ejemplo</Button>}
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            sort={{ key: values.sort, dir: values.dir }}
            onSort={(key, dir) => set({ sort: key, dir: values.sort === key ? (values.dir === 'asc' ? 'desc' : 'asc') : dir })}
            onRowClick={(a) => navigate(`/admin/revista/${a.id}`)}
            rowClass={(a) => (a.state === 'draft' ? 'is-muted' : '')}
            empty={<Empty title="Todavía no hay notas acá" text="Creá la primera: una entrevista, el perfil de una startup o una noticia." action={<Button size="sm" icon={<Plus size={15} />} onClick={() => navigate('/admin/revista/nueva')}>Nueva nota</Button>} />}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
      <ActionSheet
        open={removing}
        onClose={() => setRemoving(false)}
        title="Quitar las notas de ejemplo"
        text={`Se borran las ${num(counts.samples)} notas de ejemplo de la demo. Tus notas no se tocan. No vuelven a aparecer al reiniciar el servidor.`}
        confirmLabel="Quitar notas de ejemplo"
        tone="danger"
        reason={false}
        onConfirm={() => api.del('/admin/articles/samples').then((r) => { toast(`${r.removed} notas de ejemplo quitadas`); reload({ silent: true }); })}
      >
        <Pill tone="warm">Esta acción no se puede deshacer</Pill>
      </ActionSheet>
    </div>
  );
}
