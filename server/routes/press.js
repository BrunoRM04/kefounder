import { requireOnboarded } from '../auth.js';
import { now } from '../db.js';
import { requireFeature } from '../plans.js';
import { pressAllowance, serializePress } from '../press.js';
import { HttpError, badRequest, forbidden, idParam, notFound, safeUrl, str } from '../utils.js';

const INSTAGRAM_RE = /^@?([A-Za-z0-9._]{1,30})$/;
const dateLabel = (iso) => new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });

// Difusión desde la cuenta de la startup: ver el cupo, pedir y seguir el estado.
export default function pressRoutes(router, ctx) {
  const { db } = ctx;

  const payload = (user) => ({
    allowance: pressAllowance(db, user),
    items: db.all('SELECT * FROM press_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30', [user.id]).map((r) => serializePress(db, r)),
    projects: db.all("SELECT id, name, tagline, logo, accent, website FROM projects WHERE owner_id = ? AND status = 'published' AND moderation = 'ok' ORDER BY updated_at DESC", [user.id])
  });

  router.get('/me/press', requireOnboarded, (req, res) => res.json(payload(req.user)));

  router.post('/me/press', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'pressMention');
    const allowance = pressAllowance(db, req.user);
    if (!allowance.available) {
      throw new HttpError(429, `Ya usaste la difusión de este ${allowance.period}. La próxima se habilita el ${dateLabel(allowance.nextAt)}.`, { code: 'press_quota', nextAt: allowance.nextAt });
    }
    const body = req.body ?? {};
    const project = db.get("SELECT * FROM projects WHERE id = ? AND owner_id = ? AND status = 'published' AND moderation = 'ok'", [idParam(body.projectId), req.user.id]);
    if (!project) throw badRequest('Elegí uno de tus proyectos publicados.', { field: 'projectId' });
    const pitch = str(body.pitch, 1200);
    if (pitch.length < 40) throw badRequest('Contanos un poco más: al menos un par de frases sobre qué hacen y qué quieren contar.', { field: 'pitch' });
    const spokesperson = str(body.spokesperson, 80);
    if (spokesperson.length < 2) throw badRequest('Decinos quién va a hablar por la startup.', { field: 'spokesperson' });
    let instagram = str(body.instagram, 31);
    if (instagram) {
      const m = INSTAGRAM_RE.exec(instagram);
      if (!m) throw badRequest('Escribí el usuario de Instagram así: @tustartup', { field: 'instagram' });
      instagram = `@${m[1]}`;
    }
    const website = safeUrl(body.website);
    if (body.website && !website) throw badRequest('Revisá el sitio web.', { field: 'website' });
    const at = now();
    db.run(
      `INSERT INTO press_requests (user_id, project_id, project_name, kind, plan, status, pitch, spokesperson, spokesperson_role, instagram, website, contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, project.id, project.name, allowance.kind, req.user.plan, pitch, spokesperson, str(body.spokespersonRole, 80), instagram, website, str(body.contact, 80), at, at]
    );
    ctx.adminCache?.clear();
    res.status(201).json(payload(req.user));
  });

  // Mientras nadie lo tomó, se puede cancelar y el cupo vuelve.
  router.delete('/me/press/:id', requireOnboarded, (req, res) => {
    const request = db.get('SELECT * FROM press_requests WHERE id = ?', [idParam(req.params.id)]);
    if (!request) throw notFound('Este pedido ya no existe.');
    if (request.user_id !== req.user.id) throw forbidden();
    if (request.status !== 'pending') throw badRequest('El equipo ya está trabajando en este pedido: escribinos si querés cambiar algo.');
    db.run("UPDATE press_requests SET status = 'canceled', updated_at = ? WHERE id = ?", [now(), request.id]);
    ctx.adminCache?.clear();
    res.json(payload(req.user));
  });
}
