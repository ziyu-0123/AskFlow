import type { FC } from 'react'
import { useState } from 'react'
import { Button, Space, Divider, Tag, Popconfirm, message } from 'antd'
import { useNavigate, Link } from 'react-router-dom'
import {
  EditOutlined,
  LineChartOutlined,
  StarOutlined,
  CopyOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import styles from './QuestionCard.module.scss'
import { updateQuestionService, duplicateQuestionService } from '../services/question'
import { useRequest } from 'ahooks'

type PropsType = {
  id: string
  title: string
  isStar: boolean
  isPublished: boolean
  answerCount: number
  createdAt: string
}

// 复制接口返回类型
interface DuplicateResponse {
  id: string
}

const QuestionCard: FC<PropsType> = (props: PropsType) => {
  const nav = useNavigate()
  const { id, isStar, title, createdAt, answerCount, isPublished } = props

  // 修改标星
  const [isStarState, setIsStarState] = useState(isStar)
  const { loading: changeStarLoading, run: changeStar } = useRequest(
    async () => {
      const newIsStar = !isStarState
      await updateQuestionService(id, { isStar: newIsStar })
      return newIsStar
    },
    {
      manual: true,
      onSuccess(newIsStar) {
        setIsStarState(newIsStar)
        message.success('已更新')
      },
    }
  )

  // function duplicate() {
  //   message.success('已复制')
  // }

  // 复制
  const { loading: duplicateLoading, run: duplicate } = useRequest(
    async (): Promise<DuplicateResponse> => {
      const result = await duplicateQuestionService(id)
      return result as DuplicateResponse
    },
    {
      manual: true,
      onSuccess(result: DuplicateResponse) {
        message.success('复制成功')
        nav(`/question/edit/${result.id}`)
      },
    }
  )

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={styles.left}>
          <Link to={isPublished ? `/question/stat/${id}` : `/question/edit/${id}`}>
            <Space>
              {isStarState && <StarOutlined style={{ color: 'red' }} />}
              {title}
            </Space>
          </Link>
        </div>
        <div className={styles.right}>
          <Space>
            {isPublished ? <Tag color="processing">已发布</Tag> : <Tag>未发布</Tag>}
            &nbsp;
            <span>答卷: {answerCount}</span>
            &nbsp;
            <span>{createdAt}</span>
          </Space>
        </div>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <div className={styles['button-container']}>
        <div className={styles.left}>
          <Space>
            <Button
              icon={<EditOutlined />}
              type="text"
              size="small"
              onClick={() => {
                nav(`/question/edit/${id}`)
              }}
            >
              编辑问卷
            </Button>
            <Button
              icon={<LineChartOutlined />}
              type="text"
              size="small"
              onClick={() => {
                nav(`/question/stat/${id}`)
              }}
              disabled={!isPublished}
            >
              统计数据
            </Button>
          </Space>
        </div>
        <div className={styles.right}>
          <Space>
            <Button
              type="text"
              icon={<StarOutlined />}
              size="small"
              onClick={changeStar}
              disabled={changeStarLoading}
            >
              {isStarState ? '取消标星' : '标星'}
            </Button>
            <Popconfirm
              title="确认复制该问卷?"
              okText="确定"
              cancelText="取消"
              onConfirm={duplicate}
            >
              <Button type="text" icon={<CopyOutlined />} size="small" disabled={duplicateLoading}>
                复制
              </Button>
            </Popconfirm>
            <Button type="text" icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Space>
        </div>
      </div>
    </div>
  )
}

export default QuestionCard
