import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { groupService } from '../services/groupService'
import { transactionService } from '../services/transactionService'
import { categoryService } from '../services/categoryService'
import { reportService, MyDebts, type Report, type CategorySummary, type MonthlySummary } from '../services/reportService'
import { Card, CardContent } from '@/components/ui/card'
import CategoryPieChart from '@/components/charts/CategoryPieChart'
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart'
import MonthlyIncomeExpenseAreaChart from '@/components/charts/MonthlyIncomeExpenseAreaChart'
import CategoryDonutChart from '@/components/charts/CategoryDonutChart'
import StackedCategoryMonthlyBar from '@/components/charts/StackedCategoryMonthlyBar'
import MemberBalanceBar from '@/components/charts/MemberBalanceBar'
import UserCategoryRadar from '@/components/charts/UserCategoryRadar'
import CategoryTreemap from '@/components/charts/CategoryTreemap'
import TransactionScatter from '@/components/charts/TransactionScatter'

function DashboardPage() {
  // showAll 為 true 時代表顯示「全部群組」的統合狀態
  const [showAll, setShowAll] = useState<boolean>(true)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getUserGroups(),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  // 單一群組交易
  const { data: groupTransactions, isLoading: groupTxLoading } = useQuery({
    queryKey: ['transactions', selectedGroupId, startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: () => {
      if (!selectedGroupId || showAll) return Promise.resolve([])
      return transactionService.getTransactions(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 全部群組交易（僅在 showAll 時啟用）
  const { data: allTransactions, isLoading: allTxLoading } = useQuery({
    queryKey: ['transactions', 'all', startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: async () => {
      if (!showAll || !groups) return []
      const perGroup = await Promise.all(
        groups.map(g => transactionService.getTransactions(
          g.id,
          startDate || undefined,
          endDate || undefined,
          selectedCategoryId === 'all' ? undefined : selectedCategoryId
        ))
      )
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
    queryKey: ['my-debts', selectedGroupId, startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: () => {
      if (!selectedGroupId || showAll)
        return Promise.resolve({ iOwe: [], oweMe: [], totalIOwe: 0, totalOweMe: 0, net: 0 })
      return reportService.getMyDebts(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 全部群組債務統合
  const { data: myDebtsAll } = useQuery<MyDebts>({
    queryKey: ['my-debts', 'all', startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: async () => {
      if (!showAll || !groups) return { iOwe: [], oweMe: [], totalIOwe: 0, totalOweMe: 0, net: 0 }
      const perGroup = await Promise.all(groups.map(g => reportService.getMyDebts(
        g.id,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )))
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

  // 報表資料：單一群組
  const { data: singleReport, isLoading: singleReportLoading } = useQuery<Report>({
    queryKey: ['report', selectedGroupId, startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: () => {
      if (!selectedGroupId || showAll) return Promise.resolve({
        totalIncome: 0, totalExpense: 0, balance: 0,
        categorySummaries: [], monthlySummaries: [], userBalances: []
      } as Report)
      return reportService.getGroupReport(
        selectedGroupId,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )
    },
    enabled: !!selectedGroupId && !showAll,
  })

  // 報表資料：全部群組，前端彙整
  const { data: aggregatedReport, isLoading: aggregatedReportLoading } = useQuery<Report>({
    queryKey: ['report', 'all', startDate || null, endDate || null, selectedCategoryId === 'all' ? null : selectedCategoryId],
    queryFn: async () => {
      if (!showAll || !groups) return {
        totalIncome: 0, totalExpense: 0, balance: 0,
        categorySummaries: [], monthlySummaries: [], userBalances: []
      } as Report
      const reports = await Promise.all(groups.map(g => reportService.getGroupReport(
        g.id,
        startDate || undefined,
        endDate || undefined,
        selectedCategoryId === 'all' ? undefined : selectedCategoryId
      )))

      // 合併函式
      const catMap = new Map<string, CategorySummary>()
      const monthKey = (m: MonthlySummary) => `${m.year}-${String(m.month).padStart(2, '0')}`
      const monthMap = new Map<string, MonthlySummary>()

      let totalIncome = 0
      let totalExpense = 0

      const userMap = new Map<number, { userId: number; username: string; totalPaid: number; totalOwed: number; balance: number }>()
      for (const r of reports) {
        totalIncome += r.totalIncome
        totalExpense += r.totalExpense
        for (const c of r.categorySummaries || []) {
          const key = `${c.categoryName}|${c.categoryType}`
          const exist = catMap.get(key)
          if (exist) {
            exist.totalAmount += c.totalAmount
            exist.transactionCount += c.transactionCount
          } else {
            catMap.set(key, { ...c })
          }
        }
        for (const m of r.monthlySummaries || []) {
          const key = monthKey(m)
          const exist = monthMap.get(key)
          if (exist) {
            exist.income += m.income
            exist.expense += m.expense
            exist.balance += m.balance
          } else {
            monthMap.set(key, { ...m })
          }
        }
        for (const ub of r.userBalances || []) {
          const ex = userMap.get(ub.userId)
          if (ex) {
            ex.totalPaid += ub.totalPaid
            ex.totalOwed += ub.totalOwed
            ex.balance += ub.balance
          } else {
            userMap.set(ub.userId, { ...ub })
          }
        }
      }

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        categorySummaries: Array.from(catMap.values()),
        monthlySummaries: Array.from(monthMap.values()).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year),
        userBalances: Array.from(userMap.values()),
      } as Report
    },
    enabled: showAll && !!groups,
  })

  // 依狀態自動選擇第一個群組（避免在 render 中 setState）
  useEffect(() => {
    if (!showAll && !selectedGroupId && (groups?.length ?? 0) > 0) {
      setSelectedGroupId(groups![0].id)
    }
  }, [showAll, selectedGroupId, groups])

  const usingTransactions = showAll ? allTransactions : groupTransactions
  const transactionsLoading = showAll ? allTxLoading : groupTxLoading
  const myDebts = showAll ? myDebtsAll : myDebtsSingle
  const recentTransactions = (usingTransactions || []).slice(0, 5)

  const usingReport = showAll ? aggregatedReport : singleReport
  const reportLoading = showAll ? aggregatedReportLoading : singleReportLoading

  // 圖表資料整理
  const categoryPieData = useMemo(() => {
    const list = usingReport?.categorySummaries || []
    // 預設顯示支出類別
    const expenseOnly = list.filter(c => c.categoryType === 'Expense')
    // 取前 8 名，其餘合併為其他
    const sorted = [...expenseOnly].sort((a, b) => b.totalAmount - a.totalAmount)
    const top = sorted.slice(0, 8)
    const rest = sorted.slice(8)
    const data = top.map(c => ({ name: c.categoryName, value: Number(c.totalAmount) }))
    const restSum = rest.reduce((sum, c) => sum + Number(c.totalAmount), 0)
    if (restSum > 0) data.push({ name: '其他', value: restSum })
    return data
  }, [usingReport])

  const monthlyTrendData = useMemo(() => {
    const list = usingReport?.monthlySummaries || []
    return list.map(m => ({
      monthLabel: `${m.year}-${String(m.month).padStart(2, '0')}`,
      income: Number(m.income),
      expense: Number(m.expense),
      balance: Number(m.balance),
    }))
  }, [usingReport])

  // Area chart uses相同 monthly 資料
  const monthlyAreaData = monthlyTrendData

  // Donut category (expense only, sorted)
  const categoryDonutData = useMemo(() => {
    const list = usingReport?.categorySummaries || []
    return [...list]
      .filter(c => c.categoryType === 'Expense' && Number(c.totalAmount) > 0)
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
      .map(c => ({ name: c.categoryName, value: Number(c.totalAmount) }))
  }, [usingReport])

  // Stacked Category x Month (Expense only)
  const stackedCategory = useMemo(() => {
    const tx = usingTransactions || []
    if (!categories || categories.length === 0) return { data: [], keys: [] as string[] }
    const typeMap = new Map<number, string>(categories.map(c => [c.id, c.type]))
    const monthMap = new Map<string, Record<string, number>>()
    const totalByCat = new Map<string, number>()

    for (const t of tx) {
      const type = typeMap.get(t.categoryId)
      if (type !== 'Expense') continue
      const monthLabel = new Date(t.date).toISOString().slice(0, 7)
      const key = t.categoryName || `分類${t.categoryId}`
      if (!monthMap.has(monthLabel)) monthMap.set(monthLabel, {})
      const row = monthMap.get(monthLabel)!
      row[key] = (row[key] || 0) + Number(t.amount)
      totalByCat.set(key, (totalByCat.get(key) || 0) + Number(t.amount))
    }

    // 只取前 6 名，其他合併
    const topCats = [...totalByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0])
    const rows = [...monthMap.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1).map(([monthLabel, row]) => {
      const base: any = { monthLabel }
      let other = 0
      for (const [k, v] of Object.entries(row)) {
        if (topCats.includes(k)) base[k] = v as number
        else other += v as number
      }
      if (other > 0) base['其他'] = other
      return base
    })
    const keys = [...topCats]
    if (rows.some(r => r['其他'])) keys.push('其他')
    return { data: rows, keys }
  }, [usingTransactions, categories])

  // Member balance (from report)
  const memberBalanceData = useMemo(() => {
    return (usingReport?.userBalances || []).map(u => ({ name: u.username, balance: Number(u.balance) }))
  }, [usingReport])

  // User x Category radar (Expense via splits)
  const radarData = useMemo(() => {
    const tx = usingTransactions || []
    if (!categories || categories.length === 0) return { rows: [], users: [] as string[] }
    const typeMap = new Map<number, string>(categories.map(c => [c.id, c.type]))
    const users = new Map<number, string>()
    const cats = new Set<string>()
    const byUserCat = new Map<string, number>() // `${userName}||${catName}` -> sum

    for (const t of tx) {
      const type = typeMap.get(t.categoryId)
      if (type !== 'Expense') continue
      const catName = t.categoryName || `分類${t.categoryId}`
      cats.add(catName)
      for (const s of (t.splits || [])) {
        users.set(s.userId, s.userName || String(s.userId))
        const key = `${s.userName || s.userId}||${catName}`
        byUserCat.set(key, (byUserCat.get(key) || 0) + Number(s.amount))
      }
    }

    // 選前 6 個分類（依總額）
    const catTotals = new Map<string, number>()
    byUserCat.forEach((v, k) => {
      const cat = k.split('||')[1]
      catTotals.set(cat, (catTotals.get(cat) || 0) + v)
    })
    const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0])
    const userList = [...users.values()].slice(0, 5) // 限制最多 5 位，避免太亂

    const rows = topCats.map(cat => {
      const row: any = { category: cat }
      for (const uname of userList) {
        const key = `${uname}||${cat}`
        row[uname] = byUserCat.get(key) || 0
      }
      return row
    })
    return { rows, users: userList }
  }, [usingTransactions, categories])

  // Treemap for categories (Expense only)
  const treemapData = useMemo(() => {
    return (usingReport?.categorySummaries || [])
      .filter(c => c.categoryType === 'Expense' && Number(c.totalAmount) > 0)
      .map(c => ({ name: c.categoryName, size: Number(c.totalAmount) }))
  }, [usingReport])

  // Scatter: month x amount (transaction amount)
  const scatterData = useMemo(() => {
    const tx = usingTransactions || []
    return tx.map(t => ({ month: new Date(t.date).getUTCMonth() + 1, amount: Number(t.amount) }))
  }, [usingTransactions])

  // 在所有 hooks 之後再做條件渲染（避免改變 hooks 呼叫順序）
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

  return (
    <div>
      <h2 className="text-2xl font-semibold">儀表板</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
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

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">支出分類分佈</div>
            {reportLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : (categoryPieData?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <CategoryPieChart data={categoryPieData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">每月趨勢</div>
            {reportLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : (monthlyTrendData?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <MonthlyTrendChart data={monthlyTrendData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced charts per spec */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">每月收支與淨額</div>
            {reportLoading || monthlyAreaData.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <MonthlyIncomeExpenseAreaChart data={monthlyAreaData} />
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">分類占比</div>
            {reportLoading || categoryDonutData.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <CategoryDonutChart data={categoryDonutData} />
            )}
          </CardContent>
        </Card> */}

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">分類 × 月堆疊支出</div>
            {stackedCategory.data.length === 0 || stackedCategory.keys.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <StackedCategoryMonthlyBar data={stackedCategory.data as any} categories={stackedCategory.keys} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">成員餘額</div>
            {memberBalanceData.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <MemberBalanceBar data={memberBalanceData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">成員×分類消費輪廓</div>
            {radarData.rows.length === 0 || radarData.users.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <UserCategoryRadar data={radarData.rows as any} users={radarData.users} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">分類結構</div>
            {treemapData.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <CategoryTreemap data={treemapData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 text-lg font-medium">單筆散點（月 × 金額）</div>
            {scatterData.length === 0 ? (
              <div className="text-sm text-muted-foreground">沒有可顯示的資料</div>
            ) : (
              <TransactionScatter data={scatterData} />
            )}
          </CardContent>
        </Card>
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
