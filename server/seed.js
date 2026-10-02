import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, lockedPasswordHash } from './auth.js';
import { openDb } from './db.js';
import { ensureSampleArticles, removeSampleArticles } from './revista.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, PEOPLE, PROJECTS } from './seed-data.js';

const TABLES = ['press_requests', 'sessions', 'notifications', 'messages', 'matches', 'interests', 'saves', 'passes', 'views', 'blocks', 'reports', 'subscriptions', 'uploads', 'projects', 'users'];

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const hoursAgo = (h) => minutesAgo(h * 60);
const daysAgoIso = (d) => minutesAgo(d * 1440);

// Pseudoaleatorio determinista para que la demo sea siempre igual.
function rng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function isEmpty(db) {
  return db.get('SELECT COUNT(*) AS n FROM users').n === 0;
}

// Cuentas que la demo puede borrar y volver a crear. Las reales, las de prueba y las del
// equipo (administración) nunca se tocan al reiniciar la demo.
// Se identifican por la marca de demo o por su dominio, nunca por el segmento (que se edita en el panel).
const DEMO_USERS = "role = 'user' AND (is_demo = 1 OR email LIKE '%@kefounder.demo' OR email LIKE '%@demo.kefounder')";

export function resetDemo(db) {
  const kept = db.get(`SELECT COUNT(*) AS n FROM users WHERE NOT (${DEMO_USERS})`).n;
  if (!kept) {
    db.exec('PRAGMA foreign_keys = OFF');
    for (const table of TABLES) db.exec(`DELETE FROM ${table}`);
    // Sin claves foráneas activas, las notas propias se desvinculan a mano de los proyectos borrados.
    db.exec('UPDATE articles SET project_id = NULL, created_by = NULL');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'projects', 'views', 'interests', 'matches', 'messages', 'notifications', 'reports', 'subscriptions', 'uploads')");
    db.exec('PRAGMA foreign_keys = ON');
    return 0;
  }
  db.tx(() => {
    // Borrar las cuentas demo arrastra en cascada sus proyectos, conexiones, chats y notificaciones.
    db.run(`DELETE FROM users WHERE ${DEMO_USERS}`);
    for (const table of ['views', 'saves', 'passes']) {
      db.run(`DELETE FROM ${table} WHERE (target_type = 'person' AND target_id NOT IN (SELECT id FROM users)) OR (target_type = 'project' AND target_id NOT IN (SELECT id FROM projects))`);
    }
    db.run("DELETE FROM reports WHERE (target_type = 'person' AND target_id NOT IN (SELECT id FROM users)) OR (target_type = 'project' AND target_id NOT IN (SELECT id FROM projects)) OR (target_type = 'match' AND target_id NOT IN (SELECT id FROM matches))");
  });
  return kept;
}

