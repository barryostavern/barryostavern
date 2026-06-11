import type { SiteSettings } from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function getSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(`${BASE}/site`);

  if (!res.ok) {
    throw new Error('Failed to load site settings');
  }

  const json: { data: SiteSettings } = await res.json();
  return json.data;
}
