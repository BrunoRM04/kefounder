import React, { useRef, useState } from 'react';
import { Camera, Check, Plus, X } from 'lucide-react';
import { AVAILABILITY, COMPENSATION, COUNTRIES, GOALS, INDUSTRIES, LANGUAGES, ROLES, SKILLS, WORK_MODES } from '../../shared/catalog.js';
import { Page, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, ChipGroup, OptionList, Progress, Select, TagInput, TextArea, TextInput, Toggle } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { uploadImage } from '../lib/media.js';
import { useRouter } from '../lib/router.jsx';

const fromMe = (me) => ({
  name: me.name, headline: me.headline, photo: me.photo, city: me.city, country: me.country, age: me.age ?? '', showAge: me.showAge,
  bio: me.bio, goal: me.goal, lookingFor: me.lookingFor, availability: me.availability, compensation: me.compensation, workMode: me.workMode,
  roles: me.roles, skills: me.skills, interests: me.interests, languages: me.languages,
  experienceYears: me.experienceYears ?? '', experience: me.experience.length ? me.experience : [],
  links: { ...me.links }
});

function Section({ title, text, children, order }) {
  return (
    <section className="form-section" style={order ? { order } : undefined}>
      <header><div><h2>{title}</h2>{text && <p>{text}</p>}</div></header>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export default function ProfileEdit() {
  const { me, setMe, fail, toast } = useApp();
  const { back } = useRouter();
  const [form, setForm] = useState(() => fromMe(me));
  const [initial, setInitial] = useState(() => JSON.stringify(fromMe(me)));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);
  const dirty = JSON.stringify(form) !== initial;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setLink = (key) => (value) => setForm((f) => ({ ...f, links: { ...f.links, [key]: value } }));
  const setExp = (i, key, value) => setForm((f) => ({ ...f, experience: f.experience.map((e, j) => (j === i ? { ...e, [key]: value } : e)) }));

  const onPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try { const { url } = await uploadImage(file, 900); set('photo')(url); } catch (err) { fail(err); } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { user } = await api.put('/me/profile', { ...form, experience: form.experience.filter((e) => e.title.trim()) });
      setMe(user);
      const f = fromMe(user);
      setForm(f);
      setInitial(JSON.stringify(f));
      toast('Perfil actualizado', { icon: <Check size={14} /> });
    } catch (err) {
      if (err.data?.field) setErrors({ [err.data.field]: err.message });
      fail(err);
    } finally { setSaving(false); }
  };

  return (
    <div className="edit-page">
      <TopBar back="/perfil" backLabel="Perfil" title="Editar perfil" />
      <Page width="sm" className="page-edit">
        <div className="edit-progress">
          <div><span className="kicker">Perfil completo</span><strong>{me.completeness.percent}%</strong></div>
          <Progress value={me.completeness.percent} />
          {me.completeness.missing[0] && <small>Siguiente: {me.completeness.missing[0].label.toLowerCase()}</small>}
        </div>

        {/* En PC las secciones se reparten en tres columnas parejas; en celular mantienen su orden. */}
        <div className="edit-columns">
          <div className="edit-col">
            <Section order={1} title="Foto y datos">
              <div className="photo-picker">
                <button type="button" className="photo-picker-btn" onClick={() => fileRef.current?.click()} aria-label="Cambiar foto">
                  <Avatar person={{ ...me, photo: form.photo, name: form.name }} size={96} />
                  <span className="photo-picker-cam">{uploading ? '…' : <Camera size={16} />}</span>
                </button>
                <div>
                  <strong>Foto de perfil</strong>
                  <p>JPG o PNG. La recortamos en círculo.</p>
                  <div className="photo-picker-actions">
                    <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>{form.photo ? 'Cambiar' : 'Subir foto'}</button>
                    {form.photo && <button type="button" className="link-btn muted" onClick={() => set('photo')('')}>Quitar</button>}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              </div>
              <TextInput label="Nombre" value={form.name} onChange={set('name')} maxLength={80} error={errors.name} />
              <TextInput label="Rol principal" value={form.headline} onChange={set('headline')} maxLength={80} placeholder="Ej. Full stack developer" />
              <div className="form-grid cols-2">
                <TextInput label="Ciudad" value={form.city} onChange={set('city')} maxLength={60} />
                <Select label="País" value={form.country} onChange={set('country')} options={COUNTRIES} />
              </div>
              <div className="form-grid cols-2">
                <TextInput label="Edad" optional type="number" min={16} max={99} value={form.age} onChange={set('age')} inputMode="numeric" />
                <div className="field"><span className="field-label">&nbsp;</span><Toggle label="Mostrar mi edad" checked={form.showAge} onChange={set('showAge')} /></div>
              </div>
            </Section>

            <Section order={5} title="Experiencia">
              <TextInput label="Años de experiencia" type="number" min={0} max={60} value={form.experienceYears} onChange={set('experienceYears')} inputMode="numeric" />
              {form.experience.map((e, i) => (
                <div className="exp-editor" key={i}>
                  <TextInput label="Puesto" value={e.title} onChange={(v) => setExp(i, 'title', v)} maxLength={80} />
                  <div className="form-grid cols-2">
                    <TextInput label="Empresa o proyecto" value={e.org} onChange={(v) => setExp(i, 'org', v)} maxLength={80} />
                    <TextInput label="Período" value={e.period} onChange={(v) => setExp(i, 'period', v)} maxLength={40} placeholder="2021 — hoy" />
                  </div>
                  <button type="button" className="icon-btn exp-remove" aria-label="Quitar experiencia" onClick={() => setForm((f) => ({ ...f, experience: f.experience.filter((_, j) => j !== i) }))}><X size={17} /></button>
                </div>
              ))}
              {form.experience.length < 6 && <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setForm((f) => ({ ...f, experience: [...f.experience, { title: '', org: '', period: '' }] }))}>Agregar experiencia</Button>}
            </Section>
          </div>
          <div className="edit-col">
            <Section order={2} title="Sobre vos">
              <TextArea label="Bio" value={form.bio} onChange={set('bio')} maxLength={400} rows={4} placeholder="¿Qué te mueve? ¿Qué querés construir?" />
            </Section>

            <Section order={4} title="Roles y skills">
              <div className="field"><span className="field-label">Roles</span><ChipGroup multiple max={5} options={ROLES} value={form.roles} onChange={set('roles')} /></div>
              <TagInput label="Skills" value={form.skills} onChange={set('skills')} suggestions={SKILLS} max={12} />
              <div className="field"><span className="field-label">Industrias que te interesan</span><ChipGroup multiple max={8} options={INDUSTRIES} value={form.interests} onChange={set('interests')} /></div>
              <div className="field"><span className="field-label">Idiomas</span><ChipGroup multiple options={LANGUAGES} value={form.languages} onChange={set('languages')} /></div>
            </Section>
          </div>
          <div className="edit-col">
            <Section order={3} title="Qué buscás">
              <div className="field"><span className="field-label">Objetivo</span><OptionList options={GOALS} value={form.goal} onChange={set('goal')} /></div>
              <TextInput label="En una frase" value={form.lookingFor} onChange={set('lookingFor')} maxLength={140} placeholder="Ej. Startup SaaS o IA en etapa temprana" />
              <div className="form-grid cols-2">
                <Select label="Disponibilidad" value={form.availability} onChange={set('availability')} options={AVAILABILITY} />
                <Select label="Compensación" value={form.compensation} onChange={set('compensation')} options={COMPENSATION} />
              </div>
              <div className="field"><span className="field-label">Modalidad</span><ChipGroup options={WORK_MODES} value={form.workMode} onChange={(v) => set('workMode')(v || 'remote')} /></div>
            </Section>

            <Section order={6} title="Links" text="Suman señales de confianza a tu perfil.">
              <TextInput label="LinkedIn" optional value={form.links.linkedin} onChange={setLink('linkedin')} placeholder="linkedin.com/in/tu-perfil" error={errors.linkedin} inputMode="url" />
              <TextInput label="GitHub" optional value={form.links.github} onChange={setLink('github')} placeholder="github.com/usuario" error={errors.github} inputMode="url" />
              <TextInput label="Portfolio" optional value={form.links.portfolio} onChange={setLink('portfolio')} placeholder="tusitio.com" error={errors.portfolio} inputMode="url" />
            </Section>
          </div>
        </div>

      </Page>

      <div className="save-bar">
        <div className="save-bar-inner">
          <span>{dirty ? 'Tenés cambios sin guardar' : 'Todo guardado ✓'}</span>
          <Button variant="secondary" onClick={() => back('/perfil')}>Volver</Button>
          <Button loading={saving} disabled={!dirty} onClick={save}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
