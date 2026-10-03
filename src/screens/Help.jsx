import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, LifeBuoy, MessagesSquare, Plus, Search, Send, Trophy, X } from 'lucide-react';
import { HELP_CATEGORIES } from '../../shared/catalog.js';
import { Medal, PlaceTag, PointsRules, closesIn, standingText, weekLabel } from '../components/HelpParts.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, ChipGroup, EmptyState, ErrorState, Pill, Segmented, Sheet, Skeleton, TextArea, cx } from '../components/ui.jsx';
import { api, qs } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { firstName, timeAgo } from '../lib/format.js';
import { useDebounced, useLoader, useMediaQuery, usePersisted } from '../lib/hooks.js';
import { Link, useRouter } from '../lib/router.jsx';

// «Necesito ayuda con…»: pedidos de la comunidad, soluciones y ranking semanal.

export function HelpStatus({ item }) {
  if (item.hidden) return <Pill tone="warm">Oculto</Pill>;
  if (item.status === 'solved') return <Pill tone="solid">Resuelto</Pill>;
  if (item.status === 'closed') return <Pill tone="muted">Cerrado</Pill>;
  if (item.answers === 0) return <Pill tone="gold">Sin respuesta</Pill>;
  return null;
}

// Formulario para pedir ayuda (y para corregir el pedido mientras nadie respondió).
export function AskSheet({ open, onClose, initial, onSaved }) {
  const { fail } = useApp();
  const [form, setForm] = useState({ category: '', title: '', body: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(initial ? { category: initial.category, title: initial.title, body: initial.body } : { category: '', title: '', body: '' });
  }, [open, initial]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const data = initial ? await api.put(`/help/${initial.id}`, form) : await api.post('/help', form);
      onSaved(data);
      onClose();
    } catch (err) {
      if (err.data?.field) setErrors({ [err.data.field]: err.message });
      else fail(err);
    } finally { setBusy(false); }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Editar pedido' : 'Pedir ayuda'}
      subtitle={initial ? 'Podés corregirlo mientras nadie haya respondido.' : 'Contá en qué estás trabado. Quienes te ayuden suman puntos para el ranking semanal.'}
      footer={<Button block loading={busy} icon={<Send size={16} />} onClick={submit}>{initial ? 'Guardar cambios' : 'Publicar pedido'}</Button>}
    >
      <div className="ask-form">
        <div className="field">
          <span className="field-label">¿De qué tema se trata?</span>
          <ChipGroup options={HELP_CATEGORIES} value={form.category} onChange={set('category')} />
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>
        <div className={cx('field', errors.title && 'has-error')}>
          <label className="field-label" htmlFor="ask-title">Tu pedido</label>
          <div className="ask-title">
            <span aria-hidden="true">Necesito ayuda con</span>
            <input id="ask-title" className="input" value={form.title} maxLength={120} onChange={(e) => set('title')(e.target.value)} placeholder="validar mi idea antes de programar" data-autofocus aria-describedby="ask-title-hint" />
          </div>
          {errors.title ? <p className="field-error">{errors.title}</p> : <p className="field-hint" id="ask-title-hint">En pocas palabras, como un título.</p>}
        </div>
        <TextArea
          label="Contexto"
          hint="Qué estás haciendo, qué probaste y qué te gustaría lograr. Con más detalle, mejores soluciones."
          value={form.body}
          onChange={set('body')}
          maxLength={2000}
          rows={6}
          error={errors.body}
          placeholder="Ej.: Tenemos una app de turnos para peluquerías. Probamos con anuncios en Instagram pero…"
        />
      </div>
    </Sheet>
  );
}

