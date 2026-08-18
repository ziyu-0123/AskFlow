import { type FC, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EditHeader.module.scss'
import { Button, Typography, Space, Input } from 'antd'
import { LeftOutlined, EditOutlined } from '@ant-design/icons'
import EditToolBar from './EditToolBar'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import { changePageTitle } from '../../../store/pageInfoReducer'
import { useDispatch } from 'react-redux'

const { Title } = Typography

// 显示和修改标题
const TitleElem: FC = () => {
  const { title } = useGetPageInfo()
  const dispatch = useDispatch()
  const [editState, SetEditState] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const newTitle = event.target.value.trim()
    if (!newTitle) return
    dispatch(changePageTitle(newTitle))
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
            <Button>保存</Button>
            <Button type="primary">发布</Button>
          </Space>
        </div>
      </div>
    </div>
  )
}
export default EditHeader
