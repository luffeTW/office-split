import React from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

export type TreemapNode = { name: string; size: number }

interface Props {
  data: TreemapNode[]
  height?: number
}

export const CategoryTreemap: React.FC<Props> = ({ data, height = 320 }) => {
  const tree = [{ name: 'root', children: (data || []).map(d => ({ name: d.name, size: d.size })) }]
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={tree}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#60a5fa"
        >
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}

export default CategoryTreemap
