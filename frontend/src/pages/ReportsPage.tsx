import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { groupService } from '../services/groupService'
import { reportService } from '../services/reportService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function ReportsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', selectedGroupId],
    queryFn: () => {
      if (!selectedGroupId) return null as any
      return reportService.getGroupReport(selectedGroupId)
    },
    enabled: !!selectedGroupId,
  })

  const handleExportCsv = async () => {
    if (!selectedGroupId) return
    try {
      const blob = await reportService.exportToCsv(selectedGroupId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${selectedGroupId}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('匯出失敗:', error)
    }
  }

  const handleExportExcel = async () => {
    if (!selectedGroupId) return
    try {
      const blob = await reportService.exportToExcel(selectedGroupId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${selectedGroupId}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('匯出失敗:', error)
    }
  }

  if (!groups || groups.length === 0) {
    return <div className="rounded border bg-card p-4 text-sm text-muted-foreground">請先創建或加入群組</div>
  }

  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">報表</h2>
        <div className="space-x-2">
          <Button onClick={handleExportCsv}>匯出 CSV</Button>
          <Button onClick={handleExportExcel}>匯出 Excel</Button>
        </div>
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
      ) : report ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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

          {report.categorySummaries && report.categorySummaries.length > 0 && (
            <div className="col-span-1 md:col-span-3">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-3 text-lg font-medium">分類統計</div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>類別</TableHead>
                          <TableHead>類型</TableHead>
                          <TableHead>總金額</TableHead>
                          <TableHead>交易次數</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.categorySummaries.map((summary) => (
                          <TableRow key={summary.categoryId}>
                            <TableCell>{summary.categoryName}</TableCell>
                            <TableCell>{summary.categoryType}</TableCell>
                            <TableCell>${summary.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>{summary.transactionCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {report.userBalances && report.userBalances.length > 0 && (
            <div className="col-span-1 md:col-span-3">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-3 text-lg font-medium">成員餘額</div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>成員</TableHead>
                          <TableHead>已付</TableHead>
                          <TableHead>應付</TableHead>
                          <TableHead>餘額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.userBalances.map((balance) => (
                          <TableRow key={balance.userId}>
                            <TableCell>{balance.username}</TableCell>
                            <TableCell>${balance.totalPaid.toFixed(2)}</TableCell>
                            <TableCell>${balance.totalOwed.toFixed(2)}</TableCell>
                            <TableCell className={balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${balance.balance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded border bg-card p-4 text-sm text-muted-foreground">選擇群組以查看報表</div>
      )}
    </div>
  )
}

export default ReportsPage
