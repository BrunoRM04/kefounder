import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Heart, Layers, RotateCcw, SlidersHorizontal, Sparkles, UserRound, X } from 'lucide-react';
import { AVAILABILITY, COMPENSATION, COUNTRIES, EXPERIENCE_LEVELS, INDUSTRIES, LANGUAGES, PROJECT_COMPENSATION, ROLES, SKILLS, STAGES, TEAM_SIZES, WORK_MODES } from '../../shared/catalog.js';
import { DeckCardView } from '../components/DeckCard.jsx';
import { TopBar } from '../components/Shell.jsx';
import { Avatar, Button, ChipGroup, EmptyState, LockedBadge, ProjectLogo, Segmented, Select, Sheet, Skeleton, TagInput, Toggle, cx } from '../components/ui.jsx';
import { api, qs } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { deckStore } from '../lib/deck-store.js';
import { firstName } from '../lib/format.js';
import { usePersisted } from '../lib/hooks.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';

const ADVANCED_KEYS = ['skills', 'experience', 'industry', 'stage', 'availability', 'languages', 'teamSize', 'hasUsers', 'hasRevenue', 'hasInvestment'];
const countFilters = (f) => Object.values(f || {}).filter((v) => (Array.isArray(v) ? v.length : Boolean(v))).length;
const stripAdvanced = (f) => Object.fromEntries(Object.entries(f || {}).filter(([k]) => !ADVANCED_KEYS.includes(k)));

// ---------- Tarjeta con gestos ----------
const SwipeCard = forwardRef(function SwipeCard({ item, onDecide, onOpen, stageRef }, ref) {
  const el = useRef(null);
  const drag = useRef(null);
  const [stamp, setStamp] = useState(null);
  const busy = useRef(false);

  const apply = (dx, dy, animate) => {
    const node = el.current;
    if (!node) return;
    node.style.transition = animate ? 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    node.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
    const progress = Math.min(1, Math.abs(dx) / 140);
    stageRef.current?.style.setProperty('--next-scale', String(0.95 + progress * 0.05));
  };

  const fly = useCallback((direction) => {
    if (busy.current) return;
    busy.current = true;
    const node = el.current;
    const action = direction === 'right' ? 'connect' : direction === 'left' ? 'pass' : 'save';
    if (node) {
      node.style.transition = 'transform 0.34s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.34s ease';
      const w = window.innerWidth;
      node.style.transform = direction === 'up'
        ? 'translate(0, -115%) scale(0.92)'
        : `translate(${direction === 'right' ? w : -w}px, 40px) rotate(${direction === 'right' ? 22 : -22}deg)`;
      node.style.opacity = '0';
    }
    setStamp(action);
    stageRef.current?.style.setProperty('--next-scale', '1');
    window.setTimeout(() => onDecide(action, item), 260);
  }, [item, onDecide, stageRef]);

  useImperativeHandle(ref, () => ({ fly }), [fly]);

  const onPointerDown = (e) => {
    if (busy.current || e.button > 0 || e.target.closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, dy: 0, active: false };
    el.current.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    d.dy = e.clientY - d.y;
    if (!d.active && Math.hypot(d.dx, d.dy) < 6) return;
    d.active = true;
    apply(d.dx, d.dy * 0.35, false);
    setStamp(d.dx > 40 ? 'connect' : d.dx < -40 ? 'pass' : d.dy < -70 && Math.abs(d.dx) < 60 ? 'save' : null);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.active) {
      if (Date.now() - d.t < 450) onOpen(item);
      return;
    }
    const velocity = Math.abs(d.dx) / Math.max(1, Date.now() - d.t);
    if (d.dx > 110 || (d.dx > 50 && velocity > 0.6)) fly('right');
    else if (d.dx < -110 || (d.dx < -50 && velocity > 0.6)) fly('left');
    else if (d.dy < -130 && Math.abs(d.dx) < 80) fly('up');
    else { apply(0, 0, true); setStamp(null); }
  };

  return (
    <article
      ref={el}
      className="deck-card is-top"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={item.name}
    >
      <span className={cx('stamp stamp-connect', stamp === 'connect' && 'is-visible')}>Conectar <Heart size={16} /></span>
      <span className={cx('stamp stamp-pass', stamp === 'pass' && 'is-visible')}>Pasar <X size={16} /></span>
      <span className={cx('stamp stamp-save', stamp === 'save' && 'is-visible')}>Guardar <Bookmark size={15} /></span>
      <DeckCardView item={item} onInfo={() => onOpen(item)} />
    </article>
  );
});

