import { REVISTA_FORMATS, REVISTA_SECTIONS, SLUG_RE } from '../../shared/revista.js';
import { now } from '../db.js';
import { PUBLIC_WHERE, articleCard, articleDetail, mostRead, recordArticleView } from '../revista.js';
import { notFound, str } from '../utils.js';

const PAGE_SIZE = 12;
const VIEW_WINDOW_MS = 6 * 3600000;
const MAX_SEEN = 20000;
const like = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Revista pública: se lee sin cuenta. Solo muestra notas publicadas con fecha cumplida.
export default function revistaRoutes(router, ctx) {
  const { db } = ctx;
  const seen = new Map(); // ip:nota → última lectura contada

  const latest = ({ where = '', params = {}, limit = 6, exclude = [] } = {}) => db.all(
    `SELECT a.* FROM articles a WHERE ${PUBLIC_WHERE} ${where}
     ${exclude.length ? `AND a.id NOT IN (${exclude.map((id) => Number(id)).join(',')})` : ''}
     ORDER BY a.published_at DESC, a.id DESC LIMIT :limit`,
    { now: now(), limit, ...params }
  ).map(articleCard);

  router.get('/revista/home', (_req, res) => {
    const featuredRow = db.get(`SELECT a.* FROM articles a WHERE ${PUBLIC_WHERE} ORDER BY a.featured DESC, a.published_at DESC LIMIT 1`, { now: now() });
    if (!featuredRow) return res.json({ featured: null, latest: [], interviews: [], sections: [], mostRead: [], quote: null, total: 0 });
    const featured = articleCard(featuredRow);
    // Como en un diario, una nota puede estar en "Lo último" y también en su sección; solo la de portada no se repite.
    const top = latest({ limit: 4, exclude: [featured.id] });
    const interviews = latest({ where: "AND a.format = 'entrevista'", limit: 3, exclude: [featured.id] });
    const sections = REVISTA_SECTIONS.filter((s) => s.id !== 'entrevistas').map((s) => ({
      ...s,
      items: latest({ where: 'AND a.section = :section', params: { section: s.id }, limit: 3, exclude: [featured.id] })
    })).filter((s) => s.items.length);

    // La frase destacada: la primera cita de la entrevista más reciente que tenga una.
    let quote = null;
    for (const row of db.all(`SELECT a.* FROM articles a WHERE ${PUBLIC_WHERE} AND a.body LIKE '%>%' ORDER BY a.published_at DESC LIMIT 6`, { now: now() })) {
      const detail = articleDetail(db, row);
      const block = detail.blocks.find((b) => b.type === 'quote');
      if (block) { quote = { text: block.text.map((p) => p.v).join(''), by: block.by || detail.person?.name || '', article: articleCard(row) }; break; }
    }

    res.json({
      featured,
      latest: top,
      interviews,
      sections,
      mostRead: mostRead(db, { limit: 5 }),
      quote,
      total: db.get(`SELECT COUNT(*) AS n FROM articles a WHERE ${PUBLIC_WHERE}`, { now: now() }).n
    });
  });

  router.get('/revista/articles', (req, res) => {
    const conditions = [];
    const params = { now: now() };
    const section = REVISTA_SECTIONS.some((s) => s.id === req.query.section) ? req.query.section : '';
    if (section) { conditions.push('a.section = :section'); params.section = section; }
    const format = REVISTA_FORMATS.some((f) => f.id === req.query.format) ? req.query.format : '';
    if (format) { conditions.push('a.format = :format'); params.format = format; }
    const q = str(req.query.q, 80);
    if (q) {
      // Sin distinguir mayúsculas ni tildes: "mendez" encuentra a Méndez.
      conditions.push("(fold(a.title) LIKE fold(:q) ESCAPE '\\' OR fold(a.dek) LIKE fold(:q) ESCAPE '\\' OR fold(a.person_name) LIKE fold(:q) ESCAPE '\\' OR fold(a.person_company) LIKE fold(:q) ESCAPE '\\' OR fold(a.tags) LIKE fold(:q) ESCAPE '\\')");
      params.q = like(q);
    }
    const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
    const page = Math.min(1000, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const total = db.get(`SELECT COUNT(*) AS n FROM articles a WHERE ${PUBLIC_WHERE} ${where}`, params).n;
    const items = db.all(
      `SELECT a.* FROM articles a WHERE ${PUBLIC_WHERE} ${where} ORDER BY a.published_at DESC, a.id DESC LIMIT :limit OFFSET :offset`,
      { ...params, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
    ).map(articleCard);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), section, format, q });
  });

  const findArticle = (req) => {
    const slug = String(req.params.slug || '');
    if (!SLUG_RE.test(slug)) throw notFound('Esta nota no existe.');
    const row = db.get('SELECT * FROM articles WHERE slug = ?', [slug]);
    const isPublic = row && row.status === 'published' && row.published_at && row.published_at <= now();
    // Administración puede ver borradores y notas programadas como vista previa.
    if (!row || (!isPublic && req.user?.role !== 'admin')) throw notFound('Esta nota no existe o todavía no se publicó.');
    return { row, isPublic };
  };

  router.get('/revista/articles/:slug', (req, res) => {
    const { row, isPublic } = findArticle(req);
    const article = articleDetail(db, row);
    const related = latest({ where: 'AND a.section = :section', params: { section: row.section }, limit: 3, exclude: [row.id] });
    if (related.length < 3) related.push(...latest({ limit: 3 - related.length, exclude: [row.id, ...related.map((a) => a.id)] }));
    res.json({ article, related, mostRead: mostRead(db, { limit: 5, exclude: row.id }), preview: !isPublic });
  });

  // Cuenta una lectura por persona y nota cada 6 horas (las de administración no cuentan).
  router.post('/revista/articles/:slug/view', (req, res) => {
    const { row, isPublic } = findArticle(req);
    if (!isPublic || req.user?.role === 'admin') return res.json({ ok: true, counted: false });
    const key = `${req.ip}:${row.id}`;
    const at = Date.now();
    if (at - (seen.get(key) || 0) < VIEW_WINDOW_MS) return res.json({ ok: true, counted: false });
    // Registro acotado: se reinserta al final y, si crece demasiado, se descartan los más viejos.
    seen.delete(key);
    seen.set(key, at);
    while (seen.size > MAX_SEEN) seen.delete(seen.keys().next().value);
    recordArticleView(db, row.id);
    res.json({ ok: true, counted: true });
  });
}
