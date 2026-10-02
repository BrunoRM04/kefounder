import { AVAILABILITY, COMPENSATION, labelOf } from '../shared/catalog.js';
import { parseUser } from './serializers.js';
import { acceptInterest, markRead, notify, postMessage } from './services.js';
import { firstName } from './utils.js';

// Simula actividad de los perfiles de demostración (is_demo = 1):
// aceptan conexiones y responden mensajes para que el producto se sienta vivo.
// Se desactiva con KEFOUNDER_DEMO_BOTS=0.

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

export function createBots(ctx, { enabled = true, speed = 1, acceptRate = 0.8 } = {}) {
  const { db, hub } = ctx;
  const timers = new Set();
  let ambient = null;
  const replyLog = new Map(); // matchId -> timestamps de respuestas
  const later = (ms, fn) => {
    if (!enabled) return;
    const t = setTimeout(() => {
      timers.delete(t);
      try { fn(); } catch (error) { console.error('[bots]', error.message); }
    }, ms * speed);
    timers.add(t);
  };
  const user = (id) => parseUser(db.get('SELECT * FROM users WHERE id = ?', [id]));
  // Solo actúan los perfiles demo activos, y solo con cuentas activas.
  const isBot = (id) => {
    const row = db.get('SELECT is_demo, status FROM users WHERE id = ?', [id]);
    return row?.is_demo === 1 && row.status === 'active';
  };
  const isActive = (id) => db.get('SELECT status FROM users WHERE id = ?', [id])?.status === 'active';

  const opening = (bot, human, match) => {
    const project = match.project_id ? db.get('SELECT name, owner_id FROM projects WHERE id = ?', [match.project_id]) : null;
    const name = firstName(human.name);
    if (project && project.owner_id === bot.id) return `¡Hola ${name}! Gracias por tu interés en ${project.name}. Me encantó tu perfil. ¿Te cuento en qué estamos y qué necesitamos?`;
    if (project) return `¡Hola ${name}! Vi ${project.name} y me pareció muy interesante. Me gustaría saber más: ¿qué es lo más urgente que necesitan resolver hoy?`;
    return `¡Hola ${name}! Qué bueno que hicimos match. Vi tu perfil y creo que podemos armar algo lindo juntos. ¿En qué estás trabajando ahora?`;
  };

  const compose = (bot, human, match, message) => {
    const text = `${message.body || ''}`.toLowerCase();
    const previous = db.get('SELECT COUNT(*) AS n FROM messages WHERE match_id = ? AND sender_id = ?', [match.id, bot.id]).n;
    const skills = bot.skills.slice(0, 2).join(' y ') || 'lo que sé hacer';
    if (message.kind === 'meeting') {
      const slot = message.meta?.slots?.[0];
      if (slot) {
        const when = new Date(slot).toLocaleString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        return `¡Dale! Me viene perfecto el ${when}. Lo agendo 🙌`;
      }
      return '¡Perfecto! Me sumo a la llamada. Nos vemos ahí 🙌';
    }
    if (message.kind === 'project') return `¡Qué buen proyecto! Me gusta mucho el enfoque de ${message.meta?.name || 'lo que están armando'}. ¿Cuál es el próximo hito que quieren alcanzar?`;
    if (message.kind === 'file') return 'Recibido, ¡gracias! Lo miro con calma y te comento.';
    if (message.kind === 'link') return '¡Gracias por el link! Le echo un vistazo hoy mismo.';
    if (/\b(hola|buenas|hey|qué tal|que tal)\b/.test(text) && previous <= 1) return `¡Hola! ¿Cómo va? Contame un poco más de vos y de lo que te imaginás construir.`;
    if (/reuni|llamada|videollamada|\bcall\b|meet|zoom|agend/.test(text)) return '¡Me encanta la idea! ¿Te sirve el jueves a las 18 h? Si no, proponé otro horario y lo coordinamos.';
    if (/hora|tiempo|dedica|disponib/.test(text)) return `Hoy puedo dedicarle ${labelOf(AVAILABILITY, bot.availability, 'short') || 'unas horas por semana'}. Si el proyecto engancha, podría sumar más.`;
    if (/equity|pago|remuner|sueldo|plata|compensa/.test(text)) return `Me interesa ${labelOf(COMPENSATION, bot.compensation).toLowerCase() || 'conversarlo'}. Para mí lo más importante es que estemos alineados en la visión y en los tiempos.`;
    if (/etapa|mvp|usuarios|tracci|clientes/.test(text)) return 'Buenísimo. Yo vengo de trabajar en productos desde cero, así que la etapa temprana me entusiasma. ¿Ya tienen usuarios probando algo?';
    if (/gracias/.test(text)) return '¡A vos! Tengo muy buena espina con esto ✨';
    const pool = [
      'Me parece muy interesante. ¿Cuál sería el primer paso que te imaginás para trabajar juntos?',
      `Totalmente. Yo podría aportar desde ${skills}. ¿Qué te parece?`,
      '¡Buenísimo! ¿Tenés algo armado para mostrarme? Un deck, un prototipo, lo que sea.',
      'Me encanta. ¿Qué te motivó a arrancar con esto?',
      '¿Hacemos una videollamada esta semana y lo charlamos con más calma?'
    ];
    return pool[previous % pool.length];
  };

  const canReply = (matchId) => {
    const t = Date.now();
    const log = (replyLog.get(matchId) || []).filter((x) => t - x < 3600000);
    if (log.length >= 15) return false;
    log.push(t);
    replyLog.set(matchId, log);
    return true;
  };

  return {
    enabled,
    onInterest(interest) {
      if (!enabled || !isBot(interest.to_user_id) || isBot(interest.from_user_id) || !isActive(interest.from_user_id)) return;
      // La mayoría acepta; algunos dejan la solicitud pendiente, como en la vida real.
      if (Math.random() >= acceptRate) return;
      later(rand(2500, 6000), () => {
        const current = db.get('SELECT * FROM interests WHERE id = ?', [interest.id]);
        if (!current || current.status !== 'pending') return;
        const match = acceptInterest(ctx, current);
        later(rand(4000, 9000), () => {
          const fresh = db.get('SELECT * FROM matches WHERE id = ?', [match.id]);
          if (!fresh || fresh.blocked_by) return;
          const hasMessages = db.get("SELECT 1 FROM messages WHERE match_id = ? AND kind != 'system' LIMIT 1", [match.id]);
          if (hasMessages) return;
          const bot = user(interest.to_user_id);
          hub.send(interest.from_user_id, 'typing', { matchId: match.id, userId: bot.id });
          later(1800, () => postMessage(ctx, fresh, bot.id, { kind: 'text', body: opening(bot, user(interest.from_user_id), fresh) }));
        });
      });
    },
    onMessage(match, message) {
      if (!enabled) return;
      const botId = match.user_a === message.senderId ? match.user_b : match.user_a;
      if (!isBot(botId) || isBot(message.senderId) || !isActive(message.senderId) || !canReply(match.id)) return;
      later(rand(900, 1500), () => {
        const fresh = db.get('SELECT * FROM matches WHERE id = ?', [match.id]);
        if (!fresh || fresh.blocked_by) return;
        markRead(ctx, fresh, botId);
        hub.send(message.senderId, 'typing', { matchId: match.id, userId: botId });
      });
      later(rand(2800, 4800), () => {
        const fresh = db.get('SELECT * FROM matches WHERE id = ?', [match.id]);
        if (!fresh || fresh.blocked_by) return;
        // Si llegaron varios mensajes seguidos, respondemos solo al último.
        const last = db.get('SELECT * FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT 1', [match.id]);
        if (last && last.id !== message.id) return;
        const bot = user(botId);
        postMessage(ctx, fresh, botId, { kind: 'text', body: compose(bot, user(message.senderId), fresh, message) });
      });
    },
    // Actividad ambiental: de vez en cuando un perfil demo visita o muestra interés
    // en una cuenta real activa. Con tope diario para que nunca sea spam.
    startAmbient({ everyMs = 3 * 60 * 1000, perDay = 3 } = {}) {
      if (!enabled || ambient) return;
      ambient = setInterval(() => {
        try {
          const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
          const humans = db.all("SELECT * FROM users WHERE is_demo = 0 AND onboarded = 1 AND visible = 1 AND status = 'active' AND role = 'user' AND last_active_at >= ?", [new Date(Date.now() - 2 * 86400000).toISOString()]);
          for (const human of humans) {
            if (Math.random() > 0.3) continue;
            const bot = db.get(
              `SELECT u.* FROM users u WHERE u.is_demo = 1 AND u.visible = 1 AND u.status = 'active'
                 AND NOT EXISTS (SELECT 1 FROM interests i WHERE (i.from_user_id = u.id AND i.to_user_id = :h) OR (i.from_user_id = :h AND i.to_user_id = u.id))
                 AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = min(u.id, :h) AND m.user_b = max(u.id, :h))
                 AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = :h AND b.blocked_id = u.id) OR (b.user_id = u.id AND b.blocked_id = :h))
               ORDER BY random() LIMIT 1`,
              { h: human.id }
            );
            if (!bot) continue;
            db.run('INSERT INTO views (viewer_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [bot.id, 'person', human.id, new Date().toISOString()]);
            const today = db.get('SELECT COUNT(*) AS n FROM interests i JOIN users u ON u.id = i.from_user_id WHERE u.is_demo = 1 AND i.to_user_id = ? AND i.created_at >= ?', [human.id, dayStart.toISOString()]).n;
            if (today >= perDay || Math.random() > 0.5) continue;
            db.run("INSERT INTO interests (from_user_id, to_user_id, target_type, target_id, created_at) VALUES (?, ?, 'person', ?, ?)", [bot.id, human.id, human.id, new Date().toISOString()]);
            notify(ctx, human.id, 'interest', { actorId: bot.id });
          }
        } catch (error) {
          console.error('[bots] actividad', error.message);
        }
      }, everyMs);
      ambient.unref?.();
    },
    stop() {
      timers.forEach(clearTimeout);
      timers.clear();
      if (ambient) clearInterval(ambient);
      ambient = null;
    }
  };
}
