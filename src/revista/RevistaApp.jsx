import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { REVISTA_SECTIONS } from '../../shared/revista.js';
import { Isotipo, Logotipo } from '../components/Brand.jsx';
import { Button, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { useLoader } from '../lib/hooks.js';
import { Link, matchPath, useRouter } from '../lib/router.jsx';
import ArticlePage from './Article.jsx';
import { InterviewCard, JoinCta, Kicker, MostRead, Pic, SectionBlock, SectionHead, StoryCard, StoryRow, articleHref, dateLong, sectionHref, todayLong } from './parts.jsx';

// Revista KeFounder!: se lee sin cuenta. Tiene su propia cabecera, como un diario online.

function Masthead() {
  const { me } = useApp();
  const { path } = useRouter();
  const current = matchPath('/revista/seccion/:id', path)?.id || (path === '/revista' ? 'portada' : '');
  const action = !me
    ? <><Link to="/ingresar" className="btn btn-ghost btn-sm rv-top-login">Ingresar</Link><Link to="/registro" className="btn btn-primary btn-sm">Crear cuenta</Link></>
    : me.role === 'admin'
      ? <Link to="/admin/revista" className="btn btn-secondary btn-sm">Ir al panel</Link>
      : <Link to="/" className="btn btn-secondary btn-sm">Volver a la app</Link>;
  return (
    <header className="rv-top">
      <div className="rv-top-inner">
        <Link to="/revista" className="rv-brand" aria-label="Revista KeFounder!, portada">
          <Isotipo size={30} />
          <span className="rv-brand-word"><Logotipo height={17} /></span>
          <span className="rv-brand-tag">Revista</span>
        </Link>
        <span className="rv-top-date">{todayLong()}</span>
        <div className="rv-top-actions">
          <Link to="/revista/buscar" className="icon-btn" aria-label="Buscar en la revista" title="Buscar"><Search size={19} /></Link>
          {action}
        </div>
      </div>
      <nav className="rv-nav" aria-label="Secciones de la revista">
        <div className="rv-nav-inner">
          <Link to="/revista" className={cx(current === 'portada' && 'is-active')} aria-current={current === 'portada' ? 'page' : undefined}>Portada</Link>
          {REVISTA_SECTIONS.map((s) => (
            <Link key={s.id} to={sectionHref(s.id)} className={cx(current === s.id && 'is-active')} aria-current={current === s.id ? 'page' : undefined}>{s.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  const { me } = useApp();
  return (
    <footer className="rv-foot">
      <div className="rv-foot-inner">
        <div className="rv-foot-brand">
          <Logotipo height={20} />
          <p>Historias de quienes están construyendo: founders, startups, inversión y ecosistema.</p>
        </div>
        <nav aria-label="Secciones">
          <span>Secciones</span>
          {REVISTA_SECTIONS.map((s) => <Link key={s.id} to={sectionHref(s.id)}>{s.label}</Link>)}
        </nav>
        <div className="rv-foot-cta">
          <span>KeFounder!</span>
          {me ? <Link to="/">Ir a la app</Link> : <><Link to="/registro">Crear una cuenta</Link><Link to="/ingresar">Ingresar</Link><Link to="/bienvenida">Conocer la plataforma</Link></>}
        </div>
      </div>
      <p className="rv-foot-copy">© 2026 KeFounder! · Revista</p>
    </footer>
  );
}

function HomeSkeleton() {
  return (
    <div className="rv-wrap rv-home is-loading" aria-busy="true">
      <div className="rv-hero">
        <div className="rv-hero-lead"><Skeleton height={380} radius={18} /><Skeleton height={34} width="80%" /><Skeleton height={18} width="60%" /></div>
        <div className="rv-hero-side">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={86} radius={12} />)}</div>
      </div>
    </div>
  );
}

function Home() {
  const { data, error, reload } = useLoader(() => api.get('/revista/home'), []);
  useEffect(() => { document.title = 'Revista KeFounder! · Startups, founders y entrevistas'; }, []);
  if (error) return <Problem onRetry={reload} />;
  if (!data) return <HomeSkeleton />;
  if (!data.featured) {
    return (
      <div className="rv-wrap rv-empty">
        <span className="rv-join-mark" aria-hidden="true">!</span>
        <h1>Estamos preparando la primera edición</h1>
        <p>Muy pronto vas a encontrar acá entrevistas, startups y founders de la región.</p>
      </div>
    );
  }
  const { featured, latest, interviews, sections, mostRead, quote } = data;
  return (
    <div className="rv-wrap rv-home">
      <section className="rv-hero" aria-label="Nota de portada">
        <article className="rv-hero-lead">
          <Link to={articleHref(featured)} className="rv-hero-media" tabIndex={-1} aria-hidden="true">
            <Pic src={featured.cover} width={1600} eager />
          </Link>
          <div className="rv-hero-copy">
            <Kicker article={featured} />
            <h1><Link to={articleHref(featured)}>{featured.title}</Link></h1>
            {featured.dek && <p>{featured.dek}</p>}
            <span className="rv-byline"><span className="rv-hide-sm">{featured.author}</span><span>{dateLong(featured.publishedAt)}</span><span>{featured.readingMinutes} min de lectura</span></span>
          </div>
        </article>
        <div className="rv-hero-side">
          <h2 className="rv-label">Lo último</h2>
          {latest.map((a) => <StoryRow key={a.id} article={a} />)}
        </div>
      </section>

      {quote && (
        <section className="rv-quote" aria-label="Frase destacada">
          <blockquote>
            <p>{quote.text}</p>
            <footer>
              {quote.by && <cite>{quote.by}</cite>}
              <Link to={articleHref(quote.article)}>Leer la nota <ArrowRight size={14} /></Link>
            </footer>
          </blockquote>
        </section>
      )}

      <div className="rv-columns">
        <div className="rv-main">
          {interviews.length > 0 && (
            <section>
              <SectionHead title="Entrevistas" to={sectionHref('entrevistas')} />
              <div className="rv-grid is-3">{interviews.map((a) => <InterviewCard key={a.id} article={a} />)}</div>
            </section>
          )}
          {sections.length > 0 && <div className="rv-secs">{sections.map((s) => <SectionBlock key={s.id} section={s} />)}</div>}
        </div>
        <aside className="rv-aside">
          <MostRead items={mostRead} />
          <JoinCta />
        </aside>
      </div>
    </div>
  );
}

// Lista de una sección o resultados de búsqueda, con "ver más".
function ArticleList({ section, search }) {
  const { query, navigate } = useRouter();
  const q = search ? (query.get('q') || '').trim() : '';
  const meta = REVISTA_SECTIONS.find((s) => s.id === section);
  const [pages, setPages] = useState([]);
  const [state, setState] = useState({ loading: true, error: null, total: 0, pagesTotal: 1 });
  const [draft, setDraft] = useState(q);
  const input = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    document.title = meta ? `${meta.label} · Revista KeFounder!` : 'Buscar · Revista KeFounder!';
  }, [meta]);
  useEffect(() => { setDraft(q); }, [q]);
  useEffect(() => { if (search) input.current?.focus(); }, [search]);

  const load = async (page, reset) => {
    const id = ++seq.current;
    if (search && !q) { setPages([]); setState({ loading: false, error: null, total: 0, pagesTotal: 1 }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (section) params.set('section', section);
      if (q) params.set('q', q);
      const data = await api.get(`/revista/articles?${params}`);
      if (id !== seq.current) return; // llegó tarde: ya se pidió otra cosa
      setPages((prev) => {
        if (reset) return [data.items];
        const seen = new Set(prev.flat().map((a) => a.id));
        return [...prev, data.items.filter((a) => !seen.has(a.id))];
      });
      setState({ loading: false, error: null, total: data.total, pagesTotal: data.pages, page });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error }));
    }
  };
  useEffect(() => { load(1, true); }, [section, q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (section && !meta) return <NotFoundRevista />;
  const items = pages.flat();
  const [lead, ...rest] = items;

  return (
    <div className="rv-wrap rv-list">
      <header className="rv-list-head">
        <span className="rv-label">{search ? 'Buscar en la revista' : 'Sección'}</span>
        <h1>{meta ? meta.label : q ? `Resultados para “${q}”` : 'Buscar'}</h1>
        {meta && <p>{meta.hint}</p>}
        {search && (
          <form className="rv-search" role="search" onSubmit={(e) => { e.preventDefault(); navigate(`/revista/buscar${draft.trim() ? `?q=${encodeURIComponent(draft.trim())}` : ''}`, { replace: true }); }}>
            <Search size={18} />
            <input ref={input} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Personas, startups, temas…" aria-label="Buscar notas" />
            {draft && <button type="button" aria-label="Borrar" onClick={() => setDraft('')}><X size={16} /></button>}
            <Button type="submit" size="sm">Buscar</Button>
          </form>
        )}
        {(!search || q) && !state.loading && <span className="rv-list-count">{state.total} {state.total === 1 ? 'nota' : 'notas'}</span>}
      </header>

      {state.error && <Problem onRetry={() => load(1, true)} />}
      {!state.error && state.loading && !items.length && (
        <div className="rv-grid is-4">{[0, 1, 2, 3].map((i) => <div key={i} className="rv-card-skel"><Skeleton height={180} radius={14} /><Skeleton height={20} width="85%" /><Skeleton height={16} width="60%" /></div>)}</div>
      )}
      {!state.loading && !state.error && !items.length && (
        <div className="rv-empty is-inline">
          <h2>{search && !q ? 'Escribí qué querés leer' : 'No encontramos notas'}</h2>
          <p>{search && !q ? 'Buscá por nombre, startup o tema.' : 'Probá con otra palabra o mirá las otras secciones.'}</p>
          <Link to="/revista" className="btn btn-secondary btn-sm">Ir a la portada</Link>
        </div>
      )}
      {lead && !search && <StoryCard article={lead} size="lg" className="rv-list-lead" />}
      {(search ? items : rest).length > 0 && (
        <div className="rv-grid is-4">{(search ? items : rest).map((a) => <StoryCard key={a.id} article={a} size="sm" />)}</div>
      )}
      {state.page < state.pagesTotal && (
        <div className="rv-more"><Button variant="secondary" loading={state.loading} onClick={() => load(state.page + 1)}>Ver más notas</Button></div>
      )}
      <JoinCta variant="band" />
    </div>
  );
}

function Problem({ onRetry }) {
  return (
    <div className="rv-wrap rv-empty">
      <h1>No pudimos cargar la revista</h1>
      <p>Revisá tu conexión e intentá de nuevo.</p>
      <Button variant="secondary" onClick={() => onRetry()}>Reintentar</Button>
    </div>
  );
}

export function NotFoundRevista() {
  useEffect(() => { document.title = 'Nota no encontrada · Revista KeFounder!'; }, []);
  return (
    <div className="rv-wrap rv-empty">
      <span className="rv-join-mark" aria-hidden="true">!</span>
      <h1>Esta nota no está disponible</h1>
      <p>Puede que se haya movido o que todavía no esté publicada.</p>
      <Link to="/revista" className="btn btn-primary"><ArrowLeft size={16} /><span>Volver a la portada</span></Link>
    </div>
  );
}

export default function RevistaApp() {
  const { path } = useRouter();
  let screen;
  const section = matchPath('/revista/seccion/:id', path);
  const article = matchPath('/revista/:slug', path);
  if (path === '/revista' || path === '/revista/') screen = <Home />;
  else if (section) screen = <ArticleList key={section.id} section={section.id} />;
  else if (path === '/revista/buscar') screen = <ArticleList search />;
  else if (article) screen = <ArticlePage key={article.slug} slug={article.slug} />;
  else screen = <NotFoundRevista />;
  return (
    <div className="rv">
      <a href="#rv-main" className="rv-skip">Saltar al contenido</a>
      <Masthead />
      <main id="rv-main" className="rv-content">{screen}</main>
      <Footer />
    </div>
  );
}
