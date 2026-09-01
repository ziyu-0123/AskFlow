import { useEffect, useState } from 'react'
import useGetUserInfo from './useGetUserInfo'
import { useDispatch } from 'react-redux'
import { useRequest } from 'ahooks'
import { getUserInfoService } from '../services/user'
import { loginReducer } from '../store/userReducer'

function useLoadUserData() {
  const dispatch = useDispatch()
  const [waitingUserData, setWaitingUserData] = useState(true)

  // ajax 加载用户信息
  const { run } = useRequest(getUserInfoService, {
    manual: true,
    onSuccess(result) {
      const { username, nickname, aiConfigured = false } = result
      // 存储到 redux store
      dispatch(loginReducer({ username, nickname, aiConfigured }))
    },
    onFinally() {
      setWaitingUserData(false)
    },
  })

  // 判断当前 redux store 是否已经存在用户信息
  const { username } = useGetUserInfo()
  useEffect(() => {
    if (username) {
      setWaitingUserData(false) // 如果存在，则不用重新加载
      return
    }
    run() // 如果不存在，则重新加载
  }, [username])

  return { waitingUserData }
}

export default useLoadUserData
