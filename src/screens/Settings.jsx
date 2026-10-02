import React, { useRef, useState } from 'react';
import { ArrowRight, AtSign, BadgeCheck, Check, Clock, Gem, KeyRound, LogOut, Mail, RotateCcw, Shield, Trash2, UserX } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { Page, PageHeading, TopBar } from '../components/Shell.jsx';
import { Avatar, Button, Pill, Sheet, Skeleton, TextInput, Toggle } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { deckStore } from '../lib/deck-store.js';
import { useLoader } from '../lib/hooks.js';
import { uploadImage } from '../lib/media.js';
import { Link } from '../lib/router.jsx';

export default function Settings() {
  const { me, setMe, fail, toast, logout } = useApp();
  const { data: settings, setData: setSettings, loading } = useLoader(() => api.get('/me/settings'), []);
  const { data: blocks, setData: setBlocks } = useLoader(() => api.get('/me/blocks'), []);
  const [sheet, setSheet] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [codeInfo, setCodeInfo] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [working, setWorking] = useState('');
  const docRef = useRef(null);
  const verification = me.verification || { email: me.trust?.email, identity: me.trust?.identity ? 'approved' : 'none' };

  const update = async (patch) => {
    const next = { ...settings, ...patch, notifications: { ...settings.notifications, ...(patch.notifications || {}) } };
    setSettings(next);
    try {
      await api.put('/me/settings', patch);
      if ('visible' in patch || 'showAge' in patch) setMe((m) => ({ ...m, ...('visible' in patch ? { visible: patch.visible } : {}), ...('showAge' in patch ? { showAge: patch.showAge } : {}) }));
    } catch (err) { fail(err); }
  };

  const changePassword = async () => {
    setBusy(true);
    setPwError('');
    try {
      await api.put('/me/password', pw);
      toast('Contraseña actualizada');
      setPw({ current: '', next: '' });
      setSheet(null);
    } catch (err) { setPwError(err.message); } finally { setBusy(false); }
  };

  const changeEmail = async () => {
    setBusy(true);
    setEmailError('');
    try {
      const { user } = await api.put('/me/email', emailForm);
      setMe(user);
      setEmailForm({ email: '', password: '' });
      setCodeInfo(null);
      toast('Email actualizado. Verificalo para sumar confianza a tu perfil.');
      setSheet(null);
    } catch (err) { setEmailError(err.message); } finally { setBusy(false); }
  };

  const sendCode = async () => {
    setWorking('code');
    setCodeError('');
    try {
      const res = await api.post('/me/email/verification');
      setCodeInfo(res);
      setCode('');
      setSheet('verify-email');
    } catch (err) { fail(err); } finally { setWorking(''); }
  };

  const confirmCode = async () => {
    setWorking('confirm');
    setCodeError('');
    try {
      const { user } = await api.post('/me/email/verify', { code });
      setMe(user);
      toast('Email verificado', { icon: <Check size={14} /> });
      setSheet(null);
    } catch (err) { setCodeError(err.message); } finally { setWorking(''); }
  };

  const verifyIdentity = async (file) => {
    if (!file) return;
    setWorking('identity');
    try {
      const { url } = await uploadImage(file, 1600);
      const { user } = await api.post('/me/identity', { document: url });
      setMe(user);
      toast(user.verification.identity === 'approved' ? 'Identidad verificada' : 'Recibimos tu documento: lo revisamos en breve', { icon: <BadgeCheck size={14} /> });
    } catch (err) { fail(err); } finally {
      setWorking('');
      if (docRef.current) docRef.current.value = '';
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api.del('/me', { password: deletePw });
      deckStore.clear();
      setMe(null);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const resetPasses = async () => {
    try { await api.post('/me/reset-passes', {}); deckStore.clear(); toast('Vas a volver a ver los perfiles que pasaste'); } catch (err) { fail(err); }
  };

  const n = settings?.notifications || {};

  return (
    <>
      <TopBar back="/perfil" title="Configuración" />
      <Page width="sm" className="page-settings">
        <PageHeading kicker={<><Shield size={13} /> Tu cuenta</>} title="Configuración" />

        <section className="settings-card account-card">
          <Avatar person={me} size={52} />
          <div><strong>{me.name}</strong><span><Mail size={13} /> {me.email}</span></div>
          <Link to="/planes" className="plan-chip"><Gem size={14} /> {PLANS[me.plan].name}</Link>
        </section>

        <section className="settings-card">
          <h2>Cuenta y verificación</h2>
          <div className="verify-row">
            <span className="verify-icon"><Mail size={18} /></span>
            <div>
              <strong>Email</strong>
              <span>{me.email}</span>
            </div>
            {verification.email
              ? <Pill tone="accent" icon={<Check size={12} />}>Verificado</Pill>
              : <Button size="sm" variant="secondary" loading={working === 'code' && sheet !== 'verify-email'} onClick={sendCode}>Verificar</Button>}
          </div>
          <div className="verify-row">
            <span className="verify-icon"><BadgeCheck size={18} /></span>
            <div>
              <strong>Identidad</strong>
              <span>{verification.identity === 'approved' ? 'Tu perfil muestra la insignia de identidad verificada.'
                : verification.identity === 'pending' ? 'Estamos revisando tu documento.'
                  : verification.identity === 'rejected' ? `No pudimos verificarla${verification.identityNote ? `: ${verification.identityNote}` : ''}. Probá con otra foto.`
                    : 'Subí una foto de tu documento para mostrar la insignia.'}</span>
            </div>
            {verification.identity === 'approved'
              ? <Pill tone="accent" icon={<Check size={12} />}>Verificada</Pill>
              : verification.identity === 'pending'
                ? <Pill tone="gold" icon={<Clock size={12} />}>En revisión</Pill>
                : <Button size="sm" variant="secondary" loading={working === 'identity'} onClick={() => docRef.current?.click()}>{verification.identity === 'rejected' ? 'Reintentar' : 'Verificar'}</Button>}
            <input ref={docRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => verifyIdentity(e.target.files?.[0])} />
          </div>
          <button type="button" className="settings-link" onClick={() => { setEmailForm({ email: '', password: '' }); setEmailError(''); setSheet('email'); }}><AtSign size={18} /> Cambiar email <ArrowRight size={16} /></button>
          <p className="settings-note">Modo demostración: el código de verificación se muestra en pantalla. La identidad la revisa el equipo de KeFounder!.</p>
        </section>

        <section className="settings-card">
          <h2>Notificaciones</h2>
          {loading ? <Skeleton height={180} /> : (
            <>
              <Toggle label="Solicitudes de conexión" description="Cuando alguien quiere conectar con vos." checked={n.interests} onChange={(v) => update({ notifications: { interests: v } })} />
              <Toggle label="Nuevos matches" checked={n.matches} onChange={(v) => update({ notifications: { matches: v } })} />
              <Toggle label="Mensajes" checked={n.messages} onChange={(v) => update({ notifications: { messages: v } })} />
              <Toggle label="Actividad" description="Guardados, visitas y recomendaciones." checked={n.activity} onChange={(v) => update({ notifications: { activity: v } })} />
            </>
          )}
        </section>

        <section className="settings-card">
          <h2>Privacidad</h2>
          {loading ? <Skeleton height={100} /> : (
            <>
              <Toggle label="Mostrar mi perfil en Descubrir" description="Si lo apagás, tus matches y chats siguen funcionando." checked={settings.visible} onChange={(v) => update({ visible: v })} />
              <Toggle label="Mostrar mi edad" checked={settings.showAge} onChange={(v) => update({ showAge: v })} />
            </>
          )}
        </section>

        <section className="settings-card">
          <h2>Descubrir</h2>
          <button type="button" className="settings-link" onClick={resetPasses}><RotateCcw size={18} /> Volver a ver perfiles y proyectos que pasé <ArrowRight size={16} /></button>
        </section>

        <section className="settings-card">
          <h2>Personas bloqueadas</h2>
          {!blocks ? <Skeleton height={48} /> : blocks.items.length ? blocks.items.map((b) => (
            <div className="blocked-row" key={b.id}>
              <Avatar person={b} size={38} />
              <strong>{b.name}</strong>
              <Button size="sm" variant="secondary" onClick={async () => {
                try { await api.del(`/me/blocks/${b.id}`); setBlocks((d) => ({ items: d.items.filter((x) => x.id !== b.id) })); toast(`Desbloqueaste a ${b.name}`); } catch (err) { fail(err); }
              }}>Desbloquear</Button>
            </div>
          )) : <p className="muted settings-empty"><UserX size={16} /> No bloqueaste a nadie.</p>}
        </section>

        <section className="settings-card">
          <h2>Seguridad</h2>
          <button type="button" className="settings-link" onClick={() => setSheet('password')}><KeyRound size={18} /> Cambiar contraseña <ArrowRight size={16} /></button>
          <button type="button" className="settings-link" onClick={logout}><LogOut size={18} /> Cerrar sesión <ArrowRight size={16} /></button>
          <button type="button" className="settings-link is-danger" onClick={() => setSheet('delete')}><Trash2 size={18} /> Eliminar mi cuenta</button>
        </section>
        <p className="settings-foot">KeFounder! · versión 1.0 · Hecho para construir juntos ✳</p>
      </Page>

      <Sheet open={sheet === 'password'} onClose={() => setSheet(null)} title="Cambiar contraseña" size="sm" footer={<><Button variant="secondary" onClick={() => setSheet(null)}>Cancelar</Button><Button loading={busy} disabled={!pw.current || pw.next.length < 8} onClick={changePassword}>Guardar</Button></>}>
        <div className="form-grid">
          <TextInput label="Contraseña actual" type="password" value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} autoComplete="current-password" />
          <TextInput label="Nueva contraseña" type="password" value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} hint="Mínimo 8 caracteres." autoComplete="new-password" />
          {pwError && <p className="form-error">{pwError}</p>}
        </div>
      </Sheet>
      <Sheet open={sheet === 'email'} onClose={() => setSheet(null)} title="Cambiar email" subtitle="Vas a usar el nuevo email para ingresar. Después te pedimos verificarlo." size="sm" footer={<><Button variant="secondary" onClick={() => setSheet(null)}>Cancelar</Button><Button loading={busy} disabled={!emailForm.email || !emailForm.password} onClick={changeEmail}>Guardar</Button></>}>
        <div className="form-grid">
          <TextInput label="Nuevo email" type="email" value={emailForm.email} onChange={(v) => setEmailForm((f) => ({ ...f, email: v }))} autoComplete="email" inputMode="email" />
          <TextInput label="Tu contraseña" type="password" value={emailForm.password} onChange={(v) => setEmailForm((f) => ({ ...f, password: v }))} autoComplete="current-password" />
          {emailError && <p className="form-error">{emailError}</p>}
        </div>
      </Sheet>
      <Sheet open={sheet === 'verify-email'} onClose={() => setSheet(null)} title="Verificá tu email" subtitle={`Te enviamos un código de 6 dígitos a ${me.email}.`} size="sm" footer={<><Button variant="secondary" loading={working === 'code'} onClick={sendCode}>Reenviar</Button><Button loading={working === 'confirm'} disabled={code.length !== 6} onClick={confirmCode}>Verificar</Button></>}>
        <div className="form-grid">
          {codeInfo?.demoCode && <p className="demo-code">Modo demo: tu código es <strong>{codeInfo.demoCode}</strong></p>}
          <TextInput label="Código" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
          {codeError && <p className="form-error">{codeError}</p>}
        </div>
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Eliminar tu cuenta" subtitle="Se borran tu perfil, proyectos, matches y mensajes. No se puede deshacer." size="sm" footer={<><Button variant="secondary" onClick={() => setSheet(null)}>Cancelar</Button><Button variant="danger" loading={busy} disabled={!deletePw} onClick={deleteAccount}>Eliminar definitivamente</Button></>}>
        <TextInput label="Confirmá con tu contraseña" type="password" value={deletePw} onChange={setDeletePw} autoComplete="current-password" />
      </Sheet>
    </>
  );
}
