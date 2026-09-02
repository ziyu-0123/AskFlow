import { type FC, useEffect, useState } from 'react'
import { Button, Modal, Spin, Typography } from 'antd'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { summarizeAnswersService, type SummarizeAnswersResult } from '../../../services/ai'
import { updateAiConfiguredReducer } from '../../../store/userReducer'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import AISettingsModal from '../../../components/AISettingsModal'

const { Title, Paragraph, Text } = Typography

type PropsType = {
  questionId: string
  componentId: string
}

// 占比取整显示（count 为 AI 估算值，无需小数精度）
const percent = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0

// 情感分布堆叠横条配色：正面绿 / 负面红 / 中性灰
const SENTIMENT_COLORS = { positive: '#52c41a', negative: '#ff4d4f', neutral: '#bfbfbf' }

// 开放式问题（单行/多行输入）无统计图表，用 AI 总结卡片占住该空态：
// 意见聚类（label + 估算条数与占比条）+ 情感分布（三色堆叠横条）
const AiSummaryCard: FC<PropsType> = ({ questionId, componentId }) => {
  const dispatch = useDispatch()
  const { aiConfigured } = useGetUserInfo()
  const [result, setResult] = useState<SummarizeAnswersResult | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { loading, run } = useRequest(
    async () => await summarizeAnswersService(questionId, componentId),
    {
      manual: true,
      onSuccess(res) {
        setResult(res)
      },
      onError(err) {
        // 错误提示由 axios 拦截器统一弹出；后端 400"请先配置"说明 Redux 里的
        // aiConfigured 已过期，同步标记并直接打开设置弹窗引导重新配置
        if (err.message.includes('请先配置')) {
          dispatch(updateAiConfiguredReducer(false))
          setSettingsOpen(true)
        }
      },
    }
  )

  // 切换组件清空上次结果（不缓存，每次重新生成，保证结果最新鲜）
  useEffect(() => {
    setResult(null)
  }, [componentId])

  function handleGenerate() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 总结需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
        okText: '知道了',
      })
      return
    }
    run()
  }

  // 意见聚类结果态
  function genResultElem() {
    if (!result) return null
    const { summary, totalCount, themes, sentiment } = result
    const sentimentTotal = sentiment.positive + sentiment.negative + sentiment.neutral

    return (
      <>
        <Paragraph>{summary}</Paragraph>

        <Title level={5}>意见聚类</Title>
        {themes.map((theme, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong>{theme.label}</Text>
              <Text type="secondary">
                {theme.count} 条 · {percent(theme.count, totalCount)}%
              </Text>
            </div>
            <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percent(theme.count, totalCount)}%`,
                  height: '100%',
                  background: '#1677ff',
                }}
              />
            </div>
            {theme.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {theme.description}
              </Text>
            )}
          </div>
        ))}

        <Title level={5}>情感分布</Title>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${percent(sentiment.positive, sentimentTotal)}%`,
              background: SENTIMENT_COLORS.positive,
            }}
          />
          <div
            style={{
              width: `${percent(sentiment.negative, sentimentTotal)}%`,
              background: SENTIMENT_COLORS.negative,
            }}
          />
          <div
            style={{
              width: `${percent(sentiment.neutral, sentimentTotal)}%`,
              background: SENTIMENT_COLORS.neutral,
            }}
          />
        </div>
        <div style={{ marginTop: 4 }}>
          <Text style={{ color: SENTIMENT_COLORS.positive }}>正面 {sentiment.positive}</Text>
          <Text style={{ color: SENTIMENT_COLORS.negative, marginLeft: 16 }}>
            负面 {sentiment.negative}
          </Text>
          <Text style={{ color: '#8c8c8c', marginLeft: 16 }}>中性 {sentiment.neutral}</Text>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            基于 {totalCount} 条答案 · AI 估算，可能与逐条统计有出入
          </Text>
          <Button size="small" onClick={run} disabled={loading}>
            重新总结
          </Button>
        </div>
      </>
    )
  }

  return (
    <div>
      <Title level={5} style={{ marginTop: 0 }}>
        AI 总结开放式答案
      </Title>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>正在分析答案，约需 10~30 秒，请稍候...</Paragraph>
        </div>
      ) : result ? (
        genResultElem()
      ) : (
        <>
          <Paragraph type="secondary">
            开放式答案无统计图表，可使用 AI 对全部答案做意见聚类与情感分析
          </Paragraph>
          <Button type="primary" onClick={handleGenerate}>
            生成 AI 总结
          </Button>
        </>
      )}

      {/* 总结失败可能因 Key 无效/未配置，提供直达设置的入口 */}
      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default AiSummaryCard
