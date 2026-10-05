const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function getPublishedContent() {
  const response = await fetch(`${API_BASE}/api/content`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Content API returned ${response.status}`);
  return response.json();
}
