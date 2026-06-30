import axios from 'axios'
import { message } from 'antd'

const instance = axios.create({
  timeout: 10 * 1000,
})

instance.interceptors.response.use(response => {
  const resData = response.data
  const { errno, data, msg } = resData

  // 处理错误
  if (errno !== 0) {
    if (msg) {
      message.error(msg)
    }
    throw new Error(msg || '请求失败')
  }

  // 直接返回 data
  return data
})

export default instance
