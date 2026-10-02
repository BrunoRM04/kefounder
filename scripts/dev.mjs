// Levanta la API (puerto 3000) y Vite (puerto 5173) en paralelo.
import { spawn } from 'node:child_process';

const run = (name, args) => {
  const child = spawn('npm', ['run', name, ...args], { stdio: 'inherit', shell: true, env: { ...process.env, PORT: process.env.PORT || '3000' } });
  child.on('exit', (code) => {
    if (code) console.log(`[${name}] terminó con código ${code}`);
    process.exit(code ?? 0);
  });
  return child;
};

const children = [run('dev:api', []), run('dev:web', [])];
const stop = () => children.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
