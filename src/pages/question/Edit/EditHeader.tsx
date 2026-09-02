import { type FC, useState, type ChangeEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './EditHeader.module.scss'
import { Button, Typography, Space, Input, Modal, message } from 'antd'
import { LeftOutlined, EditOutlined, LoadingOutlined, GlobalOutlined } from '@ant-design/icons'
import EditToolBar from './EditToolBar'
import AITranslateModal from './AITranslateModal'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import { changePageTitle } from '../../../store/pageInfoReducer'
import { useDispatch } from 'react-redux'
import useGetComponentInfo from '../../../hooks/useGetComponentInfo'
import { updateQuestionService } from '../../../services/question'
import { useRequest, useKeyPress, useDebounceFn, useUnmount } from 'ahooks'

const { Title } = Typography

// 显示和修改标题
const TitleElem: FC = () => {
  const { title } = useGetPageInfo()
  const dispatch = useDispatch()
  const [editState, SetEditState] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // 受控输入须始终跟随用户输入，否则删空时会被 Redux 旧值覆盖、出现"删不掉"的现象
    dispatch(changePageTitle(event.target.value.trim()))
  }

  if (editState) {
    return (
      <Input
        value={title}
        onChange={handleChange}
        onPressEnter={() => SetEditState(false)}
        onBlur={() => SetEditState(false)}
      />
    )
  }

  return (
    <Space>
      <Title>{title}</Title>
      <Button icon={<EditOutlined />} type="text" onClick={() => SetEditState(true)} />
    </Space>
  )
}

// 保存按钮
const SaveButton: FC = () => {
  const { id } = useParams()
  const { componentList = [] } = useGetComponentInfo()
  const pageInfo = useGetPageInfo()

  const { loading, run: save } = useRequest(
    async () => {
      if (!id) return
      await updateQuestionService(id, { ...pageInfo, componentList })
    },
    { manual: true }
  )

  // 自动保存（防抖 1s）。组件卸载时立即 flush 待执行的保存，
  // 避免编辑后直接点"返回"导致 debounce 被取消、改动丢失
  const { run: debouncedSave, flush } = useDebounceFn(() => save(), { wait: 1000 })
  useEffect(() => {
    debouncedSave()
  }, [componentList, pageInfo])
  useUnmount(() => {
    flush()
  })

  // 快捷键
  useKeyPress(['ctrl.s', 'meta.s'], (event: KeyboardEvent) => {
    event.preventDefault()
    if (!loading) save()
  })

  return (
    <Button onClick={save} disabled={loading} icon={loading ? <LoadingOutlined /> : null}>
      保存
    </Button>
  )
}

// AI 翻译按钮
const TranslateButton: FC = () => {
  const { aiConfigured } = useGetUserInfo()
  const { componentList = [] } = useGetComponentInfo()
  const [open, setOpen] = useState(false)

  function handleClick() {
    if (!aiConfigured) {
      Modal.warning({
        title: '请先配置 AI 模型',
        content: '使用 AI 翻译需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
        okText: '知道了',
      })
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button icon={<GlobalOutlined />} onClick={handleClick} disabled={componentList.length === 0}>
        AI 翻译
      </Button>
      <AITranslateModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// 发布按钮
const PublishButton: FC = () => {
  const nav = useNavigate()
  const { id } = useParams()
  const { componentList = [] } = useGetComponentInfo()
  const pageInfo = useGetPageInfo()

  const { loading, run: pub } = useRequest(
    async () => {
      if (!id) return
      await updateQuestionService(id, {
        ...pageInfo,
        componentList,
        isPublished: true, // 标志着问卷已经被发布
      })
    },
    {
      manual: true,
      onSuccess() {
        message.success('发布成功')
        nav('/question/stat/' + id) // 发布成功，跳转到统计页面
      },
    }
  )

  return (
    <Button type="primary" onClick={pub} disabled={loading}>
      发布
    </Button>
  )
}

// 编辑器头部
const EditHeader: FC = () => {
  const nav = useNavigate()

  return (
    <div className={styles['header-wrapper']}>
      <div className={styles.header}>
        <div className={styles.left}>
          <Space size="middle">
            <Button
              type="link"
              icon={<LeftOutlined />}
              style={{ paddingLeft: 0, paddingRight: 0 }}
              onClick={() => nav(-1)}
            >
              返回
            </Button>
            <TitleElem />
          </Space>
        </div>
        <div className={styles.main}>
          <EditToolBar />
        </div>
        <div className={styles.right}>
          <Space>
            <TranslateButton />
            <SaveButton />
            <PublishButton />
          </Space>
        </div>
      </div>
    </div>
  )
}
export default EditHeader
