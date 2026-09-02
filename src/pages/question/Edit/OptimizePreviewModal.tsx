import type { FC, ReactNode } from 'react'
import { Modal, Tag, Typography } from 'antd'

interface OptimizePreviewModalProps {
  open: boolean
  type: string
  original: Record<string, unknown>
  suggested: Record<string, unknown>
  onApply: (newProps: Record<string, unknown>) => void
  onClose: () => void
}

// props 字段 → 中文标签
const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  desc: '描述',
  text: '文本',
  level: '层级',
  isCenter: '居中',
  placeholder: '占位提示',
  isVertical: '竖排排列',
  options: '选项',
  list: '选项',
}

// 选项数组只比较 text（value 由后端统一重写，不代表语义变化）
function optionTexts(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map(item =>
    item && typeof item === 'object' && 'text' in item ? (item as { text: unknown }).text : item
  )
}

function isChanged(a: unknown, b: unknown): boolean {
  return JSON.stringify(optionTexts(a)) !== JSON.stringify(optionTexts(b))
}

function renderValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, i) => (
          <Tag key={i}>
            {item && typeof item === 'object' && 'text' in item
              ? String((item as { text: unknown }).text)
              : String(item)}
          </Tag>
        ))}
      </>
    )
  }
  if (typeof value === 'boolean') return <span>{value ? '是' : '否'}</span>
  return <span>{value == null ? '—' : String(value)}</span>
}

// AI 优化结果预览：原 props vs AI 建议逐字段对比，变化行高亮
const OptimizePreviewModal: FC<OptimizePreviewModalProps> = ({
  open,
  type,
  original,
  suggested,
  onApply,
  onClose,
}) => {
  // 以 AI 建议的字段顺序为主（后端契约全量字段），并集上原 props 独有字段
  const keys = Array.from(new Set([...Object.keys(suggested), ...Object.keys(original)]))

  const rows = keys.map(key => {
    const before = original[key]
    const after = suggested[key]
    const changed = isChanged(before, after)
    const rowStyle: React.CSSProperties = changed
      ? { background: '#fffbe6', padding: '6px 8px', borderRadius: 4 }
      : { padding: '6px 8px' }
    return (
      <div
        key={key}
        style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, ...rowStyle }}
      >
        <Typography.Text type={changed ? undefined : 'secondary'}>
          {FIELD_LABELS[key] ?? key}
        </Typography.Text>
        <div>{renderValue(before)}</div>
        <div>{renderValue(after)}</div>
      </div>
    )
  })

  return (
    <Modal
      title="AI 优化建议"
      open={open}
      onCancel={onClose}
      onOk={() => onApply(suggested)}
      okText="应用"
      cancelText="取消"
      width={640}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        黄色高亮行为有变化的内容，应用后可撤销（Ctrl+Z）。
      </Typography.Paragraph>
      <div
        style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, marginBottom: 4 }}
      >
        <span />
        <Typography.Text strong>原内容</Typography.Text>
        <Typography.Text strong>AI 建议</Typography.Text>
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
        {rows}
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        组件类型：{type}
      </Typography.Text>
    </Modal>
  )
}

export default OptimizePreviewModal
