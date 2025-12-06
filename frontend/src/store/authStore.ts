import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, TokenPair } from '../types';
import { authApi } from '../api/auth';

interface AuthStore {
  user: AuthUser | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

      login: async (email: string, password: string) => {
        const response = await authApi.login({ email, password });
        set({
          user: response.user,
          tokens: response.tokens,
          isAuthenticated: true,
        });
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
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
        }
      },

      setTokens: (tokens: TokenPair) => {
        set({ tokens });
      },

      checkAuth: async () => {
        try {
          const tokens = get().tokens;
          if (!tokens?.accessToken) {
            set({ isLoading: false, isAuthenticated: false });
            return;
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
