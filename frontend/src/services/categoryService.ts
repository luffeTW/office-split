import apiClient from './api'

export interface Category {
  id: number
  name: string
  type: string
  icon?: string
  userId?: number
  createdAt: string
}

export interface CreateCategoryDto {
  name: string
  type: string
  icon?: string
}

export interface UpdateCategoryDto {
  name?: string
  type?: string
  icon?: string
}

export const categoryService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories')
    return response.data
  },

  getCategoryById: async (id: number): Promise<Category> => {
    const response = await apiClient.get<Category>(`/categories/${id}`)
    return response.data
  },

  createCategory: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await apiClient.post<Category>('/categories', data)
    return response.data
  },

  updateCategory: async (id: number, data: UpdateCategoryDto): Promise<Category> => {
    const response = await apiClient.put<Category>(`/categories/${id}`, data)
    return response.data
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`)
  },
}
