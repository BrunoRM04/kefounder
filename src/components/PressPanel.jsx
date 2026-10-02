import React, { useEffect, useState } from 'react';
import { ExternalLink, Lock, Megaphone, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { longDate, timeAgo } from '../lib/format.js';
import { useLoader } from '../lib/hooks.js';
import { paywallFor } from '../lib/plan.js';
import { Link, useRouter } from '../lib/router.jsx';
import { Button, Pill, Select, Sheet, Skeleton, TextArea, TextInput } from './ui.jsx';

const STATUS = {
  pending: { label: 'Pendiente', tone: 'gold' },
  in_progress: { label: 'En preparación', tone: 'accent' },
  published: { label: 'Publicada', tone: 'solid' },
  rejected: { label: 'No publicada', tone: 'warm' },
  canceled: { label: 'Cancelada', tone: 'muted' }
};

function RequestSheet({ open, onClose, projects, allowance, onSent }) {
  const { me, fail } = useApp();
  const { navigate } = useRouter();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const first = projects[0];
    setErrors({});
    setForm({ projectId: first ? String(first.id) : '', pitch: '', spokesperson: me.name, spokespersonRole: me.headline || '', instagram: '', website: first?.website || '', contact: '' });
  }, [open, projects, me.name, me.headline]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const data = await api.post('/me/press', { ...form, projectId: Number(form.projectId) });
      onSent(data);
      onClose();
    } catch (err) {
      if (err.data?.field) setErrors({ [err.data.field]: err.message });
      else fail(err);
    } finally { setBusy(false); }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pedir difusión"
      subtitle={allowance?.detail}
      footer={projects.length > 0 && <Button block loading={busy} icon={<Send size={16} />} onClick={submit}>Enviar pedido</Button>}
    >
      {projects.length === 0 ? (
        <div className="press-empty">
          <p>Para salir en la Revista necesitás un proyecto publicado.</p>
          <Button variant="secondary" onClick={() => { onClose(); navigate('/proyectos/nuevo'); }}>Crear proyecto</Button>
        </div>
      ) : (
        <div className="press-form">
          <Select label="Proyecto" value={form.projectId} onChange={(projectId) => setForm((f) => ({ ...f, projectId, website: f.website || projects.find((p) => String(p.id) === projectId)?.website || '' }))} options={projects.map((p) => ({ id: String(p.id), label: p.name }))} placeholder="Elegí un proyecto" />
          {errors.projectId && <p className="field-error">{errors.projectId}</p>}
          <TextArea
            label="¿Qué querés contar?"
            hint="Qué hacen, en qué etapa están, qué lograron y qué buscan. Con esto escribimos la nota."
            value={form.pitch}
            onChange={set('pitch')}
            maxLength={1200}
            rows={5}
            error={errors.pitch}
            placeholder="Ej.: Ayudamos a los almacenes de barrio a manejar el stock por WhatsApp. Ya lo usan 40 comercios y buscamos alguien de growth…"
          />
          <div className="press-row">
            <TextInput label="Quién habla por la startup" value={form.spokesperson} onChange={set('spokesperson')} maxLength={80} error={errors.spokesperson} />
            <TextInput label="Cargo" optional value={form.spokespersonRole} onChange={set('spokespersonRole')} maxLength={80} placeholder="Founder & CEO" />
          </div>
          <div className="press-row">
            <TextInput label="Instagram de la startup" optional value={form.instagram} onChange={set('instagram')} maxLength={31} error={errors.instagram} placeholder="@tustartup" />
            <TextInput label="Sitio web" optional value={form.website} onChange={set('website')} error={errors.website} placeholder="tustartup.com" />
          </div>
          <TextInput label="WhatsApp o teléfono para coordinar" optional value={form.contact} onChange={set('contact')} maxLength={80} hint="Si no lo ponés, te escribimos por el chat o al email de tu cuenta." />
          <p className="press-note">Las notas de difusión se publican con la marca «Difusión» para que los lectores sepan que son parte de un plan.</p>
        </div>
      )}
    </Sheet>
  );
}

