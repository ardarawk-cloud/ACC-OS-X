async function call(method, url, data) {
  let target = url;
  const init = { method, headers: { accept: 'application/json' } };

  if (method === 'GET' && data && typeof data === 'object') {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
    const suffix = query.toString();
    if (suffix) target += (target.includes('?') ? '&' : '?') + suffix;
  } else if (data !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(data);
  }

  const response = await fetch(target, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const code = payload?.error?.code || payload?.error || `HTTP_${response.status}`;
    const error = new Error(String(code));
    error.response = { status: response.status, data: payload };
    throw error;
  }

  return { data: payload };
}

export const api = {
  get: (url, data) => call('GET', url, data),
  post: (url, data) => call('POST', url, data),
  put: (url, data) => call('PUT', url, data),
  delete: (url, data) => call('DELETE', url, data),
};
