import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { requireAuth } from '../auth.js';
import { now } from '../db.js';
import { HttpError, badRequest } from '../utils.js';

const MAX_BYTES = 5 * 1024 * 1024;
const DAILY_UPLOADS = 120;

// Tipos permitidos y su extensión. Nada de HTML/SVG para evitar XSS.
const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
};

const MAGIC = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': (b) => b.subarray(0, 3).toString() === 'GIF',
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 4).toString() === '%PDF'
};

export const isInlineImage = (file) => /\.(jpg|png|webp|gif)$/i.test(file);

export default function uploadRoutes(router, ctx) {
  const { db, config } = ctx;
  fs.mkdirSync(config.uploadsDir, { recursive: true });

  router.post('/uploads', requireAuth, express.raw({ type: () => true, limit: MAX_BYTES }), (req, res) => {
    const recent = db.get('SELECT COUNT(*) AS n FROM uploads WHERE user_id = ? AND created_at >= ?', [req.user.id, new Date(Date.now() - 86400000).toISOString()]).n;
    if (recent >= DAILY_UPLOADS) throw new HttpError(429, 'Llegaste al máximo de archivos por hoy. Probá de nuevo mañana.');
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const ext = TYPES[mime];
    if (!ext) throw badRequest('Ese tipo de archivo no está permitido. Probá con imágenes, PDF o documentos.');
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw badRequest('El archivo está vacío.');
    if (MAGIC[mime] && !MAGIC[mime](buffer)) throw badRequest('El archivo no coincide con su tipo.');
    let original = 'archivo';
    try { original = decodeURIComponent(String(req.headers['x-file-name'] || 'archivo')); } catch { /* nombre por defecto */ }
    original = original.replace(/[\\/\r\n"]/g, '').slice(0, 120) || 'archivo';
    const filename = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(config.uploadsDir, filename), buffer);
    db.run('INSERT INTO uploads (user_id, filename, original_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, filename, original, mime, buffer.length, now()]);
    res.status(201).json({ url: `/uploads/${filename}`, name: original, size: buffer.length, mime });
  });
}
