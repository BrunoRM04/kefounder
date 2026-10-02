import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button, TextInput } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { Link, useRouter } from '../lib/router.jsx';
import { Isotipo, Logotipo } from '../components/Brand.jsx';

function AuthLayout({ title, text, children, footer }) {
  const { back } = useRouter();
  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="true">
        <span className="wordmark"><Logotipo height={20} /></span>
        <div>
          <span className="auth-art-spark"><Isotipo size={34} /></span>
          <h2>Las mejores ideas empiezan con una buena charla.</h2>
          <p>Tu próximo equipo está a un match de distancia.</p>
        </div>
        <small>© 2026 KeFounder!</small>
      </aside>
      <main className="auth-main">
        <button type="button" className="back-btn auth-back" onClick={() => back('/bienvenida')} aria-label="Volver"><ArrowLeft size={20} /></button>
        <div className="auth-box">
          <span className="wordmark auth-mobile-mark"><Logotipo height={22} /></span>
          <h1>{title}<span className="accent-dot">.</span></h1>
          <p className="auth-text">{text}</p>
          {children}
          <p className="auth-foot">{footer}</p>
        </div>
      </main>
    </div>
  );
}

function PasswordInput({ value, onChange, error, autoComplete, label = 'Contraseña' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <TextInput label={label} type={visible ? 'text' : 'password'} value={value} onChange={onChange} error={error} autoComplete={autoComplete} required minLength={8} />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Login() {
  const { setMe } = useApp();
  const { navigate, query } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = query.get('next');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await api.post('/auth/login', { email, password });
      setMe(user);
      navigate(next || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Hola de nuevo"
      text="Ingresá para seguir descubriendo personas y proyectos."
      footer={<>¿Todavía no tenés cuenta? <Link to={next ? `/registro?next=${encodeURIComponent(next)}` : '/registro'}>Creala gratis</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required autoFocus />
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" size="lg" block loading={loading}>Ingresar</Button>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const { setMe } = useApp();
  const { navigate, query } = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = query.get('next');
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Contanos tu nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) local.email = 'Ese email no parece válido.';
    if (form.password.length < 8) local.password = 'Usá al menos 8 caracteres.';
    setErrors(local);
    if (Object.keys(local).length) return;
    setLoading(true);
    setError('');
    try {
      const { user } = await api.post('/auth/register', form);
      setMe(user);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (err.data?.field) setErrors({ [err.data.field]: err.message });
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Creá tu cuenta"
      text="Es gratis. En dos minutos estás descubriendo personas para construir."
      footer={<>¿Ya tenés cuenta? <Link to={next ? `/ingresar?next=${encodeURIComponent(next)}` : '/ingresar'}>Ingresá</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextInput label="Nombre y apellido" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required autoFocus maxLength={80} />
        <TextInput label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" required />
        <PasswordInput value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" size="lg" block loading={loading}>Crear cuenta</Button>
        <p className="auth-legal">Al continuar aceptás construir con respeto: nada de spam ni perfiles falsos.</p>
      </form>
    </AuthLayout>
  );
}