// ---------- Filtros ----------
function FiltersSheet({ open, onClose, mode, value, sort, onApply }) {
  const { me, showPaywall } = useApp();
  const [draft, setDraft] = useState(value);
  const [draftSort, setDraftSort] = useState(sort);
  useEffect(() => { if (open) { setDraft(value); setDraftSort(sort); } }, [open, value, sort]);
  const canAdvanced = hasFeature(me, 'advancedFilters');
  const set = (key) => (v) => setDraft((d) => ({ ...d, [key]: v }));
  const locked = () => showPaywall(paywallFor('advancedFilters'));
  const people = mode === 'people';
  const opportunity = people ? COMPENSATION.filter((c) => c.id !== 'unsure') : PROJECT_COMPENSATION.filter((c) => c.id !== 'talk');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      subtitle={people ? 'Encontrá a las personas indicadas.' : 'Encontrá el proyecto indicado.'}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={() => setDraft({})}>Limpiar</Button>
          <Button onClick={() => { onApply(canAdvanced ? draft : stripAdvanced(draft), draftSort); onClose(); }}>Ver resultados</Button>
        </>
      )}
    >
      <div className="filters">
        <section className="filter-block">
          <h3>Ordenar</h3>
          <Segmented value={draftSort} onChange={setDraftSort} options={[{ id: 'compat', label: 'Para vos' }, { id: 'recent', label: 'Recientes' }, { id: 'active', label: 'Activos' }]} />
        </section>
        <section className="filter-block">
          <h3>{people ? 'Rol' : 'Buscan a alguien de'}</h3>
          <ChipGroup options={ROLES.filter((r) => r.id !== 'other')} value={draft.role || ''} onChange={set('role')} />
        </section>
        <div className="form-grid cols-2">
          <Select label="País" value={draft.country} onChange={set('country')} options={COUNTRIES} placeholder="Cualquier país" />
          <section className="filter-block filter-inline">
            <h3>Modalidad</h3>
            <ChipGroup options={WORK_MODES} value={draft.workMode || ''} onChange={set('workMode')} />
          </section>
        </div>
        <section className="filter-block">
          <h3>Tipo de oportunidad</h3>
          <ChipGroup options={opportunity} value={draft.compensation || ''} onChange={set('compensation')} />
        </section>

        <div className={cx('filter-advanced', !canAdvanced && 'is-locked')}>
          <div className="filter-advanced-head">
            <div>
              <h3>Filtros avanzados</h3>
              <p>{canAdvanced ? 'Afiná al detalle tu búsqueda.' : 'Skills, experiencia, industria, etapa y más.'}</p>
            </div>
            {!canAdvanced && <button type="button" onClick={locked}><LockedBadge plan="plus" /></button>}
          </div>
          <div className="filter-advanced-body" onClickCapture={(e) => { if (!canAdvanced) { e.preventDefault(); e.stopPropagation(); locked(); } }}>
            <TagInput label={people ? 'Skills' : 'Tecnología'} value={draft.skills || []} onChange={set('skills')} suggestions={SKILLS} max={5} placeholder="React, Figma, Ventas B2B…" />
            {people && (
              <section className="filter-block">
                <h3>Experiencia</h3>
                <ChipGroup options={EXPERIENCE_LEVELS} value={draft.experience || ''} onChange={set('experience')} />
              </section>
            )}
            <div className="form-grid cols-2">
              <Select label="Industria" value={draft.industry} onChange={set('industry')} options={INDUSTRIES} placeholder="Todas" />
              <Select label={people ? 'Disponibilidad semanal' : 'Dedicación requerida'} value={draft.availability} onChange={set('availability')} options={AVAILABILITY.map((a) => ({ id: a.id, label: a.label }))} placeholder="Cualquiera" />
            </div>
            {people ? (
              <section className="filter-block">
                <h3>Idiomas</h3>
                <ChipGroup multiple options={LANGUAGES} value={draft.languages || []} onChange={set('languages')} />
              </section>
            ) : (
              <>
                <section className="filter-block">
                  <h3>Etapa del proyecto</h3>
                  <ChipGroup options={STAGES} value={draft.stage || ''} onChange={set('stage')} />
                </section>
                <section className="filter-block">
                  <h3>Tamaño del equipo</h3>
                  <ChipGroup options={TEAM_SIZES} value={draft.teamSize || ''} onChange={set('teamSize')} />
                </section>
                <div className="filter-toggles">
                  <Toggle label="Con usuarios" checked={draft.hasUsers} onChange={set('hasUsers')} />
                  <Toggle label="Con facturación" checked={draft.hasRevenue} onChange={set('hasRevenue')} />
                  <Toggle label="Con inversión" checked={draft.hasInvestment} onChange={set('hasInvestment')} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ---------- Panel lateral (desktop) ----------
function SidePanel({ onFilters }) {
  const { me, counts } = useApp();
  const [interested, setInterested] = useState(null);
  useEffect(() => { api.get('/interests/received').then(setInterested).catch(() => {}); }, [counts.interests]);
  const usage = me.usage || {};
  return (
    <aside className="discover-side">
      <div className="welcome-note">
        <i className="orbit orbit-1" /><i className="orbit orbit-2" />
        <span className="welcome-emoji">☀️</span>
        <span className="kicker">Un paso a la vez</span>
        <h3>Las buenas ideas<br />se construyen <em>en equipo.</em></h3>
        <p>Encontrá personas que completen lo que estás imaginando.</p>
        <button type="button" className="link-btn" onClick={onFilters}>Afinar mi búsqueda <ArrowRight size={14} /></button>
      </div>

      {counts.interests > 0 && (
        <Link to="/interesados" className="side-card side-interest">
          <div className="side-stack">
            {interested?.locked
              ? interested.previews.slice(0, 3).map((p, i) => <span key={i} className="ghost-avatar" style={{ background: p.accent }} />)
              : (interested?.items || []).slice(0, 3).map((i) => <Avatar key={i.id} person={i.person} size={30} />)}
          </div>
          <div>
            <strong>{counts.interests === 1 ? '1 persona quiere' : `${counts.interests} personas quieren`} conectar con vos</strong>
            <span>{interested?.locked ? 'Descubrí quiénes son con Plus' : 'Respondé tus solicitudes'}</span>
          </div>
          <ArrowRight size={16} />
        </Link>
      )}

      <div className="side-block">
        <div className="side-title"><span>Actividad reciente</span><Link to="/matches">Ver todo</Link></div>
        <Link to="/matches" className="side-row">
          <span className="side-row-icon"><Heart size={15} /></span>
          <span>{counts.messages ? `${counts.messages} ${counts.messages === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}` : 'Tus conversaciones están al día'}</span>
          {counts.messages > 0 && <i className="unread-dot" />}
        </Link>
        {usage.connectionsLeft !== null && usage.connectionsLeft !== undefined && (
          <div className="side-row">
            <span className="side-row-icon"><Sparkles size={15} /></span>
            <span>{usage.connectionsLeft} de 10 conexiones disponibles hoy</span>
          </div>
        )}
        <div className="soft-divider" />
        <div className="tip-line"><span>💡</span><p><strong>Un buen perfil abre puertas.</strong><br />Sumá tus proyectos y destacá entre la comunidad.</p></div>
      </div>

    </aside>
  );
}

// ---------- Pantalla ----------
export default function Discover() {
  const { me, setMe, fail, toast, celebrate } = useApp();
  const { navigate } = useRouter();
  const [mode, setMode] = usePersisted('kefounder:mode', 'people');
  const [allFilters, setAllFilters] = usePersisted('kefounder:filters', { people: {}, projects: {} });
  const [sort, setSort] = usePersisted('kefounder:sort', 'compat');
  const filters = useMemo(() => (hasFeature(me, 'advancedFilters') ? allFilters[mode] || {} : stripAdvanced(allFilters[mode])), [allFilters, mode, me]);
  const key = JSON.stringify({ filters, sort });
  const type = mode === 'people' ? 'person' : 'project';

  // El mazo en pantalla pertenece a un modo + filtros concretos (deckId).
  const deckId = `${mode}|${key}`;
  const cached = deckStore.get(mode);
  const fresh = cached && cached.key === key ? cached : null;
  const [items, setItems] = useState(fresh?.items || []);
  const [total, setTotal] = useState(fresh?.total ?? null);
  const [history, setHistory] = useState(fresh?.history || []);
  const [loading, setLoading] = useState(!fresh);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [counts, setCounts] = useState({ people: null, projects: null });
  const topRef = useRef(null);
  const stageRef = useRef(null);
  const loadingMore = useRef(false);
  const owner = useRef(fresh ? deckId : null);

  // Solo se guarda en memoria cuando el estado ya corresponde al modo actual.
  useEffect(() => {
    if (owner.current === deckId) deckStore.set(mode, { key, items, total, history });
  }, [deckId, mode, key, items, total, history]);

  const refreshCounts = useCallback(() => { api.get('/discover/counts').then(setCounts).catch(() => {}); }, []);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const load = useCallback(async (reset) => {
    if (!reset && loadingMore.current) return;
    const requestedFor = deckId;
    loadingMore.current = true;
    if (reset) { setLoading(true); setError(null); }
    try {
      const data = await api.get(`/discover${qs({ mode, sort, limit: 20, ...filters })}`);
      if (owner.current !== requestedFor) return; // el usuario ya cambió de modo o filtros
      setItems((prev) => {
        const base = reset ? [] : prev;
        const ids = new Set(base.map((i) => i.id));
        return [...base, ...data.items.filter((i) => !ids.has(i.id) && !deckStore.wasRemoved(type, i.id))];
      });
      setTotal(data.total);
      if (data.usage) setMe((m) => (m ? { ...m, usage: data.usage } : m));
    } catch (err) {
      if (owner.current !== requestedFor) return;
      if (reset) setError(err);
      fail(err);
    } finally {
      loadingMore.current = false;
      if (reset && owner.current === requestedFor) setLoading(false);
    }
  }, [deckId, mode, sort, filters, type, fail, setMe]);

  useEffect(() => {
    if (owner.current === deckId) return; // montado desde la memoria
    owner.current = deckId;
    const saved = deckStore.get(mode);
    if (saved && saved.key === key) {
      setItems(saved.items);
      setTotal(saved.total);
      setHistory(saved.history);
      setError(null);
      setLoading(false);
      return;
    }
    setItems([]);
    setHistory([]);
    setTotal(null);
    loadingMore.current = false;
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Precarga cuando quedan pocas tarjetas.
  useEffect(() => {
    if (owner.current === deckId && !loading && items.length < 4 && total !== null && total > items.length) load(false);
  }, [items.length, total, loading, load]);

  // Impresión: la tarjeta visible cuenta como visualización.
  const inSync = owner.current === deckId; // falso durante el cuadro en que cambia el modo
  const deck = inSync ? items : [];
  const top = deck[0];
  useEffect(() => {
    if (top) api.post('/views', { targetType: top.type, targetId: top.id }).catch(() => {});
  }, [top?.id, top?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = useCallback(async (action, item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setTotal((t) => (t ? t - 1 : t));
    setCounts((c) => ({ ...c, [mode]: c[mode] ? c[mode] - 1 : c[mode] }));
    if (action !== 'connect') setHistory((h) => [...h.slice(-19), { action, item }]);
    try {
      const res = await api.post('/actions', { targetType: item.type, targetId: item.id, action });
      if (res.usage) setMe((m) => (m ? { ...m, usage: res.usage } : m));
      if (action === 'connect') {
        if (res.status === 'matched' && res.match && !res.already) celebrate(res.match);
        else if (res.already) toast(res.status === 'matched' ? 'Ya tienen un match: escribile desde Matches' : 'Ya le habías enviado interés');
        else {
          const left = res.usage?.connectionsLeft;
          toast(left !== null && left !== undefined && left <= 3 ? `Interés enviado · te quedan ${left} conexiones hoy` : `Interés enviado a ${item.type === 'project' ? item.name : firstName(item.name)}`, { icon: <Heart size={14} /> });
        }
      } else if (action === 'save') {
        toast('Guardado para después', { icon: <Bookmark size={14} /> });
      }
    } catch (err) {
      setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
      setTotal((t) => (t !== null ? t + 1 : t));
      setHistory((h) => h.filter((x) => x.item.id !== item.id));
      fail(err);
    }
  }, [mode, celebrate, fail, setMe, toast]);

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setItems((prev) => [last.item, ...prev.filter((i) => i.id !== last.item.id)]);
    try {
      if (last.action === 'pass') await api.post('/discover/undo', { targetType: last.item.type, targetId: last.item.id });
      else if (last.action === 'save') await api.del(`/saves/${last.item.type}/${last.item.id}`);
    } catch (err) {
      fail(err);
    }
  }, [history, fail]);

  const open = useCallback((item) => navigate(item.type === 'project' ? `/p/${item.id}` : `/u/${item.id}`), [navigate]);
  const trigger = (direction) => topRef.current?.fly(direction);

  // Atajos de teclado en desktop.
  useEffect(() => {
    const onKey = (e) => {
      if (filtersOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('.sheet-layer, .celebration')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); trigger('right'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); trigger('left'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); trigger('up'); }
      else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (e.key === 'Enter' && top) { e.preventDefault(); open(top); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen, undo, open, top]);

  const resetPasses = async () => {
    try {
      await api.post('/me/reset-passes', { type });
      deckStore.set(mode, null);
      setHistory([]);
      await load(true);
      refreshCounts();
    } catch (err) { fail(err); }
  };

  const applyFilters = (next, nextSort) => {
    setAllFilters((all) => ({ ...all, [mode]: next }));
    setSort(nextSort);
  };

  const activeFilters = countFilters(filters) + (sort !== 'compat' ? 1 : 0);
  const next = deck[1];
  const queue = deck.slice(1, 7);
  const canUndo = history.length > 0;
  const modeOptions = [
    { id: 'people', label: 'Personas', icon: <UserRound size={15} />, count: inSync && mode === 'people' && total !== null ? total : counts.people },
    { id: 'projects', label: 'Proyectos', icon: <Layers size={15} />, count: inSync && mode === 'projects' && total !== null ? total : counts.projects }
  ];

  return (
    <div className="discover">
      <TopBar note="Tu próximo gran match empieza acá" />
      <div className="discover-wrap">
        <div className="discover-grid">
          <div className="discover-intro">
            <div className="discover-heading">
              <span className="kicker"><i className="live-pip" /> El comienzo de algo nuevo</span>
              <h1>Tu próximo equipo<br /> <span>empieza acá.</span></h1>
              <p>{mode === 'people' ? 'Personas que también tienen ganas de construir.' : 'Proyectos que buscan a alguien como vos.'}</p>
            </div>
            <SidePanel onFilters={() => setFiltersOpen(true)} />
          </div>

          <section className="deck-column">
            <div className="deck-toolbar">
              <Segmented value={mode} onChange={setMode} options={modeOptions} className="mode-switch" />
              <button type="button" className={cx('filter-btn', activeFilters > 0 && 'is-active')} onClick={() => setFiltersOpen(true)} aria-label="Filtros y orden">
                <SlidersHorizontal size={17} />
                <span className="filter-btn-label">Filtros</span>
                {activeFilters > 0 && <em>{activeFilters}</em>}
              </button>
            </div>

            <div className="deck-stage" ref={stageRef}>
              {loading || !inSync ? (
                <div className="deck-card deck-skeleton"><Skeleton height="58%" radius={0} /><div className="deck-skeleton-body"><Skeleton height={20} width="55%" /><Skeleton height={14} width="80%" /><Skeleton height={48} /><Skeleton height={14} width="40%" /></div></div>
              ) : error ? (
                <div className="deck-empty"><EmptyState icon={<X size={20} />} title="No pudimos cargar las recomendaciones" text={error.message} action={<Button variant="secondary" onClick={() => load(true)}>Reintentar</Button>} /></div>
              ) : !top ? (
                <div className="deck-empty">
                  <EmptyState
                    icon={<Sparkles size={22} />}
                    title={activeFilters ? 'No hay resultados con estos filtros' : 'Viste todo por ahora'}
                    text={activeFilters ? 'Probá ampliar la búsqueda: quitá algún filtro o cambiá el país.' : 'Todos los días se suman personas y proyectos nuevos. Mientras tanto, podés volver a ver los que pasaste.'}
                    action={(
                      <div className="deck-empty-actions">
                        <Button variant="secondary" icon={<SlidersHorizontal size={15} />} onClick={() => setFiltersOpen(true)}>Ajustar filtros</Button>
                        <Button variant="soft" icon={<RotateCcw size={15} />} onClick={resetPasses}>Ver descartados de nuevo</Button>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <>
                  {next && <div className="deck-card is-next" key={`next-${next.type}-${next.id}`} aria-hidden="true"><DeckCardView item={next} /></div>}
                  {!next && <div className="deck-ghost" aria-hidden="true" />}
                  <SwipeCard key={`${top.type}-${top.id}`} ref={topRef} item={top} onDecide={decide} onOpen={open} stageRef={stageRef} />
                </>
              )}
            </div>

            <div className="deck-actions" aria-label="Acciones">
              <div className="deck-action">
                <button type="button" className="round-btn round-undo" onClick={undo} disabled={!canUndo} aria-label="Volver a la anterior"><RotateCcw size={20} /></button>
                <span>Volver</span>
              </div>
              <div className="deck-action">
                <button type="button" className="round-btn round-pass" onClick={() => trigger('left')} disabled={!top} aria-label="Pasar"><X size={26} strokeWidth={2} /></button>
                <span>Pasar</span>
              </div>
              <div className="deck-action">
                <button type="button" className="round-btn round-save" onClick={() => trigger('up')} disabled={!top} aria-label="Guardar"><Bookmark size={20} /></button>
                <span>Guardar</span>
              </div>
              <div className="deck-action">
                <button type="button" className="round-btn round-connect" onClick={() => trigger('right')} disabled={!top} aria-label="Conectar"><Heart size={26} strokeWidth={2} /></button>
                <span>Conectar</span>
              </div>
            </div>
          </section>

          {/* Solo en pantallas anchas: lo que viene en el mazo, para abrir cualquier perfil sin perder el lugar. */}
          <aside className="discover-queue" aria-label="A continuación en tu mazo">
            <div className="side-title"><span>A continuación</span>{total !== null && inSync && <small>{Math.max(0, total - 1)} más</small>}</div>
            {queue.length ? queue.map((item) => (
              <button type="button" key={`${item.type}-${item.id}`} className="queue-row" onClick={() => open(item)}>
                {item.type === 'project' ? <ProjectLogo project={item} size={44} /> : <Avatar person={item} size={44} online={item.online} />}
                <div className="queue-copy"><strong>{item.name}</strong><small>{item.type === 'project' ? item.tagline : item.headline}</small></div>
                {item.match?.score != null && <em>{item.match.score}%</em>}
              </button>
            )) : <p className="queue-empty">{loading ? 'Cargando…' : 'No hay más tarjetas por ahora.'}</p>}
            <p className="queue-tip">Abrí cualquier tarjeta para ver el perfil completo sin perder tu lugar.</p>
          </aside>
        </div>
      </div>

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} mode={mode} value={allFilters[mode] || {}} sort={sort} onApply={applyFilters} />
    </div>
  );
}
