import React, { useState } from 'react';
import { BadgeCheck, Bookmark, BriefcaseBusiness, Check, Github, Globe, Heart, Linkedin, Mail, MapPin, MessageCircle, MoreHorizontal, Send, Share2, ShieldAlert, ThumbsDown, Undo2, UserX } from 'lucide-react';
import { CompatBlock } from '../components/Compat.jsx';
import { PersonRecognitions } from '../components/HelpParts.jsx';
import { ConfirmSheet, NoteSheet, ReportSheet } from '../components/Sheets.jsx';
import { TopBar } from '../components/Shell.jsx';
import { ActionMenu, Button, Cover, ErrorState, IconButton, Pill, ProjectLogo, Skeleton, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { deckStore } from '../lib/deck-store.js';
import { availabilityLabel, compensationLabel, firstName, goalLabel, hostOf, longDate, roleLabel, stageLabel, workModeLabel } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { shareLink } from '../lib/media.js';
import { hasFeature, paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';

export function TrustSignals({ trust }) {
  const items = [
    trust.identity && { icon: <BadgeCheck size={14} />, label: 'Identidad verificada' },
    trust.email && { icon: <Mail size={14} />, label: 'Email verificado' },
    trust.linkedin && { icon: <Linkedin size={14} />, label: 'LinkedIn conectado' },
    trust.github && { icon: <Github size={14} />, label: 'GitHub conectado' },
    trust.complete && { icon: <Check size={14} />, label: 'Perfil completo' }
  ].filter(Boolean);
  if (!items.length) return null;
  return <div className="trust-row">{items.map((i) => <Pill key={i.label} tone="accent" icon={i.icon}>{i.label}</Pill>)}</div>;
}

function DetailSkeleton() {
  return (
    <div className="container container-md detail-wrap">
      <Skeleton height={320} radius={20} />
      <div className="detail-grid">
        <div className="detail-main"><Skeleton height={26} width="50%" /><Skeleton height={16} /><Skeleton height={16} width="80%" /><Skeleton height={90} /></div>
        <div className="detail-aside"><Skeleton height={280} radius={18} /></div>
      </div>
    </div>
  );
}

export default function PersonDetail({ params }) {
  const { me, fail, toast, celebrate, showPaywall, setMe } = useApp();
  const { navigate, back } = useRouter();
  const id = Number(params.id);
  const { data, error, loading, reload, setData } = useLoader(() => api.get(`/users/${id}`), [id]);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState('');

  if (loading) return <><TopBar back="/" /><DetailSkeleton /></>;
  if (error) return <><TopBar back="/" /><ErrorState error={error} onRetry={reload} /></>;

  const { user: person, relationship: rel } = data;
  const self = rel.self;
  const name = firstName(person.name);
  const setRel = (patch) => setData((d) => ({ ...d, relationship: { ...d.relationship, ...patch } }));

  const connect = async (note = '') => {
    setBusy('connect');
    try {
      const res = await api.post('/actions', { targetType: 'person', targetId: id, action: 'connect', note });
      deckStore.remove('person', id);
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      if (res.status === 'matched') { setRel({ matchId: res.match.id, sent: 'accepted' }); celebrate(res.match); }
      else { setRel({ sent: 'pending' }); toast(`Interés enviado a ${name}`, { icon: <Heart size={14} /> }); }
      reload({ silent: true });
    } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const withdraw = async () => {
    setBusy('withdraw');
    try {
      await api.del(`/interests/${rel.sentId}`);
      setRel({ sent: null, sentId: null });
      toast('Retiraste tu interés');
    } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const toggleSave = async () => {
    setBusy('save');
    try {
      if (rel.saved) { await api.del(`/saves/person/${id}`); setRel({ saved: false }); toast('Quitado de guardados'); }
      else { await api.post('/actions', { targetType: 'person', targetId: id, action: 'save' }); deckStore.remove('person', id); setRel({ saved: true }); toast('Guardado para después', { icon: <Bookmark size={14} /> }); }
    } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const respond = async (accept) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      if (accept) {
        const { match } = await api.post(`/interests/${rel.receivedInterest.id}/accept`);
        setRel({ matchId: match.id, receivedInterest: null });
        celebrate(match);
      } else {
        await api.post(`/interests/${rel.receivedInterest.id}/decline`);
        setRel({ receivedInterest: null });
        toast('Solicitud rechazada');
      }
    } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const direct = async (body) => {
    try {
      const { match } = await api.post(`/users/${id}/direct`, { body });
      navigate(`/chat/${match.id}`);
      return true;
    } catch (err) { fail(err); return false; }
  };
  const pass = async () => {
    try { await api.post('/actions', { targetType: 'person', targetId: id, action: 'pass' }); deckStore.remove('person', id); back('/'); } catch (err) { fail(err); }
  };
  const share = async () => {
    const result = await shareLink({ title: `${person.name} en KeFounder!`, text: person.headline, url: `${window.location.origin}/u/${id}` });
    if (result === 'copied') toast('Enlace copiado');
  };

  const directLeft = me.usage?.directLeft;
  const canDirect = directLeft === null || directLeft > 0;
  const menuItems = self ? [] : [
    !rel.matchId && { label: 'Enviar mensaje directo', icon: <Send size={17} />, badge: hasFeature(me, 'priority') ? null : 'Pro', onClick: () => (canDirect ? setSheet('direct') : showPaywall(paywallFor('directMessages', me.plan === 'pro' ? 'startup' : 'pro'))) },
    { label: 'Compartir perfil', icon: <Share2 size={17} />, onClick: share },
    !rel.matchId && !rel.sent && { label: 'No me interesa', icon: <ThumbsDown size={17} />, onClick: pass },
    rel.sentId && { label: 'Retirar mi interés', icon: <Undo2 size={17} />, onClick: withdraw },
    { label: 'Reportar', icon: <ShieldAlert size={17} />, onClick: () => setSheet('report'), danger: true },
    { label: `Bloquear a ${name}`, icon: <UserX size={17} />, onClick: () => setSheet('block'), danger: true }
  ];

  const actions = self ? (
    <Button block size="lg" onClick={() => navigate('/perfil/editar')}>Editar mi perfil</Button>
  ) : rel.matchId ? (
    <Button block size="lg" icon={<MessageCircle size={18} />} onClick={() => navigate(`/chat/${rel.matchId}`)}>Abrir chat</Button>
  ) : rel.receivedInterest ? (
    <div className="detail-actions-row">
      <Button variant="secondary" size="lg" loading={busy === 'decline'} onClick={() => respond(false)}>Rechazar</Button>
      <Button size="lg" icon={<Heart size={18} />} loading={busy === 'accept'} onClick={() => respond(true)}>Aceptar</Button>
    </div>
  ) : (
    <div className="detail-actions-row">
      <IconButton label={rel.saved ? 'Quitar de guardados' : 'Guardar'} className={cx('is-outline save-toggle', rel.saved && 'is-saved')} onClick={toggleSave} disabled={busy === 'save'}>
        <Bookmark size={19} fill={rel.saved ? 'currentColor' : 'none'} />
      </IconButton>
      {rel.sent === 'pending' || rel.sent === 'declined'
        ? <Button size="lg" variant="soft" icon={<Check size={18} />} disabled>Interés enviado</Button>
        : <Button size="lg" icon={<Heart size={18} />} loading={busy === 'connect'} onClick={() => connect()}>Conectar</Button>}
    </div>
  );

  // Intereses, proyectos y links (al final de la columna principal).
  const extras = (
    <>
      {(person.interests.length > 0 || person.languages?.length > 0) && (
        <section className="detail-section">
          <span className="kicker">Intereses e idiomas</span>
          <div className="chip-row">
            {person.interests.map((s) => <Pill key={s} tone="accent">{s}</Pill>)}
            {person.languages?.map((s) => <Pill key={s} tone="muted">{s}</Pill>)}
          </div>
        </section>
      )}

      {person.projects?.length > 0 && (
        <section className="detail-section">
          <span className="kicker">Proyectos</span>
          <div className="mini-projects">
            {person.projects.map((p) => (
              <Link key={p.id} to={`/p/${p.id}`} className="mini-project">
                <ProjectLogo project={p} size={44} />
                <div><strong>{p.name}</strong><span>{p.tagline}</span></div>
                <Pill tone="muted">{stageLabel(p.stage)}</Pill>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(person.links.linkedin || person.links.github || person.links.portfolio) && (
        <section className="detail-section">
          <span className="kicker">Links</span>
          <div className="link-row">
            {person.links.linkedin && <a className="btn btn-secondary btn-sm" href={person.links.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={15} /> LinkedIn</a>}
            {person.links.github && <a className="btn btn-secondary btn-sm" href={person.links.github} target="_blank" rel="noopener noreferrer"><Github size={15} /> GitHub</a>}
            {person.links.portfolio && <a className="btn btn-secondary btn-sm" href={person.links.portfolio} target="_blank" rel="noopener noreferrer"><Globe size={15} /> {hostOf(person.links.portfolio)}</a>}
          </div>
        </section>
      )}
      <p className="detail-meta"><BriefcaseBusiness size={14} /> En KeFounder! desde {longDate(person.memberSince)}</p>
    </>
  );

  const facts = [
    person.availability && { label: 'Disponibilidad', value: availabilityLabel(person.availability, false), icon: '⏳' },
    person.compensation && { label: 'Compensación', value: compensationLabel(person.compensation), icon: '✦' },
    person.workMode && { label: 'Modalidad', value: workModeLabel(person.workMode), icon: '⌖' },
    person.experienceYears !== null && person.experienceYears !== undefined && { label: 'Experiencia', value: `${person.experienceYears} ${person.experienceYears === 1 ? 'año' : 'años'}`, icon: '◷' }
  ].filter(Boolean);

  return (
    <div className="detail">
      <TopBar
        back="/"
        backLabel="Descubrir"
        title={person.name}
        actions={!self && (
          <div className="relative">
            <IconButton label="Más opciones" onClick={() => setMenu(true)}><MoreHorizontal size={20} /></IconButton>
            <ActionMenu open={menu} onClose={() => setMenu(false)} items={menuItems} title={person.name} />
          </div>
        )}
      />
      <div className="container container-md detail-wrap">
        <Cover src={person.photo} accent={person.accent} className="detail-cover detail-cover-person" width={1400}>
          <div className="detail-cover-shade" />
          {person.match && <span className="detail-cover-badge">✳ {person.match.score}% de compatibilidad</span>}
          <div className="detail-cover-title">
            <h1>{person.name}{person.age ? <span>, {person.age}</span> : null}</h1>
            {person.location && <p><MapPin size={15} /> {person.location}</p>}
          </div>
        </Cover>

        {rel.receivedInterest && (
          <div className="detail-banner">
            <Heart size={18} />
            <div><strong>{name} quiere conectar con vos</strong>{rel.receivedInterest.note && <p>“{rel.receivedInterest.note}”</p>}</div>
          </div>
        )}

        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-role">
              <div>
                <span className="kicker">Perfil</span>
                <h2>{person.headline || person.roles.map(roleLabel).join(' · ')}</h2>
              </div>
              <span className={cx('detail-status', person.online && 'is-online')}><i /> {person.online ? 'En línea' : 'Disponible'}</span>
            </div>
            <TrustSignals trust={person.trust} />
            {person.bio && <p className="detail-lead">{person.bio}</p>}

            <section className="detail-section">
              <span className="kicker">Qué busca</span>
              <div className="detail-intent">
                <span>✳</span>
                <div>
                  <strong>{person.lookingFor || goalLabel(person.goal)}</strong>
                  <small>{goalLabel(person.goal)}{person.availability ? ` · ${availabilityLabel(person.availability)}` : ''}{person.compensation ? ` · ${compensationLabel(person.compensation)}` : ''}</small>
                </div>
              </div>
            </section>

            {person.skills.length > 0 && (
              <section className="detail-section">
                <span className="kicker">Skills</span>
                <div className="chip-row">{person.skills.map((s) => <Pill key={s}>{s}</Pill>)}</div>
              </section>
            )}

            <PersonRecognitions userId={id} />

            {person.experience?.length > 0 && (
              <section className="detail-section">
                <span className="kicker">Experiencia</span>
                <ul className="timeline">
                  {person.experience.map((e, i) => (
                    <li key={i}><i /><div><strong>{e.title}</strong><span>{[e.org, e.period].filter(Boolean).join(' · ')}</span></div></li>
                  ))}
                </ul>
              </section>
            )}

            {extras}
          </article>

          <aside className="detail-aside">
            <div className="aside-card">
              <CompatBlock match={person.match} />
              {facts.length > 0 && (
                <dl className="facts">
                  {facts.map((f) => <div key={f.label}><span>{f.icon}</span><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
                </dl>
              )}
              <div className="aside-actions">{actions}</div>
              {!self && !rel.matchId && !rel.sent && !rel.receivedInterest && (
                <button type="button" className="link-btn aside-note" onClick={() => setSheet('note')}>Conectar con una nota</button>
              )}
              {!self && rel.sentId && !rel.matchId && (
                <button type="button" className="link-btn aside-note muted" disabled={busy === 'withdraw'} onClick={withdraw}>Retirar mi interés</button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="detail-bar">{actions}</div>

      <ReportSheet open={sheet === 'report'} onClose={() => setSheet(null)} targetType="person" targetId={id} name={name} />
      <ConfirmSheet
        open={sheet === 'block'}
        onClose={() => setSheet(null)}
        title={`¿Bloquear a ${name}?`}
        text="No van a poder verse en Descubrir ni escribirse. Podés desbloquear desde Ajustes."
        confirmLabel="Bloquear"
        danger
        onConfirm={async () => {
          try { await api.post(`/users/${id}/block`); deckStore.remove('person', id); toast(`Bloqueaste a ${name}`); back('/'); } catch (err) { fail(err); }
        }}
      />
      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} title={`Conectar con ${name}`} subtitle="Una nota corta aumenta las chances de match." placeholder="Ej. Vi que buscás un socio técnico. Tengo experiencia en…" confirmLabel="Enviar interés" onSubmit={(note) => connect(note)} />
      <NoteSheet open={sheet === 'direct'} onClose={() => setSheet(null)} title={`Mensaje directo a ${name}`} subtitle={directLeft === null ? 'Tu plan incluye mensajes sin match ilimitados.' : `Te quedan ${directLeft} mensajes sin match este mes.`} placeholder="Presentate y contá por qué te gustaría conversar." confirmLabel="Enviar mensaje" required maxLength={1000} onSubmit={direct} />
    </div>
  );
}
