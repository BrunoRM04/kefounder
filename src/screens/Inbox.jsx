import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, BriefcaseBusiness, CalendarDays, Check, CheckCheck, Clock, Download, FileText, HeartCrack, Heart, Link2, MapPin, MessageCircle, MoreHorizontal, Paperclip, Pencil, Plus, Search, Send, ShieldAlert, Sparkles, Trash2, UserRound, UserX, Video, X } from 'lucide-react';
import { ConfirmSheet, ReportSheet } from '../components/Sheets.jsx';
import { PageHeading, TopBar } from '../components/Shell.jsx';
import { ActionMenu, Avatar, Button, EmptyState, ErrorState, IconButton, Pill, ProjectLogo, Segmented, Select, Sheet, Skeleton, TextArea, TextInput, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp, useRealtime } from '../lib/app.jsx';
import { clock, dayLabel, fileSize, firstName, hostOf, roleLabel, shortTime, slotLabel, splitLinks, stageLabel, timeAgo } from '../lib/format.js';
import { useMediaQuery } from '../lib/hooks.js';
import { imageSrc, resizeImage } from '../lib/media.js';
import { Link, useRouter } from '../lib/router.jsx';

const STATUS_LABEL = { new: 'Nuevo match', unanswered: 'Sin responder', active: 'Conversación activa', archived: 'Archivado' };

function previewOf(message, meId) {
  if (!message) return 'Escribí el primer mensaje';
  const mine = message.senderId === meId ? 'Vos: ' : '';
  switch (message.kind) {
    case 'system': return '✳ ¡Nuevo match! Escribí el primer mensaje';
    case 'file': return `${mine}📎 ${message.meta?.name || 'Archivo'}`;
    case 'project': return `${mine}Compartió ${message.meta?.name || 'un proyecto'}`;
    case 'meeting': return `${mine}📅 Propuesta de reunión`;
    case 'link': return `${mine}🔗 ${hostOf(message.meta?.url)}`;
    case 'deleted': return `${mine}Mensaje eliminado`;
    default: return `${mine}${message.body}`;
  }
}

