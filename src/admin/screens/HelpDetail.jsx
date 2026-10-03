import React, { useState } from 'react';
import { CircleCheck, Eye, EyeOff, ThumbsUp } from 'lucide-react';
import { Avatar, Button } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link } from '../../lib/router.jsx';
import { ActionSheet, Failed, FollowUp, KeyValue, Loading, PageHeader, Panel, Status, ago, dateTime, useAdmin, useAdminData } from '../kit.jsx';

// Un pedido de ayuda con todas sus soluciones (también las ocultas) para moderarlas.

export default function HelpDetail({ params }) {
  const { toast, fail } = useApp();
  const { refreshBadges } = useAdmin();
  const { data, error, reload } = useAdminData(`/admin/help/${params.id}`);
  const [sheet, setSheet] = useState(null);

  if (error) return <div className="adm-page"><PageHeader title="Pedido de ayuda" back={{ to: '/admin/ayuda', label: 'Necesito ayuda con…' }} /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><Loading rows={8} /></div>;
  const { request: r, answers, reports } = data;
  const refresh = () => { reload({ silent: true }); refreshBadges(); };
  const restore = async (url, message) => {
    try { await api.put(url, { hidden: false }); toast(message); refresh(); } catch (err) { fail(err); }
  };

  return (
    <div className="adm-page">
      <PageHeader
        back={{ to: '/admin/ayuda', label: 'Necesito ayuda con…' }}
        title={`Necesito ayuda con ${r.title}`}
        subtitle={`Pedido #${r.id} · ${r.categoryLabel} · publicado ${ago(r.createdAt)}${r.sample ? ' · ejemplo de la demo' : ''}`}
        actions={r.hidden
          ? <Button size="sm" variant="secondary" icon={<Eye size={15} />} onClick={() => restore(`/admin/help/${r.id}`, 'El pedido vuelve a verse')}>Volver a mostrar</Button>
          : <Button size="sm" variant="danger" icon={<EyeOff size={15} />} onClick={() => setSheet({ type: 'request' })}>Ocultar pedido</Button>}
      >
        <div className="adm-entity-pills">
          <Status kind="help" value={r.hidden ? 'hidden' : r.status} />
          <span className="adm-muted">{answers.length} {answers.length === 1 ? 'solución' : 'soluciones'}</span>
        </div>
      </PageHeader>

      {r.hidden && <p className="adm-banner is-warn"><strong>Oculto.</strong> {r.hiddenReason || 'Sin motivo registrado.'} Quien lo publicó lo sigue viendo con el aviso.</p>}

      <div className="adm-detail-grid">
        <div className="adm-col">
          <Panel title="Pedido">
            <p className="adm-bio">{r.body}</p>
            <KeyValue items={[
              ['Publicó', r.author ? <Link to={`/admin/usuarios/${r.author.id}`} className="adm-link">{r.author.name}</Link> : 'Cuenta eliminada'],
              ['Tema', r.categoryLabel],
              ['Publicado', dateTime(r.createdAt)],
              ['Solución elegida', r.acceptedAt ? dateTime(r.acceptedAt) : '—']
            ]} />
          </Panel>
          {reports.length > 0 && (
            <Panel title="Reportes">
              <ul className="adm-mini-list">
                {reports.map((x) => (
                  <li key={x.id}>
                    <Link to={`/admin/moderacion/reportes/${x.id}`}>
                      <span className="adm-li-copy"><strong>#{x.id} · {x.reason}</strong><small>{x.targetType === 'help' ? 'Sobre el pedido' : 'Sobre una solución'} · {ago(x.createdAt)}</small></span>
                      <Status kind="report" value={x.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="adm-col">
          <Panel title="Soluciones" hint="Ocultar una solución le quita sus puntos y avisa a quien la escribió.">
            {answers.length ? (
              <ul className="adm-help-answers">
                {answers.map((a) => (
                  <li key={a.id} className={a.hidden ? 'is-hidden' : ''}>
                    <div className="adm-help-answer-head">
                      {a.author ? <Link to={`/admin/usuarios/${a.author.id}`} className="adm-owner is-plain"><Avatar person={a.author} size={30} /><span className="adm-li-copy"><strong>{a.author.name}</strong><small>{ago(a.createdAt)}</small></span></Link> : <span className="adm-muted">Cuenta eliminada</span>}
                      <span className="adm-help-answer-tags">
                        {a.accepted && <span className="adm-tag is-accent"><CircleCheck size={13} /> Elegida</span>}
                        <span className="adm-tag"><ThumbsUp size={13} /> {a.votes}</span>
                        {a.openReports > 0 && <span className="adm-alert-num">{a.openReports} {a.openReports === 1 ? 'reporte' : 'reportes'}</span>}
                        {a.hidden
                          ? <Button size="sm" variant="secondary" onClick={() => restore(`/admin/help/answers/${a.id}`, 'La solución vuelve a verse')}>Mostrar</Button>
                          : <Button size="sm" variant="ghost" onClick={() => setSheet({ type: 'answer', answer: a })}>Ocultar</Button>}
                      </span>
                    </div>
                    <p className="adm-bio">{a.body}</p>
                    {a.hidden && <p className="adm-muted-line">Oculta: {a.hiddenReason || 'sin motivo registrado'}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="adm-muted-line">Todavía no hay soluciones.</p>}
          </Panel>
        </div>

        <div className="adm-col">
          <FollowUp target={{ type: 'help', id: r.id, label: `Ayuda: ${r.title}` }} data={data} onChange={refresh} />
        </div>
      </div>

      <ActionSheet open={sheet?.type === 'request'} onClose={() => setSheet(null)} title="Ocultar el pedido" text="Deja de verse en la app y sus soluciones dejan de sumar puntos. Quien lo publicó recibe el motivo." confirmLabel="Ocultar" tone="danger" reasonLabel="Motivo para quien lo publicó" placeholder="Ej.: es publicidad, no un pedido de ayuda"
        onConfirm={(reason) => api.put(`/admin/help/${r.id}`, { hidden: true, reason }).then(() => { toast('Pedido oculto'); refresh(); })} />
      <ActionSheet open={sheet?.type === 'answer'} onClose={() => setSheet(null)} title="Ocultar la solución" text={sheet?.answer ? `La solución de ${sheet.answer.author?.name || 'esta cuenta'} deja de verse y de sumar puntos.` : ''} confirmLabel="Ocultar" tone="danger" reasonLabel="Motivo para quien la escribió" placeholder="Ej.: promociona un servicio pago"
        onConfirm={(reason) => api.put(`/admin/help/answers/${sheet.answer.id}`, { hidden: true, reason }).then(() => { toast('Solución oculta'); refresh(); })} />
    </div>
  );
}
