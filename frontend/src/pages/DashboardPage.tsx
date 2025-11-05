import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { groupService } from '../services/groupService'
import { transactionService } from '../services/transactionService'
import { reportService } from '../services/reportService'
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

  const { data: report } = useQuery({
    queryKey: ['report', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return null as any
      return reportService.getGroupReport(selectedGroupId)
    },
    enabled: !!selectedGroupId,
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

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {report && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">總收入</div>
                <div className="mt-2 text-2xl text-green-600">${report.totalIncome.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">總支出</div>
                <div className="mt-2 text-2xl text-red-600">${report.totalExpense.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">餘額</div>
                <div className={`mt-2 text-2xl ${report.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>${report.balance.toFixed(2)}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

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
