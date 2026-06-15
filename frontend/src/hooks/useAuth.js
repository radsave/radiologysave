import { create } from 'zustand';

const STORAGE_KEY = 'clearscan_auth';

function loadPersistedAuth() {
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },

  isAdmin: () => {
    const { user } = get();
    return user && ['admin', 'super_admin'].includes(user.role);
  },
}));
