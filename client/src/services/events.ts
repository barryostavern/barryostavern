import type { ApiListResponse, Event } from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function getEvents(): Promise<Event[]> {
  const res = await fetch(`${BASE}/events`);

  if (!res.ok) {
    throw new Error('Failed to load events');
  }

  const json: ApiListResponse<Event> = await res.json();
  return json.data;
}
