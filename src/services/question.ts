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

export async function getQuestionService(id: string): Promise<QuestionData> {
  const url = `/api/question/${id}`

  // 直接断言为 QuestionData
  const data = (await axios.get(url)) as QuestionData
  return data
}
