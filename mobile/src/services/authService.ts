import apiClient from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
