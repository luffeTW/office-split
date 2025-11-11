import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { groupService, CreateGroupDto, Group, AddMemberDto, GroupInviteDto } from '../services/groupService'
import { QRCodeCanvas } from 'qrcode.react'
import { userService } from '../services/userService'
import { useAuth } from '../hooks/useAuth'

function GroupsPage() {
  const { user: currentUser } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [inviteInfo, setInviteInfo] = useState<GroupInviteDto | null>(null)
  const [inviteLoadingId, setInviteLoadingId] = useState<number | null>(null)
  const [joinToken, setJoinToken] = useState('')
  const [invites, setInvites] = useState<Record<number, GroupInviteDto[]>>({})
  const [loadingInvitesFor, setLoadingInvitesFor] = useState<number | null>(null)
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

  const handleCreateInvite = async (groupId: number) => {
    setInviteLoadingId(groupId)
    try {
      const info = await groupService.createInvite(groupId, { ttlHours: 24, maxUses: 50 })
      setInviteInfo(info)
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || '建立邀請失敗')
    } finally {
      setInviteLoadingId(null)
    }
  }

  const loadInvites = async (groupId: number) => {
    setLoadingInvitesFor(groupId)
    try {
      const list = await groupService.listInvites(groupId)
      setInvites(prev => ({ ...prev, [groupId]: list }))
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || '讀取邀請失敗')
    } finally {
      setLoadingInvitesFor(null)
    }
  }

  const deactivateInvite = async (groupId: number, token: string) => {
    try {
      await groupService.deactivateInvite(token)
      await loadInvites(groupId)
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || '停用失敗')
    }
  }

  const handleJoinByToken = async () => {
    if (!joinToken) return
    try {
      const res = await groupService.joinByToken(joinToken.trim())
      alert(res.message)
      setJoinToken('')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || '加入失敗')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">群組管理</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="輸入邀請代碼加入 (Token)"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            className="w-[260px]"
          />
          <Button variant="secondary" onClick={handleJoinByToken} disabled={!joinToken}>使用代碼加入</Button>
          <Button onClick={() => setOpenDialog(true)}>新增群組</Button>
        </div>
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
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddMember(group.id)}
                            >
                              新增成員
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={inviteLoadingId === group.id}
                              onClick={() => handleCreateInvite(group.id)}
                            >
                              {inviteLoadingId === group.id ? '產生中...' : '產生邀請連結'}
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
                    {inviteInfo && inviteInfo.groupId === group.id && (
                      <div className="mt-3 rounded border p-3 text-sm">
                        <div className="mb-1 font-medium">邀請資訊</div>
                        <div>Token: <span className="font-mono">{inviteInfo.token}</span></div>
                        <div className="text-muted-foreground">
                          {inviteInfo.expiresAt ? `有效至：${new Date(inviteInfo.expiresAt).toLocaleString('zh-TW')}` : '無期限'}
                          {' ・ '}可用次數：{inviteInfo.maxUses ?? '不限'}（已用 {inviteInfo.uses}）
                        </div>
                        {/* 簡單分享連結，可配合實際前端域名 */}
                        <div className="mt-2 break-words">
                          連結：<span className="font-mono">{`${window.location.origin}/join?token=${inviteInfo.token}`}</span>
                        </div>
                        <div className="mt-2">
                          <QRCodeCanvas value={`${window.location.origin}/join?token=${inviteInfo.token}`} size={128} includeMargin={true} />
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadInvites(group.id)}
                        disabled={loadingInvitesFor === group.id}
                      >
                        {loadingInvitesFor === group.id ? '載入中...' : '查看邀請清單'}
                      </Button>
                    </div>
                    {invites[group.id] && invites[group.id].length > 0 && (
                      <div className="mt-2 rounded border p-2 text-sm">
                        <div className="mb-1 font-medium">有效/歷史邀請</div>
                        <ul className="space-y-2">
                          {invites[group.id].map((inv) => (
                            <li key={inv.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-mono">{inv.token}</div>
                                <div className="text-xs text-muted-foreground">
                                  {inv.isActive ? '啟用中' : '已停用'} ・ 已用 {inv.uses}/{inv.maxUses ?? '∞'} ・ {inv.expiresAt ? `有效至 ${new Date(inv.expiresAt).toLocaleString('zh-TW')}` : '無期限'}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {inv.isActive && (
                                  <Button size="sm" variant="destructive" onClick={() => deactivateInvite(group.id, inv.token)}>停用</Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
