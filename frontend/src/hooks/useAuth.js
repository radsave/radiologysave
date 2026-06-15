import { create } from 'zustand';

const STORAGE_KEY = 'clearscan_auth';
const hasWindow = typeof window !== 'undefined';

function loadPersistedAuth() {
  if (!hasWindow) return { token: null, user: null }; // SSR: no localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export const useAuthStore = create((set, get) => ({
  ...loadPersistedAuth(),

  setAuth: (token, user) => {
    if (hasWindow) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  logout: () => {
    if (hasWindow) localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },

  isAdmin: () => {
    const { user } = get();
    return user && ['admin', 'super_admin'].includes(user.role);
  },
}));
