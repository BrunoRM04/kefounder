import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, CalendarClock, Eye, EyeOff, Heading2, ImagePlus, Link2, List, Minus, MoreHorizontal, Quote, Send, Star, Trash2, Upload, X } from 'lucide-react';
import { REVISTA_FORMATS, REVISTA_SECTIONS, isArticleImage, parseArticle, readingMinutes, sectionLabel, slugify, formatLabel } from '../../../shared/revista.js';
import { ColumnChart } from '../../components/Charts.jsx';
import { ActionMenu, Button, IconButton, ProjectLogo, TagInput, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { imageSrc, uploadImage } from '../../lib/media.js';
import { useRouter } from '../../lib/router.jsx';
import { ArticleBody } from '../../revista/ArticleBody.jsx';
import { ActionSheet, Failed, FollowUp, Loading, PageHeader, Panel, Status, Tabs, ago, chartData, dateTime, num, useAdmin } from '../kit.jsx';

const EMPTY = {
  title: '', dek: '', body: '', section: 'entrevistas', format: 'entrevista', slug: '', author: 'Redacción KeFounder!',
  cover: '', coverCredit: '', person: { name: '', role: '', company: '', photo: '' }, projectId: null, project: null, tags: []
};

const fromArticle = (a) => ({
  title: a.title, dek: a.dek, body: a.body, section: a.section, format: a.format, slug: a.slug, author: a.author,
  cover: a.cover, coverCredit: a.coverCredit, person: { ...EMPTY.person, ...a.person }, projectId: a.projectId, project: a.project, tags: a.tags
});

const payloadOf = (f) => ({
  title: f.title.trim(), dek: f.dek.trim(), body: f.body, section: f.section, format: f.format, slug: f.slug.trim(), author: f.author.trim(),
  cover: f.cover, coverCredit: f.coverCredit.trim(), person: { name: f.person.name.trim(), role: f.person.role.trim(), company: f.person.company.trim(), photo: f.person.photo },
  projectId: f.projectId || null, tags: f.tags
});

// Fecha y hora local para <input type="datetime-local">.
const localInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ImageField({ label, value, onChange, round }) {
  const { fail } = useApp();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const file = useRef(null);
  const upload = async (picked) => {
    if (!picked) return;
    setBusy(true);
    try { onChange((await uploadImage(picked, 1800)).url); } catch (err) { fail(err); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const linkOk = !link || isArticleImage(link.trim().split('?')[0]);
  return (
    <div className="adm-image-field">
      <span className="field-label">{label}</span>
      <div className={cx('adm-image-box', round && 'is-round', !value && 'is-empty')}>
        {value ? <img src={imageSrc(value, round ? 200 : 800)} alt="" /> : <ImagePlus size={22} />}
      </div>
      <div className="adm-inline-actions">
        <Button size="sm" variant="secondary" icon={<Upload size={14} />} loading={busy} onClick={() => file.current?.click()}>{value ? 'Cambiar' : 'Subir foto'}</Button>
        {value && <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => onChange('')}>Quitar</Button>}
      </div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
      {!round && (
        <form className="adm-image-link" onSubmit={(e) => { e.preventDefault(); if (link.trim() && linkOk) { onChange(link.trim().split('?')[0]); setLink(''); } }}>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="o pegá un enlace de images.unsplash.com" aria-label={`Enlace de imagen para ${label}`} />
          <Button size="sm" variant="secondary" type="submit" disabled={!link.trim() || !linkOk}>Usar</Button>
        </form>
      )}
      {!linkOk && <span className="field-error">Solo enlaces de images.unsplash.com/photo-…</span>}
    </div>
  );
}

function ProjectPicker({ project, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return undefined; }
    let alive = true;
    const t = window.setTimeout(() => api.get(`/admin/search?q=${encodeURIComponent(q.trim())}`).then((r) => alive && setResults(r.projects)).catch(() => {}), 220);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q]);
  if (project) {
    return (
      <div className="adm-picked">
        <ProjectLogo project={project} size={32} />
        <span className="adm-li-copy"><strong>{project.name}</strong><small>{project.status === 'published' && project.moderation !== 'hidden' ? 'Se muestra al final de la nota' : 'No se muestra hasta que esté publicado y visible'}</small></span>
        <IconButton label="Quitar proyecto" onClick={() => onChange(null)}><X size={16} /></IconButton>
      </div>
    );
  }
  return (
    <div className="adm-project-search">
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un proyecto de KeFounder!" aria-label="Buscar proyecto para vincular" />
      {results.length > 0 && (
        <ul>
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onChange(p); setQ(''); }}>
                <ProjectLogo project={p} size={26} />
                <span className="adm-li-copy"><strong>{p.name}</strong><small>de {p.owner}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const HELP = [
  ['Párrafo', 'Texto normal. Dejá una línea en blanco entre párrafos.'],
  ['## Subtítulo', 'Título intermedio.'],
  ['P: … / R: …', 'Pregunta y respuesta de una entrevista.'],
  ['> Frase', 'Cita destacada. Una línea "> — Nombre" la firma.'],
  ['- Ítem', 'Lista con viñetas.'],
  ['**texto**', 'Negrita. *texto* es cursiva.'],
  ['[texto](https://…)', 'Enlace.'],
  ['![Epígrafe](imagen)', 'Imagen dentro de la nota (usá el botón Imagen).'],
  ['---', 'Separador.']
];

export default function ArticleEditor({ params }) {
  const { toast, fail } = useApp();
  const { refreshBadges } = useAdmin();
  const { navigate, setLeaveGuard } = useRouter();
  const isNew = !params.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(JSON.stringify(payloadOf(EMPTY)));
  const [tab, setTab] = useState('write');
  const [busy, setBusy] = useState('');
  const [sheet, setSheet] = useState(null);
  const [menu, setMenu] = useState(false);
  const [when, setWhen] = useState({ mode: 'now', at: '' });
  const [imageBusy, setImageBusy] = useState(false);
  const text = useRef(null);
  const bodyImage = useRef(null);

  // Lo último escrito, para que las respuestas del servidor nunca pisen cambios sin guardar.
  const formRef = useRef(form);
  formRef.current = form;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const isDirty = () => JSON.stringify(payloadOf(formRef.current)) !== savedRef.current;

  // sent: lo que se acaba de guardar. Si mientras tanto se siguió escribiendo, el formulario se conserva.
  const apply = useCallback((d, sent) => {
    setData(d);
    const fresh = fromArticle(d.article);
    if (sent) {
      setSaved(JSON.stringify(sent));
      if (JSON.stringify(payloadOf(formRef.current)) === JSON.stringify(sent)) setForm(fresh);
      return;
    }
    if (JSON.stringify(payloadOf(formRef.current)) !== savedRef.current) return; // hay cambios: solo se actualizan los datos
    setForm(fresh);
    setSaved(JSON.stringify(payloadOf(fresh)));
  }, []);
  const load = useCallback(async () => {
    try { apply(await api.get(`/admin/articles/${params.id}`)); } catch (err) { setError(err); }
  }, [apply, params.id]);
  useEffect(() => { if (!isNew) load(); }, [isNew, load]);

  const dirty = JSON.stringify(payloadOf(form)) !== saved;
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  // Salir de la nota desde el panel (menú, búsqueda, volver) también pide confirmación.
  useEffect(() => {
    setLeaveGuard(() => !isDirty() || window.confirm('Tenés cambios sin guardar en esta nota. ¿Salir sin guardarlos?'));
    return () => setLeaveGuard(null);
  }, [setLeaveGuard]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = useMemo(() => parseArticle(form.body), [form.body]);
  const words = useMemo(() => form.body.split(/\s+/).filter(Boolean).length, [form.body]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setPerson = (key) => (value) => setForm((f) => ({ ...f, person: { ...f.person, [key]: value } }));

  // Inserta formato en la posición del cursor (o alrededor del texto elegido), siempre sobre el texto actual.
  const insert = (before, after = '', placeholder = '') => {
    const el = text.current;
    const body = formRef.current.body;
    const start = Math.min(el ? el.selectionStart : body.length, body.length);
    const end = Math.min(el ? el.selectionEnd : body.length, body.length);
    const selected = body.slice(start, end) || placeholder;
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    formRef.current = { ...formRef.current, body: next };
    setForm((f) => ({ ...f, body: next }));
    window.requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const from = start + before.length;
      el.setSelectionRange(from, from + selected.length);
    });
  };
  // Los bloques (subtítulo, pregunta, cita…) van siempre en su propia línea.
  const gapBefore = () => {
    const body = formRef.current.body;
    const before = body.slice(0, text.current?.selectionStart ?? body.length);
    return !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  };
  const block = (snippet, placeholder) => insert(`${gapBefore()}${snippet}`, '\n\n', placeholder);
  const insertImage = async (file) => {
    if (!file) return;
    setImageBusy(true);
    try {
      const { url } = await uploadImage(file, 1800);
      insert(`${gapBefore()}![`, `](${url})\n\n`, 'Epígrafe de la foto');
    } catch (err) { fail(err); } finally { setImageBusy(false); if (bodyImage.current) bodyImage.current.value = ''; }
  };

  const save = async ({ quiet = false } = {}) => {
    setBusy('save');
    try {
      const body = payloadOf(form);
      if (isNew) {
        const created = await api.post('/admin/articles', body);
        setSaved(JSON.stringify(body));
        toast('Borrador creado');
        navigate(`/admin/revista/${created.article.id}`, { replace: true, force: true });
        return created;
      }
      const updated = await api.put(`/admin/articles/${params.id}`, body);
      apply(updated, body);
      if (!quiet) toast('Cambios guardados');
      return updated;
    } catch (err) {
      fail(err);
      return null;
    } finally { setBusy(''); }
  };

  // Despublicar o cambiar la portada guarda antes los cambios pendientes, igual que publicar.
  const action = async (key, fn, message) => {
    if (isDirty() && !(await save({ quiet: true }))) return;
    setBusy(key);
    try { apply(await fn()); toast(message); refreshBadges(); } catch (err) { fail(err); } finally { setBusy(''); }
  };

  if (error) return <div className="adm-page"><PageHeader title="Nota" back={{ to: '/admin/revista', label: 'Revista' }} /><Failed error={error} onRetry={load} /></div>;
  if (!isNew && !data) return <div className="adm-page"><Loading rows={8} /></div>;

  const article = data?.article;
  const state = article?.state || 'draft';
  const publicUrl = `/revista/${article?.slug || form.slug}`;
  const suggestedSlug = form.slug || slugify(form.title);

  return (
    <div className="adm-page adm-editor-page">
      <PageHeader
        back={{ to: '/admin/revista', label: 'Revista' }}
        title={isNew ? 'Nueva nota' : 'Editar nota'}
        subtitle={isNew
          ? 'Completá título y sección para guardar el borrador. Nada se publica hasta que lo decidas.'
          : `${dirty ? 'Cambios sin guardar' : `Guardada ${ago(article.updatedAt)}`} · ${num(article.views)} lecturas${state === 'scheduled' ? ` · sale el ${dateTime(article.publishedAt)}` : ''}`}
        actions={(
          <>
            {!isNew && <a className="btn btn-secondary btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer"><Eye size={15} /><span>{state === 'published' ? 'Ver' : 'Vista previa'}</span></a>}
            <Button size="sm" variant={dirty || isNew ? 'primary' : 'secondary'} loading={busy === 'save'} disabled={!dirty && !isNew} onClick={() => save()}>{isNew ? 'Guardar borrador' : 'Guardar'}</Button>
            {!isNew && (state === 'draft'
              ? <Button size="sm" icon={<Send size={15} />} onClick={() => { setWhen({ mode: 'now', at: localInput(new Date(Date.now() + 3600000)) }); setSheet('publish'); }}>Publicar</Button>
              : <Button size="sm" variant="secondary" icon={<EyeOff size={15} />} loading={busy === 'unpublish'} onClick={() => action('unpublish', () => api.post(`/admin/articles/${params.id}/unpublish`), 'La nota volvió a borrador')}>Despublicar</Button>)}
            {!isNew && (
              <div className="relative">
                <Button size="sm" variant="secondary" icon={<MoreHorizontal size={16} />} onClick={() => setMenu(true)} aria-label="Más acciones">Más</Button>
                <ActionMenu open={menu} onClose={() => setMenu(false)} title="Más acciones" items={[
                  state !== 'draft' && { label: article.featured ? 'Sacar de la portada' : 'Poner en la portada', icon: <Star size={17} />, onClick: () => action('featured', () => api.put(`/admin/articles/${params.id}/featured`, { featured: !article.featured }), article.featured ? 'Ya no es la nota de portada' : 'Ahora es la nota de portada') },
                  state !== 'draft' && { label: 'Cambiar la fecha de publicación', icon: <CalendarClock size={17} />, onClick: () => { setWhen({ mode: 'schedule', at: localInput(new Date(article.publishedAt)) }); setSheet('publish'); } },
                  { label: 'Eliminar nota', icon: <Trash2 size={17} />, danger: true, onClick: () => setSheet('delete') }
                ]} />
              </div>
            )}
          </>
        )}
      >
        {!isNew && (
          <div className="adm-entity-pills">
            <Status kind="article" value={state} />
            {article.featured && <span className="adm-pill-star"><Star size={12} /> Portada</span>}
            <span className="adm-muted">{[article.sample && 'Nota de ejemplo', sectionLabel(form.section), formatLabel(form.format), `${readingMinutes(blocks)} min de lectura`].filter(Boolean).join(' · ')}</span>
          </div>
        )}
      </PageHeader>

      <div className="adm-editor">
        <div className="adm-editor-main">
          <Panel className="adm-editor-titles">
            <label className="sr-only" htmlFor="ed-title">Título</label>
            <textarea id="ed-title" className="adm-title-input" rows={2} value={form.title} maxLength={160} placeholder="Título de la nota" onChange={(e) => set('title')(e.target.value)} />
            <label className="sr-only" htmlFor="ed-dek">Bajada</label>
            <textarea id="ed-dek" className="adm-dek-input" rows={3} value={form.dek} maxLength={300} placeholder="Bajada: una o dos frases que resuman la nota" onChange={(e) => set('dek')(e.target.value)} />
          </Panel>

          <Panel
            title="Texto"
            hint={`${num(words)} palabras · ${readingMinutes(blocks)} min de lectura`}
            className="adm-editor-body"
            actions={<Tabs value={tab} onChange={setTab} className="is-small" items={[{ id: 'write', label: 'Escribir' }, { id: 'preview', label: 'Vista previa' }, { id: 'help', label: 'Formato' }]} />}
          >
            {tab === 'write' && (
              <>
                <div className="adm-toolbar" role="toolbar" aria-label="Formato del texto">
                  <button type="button" onClick={() => block('## ', 'Subtítulo')} title="Subtítulo"><Heading2 size={16} /><span>Subtítulo</span></button>
                  <button type="button" onClick={() => block('P: ', '¿Pregunta?')} title="Pregunta"><b>P</b><span>Pregunta</span></button>
                  <button type="button" onClick={() => block('R: ', 'Respuesta.')} title="Respuesta"><b>R</b><span>Respuesta</span></button>
                  <button type="button" onClick={() => block('> ', 'Frase destacada')} title="Cita"><Quote size={16} /><span>Cita</span></button>
                  <button type="button" onClick={() => block('- ', 'Primer punto')} title="Lista"><List size={16} /><span>Lista</span></button>
                  <button type="button" onClick={() => insert('**', '**', 'texto')} title="Negrita"><Bold size={16} /><span>Negrita</span></button>
                  <button type="button" onClick={() => insert('[', '](https://)', 'texto del enlace')} title="Enlace"><Link2 size={16} /><span>Enlace</span></button>
                  <button type="button" onClick={() => bodyImage.current?.click()} disabled={imageBusy} title="Imagen"><ImagePlus size={16} /><span>{imageBusy ? 'Subiendo…' : 'Imagen'}</span></button>
                  <button type="button" onClick={() => block('---', '')} title="Separador"><Minus size={16} /><span>Separador</span></button>
                  <input ref={bodyImage} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => insertImage(e.target.files?.[0])} />
                </div>
                <textarea
                  ref={text}
                  className="input adm-body-input"
                  value={form.body}
                  onChange={(e) => set('body')(e.target.value)}
                  placeholder={'Escribí la nota acá.\n\nPara una entrevista:\nP: ¿Cómo empezó todo?\nR: Empezó en un garaje…'}
                  aria-label="Texto de la nota"
                  spellCheck
                />
              </>
            )}
            {tab === 'preview' && (
              <div className="adm-preview">
                <span className="rv-kicker adm-preview-kicker"><span>{sectionLabel(form.section)}</span>{!sectionLabel(form.section).toLowerCase().startsWith(formatLabel(form.format).toLowerCase()) && <em>{formatLabel(form.format)}</em>}</span>
                <h1 className="adm-preview-title">{form.title || 'Título de la nota'}</h1>
                {form.dek && <p className="adm-preview-dek">{form.dek}</p>}
                {form.cover && <img className="adm-preview-cover" src={imageSrc(form.cover, 1200)} alt="" />}
                {blocks.length ? <ArticleBody blocks={blocks} /> : <p className="adm-muted-line">Todavía no hay texto.</p>}
              </div>
            )}
            {tab === 'help' && (
              <dl className="adm-format-help">
                {HELP.map(([code, desc]) => <div key={code}><dt><code>{code}</code></dt><dd>{desc}</dd></div>)}
              </dl>
            )}
          </Panel>
        </div>

        <div className="adm-editor-side">
          <Panel title="Publicación">
            <div className="adm-form-stack">
              <div className="adm-form-row">
                <label className="field"><span className="field-label">Sección</span>
                  <select className="input select" value={form.section} onChange={(e) => set('section')(e.target.value)}>{REVISTA_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                </label>
                <label className="field"><span className="field-label">Formato</span>
                  <select className="input select" value={form.format} onChange={(e) => set('format')(e.target.value)}>{REVISTA_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                </label>
              </div>
              <label className="field"><span className="field-label">Firma</span>
                <input className="input" value={form.author} maxLength={80} onChange={(e) => set('author')(e.target.value)} />
              </label>
              <label className="field"><span className="field-label">Dirección <em>Opcional</em></span>
                <span className="adm-slug"><span>/revista/</span><input value={form.slug} onChange={(e) => set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder={suggestedSlug || 'se-arma-con-el-titulo'} maxLength={80} aria-label="Dirección de la nota" /></span>
                {state !== 'draft' && <span className="field-hint">Si la cambiás, los enlaces que ya compartiste dejan de funcionar.</span>}
              </label>
            </div>
          </Panel>

          <Panel title="Portada">
            <ImageField label="Foto principal" value={form.cover} onChange={set('cover')} />
            <label className="field adm-gap"><span className="field-label">Crédito de la foto <em>Opcional</em></span>
              <input className="input" value={form.coverCredit} maxLength={120} placeholder="Foto: …" onChange={(e) => set('coverCredit')(e.target.value)} />
            </label>
          </Panel>

          <Panel title="Protagonista" hint="La persona entrevistada o de quien trata la nota">
            <div className="adm-person-grid">
              <ImageField label="Foto" value={form.person.photo} onChange={setPerson('photo')} round />
              <div className="adm-form-stack">
                <input className="input" value={form.person.name} maxLength={80} placeholder="Nombre y apellido" aria-label="Nombre del protagonista" onChange={(e) => setPerson('name')(e.target.value)} />
                <input className="input" value={form.person.role} maxLength={80} placeholder="Cargo (Founder & CEO…)" aria-label="Cargo" onChange={(e) => setPerson('role')(e.target.value)} />
                <input className="input" value={form.person.company} maxLength={80} placeholder="Empresa o startup" aria-label="Empresa" onChange={(e) => setPerson('company')(e.target.value)} />
              </div>
            </div>
          </Panel>

          <Panel title="Proyecto en KeFounder!" hint="Opcional: invita a conocerlo al final de la nota">
            <ProjectPicker project={form.project} onChange={(p) => setForm((f) => ({ ...f, project: p, projectId: p?.id || null }))} />
          </Panel>

          <Panel title="Temas">
            <TagInput value={form.tags} onChange={set('tags')} max={6} suggestions={['IA', 'Fintech', 'AgroTech', 'HealthTech', 'SaaS B2B', 'Inversión', 'Equipos', 'Uruguay', 'Argentina', 'Remoto']} />
          </Panel>

          {!isNew && (
            <Panel title="Lecturas" hint="Últimos 30 días">
              <ColumnChart data={chartData(data.series)} valueLabel="lecturas" height={120} />
            </Panel>
          )}
          {!isNew && <FollowUp target={{ type: 'article', id: article.id, label: article.title }} data={data} onChange={load} />}
        </div>
      </div>

      <ActionSheet
        open={sheet === 'publish'}
        onClose={() => setSheet(null)}
        title={state === 'draft' ? 'Publicar la nota' : 'Fecha de publicación'}
        text={state === 'draft' ? 'Elegí si sale ahora o en una fecha. Antes de publicar se guardan los cambios.' : 'La nota se ordena en la revista por esta fecha.'}
        confirmLabel={when.mode === 'schedule' ? 'Guardar fecha' : state === 'published' ? 'Listo' : 'Publicar ahora'}
        reason={false}
        valid={when.mode === 'now' || Boolean(when.at)}
        onConfirm={async () => {
          if (dirty && !(await save({ quiet: true }))) throw new Error('No se pudieron guardar los cambios.');
          const publishedAt = when.mode === 'now' ? null : new Date(when.at).toISOString();
          const res = await api.post(`/admin/articles/${params.id}/publish`, publishedAt ? { publishedAt } : {});
          apply(res);
          toast(res.article.state === 'scheduled' ? `Programada para el ${dateTime(res.article.publishedAt)}` : '¡Nota publicada!');
        }}
      >
        <div className="adm-choice">
          <button type="button" className={when.mode === 'now' ? 'is-active' : ''} onClick={() => setWhen((w) => ({ ...w, mode: 'now' }))}>
            <strong>{state === 'published' ? 'Mantener' : 'Ahora'}</strong><small>{state === 'published' ? 'Sin cambiar la fecha actual' : 'Aparece en la revista al instante'}</small>
          </button>
          <button type="button" className={when.mode === 'schedule' ? 'is-active' : ''} onClick={() => setWhen((w) => ({ ...w, mode: 'schedule' }))}>
            <strong>Elegir fecha</strong><small>Futura: sale sola ese día</small>
          </button>
        </div>
        {when.mode === 'schedule' && (
          <label className="field"><span className="field-label">Fecha y hora</span>
            <input className="input" type="datetime-local" value={when.at} onChange={(e) => setWhen((w) => ({ ...w, at: e.target.value }))} />
          </label>
        )}
      </ActionSheet>
      <ActionSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Eliminar la nota"
        text="Se borra de la revista y del panel, con sus lecturas. No se puede deshacer; la auditoría guarda el registro."
        confirmLabel="Eliminar definitivamente"
        tone="danger"
        onConfirm={(reason) => api.del(`/admin/articles/${params.id}`, { reason }).then(() => { toast('Nota eliminada'); navigate('/admin/revista', { replace: true, force: true }); })}
      />
    </div>
  );
}
