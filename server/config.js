import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Variables KEFOUNDER_*; las FOUND_* de antes del cambio de nombre siguen funcionando.
const env = (name) => process.env[`KEFOUNDER_${name}`] ?? process.env[`FOUND_${name}`];
const dataDir = env('DATA_DIR') ? path.resolve(env('DATA_DIR')) : path.join(root, 'data');

export const config = {
  root,
  port: Number(process.env.PORT) || 3000,
  // Detrás de un proxy (Nginx, Cloudflare…) indicá cuál es para leer la IP real: "1", "loopback", una IP…
  trustProxy: env('TRUST_PROXY') || 'loopback',
  host: process.env.HOST || '0.0.0.0',
  dataDir,
  dbPath: path.join(dataDir, 'kefounder.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  backupsDir: path.join(dataDir, 'backups'),
  distDir: path.join(root, 'dist'),
  // Modo demo: muestra accesos rápidos a cuentas de prueba en la bienvenida.
  demo: env('DEMO') !== '0',
  // Perfiles de ejemplo que aceptan conexiones y responden mensajes.
  bots: env('DEMO_BOTS') !== '0',
  demoAccounts: DEMO_ACCOUNTS.map(({ email, name, plan, headline }) => ({ email, password: DEMO_PASSWORD, name, plan, headline }))
};
