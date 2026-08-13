import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EditHeader.module.scss'
import { Button, Typography, Space } from 'antd'
import { LeftOutlined } from '@ant-design/icons'
import EditToolBar from './EditToolBar'

const { Title } = Typography

const EditHeader: FC = () => {
  const nav = useNavigate()

  return (
    <div className={styles['header-wrapper']}>
      <div className={styles.header}>
        <div className={styles.left}>
          <Space>
            <Button
              type="link"
              icon={<LeftOutlined />}
              style={{ paddingLeft: 0, paddingRight: 0 }}
              onClick={() => nav(-1)}
            >
              返回
            </Button>
            <Title>问卷标题</Title>
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
