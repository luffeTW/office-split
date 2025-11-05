import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { groupService } from '../services/groupService'
import { transactionService, CreateTransactionDto } from '../services/transactionService'
import { categoryService } from '../services/categoryService'

function TransactionsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [createError, setCreateError] = useState<string>('')
  const [formData, setFormData] = useState<CreateTransactionDto>({
    groupId: 0,
    categoryId: 0,
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    splitEqually: true,
  })

  const queryClient = useQueryClient()

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return Promise.resolve([])
      return transactionService.getTransactions(selectedGroupId)
    },
    enabled: !!selectedGroupId,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      setOpenDialog(false)
      setCreateError('')
      resetForm()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || '建立交易失敗'
      setCreateError(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })

  const resetForm = () => {
    setFormData({
      groupId: selectedGroupId || 0,
      categoryId: 0,
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      splitEqually: true,
    })
  }

  const handleOpenDialog = () => {
    if (!selectedGroupId) {
      alert('請先選擇群組')
      return
    }
    resetForm()
    setFormData((prev) => ({ ...prev, groupId: selectedGroupId }))
    setOpenDialog(true)
  }

  const handleSubmit = () => {
    setCreateError('')
    createMutation.mutate(formData)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('確定要刪除此交易嗎？')) {
      deleteMutation.mutate(id)
    }
  }

  if (!groups || groups.length === 0) {
    return <div className="rounded border bg-card p-4 text-sm text-muted-foreground">請先創建或加入群組</div>
  }

  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id)
  }

  const expenseCategories = categories?.filter((c) => c.type === 'Expense') || []
  const incomeCategories = categories?.filter((c) => c.type === 'Income') || []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">記帳</h2>
        <Button onClick={handleOpenDialog}>新增交易</Button>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm text-muted-foreground">選擇群組</label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={selectedGroupId || ''}
          onChange={(e) => setSelectedGroupId(Number(e.target.value))}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>類別</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>建立者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('zh-TW')}</TableCell>
                  <TableCell>
                    {transaction.categoryIcon} {transaction.categoryName}
                  </TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>{transaction.description || '-'}</TableCell>
                  <TableCell>{transaction.userName}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(transaction.id)}>刪除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增交易</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                min={0.01}
                step={0.01}
                value={formData.amount}
                onChange={(e) => {
                  const v = e.target.value
                  const amount = v === '' ? 0 : parseFloat(v)
                  setFormData({ ...formData, amount: isNaN(amount) ? 0 : amount })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">類別</Label>
              <select
                id="category"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              >
                <option value={0}>選擇類別</option>
                <optgroup label="支出">
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </optgroup>
                <optgroup label="收入">
                  {incomeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input id="description" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input id="date" type="date" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          {createError && (
            <div className="pt-2 text-sm text-red-600">{createError}</div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                !formData.groupId ||
                !formData.categoryId ||
                formData.amount <= 0
              }
            >
              {createMutation.isPending ? '建立中...' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TransactionsPage
