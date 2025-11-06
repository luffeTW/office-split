import apiClient from './api'

export interface Transaction {
  id: number
  groupId: number
  groupName?: string
  userId: number
  userName?: string
  categoryId: number
  categoryName?: string
  categoryIcon?: string
  amount: number
  description?: string
  date: string
  createdAt: string
  splits?: Split[]
}

export interface Split {
  id: number
  transactionId: number
  userId: number
  userName?: string
  amount: number
  isPaid: boolean
  paidAt?: string
  createdAt: string
}

export interface CreateTransactionDto {
  groupId: number
  categoryId: number
  payerUserId: number
  borrowerUserId: number
  amount: number
  description?: string
  date: string
  splitUserIds?: number[]
  splitEqually: boolean
}

export interface UpdateTransactionDto {
  categoryId?: number
  amount?: number
  description?: string
  date?: string
  payerUserId?: number
  borrowerUserId?: number
}

export interface UpdateSplitDto {
  isPaid: boolean
}

export const transactionService = {
  getTransactions: async (
    groupId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Transaction[]> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await apiClient.get<Transaction[]>(`/transactions/group/${groupId}`, { params })
    return response.data
  },

  getTransactionById: async (id: number): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`)
    return response.data
  },

  createTransaction: async (data: CreateTransactionDto): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>('/transactions', data)
    return response.data
  },

  updateTransaction: async (id: number, data: UpdateTransactionDto): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/transactions/${id}`, data)
    return response.data
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`)
  },

  getTransactionSplits: async (transactionId: number): Promise<Split[]> => {
    const response = await apiClient.get<Split[]>(`/transactions/${transactionId}/splits`)
    return response.data
  },

  updateSplit: async (splitId: number, data: UpdateSplitDto): Promise<Split> => {
    const response = await apiClient.put<Split>(`/transactions/splits/${splitId}`, data)
    return response.data
  },

  settlePairDebts: async (
    groupId: number,
    otherUserId: number,
    direction: 'IOwe' | 'OweMe',
    upToDate?: string
  ): Promise<{ updated: number }> => {
    const payload: any = { otherUserId, direction }
    if (upToDate) payload.upToDate = upToDate
    const response = await apiClient.post<{ updated: number }>(`/transactions/group/${groupId}/settle-pair`, payload)
    return response.data
  },
}
