import axios from './ajax'

// AI 模型配置（apiKey 为服务端打码后的回显值，如 sk-***abcd）
export type AiConfigType = {
  apiKey: string
  baseUrl: string
  model: string
}

// 定义具体的用户信息类型
export type UserInfo = {
  username: string
  nickname: string
  aiConfigured?: boolean
  aiConfig?: AiConfigType
}

// 定义登录响应类型
export type LoginResponse = {
  token: string
}

// 获取用户信息
export async function getUserInfoService(): Promise<UserInfo> {
  const url = `/api/user/info`
  const data = (await axios.get(url)) as UserInfo
  return data
}

// 保存 AI 模型配置（已配置过时 apiKey 留空表示沿用原值）
// 返回：打码后的配置 { apiKey, baseUrl, model }
export async function updateAiConfigService(config: AiConfigType): Promise<AiConfigType> {
  const url = `/api/user/ai-config`
  const data = (await axios.patch(url, config)) as AiConfigType
  return data
}

// 注册
export async function registerService(
  username: string,
  password: string,
  nickname?: string
): Promise<void> {
  const url = `/api/user/register`
  const body = { username, password, nickname: nickname || username }
  await axios.post(url, body)
}

// 登录
export async function loginService(username: string, password: string): Promise<LoginResponse> {
  const url = `/api/user/login`
  const body = { username, password }
  const data = (await axios.post(url, body)) as LoginResponse
  return data
}
