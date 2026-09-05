# 09 · 服务层与 API

目录：[src/services/](../../src/services/)。所有网络请求的唯一出口层。

## 1. axios 封装（ajax.ts）

文件：[src/services/ajax.ts](../../src/services/ajax.ts)

```ts
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3005/',
  timeout: 10 * 1000,     // 默认 10s；AI 接口在调用处覆盖为 60s
})
```

### 请求拦截器
```ts
config.headers['Authorization'] = `Bearer ${getToken()}`
```
token 来自 [utils/user-token.ts](../../src/utils/user-token.ts)（localStorage key `USER_TOKEN`）。

### 响应拦截器（统一约定）

后端成功响应格式：`{ errno: 0, data, msg? }`；错误可能以 `errno !== 0` 或 HTTP 4xx/5xx（Nest HttpException，字段名为 `message`）两种形态出现。

- **成功**：`errno === 0` → 直接 `return data`（调用方拿到的就是业务数据，无需再 `.data`）；
- **业务错误**（`errno !== 0`）→ `message.error(msg)` + throw；
- **HTTP 错误** → 提取 `msg || message` 弹 toast 并 reject（保证调用方 `err.message` 是可读中文，如"请先配置 AI 模型…"）；
- **静默场景**：`errMsg === '未登录' || 'Token 无效'` 时不弹 toast（登录页刷新时的探活请求、退出后仍在途的请求属预期噪音）。

> 调用方因此约定：错误提示统一由拦截器弹出，业务代码一般无需 try/catch 弹错，只做状态回退。

## 2. user.ts — 用户与 AI 配置

文件：[src/services/user.ts](../../src/services/user.ts)

| 函数 | 方法/路径 | 说明 |
| --- | --- | --- |
| `getUserInfoService()` | `GET /api/user/info` | 返回 `UserInfo { username, nickname, aiConfigured, aiConfig? }`；aiConfig.apiKey 为打码回显值 |
| `updateAiConfigService(config)` | `PATCH /api/user/ai-config` | 保存 `{ apiKey, baseUrl, model }`；已配置过时 apiKey 留空表示沿用原值；返回打码后的配置 |
| `registerService(username, password, nickname?)` | `POST /api/user/register` | nickname 缺省用 username |
| `loginService(username, password)` | `POST /api/user/login` | 返回 `{ token }` |

## 3. question.ts — 问卷 CRUD 与译文

文件：[src/services/question.ts](../../src/services/question.ts)

### 核心类型

```ts
export type ComponentType = 'questionInfo' | 'questionTitle' | 'questionParagraph'
  | 'questionInput' | 'questionTextarea' | 'questionRadio' | 'questionCheckbox'

export interface QuestionData {
  id: string; _id?: string            // 后端 Mongoose 只回 _id，前端归一
  title: string; desc?: string
  isPublished: boolean; isStar: boolean
  answerCount: number; createdAt: string; updatedAt?: string
  type?: 'survey' | 'interview'
  interviewConfig?: { outline: string[] }          // 访谈提纲
  componentList?: ComponentData[]
  translations?: { [lang: string]: QuestionTranslation }  // 多语言译文（按 fe_id 存文案差异）
}

export interface QuestionTranslation {
  title: string; desc: string
  texts: { [fe_id: string]: ComponentTextTranslation }
}
// ComponentTextTranslation：{ title?, desc?, text?, placeholder?, options?(radio), list?(checkbox) }
```

### 数据归一（normalizeQuestion）

后端 Mongoose toJSON 默认只有 `_id` 没有 `id` 虚拟字段，service 层统一归一，避免列表页拿到 `undefined` 路由到 `/question/edit/undefined`：

```ts
{ ...q, id: q.id || q._id || '', answerCount: q.answerCount ?? 0,
  createdAt: formatDateTime(q.createdAt), updatedAt: formatDateTime(q.updatedAt) }  // ISO → YYYY-MM-DD HH:mm
```

### 接口清单

