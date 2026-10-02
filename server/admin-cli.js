import { hashPassword } from './auth.js';
import { config } from './config.js';
import { now, openDb } from './db.js';
import { migrateLegacyDbFile } from './migrate.js';
import { EMAIL_RE } from './utils.js';

// Consola de cuentas de administración. Las contraseñas nunca se guardan en archivos:
// se escriben al momento (sin eco) o llegan por la variable KEFOUNDER_ADMIN_PASSWORD.
//
//   npm run admin -- crear --email vos@kefounder.com --nombre "Tu Nombre"
//   npm run admin -- contrasena --email vos@kefounder.com
//   npm run admin -- listar
//   npm run admin -- quitar --email vos@kefounder.com

const HELP = `Uso:
  npm run admin -- crear --email <email> [--nombre "Nombre"]
  npm run admin -- contrasena --email <email>
  npm run admin -- listar
  npm run admin -- quitar --email <email>

La contraseña se pide sin mostrarla en pantalla, o se toma de KEFOUNDER_ADMIN_PASSWORD.`;

const MIN_LENGTH = 10;

function args(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      opts[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
      if (opts[rest[i].slice(2)] !== true) i += 1;
    }
  }
  return { command, opts };
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error('No hay terminal interactiva: definí KEFOUNDER_ADMIN_PASSWORD.'));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const done = (result, error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (error) reject(error); else resolve(result);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done(value);
        if (ch === '\u0003') return done(null, new Error('Cancelado.'));
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function readPassword() {
  const fromEnv = process.env.KEFOUNDER_ADMIN_PASSWORD;
  const password = fromEnv ?? await askHidden('Contraseña: ');
  if (!fromEnv) {
    const again = await askHidden('Repetila: ');
    if (again !== password) throw new Error('Las contraseñas no coinciden.');
  }
  if (password.length < MIN_LENGTH) throw new Error(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('Usá letras y números en la contraseña.');
  return password;
}

const emailOf = (opts) => {
  const email = String(opts.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Indicá un email válido con --email.');
  return email;
};

async function main() {
  const { command, opts } = args(process.argv.slice(2));
  if (!command || opts.help) { console.log(HELP); return; }
  migrateLegacyDbFile(config.dbPath);
  const db = openDb(config.dbPath);
  try {
    if (command === 'listar') {
      const rows = db.all("SELECT id, name, email, status, created_at, last_active_at FROM users WHERE role = 'admin' ORDER BY id");
      if (!rows.length) console.log('No hay cuentas de administración.');
      for (const r of rows) console.log(`#${r.id}  ${r.email}  ${r.name}  ${r.status}  alta ${r.created_at.slice(0, 10)}  última actividad ${r.last_active_at ? r.last_active_at.slice(0, 16).replace('T', ' ') : '—'}`);
      return;
    }

    const email = emailOf(opts);
    const existing = db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (command === 'crear') {
      if (existing?.role === 'admin') throw new Error('Esa cuenta ya es de administración. Para cambiar la contraseña usá: npm run admin -- contrasena --email ' + email);
      if (existing) throw new Error('Ya existe una cuenta de usuario con ese email. Usá otro email para administración.');
      const name = typeof opts.nombre === 'string' && opts.nombre.trim().length >= 2 ? opts.nombre.trim().slice(0, 80) : 'Administración';
      const hash = await hashPassword(await readPassword());
      const at = now();
      const id = db.run(
        `INSERT INTO users (email, password_hash, name, headline, role, segment, status, onboarded, email_verified, visible, settings, created_at, last_active_at)
         VALUES (?, ?, ?, 'Administración', 'admin', 'staff', 'active', 0, 1, 0, ?, ?, NULL)`,
        [email, hash, name, JSON.stringify({ notifications: {} }), at]
      ).lastInsertRowid;
      db.run("INSERT INTO admin_audit (admin_id, action, target_type, target_id, summary, data, created_at) VALUES (?, 'system.admin_create', 'user', ?, ?, '{}', ?)", [id, id, `Cuenta de administración creada desde la consola: ${email}`, at]);
      console.log(`✔ Cuenta de administración creada: ${email} (#${id}). Ingresá en /ingresar y vas directo al panel.`);
      return;
    }

    if (!existing || existing.role !== 'admin') throw new Error('No hay una cuenta de administración con ese email.');

    if (command === 'contrasena' || command === 'contraseña') {
      const hash = await hashPassword(await readPassword());
      db.tx(() => {
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, existing.id]);
        db.run('DELETE FROM sessions WHERE user_id = ?', [existing.id]);
      });
      db.run("INSERT INTO admin_audit (admin_id, action, target_type, target_id, summary, data, created_at) VALUES (?, 'system.admin_password', 'user', ?, 'Contraseña cambiada desde la consola; sesiones cerradas', '{}', ?)", [existing.id, existing.id, now()]);
      console.log('✔ Contraseña actualizada. Se cerraron las sesiones abiertas de esa cuenta.');
      return;
    }

    if (command === 'quitar') {
      const admins = db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'").n;
      if (admins <= 1 && !opts.forzar) throw new Error('Es la única cuenta de administración. Si igual querés quitarla, agregá --forzar.');
      db.tx(() => {
        db.run("UPDATE users SET role = 'user', segment = 'test' WHERE id = ?", [existing.id]);
        db.run('DELETE FROM sessions WHERE user_id = ?', [existing.id]);
      });
      console.log(`✔ ${email} ya no tiene acceso al panel.`);
      return;
    }

    throw new Error(`Comando desconocido: ${command}\n\n${HELP}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`✖ ${error.message}`);
  process.exitCode = 1;
});
