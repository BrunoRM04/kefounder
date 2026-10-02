import React, { useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Avatar, cx } from '../components/ui.jsx';
import { useApp } from '../lib/app.jsx';
import { imageSrc } from '../lib/media.js';
import { Link } from '../lib/router.jsx';

// Piezas de la revista: imágenes, tarjetas de notas, lo más leído y la invitación a sumarse.

export const articleHref = (a) => `/revista/${a.slug}`;
export const sectionHref = (id) => `/revista/seccion/${id}`;

export function dateLong(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function dateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }).replace('.', '');
}
export const todayLong = () => {
  const text = new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Imagen con fondo de marca mientras carga (o si falla).
export function Pic({ src, alt = '', width = 900, className, eager }) {
  const [broken, setBroken] = useState(false);
  const url = src && !broken ? imageSrc(src, width) : '';
  return (
    <span className={cx('rv-pic', className)}>
      {url ? <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setBroken(true)} /> : <i className="rv-pic-mark" aria-hidden="true">!</i>}
    </span>
  );
}

export function Kicker({ article, withFormat = true }) {
  // "Entrevistas · Entrevista" no suma: el formato se muestra solo si dice algo distinto.
  const redundant = article.formatLabel && article.sectionLabel?.toLowerCase().startsWith(article.formatLabel.toLowerCase());
  withFormat = withFormat && !redundant;
  return (
    <span className="rv-kicker">
      <Link to={sectionHref(article.section)}>{article.sectionLabel}</Link>
      {withFormat && article.formatLabel && <em>{article.formatLabel}</em>}
      {article.promoted && <span className="rv-promo" title="Nota incluida en un plan de difusión de KeFounder!">Difusión</span>}
    </span>
  );
}

export function Byline({ article, compact }) {
  return (
    <span className="rv-byline">
      {!compact && <span>{article.author}</span>}
      <span>{dateShort(article.publishedAt)}</span>
      <span className="rv-read"><Clock size={12} />{article.readingMinutes} min</span>
    </span>
  );
}

// Tarjeta estándar: imagen arriba, sección, título y bajada.
export function StoryCard({ article, size = 'md', showDek = true, className }) {
  return (
    <article className={cx('rv-card', `is-${size}`, className)}>
      <Link to={articleHref(article)} className="rv-card-media" tabIndex={-1} aria-hidden="true">
        <Pic src={article.cover} width={size === 'lg' ? 1400 : 800} eager={size === 'lg'} />
      </Link>
      <div className="rv-card-copy">
        <Kicker article={article} />
        <h3><Link to={articleHref(article)}>{article.title}</Link></h3>
        {showDek && article.dek && <p>{article.dek}</p>}
        <Byline article={article} compact={size === 'sm'} />
      </div>
    </article>
  );
}

// Fila compacta con miniatura (columnas laterales y listas).
export function StoryRow({ article }) {
  return (
    <article className="rv-row">
      <div className="rv-row-copy">
        <Kicker article={article} withFormat={false} />
        <h3><Link to={articleHref(article)}>{article.title}</Link></h3>
        <Byline article={article} compact />
      </div>
      <Link to={articleHref(article)} className="rv-row-media" tabIndex={-1} aria-hidden="true"><Pic src={article.cover} width={320} /></Link>
    </article>
  );
}

// Entrevista: la persona primero.
export function InterviewCard({ article }) {
  return (
    <article className="rv-interview">
      <Link to={articleHref(article)} className="rv-card-media" tabIndex={-1} aria-hidden="true"><Pic src={article.cover} width={800} /></Link>
      <div className="rv-interview-copy">
        {article.person && (
          <span className="rv-person">
            <Avatar person={{ name: article.person.name, photo: article.person.photo }} size={36} />
            <span><strong>{article.person.name}</strong><small>{[article.person.role, article.person.company].filter(Boolean).join(' · ')}</small></span>
          </span>
        )}
        <h3><Link to={articleHref(article)}>{article.title}</Link></h3>
        <Byline article={article} compact />
      </div>
    </article>
  );
}

export function MostRead({ items, title = 'Lo más leído' }) {
  if (!items?.length) return null;
  return (
    <section className="rv-most" aria-label={title}>
      <h2 className="rv-label">{title}</h2>
      <ol>
        {items.map((a, i) => (
          <li key={a.id}>
            <span className="rv-most-n" aria-hidden="true">{i + 1}</span>
            <div>
              <Kicker article={a} withFormat={false} />
              <Link to={articleHref(a)}>{a.title}</Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Invitación a la plataforma (cambia según haya sesión o no).
export function JoinCta({ variant = 'card' }) {
  const { me } = useApp();
  const logged = Boolean(me);
  return (
    <aside className={cx('rv-join', `is-${variant}`)}>
      <span className="rv-join-mark" aria-hidden="true">!</span>
      <div>
        <strong>{logged ? 'Las personas de estas historias están en KeFounder!' : '¿Querés construir con personas así?'}</strong>
        <p>{logged ? 'Descubrí founders, talento y proyectos que buscan sumar gente.' : 'En KeFounder! se encuentran founders, talento y proyectos. Si el interés es mutuo, es match.'}</p>
      </div>
      <Link to={logged ? '/' : '/registro'} className="btn btn-primary btn-sm rv-join-btn">
        <span>{logged ? 'Ir a Descubrir' : 'Crear mi cuenta gratis'}</span><ArrowRight size={15} />
      </Link>
    </aside>
  );
}

// Bloque de sección: nota principal con foto y, debajo, títulos sin foto.
export function SectionBlock({ section }) {
  const [lead, ...rest] = section.items;
  return (
    <section className="rv-sec">
      <SectionHead title={section.label} to={sectionHref(section.id)} />
      <StoryCard article={lead} size="sm" />
      {rest.length > 0 && (
        <ul className="rv-sec-links">
          {rest.map((a) => (
            <li key={a.id}>
              <Link to={articleHref(a)}>{a.title}</Link>
              <Byline article={a} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SectionHead({ title, to, label = 'Ver todo' }) {
  return (
    <header className="rv-section-head">
      <h2>{title}</h2>
      <i aria-hidden="true" />
      {to && <Link to={to}>{label}<ArrowRight size={14} /></Link>}
    </header>
  );
}
