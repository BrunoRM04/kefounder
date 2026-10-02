import { requireAdmin } from '../auth.js';
import { createCache } from './common.js';
import contentRoutes from './content.js';
import metricRoutes from './metrics.js';
import systemRoutes from './system.js';
import trackingRoutes from './tracking.js';
import userRoutes from './users.js';

// Panel de administración: todo bajo /api/admin, solo para cuentas con rol admin.
export default function adminRoutes(router, ctx) {
  ctx.adminCache = ctx.adminCache || createCache(30000);
  router.use('/admin', requireAdmin, (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex');
    next();
  });
  for (const register of [metricRoutes, userRoutes, contentRoutes, trackingRoutes, systemRoutes]) register(router, ctx);
}
