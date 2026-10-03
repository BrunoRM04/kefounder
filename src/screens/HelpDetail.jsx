import React, { useState } from 'react';
import { CircleCheck, Lock, MoreHorizontal, Pencil, RotateCcw, Send, ShieldAlert, ThumbsUp, Trash2, Undo2 } from 'lucide-react';
import { HELP_POINTS } from '../../shared/catalog.js';
import { PlaceTag, PointsRules } from '../components/HelpParts.jsx';
import { ConfirmSheet, ReportSheet } from '../components/Sheets.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { ActionMenu, Avatar, Button, ErrorState, IconButton, Pill, Skeleton, TextArea, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { firstName, splitLinks, timeAgo } from '../lib/format.js';
import { useLoader, useMediaQuery } from '../lib/hooks.js';
import { Link, useRouter } from '../lib/router.jsx';
import { AskSheet, HelpStatus, RankingPeek } from './Help.jsx';

// Texto con saltos de línea y enlaces seguros (solo http/https).
function Rich({ text }) {
  return (
    <div className="help-text">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {splitLinks(para).map((part, j) => (part.type === 'link'
            ? <a key={j} href={part.value} target="_blank" rel="noopener noreferrer nofollow">{part.value}</a>
            : <React.Fragment key={j}>{part.value}</React.Fragment>))}
        </p>
      ))}
    </div>
  );
}

function Byline({ person, mine, at, edited }) {
  if (!person) return null;
  return (
    <div className="help-byline">
      <Avatar person={person} size={34} />
      <span className="help-byline-copy">
        <span className="help-byline-name">
          {mine ? <strong>Vos</strong> : person.visible ? <Link to={`/u/${person.id}`}>{person.name}</Link> : <span>{person.name}</span>}
          <PlaceTag place={person.place} />
        </span>
        <small>{person.headline ? `${person.headline} · ` : ''}{timeAgo(at)}{edited ? ' · editado' : ''}</small>
      </span>
    </div>
  );
}

function AnswerCard({ answer, viewer, onAction, onReport }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer.body);
  const [busy, setBusy] = useState('');
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };
  const items = answer.mine
    ? [!answer.accepted && { label: 'Editar', icon: <Pencil size={17} />, onClick: () => { setDraft(answer.body); setEditing(true); } },
      !answer.accepted && { label: 'Borrar mi solución', icon: <Trash2 size={17} />, danger: true, onClick: () => onAction('delete', answer) }]
    : [{ label: 'Reportar', icon: <ShieldAlert size={17} />, danger: true, onClick: () => onReport(answer) }];
  const hasMenu = items.some(Boolean);

  return (
    <article className={cx('help-answer', answer.accepted && 'is-accepted', answer.hidden && 'is-hidden')}>
      {answer.accepted && <div className="help-answer-badge"><CircleCheck size={15} /> Solución elegida</div>}
      <header className="help-answer-head">
        <Byline person={answer.author} mine={answer.mine} at={answer.createdAt} edited={Boolean(answer.editedAt)} />
        {hasMenu && (
          <div className="relative">
            <IconButton label="Opciones de la solución" onClick={() => setMenu(true)}><MoreHorizontal size={19} /></IconButton>
            <ActionMenu open={menu} onClose={() => setMenu(false)} items={items} title="Solución" />
          </div>
        )}
      </header>
      {answer.hidden && <p className="help-hidden-note"><Lock size={14} /> Oculta por moderación{answer.hiddenReason ? `: ${answer.hiddenReason}` : ''}. Solo la ves vos.</p>}
      {editing ? (
        <div className="help-edit">
          <TextArea value={draft} onChange={setDraft} maxLength={2000} rows={5} aria-label="Editar tu solución" />
          <div className="help-edit-actions">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" loading={busy === 'save'} onClick={() => run('save', async () => { if (await onAction('edit', answer, draft)) setEditing(false); })}>Guardar</Button>
          </div>
        </div>
      ) : <Rich text={answer.body} />}
      {!answer.hidden && (
        <footer className="help-answer-foot">
          {answer.mine ? (
            <span className="help-votes-static"><ThumbsUp size={15} /> {answer.votes} «Me sirvió»</span>
          ) : (
            <button type="button" className={cx('help-vote', answer.voted && 'is-on')} aria-pressed={answer.voted} disabled={busy === 'vote'} onClick={() => run('vote', () => onAction('vote', answer))}>
              <ThumbsUp size={15} fill={answer.voted ? 'currentColor' : 'none'} /> Me sirvió <em>{answer.votes}</em>
            </button>
          )}
          {viewer.canAccept && !answer.accepted && (
            <Button size="sm" variant="soft" icon={<CircleCheck size={15} />} loading={busy === 'accept'} onClick={() => run('accept', () => onAction('accept', answer))}>Elegir esta solución</Button>
          )}
          {viewer.canAccept && answer.accepted && (
            <button type="button" className="link-btn help-undo" disabled={busy === 'undo'} onClick={() => run('undo', () => onAction('undo', answer))}><Undo2 size={14} /> Deshacer la elección</button>
          )}
        </footer>
      )}
    </article>
  );
}