// ---------- Lista de conversaciones ----------
function ConversationList({ matches, loading, activeId, onOpen }) {
  const { me, counts } = useApp();
  const { navigate } = useRouter();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [interested, setInterested] = useState(null);
  const [sent, setSent] = useState([]);
  const [showSent, setShowSent] = useState(false);

  useEffect(() => { api.get('/interests/received').then(setInterested).catch(() => {}); }, [counts.interests]);
  useEffect(() => { api.get('/interests/sent').then((d) => setSent(d.items)).catch(() => {}); }, [matches.length]);

  const q = query.trim().toLowerCase();
  const visible = matches.filter((m) => {
    if (q && !`${m.other.name} ${m.other.headline} ${m.project?.name || ''}`.toLowerCase().includes(q)) return false;
    if (tab === 'archived') return m.archived;
    if (m.archived) return false;
    if (tab === 'unanswered') return m.status === 'unanswered';
    if (tab === 'active') return m.status === 'active' || m.status === 'unanswered';
    return true;
  });
  const fresh = matches.filter((m) => m.status === 'new' && !m.archived);
  const conversations = tab === 'all' && !q ? visible.filter((m) => m.status !== 'new') : visible;
  const unansweredCount = matches.filter((m) => m.status === 'unanswered' && !m.archived).length;

  return (
    <div className="conv-pane">
      <div className="conv-head">
        <PageHeading
          kicker={<><MessageCircle size={13} /> Conexiones</>}
          title="Matches"
          text="Personas con ganas de construir algo en común."
          action={<Button variant="secondary" size="sm" icon={<Search size={15} />} onClick={() => navigate('/')}>Descubrir</Button>}
        />

        {counts.interests > 0 && (
          <Link to="/interesados" className="interest-strip">
            <div className="side-stack">
              {interested?.locked
                ? interested.previews.slice(0, 4).map((p, i) => <span key={i} className="ghost-avatar" style={{ background: p.accent }} />)
                : (interested?.items || []).slice(0, 4).map((i) => <Avatar key={i.id} person={i.person} size={32} />)}
            </div>
            <div>
              <strong>{counts.interests === 1 ? '1 persona quiere' : `${counts.interests} personas quieren`} conectar con vos</strong>
              <span>{interested?.locked ? 'Descubrí quiénes son con Plus' : 'Aceptá o rechazá sus solicitudes'}</span>
            </div>
            <Heart size={18} />
          </Link>
        )}

        {tab === 'all' && !q && fresh.length > 0 && (
          <section className="new-matches">
            <div className="section-title compact"><h2>Nuevos matches <Pill tone="accent">{fresh.length}</Pill></h2></div>
            <div className="new-matches-row">
              {fresh.map((m) => (
                <button type="button" key={m.id} className={cx('new-match', m.id === activeId && 'is-active')} onClick={() => onOpen(m.id)}>
                  <Avatar person={m.other} size={62} online={m.other.online} ring />
                  <span>{firstName(m.other.name)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="conv-tools">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            className="conv-tabs"
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'unanswered', label: 'Sin responder', count: unansweredCount || null },
              { id: 'active', label: 'Activos' },
              { id: 'archived', label: 'Archivados' }
            ]}
          />
          <label className="search-field">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar una persona o proyecto" aria-label="Buscar conversaciones" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}
          </label>
        </div>
      </div>

      <div className="conv-list">
        {tab === 'all' && !q && conversations.length > 0 && <div className="section-title compact"><h2>Conversaciones</h2></div>}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div className="conv-row is-skeleton" key={i}><Skeleton width={50} height={50} radius={25} /><div><Skeleton height={14} width="45%" /><Skeleton height={12} width="80%" /></div></div>)
        ) : conversations.length ? (
          conversations.map((m) => (
            <button type="button" key={m.id} className={cx('conv-row', m.id === activeId && 'is-active', m.unread > 0 && 'is-unread')} onClick={() => onOpen(m.id)}>
              <Avatar person={m.other} size={50} online={m.other.online} />
              <div className="conv-copy">
                <div className="conv-line">
                  <strong>{m.other.name}</strong>
                  <time>{shortTime(m.lastMessageAt)}</time>
                </div>
                <span className="conv-sub">{[m.other.headline, m.project?.name || m.otherProject?.name].filter(Boolean).join(' · ')}</span>
                <div className="conv-line">
                  <p>{previewOf(m.lastMessage, me.id)}</p>
                  {m.unread > 0 ? <i className="conv-badge">{m.unread}</i> : m.status === 'unanswered' ? <em className="conv-status">Sin responder</em> : m.origin === 'direct' ? <em className="conv-status">Directo</em> : null}
                </div>
              </div>
            </button>
          ))
        ) : (
          <EmptyState
            compact
            icon={q ? <Search size={20} /> : <MessageCircle size={20} />}
            title={q ? 'No encontramos a nadie con ese nombre' : tab === 'archived' ? 'No tenés conversaciones archivadas' : fresh.length ? 'Todavía no empezaste a conversar' : 'Todavía no tenés matches'}
            text={q ? 'Probá con otra búsqueda.' : fresh.length ? 'Escribile a tus nuevos matches: un mensaje simple alcanza para empezar.' : 'Cuando el interés sea mutuo, la conversación aparece acá.'}
            action={!q && !fresh.length && tab === 'all' ? <Button onClick={() => navigate('/')}>Descubrir personas</Button> : null}
          />
        )}

        {sent.length > 0 && tab === 'all' && !q && (
          <section className="sent-block">
            <button type="button" className="sent-toggle" onClick={() => setShowSent((v) => !v)} aria-expanded={showSent}>
              <span>Intereses enviados</span>
              <Pill tone="gold">{sent.length} pendientes</Pill>
            </button>
            {showSent && sent.map((s) => (
              <Link key={s.id} to={s.project ? `/p/${s.project.id}` : `/u/${s.person.id}`} className="sent-row">
                {s.project ? <ProjectLogo project={s.project} size={40} /> : <Avatar person={s.person} size={40} />}
                <div><strong>{s.project ? s.project.name : s.person.name}</strong><span>{s.project ? `Proyecto de ${s.person.name}` : s.person.headline} · {timeAgo(s.createdAt)}</span></div>
                <Clock size={15} />
              </Link>
            ))}
            {showSent && <Link to="/interesados?tab=sent" className="link-btn sent-manage">Gestionar o retirar solicitudes</Link>}
          </section>
        )}
      </div>
    </div>
  );
}

// ---------- Panel de la otra persona (PC ancha) ----------
function ThreadAside({ match }) {
  const { other } = match;
  const project = match.project || match.otherProject;
  return (
    <aside className="thread-aside" aria-label={`Sobre ${other.name}`}>
      <div className="thread-aside-person">
        <Avatar person={other} size={96} online={other.online} />
        <strong>{other.name}</strong>
        {other.headline && <span>{other.headline}</span>}
        {other.location && <small><MapPin size={13} /> {other.location}</small>}
        <Link to={`/u/${other.id}`} className="btn btn-secondary btn-sm"><UserRound size={15} /> Ver perfil completo</Link>
      </div>
      {other.roles?.length > 0 && (
        <div className="thread-aside-block">
          <span className="kicker">Roles</span>
          <div className="chip-row">{other.roles.map((r) => <Pill key={r} tone="accent">{roleLabel(r)}</Pill>)}</div>
        </div>
      )}
      {project && (
        <div className="thread-aside-block">
          <span className="kicker">{match.project ? 'Hicieron match por' : 'Su proyecto'}</span>
          <Link to={`/p/${project.id}`} className="mini-project">
            <ProjectLogo project={project} size={40} />
            <div><strong>{project.name}</strong><span>{project.tagline}</span></div>
          </Link>
        </div>
      )}
      <dl className="thread-aside-facts">
        <div><dt>{match.origin === 'direct' ? 'Conversación' : 'Match'}</dt><dd>{timeAgo(match.createdAt)}</dd></div>
        <div><dt>Origen</dt><dd>{match.origin === 'direct' ? 'Mensaje sin match' : 'Interés mutuo'}</dd></div>
        <div><dt>Estado</dt><dd>{other.online ? 'En línea' : other.lastActiveAt ? `Activo ${timeAgo(other.lastActiveAt)}` : '—'}</dd></div>
      </dl>
    </aside>
  );
}

