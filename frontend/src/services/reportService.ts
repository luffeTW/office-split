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

export const reportService = {
  getGroupReport: async (
    groupId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Report> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await apiClient.get<Report>(`/reports/group/${groupId}`, { params })
    return response.data
  },

  exportToCsv: async (
    groupId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await apiClient.get(`/reports/group/${groupId}/export/csv`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },

  exportToExcel: async (
    groupId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await apiClient.get(`/reports/group/${groupId}/export/excel`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
