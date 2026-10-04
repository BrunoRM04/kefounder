import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { AVAILABILITY, COUNTRIES, INDUSTRIES, PROJECT_COMPENSATION, PROJECT_ROLES, STAGES, WORK_MODES } from '../../shared/catalog.js';
import { ProjectCardView } from '../components/DeckCard.jsx';
import { Button, ChipGroup, OptionList, Progress, Select, TextArea, TextInput } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { usePersisted } from '../lib/hooks.js';
import { useRouter } from '../lib/router.jsx';

const EMPTY = { name: '', tagline: '', problem: '', stage: '', industry: '', roles: [], workMode: '', city: '', country: '', dedication: '', compensation: '' };

const STEPS = [
  { key: 'name', title: '¿Cómo se llama tu proyecto?', text: 'Puede ser provisorio. Lo cambiás cuando quieras.' },
  { key: 'tagline', title: 'Contalo en una frase', text: 'Es lo primero que van a leer en tu tarjeta.' },
  { key: 'problem', title: '¿Qué problema resuelve?', text: '¿A quién le pasa y por qué importa?' },
  { key: 'stage', title: '¿En qué etapa está?', text: 'Indicá cuánto avanzó tu proyecto. Después podés cambiarlo en Mis proyectos → Editar.' },
  { key: 'roles', title: '¿A quién buscás?', text: 'Elegí uno o varios perfiles.' },
  { key: 'workMode', title: '¿Cómo van a trabajar?', text: 'Elegí la modalidad del proyecto, que puede ser distinta a la tuya.' },
  { key: 'dedication', title: '¿Cuánta dedicación necesitás?', text: 'Una referencia para quienes quieran sumarse.' },
  { key: 'compensation', title: '¿Qué ofrecés?', text: 'Podés ajustarlo por perfil más adelante.' },
  { key: 'publish', title: 'Todo listo para publicar', text: 'Así se va a ver tu proyecto en Descubrir.' }
];

