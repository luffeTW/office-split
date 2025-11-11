import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { groupService } from '../services/groupService'
import { transactionService } from '../services/transactionService'
import { reportService, MyDebts } from '../services/reportService'
import { Card, CardContent } from '@/components/ui/card'

function DashboardPage() {
  // showAll 為 true 時代表顯示「全部群組」的統合狀態
  const [showAll, setShowAll] = useState<boolean>(true)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  // 單一群組交易
  const { data: groupTransactions, isLoading: groupTxLoading } = useQuery({
    queryKey: ['transactions', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId || showAll) return Promise.resolve([])
      return transactionService.getTransactions(selectedGroupId)
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 全部群組交易（僅在 showAll 時啟用）
  const { data: allTransactions, isLoading: allTxLoading } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: async () => {
      if (!showAll || !groups) return []
      const perGroup = await Promise.all(groups.map(g => transactionService.getTransactions(g.id)))
      const groupMap = new Map(groups.map(g => [g.id, g.name]))
      return perGroup
        .flat()
        .map(t => ({ ...t, groupName: t.groupName || groupMap.get(t.groupId) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    enabled: showAll && !!groups,
  })

  // 統計資料查詢（已移除結清功能，僅顯示資訊）

  // 單一群組債務
  const { data: myDebtsSingle } = useQuery<MyDebts>({
    queryKey: ['my-debts', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId || showAll)
        return Promise.resolve({ iOwe: [], oweMe: [], totalIOwe: 0, totalOweMe: 0, net: 0 })
      return reportService.getMyDebts(selectedGroupId)
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 全部群組債務統合
  const { data: myDebtsAll } = useQuery<MyDebts>({
    queryKey: ['my-debts', 'all'],
    queryFn: async () => {
      if (!showAll || !groups) return { iOwe: [], oweMe: [], totalIOwe: 0, totalOweMe: 0, net: 0 }
      const perGroup = await Promise.all(groups.map(g => reportService.getMyDebts(g.id)))
      const agg = {
        iOwe: new Map<number, { userId: number; username: string; amount: number }>(),
        oweMe: new Map<number, { userId: number; username: string; amount: number }>(),
        totalIOwe: 0,
        totalOweMe: 0,
      }
      for (const d of perGroup) {
        agg.totalIOwe += d.totalIOwe
        agg.totalOweMe += d.totalOweMe
        for (const item of d.iOwe) {
          agg.iOwe.set(item.userId, {
            userId: item.userId,
            username: item.username,
            amount: (agg.iOwe.get(item.userId)?.amount || 0) + item.amount,
          })
        }
        for (const item of d.oweMe) {
          agg.oweMe.set(item.userId, {
            userId: item.userId,
            username: item.username,
            amount: (agg.oweMe.get(item.userId)?.amount || 0) + item.amount,
          })
        }
      }
      return {
        iOwe: Array.from(agg.iOwe.values()).sort((a, b) => b.amount - a.amount),
        oweMe: Array.from(agg.oweMe.values()).sort((a, b) => b.amount - a.amount),
        totalIOwe: agg.totalIOwe,
        totalOweMe: agg.totalOweMe,
        net: agg.totalOweMe - agg.totalIOwe,
      }
    },
    enabled: showAll && !!groups,
  })

  // 結清功能已移除

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

  // 初始預設為全部；若使用者切換到單一群組且尚未選擇，則自動選第一個
  if (!showAll && !selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id)
  }

  const usingTransactions = showAll ? allTransactions : groupTransactions
  const transactionsLoading = showAll ? allTxLoading : groupTxLoading
  const myDebts = showAll ? myDebtsAll : myDebtsSingle
  const recentTransactions = usingTransactions?.slice(0, 5) || []

  return (
    <div>
      <h2 className="text-2xl font-semibold">儀表板</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setShowAll(true); }}
          className={`rounded px-3 py-1 text-sm border ${showAll ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
        >全部</button>
  {(groups ?? []).map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setShowAll(false); setSelectedGroupId(g.id) }}
            className={`rounded px-3 py-1 text-sm border ${!showAll && selectedGroupId === g.id ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
          >{g.name}</button>
        ))}
      </div>

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
                      {showAll && transaction.groupName && (
                        <span className="ml-2 rounded bg-muted px-1 py-0.5 text-xs">{transaction.groupName}</span>
                      )}
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
