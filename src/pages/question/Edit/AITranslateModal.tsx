import { useEffect, useState } from 'react'
import type { FC } from 'react'
import { Modal, Button, Select, Spin, Typography, message } from 'antd'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { translateQuestionService, type TranslateQuestionResult } from '../../../services/ai'
import {
  getQuestionService,
  updateTranslationsService,
  type ComponentTextTranslation,
} from '../../../services/question'
import type { ComponentInfoType } from '../../../store/componentsReducer'
import { updateAiConfiguredReducer } from '../../../store/userReducer'
import useGetComponentInfo from '../../../hooks/useGetComponentInfo'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import AISettingsModal from '../../../components/AISettingsModal'

interface AITranslateModalProps {
  open: boolean
  onClose: () => void
}

// 目标语言下拉（语言码与后端 translations 白名单一致）
const LANGUAGES = [
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'es', label: '西班牙语' },
  { value: 'ru', label: '俄语' },
]

// 组件 type → 预览对照表中的类型标签
const TYPE_LABELS: Record<string, string> = {
  questionInfo: '问卷信息',
  questionTitle: '标题',
  questionParagraph: '段落',
  questionInput: '单行输入',
  questionTextarea: '多行输入',
  questionRadio: '单选题',
  questionCheckbox: '多选题',
}

// 预览对照行：每组件一行（题干原 vs 译），radio/checkbox 附选项数对比
interface PreviewRow {
  type: string
  originalTitle: string
  translatedTitle: string
  optionCount?: [number, number] // [原选项数, 译选项数]
}

// 翻译结果 + 按快照 fe_id 构建的 texts（保存载荷）
interface TranslatePreview {
  title: string
  desc: string
  originalTitle: string
  originalDesc: string
  texts: {
    [fe_id: string]: ComponentTextTranslation
  }
  rows: PreviewRow[]
}

const asString = (v: unknown) => (typeof v === 'string' ? v : '')

// 译文选项数组 → 纯 text 数组（译文选项只含 text；容忍 { text, value } 形态）
function optionTexts(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(item =>
    item && typeof item === 'object' && 'text' in item
      ? asString((item as { text: unknown }).text)
      : asString(item)
  )
}

const optionCount = (v: unknown) => (Array.isArray(v) ? v.length : 0)

// 题干文案（预览对照用）：标题/段落取 text，其余取 title
function stemText(props: Record<string, unknown>): string {
  const title = asString(props.title)
  return title || asString(props.text)
}

// 响应返回时立即按"发起请求时的快照"构建 texts 与预览行——
// 生成期间（10~30s）用户拖拽排序/增删组件时，若保存时才用"当前"componentList
// 按索引对应，译文会错位挂到错误的 fe_id（功能点 2 闭包漂移教训）
function buildPreview(
  snapshot: ComponentInfoType[],
  originalTitle: string,
  originalDesc: string,
  result: TranslateQuestionResult
): TranslatePreview {
  const texts: { [fe_id: string]: ComponentTextTranslation } = {}
  const rows: PreviewRow[] = []

  snapshot.forEach((comp, i) => {
    const translated = result.componentList[i]
    if (!translated) return
    const oProps = (comp.props ?? {}) as Record<string, unknown>
    const tProps = (translated.props ?? {}) as Record<string, unknown>

    // 按主版本组件 type 抽取译文文案字段（译文与主版本结构同构）
    switch (comp.type) {
      case 'questionInfo':
        texts[comp.fe_id] = { title: asString(tProps.title), desc: asString(tProps.desc) }
        break
      case 'questionTitle':
      case 'questionParagraph':
        texts[comp.fe_id] = { text: asString(tProps.text) }
        break
      case 'questionInput':
      case 'questionTextarea':
        texts[comp.fe_id] = {
          title: asString(tProps.title),
          placeholder: asString(tProps.placeholder),
        }
        break
      case 'questionRadio':
        texts[comp.fe_id] = { title: asString(tProps.title), options: optionTexts(tProps.options) }
        break
      case 'questionCheckbox':
        texts[comp.fe_id] = { title: asString(tProps.title), list: optionTexts(tProps.list) }
        break
    }

    const row: PreviewRow = {
      type: comp.type,
      originalTitle: stemText(oProps),
      translatedTitle: stemText(tProps),
    }
    if (comp.type === 'questionRadio') {
      row.optionCount = [optionCount(oProps.options), optionTexts(tProps.options).length]
    } else if (comp.type === 'questionCheckbox') {
      row.optionCount = [optionCount(oProps.list), optionTexts(tProps.list).length]
    }
    rows.push(row)
  })

  return { title: result.title, desc: result.desc, originalTitle, originalDesc, texts, rows }
}

