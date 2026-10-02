// Revista KeFounder!: secciones, formatos y el formato de escritura de las notas.
// Lo usan el servidor (validar, calcular lectura y resumen) y el navegador (mostrar y previsualizar).

export const REVISTA_SECTIONS = [
  { id: 'entrevistas', label: 'Entrevistas', hint: 'Conversaciones con quienes están construyendo.' },
  { id: 'startups', label: 'Startups', hint: 'Proyectos que vale la pena seguir de cerca.' },
  { id: 'founders', label: 'Founders', hint: 'Fundadores, CEOs y sus decisiones.' },
  { id: 'inversion', label: 'Inversión', hint: 'Capital, rondas y cómo se financian los proyectos.' },
  { id: 'ecosistema', label: 'Ecosistema', hint: 'Noticias, comunidades y lo que se mueve en la región.' }
];

export const REVISTA_FORMATS = [
  { id: 'entrevista', label: 'Entrevista' },
  { id: 'perfil', label: 'Perfil' },
  { id: 'noticia', label: 'Noticia' },
  { id: 'analisis', label: 'Análisis' }
];

export const sectionLabel = (id) => REVISTA_SECTIONS.find((s) => s.id === id)?.label || 'Revista';
export const formatLabel = (id) => REVISTA_FORMATS.find((f) => f.id === id)?.label || '';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

// Imágenes válidas dentro de una nota: archivos subidos o fotos de Unsplash.
const IMAGE_RE = /^(\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)|https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+)$/;
export const isArticleImage = (url) => IMAGE_RE.test(String(url || ''));

// Enlaces: http(s) o rutas internas simples ("/revista/…"); nada de "//", "\\" ni caracteres de control.
const INTERNAL_RE = /^\/(?![/\\])[^\s\\\u0000-\u001f]*$/;
const safeHref = (url) => {
  if (url.startsWith('/')) return INTERNAL_RE.test(url) ? url : '';
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : '';
  } catch {
    return '';
  }
};
// Las fotos de Unsplash se copian a veces con parámetros (?ixlib=…): se guardan sin ellos.
const cleanImage = (url) => (url.startsWith('https://images.unsplash.com/') ? url.split('?')[0] : url);

// Texto con **negrita**, *cursiva* y [enlaces](https://…) → partes seguras (nunca HTML).
export function parseInline(text = '') {
  const parts = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1]) parts.push({ t: 'b', v: m[1] });
    else if (m[2]) parts.push({ t: 'i', v: m[2] });
    else {
      const href = safeHref(m[4]);
      parts.push(href ? { t: 'a', v: m[3], href } : { t: 'text', v: m[3] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
  return parts;
}

const plain = (text) => parseInline(text).map((p) => p.v).join('');

/*
  Formato de escritura (pensado para escribir sin saber de código):
    Párrafo ............. texto normal; los párrafos se separan con una línea en blanco
    ## Subtítulo ........ título intermedio
    P: …  /  R: … ....... pregunta y respuesta de una entrevista
    > Cita .............. cita destacada; una última línea "> — Nombre" firma la cita
    - Ítem .............. lista
    ![Epígrafe](url) .... imagen subida o de Unsplash
    --- ................. separador
*/
export function parseArticle(source = '') {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let buffer = null;
  const flush = () => {
    if (!buffer) return;
    if (buffer.type === 'quote') {
      const rows = buffer.lines;
      let by = '';
      if (rows.length > 1 && /^[—–-]\s*\S/.test(rows[rows.length - 1])) by = rows.pop().replace(/^[—–-]\s*/, '');
      const text = rows.join(' ').trim();
      if (text) blocks.push({ type: 'quote', text: parseInline(text), by });
    } else if (buffer.type === 'list') {
      if (buffer.items.length) blocks.push({ type: 'list', items: buffer.items.map(parseInline) });
    } else {
      const text = buffer.lines.join(' ').replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ type: buffer.type, text: parseInline(text) });
    }
    buffer = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m;
    if (/^---+$/.test(line)) { flush(); blocks.push({ type: 'rule' }); continue; }
    if ((m = /^#{2,3}\s+(.+)$/.exec(line))) { flush(); blocks.push({ type: 'h', text: parseInline(m[1].trim()) }); continue; }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line))) {
      flush();
      const src = cleanImage(m[2]);
      if (isArticleImage(src)) blocks.push({ type: 'image', src, caption: m[1].trim() });
      continue;
    }
    if ((m = /^(?:\*\*)?([PR])(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$/.exec(line)) && m[2]) {
      flush();
      buffer = { type: m[1] === 'P' ? 'q' : 'a', lines: [m[2]] };
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) {
      if (buffer?.type !== 'quote') { flush(); buffer = { type: 'quote', lines: [] }; }
      if (m[1].trim()) buffer.lines.push(m[1].trim());
      continue;
    }
    if ((m = /^[-•*]\s+(.+)$/.exec(line))) {
      if (buffer?.type !== 'list') { flush(); buffer = { type: 'list', items: [] }; }
      buffer.items.push(m[1].trim());
      continue;
    }
    if (buffer && buffer.type !== 'quote' && buffer.type !== 'list') { buffer.lines.push(line); continue; }
    flush();
    buffer = { type: 'p', lines: [line] };
  }
  flush();
  return blocks;
}

const blockText = (b) => {
  if (b.type === 'list') return b.items.map((i) => i.map((p) => p.v).join('')).join(' ');
  if (b.text) return b.text.map((p) => p.v).join('');
  return b.caption || '';
};

export function readingMinutes(blocks) {
  const words = blocks.map(blockText).join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Primer párrafo como resumen (para tarjetas y para compartir).
export function excerptOf(blocks, max = 200) {
  const first = blocks.find((b) => b.type === 'p' || b.type === 'a');
  const text = first ? blockText(first) : '';
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text;
}

export const plainText = plain;
