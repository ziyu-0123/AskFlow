import { type FC, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { STAT_COLORS } from '../../../constant'
import { type QuestionRadioStatPropsType } from './interface'

function format(n: number) {
  return (n * 100).toFixed(2)
}

const StatComponent: FC<QuestionRadioStatPropsType> = ({ stat = [] }) => {
  // count 求和
  const sum = useMemo(() => {
    let s = 0
    stat.forEach(i => (s += i.count))
    return s
  }, [stat])

  return (
    <div style={{ width: '300px', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart width={400} height={400}>
          <Pie
            dataKey="count"
            data={stat}
            cx="50%" // x 轴的偏移
            cy="50%" // y 轴的偏移
            outerRadius={80} // 饼图的直径
            fill="#8884d8"
            label={i => {
              const { name, count } = i as unknown as { name: string; count: number }
              return `${name}: ${format(count / sum)}%`
            }}
          >
            {stat.map((_i, index) => {
              return <Cell key={index} fill={STAT_COLORS[index]} />
            })}
          </Pie>
          <Tooltip></Tooltip>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StatComponent
