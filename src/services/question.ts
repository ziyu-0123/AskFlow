import axios from './ajax'

export interface QuestionData {
  id: string
  title: string
  desc?: string
  isPublished?: boolean
  isStar?: boolean
  answerCount?: number
  createdAt?: string
  updatedAt?: string
}

// 获取单个问卷信息
export async function getQuestionService(id: string): Promise<QuestionData> {
  const url = `/api/question/${id}`

  // 直接断言为 QuestionData
  const data = (await axios.get(url)) as QuestionData
  return data
}

// 创建问卷
export async function createQuestionService(): Promise<QuestionData> {
  const url = `/api/question`
  const data = (await axios.post(url)) as QuestionData
  return data
}
