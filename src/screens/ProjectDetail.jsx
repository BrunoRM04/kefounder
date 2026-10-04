import React, { useState } from 'react';
import { BarChart3, Bookmark, Check, Globe, Heart, MapPin, MessageCircle, MoreHorizontal, Pencil, Share2, ShieldAlert, ThumbsDown, Undo2, Users } from 'lucide-react';
import { STAGES } from '../../shared/catalog.js';
import { CompatBlock } from '../components/Compat.jsx';
import { NoteSheet, ReportSheet } from '../components/Sheets.jsx';
import { TopBar } from '../components/Shell.jsx';
import { ActionMenu, Avatar, Button, Cover, ErrorState, IconButton, Pill, ProjectLogo, Skeleton, Spinner, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { deckStore } from '../lib/deck-store.js';
import { availabilityLabel, hostOf, initials, projectCompensationLabel, projectRoleLabel, stageLabel, workModeLabel } from '../lib/format.js';
import { useLoader, useMediaQuery } from '../lib/hooks.js';
import { shareLink } from '../lib/media.js';
import { Link, useRouter } from '../lib/router.jsx';
import { Logotipo } from '../components/Brand.jsx';

export function StageTrack({ stage }) {
  const idx = STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="stage-track">
      {STAGES.map((s, i) => (
        <li key={s.id} className={cx(i < idx && 'is-done', i === idx && 'is-current')}>
          <i>{i < idx ? <Check size={11} strokeWidth={3} /> : null}</i>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function ProjectBody({ project }) {
  return (
    <>
      {project.description && <p className="detail-lead">{project.description}</p>}
      {project.problem && (
        <section className="detail-section">
          <span className="kicker">Problema</span>
          <p className="detail-text">{project.problem}</p>
        </section>
      )}
      {project.solution && (
        <section className="detail-section">
          <span className="kicker">Solución</span>
          <p className="detail-text">{project.solution}</p>
        </section>
      )}
      <section className="detail-section">
        <span className="kicker">Etapa del proyecto</span>
        <StageTrack stage={project.stage} />
        {(project.hasUsers || project.hasRevenue || project.hasInvestment) && (
          <div className="chip-row">
            {project.hasUsers && <Pill tone="accent" icon={<Check size={13} />}>Con usuarios</Pill>}
            {project.hasRevenue && <Pill tone="accent" icon={<Check size={13} />}>Con facturación</Pill>}
            {project.hasInvestment && <Pill tone="accent" icon={<Check size={13} />}>Con inversión</Pill>}
          </div>
        )}
      </section>
      {project.rolesNeeded?.length > 0 && (
        <section className="detail-section">
          <span className="kicker">Buscamos</span>
          <div className="role-cards">
            {project.rolesNeeded.map((r) => (
              <div className="role-card" key={r.role}>
                <strong>{projectRoleLabel(r.role)}</strong>
                <span>{[availabilityLabel(r.dedication || project.dedication), projectCompensationLabel(r.compensation || project.compensation)].filter(Boolean).join(' · ')}</span>
                {r.equity && <em>Equity {r.equity}</em>}
                {r.note && <p>{r.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Equipo y stack: en PC van a la columna derecha, en celular al final de la ficha.
function ProjectExtras({ project, linkOwner = true }) {
  const members = [
    project.owner && { name: project.owner.name, role: 'Founder', person: project.owner },
    ...(project.team || []).map((m) => ({ ...m }))
  ].filter(Boolean);
  return (
    <>
      <section className="detail-section">
        <span className="kicker">Equipo · {members.length} {members.length === 1 ? 'persona' : 'personas'}</span>
        <ul className="team-list">
          {members.map((m, i) => {
            const content = (
              <>
                {m.person ? <Avatar person={m.person} size={42} /> : <span className="avatar team-initials" style={{ width: 42, height: 42 }}><span>{initials(m.name)}</span></span>}
                <div><strong>{m.name}</strong><span>{m.role || 'Equipo'}</span></div>
              </>
            );
            return (
              <li key={`${m.name}-${i}`}>
                {m.person && linkOwner ? <Link to={`/u/${m.person.id}`} className="team-member">{content}</Link> : <div className="team-member">{content}</div>}
              </li>
            );
          })}
        </ul>
      </section>
      {project.stack?.length > 0 && (
        <section className="detail-section">
          <span className="kicker">Stack</span>
          <div className="chip-row">{project.stack.map((s) => <Pill key={s}>{s}</Pill>)}</div>
        </section>
      )}
    </>
  );
}

function ProjectHero({ project }) {
  return (
    <Cover src={project.cover} accent={project.accent} className="detail-cover" width={1400}>
      <div className="detail-cover-shade" />
      {project.match?.score != null && <span className="detail-cover-badge">✳ {project.match.score}% de compatibilidad</span>}
      <div className="detail-cover-title detail-cover-project">
        <ProjectLogo project={project} size={64} />
        <div>
          <h1>{project.name}</h1>
          <p>{project.tagline}</p>
        </div>
      </div>
    </Cover>
  );
}

function ProjectMeta({ project }) {
  return (
    <div className="project-meta">
      {project.industry && <Pill tone="accent">{project.industry}</Pill>}
      <Pill>{stageLabel(project.stage)}</Pill>
      <span><MapPin size={14} /> {project.workMode === 'remote' ? 'Remoto' : [project.location, workModeLabel(project.workMode)].filter(Boolean).join(' · ')}</span>
      {project.website && <a href={project.website} target="_blank" rel="noopener noreferrer"><Globe size={14} /> {hostOf(project.website)}</a>}
    </div>
  );
}

export default function ProjectDetail({ params }) {
  const { fail, toast, celebrate, setMe } = useApp();
  const { navigate, back } = useRouter();
  const id = Number(params.id);
  const { data, error, loading, reload, setData } = useLoader(() => api.get(`/projects/${id}`), [id]);
  const wide = useMediaQuery('(min-width: 1100px)');
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState('');

  if (loading) return <><TopBar back="/" /><div className="container container-md detail-wrap"><Skeleton height={320} radius={20} /><Spinner /></div></>;
  if (error) return <><TopBar back="/" /><ErrorState error={error} onRetry={reload} /></>;

  const { project, relationship: rel } = data;
  const setRel = (patch) => setData((d) => ({ ...d, relationship: { ...d.relationship, ...patch } }));

  const connect = async (note = '') => {
    setBusy('connect');
    try {
      const res = await api.post('/actions', { targetType: 'project', targetId: id, action: 'connect', note });
      deckStore.remove('project', id);
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      if (res.status === 'matched') { setRel({ matchId: res.match.id, sent: 'accepted' }); celebrate(res.match); }
      else { setRel({ sent: 'pending' }); toast(`Interés enviado a ${project.name}`, { icon: <Heart size={14} /> }); }
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
      if (rel.saved) { await api.del(`/saves/project/${id}`); setRel({ saved: false }); toast('Quitado de guardados'); }
      else { await api.post('/actions', { targetType: 'project', targetId: id, action: 'save' }); deckStore.remove('project', id); setRel({ saved: true }); toast('Guardado para después', { icon: <Bookmark size={14} /> }); }
    } catch (err) { fail(err); } finally { setBusy(''); }
  };
  const share = async () => {
    const result = await shareLink({ title: `${project.name} en KeFounder!`, text: project.tagline, url: `${window.location.origin}/p/${id}` });
    if (result === 'copied') toast('Enlace copiado para compartir');
  };
  const pass = async () => {
    try { await api.post('/actions', { targetType: 'project', targetId: id, action: 'pass' }); deckStore.remove('project', id); back('/'); } catch (err) { fail(err); }
  };

  const owner = rel.owner;
  const menuItems = [
    { label: 'Compartir proyecto', icon: <Share2 size={17} />, onClick: share },
    !owner && !rel.matchId && !rel.sent && { label: 'No me interesa', icon: <ThumbsDown size={17} />, onClick: pass },
    !owner && rel.sentId && { label: 'Retirar mi interés', icon: <Undo2 size={17} />, onClick: withdraw },
    !owner && { label: 'Reportar proyecto', icon: <ShieldAlert size={17} />, onClick: () => setSheet('report'), danger: true }
  ];

  const actions = owner ? (
    <div className="detail-actions-row">
      <Button variant="secondary" size="lg" icon={<BarChart3 size={17} />} onClick={() => navigate(`/proyectos/${id}/estadisticas`)}>Estadísticas</Button>
      <Button size="lg" icon={<Pencil size={17} />} onClick={() => navigate(`/proyectos/${id}/editar`)}>Editar</Button>
    </div>
  ) : rel.matchId ? (
    <Button block size="lg" icon={<MessageCircle size={18} />} onClick={() => navigate(`/chat/${rel.matchId}`)}>Abrir chat</Button>
  ) : (
    <div className="detail-actions-row">
      <IconButton label={rel.saved ? 'Quitar de guardados' : 'Guardar'} className={cx('is-outline save-toggle', rel.saved && 'is-saved')} onClick={toggleSave} disabled={busy === 'save'}>
        <Bookmark size={19} fill={rel.saved ? 'currentColor' : 'none'} />
      </IconButton>
      {rel.sent
        ? <Button size="lg" variant="soft" icon={<Check size={18} />} disabled>Interés enviado</Button>
        : <Button size="lg" icon={<Heart size={18} />} loading={busy === 'connect'} onClick={() => connect()}>Quiero sumarme</Button>}
    </div>
  );

  const facts = [
    { label: 'Dedicación', value: availabilityLabel(project.dedication, false), icon: '⏳' },
    { label: 'Compensación', value: projectCompensationLabel(project.compensation), icon: '✦' },
    { label: 'Modalidad', value: workModeLabel(project.workMode), icon: '⌖' },
    { label: 'Equipo', value: `${project.teamSize} ${project.teamSize === 1 ? 'persona' : 'personas'}`, icon: <Users size={14} /> }
  ].filter((f) => f.value);

  return (
    <div className="detail">
      <TopBar
        back="/"
        backLabel="Descubrir"
        title={project.name}
        actions={(
          <div className="relative">
            <IconButton label="Más opciones" onClick={() => setMenu(true)}><MoreHorizontal size={20} /></IconButton>
            <ActionMenu open={menu} onClose={() => setMenu(false)} items={menuItems} title={project.name} />
          </div>
        )}
      />
      <div className="container container-md detail-wrap">
        <ProjectHero project={project} />
        {owner && project.status !== 'published' && (
          <div className="detail-banner is-muted"><span>✳</span><div><strong>Este proyecto está {project.status === 'draft' ? 'en borrador' : 'pausado'}</strong><p>Solo vos podés verlo. Publicalo desde Mis proyectos.</p></div></div>
        )}
        <div className="detail-grid">
          <article className="detail-main">
            <ProjectMeta project={project} />
            <ProjectBody project={project} />
            {!wide && <ProjectExtras project={project} />}
          </article>
          <aside className="detail-aside">
            <div className="aside-card">
              {project.match ? <CompatBlock match={project.match} /> : <div className="compat"><span className="kicker">Tu proyecto</span><p className="compat-text">Así lo ve la comunidad en su ficha completa.</p></div>}
              <dl className="facts">
                {facts.map((f) => <div key={f.label}><span>{f.icon}</span><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
              </dl>
              <div className="aside-actions">{actions}</div>
              {!owner && !rel.matchId && !rel.sent && <button type="button" className="link-btn aside-note" onClick={() => setSheet('note')}>Sumarme con una nota</button>}
              {!owner && !rel.matchId && rel.sentId && <button type="button" className="link-btn aside-note muted" disabled={busy === 'withdraw'} onClick={withdraw}>Retirar mi interés</button>}
            </div>
            {project.owner && !owner && (
              <Link to={`/u/${project.owner.id}`} className="aside-owner">
                <Avatar person={project.owner} size={44} online={project.owner.online} />
                <div><span className="kicker">Founder</span><strong>{project.owner.name}</strong><small>{project.owner.headline}</small></div>
              </Link>
            )}
            {wide && <div className="aside-extras"><ProjectExtras project={project} /></div>}
          </aside>
        </div>
      </div>

      <div className="detail-bar">{actions}</div>
      <ReportSheet open={sheet === 'report'} onClose={() => setSheet(null)} targetType="project" targetId={id} name={project.name} />
      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} title={`Sumarme a ${project.name}`} subtitle="Contales en una frase qué podés aportar." placeholder="Ej. Soy backend developer y trabajé 3 años en fintech…" confirmLabel="Enviar interés" onSubmit={(note) => connect(note)} />
    </div>
  );
}

// Página pública para enlaces compartidos (sin sesión).
export function PublicProject({ id }) {
  const { navigate } = useRouter();
  const { data, error, loading } = useLoader(() => api.get(`/public/projects/${id}`), [id]);
  const wide = useMediaQuery('(min-width: 1100px)');
  return (
    <div className="public-page">
      <header className="public-top">
        <span className="wordmark"><Logotipo height={19} /></span>
        <Button size="sm" onClick={() => navigate(`/registro?next=/p/${id}`)}>Unirme gratis</Button>
      </header>
      <div className="container container-md detail-wrap">
        {loading ? <Spinner /> : error ? <ErrorState error={error} /> : (
          <>
            <ProjectHero project={data.project} />
            <div className="detail-grid">
              <article className="detail-main">
                <ProjectMeta project={data.project} />
                <ProjectBody project={data.project} />
                {!wide && <ProjectExtras project={data.project} linkOwner={false} />}
              </article>
              <aside className="detail-aside">
                <div className="aside-card public-cta">
                  <span className="spark">✳</span>
                  <h3>¿Querés sumarte a {data.project.name}?</h3>
                  <p>Creá tu perfil en KeFounder! para conectar con el equipo. Es gratis.</p>
                  <Button block size="lg" onClick={() => navigate(`/registro?next=/p/${id}`)}>Crear mi perfil</Button>
                  <Button block variant="ghost" onClick={() => navigate(`/ingresar?next=/p/${id}`)}>Ya tengo cuenta</Button>
                </div>
                {wide && <div className="aside-extras"><ProjectExtras project={data.project} linkOwner={false} /></div>}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
