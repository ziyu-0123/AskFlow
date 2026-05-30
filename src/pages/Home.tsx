import type { FC } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from 'antd'

const Home: FC = () => {
  const nav = useNavigate()
  function clickHandler() {
    nav({
      pathname: '/login',
      search: 'b=21',
    })
  }
  return (
    <>
      <p>Home</p>
      <div>
        <Button onClick={clickHandler}>登录</Button>
        &nbsp;
        <Link to="/register?a=10">注册</Link>
      </div>
    </>
  )
}

export default Home
