import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { Button, cx } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { useRouter } from '../lib/router.jsx';
import { Logotipo } from '../components/Brand.jsx';

const WORDS = ['cofundador', 'developer', 'diseñador', 'proyecto', 'equipo'];
const LEAD = ['Encontrá', 'tu', 'próximo'];
const LEAVE_MS = 320;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Palabra que rota con una transición de desenfoque.
function Rotator() {
  const [{ index, prev }, setState] = useState({ index: 0, prev: -1 });
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = window.setInterval(() => setState((s) => ({ index: (s.index + 1) % WORDS.length, prev: s.index })), 2600);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="landing-rotator" aria-hidden="true">
      {WORDS.map((word, i) => (
        <span key={word} className={cx('landing-word', i === index && 'is-in', i === prev && 'is-out')}>
          {word}<span className="accent-dot">.</span>
        </span>
      ))}
    </span>
  );
}

export default function Welcome() {
  const { config, setMe, fail } = useApp();
  const { navigate, query } = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [loading, setLoading] = useState('');
  const timer = useRef(0);
  const next = query.get('next');
  const withNext = (path) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  useEffect(() => {
    // Precarga las pantallas siguientes para que la transición no muestre el splash.
    import('./Auth.jsx');
    import('./Discover.jsx');
    return () => window.clearTimeout(timer.current);
  }, []);

  // Sale con una transición antes de cambiar de pantalla.
  const go = (to, options) => {
    if (reducedMotion()) { navigate(to, options); return; }
    setLeaving(true);
    timer.current = window.setTimeout(() => navigate(to, options), LEAVE_MS);
  };

  const demoLogin = async (account) => {
    setLoading(account.email);
    try {
      const { user } = await api.post('/auth/login', { email: account.email, password: account.password });
      setLeaving(true);
      timer.current = window.setTimeout(() => { setMe(user); navigate(next || '/', { replace: true }); }, reducedMotion() ? 0 : LEAVE_MS);
    } catch (error) {
      fail(error);
      setLoading('');
    }
  };

  const demos = config.demo ? config.demoAccounts : [];

  return (
    <div className={cx('landing', leaving && 'is-leaving')}>
      <div className="landing-bg" aria-hidden="true">
        <i className="landing-glow landing-glow-1" />
        <i className="landing-glow landing-glow-2" />
        <i className="landing-ring" />
      </div>

      <header className="landing-top">
        <span className="wordmark"><Logotipo height={21} /></span>
      </header>

      <main className="landing-hero">
        <h1>
          <span className="sr-only">Encontrá tu próximo {WORDS.slice(0, -1).join(', ')} o {WORDS[WORDS.length - 1]}.</span>
          <span className="landing-lead" aria-hidden="true">
            {LEAD.map((word, i) => <span key={word} className="landing-lead-word" style={{ '--i': i }}>{word}</span>)}
          </span>
          <Rotator />
        </h1>
        <p className="landing-text">
          Personas y proyectos que quieren construir algo nuevo. <span>Si el interés es mutuo, es match.</span>
        </p>
        <div className="landing-cta">
          <Button size="lg" className="landing-primary" iconRight={<ArrowRight size={18} />} onClick={() => go(withNext('/registro'))}>Crear mi cuenta</Button>
          <Button size="lg" variant="secondary" onClick={() => go(withNext('/ingresar'))}>Ingresar</Button>
        </div>
        {demos.length > 0 && (
          <div className="landing-demo">
            <span>Probá la demo, una cuenta por plan</span>
            <div className="landing-demo-list">
              {demos.map((account) => (
                <button type="button" key={account.email} onClick={() => demoLogin(account)} disabled={Boolean(loading)} aria-busy={loading === account.email} aria-label={`Entrar como ${account.name}, plan ${PLANS[account.plan]?.name}`}>
                  {account.name.split(' ')[0]} <small>{PLANS[account.plan]?.name}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="landing-foot">© 2026 KeFounder!</footer>
    </div>
  );
}
