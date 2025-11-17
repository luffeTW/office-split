import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts'

export type CategoryDatum = { name: string; value: number }

const DEFAULT_COLORS = [
  '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6',
  '#14B8A6', '#F97316', '#22C55E', '#3B82F6', '#E11D48', '#84CC16', '#06B6D4'
]

interface Props {
  data: CategoryDatum[]
  height?: number
}

export const CategoryDonutChart: React.FC<Props> = ({ data, height = 300 }) => {
  const sorted = useMemo(() => [...(data || [])].sort((a, b) => b.value - a.value), [data])
  const total = useMemo(() => sorted.reduce((s, d) => s + d.value, 0), [sorted])

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sorted}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={60}
            paddingAngle={2}
            label={(entry) => {
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
              return `${entry.name} ${pct}%`
            }}
            labelLine={false}
          >
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
            ))}
            <Label position="center" content={() => null} />
          </Pie>
          <Tooltip formatter={(value: number) => `$${Number(value).toFixed(2)}`} />
          <Legend verticalAlign="bottom" height={24} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CategoryDonutChart