// ---------- Mensajes ----------
function MessageBody({ message, mine, onConfirmSlot }) {
  const { kind, meta } = message;
  if (kind === 'deleted') return <p className="msg-deleted">{mine ? 'Eliminaste este mensaje' : 'Mensaje eliminado'}</p>;
  if (kind === 'file') {
    const isImage = /^image\//.test(meta?.mime || '');
    return (
      <div className="msg-attachment">
        {isImage ? (
          <a href={meta.url} target="_blank" rel="noopener noreferrer" className="msg-image"><img src={meta.url} alt={meta.name} loading="lazy" /></a>
        ) : (
          <a href={meta.url} className="msg-file" download>
            <span className="msg-file-icon"><FileText size={18} /></span>
            <span><strong>{meta.name}</strong><small>{fileSize(meta.size)}</small></span>
            <Download size={16} />
          </a>
        )}
        {message.body && <p>{message.body}</p>}
      </div>
    );
  }
  if (kind === 'project') {
    return (
      <Link to={`/p/${meta.projectId}`} className="msg-project">
        <div className="msg-project-cover" style={{ backgroundColor: meta.accent, backgroundImage: meta.cover ? `url("${imageSrc(meta.cover, 600)}")` : undefined }} />
        <div className="msg-project-body">
          <ProjectLogo project={{ name: meta.name, logo: meta.logo, accent: meta.accent }} size={38} />
          <div><strong>{meta.name}</strong><span>{meta.tagline}</span></div>
        </div>
        <div className="msg-project-foot"><Pill tone="muted">{stageLabel(meta.stage)}</Pill><span>Ver proyecto →</span></div>
      </Link>
    );
  }
  if (kind === 'meeting') {
    return (
      <div className="msg-meeting">
        <div className="msg-meeting-head"><span><Video size={17} /></span><div><strong>Propuesta de videollamada</strong><small>{meta.duration || 30} minutos</small></div></div>
        {message.body && <p>{message.body}</p>}
        {meta.slots?.length > 0 && (
          <ul>
            {meta.slots.map((slot) => (
              <li key={slot}>
                <CalendarDays size={15} />
                <span>{slotLabel(slot)}</span>
                {!mine && <button type="button" onClick={() => onConfirmSlot(slot)}>Confirmar</button>}
              </li>
            ))}
          </ul>
        )}
        {meta.link && <a href={meta.link} target="_blank" rel="noopener noreferrer" className="msg-meeting-link"><Link2 size={14} /> Unirse · {hostOf(meta.link)}</a>}
      </div>
    );
  }
  if (kind === 'link') {
    return (
      <div>
        {message.body && <p>{message.body}</p>}
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className="msg-link-card"><Link2 size={16} /><span><strong>{hostOf(meta.url)}</strong><small>{meta.url}</small></span></a>
      </div>
    );
  }
  return (
    <p>
      {splitLinks(message.body).map((part, i) => (part.type === 'link'
        ? <a key={i} href={part.value} target="_blank" rel="noopener noreferrer">{part.value}</a>
        : <React.Fragment key={i}>{part.value}</React.Fragment>))}
    </p>
  );
}

function MeetingSheet({ open, onClose, onSend }) {
  const base = new Date();
  base.setDate(base.getDate() + 1);
  base.setHours(18, 0, 0, 0);
  const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [slots, setSlots] = useState(() => [toLocal(base), '', '']);
  const [link, setLink] = useState('');
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = slots.some(Boolean) || link.trim();
  const send = async () => {
    setLoading(true);
    const ok = await onSend({ kind: 'meeting', body: note.trim(), meta: { slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()), link: link.trim(), duration } });
    setLoading(false);
    if (ok) { onClose(); setNote(''); setLink(''); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Proponer reunión" subtitle="Sugerí hasta tres horarios o compartí tu enlace de agenda." footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!valid} loading={loading} onClick={send}>Enviar propuesta</Button></>}>
      <div className="form-grid">
        {slots.map((slot, i) => (
          <TextInput key={i} type="datetime-local" label={`Opción ${i + 1}`} optional={i > 0} value={slot} onChange={(v) => setSlots((s) => s.map((x, j) => (j === i ? v : x)))} />
        ))}
        <Select label="Duración" value={duration} onChange={setDuration} options={[{ id: '15', label: '15 minutos' }, { id: '30', label: '30 minutos' }, { id: '45', label: '45 minutos' }, { id: '60', label: '1 hora' }]} placeholder="Elegí" />
        <TextInput label="Enlace de videollamada o agenda" optional value={link} onChange={setLink} placeholder="meet.google.com/…, zoom.us/…, calendly.com/…" inputMode="url" />
        <TextArea label="Mensaje" optional value={note} onChange={setNote} maxLength={300} rows={2} placeholder="¿Te sirve alguno de estos horarios?" />
      </div>
    </Sheet>
  );
}

