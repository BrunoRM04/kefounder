// Catálogo compartido entre el frontend y el backend.
// Única fuente de verdad para opciones, planes y límites.

export const GOALS = [
  { id: 'create_project', label: 'Crear un proyecto', hint: 'Tengo una idea y quiero darle forma.' },
  { id: 'find_cofounder', label: 'Encontrar un cofundador', hint: 'Busco a alguien para construir desde cero.' },
  { id: 'join_project', label: 'Sumarme a un proyecto', hint: 'Quiero aportar lo que sé hacer.' },
  { id: 'find_talent', label: 'Encontrar talento', hint: 'Necesito sumar perfiles a mi equipo.' },
  { id: 'explore', label: 'Explorar', hint: 'Quiero ver qué se está construyendo.' }
];

export const ROLES = [
  { id: 'founder', label: 'Founder' },
  { id: 'ceo', label: 'CEO' },
  { id: 'developer', label: 'Developer' },
  { id: 'designer', label: 'Designer' },
  { id: 'product', label: 'Product' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'growth', label: 'Growth' },
  { id: 'operations', label: 'Operations' },
  { id: 'other', label: 'Otro' }
];

export const AVAILABILITY = [
  { id: 'exploring', label: 'Explorando', short: 'Explorando' },
  { id: 'lt10', label: 'Menos de 10 horas semanales', short: '< 10 h / sem' },
  { id: 'h10_20', label: '10–20 horas semanales', short: '10–20 h / sem' },
  { id: 'h20_40', label: '20–40 horas semanales', short: '20–40 h / sem' },
  { id: 'fulltime', label: 'Full time', short: 'Full time' }
];

export const COMPENSATION = [
  { id: 'equity', label: 'Equity' },
  { id: 'paid', label: 'Remuneración' },
  { id: 'mixed', label: 'Remuneración + equity' },
  { id: 'personal', label: 'Proyecto personal' },
  { id: 'unsure', label: 'Todavía no lo sé' }
];

export const PROJECT_COMPENSATION = [
  { id: 'equity', label: 'Equity' },
  { id: 'paid', label: 'Pago' },
  { id: 'mixed', label: 'Pago + equity' },
  { id: 'talk', label: 'A conversar' }
];

export const STAGES = [
  { id: 'idea', label: 'Idea', hint: 'Todavía es una hipótesis.' },
  { id: 'validation', label: 'Validación', hint: 'Hablando con usuarios reales.' },
  { id: 'prototype', label: 'Prototipo', hint: 'Hay algo que se puede probar.' },
  { id: 'mvp', label: 'MVP', hint: 'Una primera versión funcionando.' },
  { id: 'users', label: 'Usuarios', hint: 'Personas lo usan de forma regular.' },
  { id: 'revenue', label: 'Facturación', hint: 'Ya genera ingresos.' },
  { id: 'investment', label: 'Inversión', hint: 'Levantó capital.' }
];

export const WORK_MODES = [
  { id: 'remote', label: 'Remoto' },
  { id: 'hybrid', label: 'Híbrido' },
  { id: 'onsite', label: 'Presencial' }
];

// Perfiles que un proyecto puede buscar y a qué rol de persona corresponden.
export const PROJECT_ROLES = [
  { id: 'cto', label: 'CTO', maps: ['developer'] },
  { id: 'cofounder', label: 'Cofounder', maps: ['founder', 'ceo', 'developer', 'product', 'sales', 'growth', 'marketing', 'designer', 'operations'] },
  { id: 'frontend', label: 'Frontend', maps: ['developer'] },
  { id: 'backend', label: 'Backend', maps: ['developer'] },
  { id: 'fullstack', label: 'Full stack', maps: ['developer'] },
  { id: 'mobile', label: 'Mobile', maps: ['developer'] },
  { id: 'data', label: 'Data / IA', maps: ['developer'] },
  { id: 'designer', label: 'Designer', maps: ['designer'] },
  { id: 'product', label: 'Product', maps: ['product'] },
  { id: 'marketing', label: 'Marketing', maps: ['marketing', 'growth'] },
  { id: 'growth', label: 'Growth', maps: ['growth', 'marketing'] },
  { id: 'sales', label: 'Sales', maps: ['sales'] },
  { id: 'operations', label: 'Operations', maps: ['operations'] },
  { id: 'advisor', label: 'Advisor', maps: ['founder', 'ceo', 'product', 'operations', 'sales'] }
];