| 函数 | 方法/路径 | 说明 |
| --- | --- | --- |
| `getQuestionService(id)` | `GET /api/question/:id` | 单个问卷（含 componentList/translations），已归一 |
| `createQuestionService(type?)` | `POST /api/question` | 创建空问卷；`type: 'interview'` 创建访谈型 |
| `getQuestionListService(opt)` | `GET /api/question` | 查询参数 `keyword / isStar / isDeleted / page / pageSize`；list 逐项归一 |
| `updateQuestionService(id, opt)` | `PATCH /api/question/:id` | 部分更新（保存/发布/标星/软删除/写 AI 内容/访谈配置） |
| `updateTranslationsService(id, lang, translation)` | `PUT /api/question/:id/translations` | 保存某语言整卷译文（需登录+仅作者，覆盖更新） |
| `duplicateQuestionService(id)` | `POST /api/question/duplicate/:id` | 复制问卷，返回新 `{ id }` |
| `deleteQuestionService(ids)` | `DELETE /api/question` | **批量彻底删除**（body 传 `{ ids }`，回收站用） |

## 4. ai.ts — AI 能力（全部 60s 超时）

文件：[src/services/ai.ts](../../src/services/ai.ts)

| 函数 | 路径 | 入参 → 返回 |
| --- | --- | --- |
| `generateQuestionService(prompt)` | `POST /api/ai/generate-question` | prompt → `{ title, desc, componentList: AiComponent[] }` |
| `optimizeComponentService(component)` | `POST /api/ai/optimize-component` | `{ type, props }` → `{ props }`（优化后 props） |
| `translateQuestionService(targetLang, question)` | `POST /api/ai/translate-question` | `{ targetLang, question: { title, desc, componentList:[{type,props}] } }` → 同构结构（文案为译文） |
| `summarizeAnswersService(questionId, componentId)` | `POST /api/ai/summarize-answers` | → `{ summary, totalCount, themes[], sentiment }`（count 为 AI 估算） |
| `analyzeReportService(questionId)` | `POST /api/ai/analyze-report` | → `{ overview, insights[], suggestions[] }` |
| `generateInterviewOutlineService(title, desc)` | `POST /api/ai/generate-interview-outline` | → `{ outline: string[] }` |
| `summarizeInterviewService(questionId)` | `POST /api/ai/summarize-interview` | → 同 summarize-answers 结构（count 为份数） |

翻译入参投影说明：只传 `{ type, props }`，剥离 fe_id/title/isHidden/isLocked 等结构字段（props 里的 value/checked 由后端 zod strip 剥离），进提示词的天然是纯文案。

## 5. stat.ts — 统计

文件：[src/services/stat.ts](../../src/services/stat.ts)（返回类型较宽松，用 `ResDataType`）

| 函数 | 路径 | 说明 |
| --- | --- | --- |
| `getQuestionStatListService(questionId, { page, pageSize })` | `GET /api/stat/:qid` | 答卷分页列表 `{ list, total }`（list 行按 fe_id 取答案） |
| `getComponentStatService(questionId, componentId)` | `GET /api/stat/:qid/:cid` | 组件聚合统计 `{ stat: { name, count }[] }`（饼图数据源） |
| `getInterviewAnswerListService(questionId, { page, pageSize })` | `GET /api/stat/:qid/interview` | 访谈答卷列表（含 conversationList 与 usage） |

## 6. dev 环境代理

[vite.config.ts](../../vite.config.ts) 中 `/api` 代理到 `http://localhost:3005`（`changeOrigin: true` 解决跨域）。因此本地既可以直接用 `VITE_API_BASE` 走绝对地址，也可以用默认配置走代理。

## 7. 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:3005/` | axios baseURL（后端地址） |
| `VITE_CLIENT_BASE` | `http://localhost:3000` | C 端填写端地址，拼接分享链接 / 二维码 |

使用位置：`ajax.ts` 与 `StatHeader.tsx` / `InterviewStat.tsx`。
