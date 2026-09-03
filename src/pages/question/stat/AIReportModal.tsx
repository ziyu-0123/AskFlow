import { type FC, useState } from 'react'
import { Button, Modal, Spin, Typography } from 'antd'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { analyzeReportService, type ReportResult } from '../../../services/ai'
import { updateAiConfiguredReducer } from '../../../store/userReducer'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import AISettingsModal from '../../../components/AISettingsModal'

const { Title, Paragraph, Text } = Typography

type PropsType = {
  questionId: string
  open: boolean
  onClose: () => void
}

// AI 整卷分析报告弹窗：idle 选说明 → loading → 报告态分区渲染
// （总体结论 / 每题洞察 / 改进建议），关闭重置回 idle，下次打开重新生成
const AIReportModal: FC<PropsType> = ({ questionId, open, onClose }) => {
  const dispatch = useDispatch()
  const { aiConfigured } = useGetUserInfo()
  const [result, setResult] = useState<ReportResult | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { loading, run } = useRequest(async () => await analyzeReportService(questionId), {
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
  })

  function handleClose() {
    // 关闭即重置（不缓存，答卷随时在涨，下次打开重新生成）
    setResult(null)
    onClose()
  }

  function handleGenerate() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 解读报告需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
        okText: '知道了',
      })
      return
    }
    run()
  }

  // 报告结果态
  function genReportElem() {
    if (!result) return null
    const { overview, insights, suggestions } = result

    return (
      <>
        <div style={{ borderLeft: '3px solid #1677ff', paddingLeft: 12, marginBottom: 20 }}>
          <Title level={5} style={{ marginTop: 0 }}>
            总体结论
          </Title>
          <Paragraph style={{ marginBottom: 0 }}>{overview}</Paragraph>
        </div>

        <Title level={5}>每题洞察</Title>
        {insights.map((insight, i) => (
          <div
            key={i}
            style={{
              background: '#fafafa',
              borderRadius: 6,
              padding: '10px 12px',
              marginBottom: 8,
            }}
          >
            <Text strong>{insight.question}</Text>
            <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{insight.finding}</Paragraph>
            {insight.chartDesc && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                图表建议：{insight.chartDesc}
              </Text>
            )}
          </div>
        ))}

        {suggestions.length > 0 && (
          <>
            <Title level={5} style={{ marginTop: 20 }}>
              改进建议
            </Title>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              {suggestions.map((s, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {s}
                </li>
              ))}
            </ol>
          </>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: 20,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12, marginRight: 16 }}>
            AI 生成，仅供参考
          </Text>
          <Button size="small" onClick={run} disabled={loading}>
            重新生成
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Modal
        title="AI 解读报告"
        open={open}
        onCancel={handleClose}
        width={720}
        footer={null}
        destroyOnClose
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>
              正在分析全部答卷，约需 10~30 秒，请稍候...
            </Paragraph>
          </div>
        ) : result ? (
          genReportElem()
        ) : (
          <>
            <Paragraph type="secondary">
              基于全部答卷生成整卷解读报告，含每题洞察与改进建议
            </Paragraph>
            <Button type="primary" onClick={handleGenerate}>
              生成报告
            </Button>
          </>
        )}
      </Modal>

      {/* 报告失败可能因 Key 无效/未配置，提供直达设置的入口 */}
      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default AIReportModal
