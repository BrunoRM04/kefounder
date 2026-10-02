import React, { useState } from 'react';
import { BarChart3, BriefcaseBusiness, Check, Copy, Eye, Heart, Lock, MessageCircle, MoreHorizontal, Pause, Pencil, Plus, Share2, Trash2, Users } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import PressPanel from '../components/PressPanel.jsx';
import { ConfirmSheet } from '../components/Sheets.jsx';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { ActionMenu, Button, Cover, EmptyState, ErrorState, IconButton, Pill, ProjectLogo, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { projectRoleLabel, stageLabel, timeAgo } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { shareLink } from '../lib/media.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { useRouter } from '../lib/router.jsx';

const STATUS = { published: { label: 'Publicado', tone: 'accent' }, draft: { label: 'Borrador', tone: 'muted' }, paused: { label: 'Pausado', tone: 'gold' } };

function OwnedProject({ project, onChange, onDelete }) {
  const { me, fail, toast, showPaywall, setMe } = useApp();
  const { navigate } = useRouter();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = STATUS[project.status] || STATUS.draft;
  const canStats = hasFeature(me, 'analytics');
  const canCandidates = hasFeature(me, 'seeInterested');

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      if (res.project) onChange(res.project, res);
      if (message) toast(message);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const toggle = () => (project.status === 'published'
    ? run(() => api.post(`/projects/${project.id}/pause`), 'Proyecto pausado: no aparece en Descubrir')
    : run(() => api.post(`/projects/${project.id}/publish`), '¡Proyecto publicado! ✨'));
  const share = async () => {
    const r = await shareLink({ title: project.name, text: project.tagline, url: `${window.location.origin}/p/${project.id}` });
    if (r === 'copied') toast('Enlace copiado');
  };

  return (
    <article className={cx('owned', `is-${project.status}`)}>
      <div className="owned-top">
        <Cover src={project.cover} accent={project.accent} className="owned-cover" width={400} />
        <div className="owned-title">
          <div className="owned-name">
            <ProjectLogo project={project} size={30} />
            <h2>{project.name}</h2>
            <Pill tone={status.tone}><i className="status-dot" />{status.label}</Pill>
            {project.moderation === 'hidden' && <Pill tone="warm">Oculto por moderación</Pill>}
          </div>
          <p>{project.tagline || 'Sin descripción corta todavía.'}</p>
          <div className="owned-meta">
            <span>Etapa: {stageLabel(project.stage)}</span>
            {project.rolesNeeded?.length > 0 && <span>Busca: {project.rolesNeeded.map((r) => projectRoleLabel(r.role)).join(', ')}</span>}
            <span>Creado {timeAgo(project.createdAt)}</span>
          </div>
        </div>
        <div className="relative owned-menu">
          <IconButton label="Más opciones" onClick={() => setMenu(true)}><MoreHorizontal size={20} /></IconButton>
          <ActionMenu
            open={menu}
            onClose={() => setMenu(false)}
            title={project.name}
            items={[
              { label: 'Ver ficha pública', icon: <Eye size={17} />, onClick: () => navigate(`/p/${project.id}`) },
              project.status === 'published' && { label: 'Compartir enlace', icon: <Share2 size={17} />, onClick: share },
              { label: 'Duplicar', icon: <Copy size={17} />, onClick: () => run(() => api.post(`/projects/${project.id}/duplicate`), 'Proyecto duplicado como borrador') },
              { label: 'Eliminar proyecto', icon: <Trash2 size={17} />, danger: true, onClick: () => onDelete(project) }
            ]}
          />
        </div>
      </div>

      <div className="owned-stats">
        <div><Eye size={16} /><strong>{project.stats.views.toLocaleString('es-UY')}</strong><span>Visualizaciones</span></div>
        <div><Heart size={16} /><strong>{project.stats.interested}</strong><span>Interesados</span></div>
        <div><MessageCircle size={16} /><strong>{project.stats.matches}</strong><span>Matches</span></div>
        <div><Users size={16} /><strong>{project.stats.saves}</strong><span>Guardados</span></div>
      </div>

      <div className="owned-actions">
        <Button size="sm" icon={<Pencil size={15} />} onClick={() => navigate(`/proyectos/${project.id}/editar`)}>Editar</Button>
        <Button size="sm" variant="secondary" loading={busy} icon={project.status === 'published' ? <Pause size={15} /> : <Check size={15} />} onClick={toggle}>{project.status === 'published' ? 'Pausar' : 'Publicar'}</Button>
        <Button size="sm" variant="secondary" icon={canStats ? <BarChart3 size={15} /> : <Lock size={14} />} onClick={() => (canStats ? navigate(`/proyectos/${project.id}/estadisticas`) : showPaywall(paywallFor('analytics')))}>Estadísticas</Button>
        <Button size="sm" variant="secondary" icon={canCandidates ? <Users size={15} /> : <Lock size={14} />} onClick={() => (canCandidates ? navigate(`/proyectos/${project.id}/candidatos`) : showPaywall(paywallFor('seeInterested')))}>Candidatos{project.stats.interested ? ` · ${project.stats.interested}` : ''}</Button>
      </div>
    </article>
  );
}

export default function MyProjects() {
  const { me, fail, toast, setMe } = useApp();
  const { navigate } = useRouter();
  const { data, error, loading, reload, setData } = useLoader(() => api.get('/me/projects'), []);
  const [toDelete, setToDelete] = useState(null);

  const items = data?.items || [];
  const usage = data?.usage || me.usage;
  const limit = PLANS[me.plan]?.limits.activeProjects;
  const totals = items.reduce((acc, p) => ({ views: acc.views + p.stats.views, interested: acc.interested + p.stats.interested, matches: acc.matches + p.stats.matches }), { views: 0, interested: 0, matches: 0 });

  const onChange = (project) => {
    setData((d) => {
      const exists = d.items.some((p) => p.id === project.id);
      return { ...d, items: exists ? d.items.map((p) => (p.id === project.id ? project : p)) : [project, ...d.items] };
    });
    reload({ silent: true });
  };

  return (
    <>
      <TopBar note="Administrá las ideas que estás construyendo" />
      <Page width="md" className="page-projects">
        <PageHeading
          kicker={<><BriefcaseBusiness size={13} /> Tu espacio de trabajo</>}
          title="Mis proyectos"
          text="Un lugar para hacer crecer lo que imaginaste."
          action={<Button icon={<Plus size={17} />} onClick={() => navigate('/proyectos/nuevo')}>Crear proyecto</Button>}
        />

        {loading ? (
          <div className="owned-list"><Skeleton height={88} radius={18} /><Skeleton height={240} radius={20} /></div>
        ) : error ? <ErrorState error={error} onRetry={reload} /> : (
          <>
            <div className="overview">
              <div><strong>{usage.activeProjects}<small>/{limit}</small></strong><span>Proyectos activos</span></div>
              <div><strong>{totals.views.toLocaleString('es-UY')}</strong><span>Visualizaciones</span></div>
              <div><strong>{totals.interested}</strong><span>Interesados</span></div>
              <div><strong>{totals.matches}</strong><span>Matches</span></div>
            </div>
            {usage.activeProjectsLeft === 0 && me.plan !== 'startup' && (
              <div className="limit-note inline">
                <span>✳ {limit === 1 ? 'Ya usaste tu proyecto activo' : `Ya usaste tus ${limit} proyectos activos`} del plan {PLANS[me.plan].name}.</span>
                <button type="button" className="link-btn" onClick={() => navigate('/planes')}>Ver planes</button>
              </div>
            )}
            <PressPanel />
            {items.length ? (
              <div className="owned-list">
                {items.map((p) => <OwnedProject key={p.id} project={p} onChange={onChange} onDelete={setToDelete} />)}
              </div>
            ) : (
              <EmptyState
                icon={<BriefcaseBusiness size={22} />}
                title="Tu próxima idea empieza acá"
                text="Publicá un proyecto para encontrar a las personas que lo pueden construir con vos. Te lleva un par de minutos."
                action={<Button icon={<Plus size={16} />} onClick={() => navigate('/proyectos/nuevo')}>Crear mi primer proyecto</Button>}
              />
            )}
          </>
        )}
      </Page>
      <ConfirmSheet
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name}?`}
        text="Se borran la ficha, las estadísticas y las solicitudes asociadas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          try {
            const res = await api.del(`/projects/${toDelete.id}`);
            setData((d) => ({ ...d, items: d.items.filter((p) => p.id !== toDelete.id), usage: res.usage }));
            if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
            toast('Proyecto eliminado');
          } catch (err) { fail(err); }
        }}
      />
    </>
  );
}
