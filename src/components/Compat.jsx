import React from 'react';
import { Check, Lock } from 'lucide-react';
import { useApp } from '../lib/app.jsx';
import { paywallFor } from '../lib/plan.js';

export function CompatBlock({ match }) {
  const { showPaywall } = useApp();
  if (!match) return null;
  return (
    <div className="compat">
      <div className="compat-head">
        <span className="kicker">Compatibilidad</span>
        {match.score !== null && <div className="compat-score">{match.score}<small>%</small></div>}
      </div>
      {Number.isFinite(match.coverage) && <p className="compat-coverage">Datos evaluados: {match.coverage}% de los factores</p>}
      {match.score === null ? (
        <p className="compat-text">Todavía faltan datos de los perfiles para calcular una compatibilidad útil.</p>
      ) : match.reasons?.length > 0 ? (
        <ul className="compat-reasons">
          {match.reasons.map((r) => <li key={r}><Check size={14} /> {r}</li>)}
        </ul>
      ) : (
        <p className="compat-text">No hay coincidencias concretas para destacar con los datos cargados.</p>
      )}
      {match.breakdown ? (
        <div className="compat-breakdown">
          {match.breakdown.map((b) => (
            <div key={b.key} className="compat-bar">
              <span>{b.label}</span>
              <div><i style={{ width: `${b.value ?? 0}%` }} /></div>
              <em>{b.value === null ? 'Sin datos' : `${b.value}%`}</em>
            </div>
          ))}
        </div>
      ) : match.score !== null ? (
        <button type="button" className="compat-lock" onClick={() => showPaywall(paywallFor('advancedCompat'))}>
          <Lock size={13} /> Ver por qué son compatibles en detalle · Pro
        </button>
      ) : null}
    </div>
  );
}
