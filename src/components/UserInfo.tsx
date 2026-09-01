import { useState } from 'react'
import type { FC } from 'react'
import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import { LOGIN_PATHNAME } from '../router'
import { removeToken } from '../utils/user-token'
import useGetUserInfo from '../hooks/useGetUserInfo'
import { useDispatch } from 'react-redux'
import { logoutReducer } from '../store/userReducer'
import AISettingsModal from './AISettingsModal'

const UserInfo: FC = () => {
  const nav = useNavigate()
  const dispatch = useDispatch()
  const { username, nickname } = useGetUserInfo()
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)

  function logout() {
    dispatch(logoutReducer())
    removeToken()
    message.success('已退出')
    nav(LOGIN_PATHNAME)
  }

  const items: MenuProps['items'] = [
    { key: 'aiSettings', icon: <SettingOutlined />, label: 'AI 设置' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ]

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') logout()
    if (key === 'aiSettings') setAiSettingsOpen(true)
  }

  const userInfo = (
    <>
      <Dropdown menu={{ items, onClick: onMenuClick }}>
        <span style={{ color: '#e8e8e8', cursor: 'pointer' }}>
          <UserOutlined />
          {nickname}
        </span>
      </Dropdown>
      <AISettingsModal open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </>
  )

  const Login = (
    <>
      <Link to={LOGIN_PATHNAME}>登录</Link>
    </>
  )

  return (
    <>
      <div>{username ? userInfo : Login}</div>
    </>
  )
}
export default UserInfo
