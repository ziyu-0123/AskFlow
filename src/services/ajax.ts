import axios from 'axios'
import { message } from 'antd'
import { getToken } from '../utils/user-token'

// 统一响应数据类型（响应拦截器解包后返回的 data 部分）
export type ResDataType = {
  [key: string]: unknown
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3005/',
  timeout: 10 * 1000,
  headers: {},
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
instance.interceptors.response.use(
  response => {
    const resData = response.data
    const { errno, data, msg } = resData
    // 后端错误响应的字段名是 message（成功响应无此字段），两者兼容
    const errMsg = (msg || resData.message) as string | undefined

    // 处理错误
    if (errno !== 0) {
      if (errMsg) {
        message.error(errMsg)
      }
      throw new Error(errMsg || '请求失败')
    }

    // 直接返回 data
    return data
  },
  error => {
    // 后端校验/鉴权错误以 HTTP 4xx/5xx 返回（HttpException），走此分支
    // 从响应体中提取后端的中文错误信息，弹出提示并以该信息 reject，
    // 保证调用方拿到的 err.message 是可读中文（如"请先配置 AI 模型…"）
    const resData = error?.response?.data as ResDataType | undefined
    const errMsg = (resData?.msg || resData?.message) as string | undefined

    // "未登录/Token 无效"出现在预期场景（登录页刷新时的探活请求、退出登录后
    // 仍在途的请求），属于噪音提示，静默处理；登录失败（"用户名或密码错误"）
    // 消息不同，不受影响
    const isSilentAuth = errMsg === '未登录' || errMsg === 'Token 无效'
    if (errMsg && !isSilentAuth) {
      message.error(errMsg)
    }
    return Promise.reject(new Error(errMsg || '网络错误，请稍后重试'))
  }
)

export default instance
