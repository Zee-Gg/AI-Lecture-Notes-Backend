import { supabase } from '../../middleware/supabaseClient.js';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}