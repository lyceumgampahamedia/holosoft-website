const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'holosoft.cms.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function login(password) {
  const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
  setToken(data.token);
  return data;
}
export const getContent = () => request('/api/admin/content');
export const saveDraft = (content) => request('/api/admin/draft', { method: 'PUT', body: JSON.stringify(content) });
export const publishContent = (content) => request('/api/admin/publish', { method: 'POST', body: JSON.stringify(content) });
export const getRevisions = () => request('/api/admin/revisions');
export const restoreRevision = (name) => request(`/api/admin/revisions/${encodeURIComponent(name)}/restore`, { method: 'POST' });
export async function logout() {
  try { await request('/api/auth/logout', { method: 'POST' }); } finally { setToken(null); }
}


export async function uploadMedia(file) {
  if (!file) throw new Error('Choose an image first.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
  return request('/api/admin/media', { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataUrl }) });
}
