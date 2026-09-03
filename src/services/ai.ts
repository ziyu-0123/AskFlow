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

// 补全/润色单个问卷组件（纯生成，不落库），返回优化后的 props
// 与生成问卷共用放宽超时
export async function optimizeComponentService(component: {
  type: string
  props: Record<string, unknown>
}): Promise<{ props: Record<string, unknown> }> {
  const url = `/api/ai/optimize-component`
  const data = (await axios.post(url, { component }, { timeout: 60 * 1000 })) as {
    props: Record<string, unknown>
  }
  return data
}

// 翻译入参投影：只传 { type, props }，剥离 fe_id/title/isHidden/isLocked 等结构字段
// （props 里的 value/checked 由后端 zod strip 剥离，进提示词的天然是纯文案）
export type TranslateQuestionInput = {
  title: string
  desc: string
  componentList: {
    type: string
    props: Record<string, unknown>
  }[]
}

// 翻译响应（与入参同构，仅文案字段为译文）
export type TranslateQuestionResult = {
  title: string
  desc: string
  componentList: {
    type: string
    props: Record<string, unknown>
  }[]
}

// 整卷翻译为指定目标语言（纯生成，不落库），译文保存由独立的 PUT translations 接口负责
export async function translateQuestionService(
  targetLang: string,
  question: TranslateQuestionInput
): Promise<TranslateQuestionResult> {
  const url = `/api/ai/translate-question`
  const data = (await axios.post(
    url,
    { targetLang, question },
    { timeout: 60 * 1000 }
  )) as TranslateQuestionResult
  return data
}

// AI 总结开放式答案的响应（意见聚类 + 情感一次产出；count 为 AI 估算值）
export type SummarizeAnswersResult = {
  summary: string
  totalCount: number
  themes: { label: string; count: number; description: string }[]
  sentiment: { positive: number; negative: number; neutral: number }
}

// AI 总结开放式问题的答案（纯生成，不落库；后端自行拉取答卷并预处理）
export async function summarizeAnswersService(
  questionId: string,
  componentId: string
): Promise<SummarizeAnswersResult> {
  const url = `/api/ai/summarize-answers`
  const data = (await axios.post(
    url,
    { questionId, componentId },
    { timeout: 60 * 1000 }
  )) as SummarizeAnswersResult
  return data
}

// AI 整卷分析报告的响应（overview 总体结论 + 每题洞察 + 改进建议）
export type ReportResult = {
  overview: string
  insights: { question: string; finding: string; chartDesc: string }[]
  suggestions: string[]
}

// AI 生成整卷分析报告（纯生成，不落库；后端自行聚合全卷答卷数据）
export async function analyzeReportService(questionId: string): Promise<ReportResult> {
  const url = `/api/ai/analyze-report`
  const data = (await axios.post(url, { questionId }, { timeout: 60 * 1000 })) as ReportResult
  return data
}

// AI 生成访谈提纲的响应
export type GenerateInterviewOutlineResult = {
  outline: string[]
}

// AI 生成访谈提纲（纯生成，不落库）
export async function generateInterviewOutlineService(
  title: string,
  desc: string
): Promise<GenerateInterviewOutlineResult> {
  const url = `/api/ai/generate-interview-outline`
  const data = (await axios.post(
    url,
    { title, desc },
    { timeout: 60 * 1000 }
  )) as GenerateInterviewOutlineResult
  return data
}
