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
        <div className="compat-score">{match.score}<small>%</small></div>
      </div>
      {match.reasons?.length > 0 ? (
        <ul className="compat-reasons">
          {match.reasons.map((r) => <li key={r}><Check size={14} /> {r}</li>)}
        </ul>
      ) : (
        <p className="compat-text">Coinciden en intereses, disponibilidad y objetivos.</p>
      )}
      {match.breakdown ? (
        <div className="compat-breakdown">
          {match.breakdown.filter((b) => b.value > 0 && b.key !== 'skills' && b.key !== 'stage').map((b) => (
            <div key={b.key} className="compat-bar">
              <span>{b.label}</span>
              <div><i style={{ width: `${b.value}%` }} /></div>
              <em>{b.value}%</em>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" className="compat-lock" onClick={() => showPaywall(paywallFor('advancedCompat'))}>
          <Lock size={13} /> Ver por qué son compatibles en detalle · Pro
        </button>
      )}
    </div>
  );
}
