import React from 'react';
import { ArrowRight, LifeBuoy, Trophy } from 'lucide-react';
import { HELP_POINTS, HELP_RULES, PLACE_LABELS } from '../../shared/catalog.js';
import { api } from '../lib/api.js';
import { useLoader } from '../lib/hooks.js';
import { Link } from '../lib/router.jsx';
import { Skeleton, cx } from './ui.jsx';

// Piezas de «Necesito ayuda con…» que se usan en varias pantallas: medallas, semana, reglas y reconocimientos.

const DAY = 86400000;
const shortDay = (d) => d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }).replace('.', '');

// "29 sep – 5 oct" (el fin de la semana es exclusivo: el lunes siguiente a las 00:00).
export function weekLabel(start, end) {
  const from = new Date(start);
  const to = new Date(new Date(end).getTime() - DAY / 2);
  return `${shortDay(from)} – ${shortDay(to)}`;
}

// Cuánto falta para que cierre la semana en curso.
export function closesIn(end) {
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Cerrando la semana…';
  const days = Math.floor(ms / DAY);
  if (days >= 2) return `Cierra en ${days} días, el domingo a las 23:59`;
  if (days === 1) return 'Cierra mañana a las 23:59';
  const hours = Math.max(1, Math.round(ms / 3600000));
  return hours <= 1 ? 'Cierra en menos de una hora' : `Cierra hoy, en ${hours} horas`;
}

export const placeLabel = (place) => PLACE_LABELS[place] || `${place}.º`;
const pts = (n) => `${n} ${n === 1 ? 'punto' : 'puntos'}`;

// Tu posición en la semana en curso, en una frase. `s`: rank, points, inPodium, toPodium, needsGivers.
export function standingText(s, { short = false } = {}) {
  if (!s?.points) return null;
  const head = `Vas ${s.rank}.º con ${pts(s.points)}`;
  if (s.inPodium) return short ? `${head} · estás en el podio` : `${head}: estás en el podio.`;
  if (s.needsGivers) return short ? `${head} · faltan puntos de otra persona` : `${head}. Para el podio, los puntos tienen que venir de al menos dos personas distintas.`;
  const missing = s.toPodium === 1 ? 'te falta 1 punto' : `te faltan ${s.toPodium} puntos`;
  return short ? `${head} · ${missing} para el podio` : `${head}. ${missing.charAt(0).toUpperCase()}${missing.slice(1)} para el podio.`;
}

export function Medal({ place, size = 'md', className }) {
  return <span className={cx('medal', `medal-${place}`, `medal-${size}`, className)} role="img" aria-label={placeLabel(place)}>{place}</span>;
}

// Medalla chica junto al nombre de quien estuvo en el podio en las últimas semanas.
export function PlaceTag({ place }) {
  if (!place) return null;
  return <span className={cx('place-tag', `place-tag-${place}`)} title={`Estuvo en el podio semanal (${placeLabel(place)})`}><Trophy size={11} /> Top {place}</span>;
}

export function PointsRules({ compact }) {
  return (
    <ul className={cx('help-rules', compact && 'is-compact')}>
      {HELP_RULES.map((r) => (
        <li key={r.id}>
          <strong>{r.points}</strong>
          <span>{r.label}{!compact && <small>{r.hint}</small>}</span>
        </li>
      ))}
      {!compact && <li className="help-rules-note">De una misma persona sumás hasta {HELP_POINTS.perPersonWeeklyCap} puntos por semana. Para el podio hacen falta al menos {HELP_POINTS.podiumMin}, de dos personas distintas o más.</li>}
    </ul>
  );
}

function AwardList({ awards }) {
  return (
    <ul className="award-list">
      {awards.map((a) => (
        <li key={a.id}>
          <Medal place={a.place} />
          <span className="award-list-copy"><strong>{placeLabel(a.place)}</strong><small>Semana del {weekLabel(a.start, a.end)} · {a.points} puntos</small></span>
        </li>
      ))}
    </ul>
  );
}

function StatsLine({ stats }) {
  return (
    <p className="help-stats">
      <span><strong>{stats.answers}</strong> {stats.answers === 1 ? 'solución' : 'soluciones'}</span>
      <span><strong>{stats.accepted}</strong> {stats.accepted === 1 ? 'elegida' : 'elegidas'}</span>
      <span><strong>{stats.helpful}</strong> «Me sirvió»</span>
    </p>
  );
}

// Tarjeta de Perfil: tu semana en el ranking y tus reconocimientos.
export function MyRecognitions() {
  const { data, loading } = useLoader(() => api.get('/help/people/me'), []);
  if (loading && !data) return <Skeleton height={150} radius={18} />;
  if (!data) return null;
  const { awards, stats, week } = data;
  const status = standingText(week) || 'Todavía no sumaste puntos esta semana.';
  return (
    <section className="card card-pad recognitions" aria-label="Reconocimientos">
      <header className="recognitions-head">
        <span className="recognitions-icon" aria-hidden="true"><Trophy size={19} /></span>
        <div>
          <span className="kicker">Necesito ayuda con…</span>
          <h2>Reconocimientos</h2>
        </div>
        <Link to="/ayuda/ranking" className="link-btn">Ranking <ArrowRight size={14} /></Link>
      </header>
      <div className="recognitions-week">
        <p>{status}</p>
        <small>{closesIn(week.end)}</small>
      </div>
      {awards.length ? <AwardList awards={awards.slice(0, 4)} /> : (
        <p className="recognitions-empty">Terminá entre los tres primeros del ranking semanal y tu reconocimiento queda acá, a la vista de quienes visitan tu perfil.</p>
      )}
      {awards.length > 4 && <p className="recognitions-more">Y {awards.length - 4} {awards.length - 4 === 1 ? 'reconocimiento' : 'reconocimientos'} más.</p>}
      <div className="recognitions-foot">
        <StatsLine stats={stats} />
        <Link to="/ayuda" className="btn btn-secondary btn-sm"><LifeBuoy size={15} /> Ayudar a alguien</Link>
      </div>
    </section>
  );
}

// En el perfil que ven los demás: solo si tiene podios o soluciones elegidas.
export function PersonRecognitions({ userId }) {
  const { data } = useLoader(() => api.get(`/help/people/${userId}`), [userId]);
  if (!data || (!data.awards.length && !data.stats.accepted)) return null;
  return (
    <section className="detail-section person-recognitions">
      <span className="kicker"><Trophy size={13} /> Reconocimientos</span>
      {data.awards.length > 0 && <AwardList awards={data.awards.slice(0, 3)} />}
      <StatsLine stats={data.stats} />
    </section>
  );
}
