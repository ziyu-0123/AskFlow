import { type FC, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Space, Typography, message, Spin } from 'antd'
import { LeftOutlined, PlusOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import { getQuestionService, updateQuestionService } from '../../../services/question'
import styles from './index.module.scss'

const { Title, Text } = Typography
const { TextArea } = Input

const InterviewEdit: FC = () => {
  const nav = useNavigate()
  const { id = '' } = useParams()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [outline, setOutline] = useState<string[]>([])

  // 加载访谈问卷（标题 / 描述 / 提纲）
  const { loading } = useRequest(
    async () => {
      const data = await getQuestionService(id)
      return data
    },
    {
      ready: !!id,
      onSuccess(data) {
        setTitle(data.title ?? '')
        setDesc(data.desc ?? '')
        setOutline(data.interviewConfig?.outline ?? [])
      },
    }
  )

  // 归一化待保存数据：过滤空提纲项
  function buildPayload() {
    return {
      title: title.trim(),
      desc: desc.trim(),
      interviewConfig: { outline: outline.map(s => s.trim()).filter(Boolean) },
    }
  }

  const { loading: saving, run: save } = useRequest(
    async () => {
      await updateQuestionService(id, buildPayload())
    },
    {
      manual: true,
      onSuccess() {
        message.success('保存成功')
      },
    }
  )

  const { loading: publishing, run: publish } = useRequest(
    async () => {
      await updateQuestionService(id, { ...buildPayload(), isPublished: true })
    },
    {
      manual: true,
      onSuccess() {
        message.success('发布成功')
        nav('/question/stat/' + id)
      },
    }
  )

  function handleSave() {
    if (!title.trim()) {
      message.warning('请填写访谈标题')
      return
    }
    save()
  }

  function handlePublish() {
    if (!title.trim()) {
      message.warning('请填写访谈标题')
      return
    }
    publish()
  }

  function addOutline() {
    setOutline([...outline, ''])
  }

  function changeOutline(index: number, value: string) {
    setOutline(outline.map((s, i) => (i === index ? value : s)))
  }

  function removeOutline(index: number) {
    setOutline(outline.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <Button type="link" icon={<LeftOutlined />} onClick={() => nav(-1)}>
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            访谈配置
          </Title>
        </Space>
        <Space>
          <Button onClick={handleSave} disabled={saving}>
            保存
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handlePublish}
            disabled={publishing}
          >
            发布
          </Button>
        </Space>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.field}>
              <Text strong>访谈标题</Text>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="请输入访谈标题"
                maxLength={50}
              />
            </div>
            <div className={styles.field}>
              <Text strong>访谈描述</Text>
              <TextArea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="说明本次访谈的目的与背景，AI 将据此引导提问"
                rows={3}
                maxLength={200}
                showCount
              />
            </div>
            <div className={styles.field}>
              <div className={styles.outlineHeader}>
                <Text strong>访谈提纲</Text>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addOutline}>
                  添加问题
                </Button>
              </div>
              {outline.length === 0 ? (
                <Text type="secondary">暂无提纲，点击「添加问题」逐条补充</Text>
              ) : (
                outline.map((item, index) => (
                  <div key={index} className={styles.outlineItem}>
                    <Input
                      value={item}
                      onChange={e => changeOutline(index, e.target.value)}
                      placeholder={`第 ${index + 1} 个问题`}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeOutline(index)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewEdit
