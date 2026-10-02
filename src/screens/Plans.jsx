import React, { useState } from 'react';
import { Check, Gem, Minus } from 'lucide-react';
import { PLANS, PLAN_ORDER, planRank } from '../../shared/catalog.js';
import { CheckoutSheet } from '../components/Overlays.jsx';
import { ConfirmSheet } from '../components/Sheets.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { Button, Segmented, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { longDate, money } from '../lib/format.js';
import { useLoader, useMediaQuery } from '../lib/hooks.js';

// La tabla sale del catálogo compartido: lo que se muestra es exactamente lo que habilita el servidor.
const feature = (key) => PLAN_ORDER.map((id) => PLANS[id].features[key]);
const limit = (key, format) => PLAN_ORDER.map((id) => format(PLANS[id].limits[key]));
const count = (unlimited) => (v) => (v === null ? unlimited : String(v));
const COMPARE = [
  ['Conexiones por día', ...limit('connectionsPerDay', count('Ilimitadas'))],
  ['Match y chat', true, true, true, true],
  ['Guardados', ...limit('saves', count('Ilimitados'))],
  ['Ver quién está interesado en vos', ...feature('seeInterested')],
  ['Ver quién te guardó', ...feature('seeInterested')],
  ['Filtros avanzados', ...feature('advancedFilters')],
  ['Historial de perfiles vistos', ...feature('history')],
  ['Estadísticas de perfil y proyecto', ...feature('analytics')],
  ['Compatibilidad avanzada', ...feature('advancedCompat')],
  ['Visibilidad prioritaria', ...PLAN_ORDER.map((id) => ({ pro: 'Alta', startup: 'Máxima' })[id] || false)],
  ['Mensajes sin match', ...limit('directMessagesPerMonth', (v) => (v === null ? 'Ilimitados' : v ? `${v} por mes` : false))],
  ['Proyectos activos', ...limit('activeProjects', count('Ilimitados'))],
  ['Candidatos de tus proyectos', ...feature('seeInterested')],
  ['Panel de candidatos por etapa', ...feature('candidatesPanel')],
  ['Perfil de equipo completo', ...feature('teamProfile')]
];

const CTA = { free: 'Continuar con Free', plus: 'Elegir Plus', pro: 'Elegir Pro', startup: 'Elegir Startup' };

