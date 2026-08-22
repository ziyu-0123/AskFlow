import axios from 'axios'
import { message } from 'antd'
import { getToken } from '../utils/user-token'

// 统一响应数据类型（响应拦截器解包后返回的 data 部分）
export type ResDataType = {
  [key: string]: unknown
}

const instance = axios.create({
  timeout: 10 * 1000,
})

// request 拦截: 每次请求都带上 token
instance.interceptors.request.use(
  config => {
    config.headers['Authorization'] = `Bearer ${getToken()}` // JWT 固定格式
    return config
  },
  error => Promise.reject(error)
)

// response 拦截: 统一处理 errno 和 msg
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
