import React, { useEffect, useState } from 'react';
import { Avatar, Button, ProjectLogo, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link } from '../../lib/router.jsx';
import { Failed, FollowUp, KeyValue, Loading, PageHeader, Panel, Status, ago, dateTime, useAdmin, useAdminData } from '../kit.jsx';
import { TARGET_KIND as KIND, targetHref } from './Moderation.jsx';

const isHelp = (target) => target.type === 'help' || target.type === 'help_answer';

function Decision({ report, onDone }) {
  const { toast, fail } = useApp();
  const [action, setAction] = useState('none');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setResolution(report.resolution || ''); }, [report.id, report.resolution]);
  const closed = report.status === 'resolved' || report.status === 'dismissed';
  const canSuspend = Boolean(report.target.user) && report.target.user.role !== 'admin' && report.target.user.status !== 'suspended';
  const canHide = (report.target.type === 'project' && report.target.project && report.target.project.moderation !== 'hidden')
    || (isHelp(report.target) && report.target.help && !report.target.help.hidden);
  const hideLabel = report.target.type === 'help' ? 'Ocultar el pedido de ayuda' : report.target.type === 'help_answer' ? 'Ocultar la solución' : 'Ocultar el proyecto';
  const hideText = isHelp(report.target) ? 'Deja de verse y no suma puntos; quien lo publicó recibe el motivo.' : 'Deja de aparecer en Descubrir; su founder recibe el motivo.';

  const submit = async (status) => {
    setError('');
    if ((status === 'resolved' || status === 'dismissed') && resolution.trim().length < 3) { setError('Anotá qué decidiste: queda en el historial del reporte.'); return; }
    setBusy(status);
    try {
      await api.put(`/admin/reports/${report.id}`, { status, action: status === 'resolved' ? action : 'none', resolution: resolution.trim() });
      toast({ reviewing: 'Reporte tomado', resolved: 'Reporte resuelto', dismissed: 'Reporte descartado', open: 'Reporte reabierto' }[status]);
      onDone();
    } catch (err) { fail(err); } finally { setBusy(''); }
  };

  if (closed) {
    return (
      <Panel title="Decisión" actions={<Status kind="report" value={report.status} />}>
        <KeyValue items={[['Resolución', report.resolution || '—'], ['Quién', report.handledBy || '—'], ['Cuándo', dateTime(report.handledAt)]]} />
        <Button size="sm" variant="secondary" loading={busy === 'open'} onClick={() => submit('open')}>Reabrir reporte</Button>
      </Panel>
    );
  }

  return (
    <Panel title="Decisión" hint="Elegí qué hacer y anotá el motivo" actions={<Status kind="report" value={report.status} />}>
      <div className="adm-decision">
        <div className="adm-choice is-list" role="radiogroup" aria-label="Acción">
          <button type="button" role="radio" aria-checked={action === 'none'} className={action === 'none' ? 'is-active' : ''} onClick={() => setAction('none')}>
            <strong>Sin sanción</strong><small>Se registra la decisión y se avisa a quien reportó.</small>
          </button>
          {canHide && (
            <button type="button" role="radio" aria-checked={action === 'hide'} className={action === 'hide' ? 'is-active' : ''} onClick={() => setAction('hide')}>
              <strong>{hideLabel}</strong><small>{hideText}</small>
            </button>
          )}
          {canSuspend && (
            <button type="button" role="radio" aria-checked={action === 'suspend'} className={cx(action === 'suspend' && 'is-active', 'is-danger')} onClick={() => setAction('suspend')}>
              <strong>Suspender la cuenta</strong><small>{report.target.user.name} no puede ingresar y sale de Descubrir.</small>
            </button>
          )}
        </div>
        <label className="field">
          <span className="field-label">Resolución</span>
          <textarea className="input textarea" rows={3} value={resolution} maxLength={600} placeholder="Ej.: se confirmó spam en 3 conversaciones" onChange={(e) => setResolution(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="adm-inline-actions">
          <Button size="sm" variant={action === 'suspend' ? 'danger' : 'primary'} loading={busy === 'resolved'} onClick={() => submit('resolved')}>Resolver</Button>
          <Button size="sm" variant="secondary" loading={busy === 'dismissed'} onClick={() => submit('dismissed')}>Descartar</Button>
          {report.status === 'open' && <Button size="sm" variant="ghost" loading={busy === 'reviewing'} onClick={() => submit('reviewing')}>Tomar para revisar</Button>}
        </div>
      </div>
    </Panel>
  );
}

export default function ReportDetail({ params }) {
  const { refreshBadges } = useAdmin();
  const { data, error, reload } = useAdminData(`/admin/reports/${params.id}`);
  if (error) return <div className="adm-page"><PageHeader title="Reporte" back={{ to: '/admin/moderacion', label: 'Moderación' }} /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><Loading rows={8} /></div>;
  const { report: r, conversation, related } = data;
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const href = targetHref(r.target);

  return (
    <div className="adm-page">
      <PageHeader back={{ to: '/admin/moderacion', label: 'Moderación' }} title={`Reporte #${r.id}`} subtitle={`${r.reason} · ${KIND[r.target.type]} · recibido ${ago(r.createdAt)}`}>
        <div className="adm-entity-pills">
          <Status kind="report" value={r.status} />
          {r.sameTarget > 1 && <span className="adm-alert-num">{r.sameTarget} reportes sobre lo mismo</span>}
        </div>
      </PageHeader>

      <div className="adm-detail-grid">
        <div className="adm-col">
          <Panel title="Qué se reportó">
            {r.target.exists && isHelp(r.target) && (
              <div className="adm-reported-text">
                <span className="adm-mini-title">{r.target.type === 'help' ? 'Pedido' : `Solución a «Necesito ayuda con ${r.target.help.title}»`}</span>
                {r.target.type === 'help' && <strong>Necesito ayuda con {r.target.help.title}</strong>}
                <p>{r.target.help.body}</p>
                {r.target.help.hidden && <span className="adm-muted">Ya está oculto.</span>}
              </div>
            )}
            {r.target.exists ? (
              <Link to={(isHelp(r.target) ? (r.target.user && `/admin/usuarios/${r.target.user.id}`) : href) || '#'} className="adm-owner">
                {r.target.type === 'project' ? <ProjectLogo project={r.target.project} size={40} /> : <Avatar person={r.target.user} size={40} />}
                <span className="adm-li-copy">
                  <strong>{r.target.type === 'project' ? r.target.project.name : r.target.user?.name}</strong>
                  <small>{r.target.type === 'project' ? `Proyecto de ${r.target.user?.name || 'cuenta eliminada'}` : r.target.type === 'match' ? 'Conversación con quien reportó' : isHelp(r.target) ? `Lo publicó · ${r.target.user?.email || ''}` : r.target.user?.email}</small>
                </span>
                {r.target.user && <Status kind="userStatus" value={r.target.user.status} />}
              </Link>
            ) : <p className="adm-muted-line">{r.target.label}: ya no existe.</p>}
            <KeyValue items={[
              ['Motivo', r.reason],
              ['Detalle', r.details || 'Sin detalle'],
              ['Reportó', r.reporter ? <Link to={`/admin/usuarios/${r.reporter.id}`} className="adm-link">{r.reporter.name}</Link> : 'Cuenta eliminada'],
              ['Recibido', dateTime(r.createdAt)],
              ...(isHelp(r.target) && r.target.help ? [['En el panel', <Link key="h" to={`/admin/ayuda/${r.target.help.requestId}`} className="adm-link">Pedido de ayuda #{r.target.help.requestId}</Link>]] : [])
            ]} />
          </Panel>
          {related.length > 0 && (
            <Panel title="Otros reportes sobre lo mismo">
              <ul className="adm-mini-list">
                {related.map((x) => (
                  <li key={x.id}>
                    <Link to={`/admin/moderacion/reportes/${x.id}`}>
                      <span className="adm-li-copy"><strong>#{x.id} · {x.reason}</strong><small>{ago(x.createdAt)}</small></span>
                      <Status kind="report" value={x.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="adm-col">
          <Decision report={r} onDone={refresh} />
          {conversation && (
            <Panel title="Últimos mensajes" hint="Solo se muestran porque la conversación fue reportada">
              {conversation.length ? (
                <ol className="adm-convo">
                  {conversation.map((m) => (
                    <li key={m.id} className={m.fromReporter ? 'is-reporter' : ''}>
                      <small>{m.sender} · {dateTime(m.createdAt)}</small>
                      <p>{m.kind === 'text' ? m.body : m.kind === 'deleted' ? 'Mensaje eliminado' : `[${m.kind}] ${m.body || m.meta?.name || m.meta?.url || ''}`}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="adm-muted-line">La conversación no tiene mensajes.</p>}
            </Panel>
          )}
        </div>

        <div className="adm-col">
          <FollowUp target={{ type: 'report', id: r.id, label: `Reporte #${r.id}` }} data={data} onChange={refresh} />
        </div>
      </div>
    </div>
  );
}
