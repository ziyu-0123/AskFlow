import axios from './ajax'

// 定义具体的用户信息类型
export type UserInfo = {
  username: string
  nickname: string
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
