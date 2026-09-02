import { useState } from 'react'
import type { FC } from 'react'
import { Button, Modal, message } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { useDispatch } from 'react-redux'
import { useRequest } from 'ahooks'
import useGetComponentInfo from '../../../hooks/useGetComponentInfo'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import { getComponentConfByType } from '../../../components/QuestionComponents'
import type { ComponentPropsType } from '../../../components/QuestionComponents'
import { changeComponentProps } from '../../../store/componentsReducer'
import { updateAiConfiguredReducer } from '../../../store/userReducer'
import { optimizeComponentService } from '../../../services/ai'
import OptimizePreviewModal from './OptimizePreviewModal'
import AISettingsModal from '../../../components/AISettingsModal'

const NoProp: FC = () => {
  return <div style={{ textAlign: 'center' }}>未选中组件</div>
}

// 预览弹窗数据：绑定点击"AI 优化"时的组件快照，
// 弹窗打开期间切换选中组件不影响应用目标
type PreviewData = {
  fe_id: string
  type: string
  original: Record<string, unknown>
  suggested: Record<string, unknown>
}

const ComponentProp: FC = () => {
  const dispatch = useDispatch()
  const { selectedComponent } = useGetComponentInfo()
  const { aiConfigured } = useGetUserInfo()
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const optimizeRequest = useRequest(
    // 快照在发起请求时确定：请求函数内部拷贝 original 并随结果返回，
    // 避免成功回调读取最新渲染闭包（用户在生成期间切换选中会导致快照漂移）
    async (component: { fe_id: string; type: string; props: Record<string, unknown> }) => {
      const data = await optimizeComponentService({
        type: component.type,
        props: component.props,
      })
      return {
        fe_id: component.fe_id,
        type: component.type,
        // structuredClone 深拷贝快照，避免弹窗打开期间用户改属性污染"原内容"
        original: structuredClone(component.props) as Record<string, unknown>,
        suggested: data.props,
      }
    },
    {
      manual: true,
      onSuccess(data) {
        setPreviewData(data)
      },
      onError(err) {
        // 错误提示由 axios 拦截器统一弹出
        // 后端 400"请先配置"说明 Redux 里的 aiConfigured 已过期，同步标记并直接打开设置弹窗
        if (err.message.includes('请先配置')) {
          dispatch(updateAiConfiguredReducer(false))
          setSettingsOpen(true)
        }
      },
    }
  )

  if (selectedComponent == null) return <NoProp />

  const { fe_id, type, props, isLocked, isHidden } = selectedComponent
  const componentConf = getComponentConfByType(type)
  if (componentConf == null) return <NoProp />

  function changeProps(newProps: ComponentPropsType) {
    dispatch(changeComponentProps({ fe_id, newProps }))
  }

  function handleOptimize() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 优化需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
      })
      return
    }
    optimizeRequest.run({ fe_id, type, props: props as Record<string, unknown> })
  }

  function handleApply(newProps: Record<string, unknown>) {
    if (previewData == null) return
    // 题干/文本变化时同步图层面板标题（与快照中的原值比较）；
    // title 与 props 合并为一次 dispatch，保证撤销一步完成
    const pickTitle = (p: Record<string, unknown>) =>
      typeof p.title === 'string' && p.title
        ? p.title
        : typeof p.text === 'string' && p.text
          ? p.text
          : ''
    const newTitle = pickTitle(newProps)
    const title = newTitle && newTitle !== pickTitle(previewData.original) ? newTitle : undefined
    dispatch(
      changeComponentProps({
        fe_id: previewData.fe_id,
        newProps: newProps as ComponentPropsType,
        title,
      })
    )
    message.success('已应用，可撤销')
    setPreviewData(null)
  }

  const { PropComponent } = componentConf

  return (
    <>
      <Button
        block
        icon={<RobotOutlined />}
        loading={optimizeRequest.loading}
        disabled={isLocked || isHidden}
        onClick={handleOptimize}
        style={{ marginBottom: 16 }}
      >
        AI 优化
      </Button>
      <PropComponent {...props} onChange={changeProps} disabled={isLocked || isHidden} />
      <OptimizePreviewModal
        open={previewData !== null}
        type={previewData?.type ?? type}
        original={previewData?.original ?? {}}
        suggested={previewData?.suggested ?? {}}
        onApply={handleApply}
        onClose={() => setPreviewData(null)}
      />
      {/* 生成失败可能因 Key 无效/未配置，提供直达设置的入口 */}
      <AISettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default ComponentProp
