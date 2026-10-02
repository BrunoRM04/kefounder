// Acentos claros de la marca para avatares y portadas sin imagen.
export const BRAND_ACCENTS = Object.freeze([
  '#D4E0DA', '#E8D5CC', '#C9D8D6', '#F0E1D8', '#E3EAE4', '#DFE3DA'
]);

// Los registros anteriores mantienen sus datos y adoptan la paleta al mostrarse.
export function brandAccent(accent, identity = 0) {
  const value = typeof accent === 'string' ? accent.toUpperCase() : '';
  if (BRAND_ACCENTS.includes(value)) return value;
  const index = Math.abs(Number(identity) || 0) % BRAND_ACCENTS.length;
  return BRAND_ACCENTS[index];
}
