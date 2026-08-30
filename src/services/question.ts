import axios from './ajax'

type SearchOption = {
  keyword: string
  isStar: boolean
  isDeleted: boolean
  page: number
  pageSize: number
}

export type ComponentType = 'questionTitle' | 'questionInput'

export interface ComponentData {
  fe_id: string
  type: ComponentType
  title: string
  props: Record<string, unknown>
}

// 单个问卷类型
export interface QuestionData {
  id: string
  _id?: string // MongoDB 原生 ID，后端可能返回此字段
  title: string
  desc?: string // 可选，可能没有
  isPublished: boolean
  isStar: boolean
  answerCount: number
  createdAt: string
  updatedAt?: string // 可选
  componentList?: ComponentData[]
}

// 问卷列表类型
export interface QuestionListData {
  list: QuestionData[]
  total: number
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

// 获取（查询）问卷列表
export async function getQuestionListService(
  // Partial：只要有一部分属性就行
  opt: Partial<SearchOption> = {}
): Promise<QuestionListData> {
  const url = `/api/question`
  const data = (await axios.get(url, { params: opt })) as QuestionListData
  return data
}

// 更新问卷信息
export async function updateQuestionService(
  id: string,
  opt: Record<string, unknown>
): Promise<QuestionListData> {
  const url = `/api/question/${id}`
  const data = (await axios.patch(url, opt)) as QuestionListData
  return data
}

// 复制问卷信息
export async function duplicateQuestionService(id: string): Promise<{ id: string }> {
  const url = `/api/question/duplicate/${id}`
  const data = (await axios.post(url)) as { id: string }
  return data
}

// 批量彻底删除
export async function deleteQuestionService(ids: string[]): Promise<QuestionListData> {
  const url = `/api/question`
  const data = (await axios.delete(url, { data: { ids } })) as QuestionListData
  return data
}