// 预览文本超长截断
const truncate = (s: string, n = 40) => (s.length > n ? s.slice(0, n) + '…' : s)

// 状态机：idle 选语言 → translating 翻译中 → preview 预览对照
type Stage = 'idle' | 'translating' | 'preview'

const AITranslateModal: FC<AITranslateModalProps> = ({ open, onClose }) => {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { componentList = [] } = useGetComponentInfo()
  const pageInfo = useGetPageInfo()

  const [stage, setStage] = useState<Stage>('idle')
  const [lang, setLang] = useState('en')
  const [existingLangs, setExistingLangs] = useState<string[]>([])
  const [langsLoading, setLangsLoading] = useState(false)
  const [preview, setPreview] = useState<TranslatePreview | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 弹窗打开时自请求已翻译语言（模式同 AISettingsModal 拉 profile，不动 Redux——
  // translations 在编辑器无其他消费者）
  useEffect(() => {
    if (!open || !id) return
    setLangsLoading(true)
    getQuestionService(id)
      .then(q => setExistingLangs(Object.keys(q.translations ?? {})))
      .catch(() => {
        // 已翻译标注属增强信息，拉取失败不阻断翻译（错误提示拦截器已弹）
      })
      .finally(() => setLangsLoading(false))
  }, [open, id])

  const translateRequest = useRequest(
    async (targetLang: string) => {
      // 快照在请求发起函数内部确定（深拷贝），翻译期间组件变化不影响本次对应关系
      const snapshot = structuredClone(componentList) as ComponentInfoType[]
      const originalTitle = pageInfo.title
      const originalDesc = pageInfo.desc ?? ''
      const result = await translateQuestionService(targetLang, {
        title: originalTitle,
        desc: originalDesc,
        componentList: snapshot.map(c => ({
          type: c.type,
          props: c.props as Record<string, unknown>,
        })),
      })
      return { snapshot, originalTitle, originalDesc, result }
    },
    {
      manual: true,
      onSuccess({ snapshot, originalTitle, originalDesc, result }) {
        // 译文返回时立即按快照构建 texts（不等保存时才构建）
        setPreview(buildPreview(snapshot, originalTitle, originalDesc, result))
        setStage('preview')
      },
      onError(err) {
        // 错误提示由 axios 拦截器统一弹出，回到选语言态便于重试
        setStage('idle')
        // 后端 400"请先配置"说明 Redux 里的 aiConfigured 已过期（如库中配置被清除
        // 但页面未刷新），同步标记并直接打开设置弹窗，引导重新配置
        if (err.message.includes('请先配置')) {
          dispatch(updateAiConfiguredReducer(false))
          setSettingsOpen(true)
        }
      },
    }
  )

  const saveRequest = useRequest(
    async () => {
      if (!id || !preview) return
      await updateTranslationsService(id, lang, {
        title: preview.title,
        desc: preview.desc,
        texts: preview.texts,
      })
    },
    {
      manual: true,
      onSuccess() {
        message.success('译文已保存')
        setExistingLangs(prev => (prev.includes(lang) ? prev : [...prev, lang]))
        resetAndClose()
      },
    }
  )

  function resetAndClose() {
    setStage('idle')
    setPreview(null)
    onClose()
  }

  function handleTranslate() {
    if (componentList.length === 0) {
      message.warning('问卷为空，无法翻译')
      return
    }
    setStage('translating')
    translateRequest.run(lang)
  }

  const langOptions = LANGUAGES.map(l => ({
    value: l.value,
    label: existingLangs.includes(l.value) ? `${l.label}（已翻译，将覆盖更新）` : l.label,
  }))
  const langLabel = LANGUAGES.find(l => l.value === lang)?.label ?? lang

  const footer =
    stage === 'translating' ? (
      <Button key="cancel" onClick={resetAndClose}>
        取消
      </Button>
    ) : stage === 'preview' ? (
      <>
        <Button key="cancel" onClick={resetAndClose}>
          取消
        </Button>
        <Button key="retry" onClick={() => setStage('idle')} disabled={saveRequest.loading}>
          重新翻译
        </Button>
        <Button
          key="save"
          type="primary"
          loading={saveRequest.loading}
          onClick={() => saveRequest.run()}
        >
          保存译文
        </Button>
      </>
    ) : (
      <>
        <Button key="cancel" onClick={resetAndClose}>
          取消
        </Button>
        <Button key="translate" type="primary" loading={langsLoading} onClick={handleTranslate}>
          开始翻译
        </Button>
      </>
    )

  return (
    <Modal
      title="AI 翻译"
      open={open}
      onCancel={resetAndClose}
      footer={footer}
      width={640}
      destroyOnHidden
    >
      {stage === 'idle' && (
        <>
          <Select
            value={lang}
            options={langOptions}
            onChange={setLang}
            style={{ width: '100%' }}
            size="large"
            disabled={langsLoading}
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            将整卷翻译为{langLabel}，仅翻译文案（标题/描述/题干/选项），题目结构不变； 约需 10~30 秒
          </Typography.Text>
        </>
      )}

      {stage === 'translating' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <Typography.Paragraph style={{ marginTop: 16 }}>
            正在翻译为{langLabel}，约需 10~30 秒，请稍候...
          </Typography.Paragraph>
        </div>
      )}

      {stage === 'preview' && preview && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 1fr',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span />
            <Typography.Text strong>原文</Typography.Text>
            <Typography.Text strong>{langLabel}译文</Typography.Text>
          </div>
          <div
            style={{
              maxHeight: 360,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 1fr',
                gap: 8,
                padding: '6px 8px',
              }}
            >
              <Typography.Text type="secondary">标题</Typography.Text>
              <Typography.Text>{truncate(preview.originalTitle)}</Typography.Text>
              <Typography.Text>{truncate(preview.title)}</Typography.Text>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 1fr',
                gap: 8,
                padding: '6px 8px',
              }}
            >
              <Typography.Text type="secondary">描述</Typography.Text>
              <Typography.Text>{truncate(preview.originalDesc)}</Typography.Text>
              <Typography.Text>{truncate(preview.desc)}</Typography.Text>
            </div>
            {preview.rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 1fr',
                  gap: 8,
                  padding: '6px 8px',
                  borderTop: '1px solid #f0f0f0',
                }}
              >
                <Typography.Text code>{TYPE_LABELS[row.type] ?? row.type}</Typography.Text>
                <div>
                  <Typography.Text>{truncate(row.originalTitle)}</Typography.Text>
                  {row.optionCount && (
                    <div>
                      <Typography.Text
                        type={row.optionCount[0] === row.optionCount[1] ? 'secondary' : 'danger'}
                      >
                        选项数：{row.optionCount[0]} → {row.optionCount[1]}
                      </Typography.Text>
                    </div>
                  )}
                </div>
                <Typography.Text>{truncate(row.translatedTitle)}</Typography.Text>
              </div>
            ))}
          </div>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            保存后 C 端可通过 ?lang={lang} 访问该语言版本；再次翻译同语言将覆盖更新
          </Typography.Text>
        </>
      )}

      {/* 翻译失败可能因 Key 无效/未配置，提供直达设置的入口 */}
      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Modal>
  )
}

export default AITranslateModal
