import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import adminRoutes from './admin/index.js';
import { sessionMiddleware } from './auth.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import discoverRoutes from './routes/discover.js';
import helpRoutes from './routes/help.js';
import interestRoutes from './routes/interests.js';
import matchRoutes from './routes/matches.js';
import notificationRoutes from './routes/notifications.js';
import peopleRoutes from './routes/people.js';
import profileRoutes from './routes/profile.js';
import pressRoutes from './routes/press.js';
import projectRoutes from './routes/projects.js';
import revistaRoutes from './routes/revista.js';
import uploadRoutes, { isInlineImage } from './routes/uploads.js';
import { revistaMeta } from './revista.js';
import { HttpError } from './utils.js';

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "script-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function withMeta(html, meta) {
  const tags = [
    ['og:type', meta.type], ['og:site_name', 'KeFounder!'], ['og:title', meta.title], ['og:description', meta.description],
    ['og:url', meta.url], meta.image && ['og:image', meta.image], ['twitter:card', meta.image ? 'summary_large_image' : 'summary']
  ].filter(Boolean).map(([key, value]) => `<meta ${key.startsWith('twitter') ? 'name' : 'property'}="${key}" content="${escapeAttr(value)}" />`);
  tags.push(`<link rel="canonical" href="${escapeAttr(meta.url)}" />`);
  return html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttr(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${escapeAttr(meta.description)}" />`)
    .replace('</head>', () => `  ${tags.join('\n    ')}\n  </head>`);
}

export function createApp(ctx, { serveDist = false } = {}) {
  const { db, config } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', /^\d+$/.test(String(config.trustProxy)) ? Number(config.trustProxy) : config.trustProxy || 'loopback');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  const api = express.Router();
  api.use(express.json({ limit: '200kb' }));

  // Protección CSRF: las peticiones que modifican datos deben venir del mismo origen.
  api.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.host) return next(new HttpError(403, 'Origen no permitido.'));
      } catch {
        return next(new HttpError(403, 'Origen no permitido.'));
      }
    }
    next();
  });

  api.use(sessionMiddleware(db));
  api.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  for (const register of [authRoutes, profileRoutes, discoverRoutes, peopleRoutes, projectRoutes, interestRoutes, matchRoutes, notificationRoutes, billingRoutes, uploadRoutes, revistaRoutes, pressRoutes, helpRoutes, adminRoutes]) {
    register(api, ctx);
  }
  api.use((_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada.')));
  app.use('/api', api);

  // Archivos subidos: imágenes en línea, el resto siempre como descarga.
  app.get('/uploads/:file', (req, res, next) => {
    const file = path.basename(req.params.file);
    const row = db.get('SELECT * FROM uploads WHERE filename = ?', [file]);
    const full = path.join(config.uploadsDir, file);
    if (!row || !fs.existsSync(full)) return next(new HttpError(404, 'Archivo no encontrado.'));
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    if (isInlineImage(file)) return res.sendFile(full, { headers: { 'Content-Type': row.mime } });
    res.attachment(row.original_name);
    res.sendFile(full, { headers: { 'Content-Type': row.mime } });
  });

  if (serveDist) {
    app.use('/assets', express.static(path.join(config.distDir, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(config.distDir, { index: false, maxAge: '1h' }));
    const indexHtml = path.join(config.distDir, 'index.html');
    // Sin parámetros de ruta: una dirección mal escrita ("%E0%A4") llega igual a la app, que muestra su aviso.
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      res.setHeader('Content-Security-Policy', CSP);
      res.setHeader('Cache-Control', 'no-cache');
      // La revista se comparte: el título, el resumen y la foto viajan en la página para WhatsApp, LinkedIn o X.
      const meta = req.path.startsWith('/revista') ? revistaMeta(db, req) : null;
      if (!meta) return res.sendFile(indexHtml);
      res.type('html').send(withMeta(fs.readFileSync(indexHtml, 'utf8'), meta));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, _next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, ...error.extra });
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo supera el máximo de 5 MB.' });
    if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'No pudimos leer la solicitud.' });
    if (error instanceof URIError) return res.status(400).json({ error: 'La dirección no es válida.' });
    console.error('[error]', req.method, req.originalUrl, error);
    res.status(500).json({ error: 'Algo salió mal. Probá de nuevo en un momento.' });
  });

  return app;
}
