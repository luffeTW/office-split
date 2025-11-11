import apiClient from './api'

export interface Report {
  totalIncome: number
  totalExpense: number
  balance: number
  categorySummaries?: CategorySummary[]
  monthlySummaries?: MonthlySummary[]
  userBalances?: UserBalance[]
}

export interface CategorySummary {
  categoryId: number
  categoryName: string
  categoryType: string
  totalAmount: number
  transactionCount: number
}

export interface MonthlySummary {
  year: number
  month: number
  income: number
  expense: number
  balance: number
}

export interface UserBalance {
  userId: number
  username: string
  totalPaid: number
  totalOwed: number
  balance: number
}

export interface PairwiseDebt {
  userId: number
  username: string
  amount: number
}

export interface MyDebts {
  iOwe: PairwiseDebt[]
  oweMe: PairwiseDebt[]
  totalIOwe: number
  totalOweMe: number
  net: number
}

export const reportService = {
  getGroupReport: async (
    groupId: number,
    startDate?: string,
    endDate?: string,
    categoryId?: number
  ): Promise<Report> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (categoryId !== undefined) params.categoryId = String(categoryId)
    const response = await apiClient.get<Report>(`/reports/group/${groupId}`, { params })
    return response.data
  },

  exportToCsv: async (
    groupId: number,
    startDate?: string,
    endDate?: string,
    categoryId?: number
  ): Promise<Blob> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (categoryId !== undefined) params.categoryId = String(categoryId)
    const response = await apiClient.get(`/reports/group/${groupId}/export/csv`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  exportToExcel: async (
    groupId: number,
    startDate?: string,
    endDate?: string,
    categoryId?: number
  ): Promise<Blob> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (categoryId !== undefined) params.categoryId = String(categoryId)
    const response = await apiClient.get(`/reports/group/${groupId}/export/excel`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  getMyDebts: async (
    groupId: number,
    startDate?: string,
    endDate?: string,
    categoryId?: number
  ): Promise<MyDebts> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (categoryId !== undefined) params.categoryId = String(categoryId)
    const response = await apiClient.get<MyDebts>(`/reports/group/${groupId}/my-debts`, { params })
    return response.data
  },
}