// Resumen del ranking de la semana (columna lateral en PC, tira compacta en el celular).
export function RankingPeek({ compact }) {
  const { me: viewer } = useApp();
  const { data, loading } = useLoader(() => api.get('/help/ranking'), []);
  if (loading && !data) return <Skeleton height={compact ? 72 : 260} radius={18} />;
  if (!data) return null;
  const { podium, items, me, week } = data;
  const top = [...podium, ...items].slice(0, compact ? 3 : 5);
  const mine = standingText(me, { short: true }) || (compact ? 'Ayudá a alguien y sumá puntos' : 'Publicá una solución y entrá al ranking');

  if (compact) {
    return (
      <Link to="/ayuda/ranking" className="ranking-strip">
        <span className="ranking-strip-icon" aria-hidden="true"><Trophy size={18} /></span>
        <span className="ranking-strip-copy"><strong>Ranking de la semana</strong><small>{mine}</small></span>
        <span className="ranking-strip-faces" aria-hidden="true">{top.map((r) => <Avatar key={r.user.id} person={r.user} size={26} />)}</span>
        <ArrowRight size={16} className="ranking-strip-arrow" />
      </Link>
    );
  }
  return (
    <section className="card help-side-card ranking-peek">
      <header>
        <h2><Trophy size={17} /> Ranking de la semana</h2>
        <small>{weekLabel(week.start, week.end)} · {closesIn(week.end)}</small>
      </header>
      {top.length ? (
        <ol className="ranking-peek-list">
          {top.map((r) => (
            <li key={r.user.id} className={cx(r.user.id === viewer?.id && 'is-me')}>
              {r.place ? <Medal place={r.place} size="sm" /> : <span className="rank-num">{r.rank}</span>}
              <Avatar person={r.user} size={30} />
              <span className="ranking-peek-name">{r.user.name}</span>
              <strong>{r.points}</strong>
            </li>
          ))}
        </ol>
      ) : <p className="ranking-peek-empty">Todavía nadie sumó puntos esta semana. ¡Puede ser tu semana!</p>}
      <p className="ranking-peek-me">{mine}</p>
      <Link to="/ayuda/ranking" className="link-btn">Ver el ranking completo <ArrowRight size={14} /></Link>
    </section>
  );
}

function RequestCard({ item }) {
  return (
    <Link to={`/ayuda/${item.id}`} className={cx('help-card', item.status === 'solved' && 'is-solved')}>
      <div className="help-card-top">
        <span className="help-cat">{item.categoryLabel}</span>
        <HelpStatus item={item} />
        {item.answeredByMe && <Pill tone="accent">Respondiste</Pill>}
      </div>
      <h3><span className="help-prefix">Necesito ayuda con</span> {item.title}</h3>
      {item.excerpt && <p>{item.excerpt}</p>}
      <div className="help-card-foot">
        {item.author && <Avatar person={item.author} size={24} />}
        <span className="help-card-author">{item.mine ? 'Vos' : firstName(item.author?.name || '')}</span>
        <PlaceTag place={item.author?.place} />
        <time>{timeAgo(item.createdAt)}</time>
        <span className="help-card-count" aria-label={`${item.answers} ${item.answers === 1 ? 'solución' : 'soluciones'}`}><MessagesSquare size={15} /> {item.answers}</span>
      </div>
    </Link>
  );
}

const TABS = [
  { id: 'open', label: 'Abiertos' },
  { id: 'unanswered', label: 'Sin respuesta' },
  { id: 'solved', label: 'Resueltos' },
  { id: 'mine', label: 'Míos' }
];

const EMPTY = {
  open: { title: 'No hay pedidos abiertos', text: 'Sé la primera persona en pedir ayuda: la comunidad está para eso.' },
  unanswered: { title: 'Todos los pedidos tienen respuesta', text: 'Gracias, comunidad. Mirá los abiertos: siempre suma otra mirada.' },
  solved: { title: 'Todavía no hay pedidos resueltos', text: 'Cuando alguien elige la solución que le sirvió, el pedido aparece acá.' },
  mine: { title: 'Todavía no pediste ayuda', text: 'Contá en qué estás trabado y recibí soluciones de founders y equipos que ya pasaron por ahí.' }
};

