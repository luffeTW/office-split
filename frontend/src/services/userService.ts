import apiClient from './api'

export interface User {
  id: number
  username: string
  email: string
  createdAt: string
}

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users')
    return response.data
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`)
    return response.data
  },

  getUserByUsername: async (username: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/username/${username}`)
    return response.data
  },
}

