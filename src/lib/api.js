export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || 'Algo salió mal. Probá de nuevo.');
    this.status = status;
    this.data = data || {};
  }
}

async function request(method, url, body, { headers = {} } = {}) {
  const init = { method, credentials: 'same-origin', headers: { ...headers } };
  if (body instanceof Blob) {
    init.body = body;
    init.headers['Content-Type'] = body.type || 'application/octet-stream';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }
  let res;
  try {
    res = await fetch(`/api${url}`, init);
  } catch {
    throw new ApiError(0, { error: 'Sin conexión. Revisá tu internet e intentá de nuevo.' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const qs = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) { if (value.length) search.set(key, value.join(',')); continue; }
    search.set(key, value === true ? '1' : String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body ?? {}),
  del: (url, body) => request('DELETE', url, body),
  upload: (blob, name) => request('POST', '/uploads', blob, { headers: { 'X-File-Name': encodeURIComponent(name || 'archivo') } })
};
