import type { User } from './types';

const AUTH_KEY = 'pulsein-auth';
const DEVICE_KEY = 'pulsein-device-id';

export interface StoredAuth {
  accessToken: string;
  user: User;
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth | null) {
  try {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  } catch {}
}

export function onAuthChange(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === AUTH_KEY || e.key === null) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
}
