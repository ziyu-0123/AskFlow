import type { FC } from 'react'
import { Space, Typography, Image } from 'antd'
import styles from './Logo.module.scss'
import { Link } from 'react-router-dom'
import logoIcon from '../assets/favicon.svg'
const { Title } = Typography
const Logo: FC = () => {
  return (
    <div className={styles.container}>
      <Link to="/">
        <Space>
          <Image
            src={logoIcon}
            width={32}
            height={32}
            preview={false} // 禁止点击预览
            style={{ display: 'flex', alignItems: 'center' }}
          />
          <Title>AskFlow</Title>
        </Space>
      </Link>
    </div>
  )
}
export default Logo
