import React, { useState } from 'react';
import { DatabaseBackup, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Failed, KeyValue, Loading, PageHeader, Panel, bytes, dateTime, duration, num, useAdminData } from '../kit.jsx';

export default function System() {
  const { toast, fail } = useApp();
  const { data, error, reload } = useAdminData('/admin/system');
  const [busy, setBusy] = useState('');
  const [check, setCheck] = useState(null);
  const [cleanup, setCleanup] = useState(null);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); reload({ silent: true }); } catch (err) { fail(err); } finally { setBusy(''); }
  };

  if (error) return <div className="adm-page"><PageHeader title="Sistema" /><Failed error={error} onRetry={reload} /></div>;
  if (!data) return <div className="adm-page"><PageHeader title="Sistema" /><Loading rows={8} /></div>;
  const { database: db, runtime, sessions, uploads, backups } = data;
  const last = db.migrations.at(-1);

  return (
    <div className="adm-page">
      <PageHeader
        title="Sistema"
        subtitle="Estado de la base de datos, del servidor y de las copias de seguridad."
        actions={<Button size="sm" variant="secondary" icon={<RefreshCw size={15} />} onClick={() => reload()}>Actualizar</Button>}
      />
      <div className="adm-grid adm-system-grid">
        <Panel title="Base de datos" hint={`SQLite ${db.sqlite} · modo ${db.journal.toUpperCase()}`}>
          <KeyValue items={[
            ['Tamaño', bytes(db.bytes)],
            ['Espacio libre interno', bytes(db.freeBytes)],
            ['Versión del esquema', last ? last.id : '—'],
            ['Migraciones', last ? `${num(db.migrations.length)} · última ${dateTime(last.appliedAt)}` : '—']
          ]} />
          <div className="adm-inline-actions">
            <Button size="sm" variant="secondary" icon={<ShieldCheck size={15} />} loading={busy === 'check'} onClick={() => run('check', async () => setCheck(await api.post('/admin/system/check')))}>Revisar integridad</Button>
            <Button size="sm" variant="secondary" icon={<Sparkles size={15} />} loading={busy === 'cleanup'} onClick={() => run('cleanup', async () => setCleanup((await api.post('/admin/system/cleanup')).removed))}>Mantenimiento</Button>
          </div>
          {check && <p className={check.ok ? 'adm-ok adm-result' : 'adm-warn adm-result'}>{check.ok ? 'La base está íntegra.' : `Problemas: ${check.details.join(' · ')}`} Referencias huérfanas: {num(check.orphans.views + check.orphans.saves + check.orphans.passes)}.</p>}
          {cleanup && <p className="adm-ok adm-result">Se quitaron {num(cleanup.sessions)} sesiones vencidas y {num(cleanup.views + cleanup.saves + cleanup.passes)} referencias huérfanas. No se tocan cuentas ni contenido.</p>}
        </Panel>
        <Panel title="Servidor" hint={`Node ${runtime.node} · ${runtime.platform}`}>
          <KeyValue items={[
            ['Activo hace', duration(runtime.uptimeSeconds)],
            ['Iniciado', dateTime(runtime.startedAt)],
            ['Memoria en uso', bytes(runtime.memoryBytes)],
            ['Modo demo', runtime.demo ? 'Activado' : 'Desactivado'],
            ['Bots de demo', runtime.bots ? 'Activos' : 'Apagados']
          ]} />
        </Panel>
        <Panel title="Sesiones y archivos">
          <KeyValue items={[
            ['Sesiones abiertas', num(sessions.active)],
            ['Sesiones vencidas', num(sessions.expired)],
            ['Archivos subidos', num(uploads.files)],
            ['Espacio en archivos', bytes(uploads.bytes)]
          ]} />
        </Panel>
        <Panel title="Filas por tabla" hint="Cantidad de registros guardados en cada parte de la base" className="adm-span-2">
          <ul className="adm-rowgrid">
            {db.tables.map((t) => <li key={t.name}><span>{t.label}<small>{t.name}</small></span><strong>{num(t.rows)}</strong></li>)}
          </ul>
        </Panel>
        <Panel
          title="Copias de seguridad"
          hint={`Carpeta: ${backups.dir}`}
          actions={<Button size="sm" icon={<DatabaseBackup size={15} />} loading={busy === 'backup'} onClick={() => run('backup', async () => { const r = await api.post('/admin/system/backup'); toast(`Copia creada: ${r.backup.name}`); })}>Crear copia</Button>}
        >
          {backups.items.length ? (
            <ul className="adm-mini-list is-plain adm-backups">
              {backups.items.map((b) => <li key={b.name}><span className="adm-li-copy"><strong>{b.name}</strong><small>{dateTime(b.createdAt)} · {bytes(b.size)}</small></span></li>)}
            </ul>
          ) : <p className="adm-muted-line">Todavía no hay copias hechas desde el panel.</p>}
          <p className="adm-footnote">Cada copia es un archivo .db completo. Para restaurarla, detené el servidor y reemplazá <code>data/kefounder.db</code> por la copia.</p>
        </Panel>
      </div>
    </div>
  );
}
