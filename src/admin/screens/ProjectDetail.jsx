import React, { useState } from 'react';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { Avatar, Button, Cover, ProjectLogo } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { stageLabel } from '../../lib/format.js';
import { Link } from '../../lib/router.jsx';
import { ActionSheet, Failed, FollowUp, KeyValue, Loading, PageHeader, Panel, StatGrid, Status, ago, dateTime, useAdmin, useAdminData } from '../kit.jsx';

export default function ProjectDetail({ params }) {
  const { toast } = useApp();
  const { refreshBadges } = useAdmin();
  const { data, error, reload } = useAdminData(`/admin/projects/${params.id}`);
  const [sheet, setSheet] = useState(null);

  if (error) return <div className="adm-page"><PageHeader title="Proyecto" back={{ to: '/admin/proyectos', label: 'Proyectos' }} /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><Loading rows={8} /></div>;

  const { project: p, owner, stats } = data;
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const hidden = p.moderation === 'hidden';

  return (
    <div className="adm-page">
      <PageHeader back={{ to: '/admin/proyectos', label: 'Proyectos' }} title={
        <span className="adm-entity">
          <ProjectLogo project={p} size={52} />
          <span>
            <span className="adm-entity-name">{p.name}</span>
            <span className="adm-entity-sub">#{p.id} · {p.tagline || 'Sin descripción corta'}</span>
          </span>
        </span>
      } actions={hidden
        ? <Button size="sm" icon={<Eye size={15} />} onClick={() => setSheet('restore')}>Volver a mostrar</Button>
        : <Button size="sm" variant="danger" icon={<EyeOff size={15} />} onClick={() => setSheet('hide')}>Ocultar proyecto</Button>}>
        <div className="adm-entity-pills">
          <Status kind="project" value={p.status} />
          {hidden && <Status kind="moderation" value="hidden" />}
          <span className="adm-muted">Etapa: {stageLabel(p.stage)}{p.industry ? ` · ${p.industry}` : ''}</span>
        </div>
      </PageHeader>

      {hidden && <p className="adm-banner is-warn"><strong>Oculto por moderación.</strong> {p.moderationReason || 'Sin motivo registrado.'} No aparece en Descubrir ni en su enlace público; su founder lo ve marcado.</p>}

      <div className="adm-detail-grid">
        <div className="adm-col">
          <Panel flush className="adm-project-card">
            <Cover src={p.cover} accent={p.accent} className="adm-project-cover" width={700} />
            <div className="adm-pad">
              {p.description && <p className="adm-bio">{p.description}</p>}
              {(p.problem || p.solution) && (
                <details className="adm-profile-bits adm-text-details">
                  <summary>Ver problema y solución</summary>
                  {p.problem && <div className="adm-text-block"><span>Problema</span><p>{p.problem}</p></div>}
                  {p.solution && <div className="adm-text-block"><span>Solución</span><p>{p.solution}</p></div>}
                </details>
              )}
              <KeyValue items={[
                ['Busca', p.rolesNeeded.length ? p.rolesNeeded.join(', ') : '—'],
                ['Stack', p.stack.length ? p.stack.join(', ') : '—'],
                ['Equipo', `${p.teamSize} ${p.teamSize === 1 ? 'persona' : 'personas'}`],
                ['Ubicación', p.location || '—'],
                p.website && ['Sitio', <a href={p.website} target="_blank" rel="noreferrer" className="link-btn"><Globe size={14} />{p.website.replace(/^https?:\/\//, '')}</a>]
              ]} />
            </div>
          </Panel>
        </div>

        <div className="adm-col">
          <Panel title="Founder">
            {owner ? (
              <Link to={`/admin/usuarios/${owner.id}`} className="adm-owner">
                <Avatar person={owner} size={40} />
                <span className="adm-li-copy"><strong>{owner.name}</strong><small>{owner.email}</small></span>
                <Status kind="userStatus" value={owner.status} />
              </Link>
            ) : <p className="adm-muted-line">La cuenta ya no existe.</p>}
          </Panel>
          <Panel title="Rendimiento">
            <StatGrid items={[['Visitas', stats.views], ['Visitas · 7 días', stats.views7], ['Guardados', stats.saves], ['Interesados', stats.interests], ['Matches', stats.matches], ['Reportes', stats.reports]]} />
          </Panel>
          <Panel title="Fechas">
            <KeyValue items={[['Creado', dateTime(p.createdAt)], ['Publicado', p.publishedAt ? dateTime(p.publishedAt) : 'Nunca'], ['Última edición', ago(p.updatedAt)]]} />
          </Panel>
          {data.reports.length > 0 && (
            <Panel title="Reportes">
              <ul className="adm-mini-list">
                {data.reports.map((r) => (
                  <li key={r.id}>
                    <Link to={`/admin/moderacion/reportes/${r.id}`}>
                      <span className="adm-li-copy"><strong>#{r.id} · {r.reason}</strong><small>{ago(r.createdAt)}</small></span>
                      <Status kind="report" value={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="adm-col">
          <FollowUp target={{ type: 'project', id: p.id, label: p.name }} data={data} onChange={refresh} />
        </div>
      </div>

      <ActionSheet open={sheet === 'hide'} onClose={() => setSheet(null)} title={`Ocultar ${p.name}`} text="Deja de aparecer en Descubrir y en su enlace público. Su founder recibe una notificación con el motivo." confirmLabel="Ocultar proyecto" tone="danger" reasonLabel="Motivo para el founder" reasonHint="Lo ve en su notificación y queda en la auditoría." placeholder="Ej.: incluye datos de contacto en la descripción"
        onConfirm={(reason) => api.put(`/admin/projects/${p.id}/moderation`, { moderation: 'hidden', reason }).then(() => { toast('Proyecto oculto'); refresh(); })} />
      <ActionSheet open={sheet === 'restore'} onClose={() => setSheet(null)} title={`Volver a mostrar ${p.name}`} text="Vuelve a aparecer en Descubrir si está publicado. Su founder recibe una notificación." confirmLabel="Mostrar de nuevo" reason={false}
        onConfirm={() => api.put(`/admin/projects/${p.id}/moderation`, { moderation: 'ok' }).then(() => { toast('Proyecto visible de nuevo'); refresh(); })} />
    </div>
  );
}