export async function seed(db, { reset = false } = {}) {
  if (reset) resetDemo(db);
  const random = rng(7);
  const demoHash = await hashPassword(DEMO_PASSWORD);
  const ids = {};

  db.tx(() => {
    const insertUser = (p, { email, hash, isDemo }) => {
      const created = daysAgoIso(10 + Math.floor(random() * 50));
      const settings = { notifications: {}, ...(isDemo ? { demoOnline: Boolean(p.online) } : {}) };
      return db.run(
        `INSERT INTO users (email, password_hash, name, headline, photo, accent, city, country, bio, goal, roles, skills, interests, languages,
          availability, compensation, looking_for, work_mode, experience_years, experience, age, linkedin, github, portfolio, plan, plan_period, plan_renews_at,
          onboarded, email_verified, identity_verified, visible, settings, is_demo, segment, created_at, last_active_at)
         VALUES (:email, :hash, :name, :headline, :photo, :accent, :city, :country, :bio, :goal, :roles, :skills, :interests, :languages,
          :availability, :compensation, :lookingFor, :workMode, :experienceYears, :experience, :age, :linkedin, :github, :portfolio, :plan, :planPeriod, :planRenews,
          1, 1, :verified, 1, :settings, :isDemo, :segment, :created, :active)`,
        {
          email, hash, name: p.name, headline: p.headline, photo: p.photo, accent: p.accent || '#D4E0DA', city: p.city, country: p.country, bio: p.bio,
          goal: p.goal, roles: JSON.stringify(p.roles), skills: JSON.stringify(p.skills), interests: JSON.stringify(p.interests), languages: JSON.stringify(p.languages || ['Español']),
          availability: p.availability, compensation: p.compensation, lookingFor: p.lookingFor, workMode: p.workMode, experienceYears: p.experienceYears ?? null,
          experience: JSON.stringify(p.experience || []), age: p.age ?? null, linkedin: p.linkedin || '', github: p.github || '', portfolio: p.portfolio || '',
          plan: p.plan || 'free', planPeriod: p.plan && p.plan !== 'free' ? 'monthly' : null, planRenews: p.plan && p.plan !== 'free' ? daysAgoIso(-20) : null,
          verified: p.verified ? 1 : 0, settings: JSON.stringify(settings), isDemo: isDemo ? 1 : 0, segment: isDemo ? 'bot' : 'demo', created, active: p.online ? minutesAgo(2) : hoursAgo(1 + Math.floor(random() * 40))
        }
      ).lastInsertRowid;
    };

    for (const account of DEMO_ACCOUNTS) ids[account.key] = insertUser(account, { email: account.email, hash: demoHash, isDemo: false });
    for (const person of PEOPLE) ids[person.key] = insertUser(person, { email: `${person.key}@demo.kefounder`, hash: lockedPasswordHash(), isDemo: true });

    db.run("INSERT INTO subscriptions (user_id, plan, period, amount, status, created_at) VALUES (?, 'pro', 'monthly', 9.99, 'active', ?)", [ids.martin, daysAgoIso(10)]);
    db.run("INSERT INTO subscriptions (user_id, plan, period, amount, status, created_at) VALUES (?, 'plus', 'monthly', 4.99, 'active', ?)", [ids.ana, daysAgoIso(6)]);
    db.run("INSERT INTO subscriptions (user_id, plan, period, amount, status, created_at) VALUES (?, 'startup', 'monthly', 19.99, 'active', ?)", [ids.rodrigo, daysAgoIso(12)]);

    // Proyectos
    const projectIds = {};
    for (const p of PROJECTS) {
      const created = daysAgoIso(p.daysAgo);
      projectIds[p.name] = db.run(
        `INSERT INTO projects (owner_id, name, tagline, description, problem, solution, stage, industry, city, country, work_mode, cover, accent,
          roles_needed, dedication, compensation, stack, team, has_users, has_revenue, has_investment, status, created_at, updated_at, published_at)
         VALUES (:owner, :name, :tagline, :description, :problem, :solution, :stage, :industry, :city, :country, :workMode, :cover, :accent,
          :rolesNeeded, :dedication, :compensation, :stack, :team, :hasUsers, :hasRevenue, :hasInvestment, :status, :created, :updated, :published)`,
        {
          owner: ids[p.owner], name: p.name, tagline: p.tagline, description: p.description, problem: p.problem, solution: p.solution, stage: p.stage,
          industry: p.industry, city: p.city, country: p.country, workMode: p.workMode, cover: p.cover, accent: p.accent,
          rolesNeeded: JSON.stringify(p.rolesNeeded), dedication: p.dedication, compensation: p.compensation, stack: JSON.stringify(p.stack), team: JSON.stringify(p.team),
          hasUsers: p.hasUsers ? 1 : 0, hasRevenue: p.hasRevenue ? 1 : 0, hasInvestment: p.hasInvestment ? 1 : 0, status: p.status,
          created, updated: daysAgoIso(Math.max(0, p.daysAgo - 2)), published: p.status === 'published' ? created : null
        }
      ).lastInsertRowid;
    }

    const bots = PEOPLE.map((p) => ids[p.key]);
    const anyBot = () => bots[Math.floor(random() * bots.length)];

    // Visualizaciones (para estadísticas y notificaciones)
    const addViews = (type, targetId, count, days = 30) => {
      for (let i = 0; i < count; i += 1) {
        const d = Math.pow(random(), 1.6) * days; // más visitas recientes
        db.run('INSERT INTO views (viewer_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [anyBot(), type, targetId, minutesAgo(d * 1440 + random() * 600)]);
      }
    };
    addViews('project', projectIds.ContaAI, 214, 21);
    addViews('person', ids.sol, 96, 30);
    addViews('person', ids.martin, 138, 30);
    addViews('person', ids.ana, 64, 30);
    addViews('person', ids.rodrigo, 88, 30);
    addViews('project', projectIds.Brote, 186, 30);
    addViews('project', projectIds['Brote Datos'], 72, 8);
    addViews('project', projectIds.Formo, 58, 12);
    const own = new Set(['ContaAI', 'Brote', 'Brote Datos', 'Formo']);
    for (const p of PROJECTS) if (p.status === 'published' && !own.has(p.name)) addViews('project', projectIds[p.name], 15 + Math.floor(random() * 90), p.daysAgo);
    // Historial de perfiles y proyectos vistos (Plus en adelante).
    const viewed = (userKey, type, targetId, at) => db.run('INSERT INTO views (viewer_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [ids[userKey], type, targetId, at]);
    viewed('ana', 'project', projectIds.Nido, hoursAgo(2));
    viewed('ana', 'person', ids.valentina, hoursAgo(5));
    viewed('ana', 'project', projectIds['Tándem'], hoursAgo(9));
    viewed('ana', 'project', projectIds.Mesa, daysAgoIso(1));
    viewed('ana', 'person', ids.paula, daysAgoIso(1.5));
    viewed('ana', 'project', projectIds.Pulso, daysAgoIso(2));
    viewed('martin', 'project', projectIds.Brote, hoursAgo(6));
    viewed('martin', 'person', ids.sofia, daysAgoIso(1));
    viewed('rodrigo', 'person', ids.carolina, hoursAgo(3));
    viewed('rodrigo', 'person', ids.gonzalo, daysAgoIso(2));

    // Guardados
    const save = (userKey, type, targetId, at) => db.run('INSERT OR IGNORE INTO saves (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [ids[userKey], type, targetId, at]);
    save('martin', 'project', projectIds.ContaAI, hoursAgo(26));
    for (const key of ['tomas', 'lara', 'andres', 'bruno', 'isabella', 'lautaro', 'pedro', 'agustina']) save(key, 'project', projectIds.ContaAI, daysAgoIso(1 + random() * 14));
    save('tomas', 'person', ids.sol, hoursAgo(50));
    save('valentina', 'person', ids.martin, daysAgoIso(3));
    save('sol', 'project', projectIds.Nido, daysAgoIso(2));
    save('sol', 'person', ids.martina, daysAgoIso(1));
    save('martin', 'project', projectIds.Pulso, daysAgoIso(4));
    save('ana', 'project', projectIds.Nido, hoursAgo(20));
    save('ana', 'person', ids.valentina, daysAgoIso(1));
    save('paula', 'person', ids.ana, hoursAgo(14));
    save('micaela', 'person', ids.ana, daysAgoIso(2));
    for (const key of ['lautaro', 'isabella', 'tomas', 'gonzalo', 'lara']) save(key, 'project', projectIds.Brote, daysAgoIso(1 + random() * 10));
    save('carolina', 'project', projectIds['Brote Datos'], hoursAgo(30));
    save('rodrigo', 'person', ids.carolina, hoursAgo(3));
    save('isabella', 'project', projectIds.Formo, daysAgoIso(3));

    // Solicitudes de conexión
    const interest = (from, to, { project = null, note = '', at, status = 'pending', pipeline = 'new' }) => db.run(
      'INSERT INTO interests (from_user_id, to_user_id, target_type, target_id, project_id, status, note, pipeline, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ids[from], ids[to], project ? 'project' : 'person', project ? projectIds[project] : ids[to], project ? projectIds[project] : null, status, note, pipeline, at, status === 'pending' ? null : at]
    ).lastInsertRowid;

    const solPending = [
      ['joaquin', { project: 'ContaAI', note: 'Me encantaría sumarme como CTO. Trabajo en pagos y conozco bien las integraciones bancarias.', at: minutesAgo(95) }],
      ['bruno', { project: 'ContaAI', note: 'Diseñé productos fintech para millones de usuarios en Brasil. ¿Charlamos?', at: hoursAgo(5) }],
      ['camila', { at: hoursAgo(9) }],
      ['carolina', { note: 'Me interesa mucho lo que hacés con IA aplicada a finanzas.', at: hoursAgo(20) }],
      ['andres', { project: 'ContaAI', at: daysAgoIso(1.4) }],
      ['agustina', { at: daysAgoIso(2.2) }],
      ['pedro', { at: daysAgoIso(3.1) }]
    ];
    for (const [from, opts] of solPending) interest(from, 'sol', opts);
    interest('sol', 'diego', { note: 'Me encantaría aprender de tu experiencia vendiendo SaaS en la región.', at: daysAgoIso(1) });
    interest('sol', 'federico', { at: daysAgoIso(2) });

    for (const [from, opts] of [
      ['diego', { note: 'Buscamos frontend senior para Ruta. Tu perfil encaja perfecto.', at: hoursAgo(3) }],
      ['julieta', { note: 'Mesa necesita CTO. ¿Te copa la comida casera?', at: hoursAgo(30) }],
      ['emiliano', { at: daysAgoIso(2) }],
      ['florencia', { at: daysAgoIso(4) }]
    ]) interest(from, 'martin', opts);

    // Matches con conversación
    const match = (x, y, { project = null, at, initiator }) => {
      const [a, b] = ids[x] < ids[y] ? [ids[x], ids[y]] : [ids[y], ids[x]];
      const id = db.run('INSERT INTO matches (user_a, user_b, project_id, origin, initiator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [a, b, project ? projectIds[project] : null, 'match', ids[initiator], at]).lastInsertRowid;
      db.run("INSERT INTO messages (match_id, sender_id, kind, body, meta, created_at, read_at) VALUES (?, NULL, 'system', 'match', '{}', ?, ?)", [id, at, at]);
      return id;
    };
    const say = (matchId, from, body, at, read = true) => {
      db.run("INSERT INTO messages (match_id, sender_id, kind, body, meta, created_at, read_at) VALUES (?, ?, 'text', ?, '{}', ?, ?)", [matchId, ids[from], body, at, read ? at : null]);
      db.run('UPDATE matches SET last_message_at = ? WHERE id = ?', [at, matchId]);
    };

    interest('mateo', 'sol', { project: 'ContaAI', at: hoursAgo(28), status: 'accepted' });
    const mSolMateo = match('sol', 'mateo', { project: 'ContaAI', at: hoursAgo(27), initiator: 'mateo' });
    say(mSolMateo, 'mateo', '¡Hola Sol! Me encantó ContaAI. Trabajé cuatro años en una fintech de pagos y creo que puedo aportar mucho en la parte técnica.', hoursAgo(26));
    say(mSolMateo, 'sol', '¡Hola Mateo! Qué bueno leerte. Estuve mirando tu GitHub y me gustó mucho lo que hiciste con modelos de clasificación.', hoursAgo(25));
    say(mSolMateo, 'mateo', '¡Gracias! ¿Te parece si coordinamos una videollamada esta semana para que me cuentes más del proyecto?', minutesAgo(12), false);

    interest('sol', 'lucia', { at: daysAgoIso(2.3), status: 'accepted' });
    const mSolLucia = match('sol', 'lucia', { at: daysAgoIso(2.2), initiator: 'sol' });
    say(mSolLucia, 'sol', '¡Hola Lucía! Vi que te interesa sumarte a startups con propósito. Estamos armando la estrategia de lanzamiento de ContaAI.', hoursAgo(50));
    say(mSolLucia, 'lucia', '¡Hola! Me encanta el problema que atacan. Te comparto algunos proyectos de growth que hice el año pasado.', hoursAgo(49));
    say(mSolLucia, 'sol', 'Genial, los miro y te escribo. ¡Gracias!', hoursAgo(48));

    interest('martin', 'sol', { project: 'ContaAI', at: daysAgoIso(3.2), status: 'accepted' });
    const mSolMartin = match('sol', 'martin', { project: 'ContaAI', at: daysAgoIso(3.1), initiator: 'martin' });
    say(mSolMartin, 'martin', 'Hola Sol, ¿cómo va? Vi que ContaAI busca CTO. Hoy tengo 10–20 horas semanales y me interesa mucho el cruce entre IA y finanzas.', daysAgoIso(3));
    say(mSolMartin, 'sol', '¡Hola Martín! Justo buscamos a alguien con tu perfil. ¿Qué experiencia tenés con integraciones bancarias?', daysAgoIso(2.9));
    say(mSolMartin, 'martin', 'Armé integraciones de Open Banking en mi último trabajo. Si querés te muestro una demo cuando te quede cómodo.', daysAgoIso(2));

    interest('valentina', 'sol', { at: hoursAgo(4), status: 'accepted' });
    const mSolValentina = match('sol', 'valentina', { at: hoursAgo(3), initiator: 'valentina' });

    interest('martin', 'sofia', { project: 'Pulso', at: daysAgoIso(5.5), status: 'accepted' });
    const mMartinSofia = match('martin', 'sofia', { project: 'Pulso', at: daysAgoIso(5.4), initiator: 'martin' });
    say(mMartinSofia, 'sofia', '¡Hola Martín! Gracias por tu interés en Pulso. ¿Tenés experiencia con apps de salud?', daysAgoIso(5.3));
    say(mMartinSofia, 'martin', 'Hola Sofía, no directamente, pero trabajé con datos sensibles y cumplimiento en fintech. Me interesa mucho el problema.', daysAgoIso(5.2));
    say(mMartinSofia, 'sofia', 'Perfecto, eso suma muchísimo. Te paso el deck y lo charlamos cuando quieras.', minutesAgo(40), false);

    interest('santiago', 'martin', { at: hoursAgo(8), status: 'accepted' });
    const mMartinSantiago = match('martin', 'santiago', { at: hoursAgo(7), initiator: 'santiago' });

    // Mensaje directo sin match: el primero lo escribe quien inicia la conversación.
    const direct = (from, to, at) => {
      const [a, b] = ids[from] < ids[to] ? [ids[from], ids[to]] : [ids[to], ids[from]];
      return db.run("INSERT INTO matches (user_a, user_b, origin, initiator_id, created_at) VALUES (?, ?, 'direct', ?, ?)", [a, b, ids[from], at]).lastInsertRowid;
    };

    // ---------- Martín (Pro): su proyecto Formo recibe interesados y usó 1 de sus 5 mensajes directos ----------
    interest('isabella', 'martin', { project: 'Formo', note: 'Diseñé extensiones de Chrome para dos startups. Me encanta la idea de Formo.', at: hoursAgo(11) });
    interest('lara', 'martin', { project: 'Formo', at: daysAgoIso(2.5) });
    const mMartinLara = direct('martin', 'lara', hoursAgo(20));
    say(mMartinLara, 'martin', 'Hola Lara, vi que hiciste growth para herramientas B2B. Estoy armando Formo y me encantaría tu mirada sobre cómo conseguir los primeros clientes.', hoursAgo(20));
    say(mMartinLara, 'lara', '¡Hola Martín! Gracias por escribir. Me interesa, contame qué probaron hasta ahora.', hoursAgo(18), false);

    // ---------- Ana (Plus): ve quién la quiere y quién la guardó ----------
    for (const [from, opts] of [
      ['paula', { note: 'En Tándem necesitamos una diseñadora que piense la experiencia de las mentorías. ¿Te sumás?', at: minutesAgo(50) }],
      ['santiago', { note: 'Nido busca diseño de producto. Vi tu portfolio y me encantó.', at: hoursAgo(7) }],
      ['julieta', { at: daysAgoIso(1.2) }]
    ]) interest(from, 'ana', opts);
    interest('ana', 'sofia', { project: 'Pulso', note: 'Me gustaría diseñar la experiencia de los pacientes.', at: daysAgoIso(1) });
    interest('ana', 'federico', { project: 'Orbita', at: daysAgoIso(2) });
    interest('ana', 'emiliano', { project: 'Marea', at: daysAgoIso(3), status: 'accepted' });
    const mAnaEmiliano = match('ana', 'emiliano', { project: 'Marea', at: daysAgoIso(2.9), initiator: 'ana' });
    say(mAnaEmiliano, 'emiliano', '¡Hola Ana! Gracias por el interés en Marea. Necesitamos que la app para recolectores sea muy simple, ¿te copa el desafío?', daysAgoIso(2.8));
    say(mAnaEmiliano, 'ana', '¡Hola Emiliano! Me encanta. Ya tengo algunas ideas para el flujo de registro de entregas.', daysAgoIso(2.7));
    say(mAnaEmiliano, 'emiliano', 'Buenísimo. ¿Hacemos una llamada el jueves y lo vemos juntos?', hoursAgo(4), false);

    // ---------- Rodrigo (Startup): candidatos por etapa, varias búsquedas y mensajes sin match ----------
    interest('lautaro', 'rodrigo', { project: 'Brote', note: 'Hice apps offline-first para logística rural. Brote me parece increíble.', at: hoursAgo(2) });
    interest('isabella', 'rodrigo', { project: 'Brote', at: hoursAgo(16) });
    interest('pedro', 'rodrigo', { project: 'Brote', at: daysAgoIso(4), pipeline: 'discarded' });
    interest('carolina', 'rodrigo', { project: 'Brote Datos', note: 'Llevo modelos de ML a producción hace seis años. Me encantaría liderar el equipo de datos.', at: hoursAgo(5) });
    interest('tomas', 'rodrigo', { project: 'Brote Datos', at: daysAgoIso(1.5) });
    const candidate = (from, stage, days, lines) => {
      interest(from, 'rodrigo', { project: 'Brote', at: daysAgoIso(days), status: 'accepted', pipeline: stage });
      const id = match(from, 'rodrigo', { project: 'Brote', at: daysAgoIso(days - 0.1), initiator: from });
      lines.forEach(([who, text, ago], i) => say(id, who, text, hoursAgo(ago), i < lines.length - 1 || who === 'rodrigo'));
      return id;
    };
    const mRodrigoJoaquin = candidate('joaquin', 'contacted', 3, [
      ['rodrigo', '¡Hola Joaquín! Gracias por postularte a Brote. ¿Tenés experiencia con series de tiempo?', 60],
      ['joaquin', 'Sí, en pagos trabajé con millones de eventos por día. Me gustaría conocer la arquitectura actual.', 3]
    ]);
    candidate('camila', 'interview', 6, [
      ['rodrigo', 'Camila, nos encantó tu portfolio. ¿Te sirve una entrevista con Lucía, nuestra CTO?', 120],
      ['camila', '¡Claro! El martes a las 10 me viene perfecto.', 100]
    ]);
    candidate('andres', 'joined', 12, [
      ['andres', 'Rodrigo, confirmado: arranco el lunes con el equipo. ¡Gracias por la confianza!', 170],
      ['rodrigo', '¡Bienvenido a Brote, Andrés! 🌱', 168]
    ]);
    const mRodrigoGonzalo = direct('rodrigo', 'gonzalo', daysAgoIso(1));
    say(mRodrigoGonzalo, 'rodrigo', 'Hola Gonzalo, soy Rodrigo de Brote. Vi Campo Claro: creo que podemos integrar la trazabilidad con nuestros sensores. ¿Charlamos?', daysAgoIso(1));
    say(mRodrigoGonzalo, 'gonzalo', '¡Hola Rodrigo! Los conozco, están haciendo un gran trabajo. Me interesa mucho, ¿qué día te queda bien?', minutesAgo(35), false);
    interest('renata', 'rodrigo', { note: 'Me gustaría aprender de cómo armaste Brote.', at: daysAgoIso(1.8) });

    // Pases previos para que el mazo tenga historial
    db.run("INSERT INTO passes (user_id, target_type, target_id, created_at) VALUES (?, 'person', ?, ?)", [ids.sol, ids.renata, daysAgoIso(1)]);

    // Notificaciones
    const note = (userKey, type, { actor, project, matchId, data = {}, at, read = false }) => db.run(
      'INSERT INTO notifications (user_id, type, actor_id, project_id, match_id, data, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [ids[userKey], type, actor ? ids[actor] : null, project ? projectIds[project] : null, matchId ?? null, JSON.stringify({ count: 1, ...data }), at, read ? at : null]
    );
    note('sol', 'welcome', { at: daysAgoIso(20), read: true });
    note('sol', 'recommendations', { data: { count: 4 }, at: daysAgoIso(2), read: true });
    note('sol', 'saved_profile', { actor: 'tomas', at: hoursAgo(50), read: true });
    note('sol', 'project_views', { project: 'ContaAI', data: { count: 20 }, at: hoursAgo(30), read: true });
    note('sol', 'saved_project', { actor: 'martin', project: 'ContaAI', at: hoursAgo(26), read: true });
    for (const [from, opts] of solPending.slice().reverse()) note('sol', 'interest', { actor: from, project: opts.project, data: { note: opts.note || '' }, at: opts.at, read: Date.parse(opts.at) < Date.now() - 6 * 3600000 });
    note('sol', 'interests_summary', { data: { count: solPending.length }, at: minutesAgo(60) });
    note('sol', 'match', { actor: 'valentina', matchId: mSolValentina, at: hoursAgo(3) });
    note('sol', 'message', { actor: 'mateo', matchId: mSolMateo, data: { preview: '¡Gracias! ¿Te parece si coordinamos una videollamada esta semana…' }, at: minutesAgo(12) });

    note('martin', 'welcome', { at: daysAgoIso(30), read: true });
    note('martin', 'plan', { data: { planName: 'Pro' }, at: daysAgoIso(10), read: true });
    note('martin', 'interest', { actor: 'florencia', at: daysAgoIso(4), read: true });
    note('martin', 'interest', { actor: 'emiliano', at: daysAgoIso(2), read: true });
    note('martin', 'interest', { actor: 'julieta', data: { note: 'Mesa necesita CTO. ¿Te copa la comida casera?' }, at: hoursAgo(30) });
    note('martin', 'match', { actor: 'santiago', matchId: mMartinSantiago, at: hoursAgo(7) });
    note('martin', 'interest', { actor: 'diego', data: { note: 'Buscamos frontend senior para Ruta.' }, at: hoursAgo(3) });
    note('martin', 'message', { actor: 'sofia', matchId: mMartinSofia, data: { preview: 'Perfecto, eso suma muchísimo. Te paso el deck…' }, at: minutesAgo(40) });
    note('martin', 'interest', { actor: 'isabella', project: 'Formo', data: { note: 'Diseñé extensiones de Chrome para dos startups.' }, at: hoursAgo(11) });
    note('martin', 'message', { actor: 'lara', matchId: mMartinLara, data: { preview: '¡Hola Martín! Gracias por escribir. Me interesa, contame qué probaron hasta ahora.' }, at: hoursAgo(18) });

    note('ana', 'welcome', { at: daysAgoIso(25), read: true });
    note('ana', 'plan', { data: { planName: 'Plus' }, at: daysAgoIso(6), read: true });
    note('ana', 'saved_profile', { actor: 'micaela', at: daysAgoIso(2), read: true });
    note('ana', 'interest', { actor: 'julieta', at: daysAgoIso(1.2), read: true });
    note('ana', 'saved_profile', { actor: 'paula', at: hoursAgo(14) });
    note('ana', 'interest', { actor: 'santiago', data: { note: 'Nido busca diseño de producto.' }, at: hoursAgo(7) });
    note('ana', 'message', { actor: 'emiliano', matchId: mAnaEmiliano, data: { preview: 'Buenísimo. ¿Hacemos una llamada el jueves y lo vemos juntos?' }, at: hoursAgo(4) });
    note('ana', 'interest', { actor: 'paula', data: { note: 'En Tándem necesitamos una diseñadora.' }, at: minutesAgo(50) });

    note('rodrigo', 'welcome', { at: daysAgoIso(40), read: true });
    note('rodrigo', 'plan', { data: { planName: 'Startup' }, at: daysAgoIso(12), read: true });
    note('rodrigo', 'project_views', { project: 'Brote', data: { count: 30 }, at: daysAgoIso(1), read: true });
    note('rodrigo', 'interest', { actor: 'carolina', project: 'Brote Datos', data: { note: 'Me encantaría liderar el equipo de datos.' }, at: hoursAgo(5) });
    note('rodrigo', 'message', { actor: 'joaquin', matchId: mRodrigoJoaquin, data: { preview: 'Sí, en pagos trabajé con millones de eventos por día.' }, at: hoursAgo(3) });
    note('rodrigo', 'interest', { actor: 'lautaro', project: 'Brote', data: { note: 'Hice apps offline-first para logística rural.' }, at: hoursAgo(2) });
    note('rodrigo', 'message', { actor: 'gonzalo', matchId: mRodrigoGonzalo, data: { preview: '¡Hola Rodrigo! Los conozco, están haciendo un gran trabajo.' }, at: minutesAgo(35) });
  });

  // Revista: las notas de ejemplo se rehacen con la demo; las propias nunca se tocan.
  if (reset) removeSampleArticles(db);
  ensureSampleArticles(db, { force: reset });

  // Difusión: Martín (Pro) pidió una mención para Formo; queda pendiente en el panel.
  const formo = db.get("SELECT id, name, website FROM projects WHERE owner_id = ? AND name = 'Formo'", [ids.martin]);
  if (formo) {
    const at = new Date(Date.now() - 26 * 3600000).toISOString();
    db.run(
      "INSERT INTO press_requests (user_id, project_id, project_name, kind, plan, status, pitch, spokesperson, spokesperson_role, instagram, website, created_at, updated_at) VALUES (?, ?, ?, 'mencion', 'pro', 'pending', ?, 'Martín López', 'Founder', '@formo.app', ?, ?, ?)",
      [ids.martin, formo.id, formo.name, 'Formo completa solo los formularios de trámites de las pymes. Ya lo usan tres estudios contables y buscamos alguien de growth para llegar a más. Nos encantaría aparecer en una nota de startups que buscan equipo.', formo.website || '', at, at]
    );
  }

  return ids;
}

// CLI: node server/seed.js --reset
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { config } = await import('./config.js');
  const { migrateLegacyDbFile } = await import('./migrate.js');
  migrateLegacyDbFile(config.dbPath);
  const db = openDb(config.dbPath);
  const kept = db.get(`SELECT COUNT(*) AS n FROM users WHERE NOT (${DEMO_USERS})`).n;
  await seed(db, { reset: true });
  console.log(`Base de datos lista en ${config.dbPath}`);
  if (kept) console.log(`Se conservaron ${kept} cuentas reales o del equipo.`);
  console.log(`Cuentas demo: ${DEMO_ACCOUNTS.map((a) => a.email).join(', ')} · contraseña: ${DEMO_PASSWORD}`);
  db.close();
}
