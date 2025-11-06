import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { groupService, CreateGroupDto, Group, AddMemberDto } from '../services/groupService'
import { userService } from '../services/userService'
import { useAuth } from '../hooks/useAuth'

function GroupsPage() {
  const { user: currentUser } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('my-groups')
  const [formData, setFormData] = useState<CreateGroupDto>({
    name: '',
    description: '',
  })
  const [addMemberData, setAddMemberData] = useState<AddMemberDto>({
    userId: 0,
    role: 'Member',
  })

  const queryClient = useQueryClient()

  const { data: myGroups, isLoading: isLoadingMyGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: allGroups, isLoading: isLoadingAllGroups } = useQuery({
    queryKey: ['all-groups'],
    queryFn: () => groupService.getAllGroups(),
  })

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAllUsers(),
  })

  const groups = activeTab === 'my-groups' ? myGroups : allGroups
  const isLoading = activeTab === 'my-groups' ? isLoadingMyGroups : isLoadingAllGroups

  // 判斷當前使用者是否是群組的 Owner 或 Admin
  const isOwnerOrAdmin = (group: Group): boolean => {
    if (!currentUser) return false
    const member = group.members?.find((m) => m.userId === currentUser.id)
    return member?.role === 'Owner' || member?.role === 'Admin'
  }

  // 取得可新增的使用者列表（過濾掉已經是成員的使用者）
  const availableUsers = useMemo(() => {
    if (!allUsers || !selectedGroupId) return []
    const selectedGroup = groups?.find((g) => g.id === selectedGroupId)
    if (!selectedGroup) return []
    const memberIds = new Set(selectedGroup.members?.map((m) => m.userId) || [])
    return allUsers.filter((u) => !memberIds.has(u.id))
  }, [allUsers, selectedGroupId, groups])

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupDto) => groupService.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups'] })
      setOpenDialog(false)
      setFormData({ name: '', description: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => groupService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups'] })
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: AddMemberDto }) =>
      groupService.addMember(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups'] })
      setOpenAddMemberDialog(false)
      setSelectedGroupId(null)
      setAddMemberData({ userId: 0, role: 'Member' })
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || '新增成員失敗'
      alert(errorMessage)
    },
  })

  const handleSubmit = () => {
    createMutation.mutate(formData)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('確定要刪除此群組嗎？此操作無法復原。')) {
      deleteMutation.mutate(id)
    }
  }

  const handleOpenAddMember = (groupId: number) => {
    setSelectedGroupId(groupId)
    setOpenAddMemberDialog(true)
    setAddMemberData({ userId: 0, role: 'Member' })
  }

  const handleAddMember = () => {
    if (!selectedGroupId || !addMemberData.userId) {
      alert('請選擇要新增的使用者')
      return
    }
    addMemberMutation.mutate({ groupId: selectedGroupId, data: addMemberData })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">群組管理</h2>
        <Button onClick={() => setOpenDialog(true)}>新增群組</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="my-groups">我的群組</TabsTrigger>
          <TabsTrigger value="all-groups">所有群組</TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : groups && groups.length === 0 ? (
            <div className="rounded border bg-card p-4 text-sm text-muted-foreground">尚未加入任何群組，請創建新群組</div>
          ) : (
            <div className="flex flex-col gap-3">
              {groups?.map((group) => (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground">{group.description}</div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          建立者: {group.creatorName} | 建立時間: {new Date(group.createdAt).toLocaleDateString('zh-TW')}
                        </div>
                        <div className="mt-2 text-sm font-medium">成員 ({group.members?.length || 0}):</div>
                        <ul className="mt-1 space-y-1 text-sm">
                          {group.members?.map((member) => (
                            <li key={member.id}>
                              {member.username}
                              <span className="text-xs text-muted-foreground"> ・ {member.role} ・ {new Date(member.joinedAt).toLocaleDateString('zh-TW')}</span>
                            </li>
                          ))}
                        </ul>
                        {isOwnerOrAdmin(group) && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddMember(group.id)}
                            >
                              新增成員
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id)} disabled={deleteMutation.isPending}>
                          刪除
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-groups">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : groups && groups.length === 0 ? (
            <div className="rounded border bg-card p-4 text-sm text-muted-foreground">目前沒有任何群組</div>
          ) : (
            <div className="flex flex-col gap-3">
              {groups?.map((group) => (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div>
                      <div className="text-lg font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground">{group.description}</div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        建立者: {group.creatorName} | 建立時間: {new Date(group.createdAt).toLocaleDateString('zh-TW')}
                      </div>
                      <div className="mt-2 text-sm font-medium">成員 ({group.members?.length || 0}):</div>
                      <ul className="mt-1 space-y-1 text-sm">
                        {group.members?.map((member) => (
                          <li key={member.id}>
                            {member.username}
                            <span className="text-xs text-muted-foreground"> ・ {member.role} ・ {new Date(member.joinedAt).toLocaleDateString('zh-TW')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增群組</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">群組名稱</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddMemberDialog} onOpenChange={setOpenAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增成員</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="user-select">選擇使用者</Label>
              <select
                id="user-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={addMemberData.userId || ''}
                onChange={(e) => setAddMemberData({ ...addMemberData, userId: parseInt(e.target.value) })}
              >
                <option value="">請選擇使用者</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && selectedGroupId && (
                <p className="text-xs text-muted-foreground">所有使用者都已經是群組成員</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-select">角色</Label>
              <select
                id="role-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={addMemberData.role}
                onChange={(e) => setAddMemberData({ ...addMemberData, role: e.target.value })}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenAddMemberDialog(false)}>取消</Button>
            <Button
              onClick={handleAddMember}
              disabled={addMemberMutation.isPending || !addMemberData.userId}
            >
              {addMemberMutation.isPending ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GroupsPage
