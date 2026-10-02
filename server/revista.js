import { excerptOf, formatLabel, parseArticle, readingMinutes, sectionLabel } from '../shared/revista.js';
import { now, parseJson } from './db.js';
import { SAMPLE_ARTICLES } from './revista-samples.js';

// Revista: qué se considera publicado, cómo se muestra cada nota y las lecturas por día.

// Publicada y con fecha cumplida (una fecha futura es una nota programada).
export const PUBLIC_WHERE = "a.status = 'published' AND a.published_at IS NOT NULL AND a.published_at <= :now";

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const person = (a) => (a.person_name ? { name: a.person_name, role: a.person_role, company: a.person_company, photo: a.person_photo } : null);

export function articleCard(a) {
  return {
    id: a.id,
    slug: a.slug,
    section: a.section,
    sectionLabel: sectionLabel(a.section),
    format: a.format,
    formatLabel: formatLabel(a.format),
    title: a.title,
    dek: a.dek,
    cover: a.cover,
    author: a.author,
    person: person(a),
    readingMinutes: a.reading_minutes,
    publishedAt: a.published_at,
    featured: Boolean(a.featured),
    promoted: Boolean(a.promoted)
  };
}

// El proyecto vinculado se muestra solo si su página pública está disponible.
function linkedProject(db, projectId) {
  if (!projectId) return null;
  const p = db.get(
    `SELECT p.id, p.name, p.tagline, p.logo, p.accent, p.stage FROM projects p JOIN users u ON u.id = p.owner_id
     WHERE p.id = ? AND p.status = 'published' AND p.moderation = 'ok' AND u.status = 'active'`,
    [projectId]
  );
  return p || null;
}

export function articleDetail(db, a) {
  const blocks = parseArticle(a.body);
  return {
    ...articleCard(a),
    coverCredit: a.cover_credit,
    tags: parseJson(a.tags, []),
    blocks,
    excerpt: a.dek || excerptOf(blocks),
    project: linkedProject(db, a.project_id),
    updatedAt: a.updated_at,
    sample: Boolean(a.is_sample)
  };
}

// Las más leídas de los últimos días (con las lecturas totales como desempate).
export function mostRead(db, { days = 30, limit = 5, exclude = 0 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  return db.all(
    `SELECT a.*, COALESCE(SUM(d.views), 0) AS recent FROM articles a
     LEFT JOIN article_daily d ON d.article_id = a.id AND d.day >= :since
     WHERE ${PUBLIC_WHERE} AND a.id != :exclude
     GROUP BY a.id ORDER BY recent DESC, a.views DESC, a.published_at DESC LIMIT :limit`,
    { since: localDay(since), now: now(), exclude, limit }
  ).map(articleCard);
}

export function recordArticleView(db, articleId, count = 1, day = localDay()) {
  db.tx(() => {
    db.run('UPDATE articles SET views = views + ? WHERE id = ?', [count, articleId]);
    db.run(
      'INSERT INTO article_daily (article_id, day, views) VALUES (?, ?, ?) ON CONFLICT(article_id, day) DO UPDATE SET views = views + excluded.views',
      [articleId, day, count]
    );
  });
}

// Datos para compartir una página de la revista (los completa el servidor en el HTML).
export function revistaMeta(db, req) {
  const origin = `${req.protocol}://${req.get('host')}`;
  const absolute = (url) => (!url ? '' : url.startsWith('https://images.unsplash.com/') ? `${url}?auto=format&fit=crop&w=1200&h=630&q=80` : `${origin}${url}`);
  const match = /^\/revista\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(req.path);
  if (match) {
    const a = db.get(`SELECT * FROM articles a WHERE a.slug = :slug AND ${PUBLIC_WHERE}`, { slug: match[1], now: now() });
    if (a) {
      return {
        type: 'article',
        title: `${a.title} · Revista KeFounder!`,
        description: a.dek || excerptOf(parseArticle(a.body), 180),
        image: absolute(a.cover),
        url: `${origin}/revista/${a.slug}`
      };
    }
  }
  return {
    type: 'website',
    title: 'Revista KeFounder! · Startups, founders y entrevistas',
    description: 'Entrevistas, startups, founders e inversión: las historias de quienes están construyendo en la región.',
    image: '',
    url: `${origin}/revista`
  };
}

// ---------- Notas de ejemplo ----------
const meta = {
  get: (db, key) => db.get('SELECT value FROM app_meta WHERE key = ?', [key])?.value,
  set: (db, key, value) => db.run('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)])
};

export function removeSampleArticles(db) {
  return db.run('DELETE FROM articles WHERE is_sample = 1').changes;
}

// Carga las notas de ejemplo una sola vez: si después se borran desde el panel, no vuelven.
export function ensureSampleArticles(db, { force = false } = {}) {
  if (!force && meta.get(db, 'revista_samples')) return 0;
  let created = 0;
  db.tx(() => {
    SAMPLE_ARTICLES.forEach((s, index) => {
      if (db.get('SELECT 1 FROM articles WHERE slug = ?', [s.slug])) return;
      const publishedAt = new Date(Date.now() - s.daysAgo * 86400000);
      const blocks = parseArticle(s.body);
      const project = s.project
        ? db.get("SELECT p.id FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.name = ? AND (u.is_demo = 1 OR u.email LIKE '%@kefounder.demo') ORDER BY p.id DESC LIMIT 1", [s.project])
        : null;
      const id = db.run(
        `INSERT INTO articles (slug, section, format, title, dek, body, cover, cover_credit, author, person_name, person_role, person_company, person_photo,
           project_id, tags, status, featured, is_sample, reading_minutes, views, published_at, created_at, updated_at)
         VALUES (:slug, :section, :format, :title, :dek, :body, :cover, 'Foto: Unsplash', 'Redacción KeFounder!', :pname, :prole, :pcompany, :pphoto,
           :project, :tags, 'published', :featured, 1, :minutes, 0, :published, :published, :published)`,
        {
          slug: s.slug, section: s.section, format: s.format, title: s.title, dek: s.dek, body: s.body, cover: s.cover,
          pname: s.person?.name || '', prole: s.person?.role || '', pcompany: s.person?.company || '', pphoto: s.person?.photo || '',
          project: project?.id ?? null, tags: JSON.stringify(s.tags || []), featured: s.featured ? 1 : 0,
          minutes: readingMinutes(blocks), published: publishedAt.toISOString()
        }
      ).lastInsertRowid;
      // Lecturas repartidas desde la publicación, más en los primeros días (para "Lo más leído").
      const span = Math.max(1, Math.ceil(s.daysAgo));
      let left = s.views;
      for (let d = 0; d < span && left > 0; d += 1) {
        const share = d === span - 1 ? left : Math.max(1, Math.round(left * (0.42 - (index % 3) * 0.04)));
        const day = new Date(publishedAt.getTime() + d * 86400000);
        recordArticleView(db, id, Math.min(left, share), localDay(day > new Date() ? new Date() : day));
        left -= Math.min(left, share);
      }
      created += 1;
    });
    meta.set(db, 'revista_samples', now());
  });
  return created;
}
