import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts'

export type MemberBalanceDatum = { name: string; balance: number }

interface Props { data: MemberBalanceDatum[]; height?: number }

export const MemberBalanceBar: React.FC<Props> = ({ data, height = 320 }) => {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="name" width={90} />
          <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
          <Legend />
          <ReferenceLine x={0} stroke="#94a3b8" />
          <Bar dataKey="balance" name="餘額" barSize={18} radius={4}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#16a34a' : '#dc2626'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MemberBalanceBar
