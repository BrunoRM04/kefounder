import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const launch = (dataDir, port) => {
  const env = { ...process.env, KEFOUNDER_DATA_DIR: dataDir, HOST: '127.0.0.1', PORT: String(port) };
  delete env.KEFOUNDER_DEMO;
  delete env.FOUND_DEMO;
  delete env.KEFOUNDER_DEMO_BOTS;
  delete env.FOUND_DEMO_BOTS;
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  return { child, output: () => output };
};
const waitForConfig = async (port, child, output) => {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) throw new Error(output());
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/config`);
      if (response.ok) return response.json();
    } catch { /* servidor iniciando */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('El servidor no inició: ' + output());
};
const stop = (child) => new Promise((resolve) => {
  if (child.exitCode !== null) return resolve(child.exitCode);
  child.once('exit', (code) => resolve(code));
  child.kill();
});

test('un arranque nuevo sin variables demo no siembra personas ni proyectos ficticios', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-real-start-'));
  const port = await freePort();
  const { child, output } = launch(dataDir, port);
  try {
    const config = await waitForConfig(port, child, output);
    assert.equal(config.demo, false);
    assert.deepEqual(config.demoAccounts, []);
  } finally {
    await stop(child);
    const db = openDb(path.join(dataDir, 'kefounder.db'));
    assert.equal(db.get('SELECT COUNT(*) AS n FROM users').n, 0);
    assert.equal(db.get('SELECT COUNT(*) AS n FROM projects').n, 0);
    db.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('el modo real rechaza una base con demo existente sin borrar sus cuentas', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kefounder-demo-guard-'));
  const dbPath = path.join(dataDir, 'kefounder.db');
  const db = openDb(dbPath);
  await seed(db);
  const originalCount = db.get('SELECT COUNT(*) AS n FROM users').n;
  db.close();
  const { child, output } = launch(dataDir, await freePort());
  try {
    const code = await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('El servidor no se detuvo ante una base demo.')), 5000))
    ]);
    assert.notEqual(code, 0);
    assert.match(output(), /La base contiene cuentas de demostración/);
    const after = openDb(dbPath);
    assert.equal(after.get('SELECT COUNT(*) AS n FROM users').n, originalCount);
    after.close();
  } finally {
    await stop(child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