// Tarjeta de Difusión en "Mis proyectos": cupo del plan, pedido y seguimiento.
export default function PressPanel() {
  const { me, fail, toast, showPaywall } = useApp();
  const { navigate } = useRouter();
  const { data, loading, setData } = useLoader(() => api.get('/me/press'), [me.plan]);
  const [open, setOpen] = useState(false);
  const [canceling, setCanceling] = useState(null);

  if (loading && !data) return <Skeleton height={120} radius={20} className="press-skeleton" />;
  if (!data) return null;
  const { allowance, items, projects } = data;

  const cancel = async (item) => {
    setCanceling(item.id);
    try { setData(await api.del(`/me/press/${item.id}`)); toast('Pedido cancelado: el cupo vuelve a estar disponible'); } catch (err) { fail(err); } finally { setCanceling(null); }
  };

  let text;
  let action;
  if (!allowance.enabled) {
    text = `KeFounder! cuenta la historia de tu startup en la Revista y en nuestro Instagram. Pro incluye una mención cada semestre; Startup, una nota propia y una publicación en el feed cada trimestre.`;
    action = <Button size="sm" variant="secondary" icon={<Lock size={14} />} onClick={() => showPaywall(paywallFor('pressMention'))}>Ver planes con difusión</Button>;
  } else if (allowance.available) {
    text = `Tu plan ${allowance.planName} incluye ${allowance.kind === 'nota' ? 'una nota propia en la Revista y una publicación en el feed de nuestro Instagram' : 'una mención en una nota de la Revista y en nuestras historias de Instagram'} cada ${allowance.period}.`;
    action = <Button size="sm" icon={<Send size={15} />} onClick={() => setOpen(true)}>Pedir difusión</Button>;
  } else {
    text = `Ya usaste la difusión de este ${allowance.period}. La próxima se habilita el ${longDate(allowance.nextAt)}.`;
    // Pro ya usó su mención: Startup suma una nota propia por trimestre.
    action = me.plan === 'pro' ? <Button size="sm" variant="secondary" onClick={() => navigate('/planes')}>Ver plan Startup</Button> : null;
  }

  return (
    <section className="press-card" aria-label="Difusión en la Revista e Instagram">
      <div className="press-head">
        <span className="press-icon" aria-hidden="true"><Megaphone size={20} /></span>
        <div className="press-copy">
          <h2>Difusión en la Revista e Instagram {allowance.enabled && <Pill tone="accent">{allowance.label}</Pill>}</h2>
          <p>{text}</p>
        </div>
        {action && <div className="press-action">{action}</div>}
      </div>
      {items.length > 0 && (
        <ul className="press-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="press-item">
                <strong>{item.projectName || 'Proyecto'}</strong>
                <small>{item.kindLabel} · pedida {timeAgo(item.createdAt)}{item.status === 'published' && item.publishedAt ? ` · publicada el ${longDate(item.publishedAt)}` : ''}</small>
                {item.status === 'rejected' && item.response && <small className="press-reason">{item.response}</small>}
              </div>
              <Pill tone={STATUS[item.status]?.tone || 'muted'}>{STATUS[item.status]?.label || item.status}</Pill>
              <div className="press-links">
                {item.article?.public && <Link to={`/revista/${item.article.slug}`} className="link-btn">Ver la nota</Link>}
                {item.instagramUrl && <a href={item.instagramUrl} target="_blank" rel="noopener noreferrer" className="link-btn">Instagram <ExternalLink size={13} /></a>}
                {item.status === 'pending' && <Button size="sm" variant="ghost" loading={canceling === item.id} onClick={() => cancel(item)}>Cancelar</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <RequestSheet open={open} onClose={() => setOpen(false)} projects={projects} allowance={allowance} onSent={(d) => { setData(d); toast('¡Pedido enviado! El equipo de KeFounder! te va a contactar.'); }} />
    </section>
  );
}
