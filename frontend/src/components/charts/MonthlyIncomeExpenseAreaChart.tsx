import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine, Line } from 'recharts'

export type MonthlyAreaDatum = {
  monthLabel: string
  income: number
  expense: number
  balance: number
}

interface Props {
  data: MonthlyAreaDatum[]
  height?: number
}

export const MonthlyIncomeExpenseAreaChart: React.FC<Props> = ({ data, height = 320 }) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v}`} width={70} />
          <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
          <Legend />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="income" stroke="#16a34a" fill="url(#incomeFill)" name="收入" />
          <Area type="monotone" dataKey="expense" stroke="#dc2626" fill="url(#expenseFill)" name="支出" />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} name="淨額" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlyIncomeExpenseAreaChart
