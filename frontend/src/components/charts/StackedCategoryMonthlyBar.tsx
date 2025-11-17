import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

export type StackedMonthDatum = {
  monthLabel: string
  [category: string]: string | number
}

interface Props {
  data: StackedMonthDatum[]
  categories: string[] // stack keys
  height?: number
}

export const StackedCategoryMonthlyBar: React.FC<Props> = ({ data, categories, height = 320 }) => {
  const colors = ['#60a5fa', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#22d3ee', '#84cc16']
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v}`} width={70} />
          <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
          <Legend />
          {categories.map((c, idx) => (
            <Bar
              key={c}
              dataKey={c}
              stackId="a"
              fill={colors[idx % colors.length]}
              barSize={22}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StackedCategoryMonthlyBar
