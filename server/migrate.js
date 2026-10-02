import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, verifyPassword } from './auth.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed-data.js';

// FOUND → KeFounder!: la base pasa de data/found.db a data/kefounder.db.
// La original queda como data/found-legacy.db por las dudas.
export function migrateLegacyDbFile(dbPath) {
  const dir = path.dirname(dbPath);
  const legacy = path.join(dir, 'found.db');
  if (fs.existsSync(dbPath) || !fs.existsSync(legacy)) return false;
  const old = new DatabaseSync(legacy);
  old.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  old.exec(`VACUUM INTO '${dbPath.replace(/'/g, "''")}'`);
  old.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = legacy + suffix;
    if (fs.existsSync(file)) fs.renameSync(file, path.join(dir, `found-legacy.db${suffix}`));
  }
  return true;
}

// Cuentas demo con el dominio y la contraseña nuevos. Solo toca cuentas demo;
// las cuentas reales no cambian.
export async function migrateDemoAccounts(db, { legacyPassword = 'found1234' } = {}) {
  let changed = 0;
  changed += db.run(
    `UPDATE users SET email = replace(email, '@found.demo', '@kefounder.demo')
     WHERE email LIKE '%@found.demo'
       AND NOT EXISTS (SELECT 1 FROM users other WHERE other.email = replace(users.email, '@found.demo', '@kefounder.demo'))`
  ).changes;
  changed += db.run("UPDATE users SET email = replace(email, '@demo.found', '@demo.kefounder') WHERE email LIKE '%@demo.found'").changes;
  for (const account of DEMO_ACCOUNTS) {
    const row = db.get('SELECT id, password_hash FROM users WHERE email = ?', [account.email]);
    if (row && await verifyPassword(legacyPassword, row.password_hash)) {
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(DEMO_PASSWORD), row.id]);
      changed += 1;
    }
  }
  return changed;
}
