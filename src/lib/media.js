import { api } from './api.js';

// Reduce imágenes antes de subirlas para que carguen rápido en mobile.
export async function resizeImage(file, max = 1400, quality = 0.86) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob || file;
  } catch {
    return file;
  }
}

export async function uploadImage(file, max) {
  if (!/^image\//.test(file.type)) throw new Error('Elegí una imagen (JPG, PNG o WebP).');
  const blob = await resizeImage(file, max);
  const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/jpeg' ? '.jpg' : '');
  return api.upload(blob, name);
}

export const imageSrc = (url, width = 800) => {
  // Se usa dentro de url("…") en CSS: nada de comillas, paréntesis ni espacios.
  if (!url || /["'()\s\\]/.test(url)) return '';
  if (url.startsWith('https://images.unsplash.com/')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}auto=format&fit=crop&w=${width}&q=80`;
  }
  return url;
};

export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
