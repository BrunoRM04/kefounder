import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, CheckCircle2, Heart, Sparkles, X } from 'lucide-react';
import { PLANS } from '../../shared/catalog.js';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { firstName, money } from '../lib/format.js';
import { useLockBody } from '../lib/hooks.js';
import { useRouter } from '../lib/router.jsx';
import { Avatar, Button, Segmented, Sheet, cx } from './ui.jsx';

export function Toasts() {
  const { toasts } = useApp();
  if (!toasts.length) return null;
  return createPortal(
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', `toast-${t.tone}`)}>
          <span className="toast-icon">{t.icon || (t.tone === 'error' ? <X size={14} /> : '✳')}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

export function NotificationBanner() {
  const { banner, closeBanner } = useApp();
  const { navigate } = useRouter();
  if (!banner) return null;
  const open = () => {
    closeBanner();
    api.post(`/notifications/${banner.id}/read`).catch(() => {});
    navigate(banner.link || '/notificaciones');
  };
  return createPortal(
    <div className="live-banner" key={banner.key} role="status">
      <button type="button" className="live-banner-main" onClick={open}>
        {banner.actor ? <Avatar person={banner.actor} size={38} /> : <span className="live-banner-icon">{banner.type === 'match' ? <Heart size={17} /> : <Sparkles size={17} />}</span>}
        <span className="live-banner-copy">
          <strong>{banner.title}</strong>
          {banner.body && <small>{banner.body}</small>}
        </span>
      </button>
      <button type="button" className="live-banner-close" aria-label="Cerrar" onClick={closeBanner}><X size={16} /></button>
    </div>,
    document.body
  );
}

export function CheckoutSheet({ plan: planId, open, onClose, initialPeriod = 'monthly', onDone }) {
  const { setMe, toast, fail } = useApp();
  const [period, setPeriod] = useState(initialPeriod);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const plan = PLANS[planId];
  if (!plan) return null;
  const saving = Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100);
  const confirm = async () => {
    setLoading(true);
    try {
      const { user, receipt } = await api.post('/billing/checkout', { plan: planId, period });
      setMe(user);
      setDone(receipt);
      toast(`¡Listo! Ya tenés ${plan.name}.`, { icon: <Check size={14} /> });
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  };
  const close = () => { setDone(null); onClose(); if (done) onDone?.(); };
  return (
    <Sheet open={open} onClose={close} title={done ? '¡Bienvenido a ' + plan.name + '!' : `Plan ${plan.name}`} subtitle={done ? null : plan.tagline} size="sm">
      {done ? (
        <div className="checkout-done">
          <CheckCircle2 size={44} />
          <p>Tu plan <strong>{plan.name}</strong> ya está activo. Se renueva el {new Date(done.renewsAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          <Button block onClick={close}>Empezar a usarlo</Button>
        </div>
      ) : (
        <div className="checkout">
          <Segmented
            className="checkout-period"
            value={period}
            onChange={setPeriod}
            options={[{ id: 'monthly', label: 'Mensual' }, { id: 'yearly', label: `Anual · ahorrá ${saving}%` }]}
          />
          <div className="checkout-price">
            <strong>{money(period === 'yearly' ? plan.yearly : plan.monthly)}</strong>
            <span>{period === 'yearly' ? 'por año' : 'por mes'}</span>
          </div>
          <ul className="benefit-list">
            {plan.benefits.map((b) => <li key={b}><Check size={15} /> {b}</li>)}
          </ul>
          <Button block size="lg" loading={loading} onClick={confirm}>Confirmar {plan.name}</Button>
          <p className="checkout-note">Modo demostración: no se realiza ningún cobro. Podés cancelar cuando quieras desde Planes.</p>
        </div>
      )}
    </Sheet>
  );
}

export function PaywallSheet() {
  const { paywall, showPaywall } = useApp();
  const { navigate } = useRouter();
  const [checkout, setCheckout] = useState(null);
  const plan = PLANS[paywall?.requiredPlan] || PLANS.plus;
  const close = () => showPaywall(null);
  return (
    <>
      <Sheet open={Boolean(paywall) && !checkout} onClose={close} size="sm" hideClose={false} className="paywall-sheet">
        {paywall && (
          <div className="paywall">
            <span className="paywall-spark">✳</span>
            <span className="kicker">Disponible con {plan.name}</span>
            <h2>{paywall.title}</h2>
            <p>{paywall.error}</p>
            <div className="paywall-plan">
              <div>
                <strong>{plan.name}</strong>
                <span>{plan.tagline}</span>
              </div>
              <em>{money(plan.monthly)}<small>/mes</small></em>
            </div>
            <ul className="benefit-list">
              {plan.benefits.slice(0, 4).map((b) => <li key={b}><Check size={15} /> {b}</li>)}
            </ul>
            <Button block size="lg" onClick={() => setCheckout(plan.id)}>Elegir {plan.name}</Button>
            <Button block variant="ghost" onClick={() => { close(); navigate('/planes'); }}>Ver todos los planes</Button>
          </div>
        )}
      </Sheet>
      <CheckoutSheet plan={checkout} open={Boolean(checkout)} onClose={() => { setCheckout(null); close(); }} />
    </>
  );
}

export function MatchCelebration() {
  const { celebration, closeCelebration, me } = useApp();
  const { navigate } = useRouter();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeRef = useRef(closeCelebration);
  closeRef.current = closeCelebration;
  const showing = Boolean(celebration);
  useLockBody(showing);
  useEffect(() => {
    if (!showing) return undefined;
    const previousFocus = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const buttons = [...dialogRef.current.querySelectorAll('button:not([disabled])')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [showing]);
  if (!celebration) return null;
  const other = celebration.other;
  const project = celebration.project;
  return createPortal(
    <div className="celebration" role="dialog" aria-modal="true" aria-label="Nuevo match" ref={dialogRef}>
      <button type="button" className="icon-btn celebration-close" aria-label="Cerrar" onClick={closeCelebration} ref={closeButtonRef}><X size={22} /></button>
      <div className="celebration-card">
        <span className="kicker">Nuevo match</span>
        <h2>¡Es un match!</h2>
        <div className="celebration-avatars">
          <div className="celebration-burst" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ '--i': i }}>✳</i>)}</div>
          <Avatar person={me} size={92} />
          <span className="celebration-heart"><Heart size={20} fill="currentColor" /></span>
          <Avatar person={other} size={92} />
        </div>
        <p>Vos y <strong>{firstName(other?.name)}</strong> quieren construir juntos{project ? <> en <strong>{project.name}</strong></> : null}.</p>
        <Button block size="lg" iconRight={<ArrowRight size={17} />} onClick={() => { closeCelebration(); navigate(`/chat/${celebration.id}`); }}>Enviar mensaje</Button>
        <Button block variant="ghost" onClick={closeCelebration}>Seguir descubriendo</Button>
      </div>
    </div>,
    document.body
  );
}

export function OfflineNotice() {
  const { online, me } = useApp();
  if (online || !me) return null;
  return <div className="offline-notice">Reconectando…</div>;
}
