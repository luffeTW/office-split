import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Eye, ExternalLink, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { groupService } from '../services/groupService'
import { buildFileUrl } from '../lib/utils'
import { transactionService, CreateTransactionDto } from '../services/transactionService'
import { categoryService } from '../services/categoryService'
import { useAuth } from '@/hooks/useAuth'

function TransactionsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [createError, setCreateError] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CreateTransactionDto>({
    groupId: 0,
    categoryId: 0,
    payerUserId: 0,
    borrowerUserId: 0,
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    splitEqually: true,
    receiptUrl: undefined,
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const openPreview = (url?: string) => {
    if (!url) return
    setPreviewUrl(url)
    setPreviewOpen(true)
  }
  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const queryClient = useQueryClient()
  const { user } = useAuth()

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
    mutationFn: async (data: CreateTransactionDto) => {
      // 若有收據檔案，改用 multipart form 建立
      if (receiptFile) {
        const form = new FormData()
        form.append('groupId', String(data.groupId))
        form.append('categoryId', String(data.categoryId))
        form.append('payerUserId', String(data.payerUserId))
        form.append('borrowerUserId', String(data.borrowerUserId))
        form.append('amount', String(data.amount))
        if (data.description) form.append('description', data.description)
        if (data.date) form.append('date', data.date)
        form.append('Receipt', receiptFile)
        return transactionService.createWithReceipt(form)
      }
      return transactionService.createTransaction(data)
    },
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => transactionService.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      setOpenDialog(false)
      setCreateError('')
      setEditingId(null)
      resetForm()
      // 若編輯後有新收據檔案，另外上傳一次（僅支援創建者）
      if (receiptFile && editingId) {
        transactionService.uploadReceipt(editingId, receiptFile)
          .then(() => queryClient.invalidateQueries({ queryKey: ['transactions'] }))
          .catch(err => console.error('收據上傳失敗', err))
          .finally(() => setReceiptFile(null))
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || '更新交易失敗'
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
      payerUserId: user?.id || 0,
      borrowerUserId: 0,
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      splitEqually: true,
      receiptUrl: undefined,
    })
    setReceiptFile(null)
  }

  const handleOpenDialog = () => {
    if (!selectedGroupId) {
      alert('請先選擇群組')
      return
    }
    setEditingId(null)
    resetForm()
    setFormData((prev) => ({ ...prev, groupId: selectedGroupId }))
    setOpenDialog(true)
  }

  const handleEdit = (tx: any) => {
    if (!selectedGroupId) return
    setEditingId(tx.id)
    setFormData({
      groupId: selectedGroupId,
      categoryId: tx.categoryId,
      payerUserId: tx.userId,
      borrowerUserId: tx.splits?.[0]?.userId || 0,
      amount: tx.amount,
      description: tx.description || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      splitEqually: true,
    })
    setCreateError('')
    setOpenDialog(true)
  }

  const handleSubmit = () => {
    setCreateError('')
    // 驗證必填
    if (!formData.payerUserId || !formData.borrowerUserId) {
      setCreateError('請選擇墊款者與借款者')
      return
    }
    if (formData.payerUserId === formData.borrowerUserId) {
      setCreateError('墊款者與借款者不可相同')
      return
    }
    if (editingId) {
      const payload = {
        categoryId: formData.categoryId,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        payerUserId: formData.payerUserId,
        borrowerUserId: formData.borrowerUserId,
      }
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(formData)
    }
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

  const selectedGroup = useMemo(() => groups?.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId])
  const members = selectedGroup?.members || []

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
                <TableHead>收據</TableHead>
                <TableHead>建立者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction) => (
                <>
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('zh-TW')}</TableCell>
                  <TableCell>
                    {transaction.categoryIcon} {transaction.categoryName}
                  </TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>{transaction.description || '-'}</TableCell>
                  <TableCell>
                    {transaction.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(transaction.id)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm hover:bg-muted"
                        title="展開收據操作"
                      >
                        收據
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedId === transaction.id ? 'rotate-180' : ''}`}
                        />
                      </button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{transaction.userName}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(transaction)}>編輯</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(transaction.id)}>刪除</Button>
                  </TableCell>
                </TableRow>
                {expandedId === transaction.id && transaction.receiptUrl && (
                  <TableRow key={`${transaction.id}-expanded`} className="bg-muted/30">
                    <TableCell colSpan={7}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <button
                          type="button"
                          onClick={() => openPreview(buildFileUrl(transaction.receiptUrl))}
                          className="group relative max-h-64 w-full overflow-hidden rounded-md border bg-white sm:w-80"
                          title="點擊預覽大圖"
                        >
                          <img
                            src={buildFileUrl(transaction.receiptUrl)}
                            alt="收據預覽"
                            loading="lazy"
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                            <Eye className="h-6 w-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          </div>
                        </button>
                        <div className="flex-1 space-y-3">
                          <div className="text-sm text-muted-foreground">收據操作</div>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openPreview(buildFileUrl(transaction.receiptUrl))}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                              預覽大圖
                              <Eye className="ml-2 h-4 w-4" />
                            </button>
                            <a
                              href={buildFileUrl(transaction.receiptUrl)}
                              target="_blank"
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                              在新分頁開啟
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                            <a
                              href={buildFileUrl(transaction.receiptUrl)}
                              download
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                              下載
                              <Download className="ml-2 h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯交易' : '新增交易'}</DialogTitle>
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
              <Label htmlFor="receipt">收據（選擇圖片即可上傳）</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input id="date" type="date" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payer">墊款者</Label>
            <select
              id="payer"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={formData.payerUserId || ''}
              onChange={(e) => setFormData({ ...formData, payerUserId: Number(e.target.value) })}
            >
              <option value="">選擇墊款者</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.username}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="borrower">借款者</Label>
            <select
              id="borrower"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={formData.borrowerUserId || ''}
              onChange={(e) => setFormData({ ...formData, borrowerUserId: Number(e.target.value) })}
            >
              <option value="">選擇借款者</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.username}</option>
              ))}
            </select>
          </div>
          {createError && (
            <div className="pt-2 text-sm text-red-600">{createError}</div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending || updateMutation.isPending ||
                !formData.groupId ||
                !formData.categoryId ||
                formData.amount <= 0 ||
                !formData.payerUserId ||
                !formData.borrowerUserId ||
                formData.payerUserId === formData.borrowerUserId
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (editingId ? '更新中...' : '建立中...') : (editingId ? '儲存' : '建立')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 收據預覽對話框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>收據預覽</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="收據大圖"
                className="mx-auto max-h-[70vh] w-full rounded-md bg-white object-contain"
              />
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                className="inline-flex items-center text-sm text-blue-600 hover:underline"
              >
                在新分頁開啟
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TransactionsPage
