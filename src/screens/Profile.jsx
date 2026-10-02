import React from 'react';
import { ArrowRight, BarChart3, Bookmark, Check, Eye, Gem, Github, Globe, Heart, Linkedin, LogOut, MapPin, MessageCircle, Pencil, Settings, UserRound, Newspaper } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { ColumnChart, StatTile, dayData } from '../components/Charts.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, Pill, PlanBadge, Progress, ProjectLogo, Skeleton } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { availabilityLabel, compensationLabel, goalLabel, hostOf, roleLabel, stageLabel, workModeLabel } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { hasFeature } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';
import { TrustSignals } from './PersonDetail.jsx';
import { LockedStats } from './ProjectStats.jsx';

function ProfileStats() {
  const { me } = useApp();
  const allowed = hasFeature(me, 'analytics');
  const { data, loading } = useLoader(() => (allowed ? api.get('/me/stats') : Promise.resolve(null)), [allowed]);
  if (!allowed) return <LockedStats title="Estadísticas de perfil" />;
  if (loading || !data) return <Skeleton height={220} radius={18} />;
  return (
    <div className="me-stats">
      <div className="kpi-row">
        <StatTile icon={<Eye size={14} />} label="Visitas al perfil" value={data.views} />
        <StatTile icon={<Bookmark size={14} />} label="Guardados" value={data.saves} />
        <StatTile icon={<Heart size={14} />} label="Intereses" value={data.interests} />
        <StatTile icon={<MessageCircle size={14} />} label="Matches" value={data.matches} />
      </div>
      <section className="card card-pad chart-card">
        <header className="chart-head"><h2>Visitas por día</h2><span>{data.views7} en los últimos 7 días</span></header>
        <ColumnChart data={dayData(data.byDay, 'views')} valueLabel="visitas" height={160} />
      </section>
    </div>
  );
}

