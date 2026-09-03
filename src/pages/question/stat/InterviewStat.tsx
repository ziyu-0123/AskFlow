import { type FC, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Space, Typography, Spin, Empty, Card, Modal } from 'antd'
import { LeftOutlined, EditOutlined, RobotOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { getInterviewAnswerListService } from '../../../services/stat'
import { summarizeInterviewService, type SummarizeAnswersResult } from '../../../services/ai'
import { updateAiConfiguredReducer } from '../../../store/userReducer'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import AISettingsModal from '../../../components/AISettingsModal'
import styles from './InterviewStat.module.scss'

const { Title, Paragraph, Text } = Typography

const percent = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0

const SENTIMENT_COLORS = { positive: '#52c41a', negative: '#ff4d4f', neutral: '#bfbfbf' }

type ConversationItem = { role: string; content: string }
type InterviewAnswer = { _id: string; conversationList: ConversationItem[] }
type InterviewListData = { list: InterviewAnswer[]; total: number }

const InterviewStat: FC = () => {
  const nav = useNavigate()
  const { id = '' } = useParams()
  const dispatch = useDispatch()
  const { title } = useGetPageInfo()
  const { aiConfigured } = useGetUserInfo()
  const [summary, setSummary] = useState<SummarizeAnswersResult | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 加载访谈答卷列表（axios 拦截器已解包，直接返回 { list, total }）
  const { data: listData, loading: listLoading } = useRequest(
    () => getInterviewAnswerListService(id, { page: 1, pageSize: 100 }),
    { ready: !!id }
  )
  const list = (listData as InterviewListData | undefined)?.list ?? []
  const total = (listData as InterviewListData | undefined)?.total ?? 0

  // AI 总结（整卷主题聚类 + 情感）
  const { loading: summaryLoading, run: runSummary } = useRequest(
    () => summarizeInterviewService(id),
    {
      manual: true,
      onSuccess(res) {
        setSummary(res)
      },
      onError(err) {
        // 后端 400"请先配置"说明 aiConfigured 已过期，同步并直开设置弹窗
        if (err.message.includes('请先配置')) {
          dispatch(updateAiConfiguredReducer(false))
          setSettingsOpen(true)
        }
      },
    }
  )

  function handleSummary() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 总结访谈需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
        okText: '知道了',
      })
      return
    }
    runSummary()
  }

  function genSummaryElem() {
    if (!summary) return null
    const { summary: overview, themes, sentiment } = summary
    const sentimentTotal = sentiment.positive + sentiment.negative + sentiment.neutral

    return (
      <div>
        <Paragraph>{overview}</Paragraph>

        <Title level={5}>主题聚类</Title>
        {themes.map((t, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong>{t.label}</Text>
              <Text type="secondary">
                {t.count} 份 · {percent(t.count, total)}%
              </Text>
            </div>
            <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percent(t.count, total)}%`,
                  height: '100%',
                  background: '#1677ff',
                }}
              />
            </div>
            {t.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t.description}
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
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button size="small" onClick={runSummary} disabled={summaryLoading}>
            重新总结
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <Button type="link" icon={<LeftOutlined />} onClick={() => nav(-1)}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        </Space>
        <Button icon={<EditOutlined />} onClick={() => nav(`/question/interview/${id}`)}>
          编辑访谈
        </Button>
      </div>

      <div className={styles.content}>
        <Card className={styles.card} title="AI 总结访谈">
          {summaryLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                正在分析全部访谈记录，约需 10~30 秒...
              </Paragraph>
            </div>
          ) : summary ? (
            genSummaryElem()
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Paragraph type="secondary">对全部访谈聊天记录做主题聚类与情感分析</Paragraph>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleSummary}
                disabled={total === 0}
              >
                生成 AI 总结
              </Button>
            </div>
          )}
        </Card>

        <Card className={styles.card} title={`访谈答卷（${total}）`}>
          {listLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin />
            </div>
          ) : list.length === 0 ? (
            <Empty description="暂无访谈答卷" />
          ) : (
            list.map((a, i) => (
              <div key={a._id} className={styles.answerItem}>
                <Text strong>访谈 {i + 1}</Text>
                <div className={styles.conversation}>
                  {(a.conversationList ?? []).map((m, j) => (
                    <div
                      key={j}
                      className={m.role === 'interviewer' ? styles.msgLeft : styles.msgRight}
                    >
                      <div className={styles.bubble}>{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default InterviewStat
