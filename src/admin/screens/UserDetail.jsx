import React, { useState } from 'react';
import { BadgeCheck, Ban, KeyRound, Layers, MailCheck, MoreHorizontal, Trash2, UserCheck } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../../shared/catalog.js';
import { ActionMenu, Avatar, Button, Pill, ProjectLogo } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import {
  ActionSheet, Failed, FollowUp, KeyValue, Loading, PERIODS, PageHeader, Panel, PlanTag, StatGrid, Status,
  ago, dateShort, dateTime, num, toneLabel, useAdmin, useAdminData, usd
} from '../kit.jsx';

const SEGMENTS = [
  { id: 'real', label: 'Real', hint: 'Cuenta de una persona real. Cuenta en las métricas.' },
  { id: 'test', label: 'Prueba', hint: 'Cuenta de pruebas internas. No cuenta en las métricas.' },
  { id: 'demo', label: 'Demo', hint: 'Cuenta de demostración. Solo cuenta con «Incluir demo».' },
  { id: 'bot', label: 'Bot', hint: 'Perfil de ejemplo. Solo cuenta con «Incluir demo».' }
];

function IdentityPanel({ user, onDecide }) {
  const { identity } = user;
  const reviewable = identity.document && identity.status !== 'verified';
  return (
    <Panel title="Identidad" actions={<Status kind="identity" value={identity.status} />}>
      {identity.document ? (
        <div className="adm-identity">
          <a href={identity.document} target="_blank" rel="noreferrer" className="adm-doc" title="Abrir el documento en otra pestaña">
            <img src={identity.document} alt={`Documento enviado por ${user.name}`} />
          </a>
          <div>
            <KeyValue items={[
              ['Enviado', dateTime(identity.submittedAt)],
              identity.reviewedAt && ['Revisado', dateTime(identity.reviewedAt)],
              identity.reason && ['Motivo del rechazo', identity.reason]
            ]} />
            {reviewable && (
              <div className="adm-inline-actions">
                <Button size="sm" icon={<BadgeCheck size={15} />} onClick={() => onDecide('approve')}>Aprobar</Button>
                <Button size="sm" variant="danger" onClick={() => onDecide('reject')}>Rechazar</Button>
              </div>
            )}
          </div>
        </div>
      ) : <p className="adm-muted-line">Todavía no envió un documento.</p>}
    </Panel>
  );
}

