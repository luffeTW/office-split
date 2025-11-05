import apiClient from './api';

export interface Group {
  id: number;
  name: string;
  description?: string;
  createdBy: number;
  creatorName?: string;
  createdAt: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  memberIds?: number[];
}

export const groupService = {
  getUserGroups: async (): Promise<Group[]> => {
    const response = await apiClient.get<Group[]>('/groups');
    return response.data;
  },

  getGroupById: async (id: number): Promise<Group> => {
    const response = await apiClient.get<Group>(`/groups/${id}`);
    return response.data;
  },
};
