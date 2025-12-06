import api from './client';
import { User, DoctorOption } from '../types';

interface UsersResponse {
  users: User[];
}

interface UserResponse {
  user: User;
}

interface DoctorsResponse {
  doctors: DoctorOption[];
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'DOCTOR';
  specialty?: string;
  phone?: string;
}

export interface UpdateUserData {
  name?: string;
  specialty?: string;
  phone?: string;
  isActive?: boolean;
}

export const userApi = {
  getAll: async (params?: { role?: string; isActive?: string; search?: string }): Promise<User[]> => {
    const response = await api.get<UsersResponse>('/users', { params });
    return response.data.users;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data.user;
  },

  create: async (data: CreateUserData): Promise<User> => {
    const response = await api.post<UserResponse>('/users', data);
    return response.data.user;
  },

  update: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put<UserResponse>(`/users/${id}`, data);
    return response.data.user;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  },

  getDoctors: async (): Promise<DoctorOption[]> => {
    const response = await api.get<DoctorsResponse>('/users/doctors');
    return response.data.doctors;
  },
};
