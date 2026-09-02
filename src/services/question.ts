import axios from './ajax'

type SearchOption = {
  keyword: string
  isStar: boolean
  isDeleted: boolean
  page: number
  pageSize: number
}

export type ComponentType =
  | 'questionInfo'
  | 'questionTitle'
  | 'questionParagraph'
  | 'questionInput'
  | 'questionTextarea'
  | 'questionRadio'
  | 'questionCheckbox'

export interface ComponentData {
  fe_id: string
  type: ComponentType
  title: string
  isHidden?: boolean
  isLocked?: boolean
  props: Record<string, unknown>
}

// 单个组件的文案译文（按 fe_id 索引，仅含该组件类型有文案值的字段）
export interface ComponentTextTranslation {
  title?: string
  desc?: string
  text?: string
  placeholder?: string
  options?: string[] // questionRadio 选项 text 数组，顺序与主版本一致
  list?: string[] // questionCheckbox 选项 text 数组，顺序与主版本一致
}

// 单个语言的整卷译文：只存"文案差异"，不存结构
export interface QuestionTranslation {
  title: string
  desc: string
  texts: {
    [fe_id: string]: ComponentTextTranslation
  }
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
  translations?: {
    [lang: string]: QuestionTranslation
  }
}

// 问卷列表类型
export interface QuestionListData {
  list: QuestionData[]
  total: number
}

// 后端 Mongoose 默认 toJSON 不带 id 虚拟字段，只有 _id。
// 这里统一把 _id 归一为 id，避免列表页拿不到 id 导致路由到 /question/edit/undefined
function normalizeQuestion(q: QuestionData): QuestionData {
  return {
    ...q,
    id: q.id || q._id || '',
    // 存量数据可能没有 answerCount 字段，兜底为 0
    answerCount: q.answerCount ?? 0,
    // 后端返回 ISO 原始字符串（如 2026-08-31T11:26:28.547Z），格式化为本地时间
    createdAt: formatDateTime(q.createdAt),
  }
}

// 格式化为 YYYY-MM-DD HH:mm
function formatDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 获取单个问卷信息
export async function getQuestionService(id: string): Promise<QuestionData> {
  const url = `/api/question/${id}`

  // 直接断言为 QuestionData
  const data = (await axios.get(url)) as QuestionData
  return normalizeQuestion(data)
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
  return { list: data.list.map(normalizeQuestion), total: data.total }
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

// 保存某语言的整卷译文（需登录 + 仅作者；已有译文覆盖更新）
export async function updateTranslationsService(
  id: string,
  lang: string,
  translation: QuestionTranslation
): Promise<null> {
  const url = `/api/question/${id}/translations`
  const data = (await axios.put(url, { lang, translation })) as null
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
