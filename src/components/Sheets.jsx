import React, { useState } from 'react';
import { REPORT_REASONS } from '../../shared/catalog.js';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app.jsx';
import { Button, OptionList, Sheet, TextArea } from './ui.jsx';

export function ReportSheet({ open, onClose, targetType, targetId, name }) {
  const { toast, fail } = useApp();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details });
      toast('Gracias. Nuestro equipo va a revisar el reporte.');
      setReason('');
      setDetails('');
      onClose();
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Reportar ${name ? `a ${name}` : ''}`.trim()}
      subtitle="Los reportes son confidenciales."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={!reason} loading={loading} onClick={submit}>Enviar reporte</Button></>}
    >
      <div className="form-grid">
        <OptionList options={REPORT_REASONS.map((r) => ({ id: r, label: r }))} value={reason} onChange={setReason} />
        <TextArea label="Contanos más" optional value={details} onChange={setDetails} maxLength={600} rows={3} />
      </div>
    </Sheet>
  );
}

export function ConfirmSheet({ open, onClose, title, text, confirmLabel = 'Confirmar', danger, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); } finally { setLoading(false); }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={run}>{confirmLabel}</Button></>}
    >
      <p className="sheet-text">{text}</p>
    </Sheet>
  );
}

export function NoteSheet({ open, onClose, title, subtitle, placeholder, confirmLabel, onSubmit, required = false, maxLength = 280 }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const ok = await onSubmit(text.trim());
      if (ok !== false) { setText(''); onClose(); }
    } finally {
      setLoading(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={loading} disabled={required && !text.trim()} onClick={run}>{confirmLabel}</Button></>}
    >
      <TextArea value={text} onChange={setText} maxLength={maxLength} rows={4} placeholder={placeholder} data-autofocus />
    </Sheet>
  );
}
