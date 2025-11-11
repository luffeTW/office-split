import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { groupService } from '../services/groupService'
import { reportService, Report } from '../services/reportService'
import { categoryService } from '../services/categoryService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function ReportsPage() {
  const [showAll, setShowAll] = useState<boolean>(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  // 單一群組報表
  const { data: groupReport, isLoading: groupLoading } = useQuery({
    queryKey: ['report', selectedGroupId, startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: () => {
      if (!selectedGroupId || showAll) return null as any
      return reportService.getGroupReport(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 全部群組報表（彙整）
  const { data: allReport, isLoading: allLoading } = useQuery({
    queryKey: ['report', 'all', startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: async () => {
      if (!showAll || !groups) return null as any
      const perGroup = await Promise.all(groups.map(g => reportService.getGroupReport(
        g.id,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )))
      // 合併分類統計
      const catMap = new Map<number, { categoryId: number; categoryName: string; categoryType: string; totalAmount: number; transactionCount: number }>()
      let totalIncome = 0
      let totalExpense = 0
      for (const r of perGroup) {
        totalIncome += r.totalIncome
        totalExpense += r.totalExpense
        for (const s of (r.categorySummaries || [])) {
          const ex = catMap.get(s.categoryId)
          if (ex) {
            ex.totalAmount += s.totalAmount
            ex.transactionCount += s.transactionCount
          } else {
            catMap.set(s.categoryId, { ...s })
          }
        }
      }
      const merged: Report = {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        categorySummaries: Array.from(catMap.values()),
        userBalances: [],
        monthlySummaries: [],
      }
      return merged
    },
    enabled: showAll && !!groups,
  })

  const isLoading = groupLoading || allLoading
  const currentReport: Report | null = showAll ? (allReport || null) : (groupReport || null)

  const handleExportCsv = async () => {
    if (!selectedGroupId || showAll) return
    try {
      const blob = await reportService.exportToCsv(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
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
    if (!selectedGroupId || showAll) return
    try {
      const blob = await reportService.exportToExcel(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
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
      <div className="mb-3">
        <h2 className="text-2xl font-semibold">報表</h2>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">群組</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={showAll ? 'all' : String(selectedGroupId || '')}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'all') {
                setShowAll(true)
              } else {
                setShowAll(false)
                setSelectedGroupId(Number(val))
              }
            }}
          >
            <option value="all">全部</option>
            {(groups ?? []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">開始日期</label>
          <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">結束日期</label>
          <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">分類</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedCategoryId === 'all' ? 'all' : String(selectedCategoryId)}
            onChange={(e) => {
              const val = e.target.value
              setSelectedCategoryId(val === 'all' ? 'all' : Number(val))
            }}
          >
            <option value="all">全部</option>
            {(categories ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={handleExportCsv} disabled={showAll}>匯出 CSV</Button>
          <Button onClick={handleExportExcel} disabled={showAll}>匯出 Excel</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : currentReport ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">總收入</div>
              <div className="mt-2 text-2xl text-green-600">${currentReport.totalIncome.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">總支出</div>
              <div className="mt-2 text-2xl text-red-600">${currentReport.totalExpense.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">餘額</div>
              <div className={`mt-2 text-2xl ${currentReport.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>${currentReport.balance.toFixed(2)}</div>
            </CardContent>
          </Card>

          {currentReport.categorySummaries && currentReport.categorySummaries.length > 0 && (
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
                        {currentReport.categorySummaries.map((summary) => (
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

          {/* 分類篩選下暫不顯示成員餘額，以免誤導 */}
          {selectedCategoryId === 'all' && currentReport.userBalances && currentReport.userBalances.length > 0 && (
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
                        {currentReport.userBalances.map((balance) => (
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
        <div className="rounded border bg-card p-4 text-sm text-muted-foreground">請選擇範圍或群組以查看報表</div>
      )}
    </div>
  )
}

export default ReportsPage
