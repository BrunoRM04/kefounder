// Hub de eventos en tiempo real con Server-Sent Events.
export function createHub() {
  const clients = new Map(); // userId -> Set<res>
  const listeners = new Set();

  const write = (res, event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* la conexión se cerró; se limpia en 'close' */
    }
  };

  const hub = {
    connect(req, res, userId) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write('retry: 3000\n\n');
      const wasOnline = hub.isOnline(userId);
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(res);
      write(res, 'ready', { at: Date.now() });
      if (!wasOnline) listeners.forEach((fn) => fn({ type: 'presence', userId, online: true }));

      const heartbeat = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { /* ignore */ }
      }, 25000);

      req.on('close', () => {
        clearInterval(heartbeat);
        const set = clients.get(userId);
        if (!set) return;
        set.delete(res);
        if (set.size === 0) {
          clients.delete(userId);
          listeners.forEach((fn) => fn({ type: 'presence', userId, online: false }));
        }
      });
    },
    send(userId, event, data) {
      const set = clients.get(userId);
      if (!set) return;
      for (const res of set) write(res, event, data);
    },
    isOnline: (userId) => clients.has(userId),
    // Corta las conexiones abiertas de alguien (cuenta suspendida o eliminada).
    disconnect(userId) {
      const set = clients.get(userId);
      if (!set) return;
      for (const res of set) { try { res.end(); } catch { /* ignore */ } }
    },
    onPresence: (fn) => listeners.add(fn),
    closeAll() {
      for (const set of clients.values()) for (const res of set) { try { res.end(); } catch { /* ignore */ } }
      clients.clear();
    }
  };
  return hub;
}