function Composer({ requestId, onPosted }) {
  const { fail } = useApp();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onPosted(await api.post(`/help/${requestId}/answers`, { body: text }));
      setText('');
    } catch (err) {
      if (err.data?.field) setError(err.message);
      else fail(err);
    } finally { setBusy(false); }
  };
  return (
    <section className="card card-pad help-composer" aria-labelledby="help-composer-title">
      <h2 id="help-composer-title">Tu solución</h2>
      <TextArea value={text} onChange={setText} maxLength={2000} rows={5} error={error} placeholder="Contá qué harías vos, qué te funcionó o a quién le preguntarías. Concreto y con ejemplos." aria-label="Tu solución" />
      <div className="help-composer-foot">
        <small>Sumás {HELP_POINTS.answer} puntos por publicar, {HELP_POINTS.helpful} por cada «Me sirvió» y {HELP_POINTS.accepted} si la eligen.</small>
        <Button icon={<Send size={16} />} loading={busy} disabled={text.trim().length < 20} onClick={submit}>Publicar solución</Button>
      </div>
    </section>
  );
}

export default function HelpDetail({ params }) {
  const { fail, toast } = useApp();
  const { navigate } = useRouter();
  const id = Number(params.id);
  const { data, error, loading, reload, setData } = useLoader(() => api.get(`/help/${id}`), [id]);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [reporting, setReporting] = useState(null);
  const wide = useMediaQuery('(min-width: 1000px)');

  if (loading && !data) return <><TopBar back="/ayuda" backLabel="Necesito ayuda" /><Page width="lg"><Skeleton height={220} radius={20} /><Skeleton height={140} radius={18} /></Page></>;
  if (error) return <><TopBar back="/ayuda" backLabel="Necesito ayuda" /><ErrorState error={error} onRetry={reload} /></>;

  const { request: r, answers, viewer } = data;
  const name = r.author ? firstName(r.author.name) : '';
  const update = async (fn, message) => {
    try { setData(await fn()); if (message) toast(message); return true; } catch (err) { fail(err); return false; }
  };
  const onAction = (action, answer, body) => {
    if (action === 'vote') return update(() => api.post(`/help/answers/${answer.id}/vote`));
    if (action === 'accept') return update(() => api.post(`/help/${r.id}/accept`, { answerId: answer.id }), `Elegiste la solución de ${firstName(answer.author?.name || '')}: suma ${HELP_POINTS.accepted} puntos`);
    if (action === 'undo') return update(() => api.post(`/help/${r.id}/accept`, { answerId: null }), 'Deshiciste la elección');
    if (action === 'edit') return update(() => api.put(`/help/answers/${answer.id}`, { body }), 'Solución actualizada');
    if (action === 'delete') { setSheet({ type: 'delete-answer', answer }); return true; }
    return false;
  };
  const menuItems = r.mine
    ? [viewer.canEdit && { label: 'Editar pedido', icon: <Pencil size={17} />, onClick: () => setSheet({ type: 'edit' }) },
      viewer.canClose && { label: 'Cerrar pedido', icon: <Lock size={17} />, onClick: () => update(() => api.post(`/help/${r.id}/status`, { status: 'closed' }), 'Pedido cerrado: ya no recibe soluciones') },
      viewer.canReopen && { label: 'Volver a abrir', icon: <RotateCcw size={17} />, onClick: () => update(() => api.post(`/help/${r.id}/status`, { status: 'open' }), 'Pedido abierto de nuevo') },
      viewer.canDelete && { label: 'Eliminar pedido', icon: <Trash2 size={17} />, danger: true, onClick: () => setSheet({ type: 'delete' }) }]
    : [{ label: 'Reportar pedido', icon: <ShieldAlert size={17} />, danger: true, onClick: () => setReporting({ type: 'help', id: r.id }) }];
  const visible = answers.filter((a) => !a.hidden || a.mine);

  return (
    <>
      <TopBar
        back="/ayuda"
        backLabel="Necesito ayuda"
        title="Pedido de ayuda"
        actions={menuItems.some(Boolean) && (
          <div className="relative">
            <IconButton label="Opciones del pedido" onClick={() => setMenu(true)}><MoreHorizontal size={20} /></IconButton>
            <ActionMenu open={menu} onClose={() => setMenu(false)} items={menuItems} title="Pedido de ayuda" />
          </div>
        )}
      />
      <Page width="lg" className="page-help-detail">
        <div className="help-layout">
          <div className="help-main">
            <article className="help-question">
              <div className="help-card-top">
                <Link to="/ayuda" className="help-cat">{r.categoryLabel}</Link>
                <HelpStatus item={{ ...r, answers: answers.filter((a) => !a.hidden).length }} />
              </div>
              <h1><span className="help-prefix">Necesito ayuda con</span> {r.title}</h1>
              <Byline person={r.author} mine={r.mine} at={r.createdAt} />
              <Rich text={r.body} />
              {r.hidden && <p className="help-hidden-note"><Lock size={14} /> Oculto por moderación{r.hiddenReason ? `: ${r.hiddenReason}` : ''}. Solo lo ves vos.</p>}
            </article>

            {r.mine && r.status === 'open' && !r.hidden && (
              <p className="help-tip">Cuando una solución te sirva, elegila: quien la escribió suma {HELP_POINTS.accepted} puntos y el pedido queda como resuelto.</p>
            )}
            {r.status === 'closed' && <p className="help-tip is-muted">Este pedido está cerrado: ya no recibe soluciones.</p>}
            {!r.mine && r.status === 'solved' && <p className="help-tip">{name} ya eligió una solución. Si tenés otra mirada, igual podés sumar un «Me sirvió» a las que te parezcan útiles.</p>}

            <section className="help-answers" aria-label="Soluciones">
              <div className="section-title"><h2>Soluciones <Pill tone="muted">{visible.length}</Pill></h2></div>
              {visible.length ? visible.map((a) => (
                <AnswerCard key={a.id} answer={a} viewer={viewer} onAction={onAction} onReport={(answer) => setReporting({ type: 'help_answer', id: answer.id })} />
              )) : (
                <div className="help-no-answers">
                  <strong>{r.mine ? 'Todavía nadie respondió' : 'Todavía no hay soluciones'}</strong>
                  <span>{r.mine ? 'Te avisamos apenas llegue la primera.' : `Sé la primera persona en ayudar a ${name}.`}</span>
                </div>
              )}
            </section>

            {viewer.canAnswer && <Composer requestId={r.id} onPosted={(d) => { setData(d); toast('¡Solución publicada! Sumás puntos cuando le sirve a alguien.'); }} />}
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

      <AskSheet open={sheet?.type === 'edit'} onClose={() => setSheet(null)} initial={r} onSaved={(d) => { setData(d); toast('Pedido actualizado'); }} />
      <ConfirmSheet
        open={sheet?.type === 'delete'}
        onClose={() => setSheet(null)}
        title="¿Eliminar este pedido?"
        text="Se borra para siempre. Si ya no necesitás ayuda, también podés cerrarlo."
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          try { await api.del(`/help/${r.id}`); toast('Pedido eliminado'); navigate('/ayuda', { replace: true }); } catch (err) { fail(err); }
        }}
      />
      <ConfirmSheet
        open={sheet?.type === 'delete-answer'}
        onClose={() => setSheet(null)}
        title="¿Borrar tu solución?"
        text="Se borra junto con sus «Me sirvió» y los puntos que sumó esta semana."
        confirmLabel="Borrar"
        danger
        onConfirm={() => update(() => api.del(`/help/answers/${sheet.answer.id}`), 'Solución borrada')}
      />
      <ReportSheet open={Boolean(reporting)} onClose={() => setReporting(null)} targetType={reporting?.type} targetId={reporting?.id} />
    </>
  );
}
