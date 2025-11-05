import apiClient from './api';

export interface Category {
  id: number;
  name: string;
  type: string;
  icon?: string;
  userId?: number;
  createdAt: string;
}

export const categoryService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },
};