function LinkSheet({ open, onClose, onSend }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const send = async () => {
    setLoading(true);
    const ok = await onSend({ kind: 'link', meta: { url: url.trim(), text: text.trim() } });
    setLoading(false);
    if (ok) { setUrl(''); setText(''); onClose(); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Compartir enlace" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!url.trim()} loading={loading} onClick={send}>Compartir</Button></>}>
      <div className="form-grid">
        <TextInput label="Enlace" value={url} onChange={setUrl} placeholder="https://…" inputMode="url" data-autofocus />
        <TextInput label="Comentario" optional value={text} onChange={setText} maxLength={300} placeholder="Te paso el deck que te comenté" />
      </div>
    </Sheet>
  );
}

function ProjectPickSheet({ open, onClose, onSend }) {
  const { navigate } = useRouter();
  const [items, setItems] = useState(null);
  useEffect(() => { if (open && !items) api.get('/me/projects').then((d) => setItems(d.items)).catch(() => setItems([])); }, [open, items]);
  return (
    <Sheet open={open} onClose={onClose} title="Enviar proyecto" subtitle="Compartí la ficha de uno de tus proyectos." size="sm">
      {!items ? <Skeleton height={64} /> : items.length ? (
        <div className="pick-list">
          {items.map((p) => (
            <button type="button" key={p.id} className="pick-row" onClick={async () => { if (await onSend({ kind: 'project', meta: { projectId: p.id } })) onClose(); }}>
              <ProjectLogo project={p} size={44} />
              <div><strong>{p.name}</strong><span>{p.tagline || 'Sin descripción'}</span></div>
              <Pill tone={p.status === 'published' ? 'accent' : 'muted'}>{p.status === 'published' ? 'Publicado' : p.status === 'draft' ? 'Borrador' : 'Pausado'}</Pill>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState compact icon={<BriefcaseBusiness size={20} />} title="Todavía no tenés proyectos" text="Creá uno para poder compartirlo en tus conversaciones." action={<Button onClick={() => { onClose(); navigate('/proyectos/nuevo'); }}>Crear proyecto</Button>} />
      )}
    </Sheet>
  );
}

const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function ChatThread({ matchId, onBack, onChanged }) {
  const { me, fail, toast, activeChat } = useApp();
  const { navigate } = useRouter();
  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [menu, setMenu] = useState(false);
  const [tools, setTools] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const showAside = useMediaQuery('(min-width: 1400px)');
  const scroller = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const lastTyping = useRef(0);
  const typingTimer = useRef(null);
  const stickToBottom = useRef(true);
  const prependAnchor = useRef(null);

  useEffect(() => {
    activeChat.current = matchId;
    return () => { if (activeChat.current === matchId) activeChat.current = null; };
  }, [matchId, activeChat]);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([api.get(`/matches/${matchId}`), api.get(`/matches/${matchId}/messages`)])
      .then(([m, list]) => {
        if (!alive) return;
        setMatch(m.match);
        // Conserva mensajes que llegaron en vivo mientras se cargaba el historial.
        setMessages((prev) => {
          const ids = new Set(list.items.map((x) => x.id));
          return [...list.items, ...prev.filter((x) => typeof x.id === 'number' && !ids.has(x.id))];
        });
        setHasMore(list.hasMore);
        stickToBottom.current = true;
        onChanged?.({ ...m.match, unread: 0 });
      })
      .catch((err) => alive && setError(err));
    return () => { alive = false; };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantener el scroll abajo al llegar mensajes (o conservar posición al cargar anteriores).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typing]);

  // Las acciones de un mensaje propio aparecen debajo de la burbuja: que queden a la vista.
  useEffect(() => {
    if (selected === null) return;
    scroller.current?.querySelector('.msg.is-selected .msg-actions')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  const onScroll = async () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 60 && hasMore && messages.length && prependAnchor.current === null) {
      const firstId = messages.find((m) => typeof m.id === 'number')?.id;
      prependAnchor.current = el.scrollHeight - el.scrollTop;
      try {
        const older = await api.get(`/matches/${matchId}/messages?before=${firstId}`);
        setHasMore(older.hasMore);
        setMessages((list) => [...older.items.filter((o) => !list.some((m) => m.id === o.id)), ...list]);
      } catch { prependAnchor.current = null; }
    }
  };

  const upsert = useCallback((message) => {
    setMessages((list) => {
      if (list.some((m) => m.id === message.id)) return list;
      const tempIdx = message.senderId === me.id ? list.findIndex((m) => m.pending && m.kind === message.kind && m.body === message.body) : -1;
      if (tempIdx >= 0) { const next = [...list]; next[tempIdx] = message; return next; }
      return [...list, message];
    });
  }, [me.id]);

  useRealtime('message', ({ matchId: id, message }) => {
    if (id !== matchId) return;
    if (message.senderId !== me.id) {
      setTyping(false);
      if (document.visibilityState === 'visible') api.post(`/matches/${matchId}/read`).catch(() => {});
    }
    upsert(message);
  });
  useRealtime('message_updated', ({ matchId: id, message }) => {
    if (id !== matchId) return;
    setMessages((list) => list.map((m) => (m.id === message.id ? message : m)));
  });
  useRealtime('typing', ({ matchId: id, userId }) => {
    if (id !== matchId || userId === me.id) return;
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 3500);
  });
  useRealtime('read', ({ matchId: id, at }) => {
    if (id !== matchId) return;
    setMessages((list) => list.map((m) => (m.senderId === me.id && !m.readAt ? { ...m, readAt: at } : m)));
  });
  useRealtime('match_removed', ({ matchId: id }) => { if (id === matchId) setError({ status: 404, message: 'Esta conversación ya no está disponible.' }); });

  // Después de un corte de conexión se traen los mensajes que faltan.
  useRealtime('reconnected', async () => {
    try {
      const list = await api.get(`/matches/${matchId}/messages`);
      setMessages((prev) => {
        const byId = new Map(prev.filter((x) => typeof x.id === 'number').map((x) => [x.id, x]));
        for (const item of list.items) byId.set(item.id, item);
        const pending = prev.filter((x) => typeof x.id !== 'number');
        return [...[...byId.values()].sort((a, b) => a.id - b.id), ...pending];
      });
    } catch { /* se reintenta en el próximo evento */ }
  });

  // Un chat abierto en otra pestaña se marca como leído al volver a ella.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') api.post(`/matches/${matchId}/read`).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [matchId]);

  const send = useCallback(async (payload) => {
    const temp = { id: `tmp-${Date.now()}`, senderId: me.id, kind: payload.kind, body: payload.body || '', meta: payload.meta || {}, createdAt: new Date().toISOString(), pending: true };
    stickToBottom.current = true;
    if (payload.kind === 'text') setMessages((list) => [...list, temp]);
    try {
      const { message } = await api.post(`/matches/${matchId}/messages`, payload);
      setMessages((list) => {
        const without = list.filter((m) => m.id !== temp.id);
        return without.some((m) => m.id === message.id) ? without : [...without, message];
      });
      return true;
    } catch (err) {
      setMessages((list) => list.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
      fail(err);
      return false;
    }
  }, [matchId, me.id, fail]);

  const replaceMessage = (message) => setMessages((list) => list.map((m) => (m.id === message.id ? message : m)));

  const startEdit = (message) => {
    setSelected(null);
    setEditing(message);
    setDraft(message.body);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };
  const cancelEdit = () => { setEditing(null); setDraft(''); };

  const saveEdit = async (text) => {
    const target = editing;
    setEditing(null);
    setDraft('');
    if (text === target.body) return;
    replaceMessage({ ...target, body: text, meta: { ...target.meta, editedAt: new Date().toISOString() } });
    try {
      const { message } = await api.put(`/matches/${matchId}/messages/${target.id}`, { body: text });
      replaceMessage(message);
    } catch (err) { replaceMessage(target); fail(err); }
  };

  const removeMessage = async (message) => {
    try {
      const { message: updated } = await api.del(`/matches/${matchId}/messages/${message.id}`);
      replaceMessage(updated);
      toast('Mensaje eliminado');
    } catch (err) { fail(err); }
  };

  const sendText = (text = draft) => {
    const clean = text.trim();
    if (!clean) return;
    if (editing) { saveEdit(clean); return; }
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = '';
    send({ kind: 'text', body: clean });
    inputRef.current?.focus();
  };

  const onDraft = (value) => {
    setDraft(value);
    const el = inputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(140, el.scrollHeight)}px`; }
    if (value && Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      api.post(`/matches/${matchId}/typing`).catch(() => {});
    }
  };

  const attach = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('El archivo supera 5 MB.', { tone: 'error' }); return; }
    setUploading(true);
    try {
      const blob = /^image\//.test(file.type) ? await resizeImage(file, 1600) : file;
      const upload = await api.upload(blob, file.name);
      await send({ kind: 'file', meta: { url: upload.url } });
    } catch (err) {
      fail(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const unmatch = async () => {
    try {
      await api.del(`/matches/${matchId}`);
      toast(`Deshiciste el match con ${firstName(match.other.name)}`);
      onChanged?.({ ...match, removed: true });
      onBack();
    } catch (err) { fail(err); }
  };

  const archive = async () => {
    try {
      const { match: updated } = await api.post(`/matches/${matchId}/archive`, { archived: !match.archived });
      setMatch(updated);
      onChanged?.(updated);
      toast(updated.archived ? 'Conversación archivada' : 'Conversación restaurada');
    } catch (err) { fail(err); }
  };

  if (error) {
    return (
      <div className="thread">
        <header className="thread-head"><button type="button" className="back-btn thread-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button></header>
        <ErrorState error={error} />
      </div>
    );
  }
  if (!match) {
    return (
      <div className="thread">
        <header className="thread-head"><Skeleton width={42} height={42} radius={21} /><div style={{ flex: 1 }}><Skeleton height={14} width="40%" /></div></header>
        <div className="thread-scroll"><div className="thread-inner">{[60, 40, 70].map((w, i) => <div key={i} className={cx('msg', i % 2 && 'is-mine')}><Skeleton height={44} width={`${w}%`} radius={16} /></div>)}</div></div>
      </div>
    );
  }

  const other = match.other;
  const name = firstName(other.name);
  const realMessages = messages.filter((m) => m.kind !== 'system');
  const lastMineId = [...messages].reverse().find((m) => m.senderId === me.id)?.id;
  const icebreakers = [
    `¡Hola ${name}! Vi tu perfil y me encantaría saber más de lo que estás construyendo.`,
    match.project ? `¿En qué etapa está ${match.project.name} hoy?` : '¿En qué estás trabajando ahora?',
    '¿Cuánto tiempo por semana le podrías dedicar?',
    '¿Hacemos una videollamada esta semana?'
  ];
  const status = typing ? 'Escribiendo…' : other.online ? 'En línea' : other.lastActiveAt ? `Activo ${timeAgo(other.lastActiveAt)}` : other.headline;

  const menuItems = [
    { label: 'Ver perfil', icon: <UserRound size={17} />, onClick: () => navigate(`/u/${other.id}`) },
    match.project && { label: `Ver ${match.project.name}`, icon: <BriefcaseBusiness size={17} />, onClick: () => navigate(`/p/${match.project.id}`) },
    { label: match.archived ? 'Restaurar conversación' : 'Archivar conversación', icon: match.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />, onClick: archive },
    { label: 'Deshacer match', icon: <HeartCrack size={17} />, onClick: () => setSheet('unmatch'), danger: true },
    { label: 'Reportar', icon: <ShieldAlert size={17} />, onClick: () => setSheet('report'), danger: true },
    { label: `Bloquear a ${name}`, icon: <UserX size={17} />, onClick: () => setSheet('block'), danger: true }
  ];

  // Agrupa mensajes por día y por remitente consecutivo.
  const rows = [];
  let lastDay = '';
  messages.forEach((m, i) => {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) { rows.push({ type: 'day', key: `d-${day}`, label: dayLabel(m.createdAt) }); lastDay = day; }
    const next = messages[i + 1];
    const endsGroup = !next || next.senderId !== m.senderId || next.kind === 'system' || new Date(next.createdAt) - new Date(m.createdAt) > 5 * 60000 || new Date(next.createdAt).toDateString() !== day;
    rows.push({ type: 'msg', key: m.id, message: m, endsGroup });
  });

  const toolItems = [
    { label: 'Adjuntar archivo', icon: <Paperclip size={17} />, onClick: () => fileRef.current?.click() },
    { label: 'Enviar proyecto', icon: <BriefcaseBusiness size={17} />, onClick: () => setSheet('project') },
    { label: 'Proponer reunión', icon: <Video size={17} />, onClick: () => setSheet('meeting') },
    { label: 'Compartir enlace', icon: <Link2 size={17} />, onClick: () => setSheet('link') }
  ];

  return (
    <>
      <div className="thread">
        <header className="thread-head">
          <button type="button" className="back-btn thread-back" onClick={onBack} aria-label="Volver a matches"><ArrowLeft size={20} /></button>
          <Link to={`/u/${other.id}`} className="thread-person">
            <Avatar person={other} size={42} online={other.online} />
            <div>
              <strong>{other.name}</strong>
              <span className={cx(typing && 'is-typing')}>{status}</span>
            </div>
          </Link>
          <Button variant="secondary" size="sm" className="thread-profile" icon={<UserRound size={15} />} onClick={() => navigate(`/u/${other.id}`)}>Ver perfil</Button>
          <div className="relative">
            <IconButton label="Más opciones" onClick={() => setMenu(true)}><MoreHorizontal size={20} /></IconButton>
            <ActionMenu open={menu} onClose={() => setMenu(false)} items={menuItems} title={other.name} />
          </div>
        </header>

        <div className="thread-context">
          <Sparkles size={14} />
          {match.origin === 'direct'
            ? <span>{match.initiatedByMe ? 'Enviaste un mensaje directo' : `${name} te escribió sin match`}</span>
            : match.project
              ? <span>Hicieron match por <Link to={`/p/${match.project.id}`}>{match.project.name}</Link></span>
              : <span>Hicieron match {timeAgo(match.createdAt)}</span>}
          {match.archived && <Pill tone="muted">Archivada</Pill>}
        </div>

        <div className="thread-scroll" ref={scroller} onScroll={onScroll}>
          <div className="thread-inner">
            {hasMore && <div className="thread-more">Cargando mensajes anteriores…</div>}
            {rows.map((row) => {
              if (row.type === 'day') return <div className="thread-day" key={row.key}><span>{row.label}</span></div>;
              const m = row.message;
              if (m.kind === 'system') {
                return (
                  <div className="thread-system" key={row.key}>
                    <div className="thread-system-avatars"><Avatar person={me} size={40} /><Avatar person={other} size={40} /></div>
                    <strong>¡Hicieron match!</strong>
                    <span>{clock(m.createdAt)} · Rompé el hielo con un mensaje simple.</span>
                  </div>
                );
              }
              const mine = m.senderId === me.id;
              const editable = mine && typeof m.id === 'number' && m.kind !== 'deleted';
              const isSelected = selected === m.id;
              return (
                <div key={row.key} className={cx('msg', mine && 'is-mine', row.endsGroup && 'ends-group', m.pending && 'is-pending', m.failed && 'is-failed', `kind-${m.kind}`, isSelected && 'is-selected', editing?.id === m.id && 'is-editing')}>
                  {!mine && <span className="msg-avatar">{row.endsGroup && <Avatar person={other} size={28} />}</span>}
                  <div
                    className="msg-bubble"
                    onClick={editable ? (e) => { if (!e.target.closest('a, button')) setSelected(isSelected ? null : m.id); } : undefined}
                    onContextMenu={editable ? (e) => { e.preventDefault(); setSelected(m.id); } : undefined}
                  >
                    <MessageBody message={m} mine={mine} onConfirmSlot={(slot) => sendText(`✅ Confirmo: ${slotLabel(slot)}`)} />
                    <small className="msg-meta">
                      {m.meta?.editedAt && m.kind !== 'deleted' && <span className="msg-edited">editado</span>}
                      {clock(m.createdAt)}
                      {mine && (m.failed ? <X size={13} /> : m.pending ? <Clock size={12} /> : m.readAt ? <CheckCheck size={14} className="is-read" /> : <Check size={14} />)}
                    </small>
                  </div>
                  {isSelected && (
                    <div className="msg-actions">
                      {m.kind === 'text' && <button type="button" onClick={() => startEdit(m)}><Pencil size={14} /> Editar</button>}
                      <button type="button" className="is-danger" onClick={() => { setSelected(null); setToDelete(m); }}><Trash2 size={14} /> Eliminar</button>
                      <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar"><X size={14} /></button>
                    </div>
                  )}
                  {mine && m.id === lastMineId && m.readAt && realMessages.length > 0 && row.endsGroup && !isSelected && <span className="msg-seen">Visto</span>}
                </div>
              );
            })}
            {typing && (
              <div className="msg ends-group">
                <span className="msg-avatar"><Avatar person={other} size={28} /></span>
                <div className="msg-bubble typing-bubble" aria-label={`${name} está escribiendo`}><i /><i /><i /></div>
              </div>
            )}
            {realMessages.length === 0 && (
              <div className="icebreakers">
                <span className="kicker">Rompé el hielo</span>
                {icebreakers.map((text) => <button type="button" key={text} onClick={() => sendText(text)}>{text}</button>)}
              </div>
            )}
          </div>
        </div>

        <div className="composer-wrap">
          <div className="composer-tools">
            {toolItems.map((t) => <button type="button" key={t.label} onClick={t.onClick}>{t.icon}<span>{t.label}</span></button>)}
          </div>
          {uploading && <div className="upload-chip"><Paperclip size={14} /> Subiendo archivo…</div>}
          {editing && (
            <div className="composer-editing">
              <Pencil size={14} />
              <span>Editando mensaje</span>
              <button type="button" onClick={cancelEdit} aria-label="Cancelar edición"><X size={15} /></button>
            </div>
          )}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); sendText(); }}>
            <div className="relative composer-plus">
              <IconButton label="Adjuntar o compartir" onClick={() => setTools(true)}><Plus size={21} /></IconButton>
              <ActionMenu open={tools} onClose={() => setTools(false)} items={toolItems} title="Compartir" anchor="left" />
            </div>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && editing) { e.preventDefault(); cancelEdit(); }
                else if (e.key === 'Enter' && !e.shiftKey && canHover()) { e.preventDefault(); sendText(); }
              }}
              placeholder={editing ? 'Editá tu mensaje…' : `Escribile a ${name}…`}
              aria-label="Mensaje"
              maxLength={2000}
            />
            <button type="submit" className="composer-send" disabled={!draft.trim()} aria-label={editing ? 'Guardar cambios' : 'Enviar mensaje'}>{editing ? <Check size={18} /> : <Send size={18} />}</button>
          </form>
          <input ref={fileRef} type="file" hidden onChange={(e) => attach(e.target.files?.[0])} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
        </div>

        <MeetingSheet open={sheet === 'meeting'} onClose={() => setSheet(null)} onSend={send} />
        <LinkSheet open={sheet === 'link'} onClose={() => setSheet(null)} onSend={send} />
        <ProjectPickSheet open={sheet === 'project'} onClose={() => setSheet(null)} onSend={send} />
        <ReportSheet open={sheet === 'report'} onClose={() => setSheet(null)} targetType="match" targetId={matchId} name={name} />
        <ConfirmSheet
          open={Boolean(toDelete)}
          onClose={() => setToDelete(null)}
          title="¿Eliminar este mensaje?"
          text={`Se elimina para vos y para ${name}. En la conversación queda la marca «Mensaje eliminado».`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => removeMessage(toDelete)}
        />
        <ConfirmSheet
          open={sheet === 'unmatch'}
          onClose={() => setSheet(null)}
          title={`¿Deshacer el match con ${name}?`}
          text="La conversación se borra para ambos y no van a volver a cruzarse en Descubrir. No se puede deshacer."
          confirmLabel="Deshacer match"
          danger
          onConfirm={unmatch}
        />
        <ConfirmSheet
          open={sheet === 'block'}
          onClose={() => setSheet(null)}
          title={`¿Bloquear a ${name}?`}
          text="La conversación desaparece para ambos y no van a volver a verse en Descubrir."
          confirmLabel="Bloquear"
          danger
          onConfirm={async () => {
            try { await api.post(`/users/${other.id}/block`); toast(`Bloqueaste a ${name}`); onChanged?.({ ...match, removed: true }); onBack(); } catch (err) { fail(err); }
          }}
        />
      </div>
      {showAside && <ThreadAside match={match} />}
    </>
  );
}

// ---------- Pantalla ----------
export default function Inbox({ params }) {
  const { me } = useApp();
  const { navigate, path } = useRouter();
  const wide = useMediaQuery('(min-width: 1000px)');
  const chatId = path.startsWith('/chat/') ? Number(params.id) : null;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => api.get('/matches').then((d) => setMatches(d.items)).catch(() => {}).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  const sortMatches = (list) => [...list].sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));

  useRealtime('message', ({ matchId, message }) => {
    setMatches((list) => {
      const found = list.find((m) => m.id === matchId);
      if (!found) { load(); return list; }
      const mine = message.senderId === me.id;
      const updated = {
        ...found,
        lastMessage: message,
        lastMessageAt: message.createdAt,
        archived: false,
        unread: mine || matchId === chatId ? 0 : found.unread + 1,
        status: mine ? 'active' : 'unanswered'
      };
      return sortMatches(list.map((m) => (m.id === matchId ? updated : m)));
    });
  });
  useRealtime('message_updated', ({ matchId, message }) => setMatches((list) => list.map((m) => (m.id === matchId && m.lastMessage?.id === message.id ? { ...m, lastMessage: message } : m))));
  useRealtime('match', (match) => setMatches((list) => (list.some((m) => m.id === match.id) ? list : sortMatches([match, ...list]))));
  useRealtime('reconnected', () => { load(); });
  useRealtime('match_removed', ({ matchId }) => setMatches((list) => list.filter((m) => m.id !== matchId)));

  const onChanged = useCallback((updated) => {
    setMatches((list) => (updated.removed ? list.filter((m) => m.id !== updated.id) : list.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))));
  }, []);

  const showList = !chatId || wide;
  const open = (id) => navigate(`/chat/${id}`, { keepScroll: true });

  return (
    <div className={cx('inbox', chatId && 'has-chat')}>
      {showList && <TopBar note="Tu próxima conversación puede cambiarlo todo" />}
      <div className="inbox-body">
        {showList && <ConversationList matches={matches} loading={loading} activeId={chatId} onOpen={open} />}
        {chatId
          ? <ChatThread key={chatId} matchId={chatId} onBack={() => navigate('/matches')} onChanged={onChanged} />
          : wide && (
            <div className="thread thread-empty">
              <div className="match-aside-art">
                <span>✳</span>
                <small>Las mejores ideas</small>
                <h3>Empiezan con<br />una buena charla.</h3>
                <p>Elegí una conversación o seguí descubriendo personas para construir.</p>
                <Button variant="secondary" onClick={() => navigate('/')}>Encontrar personas</Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
