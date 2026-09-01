import axios from './ajax'

// AI 生成的组件（与后端 ai.service normalize 后的输出一致）
export type AiComponent = {
  fe_id: string
  type: string
  title: string
  isHidden: boolean
  isLocked: boolean
  props: Record<string, unknown>
}

// AI 生成问卷的响应
export type AiGeneratedQuestion = {
  title: string
  desc: string
  componentList: AiComponent[]
}

// 根据需求描述生成问卷（纯生成，不落库）
// 耗时较长（10~30s），单独放宽超时覆盖 axios 实例默认的 10s
export async function generateQuestionService(prompt: string): Promise<AiGeneratedQuestion> {
  const url = `/api/ai/generate-question`
  const data = (await axios.post(url, { prompt }, { timeout: 60 * 1000 })) as AiGeneratedQuestion
  return data
}
