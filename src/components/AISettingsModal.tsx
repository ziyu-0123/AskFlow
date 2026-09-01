import { useEffect, useState } from 'react'
import type { FC } from 'react'
import { Modal, Form, Input, Select, Spin, message } from 'antd'
import { useDispatch } from 'react-redux'
import { getUserInfoService, updateAiConfigService } from '../services/user'
import { updateAiConfiguredReducer } from '../store/userReducer'

interface AISettingsModalProps {
  open: boolean
  onClose: () => void
}

interface AiFormValues {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

// 供应商预设：选择后自动填充 baseUrl / model 默认值
const PROVIDER_PRESETS = [
  {
    label: 'DeepSeek',
    value: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    label: '智谱 GLM',
    value: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  {
    label: '通义千问',
    value: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  { label: 'Kimi', value: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '自定义', value: '自定义', baseUrl: '', model: '' },
]

const AISettingsModal: FC<AISettingsModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch()
  const [form] = Form.useForm<AiFormValues>()
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [saving, setSaving] = useState(false)
  // 当前已保存 key 的打码值，用于提示"留空表示不修改"
  const [maskedApiKey, setMaskedApiKey] = useState('')

  // 每次打开时拉取最新配置回显（baseUrl/model），apiKey 不回显明文
  useEffect(() => {
    if (!open) return
    setLoadingInfo(true)
    getUserInfoService()
      .then(info => {
        const aiConfig = info.aiConfig
        if (aiConfig) {
          setMaskedApiKey(aiConfig.apiKey)
          // baseUrl 命中某个预设则选中该预设，否则视为自定义
          const preset = PROVIDER_PRESETS.find(p => p.baseUrl === aiConfig.baseUrl)
          form.setFieldsValue({
            provider: preset?.value ?? '自定义',
            apiKey: '',
            baseUrl: aiConfig.baseUrl,
            model: aiConfig.model,
          })
        } else {
          setMaskedApiKey('')
          form.resetFields()
          form.setFieldsValue({
            provider: 'DeepSeek',
            apiKey: '',
            baseUrl: PROVIDER_PRESETS[0].baseUrl,
            model: PROVIDER_PRESETS[0].model,
          })
        }
      })
      .finally(() => setLoadingInfo(false))
  }, [open, form])

  const onProviderChange = (value: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.value === value)
    if (preset && value !== '自定义') {
      form.setFieldsValue({ baseUrl: preset.baseUrl, model: preset.model })
    }
  }

  const onFinish = async (values: AiFormValues) => {
    const { apiKey = '', baseUrl, model } = values
    setSaving(true)
    try {
      await updateAiConfigService({ apiKey, baseUrl, model })
      dispatch(updateAiConfiguredReducer(true))
      message.success('AI 配置已保存')
      onClose()
    } catch {
      // 错误提示由 axios 拦截器统一弹出，这里无需重复处理
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="AI 设置"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Spin spinning={loadingInfo}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="供应商"
            name="provider"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <Select
              options={PROVIDER_PRESETS.map(p => ({ label: p.label, value: p.value }))}
              onChange={onProviderChange}
            />
          </Form.Item>
          <Form.Item
            label="API Key"
            name="apiKey"
            extra={
              maskedApiKey
                ? `当前：${maskedApiKey}，留空表示不修改`
                : '在供应商官网获取，仅保存在你的账号中'
            }
            rules={maskedApiKey ? [] : [{ required: true, message: '请填写 API Key' }]}
          >
            <Input.Password
              placeholder={maskedApiKey || '如 sk-xxxxxxxx'}
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            label="接口地址 baseUrl"
            name="baseUrl"
            rules={[
              { required: true, message: '请填写 baseUrl' },
              { pattern: /^https:\/\//, message: 'baseUrl 必须以 https:// 开头' },
            ]}
          >
            <Input placeholder="https://api.deepseek.com/v1" />
          </Form.Item>
          <Form.Item
            label="模型"
            name="model"
            rules={[{ required: true, message: '请填写模型名称' }]}
          >
            <Input placeholder="deepseek-chat" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  )
}

export default AISettingsModal
