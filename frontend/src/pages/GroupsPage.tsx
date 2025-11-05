import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { groupService, CreateGroupDto } from '../services/groupService'

function GroupsPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState<CreateGroupDto>({
    name: '',
    description: '',
  })

  const queryClient = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupDto) => groupService.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setOpenDialog(false)
      setFormData({ name: '', description: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => groupService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
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

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">群組管理</h2>
        <Button onClick={() => setOpenDialog(true)}>新增群組</Button>
      </div>

      {groups && groups.length === 0 ? (
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
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id)} disabled={deleteMutation.isPending}>
                    刪除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  )
}

export default GroupsPage
