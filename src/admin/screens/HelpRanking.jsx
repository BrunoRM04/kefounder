import React, { useState } from 'react';
import { RotateCcw, Ban } from 'lucide-react';
import { Avatar, Button, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link } from '../../lib/router.jsx';
import { ActionSheet, DataTable, Empty, Failed, Loading, PageHeader, Panel, Tabs, useAdminData, useQueryState } from '../kit.jsx';

// Ranking semanal de «Necesito ayuda con…» y los podios entregados (con la opción de anular uno).

const DEFAULTS = { week: 'current' };
const PLACE = { 1: '1.º', 2: '2.º', 3: '3.º' };
const DAY = 86400000;
const shortDay = (iso) => new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }).replace('.', '');
const weekLabel = (w) => `${shortDay(w.start)} – ${shortDay(new Date(new Date(w.end).getTime() - DAY / 2).toISOString())}`;

export default function HelpRanking() {
  const { toast, fail } = useApp();
  const { values, set } = useQueryState(DEFAULTS);
  const { data, error, reload } = useAdminData(`/admin/help/ranking?week=${values.week}`);
  const [revoking, setRevoking] = useState(null);

  const rows = data ? [...data.podium.map((p) => ({ ...p, podium: true, id: p.user.id })), ...data.items.map((r) => ({ ...r, id: r.user.id }))] : null;
  const columns = [
    { key: 'rank', label: 'Puesto', width: 76, render: (r) => <strong className={cx(r.podium && 'adm-rank-podium', r.podium && `is-${r.place}`)}>{r.podium ? PLACE[r.place] : `${r.rank}.º`}</strong> },
    { key: 'person', label: 'Persona', primary: true, render: (r) => (
      <Link to={`/admin/usuarios/${r.user.id}`} className="adm-owner is-plain"><Avatar person={r.user} size={28} /><span className="adm-li-copy"><strong>{r.user.name}</strong><small>{r.user.headline || '—'}</small></span></Link>
    ) },
    { key: 'accepted', label: 'Elegidas', align: 'right', mobileHide: true, render: (r) => r.accepted },
    { key: 'helpful', label: '«Me sirvió»', align: 'right', mobileHide: true, render: (r) => r.helpful },
    { key: 'points', label: 'Puntos', align: 'right', render: (r) => <strong>{r.points}</strong> }
  ];

  return (
    <div className="adm-page">
      <PageHeader back={{ to: '/admin/ayuda', label: 'Necesito ayuda con…' }} title="Ranking semanal" subtitle="De lunes a domingo. Al cerrar la semana, las tres personas con más puntos (mínimo 15) ganan un reconocimiento en su perfil." />
      <div className="adm-filters">
        <Tabs value={values.week} onChange={(week) => set({ week })} items={[{ id: 'current', label: 'Esta semana' }, { id: 'last', label: 'Semana pasada' }]} />
        {data && <span className="adm-muted">Semana del {weekLabel(data.week)} · {data.week.closed ? 'cerrada' : 'en curso'} · {data.total} {data.total === 1 ? 'persona sumó' : 'personas sumaron'} puntos</span>}
      </div>
      {error && <Failed error={error} onRetry={reload} />}
      {!data && !error && <Loading rows={8} />}
      {data && (
        <div className="adm-grid">
          <Panel className="adm-span-2" title={data.week.closed ? 'Resultado de la semana' : 'Posiciones en vivo'} hint={data.week.closed ? 'El podio es el que se entregó al cerrar la semana.' : 'Se recalcula con cada solución, voto o elección.'} flush>
            <DataTable columns={columns} rows={rows} empty={<Empty title="Nadie sumó puntos en esta semana" />} />
          </Panel>
          <Panel title="Podios entregados" hint="Si hubo trampa, anulá el reconocimiento: sale del perfil y el puesto queda vacío.">
            {data.history.length ? (
              <ul className="adm-podiums">
                {data.history.map((w) => (
                  <li key={w.key}>
                    <span className="adm-mini-title">Semana del {weekLabel(w)}</span>
                    {w.winners.map((x) => (
                      <div key={x.id} className={cx('adm-podium-row', x.revoked && 'is-revoked')}>
                        <strong className={cx('adm-rank-podium', `is-${x.place}`)}>{PLACE[x.place]}</strong>
                        <span className="adm-li-copy"><strong>{x.user.name}</strong><small>{x.points} puntos{x.revoked ? ` · anulado: ${x.revokedReason}` : ''}</small></span>
                        {x.revoked
                          ? <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => api.put(`/admin/help/awards/${x.id}`, { revoked: false }).then(() => { toast('Reconocimiento devuelto'); reload({ silent: true }); }).catch(fail)}>Devolver</Button>
                          : <Button size="sm" variant="ghost" icon={<Ban size={14} />} onClick={() => setRevoking(x)}>Anular</Button>}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            ) : <p className="adm-muted-line">Todavía no se cerró ninguna semana con podio.</p>}
          </Panel>
        </div>
      )}
      <ActionSheet open={Boolean(revoking)} onClose={() => setRevoking(null)} title="Anular el reconocimiento" text={revoking ? `${revoking.user.name} pierde el ${PLACE[revoking.place]} puesto en su perfil. El lugar no pasa a otra persona.` : ''} confirmLabel="Anular" tone="danger" placeholder="Ej.: votos entre cuentas de la misma persona"
        onConfirm={(reason) => api.put(`/admin/help/awards/${revoking.id}`, { revoked: true, reason }).then(() => { toast('Reconocimiento anulado'); reload({ silent: true }); })} />
    </div>
  );
}
