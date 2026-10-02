// Mazo de Descubrir en memoria: al volver de una ficha, el mazo sigue donde estaba.
const decks = { people: null, projects: null };
const removed = new Set();

export const deckStore = {
  get: (mode) => decks[mode],
  set: (mode, deck) => { decks[mode] = deck; },
  // Una acción hecha desde la ficha completa saca la tarjeta del mazo.
  remove(type, id) {
    removed.add(`${type}:${id}`);
    const mode = type === 'person' ? 'people' : 'projects';
    const deck = decks[mode];
    if (deck) deck.items = deck.items.filter((item) => item.id !== id);
  },
  wasRemoved: (type, id) => removed.has(`${type}:${id}`),
  clear() { decks.people = null; decks.projects = null; removed.clear(); }
};