export const INDUSTRIES = [
  'Fintech', 'IA', 'SaaS B2B', 'EdTech', 'HealthTech', 'Climate', 'Marketplace', 'E-commerce',
  'AgroTech', 'LegalTech', 'Media', 'Gaming', 'Impacto social', 'Logística', 'PropTech', 'Turismo', 'Food', 'HR Tech'
];

export const SKILLS = [
  'React', 'Node.js', 'TypeScript', 'Python', 'PostgreSQL', 'AWS', 'Flutter', 'React Native', 'Go', 'Machine learning',
  'Data science', 'Figma', 'Product design', 'UX research', 'Branding', 'Product strategy', 'Roadmapping', 'Growth',
  'SEO', 'Performance marketing', 'Content', 'Community', 'Ventas B2B', 'Go-to-market', 'Partnerships', 'Finanzas',
  'Fundraising', 'Operaciones', 'Legal', 'No-code', 'DevOps', 'Blockchain', 'iOS', 'Android', 'Copywriting'
];

export const LANGUAGES = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano'];

export const COUNTRIES = [
  'Uruguay', 'Argentina', 'Chile', 'Brasil', 'Paraguay', 'Bolivia', 'Perú', 'Ecuador', 'Colombia', 'Venezuela',
  'México', 'Costa Rica', 'Panamá', 'Guatemala', 'República Dominicana', 'España', 'Estados Unidos', 'Otro'
];

export const TEAM_SIZES = [
  { id: 'solo', label: 'Solo founder', min: 1, max: 1 },
  { id: 'small', label: '2–3 personas', min: 2, max: 3 },
  { id: 'medium', label: '4–6 personas', min: 4, max: 6 },
  { id: 'large', label: '7 o más', min: 7, max: 999 }
];

export const EXPERIENCE_LEVELS = [
  { id: 'junior', label: 'Junior · 0–2 años', min: 0, max: 2 },
  { id: 'mid', label: 'Semi senior · 3–5 años', min: 3, max: 5 },
  { id: 'senior', label: 'Senior · 6–10 años', min: 6, max: 10 },
  { id: 'expert', label: 'Experto · 10+ años', min: 11, max: 99 }
];

export const REPORT_REASONS = [
  'Perfil falso o engañoso',
  'Spam o publicidad',
  'Comportamiento inapropiado',
  'Contenido ofensivo',
  'Otro motivo'
];

