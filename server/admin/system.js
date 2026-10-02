import fs from 'node:fs';
import path from 'node:path';
import { now } from '../db.js';
import { HttpError } from '../utils.js';
import { audit } from './common.js';

// Estado del sistema: tamaño de la base, filas por tabla, migraciones, sesiones, archivos y copias.

const TABLES = [
  ['users', 'Cuentas'], ['projects', 'Proyectos'], ['interests', 'Conexiones'], ['matches', 'Conversaciones'], ['messages', 'Mensajes'],
  ['notifications', 'Notificaciones'], ['views', 'Visitas'], ['saves', 'Guardados'], ['passes', 'Descartes'], ['blocks', 'Bloqueos'],
  ['reports', 'Reportes'], ['subscriptions', 'Suscripciones'], ['uploads', 'Archivos'], ['sessions', 'Sesiones'],
  ['admin_audit', 'Auditoría'], ['admin_notes', 'Notas internas'], ['admin_tasks', 'Tareas']
];

const startedAt = new Date().toISOString();
const BACKUP_RE = /^kefounder-\d{8}-\d{6}\.db$/;

// Dentro del proyecto se muestra la ruta relativa (data/backups); afuera, la completa.
const displayPath = (config, dir) => {
  const rel = config.root ? path.relative(config.root, dir) : '';
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : dir;
};

export const backupsDirOf = (config) => config.backupsDir || path.join(config.dataDir || path.dirname(config.uploadsDir), 'backups');

function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => BACKUP_RE.test(name))
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 30);
}

export default function systemRoutes(router, ctx) {
  const { db, config } = ctx;
  const backupsDir = backupsDirOf(config);

  router.get('/admin/system', (_req, res) => {
    const size = db.get('SELECT page_count * page_size AS bytes FROM pragma_page_count(), pragma_page_size()').bytes;
    const free = db.get('SELECT freelist_count * page_size AS bytes FROM pragma_freelist_count(), pragma_page_size()').bytes;
    const uploads = db.get('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM uploads');
    const memory = process.memoryUsage();
    res.json({
      database: {
        bytes: size,
        freeBytes: free,
        sqlite: db.get('SELECT sqlite_version() AS v').v,
        journal: db.get('PRAGMA journal_mode').journal_mode,
        tables: TABLES.map(([name, label]) => ({ name, label, rows: db.get(`SELECT COUNT(*) AS n FROM ${name}`).n })),
        migrations: db.all('SELECT id, applied_at AS appliedAt FROM schema_migrations ORDER BY id')
      },
      sessions: {
        active: db.get('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', [now()]).n,
        expired: db.get('SELECT COUNT(*) AS n FROM sessions WHERE expires_at <= ?', [now()]).n
      },
      uploads: { files: uploads.n, bytes: uploads.bytes },
      runtime: {
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        startedAt,
        uptimeSeconds: Math.round(process.uptime()),
        memoryBytes: memory.rss,
        demo: Boolean(config.demo),
        bots: Boolean(config.bots)
      },
      backups: { dir: displayPath(config, backupsDir), items: listBackups(backupsDir) }
    });
  });

  // Copia consistente de la base (VACUUM INTO) sin frenar el sitio.
  router.post('/admin/system/backup', (req, res) => {
    fs.mkdirSync(backupsDir, { recursive: true });
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `kefounder-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.db`;
    const file = path.join(backupsDir, name);
    if (fs.existsSync(file)) throw new HttpError(429, 'Esperá unos segundos antes de pedir otra copia.');
    db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const { size } = fs.statSync(file);
    audit(ctx, req, 'system.backup', { summary: `${name} (${Math.round(size / 1024)} KB)` });
    res.status(201).json({ backup: { name, size, createdAt: d.toISOString() } });
  });

  // Chequeo de integridad bajo demanda (puede tardar si la base es muy grande).
  router.post('/admin/system/check', (req, res) => {
    const rows = db.all('PRAGMA quick_check');
    const ok = rows.length === 1 && rows[0].quick_check === 'ok';
    const orphans = {
      views: db.get("SELECT COUNT(*) AS n FROM views v WHERE (v.target_type = 'person' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = v.target_id)) OR (v.target_type = 'project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = v.target_id))").n,
      saves: db.get("SELECT COUNT(*) AS n FROM saves s WHERE (s.target_type = 'person' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.target_id)) OR (s.target_type = 'project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.target_id))").n,
      passes: db.get("SELECT COUNT(*) AS n FROM passes s WHERE (s.target_type = 'person' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.target_id)) OR (s.target_type = 'project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.target_id))").n
    };
    audit(ctx, req, 'system.check', { summary: ok ? 'Integridad correcta' : 'Se encontraron problemas' });
    res.json({ ok, details: ok ? [] : rows.map((r) => r.quick_check).slice(0, 20), orphans });
  });

  // Mantenimiento: borra sesiones vencidas y referencias a elementos que ya no existen.
  router.post('/admin/system/cleanup', (req, res) => {
    const result = db.tx(() => ({
      sessions: db.run('DELETE FROM sessions WHERE expires_at <= ?', [now()]).changes,
      views: db.run("DELETE FROM views WHERE (target_type = 'person' AND target_id NOT IN (SELECT id FROM users)) OR (target_type = 'project' AND target_id NOT IN (SELECT id FROM projects))").changes,
      saves: db.run("DELETE FROM saves WHERE (target_type = 'person' AND target_id NOT IN (SELECT id FROM users)) OR (target_type = 'project' AND target_id NOT IN (SELECT id FROM projects))").changes,
      passes: db.run("DELETE FROM passes WHERE (target_type = 'person' AND target_id NOT IN (SELECT id FROM users)) OR (target_type = 'project' AND target_id NOT IN (SELECT id FROM projects))").changes
    }));
    audit(ctx, req, 'system.cleanup', { summary: Object.entries(result).map(([k, v]) => `${k}: ${v}`).join(' · '), data: result });
    res.json({ ok: true, removed: result });
  });
}
