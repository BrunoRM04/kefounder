import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Pause, Plus, Trash2, X } from 'lucide-react';
import { AVAILABILITY, COUNTRIES, INDUSTRIES, PROJECT_COMPENSATION, PROJECT_ROLES, SKILLS, STAGES, WORK_MODES } from '../../shared/catalog.js';
import { ConfirmSheet } from '../components/Sheets.jsx';
import { Page, TopBar } from '../components/Shell.jsx';
import { Button, ChipGroup, Cover, ErrorState, LockedBadge, OptionList, ProjectLogo, Select, Spinner, TagInput, TextArea, TextInput, Toggle } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { hasFeature } from '../lib/plan.js';
import { uploadImage } from '../lib/media.js';
import { useRouter } from '../lib/router.jsx';

const toForm = (p) => ({
  name: p.name, tagline: p.tagline, description: p.description, problem: p.problem, solution: p.solution,
  stage: p.stage, industry: p.industry, city: p.city || '', country: p.country || '', workMode: p.workMode, website: p.website || '',
  cover: p.cover || '', logo: p.logo || '', dedication: p.dedication, compensation: p.compensation,
  rolesNeeded: p.rolesNeeded.map((r) => ({ role: r.role, dedication: r.dedication || '', compensation: r.compensation || '', equity: r.equity || '', note: r.note || '' })),
  stack: p.stack, team: p.team.map((m) => ({ name: m.name, role: m.role })),
  hasUsers: p.hasUsers, hasRevenue: p.hasRevenue, hasInvestment: p.hasInvestment
});

