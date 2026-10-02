import React, { useEffect, useState } from 'react';
import { CircleCheck, ExternalLink, FilePlus2, Newspaper, PlayCircle, XCircle } from 'lucide-react';
import { Avatar, Button, ProjectLogo } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { ActionSheet, Failed, FollowUp, KeyValue, Loading, PageHeader, Panel, PlanTag, Status, ago, dateTime, useAdmin, useAdminData } from '../kit.jsx';

const KIND_HINT = {
  nota: 'Nota propia: una entrevista o perfil de la startup en la Revista y una publicación en el feed de Instagram.',
  mencion: 'Mención: la startup aparece en una nota colectiva de la Revista y en las historias de Instagram.'
};

export default function PressDetail({ params }) {
  const { toast, fail } = useApp();
  const { refreshBadges } = useAdmin();
  const { navigate } = useRouter();
  const { data, error, reload } = useAdminData(`/admin/press/${params.id}`);
  const [instagram, setInstagram] = useState('');
  const [busy, setBusy] = useState('');
  const [sheet, setSheet] = useState(null);
  useEffect(() => { if (data) setInstagram(data.request.instagramUrl || ''); }, [data]);

  if (error) return <div className="adm-page"><PageHeader title="Difusión" back={{ to: '/admin/difusion', label: 'Difusión' }} /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><Loading rows={8} /></div>;
  const r = data.request;
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const open = r.status === 'pending' || r.status === 'in_progress';

  const update = async (key, body, message) => {
    setBusy(key);
    try { await api.put(`/admin/press/${r.id}`, body); toast(message); refresh(); } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const createDraft = async () => {
    setBusy('draft');
    try {
      const { articleId } = await api.post(`/admin/press/${r.id}/draft`);
      toast('Borrador creado en la revista');
      refreshBadges();
      navigate(`/admin/revista/${articleId}`);
    } catch (err) { fail(err); setBusy(''); }
  };

  return (
    <div className="adm-page">
      <PageHeader back={{ to: '/admin/difusion', label: 'Difusión' }} title={
        <span className="adm-entity">
          <ProjectLogo project={r.project || { name: r.projectName }} size={52} />
          <span>
            <span className="adm-entity-name">{r.projectName || 'Startup'}</span>
            <span className="adm-entity-sub">Pedido de difusión #{r.id} · recibido {ago(r.createdAt)}</span>
          </span>
        </span>
      } actions={open && (
        <>
          {r.status === 'pending' && <Button size="sm" variant="secondary" icon={<PlayCircle size={15} />} loading={busy === 'take'} onClick={() => update('take', { status: 'in_progress' }, 'Pedido en preparación: la startup recibió el aviso')}>Tomar</Button>}
          <Button size="sm" icon={<CircleCheck size={15} />} onClick={() => setSheet('publish')}>Marcar como publicada</Button>
          <Button size="sm" variant="danger" icon={<XCircle size={15} />} onClick={() => setSheet('reject')}>Rechazar</Button>
        </>
      )}>
        <div className="adm-entity-pills">
          <Status kind="press" value={r.status} />
          <span className="adm-muted">{r.kindLabel} · pedido con plan</span>
          <PlanTag plan={r.plan} />
          {r.currentPlan && r.currentPlan !== r.plan && <span className="adm-muted">(hoy tiene <PlanTag plan={r.currentPlan} />)</span>}
        </div>
      </PageHeader>

      {r.status === 'rejected' && r.response && <p className="adm-banner is-warn"><strong>Rechazado.</strong> {r.response}</p>}
      {r.status === 'published' && <p className="adm-banner"><strong>Publicado</strong> {dateTime(r.publishedAt)}. La startup recibió el aviso con el enlace.</p>}

      <div className="adm-detail-grid">
        <div className="adm-col">
          <Panel title="Qué quieren contar" hint={KIND_HINT[r.kind]}>
            <p className="adm-bio">{r.pitch}</p>
            <KeyValue items={[
              ['Vocero', `${r.spokesperson}${r.spokespersonRole ? ` · ${r.spokespersonRole}` : ''}`],
              ['Instagram', r.instagram ? <a className="adm-link" href={`https://www.instagram.com/${r.instagram.slice(1)}/`} target="_blank" rel="noopener noreferrer">{r.instagram}</a> : '—'],
              ['Sitio web', r.website ? <a className="adm-link" href={r.website} target="_blank" rel="noopener noreferrer">{r.website.replace(/^https?:\/\//, '')}</a> : '—'],
              ['Contacto', r.contact || 'Chat o email de la cuenta'],
              ['Recibido', dateTime(r.createdAt)]
            ]} />
          </Panel>
          <Panel title="Quién lo pidió">
            {r.owner ? (
              <Link to={`/admin/usuarios/${r.owner.id}`} className="adm-owner">
                <Avatar person={r.owner} size={40} />
                <span className="adm-li-copy"><strong>{r.owner.name}</strong><small>{r.owner.email}</small></span>
                <Status kind="userStatus" value={r.owner.status} />
              </Link>
            ) : <p className="adm-muted-line">La cuenta ya no existe.</p>}
            {r.project && (
              <Link to={`/admin/proyectos/${r.project.id}`} className="adm-owner">
                <ProjectLogo project={r.project} size={40} />
                <span className="adm-li-copy"><strong>{r.project.name}</strong><small>{r.project.tagline || 'Sin descripción corta'}</small></span>
                <Status kind="project" value={r.project.status} />
              </Link>
            )}
          </Panel>
        </div>

        <div className="adm-col">
          <Panel title="Publicación" hint="La nota en la revista y el posteo en Instagram">
            <div className="adm-form-stack">
              <span className="field-label">Nota en la Revista</span>
              {r.article ? (
                <div className="adm-picked">
                  <span className="adm-search-icon is-article"><Newspaper size={15} /></span>
                  <span className="adm-li-copy"><strong>{r.article.title}</strong><small>{r.article.public ? 'Publicada en la revista' : 'Borrador · todavía no se ve en la revista'}</small></span>
                  <Link to={`/admin/revista/${r.article.id}`} className="btn btn-secondary btn-sm">Abrir</Link>
                </div>
              ) : (
                <Button size="sm" variant="secondary" icon={<FilePlus2 size={15} />} loading={busy === 'draft'} disabled={!open} onClick={createDraft}>Crear borrador en la revista</Button>
              )}
              <label className="field">
                <span className="field-label">Publicación de Instagram <em>Opcional</em></span>
                <span className="adm-image-link">
                  <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://www.instagram.com/p/…" aria-label="Enlace de la publicación de Instagram" />
                  <Button size="sm" variant="secondary" loading={busy === 'ig'} disabled={instagram.trim() === (r.instagramUrl || '')} onClick={() => update('ig', { instagramUrl: instagram.trim() }, 'Enlace de Instagram guardado')}>Guardar</Button>
                </span>
                {r.instagramUrl && <a className="link-btn" href={r.instagramUrl} target="_blank" rel="noopener noreferrer">Ver en Instagram <ExternalLink size={13} /></a>}
              </label>
              <p className="adm-footnote">KeFounder! publica en Instagram desde su cuenta; acá se guarda el enlace para que la startup lo vea. {r.kind === 'nota' ? 'La nota propia necesita su nota publicada en la revista.' : 'Para una mención alcanza con la nota colectiva o el posteo.'}</p>
            </div>
          </Panel>
        </div>

        <div className="adm-col">
          <FollowUp target={{ type: 'press', id: r.id, label: `Difusión: ${r.projectName}` }} data={data} onChange={refresh} />
        </div>
      </div>

      <ActionSheet open={sheet === 'publish'} onClose={() => setSheet(null)} title="Marcar como publicada" text="La startup recibe un aviso con el enlace a la nota (y a Instagram, si lo guardaste)." confirmLabel="Marcar como publicada" reason={false}
        onConfirm={() => api.put(`/admin/press/${r.id}`, { status: 'published', ...(instagram.trim() ? { instagramUrl: instagram.trim() } : {}) }).then(() => { toast('Difusión publicada: la startup recibió el aviso'); refresh(); })} />
      <ActionSheet open={sheet === 'reject'} onClose={() => setSheet(null)} title="Rechazar el pedido" text="La startup recibe el motivo y su cupo vuelve a estar disponible." confirmLabel="Rechazar" tone="danger" reasonLabel="Motivo para la startup" reasonHint="Lo va a ver en su aviso." placeholder="Ej.: necesitamos que el proyecto tenga una descripción completa"
        onConfirm={(response) => api.put(`/admin/press/${r.id}`, { status: 'rejected', response }).then(() => { toast('Pedido rechazado'); refresh(); })} />
    </div>
  );
}
