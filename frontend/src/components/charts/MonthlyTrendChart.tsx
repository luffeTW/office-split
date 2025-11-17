import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import React from 'react'

export interface MonthlyTrendDatum {
  monthLabel: string // e.g. 2025-11
  income: number
  expense: number
  balance: number
}

interface Props {
  data: MonthlyTrendDatum[]
  height?: number
}

export const MonthlyTrendChart: React.FC<Props> = ({ data, height = 300 }) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v}`} width={70} />
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
          <Legend />
          <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="收入" />
          <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} name="支出" />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="淨額" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlyTrendChart
