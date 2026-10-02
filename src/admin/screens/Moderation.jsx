import React, { useState } from 'react';
import { BadgeCheck, BriefcaseBusiness, CircleCheck, MessageSquare, ShieldAlert, UserRound } from 'lucide-react';
import { Avatar, Button } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { ActionSheet, DataTable, Empty, Failed, FilterSelect, Loading, PageHeader, Pagination, Status, Tabs, ago, dateTime, num, useAdmin, useAdminData, useQueryState } from '../kit.jsx';

const TARGET_ICON = { person: <UserRound size={15} />, project: <BriefcaseBusiness size={15} />, match: <MessageSquare size={15} /> };
const TARGET_KIND = { person: 'Perfil', project: 'Proyecto', match: 'Conversación' };

export function targetHref(target) {
  if (target.type === 'project' && target.project) return `/admin/proyectos/${target.project.id}`;
  if (target.user) return `/admin/usuarios/${target.user.id}`;
  return null;
}

function Reports({ values, set }) {
  const { navigate } = useRouter();
  const query = new URLSearchParams({ status: values.status, page: values.page, pageSize: values.pageSize, ...(values.type ? { type: values.type } : {}) }).toString();
  const { data, loading, error, reload } = useAdminData(`/admin/reports?${query}`);
  const counts = data?.counts || {};
  const columns = [
    { key: 'id', label: '#', width: 64, render: (r) => <Link to={`/admin/moderacion/reportes/${r.id}`} className="adm-link">#{r.id}</Link> },
    { key: 'reason', label: 'Motivo', primary: true, render: (r) => (
      <span className="adm-cell-copy">
        <strong>{r.reason}</strong>
        <small>{r.details || 'Sin detalle'}</small>
      </span>
    ) },
    { key: 'target', label: 'Sobre', render: (r) => (
      <span className="adm-target">{TARGET_ICON[r.target.type]}<span className="adm-target-label">{TARGET_KIND[r.target.type]}: {r.target.label}</span></span>
    ) },
    { key: 'times', label: 'Veces', align: 'right', mobileHide: true, render: (r) => (r.sameTarget > 1 ? <strong className="adm-alert-num">{r.sameTarget}</strong> : '1') },
    { key: 'reporter', label: 'Reportó', mobileHide: true, render: (r) => r.reporter?.name || 'Cuenta eliminada' },
    { key: 'created', label: 'Recibido', render: (r) => ago(r.createdAt) },
    { key: 'status', label: 'Estado', render: (r) => <Status kind="report" value={r.status} /> }
  ];
  const pending = (counts.open || 0) + (counts.reviewing || 0);
  return (
    <div className="adm-table-page">
      <div className="adm-filters">
        <Tabs value={values.status} onChange={(status) => set({ status })} items={[
          { id: 'pending', label: 'Pendientes', count: data ? pending : null },
          { id: 'resolved', label: 'Resueltos', count: data ? counts.resolved || 0 : null },
          { id: 'dismissed', label: 'Descartados', count: data ? counts.dismissed || 0 : null },
          { id: 'all', label: 'Todos' }
        ]} />
        <FilterSelect label="Sobre" value={values.type} onChange={(type) => set({ type })} options={[{ id: 'person', label: 'Perfiles' }, { id: 'project', label: 'Proyectos' }, { id: 'match', label: 'Conversaciones' }]} />
      </div>
      {error ? <Failed error={error} onRetry={reload} /> : (
        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          onRowClick={(r) => navigate(`/admin/moderacion/reportes/${r.id}`)}
          empty={<Empty icon={<CircleCheck size={18} />} title={values.status === 'pending' ? 'No hay reportes pendientes' : 'No hay reportes acá'} text={values.status === 'pending' ? 'Cuando alguien reporte un perfil, proyecto o conversación, aparece en esta cola por orden de llegada.' : undefined} />}
        />
      )}
      <Pagination data={data} onChange={set} />
    </div>
  );
}

function Identity({ values, set }) {
  const { toast, fail } = useApp();
  const { refreshBadges } = useAdmin();
  const query = new URLSearchParams({ status: values.identity, page: values.page, pageSize: values.pageSize }).toString();
  const { data, error, reload } = useAdminData(`/admin/identity?${query}`);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(null);
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const approve = async (item) => {
    setBusy(item.user.id);
    try {
      await api.post(`/admin/users/${item.user.id}/identity`, { decision: 'approve' });
      toast(`Identidad de ${item.user.name} aprobada`, { icon: <BadgeCheck size={14} /> });
      refresh();
    } catch (err) { fail(err); } finally { setBusy(null); }
  };
  return (
    <div className="adm-table-page">
      <div className="adm-filters">
        <Tabs value={values.identity} onChange={(identity) => set({ identity })} items={[
          { id: 'pending', label: 'Pendientes' }, { id: 'approved', label: 'Aprobadas' }, { id: 'rejected', label: 'Rechazadas' }
        ]} />
        <span className="adm-filters-note">Compará la foto del documento con el nombre y la foto del perfil antes de aprobar.</span>
      </div>
      {error && <Failed error={error} onRetry={reload} />}
      {!data && !error && <Loading rows={4} />}
      {data && (data.items.length ? (
        <div className="adm-id-grid">
          {data.items.map((item) => (
            <article key={item.user.id} className="adm-id-card">
              <a href={item.document} target="_blank" rel="noreferrer" className="adm-doc" title="Abrir el documento en otra pestaña">
                {item.document ? <img src={item.document} alt={`Documento de ${item.user.name}`} loading="lazy" /> : <span>Sin documento</span>}
              </a>
              <div className="adm-id-body">
                <Link to={`/admin/usuarios/${item.user.id}`} className="adm-owner">
                  <Avatar person={item.user} size={36} />
                  <span className="adm-li-copy"><strong>{item.user.name}</strong><small>{item.user.email}</small></span>
                </Link>
                <small className="adm-muted">{item.user.location || 'Sin ubicación'} · enviado {ago(item.submittedAt)}</small>
                {item.status === 'rejected' && item.reason && <small className="adm-id-reason">Rechazada: {item.reason}</small>}
                {item.status === 'approved' && <small className="adm-muted">Aprobada {dateTime(item.reviewedAt)}</small>}
                {item.status === 'pending' && (
                  <div className="adm-inline-actions">
                    <Button size="sm" icon={<BadgeCheck size={15} />} loading={busy === item.user.id} onClick={() => approve(item)}>Aprobar</Button>
                    <Button size="sm" variant="danger" onClick={() => setRejecting(item)}>Rechazar</Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <Empty icon={<CircleCheck size={18} />} title={values.identity === 'pending' ? 'No hay identidades por verificar' : 'No hay nada en esta lista'} text={values.identity === 'pending' ? 'Cuando alguien envíe la foto de su documento desde Configuración, aparece acá.' : undefined} />)}
      <Pagination data={data} onChange={set} />
      <ActionSheet open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Rechazar identidad" text={rejecting ? `${rejecting.user.name} recibe una notificación con el motivo y puede enviar otra foto.` : ''} confirmLabel="Rechazar" tone="danger" reasonLabel="Motivo para la persona" reasonHint="Lo va a ver en su notificación." placeholder="Ej.: la foto está borrosa o no coincide el nombre"
        onConfirm={(reason) => api.post(`/admin/users/${rejecting.user.id}/identity`, { decision: 'reject', reason }).then(() => { toast('Identidad rechazada'); refresh(); })} />
    </div>
  );
}

export default function Moderation() {
  const { badges } = useAdmin();
  const { values, set } = useQueryState({ tab: 'reportes', status: 'pending', type: '', identity: 'pending', page: '1', pageSize: '25' });
  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Moderación"
        subtitle="Reportes de la comunidad y verificación de identidad."
        actions={<Tabs value={values.tab} onChange={(tab) => set({ tab })} items={[
          { id: 'reportes', label: 'Reportes', icon: <ShieldAlert size={15} />, count: badges.reports || null },
          { id: 'identidad', label: 'Identidad', icon: <BadgeCheck size={15} />, count: badges.identity || null }
        ]} />}
      />
      {values.tab === 'identidad' ? <Identity values={values} set={set} /> : <Reports values={values} set={set} />}
      <p className="sr-only">{num(badges.reports)} reportes y {num(badges.identity)} identidades pendientes.</p>
    </div>
  );
}
