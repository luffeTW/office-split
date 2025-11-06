import apiClient from './api'

export interface Group {
  id: number
  name: string
  description?: string
  createdBy: number
  creatorName?: string
  createdAt: string
  members?: GroupMember[]
}

export interface GroupMember {
  id: number
  userId: number
  username: string
  email: string
  role: string
  joinedAt: string
}

export interface CreateGroupDto {
  name: string
  description?: string
  memberIds?: number[]
}

export interface UpdateGroupDto {
  name?: string
  description?: string
}

export interface AddMemberDto {
  userId: number
  role: string
}

export const groupService = {
  getUserGroups: async (): Promise<Group[]> => {
    const response = await apiClient.get<Group[]>('/groups')
    return response.data
  },

  getAllGroups: async (): Promise<Group[]> => {
    const response = await apiClient.get<Group[]>('/groups/all')
    return response.data
  },

  getGroupById: async (id: number): Promise<Group> => {
    const response = await apiClient.get<Group>(`/groups/${id}`)
    return response.data
  },

  createGroup: async (data: CreateGroupDto): Promise<Group> => {
    const response = await apiClient.post<Group>('/groups', data)
    return response.data
  },

  updateGroup: async (id: number, data: UpdateGroupDto): Promise<Group> => {
    const response = await apiClient.put<Group>(`/groups/${id}`, data)
    return response.data
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/groups/${id}`)
  },

  addMember: async (groupId: number, data: AddMemberDto): Promise<GroupMember> => {
    const response = await apiClient.post<GroupMember>(`/groups/${groupId}/members`, data)
    return response.data
  },

  removeMember: async (groupId: number, memberId: number): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}/members/${memberId}`)
  },
}
