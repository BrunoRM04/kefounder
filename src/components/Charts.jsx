import React, { useState } from 'react';
import { cx } from './ui.jsx';

const compact = (n) => (n >= 10000 ? `${(n / 1000).toFixed(1).replace('.', ',')}K` : n.toLocaleString('es-UY'));

// Stat tile: etiqueta · valor · variación opcional contra un período nombrado.
export function StatTile({ label, value, delta, deltaLabel = 'vs. semana anterior', icon }) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const direction = hasDelta ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : null;
  return (
    <div className="stat-tile">
      <span className="stat-label">{icon}{label}</span>
      <strong className="stat-value">{compact(value)}</strong>
      {hasDelta && (
        <span className={cx('stat-delta', `is-${direction}`)}>
          {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'} {delta > 0 ? '+' : ''}{delta}% <small>{deltaLabel}</small>
        </span>
      )}
    </div>
  );
}

const niceMax = (max) => {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => max / s <= 4) || pow * 10;
  return Math.ceil(max / step) * step;
};

// Columnas de una sola serie (sin leyenda: el título nombra la serie).
export function ColumnChart({ data, valueLabel = 'visualizaciones', height = 200 }) {
  const [active, setActive] = useState(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const top = niceMax(max);
  const ticks = [0, top / 2, top];
  const peak = data.findIndex((d) => d.value === max && max > 0);
  return (
    <figure className="column-chart" style={{ '--chart-h': `${height}px` }}>
      <div className="column-plot">
        <div className="column-grid" aria-hidden="true">
          {ticks.slice().reverse().map((t) => <div key={t}><span>{compact(t)}</span></div>)}
        </div>
        <div className="column-bars" role="list">
          {data.map((d, i) => (
            <button
              type="button"
              role="listitem"
              key={d.key}
              className={cx('column', active === i && 'is-active')}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.full}: ${d.value} ${valueLabel}`}
            >
              <span className="column-bar" style={{ height: `${top ? (d.value / top) * 100 : 0}%` }}>
                {i === peak && active === null && <em className="column-peak">{d.value}</em>}
              </span>
              {active === i && (
                <span className={cx('column-tip', i > data.length * 0.66 && 'is-left', i < data.length * 0.33 && 'is-right')}>
                  <strong>{d.value.toLocaleString('es-UY')}</strong>
                  <small>{valueLabel} · {d.full}</small>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="column-axis" aria-hidden="true">
        {data.map((d) => <span key={d.key}>{d.label}</span>)}
      </div>
      <details className="chart-table">
        <summary>Ver datos en tabla</summary>
        <table>
          <thead><tr><th>Día</th><th>{valueLabel.charAt(0).toUpperCase() + valueLabel.slice(1)}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.key}><td>{d.full}</td><td>{d.value}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

// Barras horizontales de una sola serie con el valor en la punta.
export function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${item.value}`}>
          <span className="bar-list-label">{item.label}</span>
          <span className="bar-list-track"><i style={{ width: `${(item.value / max) * 100}%` }} /></span>
          <span className="bar-list-value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export const dayData = (byDay, key = 'views') => byDay.map((d) => {
  const date = new Date(`${d.day}T12:00:00`);
  return {
    key: d.day,
    value: d[key],
    label: String(date.getDate()),
    full: date.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  };
});
