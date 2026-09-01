import { useSelector } from 'react-redux'
import type { StateType } from '../store'

function useGetUserInfo() {
  const { username, nickname, aiConfigured } = useSelector((state: StateType) => state.user)
  return { username, nickname, aiConfigured }
}
export default useGetUserInfo
