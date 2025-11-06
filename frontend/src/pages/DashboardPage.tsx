import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { groupService } from '../services/groupService'
import { transactionService } from '../services/transactionService'
import { reportService, MyDebts } from '../services/reportService'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'

function DashboardPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return Promise.resolve([])
      return transactionService.getTransactions(selectedGroupId)
    },
    enabled: !!selectedGroupId,
  })

  const queryClient = useQueryClient()

  const { data: myDebts } = useQuery<MyDebts>({
    queryKey: ['my-debts', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return Promise.resolve({ iOwe: [], oweMe: [], totalIOwe: 0, totalOweMe: 0, net: 0 })
      return reportService.getMyDebts(selectedGroupId)
    },
    enabled: !!selectedGroupId,
  })

  const settleMutation = useMutation({
    mutationFn: ({ otherUserId, direction }: { otherUserId: number; direction: 'IOwe' | 'OweMe' }) =>
      transactionService.settlePairDebts(selectedGroupId!, otherUserId, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  if (groupsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!groups || groups.length === 0) {
    return <div className="rounded border bg-card p-4 text-sm text-muted-foreground">尚未加入任何群組，請先創建或加入群組</div>
  }

  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id)
  }

  const recentTransactions = transactions?.slice(0, 5) || []

  return (
    <div>
      <h2 className="text-2xl font-semibold">儀表板</h2>

      {myDebts && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">我應付總額</div>
              <div className="mt-2 text-2xl text-red-600">${myDebts.totalIOwe.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">他人應付我</div>
              <div className="mt-2 text-2xl text-green-600">${myDebts.totalOweMe.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">淨額</div>
              <div className={`mt-2 text-2xl ${myDebts.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>${myDebts.net.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {myDebts && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="mb-3 text-lg font-medium">我欠別人</div>
              {myDebts.iOwe.length === 0 ? (
                <div className="text-sm text-muted-foreground">沒有欠款</div>
              ) : (
                <div className="divide-y">
                  {myDebts.iOwe.map(item => (
                    <div key={item.userId} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>{item.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">${item.amount.toFixed(2)}</span>
                        <button
                          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                          onClick={() => settleMutation.mutate({ otherUserId: item.userId, direction: 'IOwe' })}
                          disabled={settleMutation.isPending}
                        >
                          {settleMutation.isPending ? '處理中...' : '結清'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="mb-3 text-lg font-medium">別人欠我</div>
              {myDebts.oweMe.length === 0 ? (
                <div className="text-sm text-muted-foreground">沒有債權</div>
              ) : (
                <div className="divide-y">
                  {myDebts.oweMe.map(item => (
                    <div key={item.userId} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>{item.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">${item.amount.toFixed(2)}</span>
                        <button
                          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                          onClick={() => settleMutation.mutate({ otherUserId: item.userId, direction: 'OweMe' })}
                          disabled={settleMutation.isPending}
                        >
                          {settleMutation.isPending ? '處理中...' : '結清'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">最近交易</div>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">尚無交易記錄</div>
            ) : (
              <div className="divide-y">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="py-2">
                    <div className="text-sm">
                      {transaction.categoryIcon} {transaction.categoryName} - ${transaction.amount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('zh-TW')} - {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