// null = ilimitado
export const PLANS = {
  free: {
    id: 'free', name: 'Free', monthly: 0, yearly: 0, tagline: 'Para descubrir KeFounder!',
    limits: { connectionsPerDay: 10, saves: 10, activeProjects: 1, directMessagesPerMonth: 0 },
    features: { seeInterested: false, advancedFilters: false, history: false, analytics: false, priority: false, advancedCompat: false, candidatesPanel: false, teamProfile: false, pressMention: false, pressFeature: false },
    benefits: ['Perfil y descubrimiento', '10 conexiones por día', 'Match y chat', 'Filtros básicos', 'Hasta 10 guardados', '1 proyecto activo']
  },
  plus: {
    id: 'plus', name: 'Plus', monthly: 4.99, yearly: 49, tagline: 'Para conectar sin límites.',
    limits: { connectionsPerDay: null, saves: null, activeProjects: 1, directMessagesPerMonth: 0 },
    features: { seeInterested: true, advancedFilters: true, history: true, analytics: false, priority: false, advancedCompat: false, candidatesPanel: false, teamProfile: false, pressMention: false, pressFeature: false },
    benefits: ['Conexiones ilimitadas', 'Ver quién está interesado en vos', 'Ver quién guardó tu perfil', 'Filtros avanzados', 'Guardados ilimitados', 'Historial de perfiles']
  },
  pro: {
    id: 'pro', name: 'Pro', monthly: 9.99, yearly: 99, tagline: 'Para buscar activamente.', recommended: true,
    limits: { connectionsPerDay: null, saves: null, activeProjects: 3, directMessagesPerMonth: 5 },
    features: { seeInterested: true, advancedFilters: true, history: true, analytics: true, priority: true, advancedCompat: true, candidatesPanel: false, teamProfile: false, pressMention: true, pressFeature: false },
    benefits: ['Todo lo de Plus', 'Mayor visibilidad y recomendaciones prioritarias', 'Estadísticas de perfil y proyecto', 'Compatibilidad avanzada', '5 mensajes directos sin match por mes', 'Hasta 3 proyectos activos', 'Tu startup mencionada en la Revista e Instagram (1 por semestre)']
  },
  startup: {
    id: 'startup', name: 'Startup', monthly: 19.99, yearly: 199, tagline: 'Para construir un equipo.',
    limits: { connectionsPerDay: null, saves: null, activeProjects: 5, directMessagesPerMonth: null },
    features: { seeInterested: true, advancedFilters: true, history: true, analytics: true, priority: true, advancedCompat: true, candidatesPanel: true, teamProfile: true, pressMention: true, pressFeature: true },
    benefits: ['Todo lo de Pro', 'Nota propia en la Revista + publicación en nuestro Instagram (1 por trimestre)', 'Hasta 5 proyectos o búsquedas activas', 'Perfil de equipo', 'Panel de candidatos', 'Mensajes sin match', 'Prioridad en resultados']
  }
};

export const PLAN_ORDER = ['free', 'plus', 'pro', 'startup'];

// Difusión: KeFounder! se encarga de mostrar la startup en la Revista y en su Instagram.
// Pro: una mención en una nota colectiva y en las historias. Startup: una nota propia y una publicación en el feed.
export const PRESS = {
  pro: {
    kind: 'mencion',
    label: 'Mención',
    title: 'Mención en la Revista e Instagram',
    detail: 'Tu startup aparece en una nota colectiva de la Revista KeFounder! (como «Startups que buscan equipo») y en nuestras historias de Instagram.',
    everyDays: 182,
    period: 'semestre'
  },
  startup: {
    kind: 'nota',
    label: 'Nota propia',
    title: 'Nota propia en la Revista + Instagram',
    detail: 'Una entrevista o perfil de tu startup en la Revista KeFounder! y una publicación en el feed de nuestro Instagram.',
    everyDays: 91,
    period: 'trimestre'
  }
};
export const PRESS_KINDS = { mencion: 'Mención', nota: 'Nota propia' };
export const pressFor = (plan) => PRESS[plan] || null;

// «Necesito ayuda con…»: alguien cuenta un problema, la comunidad propone soluciones y quienes
// ayudan suman puntos para el ranking semanal (de lunes a domingo). El podio queda en el perfil.
export const HELP_CATEGORIES = [
  { id: 'producto', label: 'Producto' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'diseno', label: 'Diseño' },
  { id: 'marketing', label: 'Marketing y growth' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'inversion', label: 'Inversión' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'legal', label: 'Legal' },
  { id: 'equipo', label: 'Equipo y socios' },
  { id: 'otro', label: 'Otro tema' }
];

