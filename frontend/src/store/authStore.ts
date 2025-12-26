import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, TokenPair } from '../types';
import { authApi } from '../api/auth';

interface AuthStore {
  user: AuthUser | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  __logoutTimer?: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: TokenPair) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      // internal logout timer id (not persisted)
      __logoutTimer: undefined,

      login: async (email: string, password: string) => {
        const response = await authApi.login({ email, password });
        set({
          user: response.user,
          tokens: response.tokens,
          isAuthenticated: true,
        });
        // schedule auto logout based on token expiry
        try {
          const access = response.tokens?.accessToken;
          const getExp = (t?: string | null) => {
            if (!t) return null;
            try {
              const payload = JSON.parse(atob(t.split('.')[1]));
              return payload.exp ? payload.exp * 1000 : null;
            } catch {
              return null;
            }
          };
          const exp = getExp(access);
          if (exp) {
            const msLeft = exp - Date.now();
            if (msLeft <= 0) {
              get().logout();
            } else {
              if (typeof get().__logoutTimer !== 'undefined') window.clearTimeout(get().__logoutTimer);
              const id = window.setTimeout(() => get().logout(), msLeft);
              // store non-persisted timer id
              set((state) => ({ ...state, __logoutTimer: id }));
            }
          }
        } catch (e) {
          // ignore
        }
      },

      logout: async () => {
        try {
          const tokens = get().tokens;
          if (tokens?.refreshToken) {
            await authApi.logout(tokens.refreshToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          if (typeof get().__logoutTimer !== 'undefined') window.clearTimeout(get().__logoutTimer);
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            __logoutTimer: undefined,
          });
        }
      },

      setTokens: (tokens: TokenPair) => {
        set({ tokens });
        // schedule auto logout when tokens are set programmatically
        try {
          const getExp = (t?: string | null) => {
            if (!t) return null;
            try {
              const payload = JSON.parse(atob(t.split('.')[1]));
              return payload.exp ? payload.exp * 1000 : null;
            } catch {
              return null;
            }
          };
          const exp = getExp(tokens?.accessToken || null);
          if (exp) {
            const msLeft = exp - Date.now();
            if (msLeft <= 0) {
              get().logout();
            } else {
              if (typeof get().__logoutTimer !== 'undefined') window.clearTimeout(get().__logoutTimer);
              const id = window.setTimeout(() => get().logout(), msLeft);
              set((state) => ({ ...state, __logoutTimer: id }));
            }
          }
        } catch (e) {
          // ignore
        }
      },

      checkAuth: async () => {
        try {
          const tokens = get().tokens;
          if (!tokens?.accessToken) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }

          // if access token expired, clear auth
          try {
            const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
            if (payload?.exp && payload.exp * 1000 <= Date.now()) {
              // expired
              await get().logout();
              set({ isLoading: false, isAuthenticated: false });
              return;
            }
            // schedule auto logout based on remaining time
            const msLeft = payload.exp * 1000 - Date.now();
            if (msLeft > 0) {
              if (typeof get().__logoutTimer !== 'undefined') window.clearTimeout(get().__logoutTimer);
              const id = window.setTimeout(() => get().logout(), msLeft);
              set((state) => ({ ...state, __logoutTimer: id }));
            }
          } catch (e) {
            // if parsing fails, fall back to server check
          }

          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ tokens: state.tokens }),
    }
  )
);
