import { useState } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button, Space, Spin, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { generateQuestionService, type AiGeneratedQuestion } from '../../services/ai'
import { createQuestionService, updateQuestionService } from '../../services/question'
import { updateAiConfiguredReducer } from '../../store/userReducer'
import AISettingsModal from '../../components/AISettingsModal'

interface AIGenerateModalProps {
  open: boolean
  onClose: () => void
}

// 状态机：idle 输入需求 → generating 生成中 → preview 预览
// （创建落库直接复用 useRequest loading，无需独立状态）
type Stage = 'idle' | 'generating' | 'preview'

// 组件 type → 预览列表中的类型标签
const TYPE_LABELS: Record<string, string> = {
  questionInfo: '问卷信息',
  questionTitle: '标题',
  questionParagraph: '段落',
  questionInput: '单行输入',
  questionTextarea: '多行输入',
  questionRadio: '单选题',
  questionCheckbox: '多选题',
}

// 计为"题目"的组件类型
const QUESTION_TYPES = ['questionRadio', 'questionCheckbox', 'questionInput', 'questionTextarea']

const AIGenerateModal: FC<AIGenerateModalProps> = ({ open, onClose }) => {
  const nav = useNavigate()
  const dispatch = useDispatch()
  const [stage, setStage] = useState<Stage>('idle')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<AiGeneratedQuestion | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const generateRequest = useRequest(generateQuestionService, {
    manual: true,
    onSuccess(data) {
      setResult(data)
      setStage('preview')
    },
    onError(err) {
      // 错误提示由 axios 拦截器统一弹出，回到输入态便于修改后重试
      setStage('idle')
      // 后端 400"请先配置"说明 Redux 里的 aiConfigured 已过期（如库中配置被清除
      // 但页面未刷新），同步标记并直接打开设置弹窗，引导重新配置
      if (err.message.includes('请先配置')) {
        dispatch(updateAiConfiguredReducer(false))
        setSettingsOpen(true)
      }
    },
  })

  // 创建空问卷 → 写入 AI 内容 → 跳转编辑页
  const createRequest = useRequest(
    async () => {
      const question = await createQuestionService()
      const id = question.id || question._id || ''
      if (!id || !result) throw new Error('创建问卷失败')
      await updateQuestionService(id, {
        title: result.title,
        desc: result.desc,
        componentList: result.componentList,
      })
      return id
    },
    {
      manual: true,
      onSuccess(id) {
        message.success('问卷已创建')
        resetAndClose()
        nav(`/question/edit/${id}`)
      },
    }
  )

  function resetAndClose() {
    setStage('idle')
    setPrompt('')
    setResult(null)
    onClose()
  }

  function handleGenerate() {
    if (!prompt.trim()) {
      message.warning('请先填写需求描述')
      return
    }
    setStage('generating')
    generateRequest.run(prompt.trim())
  }

  // 生成失败常见原因（Key 无效/余额不足/未配置）都可通过修改设置解决，提供直达入口
  const showGoSettings = generateRequest.error !== undefined

  const footer =
    stage === 'idle' ? (
      <>
        {showGoSettings && (
          <Button key="settings" onClick={() => setSettingsOpen(true)}>
            去设置
          </Button>
        )}
        <Button key="cancel" onClick={resetAndClose}>
          取消
        </Button>
        <Button key="generate" type="primary" onClick={handleGenerate}>
          生成
        </Button>
      </>
    ) : stage === 'generating' ? (
      <Button key="cancel" onClick={resetAndClose}>
        取消
      </Button>
    ) : (
      <>
        <Button key="cancel" onClick={resetAndClose}>
          取消
        </Button>
        <Button key="regenerate" onClick={handleGenerate} disabled={createRequest.loading}>
          重新生成
        </Button>
        <Button
          key="create"
          type="primary"
          loading={createRequest.loading}
          onClick={() => createRequest.run()}
        >
          创建并编辑
        </Button>
      </>
    )

  return (
    <Modal
      title="AI 生成问卷"
      open={open}
      onCancel={resetAndClose}
      footer={footer}
      width={560}
      destroyOnHidden
    >
      {stage === 'idle' && (
        <>
          <Input.TextArea
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={'描述你的问卷需求，例如：\n食堂满意度调查，10 题以内，包含开放性建议题'}
            maxLength={500}
            showCount
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            将调用你配置的 AI 模型生成，约需 10~30 秒
          </Typography.Text>
        </>
      )}

      {stage === 'generating' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <Typography.Paragraph style={{ marginTop: 16 }}>
            正在生成问卷，约需 10~30 秒，请稍候...
          </Typography.Paragraph>
        </div>
      )}

      {stage === 'preview' && result && (
        <>
          <Typography.Title level={5}>{result.title}</Typography.Title>
          <Typography.Paragraph type="secondary">{result.desc}</Typography.Paragraph>
          <Typography.Paragraph>
            共 {result.componentList.length} 个组件，其中题目{' '}
            {result.componentList.filter(c => QUESTION_TYPES.includes(c.type)).length} 题
          </Typography.Paragraph>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {result.componentList.map(c => (
              <div key={c.fe_id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space>
                  <Typography.Text code>{TYPE_LABELS[c.type] ?? c.type}</Typography.Text>
                  <Typography.Text>{c.title}</Typography.Text>
                </Space>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 生成失败可能因 Key 无效/余额不足，提供直达设置的入口 */}
      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Modal>
  )
}

export default AIGenerateModal
