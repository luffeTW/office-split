import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// data shape: one row per category, each key = user label -> value
// e.g. { category: '餐飲', Alice: 120, Bob: 80 }
export type RadarRow = { category: string; [user: string]: string | number }

interface Props {
  data: RadarRow[]
  users: string[] // radar series keys
  height?: number
}

export const UserCategoryRadar: React.FC<Props> = ({ data, users, height = 340 }) => {
  const colors = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#fb7185', '#22d3ee']
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis tick={false} />
          <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
          <Legend />
          {users.map((u, idx) => (
            <Radar key={u} name={u} dataKey={u} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.2} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default UserCategoryRadar