export default function Profile() {
  const { me, logout } = useApp();
  const { navigate } = useRouter();
  const { data: projects } = useLoader(() => api.get('/me/projects'), []);
  const c = me.completeness;
  const plan = PLANS[me.plan];

  return (
    <>
      <TopBar note="Así te ve la comunidad" />
      <Page width="md" className="page-profile">
        {/* En PC: identidad a la izquierda y actividad a la derecha. En celular se apila en el mismo orden de siempre. */}
        <div className="me-layout">
          <div className="me-side">
            <section className="me-card">
              <Avatar person={me} size={104} />
              <div className="me-info">
                <div className="me-badges"><PlanBadge plan={me.plan} />{me.visible ? <Pill tone="accent"><i className="status-dot" /> Perfil visible</Pill> : <Pill tone="muted">Perfil oculto</Pill>}</div>
                <h1>{me.name}{me.showAge && me.age ? <span>, {me.age}</span> : null}</h1>
                <strong>{me.headline || me.roles.map(roleLabel).join(' · ') || 'Contá tu rol principal'}</strong>
                {(me.city || me.country) && <p><MapPin size={14} /> {[me.city, me.country].filter(Boolean).join(', ')}</p>}
              </div>
              <div className="me-actions">
                <Button icon={<Pencil size={16} />} onClick={() => navigate('/perfil/editar')}>Editar perfil</Button>
                <Button variant="secondary" icon={<UserRound size={16} />} onClick={() => navigate(`/u/${me.id}`)}>Ver cómo me ven</Button>
              </div>
            </section>

            <div className="me-grid">
              <section className="card card-pad completeness">
                <div className="completeness-top"><span className="kicker">Perfil completo</span><strong>{c.percent}%</strong></div>
                <Progress value={c.percent} />
                {c.missing.length ? (
                  <ul className="missing-list">
                    {c.missing.slice(0, 4).map((m) => <li key={m.key}><Link to="/perfil/editar">{m.label} <ArrowRight size={14} /></Link></li>)}
                  </ul>
                ) : <p className="completeness-done"><Check size={16} /> ¡Tu perfil está completo! Los perfiles completos reciben más conexiones.</p>}
              </section>

              <section className="card card-pad plan-mini">
                <span className="kicker"><Gem size={13} /> Tu plan</span>
                <h3>{plan.name}</h3>
                <p>{plan.tagline}</p>
                {me.plan === 'free' && me.usage?.connectionsLeft !== null && <p className="plan-mini-usage">{me.usage.connectionsLeft} de 10 conexiones disponibles hoy · {me.usage.saves} de 10 guardados</p>}
                <Button variant={me.plan === 'free' ? 'primary' : 'secondary'} size="sm" onClick={() => navigate('/planes')}>{me.plan === 'free' ? 'Mejorar plan' : 'Gestionar plan'}</Button>
              </section>
            </div>

            <div className="me-links">
              <Link to="/interesados" className="settings-link"><Heart size={18} /> Interesados en vos <ArrowRight size={16} /></Link>
              <Link to="/notificaciones" className="settings-link"><Eye size={18} /> Notificaciones <ArrowRight size={16} /></Link>
              <Link to="/revista" className="settings-link"><Newspaper size={18} /> Revista KeFounder! <ArrowRight size={16} /></Link>
              <Link to="/configuracion" className="settings-link"><Settings size={18} /> Configuración <ArrowRight size={16} /></Link>
              <button type="button" className="settings-link is-danger" onClick={logout}><LogOut size={18} /> Cerrar sesión</button>
            </div>
          </div>

          <div className="me-main">
            <section className="me-activity">
              <div className="section-title"><h2><BarChart3 size={17} /> Tu actividad</h2></div>
              <ProfileStats />
            </section>

            <div className="me-sections">
              <section className="card card-pad">
                <span className="kicker">Sobre mí</span>
                <p className="me-bio">{me.bio || 'Todavía no escribiste tu bio.'}</p>
                <TrustSignals trust={me.trust} />
              </section>
              <section className="card card-pad">
                <span className="kicker">Qué busco</span>
                <dl className="me-facts">
                  <div><dt>Objetivo</dt><dd>{goalLabel(me.goal) || '—'}</dd></div>
                  <div><dt>Busco</dt><dd>{me.lookingFor || '—'}</dd></div>
                  <div><dt>Disponibilidad</dt><dd>{availabilityLabel(me.availability, false) || '—'}</dd></div>
                  <div><dt>Compensación</dt><dd>{compensationLabel(me.compensation) || '—'}</dd></div>
                  <div><dt>Modalidad</dt><dd>{workModeLabel(me.workMode) || '—'}</dd></div>
                </dl>
              </section>
              <section className="card card-pad">
                <span className="kicker">Roles y skills</span>
                <div className="chip-row">
                  {me.roles.map((r) => <Pill key={r} tone="accent">{roleLabel(r)}</Pill>)}
                  {me.skills.map((s) => <Pill key={s}>{s}</Pill>)}
                  {!me.roles.length && !me.skills.length && <span className="muted">Sumá tus skills para aparecer en más búsquedas.</span>}
                </div>
              </section>
              <section className="card card-pad">
                <span className="kicker">Links</span>
                <div className="link-row">
                  {me.links.linkedin && <a className="btn btn-secondary btn-sm" href={me.links.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={15} /> LinkedIn</a>}
                  {me.links.github && <a className="btn btn-secondary btn-sm" href={me.links.github} target="_blank" rel="noopener noreferrer"><Github size={15} /> GitHub</a>}
                  {me.links.portfolio && <a className="btn btn-secondary btn-sm" href={me.links.portfolio} target="_blank" rel="noopener noreferrer"><Globe size={15} /> {hostOf(me.links.portfolio)}</a>}
                  {!me.links.linkedin && !me.links.github && !me.links.portfolio && <Link to="/perfil/editar" className="link-btn">Conectá LinkedIn, GitHub o tu portfolio <ArrowRight size={14} /></Link>}
                </div>
              </section>
            </div>

            <section className="me-projects">
              <div className="section-title"><h2>Mis proyectos</h2><Link to="/proyectos">Ver todos</Link></div>
              <div className="mini-projects">
                {projects?.items?.length ? projects.items.slice(0, 3).map((p) => (
                  <Link key={p.id} to={`/proyectos/${p.id}/editar`} className="mini-project">
                    <ProjectLogo project={p} size={44} />
                    <div><strong>{p.name}</strong><span>{p.tagline}</span></div>
                    <Pill tone={p.status === 'published' ? 'accent' : 'muted'}>{p.status === 'published' ? stageLabel(p.stage) : p.status === 'draft' ? 'Borrador' : 'Pausado'}</Pill>
                  </Link>
                )) : <Link to="/proyectos/nuevo" className="mini-project mini-project-new"><span className="empty-icon">✳</span><div><strong>Creá tu primer proyecto</strong><span>Encontrá a quienes lo pueden construir con vos.</span></div></Link>}
              </div>
            </section>
          </div>
        </div>
      </Page>
    </>
  );
}