export default function Help() {
  const { setCounts, toast } = useApp();
  const { navigate } = useRouter();
  const [tab, setTab] = usePersisted('kefounder:help-tab', 'open');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [more, setMore] = useState({ items: [], cursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [asking, setAsking] = useState(false);
  const wide = useMediaQuery('(min-width: 1000px)');
  const filtersKey = `${tab}|${category}|${q}`;
  const current = useRef(filtersKey);
  current.current = filtersKey;
  const { data, error, loading, reload } = useLoader(() => api.get(`/help${qs({ tab, category, q })}`), [tab, category, q]);
  useEffect(() => { setMore({ items: [], cursor: null }); }, [filtersKey]);
  useEffect(() => { if (data) setCounts({ help: 0 }); }, [data, setCounts]);

  // Sin repetidos: si un pedido se movió de lugar entre páginas, se muestra una sola vez.
  const seen = new Set();
  const items = [...(data?.items || []), ...more.items].filter((item) => (seen.has(item.id) ? false : seen.add(item.id)));
  const nextCursor = more.cursor || data?.nextCursor || null;
  const hasMore = more.cursor !== null ? Boolean(more.cursor) : Boolean(data?.nextCursor);
  const loadMore = async () => {
    const key = filtersKey;
    setLoadingMore(true);
    try {
      const next = await api.get(`/help${qs({ tab, category, q, cursor: nextCursor })}`);
      // Si mientras tanto cambió la pestaña, el tema o la búsqueda, esta respuesta ya no corresponde.
      if (current.current === key) setMore((m) => ({ items: [...m.items, ...next.items], cursor: next.nextCursor || '' }));
    } catch { toast('No pudimos cargar más pedidos.', { tone: 'error' }); } finally { setLoadingMore(false); }
  };
  const filtered = Boolean(category || q);
  const empty = EMPTY[tab] || EMPTY.open;

  return (
    <>
      <TopBar back="/" backLabel="Inicio" title="Necesito ayuda con…" />
      <Page width="lg" className="page-help">
        <div className="page-heading help-heading">
          <div>
            <span className="kicker"><LifeBuoy size={13} /> Comunidad · ranking semanal</span>
            <h1>Necesito ayuda con<span className="accent-dot">…</span></h1>
            <p>Contá en qué estás trabado y la comunidad te propone soluciones. Quienes ayudan suman puntos: el podio de cada semana queda en su perfil.</p>
          </div>
          <div className="page-heading-action"><Button icon={<Plus size={17} />} onClick={() => setAsking(true)}>Pedir ayuda</Button></div>
        </div>

        <div className="help-layout">
          <div className="help-main">
            {!wide && <div className="help-mobile-peek"><RankingPeek compact /></div>}
            <Segmented
              className="page-tabs help-tabs"
              value={tab}
              onChange={setTab}
              options={TABS.map((t) => ({ ...t, count: data ? data.counts[t.id] : null }))}
            />
            <div className="help-filters">
              <label className="help-search">
                <Search size={16} aria-hidden="true" />
                <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedidos" aria-label="Buscar pedidos de ayuda" />
                {search && <button type="button" className="help-search-clear" aria-label="Borrar búsqueda" onClick={() => setSearch('')}><X size={15} /></button>}
              </label>
              <div className="help-cats" role="group" aria-label="Filtrar por tema">
                <button type="button" className={cx('chip', !category && 'is-active')} aria-pressed={!category} onClick={() => setCategory('')}>Todos los temas</button>
                {HELP_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" className={cx('chip', category === c.id && 'is-active')} aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? '' : c.id)}>{c.label}</button>
                ))}
              </div>
            </div>

            {loading && !data ? (
              <div className="help-list">{[0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={18} />)}</div>
            ) : error ? <ErrorState error={error} onRetry={reload} /> : items.length ? (
              <>
                <div className={cx('help-list', loading && 'is-refreshing')}>{items.map((item) => <RequestCard key={item.id} item={item} />)}</div>
                {hasMore && <div className="help-more"><Button variant="secondary" loading={loadingMore} onClick={loadMore}>Ver más pedidos</Button></div>}
              </>
            ) : filtered ? (
              <EmptyState compact icon={<Search size={20} />} title="No encontramos pedidos con esos filtros" text="Probá con otro tema u otras palabras." action={<Button variant="secondary" onClick={() => { setCategory(''); setSearch(''); }}>Ver todos</Button>} />
            ) : (
              <EmptyState
                icon={<LifeBuoy size={22} />}
                title={empty.title}
                text={empty.text}
                action={tab === 'mine' || tab === 'open' ? <Button icon={<Plus size={16} />} onClick={() => setAsking(true)}>Pedir ayuda</Button> : null}
              />
            )}
          </div>

          {wide && (
            <aside className="help-aside">
              <RankingPeek />
              <section className="card help-side-card">
                <header><h2>Cómo se suman puntos</h2></header>
                <PointsRules />
              </section>
            </aside>
          )}
        </div>
      </Page>
      <AskSheet open={asking} onClose={() => setAsking(false)} onSaved={(d) => { toast('¡Pedido publicado! Te avisamos cuando llegue una solución.'); navigate(`/ayuda/${d.request.id}`); }} />
    </>
  );
}
