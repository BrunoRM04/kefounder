import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.js';
import { createBots } from './bots.js';
import { config } from './config.js';
import { openDb } from './db.js';
import { migrateDemoAccounts, migrateLegacyDbFile } from './migrate.js';
import { closeWeeks, ensureSampleHelp } from './help.js';
import { createHub } from './realtime.js';
import { ensureSampleArticles } from './revista.js';
import { isEmpty, seed } from './seed.js';
import { notify } from './services.js';

if (migrateLegacyDbFile(config.dbPath)) console.log('✳ Base migrada: data/found.db → data/kefounder.db (la original quedó como found-legacy.db).');
const db = openDb(config.dbPath);
if (isEmpty(db)) {
  await seed(db);
  console.log('✳ Base de datos creada con datos de demostración.');
} else if (await migrateDemoAccounts(db)) {
  console.log('✳ Cuentas demo actualizadas al dominio @kefounder.demo.');
}

// Revista: en modo demo arranca con notas de ejemplo (una sola vez; si se borran, no vuelven).
if (config.demo) {
  const samples = ensureSampleArticles(db);
  if (samples) console.log(`✳ Revista: ${samples} notas de ejemplo cargadas.`);
  const help = ensureSampleHelp(db);
  if (help) console.log(`✳ Necesito ayuda con…: ${help} pedidos de ejemplo cargados.`);
}

const hub = createHub();
const ctx = { db, hub, config };
ctx.bots = createBots(ctx, { enabled: config.bots });
ctx.bots.startAmbient();

// Ranking semanal de «Necesito ayuda con…»: al empezar cada semana se guarda el podio de la anterior.
const closeHelpWeeks = () => {
  try {
    closeWeeks(db, { onAward: (a) => notify(ctx, a.userId, 'help_award', { data: { place: a.place, week: a.week, points: a.points } }) });
  } catch (error) {
    console.error('[ayuda] no se pudo cerrar la semana', error);
  }
};
closeHelpWeeks();
setInterval(closeHelpWeeks, 30 * 60 * 1000).unref();

const serveDist = fs.existsSync(path.join(config.distDir, 'index.html'));
const app = createApp(ctx, { serveDist });

const server = app.listen(config.port, config.host, () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => `http://${iface.address}:${config.port}`);
  console.log(`\n  KeFounder! listo ${serveDist ? '(frontend compilado)' : '(solo API — usá npm run dev para el frontend)'}`);
  console.log(`  Local:  http://localhost:${config.port}`);
  for (const url of lan) console.log(`  Red:    ${url}`);
  if (config.demo) console.log(`  Demo:   ${config.demoAccounts.map((a) => a.email).join(' · ')} — contraseña ${config.demoAccounts[0].password}`);
  const admins = db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n;
  console.log(admins
    ? `  Panel:  http://localhost:${config.port}/admin (${admins} ${admins === 1 ? 'cuenta' : 'cuentas'} de administración)`
    : '  Panel:  sin cuentas de administración — creá una con: npm run admin -- crear --email <email>');
  console.log(`  Revista: http://localhost:${config.port}/revista`);
  console.log(`  Bots de demo: ${config.bots ? 'activos' : 'apagados'}\n`);
});

const shutdown = () => {
  ctx.bots.stop();
  hub.closeAll();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