export default function Plans() {
  const { me, setMe, fail, toast } = useApp();
  const [period, setPeriod] = useState('monthly');
  const [checkout, setCheckout] = useState(null);
  const [cancel, setCancel] = useState(false);
  const { data: history, reload } = useLoader(() => api.get('/billing/history'), []);
  const current = me.plan;
  const wide = useMediaQuery('(min-width: 1100px)');
  // En PC la comparación se parte en dos tablas lado a lado para que entre en pantalla.
  const rows = [['Precio mensual', ...PLAN_ORDER.map((id) => money(PLANS[id].monthly))], ...COMPARE];
  const halves = wide ? [rows.slice(0, Math.ceil(rows.length / 2)), rows.slice(Math.ceil(rows.length / 2))] : [rows];

  // El plan actual también se puede pasar de mensual a anual (o al revés).
  const switchesPeriod = (id) => id === current && id !== 'free' && period !== (me.planPeriod || 'monthly');
  const choose = (id) => {
    if (id === current && !switchesPeriod(id)) return;
    if (id === 'free') setCancel(true);
    else setCheckout(id);
  };

  return (
    <>
      <TopBar back="/perfil" title="Planes" />
      <Page width="lg" className="page-plans">
        <header className="plans-hero">
          <span className="kicker"><Gem size={13} /> Suscripción</span>
          <h1>Encontrá a la persona correcta <span>más rápido.</span></h1>
          <p>Empezá gratis. Mejorá tu plan cuando quieras llegar más lejos.</p>
          <Segmented
            value={period}
            onChange={setPeriod}
            className="plans-period"
            options={[{ id: 'monthly', label: 'Mensual' }, { id: 'yearly', label: 'Anual · ahorrá hasta 18%' }]}
          />
        </header>

        <div className="plan-grid">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const price = period === 'yearly' ? plan.yearly : plan.monthly;
            const isCurrent = id === current && !switchesPeriod(id);
            const saving = plan.monthly ? Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100) : 0;
            return (
              <article key={id} className={cx('plan-card', plan.recommended && 'is-recommended', id === current && 'is-current')}>
                {plan.recommended && <span className="plan-flag">Recomendado</span>}
                <h2>{plan.name}</h2>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  <strong>{money(price)}</strong>
                  <span>{id === 'free' ? 'para siempre' : period === 'yearly' ? 'por año' : 'por mes'}</span>
                </div>
                <p className="plan-saving">{period === 'yearly' && saving > 0 ? `Equivale a ${money(plan.yearly / 12)}/mes · ahorrás ${saving}%` : ' '}</p>
                <ul className="benefit-list">
                  {plan.benefits.map((b) => <li key={b}><Check size={15} /> {b}</li>)}
                </ul>
                <Button
                  block
                  size="lg"
                  variant={isCurrent ? 'soft' : plan.recommended ? 'primary' : id === 'free' ? 'ghost' : 'secondary'}
                  disabled={isCurrent}
                  onClick={() => choose(id)}
                >
                  {isCurrent ? 'Tu plan actual' : switchesPeriod(id) ? `Pasar a ${period === 'yearly' ? 'anual' : 'mensual'}` : planRank(id) < planRank(current) && id !== 'free' ? `Cambiar a ${plan.name}` : CTA[id]}
                </Button>
              </article>
            );
          })}
        </div>

        {current !== 'free' && (
          <section className="card card-pad plan-manage">
            <div>
              <span className="kicker">Tu suscripción</span>
              <h3>{PLANS[current].name} · {me.planPeriod === 'yearly' ? 'anual' : me.planPeriod === 'courtesy' ? 'de cortesía' : 'mensual'}</h3>
              {me.planRenewsAt && <p>Se renueva el {longDate(me.planRenewsAt)}.</p>}
            </div>
            <Button variant="danger" onClick={() => setCancel(true)}>Cancelar suscripción</Button>
          </section>
        )}

        <section className="compare">
          <h2>Compará los planes</h2>
          <div className="compare-tables">
            {halves.map((part, n) => (
              <div className="compare-scroll" key={n}>
                <table>
                  <thead><tr><th>Función</th>{PLAN_ORDER.map((id) => <th key={id} className={id === current ? 'is-current' : ''}>{PLANS[id].name}</th>)}</tr></thead>
                  <tbody>
                    {part.map(([label, ...cells]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        {cells.map((c, i) => <td key={i}>{c === true ? <Check size={16} className="yes" aria-label="Incluido" /> : c === false ? <Minus size={16} className="no" aria-label="No incluido" /> : c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {history?.items?.length > 0 && (
          <section className="billing-history">
            <h2>Historial</h2>
            <ul>
              {history.items.map((h, i) => (
                <li key={i}><span>{PLANS[h.plan]?.name} · {h.period === 'yearly' ? 'anual' : 'mensual'}</span><span>{money(h.amount)}</span><span className="muted">{longDate(h.createdAt)} · {h.status === 'active' ? 'activa' : h.status === 'canceled' ? 'cancelada' : 'reemplazada'}</span></li>
              ))}
            </ul>
          </section>
        )}
        <p className="plans-note">Modo demostración: los pagos están simulados y no se realiza ningún cobro.</p>
      </Page>

      <CheckoutSheet key={`${checkout}-${period}`} plan={checkout} open={Boolean(checkout)} initialPeriod={period} onClose={() => { setCheckout(null); reload({ silent: true }); }} />
      <ConfirmSheet
        open={cancel}
        onClose={() => setCancel(false)}
        title="¿Volver al plan Free?"
        text="Perdés las funciones de tu plan actual. Si tenés más de un proyecto activo, quedará publicado solo el más reciente."
        confirmLabel="Volver a Free"
        danger
        onConfirm={async () => {
          try {
            const { user } = await api.post('/billing/cancel');
            setMe(user);
            toast('Volviste al plan Free');
            reload({ silent: true });
          } catch (err) { fail(err); }
        }}
      />
    </>
  );
}