export default function ProjectWizard() {
  const { me, fail, toast, showPaywall, setMe } = useApp();
  const { navigate, back } = useRouter();
  const [form, setForm] = usePersisted(`kefounder:wizard:${me.id}`, { ...EMPTY, city: me.city || '', country: me.country || '' });
  const [step, setStep] = usePersisted(`kefounder:wizard-step:${me.id}`, 0);
  const [saving, setSaving] = useState('');
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const current = STEPS[Math.min(step, STEPS.length - 1)];

  const valid = {
    name: form.name.trim().length >= 2,
    tagline: form.tagline.trim().length >= 8,
    problem: form.problem.trim().length >= 10,
    stage: Boolean(form.stage),
    roles: form.roles.length > 0,
    workMode: Boolean(form.workMode) && (form.workMode === 'remote' || Boolean(form.city?.trim() && form.country)),
    dedication: Boolean(form.dedication),
    compensation: Boolean(form.compensation),
    publish: true
  }[current.key];

  const clear = () => {
    try { localStorage.removeItem(`kefounder:wizard:${me.id}`); localStorage.removeItem(`kefounder:wizard-step:${me.id}`); } catch { /* sin storage */ }
  };

  const save = async (publish) => {
    setSaving(publish ? 'publish' : 'draft');
    try {
      const payload = {
        name: form.name,
        tagline: form.tagline,
        problem: form.problem,
        stage: form.stage,
        industry: form.industry,
        city: form.city || '',
        country: form.country || '',
        dedication: form.dedication,
        compensation: form.compensation,
        rolesNeeded: form.roles.map((role) => ({ role, dedication: form.dedication, compensation: form.compensation })),
        workMode: form.workMode,
        publish
      };
      const res = await api.post('/projects', payload);
      if (res.usage) setMe((m) => ({ ...m, usage: res.usage }));
      clear();
      setForm({ ...EMPTY, city: me.city || '', country: me.country || '' });
      setStep(0);
      navigate(`/proyectos/${res.project.id}/editar?nuevo=1`, { replace: true });
      if (res.publishBlocked) {
        toast('Guardamos tu proyecto como borrador');
        showPaywall(res.publishBlocked);
      } else {
        toast(publish ? '¡Proyecto publicado! Sumá detalles para destacar ✨' : 'Proyecto guardado como borrador');
      }
    } catch (err) {
      fail(err);
    } finally {
      setSaving('');
    }
  };

  const next = () => { if (valid && step < STEPS.length - 1) setStep(step + 1); };
  const preview = {
    type: 'project', id: 0, name: form.name || 'Tu proyecto', tagline: form.tagline, stage: form.stage, industry: form.industry,
    accent: '#D4E0DA', teamSize: 1, rolesNeeded: form.roles.map((role) => ({ role })), dedication: form.dedication, compensation: form.compensation,
    workMode: form.workMode, location: [form.city, form.country].filter(Boolean).join(', '), owner: { id: me.id, name: me.name, photo: me.photo, accent: me.accent }
  };

  return (
    <div className="flow">
      <header className="flow-top">
        {step > 0
          ? <button type="button" className="back-btn" onClick={() => setStep(step - 1)} aria-label="Paso anterior"><ArrowLeft size={20} /></button>
          : <button type="button" className="back-btn" onClick={() => back('/proyectos')} aria-label="Cerrar"><X size={20} /></button>}
        <div className="flow-progress">
          <Progress value={((step + 1) / STEPS.length) * 100} />
          <span>{step + 1} de {STEPS.length}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => back('/proyectos')}>Salir</button>
      </header>

      <main className="flow-main" key={current.key}>
        <div className="flow-head">
          <span className="kicker">{step === STEPS.length - 1 ? 'Último paso' : `Paso ${step + 1}`}</span>
          <h1>{current.title}</h1>
          <p>{current.text}</p>
        </div>

        {current.key === 'name' && (
          <div className="flow-form">
            <TextInput label="Nombre del proyecto" value={form.name} onChange={set('name')} maxLength={60} placeholder="Ej. Nido, ContaAI, Marea…" autoFocus onKeyDown={(e) => e.key === 'Enter' && next()} />
            <Select label="Industria" optional value={form.industry} onChange={set('industry')} options={INDUSTRIES} placeholder="Elegí una industria" />
          </div>
        )}
        {current.key === 'tagline' && (
          <TextArea label="Descripción corta" value={form.tagline} onChange={set('tagline')} maxLength={140} rows={3} placeholder="Ej. Automatización contable con IA para pequeñas empresas." autoFocus hint="Mínimo 8 caracteres. Clara y concreta: qué hacen y para quién." />
        )}
        {current.key === 'problem' && (
          <TextArea label="El problema" value={form.problem} onChange={set('problem')} maxLength={700} rows={5} placeholder="Ej. Las pymes pierden 10 horas por mes cargando facturas y conciliando cuentas." autoFocus />
        )}
        {current.key === 'stage' && <OptionList options={STAGES} value={form.stage} onChange={set('stage')} />}
        {current.key === 'roles' && (
          <div className="flow-form">
            <ChipGroup multiple max={6} options={PROJECT_ROLES} value={form.roles} onChange={set('roles')} />
            <p className="field-hint">{form.roles.length ? `${form.roles.length} ${form.roles.length === 1 ? 'perfil elegido' : 'perfiles elegidos'} · máximo 6` : 'Por ejemplo: CTO y Designer.'}</p>
          </div>
        )}
        {current.key === 'workMode' && (
          <div className="flow-form">
            <OptionList options={WORK_MODES} value={form.workMode || ''} onChange={set('workMode')} />
            {form.workMode && form.workMode !== 'remote' && (
              <div className="form-grid cols-2">
                <TextInput label="Ciudad del proyecto" value={form.city || ''} onChange={set('city')} maxLength={60} placeholder="Montevideo" />
                <Select label="País del proyecto" value={form.country || ''} onChange={set('country')} options={COUNTRIES} placeholder="Elegí un país" />
              </div>
            )}
          </div>
        )}
        {current.key === 'dedication' && <OptionList options={AVAILABILITY} value={form.dedication} onChange={set('dedication')} />}
        {current.key === 'compensation' && <OptionList options={PROJECT_COMPENSATION.map((c) => ({ ...c, hint: { equity: 'Participación en la empresa.', paid: 'Un pago acordado por el trabajo.', mixed: 'Un pago más participación.', talk: 'Lo definen juntos.' }[c.id] }))} value={form.compensation} onChange={set('compensation')} />}
        {current.key === 'publish' && (
          <div className="wizard-preview">
            <div className="wizard-preview-card"><ProjectCardView item={preview} /></div>
            <ul className="wizard-checklist">
              <li><Check size={15} /> Aparece en Descubrir para perfiles compatibles</li>
              <li><Check size={15} /> Recibís solicitudes de quienes quieran sumarse</li>
              <li><Check size={15} /> Después podés sumar portada, solución, stack y equipo</li>
            </ul>
          </div>
        )}
      </main>

      <footer className="flow-foot">
        {current.key === 'publish' ? (
          <div className="flow-foot-row">
            <Button variant="secondary" size="lg" loading={saving === 'draft'} disabled={Boolean(saving)} onClick={() => save(false)}>Guardar borrador</Button>
            <Button size="lg" loading={saving === 'publish'} disabled={Boolean(saving)} onClick={() => save(true)}>Publicar</Button>
          </div>
        ) : (
          <Button size="lg" block disabled={!valid} onClick={next} iconRight={<ArrowRight size={18} />}>Continuar</Button>
        )}
      </footer>
    </div>
  );
}