export const HELP_POINTS = {
  answer: 2, // por publicar una solución
  answerWeeklyCap: 10, // lo que suman tus propias soluciones en una semana
  helpful: 5, // cada «Me sirvió» de otra persona
  accepted: 20, // cuando quien pidió ayuda elige tu solución
  perPersonWeeklyCap: 30, // lo que una misma persona te puede dar en una semana
  podiumMin: 15, // puntos mínimos para entrar al podio
  podiumGivers: 2 // y que vengan de al menos dos personas distintas
};

export const HELP_RULES = [
  { id: 'answer', points: `+${HELP_POINTS.answer}`, label: 'Por cada solución que publicás', hint: `Suman hasta ${HELP_POINTS.answerWeeklyCap} por semana.` },
  { id: 'helpful', points: `+${HELP_POINTS.helpful}`, label: 'Cada «Me sirvió» de otra persona', hint: 'Votan quienes leen tu solución y les resulta útil.' },
  { id: 'accepted', points: `+${HELP_POINTS.accepted}`, label: 'Si eligen tu solución', hint: 'Lo decide quien pidió ayuda.' }
];

export const PLACE_LABELS = { 1: '1.º puesto', 2: '2.º puesto', 3: '3.º puesto' };

export const PIPELINE = [
  { id: 'new', label: 'Nuevo' },
  { id: 'contacted', label: 'En conversación' },
  { id: 'interview', label: 'Entrevista' },
  { id: 'joined', label: 'Se sumó' },
  { id: 'discarded', label: 'Descartado' }
];

// Textos de los momentos de paywall (se muestran cuando hay intención).
export const PAYWALL_COPY = {
  connections: { title: 'Alcanzaste el límite diario', message: 'Con Free podés enviar 10 conexiones por día. Con Plus conectás sin límites y ves quién está interesado en vos.' },
  saves: { title: 'Llegaste a 10 guardados', message: 'Con Plus tenés guardados ilimitados para revisar a tu ritmo.' },
  seeInterested: { title: 'Descubrí quién está interesado en vos', message: 'Con Plus ves quiénes quieren conectar con vos y podés aceptar o rechazar al instante.' },
  advancedFilters: { title: 'Filtros avanzados', message: 'Filtrá por skills, experiencia, industria, etapa, idiomas y más con Plus.' },
  history: { title: 'Historial de perfiles', message: 'Volvé a cualquier perfil o proyecto que viste. Disponible con Plus.' },
  analytics: { title: 'Estadísticas', message: 'Mirá visualizaciones, guardados, intereses y matches día a día. Disponible con Pro.' },
  advancedCompat: { title: 'Compatibilidad avanzada', message: 'Entendé en detalle por qué son compatibles. Disponible con Pro.' },
  directMessages: { title: 'Mensajes sin match', message: 'Escribile a alguien sin esperar el match. Pro incluye 5 por mes; Startup, sin límite.' },
  projects: { title: 'Más proyectos activos', message: 'Pro permite hasta 3 proyectos activos y Startup hasta 5.' },
  candidatesPanel: { title: 'Panel de candidatos', message: 'Organizá a los interesados por etapa y gestioná tu búsqueda en equipo. Disponible con Startup.' },
  teamProfile: { title: 'Perfil de equipo', message: 'Mostrá a todo el equipo en tus proyectos. Disponible con Startup.' },
  pressMention: { title: 'Difusión en la Revista e Instagram', message: 'Con Pro tu startup aparece en las notas de la Revista KeFounder! y en nuestras historias de Instagram. Con Startup, una nota propia y una publicación en el feed cada trimestre.' }
};

export const labelOf = (list, id, key = 'label') => {
  const found = list.find((item) => item.id === id);
  return found ? found[key] : '';
};

export const planRank = (plan) => Math.max(0, PLAN_ORDER.indexOf(plan));
export const planAtLeast = (plan, required) => planRank(plan) >= planRank(required);

// Plan mínimo que desbloquea una función.
export const minimumPlanFor = (feature) => PLAN_ORDER.find((id) => PLANS[id].features[feature]) || 'startup';
