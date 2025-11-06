import apiClient from './api';

export interface Transaction {
  id: number;
  groupId: number;
  groupName?: string;
  userId: number;
  userName?: string;
  categoryId: number;
  categoryName?: string;
  categoryIcon?: string;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  splits?: Split[];
}

export interface Split {
  id: number;
  transactionId: number;
  userId: number;
  userName?: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
}

export interface CreateTransactionDto {
  groupId: number;
  categoryId: number;
  payerUserId: number;
  borrowerUserId: number;
  amount: number;
  description?: string;
  date: string;
  splitUserIds?: number[];
  splitEqually: boolean;
}

export const transactionService = {
  getTransactions: async (groupId: number): Promise<Transaction[]> => {
    const response = await apiClient.get<Transaction[]>(`/transactions/group/${groupId}`);
    return response.data;
  },

  createTransaction: async (data: CreateTransactionDto): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>('/transactions', data);
    return response.data;
  },

  getTransactionSplits: async (transactionId: number): Promise<Split[]> => {
    const response = await apiClient.get<Split[]>(`/transactions/${transactionId}/splits`);
    return response.data;
  },
};
