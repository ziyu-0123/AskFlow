import { useState } from 'react'
import type { FC } from 'react'
import { useRequest } from 'ahooks'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Space, Divider, message, Modal } from 'antd'
import {
  PlusOutlined,
  BarsOutlined,
  StarOutlined,
  DeleteOutlined,
  RobotOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import styles from './ManageLayout.module.scss'
import { createQuestionService } from '../services/question'
import useGetUserInfo from '../hooks/useGetUserInfo'
import AIGenerateModal from '../pages/manage/AIGenerateModal'

const ManageLayout: FC = () => {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const { aiConfigured } = useGetUserInfo()
  const [aiModalOpen, setAiModalOpen] = useState(false)

  // const [loading, setLoading] = useState(false)
  // async function handleCreateClick() {
  //   setLoading(true)
  //   const data = await createQuestionService()
  //   const { id } = data || {}
  //   if (id) {
  //     nav(`/question/edit/${id}`)
  //     message.success('创建成功')
  //   }
  //   setLoading(false)
  // }

  const { loading, run: handleCreateClick } = useRequest(() => createQuestionService(), {
    manual: true,
    onSuccess(result) {
      nav(`/question/edit/${result.id || result._id}`)
      message.success('创建成功')
    },
  })

  const { loading: interviewLoading, run: handleCreateInterview } = useRequest(
    () => createQuestionService('interview'),
    {
      manual: true,
      onSuccess(result) {
        nav(`/question/interview/${result.id || result._id}`)
        message.success('创建成功')
      },
    }
  )

  console.log('pathname', pathname)

  // 未配置 AI 时点击引导去设置；已配置则打生成弹窗
  function handleAIGenerateClick() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 生成问卷需先配置 AI 模型（API Key），请点击右上角昵称 → AI 设置 完成配置',
        okText: '知道了',
      })
      return
    }
    setAiModalOpen(true)
  }

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <Space orientation="vertical">
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleCreateClick}
            disabled={loading}
          >
            新建问卷
          </Button>
          <Button
            size="large"
            icon={<CommentOutlined />}
            onClick={handleCreateInterview}
            disabled={interviewLoading}
          >
            新建访谈
          </Button>
          <Button size="large" icon={<RobotOutlined />} onClick={handleAIGenerateClick}>
            AI 生成问卷
          </Button>
          <Divider style={{ borderTop: 'transparent' }} />
          <Button
            type={pathname.startsWith('/manage/list') ? 'default' : 'text'}
            size="large"
            icon={<BarsOutlined />}
            onClick={() => {
              nav('/manage/list')
            }}
          >
            我的问卷
          </Button>
          <Button
            type={pathname.startsWith('/manage/star') ? 'default' : 'text'}
            size="large"
            icon={<StarOutlined />}
            onClick={() => {
              nav('/manage/star')
            }}
          >
            星标问卷
          </Button>
          <Button
            type={pathname.startsWith('/manage/trash') ? 'default' : 'text'}
            size="large"
            icon={<DeleteOutlined />}
            onClick={() => {
              nav('/manage/trash')
            }}
          >
            回收站
          </Button>
        </Space>
      </div>
      <div className={styles.right}>
        <Outlet key={location.pathname} />
      </div>
      <AIGenerateModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  )
}

export default ManageLayout
