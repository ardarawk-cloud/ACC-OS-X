async function request(method, url, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  let data = null;
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) data = await response.json();
  else data = await response.text();
  if (!response.ok) {
    const error = new Error((data && data.error && (data.error.message || data.error.code)) || data?.error || ('HTTP ' + response.status));
    error.response = { data, status: response.status };
    throw error;
  }
  return { data, status: response.status, headers: response.headers };
}
export const api = {
  get(url) { return request('GET', url); },
  post(url, body) { return request('POST', url, body); }
};