export default function UserDetail({ params }) {
  const { toast, fail } = useApp();
  const { refreshBadges } = useAdmin();
  const { navigate } = useRouter();
  const { data, error, reload } = useAdminData(`/admin/users/${params.id}`);
  const [sheet, setSheet] = useState(null);
  const [menu, setMenu] = useState(false);
  const [plan, setPlan] = useState('');
  const [segment, setSegment] = useState('');
  const [confirm, setConfirm] = useState('');

  if (error) return <div className="adm-page"><PageHeader title="Usuario" back={{ to: '/admin/usuarios', label: 'Usuarios' }} /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><Loading rows={8} /></div>;

  const { user, stats } = data;
  const isAdmin = user.role === 'admin';
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const run = async (fn, message) => {
    try {
      await fn();
      toast(message);
      refresh();
    } catch (err) { fail(err); }
  };
  const openSheet = (name) => {
    setPlan('');
    setSegment(user.segment);
    setConfirm('');
    setSheet(name);
  };

  return (
    <div className="adm-page">
      <PageHeader back={{ to: '/admin/usuarios', label: 'Usuarios' }} title={
        <span className="adm-entity">
          <Avatar person={user} size={52} online={user.online} />
          <span>
            <span className="adm-entity-name">{user.name}</span>
            <span className="adm-entity-sub">{user.email} · #{user.id}{user.headline ? ` · ${user.headline}` : ''}</span>
          </span>
        </span>
      } actions={!isAdmin && (
        <>
          <Button size="sm" variant="secondary" icon={<Layers size={15} />} onClick={() => openSheet('plan')}>Cambiar plan</Button>
          {user.status === 'active'
            ? <Button size="sm" variant="danger" icon={<Ban size={15} />} onClick={() => openSheet('suspend')}>Suspender</Button>
            : <Button size="sm" icon={<UserCheck size={15} />} onClick={() => openSheet('reactivate')}>Reactivar</Button>}
          <div className="relative">
            <Button size="sm" variant="secondary" icon={<MoreHorizontal size={16} />} onClick={() => setMenu(true)} aria-label="Más acciones">Más</Button>
            <ActionMenu open={menu} onClose={() => setMenu(false)} title="Más acciones" items={[
              !user.emailVerified && { label: 'Marcar email como verificado', icon: <MailCheck size={17} />, onClick: () => run(() => api.post(`/admin/users/${user.id}/verify-email`), 'Email verificado') },
              { label: `Cerrar sesiones (${stats.sessions})`, icon: <KeyRound size={17} />, onClick: () => openSheet('logout'), disabled: !stats.sessions },
              { label: 'Cambiar segmento', icon: <Layers size={17} />, onClick: () => openSheet('segment') },
              { label: 'Eliminar cuenta', icon: <Trash2 size={17} />, danger: true, onClick: () => openSheet('delete') }
            ]} />
          </div>
        </>
      )}>
        <div className="adm-entity-pills">
          <PlanTag plan={user.plan} period={user.planPeriod} />
          <Status kind="userStatus" value={user.status} />
          <Status kind="segment" value={user.segment} dot={false} />
          {!user.onboarded && <Pill tone="muted">Perfil sin completar</Pill>}
          {user.online && <Pill tone="accent">En línea</Pill>}
        </div>
      </PageHeader>

      {user.status === 'suspended' && (
        <p className="adm-banner is-warn"><strong>Cuenta suspendida</strong> {dateTime(user.statusChangedAt)}{user.statusReason ? ` · ${user.statusReason}` : ''}</p>
      )}
      {isAdmin && <p className="adm-banner">Cuenta de administración: se gestiona desde la consola con <code>npm run admin</code>.</p>}

      <div className="adm-detail-grid">
        <div className="adm-col">
          <Panel title="Cuenta">
            <KeyValue items={[
              ['Alta', dateTime(user.createdAt)],
              ['Última actividad', user.online ? 'Ahora' : ago(user.lastActiveAt)],
              ['Ubicación', user.location || '—'],
              ['Plan', <>{PLANS[user.plan]?.name}{user.planPeriod ? ` · ${PERIODS[user.planPeriod] || user.planPeriod}` : ''}{user.planRenewsAt ? ` · renueva ${dateShort(user.planRenewsAt)}` : ''}</>],
              ['Email', user.emailVerified ? 'Verificado' : 'Sin verificar'],
              ['Perfil', user.onboarded ? `Completo al ${user.completeness}%` : 'Sin completar'],
              ['En Descubrir', user.visible ? 'Visible' : 'Oculto por la persona'],
              ['Sesiones abiertas', num(stats.sessions)]
            ]} />
            {(user.bio || user.roles.length > 0) && (
              <details className="adm-profile-bits">
                <summary>Ver perfil público</summary>
                {user.roles.length > 0 && <p><strong>Roles:</strong> {user.roles.join(' · ')}</p>}
                {user.skills.length > 0 && <p><strong>Skills:</strong> {user.skills.join(', ')}</p>}
                {user.bio && <p className="adm-bio">{user.bio}</p>}
                {Object.entries(user.links).filter(([, v]) => v).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="link-btn">{k === 'linkedin' ? 'LinkedIn' : k === 'github' ? 'GitHub' : 'Portfolio'}</a>)}
              </details>
            )}
          </Panel>
          <IdentityPanel user={user} onDecide={(decision) => (decision === 'approve'
            ? run(() => api.post(`/admin/users/${user.id}/identity`, { decision: 'approve' }), 'Identidad aprobada')
            : openSheet('reject'))} />
        </div>

        <div className="adm-col">
          <Panel title="Actividad" hint="Desde que se registró">
            <StatGrid items={[
              ['Conexiones enviadas', stats.interestsSent], ['Conexiones recibidas', stats.interestsReceived], ['Matches', stats.matches],
              ['Mensajes', stats.messages], ['Guardados', stats.saves], ['Visitas al perfil', stats.views],
              ['Reportes recibidos', stats.reportsAgainst], ['Reportes hechos', stats.reportsMade], ['La bloquearon', stats.blockedBy]
            ]} />
          </Panel>
          <Panel title="Proyectos" hint={data.projects.length ? `${data.projects.length} en total` : undefined}>
            {data.projects.length ? (
              <ul className="adm-mini-list">
                {data.projects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/admin/proyectos/${p.id}`}>
                      <ProjectLogo project={p} size={28} />
                      <span className="adm-li-copy"><strong>{p.name}</strong><small>{p.tagline || 'Sin descripción'}</small></span>
                      {p.moderation === 'hidden' ? <Status kind="moderation" value="hidden" /> : <Status kind="project" value={p.status} />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="adm-muted-line">No creó proyectos.</p>}
          </Panel>
          <Panel title="Suscripciones" flush>
            {data.subscriptions.length ? (
              <table className="adm-compare">
                <thead><tr><th>Plan</th><th>Monto</th><th>Estado</th><th>Alta</th></tr></thead>
                <tbody>
                  {data.subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td><PlanTag plan={s.plan} /> <small className="adm-cell-note">{PERIODS[s.period] || s.period}</small></td>
                      <td>{usd(s.amount)}</td>
                      <td>{toneLabel('subscription', s.status)}</td>
                      <td>{dateShort(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="adm-muted-line adm-pad">Nunca pagó un plan.</p>}
          </Panel>
          {data.reports.length > 0 && (
            <Panel title="Reportes sobre esta cuenta">
              <ul className="adm-mini-list">
                {data.reports.map((r) => (
                  <li key={r.id}>
                    <Link to={`/admin/moderacion/reportes/${r.id}`}>
                      <span className="adm-li-copy"><strong>#{r.id} · {r.reason}</strong><small>{r.targetType === 'project' ? 'Sobre un proyecto' : 'Sobre el perfil'} · {ago(r.createdAt)}{r.reporter ? ` · de ${r.reporter}` : ''}</small></span>
                      <Status kind="report" value={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="adm-col">
          <FollowUp target={{ type: 'user', id: user.id, label: user.name }} data={data} onChange={refresh} />
        </div>
      </div>

      <ActionSheet open={sheet === 'suspend'} onClose={() => setSheet(null)} title={`Suspender a ${user.name}`} text="No va a poder ingresar, se cierran sus sesiones y desaparece de Descubrir. Podés reactivarla cuando quieras." confirmLabel="Suspender cuenta" tone="danger" placeholder="Ej.: spam reiterado a varias personas"
        onConfirm={(reason) => api.put(`/admin/users/${user.id}/status`, { status: 'suspended', reason }).then(() => { toast('Cuenta suspendida'); refresh(); })} />
      <ActionSheet open={sheet === 'reactivate'} onClose={() => setSheet(null)} title={`Reactivar a ${user.name}`} text="Vuelve a poder ingresar y a aparecer en Descubrir." confirmLabel="Reactivar" reason={false}
        onConfirm={() => api.put(`/admin/users/${user.id}/status`, { status: 'active' }).then(() => { toast('Cuenta reactivada'); refresh(); })} />
      <ActionSheet open={sheet === 'plan'} onClose={() => setSheet(null)} title="Cambiar plan" text="Un plan de cortesía no genera cobro ni vence: queda hasta que lo cambies. Pasar a Free cancela la suscripción activa." confirmLabel="Cambiar plan" valid={Boolean(plan) && plan !== user.plan} placeholder="Ej.: beta tester, acuerdo comercial…"
        onConfirm={(reason) => api.put(`/admin/users/${user.id}/plan`, { plan, reason }).then(() => { toast(`Plan cambiado a ${PLANS[plan].name}`); refresh(); })}>
        <div className="adm-choice">
          {PLAN_ORDER.map((id) => (
            <button key={id} type="button" className={plan === id ? 'is-active' : ''} disabled={id === user.plan} onClick={() => setPlan(id)}>
              <PlanTag plan={id} />
              <small>{id === user.plan ? 'Plan actual' : id === 'free' ? 'Sin costo' : 'Cortesía'}</small>
            </button>
          ))}
        </div>
      </ActionSheet>
      <ActionSheet open={sheet === 'segment'} onClose={() => setSheet(null)} title="Cambiar segmento" text="El segmento define si la cuenta cuenta en las métricas." confirmLabel="Guardar" reason={false} valid={segment !== user.segment}
        onConfirm={() => api.put(`/admin/users/${user.id}/segment`, { segment }).then(() => { toast('Segmento actualizado'); refresh(); })}>
        <div className="adm-choice is-list">
          {SEGMENTS.map((s) => (
            <button key={s.id} type="button" className={segment === s.id ? 'is-active' : ''} onClick={() => setSegment(s.id)}>
              <strong>{s.label}</strong><small>{s.hint}</small>
            </button>
          ))}
        </div>
      </ActionSheet>
      <ActionSheet open={sheet === 'logout'} onClose={() => setSheet(null)} title="Cerrar sesiones" text={`Se cierran las ${stats.sessions} sesiones abiertas de ${user.name}. Va a tener que ingresar de nuevo.`} confirmLabel="Cerrar sesiones" reason={false}
        onConfirm={() => api.post(`/admin/users/${user.id}/logout`).then((r) => { toast(`${r.closed} ${r.closed === 1 ? 'sesión cerrada' : 'sesiones cerradas'}`); refresh(); })} />
      <ActionSheet open={sheet === 'reject'} onClose={() => setSheet(null)} title="Rechazar identidad" text="La persona recibe una notificación con el motivo y puede enviar otra foto." confirmLabel="Rechazar" tone="danger" reasonLabel="Motivo para la persona" reasonHint="Lo va a ver en su notificación." placeholder="Ej.: la foto está borrosa o cortada"
        onConfirm={(reason) => api.post(`/admin/users/${user.id}/identity`, { decision: 'reject', reason }).then(() => { toast('Identidad rechazada'); refresh(); })} />
      <ActionSheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Eliminar cuenta" text="Se borran su perfil, proyectos, conexiones, conversaciones y archivos. No se puede deshacer; la auditoría conserva el registro." confirmLabel="Eliminar definitivamente" tone="danger" valid={confirm.trim().toLowerCase() === user.email.toLowerCase()}
        onConfirm={(reason) => api.del(`/admin/users/${user.id}`, { confirm: confirm.trim(), reason }).then(() => { toast('Cuenta eliminada'); refreshBadges(); navigate('/admin/usuarios', { replace: true }); })}>
        <label className="field">
          <span className="field-label">Escribí <strong>{user.email}</strong> para confirmar</span>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
      </ActionSheet>
    </div>
  );
}
