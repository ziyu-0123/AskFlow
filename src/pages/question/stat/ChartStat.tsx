import { type FC, useEffect, useState } from 'react'
import { Typography } from 'antd'
import { getComponentStatService } from '../../../services/stat'
import { useRequest } from 'ahooks'
import { useParams } from 'react-router-dom'

const { Title } = Typography

type PropsType = {
  selectedComponentId: string
  selectedComponentType: string
}

const ChartStat: FC<PropsType> = (props: PropsType) => {
  const { selectedComponentId } = props
  const { id = '' } = useParams()

  const [stat, setStat] = useState<Record<string, unknown>[]>([])
  const { run } = useRequest(
    async (questionId, componentId) => await getComponentStatService(questionId, componentId),
    {
      manual: true,
      onSuccess(res) {
        const { stat = [] } = res as { stat?: Record<string, unknown>[] }
        setStat(stat)
      },
    }
  )

  useEffect(() => {
    if (selectedComponentId) run(id, selectedComponentId)
  }, [id, selectedComponentId])

  // 生成统计图表
  function genStatElem() {
    if (!selectedComponentId) return <div>未选中组件</div>

    return <div>{JSON.stringify(stat)}</div>
  }

  return (
    <>
      <Title level={3} style={{ marginTop: 0 }}>
        图表统计
      </Title>
      <div>{genStatElem()}</div>
    </>
  )
}

export default ChartStat
