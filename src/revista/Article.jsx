import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, Link2 } from 'lucide-react';
import { Avatar, ProjectLogo, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { Link } from '../lib/router.jsx';
import { ArticleBody } from './ArticleBody.jsx';
import { JoinCta, Kicker, MostRead, Pic, SectionHead, StoryCard, dateLong } from './parts.jsx';

function PersonCard({ person }) {
  if (!person) return null;
  return (
    <div className="rv-who">
      <Avatar person={{ name: person.name, photo: person.photo }} size={56} />
      <div>
        <span className="rv-label">{person.company ? 'Protagonista' : 'Entrevistado'}</span>
        <strong>{person.name}</strong>
        <small>{[person.role, person.company].filter(Boolean).join(' · ')}</small>
      </div>
    </div>
  );
}

// Compartir: enlace, WhatsApp, LinkedIn y X (sin scripts de terceros).
function Share({ article }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/revista/${article.slug}`;
  const text = article.title;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* sin portapapeles */ }
  };
  const links = [
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`]
  ];
  return (
    <div className="rv-share" aria-label="Compartir esta nota">
      <span className="rv-label">Compartir</span>
      <div>
        <button type="button" onClick={copy} className="rv-share-btn">{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? 'Copiado' : 'Copiar enlace'}</button>
        {links.map(([label, href]) => <a key={label} className="rv-share-btn" href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
      </div>
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div className="rv-wrap rv-article" aria-busy="true">
      <div className="rv-article-head"><Skeleton height={14} width={160} /><Skeleton height={46} width="90%" /><Skeleton height={22} width="70%" /></div>
      <Skeleton height={420} radius={18} />
    </div>
  );
}

export default function ArticlePage({ slug }) {
  const { config } = useApp();
  const [state, setState] = useState({ data: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null });
    api.get(`/revista/articles/${slug}`)
      .then((data) => {
        if (!alive) return;
        setState({ data, error: null });
        if (!data.preview) api.post(`/revista/articles/${slug}/view`).catch(() => {});
      })
      .catch((error) => alive && setState({ data: null, error }));
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (state.data) document.title = `${state.data.article.title} · Revista KeFounder!`;
  }, [state.data]);

  if (state.error) {
    return (
      <div className="rv-wrap rv-empty">
        <span className="rv-join-mark" aria-hidden="true">!</span>
        <h1>{state.error.status === 404 ? 'Esta nota no está disponible' : 'No pudimos cargar la nota'}</h1>
        <p>{state.error.status === 404 ? 'Puede que se haya movido o que todavía no esté publicada.' : 'Revisá tu conexión e intentá de nuevo.'}</p>
        <Link to="/revista" className="btn btn-primary">Volver a la portada</Link>
      </div>
    );
  }
  if (!state.data) return <ArticleSkeleton />;

  const { article: a, related, mostRead, preview } = state.data;
  return (
    <div className="rv-wrap rv-article">
      {preview && (
        <p className="rv-preview"><Eye size={15} /> Vista previa: esta nota todavía no está publicada y solo la ve administración.</p>
      )}
      <header className="rv-article-head">
        <Kicker article={a} />
        <h1>{a.title}</h1>
        {a.dek && <p className="rv-dek">{a.dek}</p>}
        <div className="rv-article-meta">
          <span className="rv-byline"><span>Por {a.author}</span><span>{a.publishedAt ? dateLong(a.publishedAt) : 'Sin publicar'}</span><span>{a.readingMinutes} min de lectura</span></span>
        </div>
      </header>

      <figure className="rv-article-cover">
        <Pic src={a.cover} width={1800} eager alt={a.title} />
        {a.coverCredit && <figcaption>{a.coverCredit}</figcaption>}
      </figure>

      <div className="rv-article-grid">
        <div className="rv-article-main">
          <div className="rv-article-who-mobile"><PersonCard person={a.person} /></div>
          <ArticleBody blocks={a.blocks} />

          {a.tags.length > 0 && <ul className="rv-tags" aria-label="Temas">{a.tags.map((t) => <li key={t}><Link to={`/revista/buscar?q=${encodeURIComponent(t)}`}>{t}</Link></li>)}</ul>}

          {a.project && (
            <Link to={`/p/${a.project.id}`} className="rv-project">
              <ProjectLogo project={a.project} size={46} />
              <span>
                <small>Conocé el proyecto en KeFounder!</small>
                <strong>{a.project.name}</strong>
                {a.project.tagline && <em>{a.project.tagline}</em>}
              </span>
              <ArrowRight size={18} />
            </Link>
          )}

          <Share article={a} />
          {a.promoted && <p className="rv-promo-note"><span className="rv-promo">Difusión</span> Esta nota es parte de la difusión que KeFounder! incluye en sus planes Pro y Startup.</p>}
          {a.sample && config.demo && <p className="rv-sample-note">Nota de ejemplo con personas y proyectos ficticios de la demo de KeFounder!.</p>}
        </div>
        <aside className="rv-article-aside">
          <div className="rv-sticky">
            <PersonCard person={a.person} />
            <MostRead items={mostRead} />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="rv-related">
          <SectionHead title="Seguí leyendo" to="/revista" label="Portada" />
          <div className="rv-grid is-3">{related.map((r) => <StoryCard key={r.id} article={r} size="sm" />)}</div>
        </section>
      )}
      <JoinCta variant="band" />
    </div>
  );
}
