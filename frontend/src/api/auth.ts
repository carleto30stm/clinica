import api from './client';
import { LoginCredentials, AuthUser, TokenPair } from '../types';

interface LoginResponse {
  user: AuthUser;
  tokens: TokenPair;
}

interface MeResponse {
  user: AuthUser;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  refreshToken: async (refreshToken: string): Promise<{ tokens: TokenPair }> => {
    const response = await api.post<{ tokens: TokenPair }>('/auth/refresh', { refreshToken });
    return response.data;
  },

  me: async (): Promise<AuthUser> => {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },
};
