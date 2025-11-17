import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import React from 'react'

export type CategoryPieDatum = {
  name: string
  value: number
}

const DEFAULT_COLORS = [
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#22C55E',
  '#3B82F6',
  '#E11D48',
]

interface Props {
  data: CategoryPieDatum[]
  colors?: string[]
  height?: number
  valuePrefix?: string
}

export const CategoryPieChart: React.FC<Props> = ({ data, colors = DEFAULT_COLORS, height = 260, valuePrefix = '$' }) => {
  const filtered = (data || []).filter(d => d.value > 0)
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            paddingAngle={2}
          >
            {filtered.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${valuePrefix}${value.toFixed(2)}`} />
          <Legend verticalAlign="bottom" height={24} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CategoryPieChart
