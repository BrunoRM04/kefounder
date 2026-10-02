import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Compass, Handshake, Lightbulb, Rocket, Search } from 'lucide-react';
import { AVAILABILITY, COMPENSATION, COUNTRIES, GOALS, ROLES, SKILLS } from '../../shared/catalog.js';
import { Avatar, Button, OptionList, Progress, Select, TagInput, TextArea, TextInput } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { usePersisted } from '../lib/hooks.js';
import { uploadImage } from '../lib/media.js';
import { useRouter } from '../lib/router.jsx';
import { Isotipo, Logotipo } from '../components/Brand.jsx';

const GOAL_ICONS = { create_project: <Lightbulb size={18} />, find_cofounder: <Handshake size={18} />, join_project: <Rocket size={18} />, find_talent: <Search size={18} />, explore: <Compass size={18} /> };

const STEPS = [
  { key: 'goal', title: '¿Qué estás buscando?', text: 'Esto nos ayuda a mostrarte a las personas y proyectos indicados.' },
  { key: 'roles', title: '¿Qué hacés?', text: 'Podés elegir más de uno.' },
  { key: 'availability', title: '¿Cuánto tiempo podés dedicar?', text: 'Siempre lo podés cambiar después.' },
  { key: 'compensation', title: '¿Qué tipo de propuesta te interesa?', text: 'Sin compromiso: es para encontrar a quienes piensan parecido.' },
  { key: 'profile', title: 'Tu perfil rápido', text: 'Lo esencial para que te conozcan. Los links son opcionales.' }
];

export default function Onboarding() {
  const { me, setMe, fail, toast, logout } = useApp();
  const { navigate } = useRouter();
  const [step, setStep] = usePersisted(`kefounder:onboarding-step:${me?.id}`, 0);
  const [form, setForm] = usePersisted(`kefounder:onboarding:${me?.id}`, {
    goal: '', roles: [], availability: '', compensation: '',
    name: me?.name || '', photo: '', headline: '', city: '', country: 'Uruguay', bio: '', skills: [], links: { linkedin: '', github: '', portfolio: '' }
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setLink = (key) => (value) => setForm((f) => ({ ...f, links: { ...f.links, [key]: value } }));
  const current = STEPS[Math.min(step, STEPS.length - 1)];

  const valid = {
    goal: Boolean(form.goal),
    roles: form.roles.length > 0,
    availability: Boolean(form.availability),
    compensation: Boolean(form.compensation),
    profile: form.name.trim().length >= 2
  }[current.key];

  const onPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 900);
      set('photo')(url);
    } catch (error) {
      fail(error);
    } finally {
      setUploading(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { user } = await api.put('/me/onboarding', form);
      try { localStorage.removeItem(`kefounder:onboarding:${me?.id}`); localStorage.removeItem(`kefounder:onboarding-step:${me?.id}`); } catch { /* sin storage */ }
      setMe(user);
      navigate('/', { replace: true });
      toast('¡Listo! Tu perfil está en línea ✨');
    } catch (error) {
      if (error.data?.field) {
        setErrors({ [error.data.field]: error.message });
        const idx = STEPS.findIndex((s) => s.key === error.data.field);
        if (idx >= 0) setStep(idx);
      } else fail(error);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (!valid) return;
    if (step >= STEPS.length - 1) finish();
    else setStep(step + 1);
  };

  return (
    <div className="flow">
      <header className="flow-top">
        {step > 0
          ? <button type="button" className="back-btn" onClick={() => setStep(step - 1)} aria-label="Paso anterior"><ArrowLeft size={20} /></button>
          : <span className="wordmark flow-brand"><Isotipo size={30} label="KeFounder!" /><Logotipo height={18} /></span>}
        <div className="flow-progress">
          <Progress value={((step + 1) / STEPS.length) * 100} />
          <span>{step + 1} de {STEPS.length}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
      </header>

      <main className="flow-main" key={current.key}>
        <div className="flow-head">
          <span className="kicker">Paso {step + 1}</span>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
        </div>

        {current.key === 'goal' && (
          <OptionList options={GOALS.map((g) => ({ ...g, icon: GOAL_ICONS[g.id] }))} value={form.goal} onChange={(v) => { set('goal')(v); }} />
        )}
        {current.key === 'roles' && (
          <OptionList multiple columns={2} options={ROLES} value={form.roles} onChange={set('roles')} />
        )}
        {current.key === 'availability' && (
          <OptionList options={AVAILABILITY} value={form.availability} onChange={set('availability')} />
        )}
        {current.key === 'compensation' && (
          <OptionList options={COMPENSATION} value={form.compensation} onChange={set('compensation')} />
        )}
        {current.key === 'profile' && (
          <div className="flow-form">
            <div className="photo-picker">
              <button type="button" className="photo-picker-btn" onClick={() => fileRef.current?.click()} aria-label="Elegir foto de perfil">
                <Avatar person={{ name: form.name, photo: form.photo, accent: me?.accent }} size={96} />
                <span className="photo-picker-cam">{uploading ? '…' : <Camera size={16} />}</span>
              </button>
              <div>
                <strong>Foto de perfil</strong>
                <p>Los perfiles con foto reciben muchas más conexiones.</p>
                <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>{form.photo ? 'Cambiar foto' : 'Subir foto'}</button>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
            <TextInput label="Nombre" value={form.name} onChange={set('name')} error={errors.name} maxLength={80} autoComplete="name" />
            <TextInput label="Rol principal" value={form.headline} onChange={set('headline')} placeholder="Ej. Full stack developer, Founder de ContaAI" maxLength={80} />
            <div className="form-grid cols-2">
              <TextInput label="Ciudad" value={form.city} onChange={set('city')} placeholder="Montevideo" maxLength={60} autoComplete="address-level2" />
              <Select label="País" value={form.country} onChange={set('country')} options={COUNTRIES} />
            </div>
            <TextArea label="Bio corta" value={form.bio} onChange={set('bio')} maxLength={400} rows={3} placeholder="¿Qué te mueve? ¿Qué querés construir?" />
            <TagInput label="Skills" value={form.skills} onChange={set('skills')} suggestions={SKILLS} max={12} placeholder="React, Figma, Ventas B2B…" />
            <div className="form-grid">
              <TextInput label="LinkedIn" optional value={form.links.linkedin} onChange={setLink('linkedin')} placeholder="linkedin.com/in/tu-perfil" error={errors.linkedin} inputMode="url" />
              <div className="form-grid cols-2">
                <TextInput label="GitHub" optional value={form.links.github} onChange={setLink('github')} placeholder="github.com/usuario" error={errors.github} inputMode="url" />
                <TextInput label="Portfolio" optional value={form.links.portfolio} onChange={setLink('portfolio')} placeholder="tusitio.com" error={errors.portfolio} inputMode="url" />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="flow-foot">
        <Button size="lg" block disabled={!valid} loading={saving} onClick={nextStep} iconRight={<ArrowRight size={18} />}>
          {step >= STEPS.length - 1 ? 'Empezar a descubrir' : 'Continuar'}
        </Button>
      </footer>
    </div>
  );
}
