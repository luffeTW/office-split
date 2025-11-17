import React from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export type ScatterPoint = { month: number; amount: number }

interface Props { data: ScatterPoint[]; height?: number }

// simple deterministic jitter based on month and amount
const jitter = (m: number, a: number) => {
  const seed = Math.sin(m * 12.9898 + a * 78.233) * 43758.5453
  return (seed - Math.floor(seed)) * 0.4 - 0.2 // [-0.2, 0.2]
}

export const TransactionScatter: React.FC<Props> = ({ data, height = 300 }) => {
  const jittered = (data || []).map(d => ({ ...d, jx: d.month + jitter(d.month, d.amount) }))
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="jx" tickFormatter={(v) => `${Math.round(v)}`} domain={[1, 12]} ticks={[1,2,3,4,5,6,7,8,9,10,11,12]} name="月份" />
          <YAxis type="number" dataKey="amount" tickFormatter={(v) => `$${v}`} name="金額" />
          <Tooltip formatter={(v: number) => `$${Number(v).toFixed(2)}`} labelFormatter={(l) => `Month ${Math.round(Number(l))}`} />
          <Legend />
          <Scatter data={jittered} fill="#6366F1" name="交易" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TransactionScatter
