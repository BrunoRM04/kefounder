import React from 'react';
import { cx } from './ui.jsx';
import { MARK, WORDMARK } from './brand-geometry.js';

// Marca KeFounder!: el color de las letras sale de `currentColor` (lo define el CSS
// de cada lugar) y el punto del "!" siempre es terracota.

function MarkShapes() {
  return (
    <>
      <rect x={MARK.stem.x} y={MARK.stem.y} width={MARK.stem.width} height={MARK.stem.height} rx={MARK.stem.rx} fill="currentColor" />
      <circle className="brand-dot" cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} />
      <path d={MARK.arm} fill="none" stroke="currentColor" strokeWidth={MARK.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// Isotipo solo (sin fondo). `size` es el alto en px.
export function Isotipo({ size = 32, className, label }) {
  const pad = 10;
  return (
    <svg
      className={cx('isotipo', className)}
      viewBox={`${-pad} ${-pad} ${MARK.width + pad * 2} ${MARK.height + pad * 2}`}
      height={size}
      width={(size * (MARK.width + pad * 2)) / (MARK.height + pad * 2)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <MarkShapes />
    </svg>
  );
}

// Isotipo en su cuadro (ícono de la app).
export function IsotipoTile({ size = 48, className, label }) {
  const box = 512;
  const s = (box * 0.56) / Math.max(MARK.width, MARK.height);
  const tx = (box - MARK.width * s) / 2;
  const ty = (box - MARK.height * s) / 2;
  return (
    <svg className={cx('isotipo-tile', className)} viewBox={`0 0 ${box} ${box}`} width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <rect className="isotipo-tile-bg" width={box} height={box} rx="116" />
      <g className="isotipo-tile-mark" transform={`translate(${tx} ${ty}) scale(${s})`}><MarkShapes /></g>
    </svg>
  );
}

// Logotipo "KeFounder!". `height` es el alto de las mayúsculas en px.
export function Logotipo({ height = 20, className }) {
  const pad = 2;
  const vbH = WORDMARK.height + pad * 2;
  const vbW = WORDMARK.width + pad * 2;
  const h = (height * vbH) / 72;
  return (
    <svg
      className={cx('logotipo', className)}
      viewBox={`${WORDMARK.minX - pad} ${WORDMARK.minY - pad} ${vbW} ${vbH}`}
      height={h}
      width={(h * vbW) / vbH}
      role="img"
      aria-label="KeFounder!"
      focusable="false"
    >
      <path d={WORDMARK.d} fill="currentColor" />
      <rect x={WORDMARK.bang.x} y={WORDMARK.bang.y} width={WORDMARK.bang.width} height={WORDMARK.bang.height} rx={WORDMARK.bang.rx} fill="currentColor" />
      <circle className="brand-dot" cx={WORDMARK.bang.cx} cy={WORDMARK.bang.cy} r={WORDMARK.bang.r} />
    </svg>
  );
}

export const BRAND_NAME = 'KeFounder!';
