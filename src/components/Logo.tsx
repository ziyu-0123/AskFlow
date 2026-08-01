import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { Space, Typography, Image } from 'antd'
import styles from './Logo.module.scss'
import { Link } from 'react-router-dom'
import useGetUserInfo from '../hooks/useGetUserInfo'
import logoIcon from '../assets/favicon.svg'
import { HOME_PATHNAME, MANAGE_INDEX_PATHNAME } from '../router'
const { Title } = Typography
const Logo: FC = () => {
  const { username } = useGetUserInfo()

  const [pathname, setPathname] = useState(HOME_PATHNAME)
  useEffect(() => {
    if (username) {
      setPathname(MANAGE_INDEX_PATHNAME)
    }
  }, [username])

  return (
    <div className={styles.container}>
      <Link to={pathname}>
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