function Section({ title, text, children, aside, order }) {
  return (
    <section className="form-section" style={order ? { order } : undefined}>
      <header>
        <div><h2>{title}</h2>{text && <p>{text}</p>}</div>
        {aside}
      </header>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export default function ProjectEdit({ params }) {
  const { me, fail, toast, setMe } = useApp();
  const { navigate, back, query } = useRouter();
  const id = Number(params.id);
  const [project, setProject] = useState(null);
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState({});
  const coverRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    api.get('/me/projects').then(({ items }) => {
      const p = items.find((x) => x.id === id);
      if (!p) { setError({ status: 404, message: 'No encontramos este proyecto entre los tuyos.' }); return; }
      setProject(p);
      const f = toForm(p);
      setForm(f);
      setInitial(JSON.stringify(f));
    }).catch(setError);
  }, [id]);

  if (error) return <><TopBar back="/proyectos" backLabel="Mis proyectos" title="Editar proyecto" /><ErrorState error={error} /></>;
  if (!form) return <><TopBar back="/proyectos" backLabel="Mis proyectos" title="Editar proyecto" /><Spinner /></>;

  const dirty = JSON.stringify(form) !== initial;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setRole = (i, key, value) => setForm((f) => ({ ...f, rolesNeeded: f.rolesNeeded.map((r, j) => (j === i ? { ...r, [key]: value } : r)) }));
  const setMember = (i, key, value) => setForm((f) => ({ ...f, team: f.team.map((m, j) => (j === i ? { ...m, [key]: value } : m)) }));
  const teamLimited = !hasFeature(me, 'teamProfile');
  const usedRoles = form.rolesNeeded.map((r) => r.role);

  const upload = async (file, key) => {
    if (!file) return;
    setUploading(key);
    try {
      const { url } = await uploadImage(file, key === 'cover' ? 1800 : 500);
      set(key)(url);
    } catch (err) { fail(err); } finally { setUploading(''); }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, rolesNeeded: form.rolesNeeded.filter((r) => r.role), team: form.team.filter((m) => m.name.trim()) };
      const res = await api.put(`/projects/${id}`, payload);
      setProject(res.project);
      const f = toForm(res.project);
      setForm(f);
      setInitial(JSON.stringify(f));
      toast('Cambios guardados', { icon: <Check size={14} /> });
    } catch (err) {
      if (err.data?.field) setErrors({ [err.data.field]: err.message });
      fail(err);
    } finally { setSaving(false); }
  };

  const setStatus = async (action) => {
    try {
      if (dirty) await save();
      const res = await api.post(`/projects/${id}/${action}`);
      setProject(res.project);
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      toast(action === 'publish' ? '¡Proyecto publicado! ✨' : 'Proyecto pausado');
    } catch (err) { fail(err); }
  };

  return (
    <div className="edit-page">
      <TopBar back="/proyectos" backLabel="Mis proyectos" title={`Editar ${project.name}`} actions={<Button size="sm" variant="secondary" onClick={() => navigate(`/p/${id}`)}>Ver ficha</Button>} />
      <Page width="sm" className="page-edit">
        {query.get('nuevo') && (
          <div className="detail-banner edit-welcome">
            <span>✳</span>
            <div><strong>{project.status === 'published' ? '¡Tu proyecto ya está en Descubrir!' : 'Tu proyecto quedó guardado'}</strong><p>Sumá una portada, la solución, el stack y el equipo: las fichas completas reciben más interés.</p></div>
          </div>
        )}

        <div className="edit-overview">
          <div className="edit-status">
            <div>
              <span className="kicker">Visibilidad del proyecto</span>
              <strong>{project.status === 'published' ? 'Publicado · visible en Descubrir' : project.status === 'paused' ? 'Pausado · no aparece en Descubrir' : 'Borrador · solo vos lo ves'}</strong>
            </div>
            {project.status === 'published'
              ? <Button size="sm" variant="secondary" icon={<Pause size={15} />} onClick={() => setStatus('pause')}>Pausar</Button>
              : <Button size="sm" icon={<Check size={15} />} onClick={() => setStatus('publish')}>Publicar</Button>}
          </div>
          <div className="edit-stage">
            <Select label="Etapa del proyecto" value={form.stage} onChange={set('stage')} options={STAGES} />
            <p className="field-hint">De Idea a Inversión. Se muestra en Descubrir y en la ficha; es independiente de la visibilidad.</p>
          </div>
        </div>

        {/* En PC las secciones se reparten en tres columnas parejas; en celular mantienen su orden. */}
        <div className="edit-columns">
          <div className="edit-col">
            <Section order={1} title="Imagen" text="Una portada con personas o producto funciona mejor.">
              <div className="cover-editor">
                <Cover src={form.cover} accent={project.accent} className="cover-editor-img" width={1000}>
                  <button type="button" className="cover-editor-btn" onClick={() => coverRef.current?.click()}>
                    {uploading === 'cover' ? 'Subiendo…' : <><ImagePlus size={16} /> {form.cover ? 'Cambiar portada' : 'Subir portada'}</>}
                  </button>
                </Cover>
                <button type="button" className="logo-editor" onClick={() => logoRef.current?.click()} aria-label="Cambiar logo">
                  <ProjectLogo project={{ ...project, logo: form.logo, name: form.name }} size={72} />
                  <span className="logo-editor-cam">{uploading === 'logo' ? '…' : <Camera size={14} />}</span>
                </button>
                <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], 'cover')} />
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], 'logo')} />
              </div>
              {(form.cover || form.logo) && (
                <div className="photo-picker-actions cover-editor-actions">
                  {form.cover && <button type="button" className="link-btn muted" onClick={() => set('cover')('')}>Quitar portada</button>}
                  {form.logo && <button type="button" className="link-btn muted" onClick={() => set('logo')('')}>Quitar logo</button>}
                </div>
              )}
            </Section>

            <Section order={2} title="Lo básico">
              <TextInput label="Nombre" value={form.name} onChange={set('name')} maxLength={60} error={errors.name} />
              <TextArea label="Descripción corta" value={form.tagline} onChange={set('tagline')} maxLength={140} rows={2} error={errors.tagline} />
              <div className="form-grid cols-2">
                <Select label="Industria" value={form.industry} onChange={set('industry')} options={INDUSTRIES} />
              </div>
              <div className="form-grid cols-2">
                <TextInput label="Ciudad" value={form.city} onChange={set('city')} maxLength={60} />
                <Select label="País" value={form.country} onChange={set('country')} options={COUNTRIES} />
              </div>
              <div className="field">
                <span className="field-label">Modalidad</span>
                <ChipGroup options={WORK_MODES} value={form.workMode} onChange={set('workMode')} />
              </div>
              <TextInput label="Sitio web" optional value={form.website} onChange={set('website')} placeholder="tuproyecto.com" inputMode="url" error={errors.website} />
            </Section>

            <Section order={4} title="Tracción">
              <div className="toggle-list">
                <Toggle label="Tiene usuarios" description="Personas lo usan de forma regular." checked={form.hasUsers} onChange={set('hasUsers')} />
                <Toggle label="Tiene facturación" description="Ya genera ingresos." checked={form.hasRevenue} onChange={set('hasRevenue')} />
                <Toggle label="Tiene inversión" description="Levantó capital." checked={form.hasInvestment} onChange={set('hasInvestment')} />
              </div>
            </Section>
          </div>
          <div className="edit-col">
            <Section order={5} title="A quién buscamos" text="Cada perfil puede tener su propia dedicación y compensación." aside={<span className="field-hint">{form.rolesNeeded.length}/6</span>}>
              {form.rolesNeeded.map((r, i) => (
                <div className="role-editor" key={i}>
                  <div className="role-editor-head">
                    <Select label={`Perfil ${i + 1}`} value={r.role} onChange={(v) => setRole(i, 'role', v)} options={PROJECT_ROLES.filter((p) => p.id === r.role || !usedRoles.includes(p.id))} />
                    <button type="button" className="icon-btn" aria-label="Quitar perfil" onClick={() => setForm((f) => ({ ...f, rolesNeeded: f.rolesNeeded.filter((_, j) => j !== i) }))}><Trash2 size={17} /></button>
                  </div>
                  <div className="form-grid cols-2">
                    <Select label="Dedicación" value={r.dedication} onChange={(v) => setRole(i, 'dedication', v)} options={AVAILABILITY} placeholder="Igual que el proyecto" />
                    <Select label="Compensación" value={r.compensation} onChange={(v) => setRole(i, 'compensation', v)} options={PROJECT_COMPENSATION} placeholder="Igual que el proyecto" />
                  </div>
                  <div className="form-grid cols-2">
                    <TextInput label="Equity" optional value={r.equity} onChange={(v) => setRole(i, 'equity', v)} maxLength={20} placeholder="Ej. 15–25%" />
                    <TextInput label="Nota" optional value={r.note} onChange={(v) => setRole(i, 'note', v)} maxLength={140} placeholder="Qué va a hacer" />
                  </div>
                </div>
              ))}
              {form.rolesNeeded.length < 6 && (
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setForm((f) => ({ ...f, rolesNeeded: [...f.rolesNeeded, { role: '', dedication: '', compensation: '', equity: '', note: '' }] }))}>Agregar perfil</Button>
              )}
              {errors.rolesNeeded && <p className="field-error">{errors.rolesNeeded}</p>}
            </Section>

            <Section order={6} title="Dedicación y compensación general">
              <Select label="Dedicación requerida" value={form.dedication} onChange={set('dedication')} options={AVAILABILITY} />
              <div className="field">
                <span className="field-label">Compensación</span>
                <OptionList columns={2} options={PROJECT_COMPENSATION} value={form.compensation} onChange={set('compensation')} />
              </div>
            </Section>
          </div>
          <div className="edit-col">
            <Section order={3} title="La historia" text="Descripción, problema y solución.">
              <TextArea label="Descripción" optional value={form.description} onChange={set('description')} maxLength={1500} rows={4} placeholder="¿Qué están construyendo y dónde están hoy?" />
              <TextArea label="Problema" value={form.problem} onChange={set('problem')} maxLength={700} rows={3} />
              <TextArea label="Solución" optional value={form.solution} onChange={set('solution')} maxLength={700} rows={3} placeholder="¿Cómo lo resuelven?" />
            </Section>

            <Section order={7} title="Stack">
              <TagInput label="Tecnologías" value={form.stack} onChange={set('stack')} suggestions={SKILLS.slice(0, 16)} max={12} placeholder="React, Node.js, PostgreSQL…" />
            </Section>

            <Section order={8} title="Equipo" text="Vos aparecés como founder. Sumá a quienes ya forman parte." aside={teamLimited ? <LockedBadge plan="startup" /> : null}>
              {form.team.map((m, i) => (
                <div className="member-editor" key={i}>
                  <TextInput label="Nombre" value={m.name} onChange={(v) => setMember(i, 'name', v)} maxLength={60} />
                  <TextInput label="Rol" value={m.role} onChange={(v) => setMember(i, 'role', v)} maxLength={60} placeholder="CTO, Diseño…" />
                  <button type="button" className="icon-btn" aria-label="Quitar integrante" onClick={() => setForm((f) => ({ ...f, team: f.team.filter((_, j) => j !== i) }))}><X size={17} /></button>
                </div>
              ))}
              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setForm((f) => ({ ...f, team: [...f.team, { name: '', role: '' }] }))}>Agregar integrante</Button>
              {teamLimited && <p className="field-hint">Con tu plan podés mostrar hasta 2 integrantes además de vos. El perfil de equipo completo es parte de Startup.</p>}
            </Section>
          </div>
        </div>

        <section className="form-section danger-zone">
          <header><div><h2>Eliminar proyecto</h2><p>Se borran la ficha, las estadísticas y las solicitudes.</p></div></header>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>Eliminar proyecto</Button>
        </section>
      </Page>

      <div className="save-bar">
        <div className="save-bar-inner">
          <span>{dirty ? 'Tenés cambios sin guardar' : 'Todo guardado ✓'}</span>
          <Button variant="secondary" onClick={() => back('/proyectos')}>Volver</Button>
          <Button loading={saving} disabled={!dirty} onClick={save}>Guardar cambios</Button>
        </div>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`¿Eliminar ${project.name}?`}
        text="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          try {
            const res = await api.del(`/projects/${id}`);
            if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
            toast('Proyecto eliminado');
            navigate('/proyectos', { replace: true });
          } catch (err) { fail(err); }
        }}
      />
    </div>
  );
}
