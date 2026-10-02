import { PIPELINE } from '../../shared/catalog.js';
import { requireOnboarded } from '../auth.js';
import { brandAccent } from '../../shared/theme.js';
import { hasFeature, requireFeature } from '../plans.js';
import { parseProject, parseUser, personMini, projectMini } from '../serializers.js';
import { acceptInterest, declineInterest, pushCounts, serializeMatch } from '../services.js';
import { badRequest, forbidden, idParam, notFound, oneOf } from '../utils.js';

export default function interestRoutes(router, ctx) {
  const { db, hub } = ctx;

  // Proyecto para mostrar en listas: nunca uno oculto por moderación.
  const visibleProject = (projectId) => {
    if (!projectId) return null;
    const project = db.get("SELECT * FROM projects WHERE id = ? AND moderation = 'ok'", [projectId]);
    return project ? projectMini(parseProject(project)) : null;
  };

  const personWithSkills = (userId) => {
    const u = parseUser(db.get('SELECT * FROM users WHERE id = ?', [userId]));
    return u ? { ...personMini(u, hub), skills: u.skills.slice(0, 4), availability: u.availability, compensation: u.compensation } : null;
  };

  router.get('/interests/received', requireOnboarded, (req, res) => {
    // Las solicitudes de cuentas suspendidas no se muestran (vuelven si la cuenta se reactiva).
    const rows = db.all("SELECT i.* FROM interests i JOIN users u ON u.id = i.from_user_id WHERE i.to_user_id = ? AND i.status = 'pending' AND u.status = 'active' ORDER BY i.created_at DESC", [req.user.id]);
    if (!hasFeature(req.user, 'seeInterested')) {
      // Plan Free: solo el número y colores para las siluetas.
      const previews = rows.slice(0, 6).map((row) => ({ accent: brandAccent(db.get('SELECT accent FROM users WHERE id = ?', [row.from_user_id])?.accent, row.from_user_id) }));
      return res.json({ locked: true, count: rows.length, previews, items: [] });
    }
    res.json({
      locked: false,
      count: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        targetType: row.target_type,
        note: row.note,
        createdAt: row.created_at,
        person: personWithSkills(row.from_user_id),
        project: visibleProject(row.project_id)
      })).filter((item) => item.person)
    });
  });

  router.get('/interests/sent', requireOnboarded, (req, res) => {
    const rows = db.all("SELECT i.* FROM interests i JOIN users u ON u.id = i.to_user_id WHERE i.from_user_id = ? AND i.status != 'accepted' AND u.status = 'active' ORDER BY i.created_at DESC LIMIT 50", [req.user.id]);
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        targetType: row.target_type,
        createdAt: row.created_at,
        person: personMini(db.get('SELECT * FROM users WHERE id = ?', [row.to_user_id]), hub),
        project: row.target_type === 'project' ? visibleProject(row.target_id) : null
      })).filter((item) => item.person && (item.targetType !== 'project' || item.project))
    });
  });

  const receivedInterest = (req) => {
    const interest = db.get('SELECT * FROM interests WHERE id = ?', [idParam(req.params.id)]);
    if (!interest) throw notFound('Esta solicitud ya no existe.');
    if (interest.to_user_id !== req.user.id) throw forbidden();
    return interest;
  };

  router.post('/interests/:id/accept', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'seeInterested');
    const interest = receivedInterest(req);
    if (interest.status === 'declined') throw badRequest('Ya rechazaste esta solicitud.');
    const match = acceptInterest(ctx, interest);
    res.json({ match: serializeMatch(ctx, match, req.user.id) });
  });

  router.post('/interests/:id/decline', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'seeInterested');
    const interest = receivedInterest(req);
    if (interest.status === 'pending') declineInterest(ctx, interest);
    res.json({ ok: true });
  });

  // Retirar una solicitud enviada que todavía no terminó en match.
  router.delete('/interests/:id', requireOnboarded, (req, res) => {
    const interest = db.get('SELECT * FROM interests WHERE id = ?', [idParam(req.params.id)]);
    if (!interest) throw notFound('Esta solicitud ya no existe.');
    if (interest.from_user_id !== req.user.id) throw forbidden();
    if (interest.status === 'accepted') throw badRequest('Ya hicieron match: podés deshacerlo desde el chat.');
    db.run('DELETE FROM interests WHERE id = ?', [interest.id]);
    db.run("DELETE FROM notifications WHERE user_id = ? AND type = 'interest' AND actor_id = ? AND COALESCE(project_id, 0) = ?", [interest.to_user_id, req.user.id, interest.project_id || 0]);
    pushCounts(ctx, interest.to_user_id);
    res.json({ ok: true });
  });

  router.put('/interests/:id/pipeline', requireOnboarded, (req, res) => {
    requireFeature(req.user, 'candidatesPanel');
    const interest = receivedInterest(req);
    const stage = oneOf(req.body?.stage, PIPELINE, '');
    if (!stage) throw badRequest('Etapa inválida.');
    db.run('UPDATE interests SET pipeline = ? WHERE id = ?', [stage, interest.id]);
    res.json({ ok: true, pipeline: stage });
  });

  router.get('/interests/saved-by', requireOnboarded, (req, res) => {
    const me = req.user.id;
    const rows = db.all(
      `SELECT s.user_id, s.target_type, s.target_id, s.created_at FROM saves s JOIN users u ON u.id = s.user_id AND u.status = 'active'
       WHERE (s.target_type = 'person' AND s.target_id = ?)
          OR (s.target_type = 'project' AND s.target_id IN (SELECT id FROM projects WHERE owner_id = ?))
       ORDER BY s.created_at DESC LIMIT 60`,
      [me, me]
    );
    if (!hasFeature(req.user, 'seeInterested')) return res.json({ locked: true, count: rows.length, items: [] });
    res.json({
      locked: false,
      count: rows.length,
      items: rows.map((row) => ({
        createdAt: row.created_at,
        targetType: row.target_type,
        person: personWithSkills(row.user_id),
        project: row.target_type === 'project' ? visibleProject(row.target_id) : null
      })).filter((item) => item.person)
    });
  });
}
