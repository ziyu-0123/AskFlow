import { type FC, useEffect, useState } from 'react'
import { Typography } from 'antd'
import { getComponentStatService } from '../../../services/stat'
import { useRequest } from 'ahooks'
import { useParams } from 'react-router-dom'
import { getComponentConfByType } from '../../../components/QuestionComponents'
import AiSummaryCard from './AiSummaryCard'

const { Title } = Typography

type PropsType = {
  selectedComponentId: string
  selectedComponentType: string
}

const ChartStat: FC<PropsType> = (props: PropsType) => {
  const { selectedComponentId, selectedComponentType } = props
  const { id = '' } = useParams()

  const [stat, setStat] = useState<{ name: string; count: number }[]>([])
  const { run } = useRequest(
    async (questionId, componentId) => await getComponentStatService(questionId, componentId),
    {
      manual: true,
      onSuccess(res) {
        const { stat = [] } = res as { stat?: { name: string; count: number }[] }
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

    // 开放式问题无统计图表，用 AI 总结卡片占住该空态（意见聚类 + 情感分布）
    if (selectedComponentType === 'questionInput' || selectedComponentType === 'questionTextarea') {
      return <AiSummaryCard questionId={id} componentId={selectedComponentId} />
    }

    const { StatComponent } = getComponentConfByType(selectedComponentType) || {}
    if (StatComponent == null) return <div>该组件无统计图表</div>

    return <StatComponent stat={stat} />
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
