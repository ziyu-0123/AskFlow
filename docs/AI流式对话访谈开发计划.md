# AI 流式对话访谈 — 开发计划

> 依据：[AI功能需求文档.md](./AI功能需求文档.md) 第 2 节功能点 4（原「对话式问卷」，经讨论重构为「AI 访谈」）
> 状态：**已完成（9 个开发点 6-1~6-9 全部交付并验收，2026-09-04）**
> 前置依赖：功能点 1/2/3/7/8 已完成（AiService 基础设施、用户自带 Key、`requireAiConfig`、`mapLlmError`、开放题预处理管道均已就绪）

## 〇、需求解读与关键决策

### 需求（原功能点 4 → 重构为「AI 访谈」）

把传统「一页表单」升级为「AI 访谈员」：创建者只指定**标题 + 访谈描述 + 访谈提纲**，填写者在 C 端以聊天形式与 AI 逐题对话，AI 沿提纲发问并适当追问；访谈结束后把**聊天记录**回传，统计端对聊天记录做 AI 分析总结。

与原始功能点 4 的本质区别：**不再复用 `componentList` 固定题目**，访谈没有预设组件，聊天记录是全新的数据形态（自由对话），因此数据模型、统计口径都要相应扩展。

### 已确认取舍点（用户已确认，2026-09-03）

| 取舍点 | 已确认方案 |
|---|---|
| 访谈与现有问卷的关系 | **新增「访谈型问卷」并存**，现有 componentList 问卷完全不动 |
| C 端匿名 AI 调用成本 | **创建者自带 Key + 平台限额**（轮次上限兜底防滥用） |
| 访谈质量可控性 | **必须填「访谈提纲」**，AI 沿提纲逐题追问 |
| 访谈配置页形态 | **独立访谈配置页**（新路由，不复用拖拽编辑器） |
| 提纲生成方式 | **手动增删 + AI 生成提纲**（新增 `generate-interview-outline` 接口） |
| 访谈结束机制 | **AI 收尾输出 `[[END]]` 标记 → 后端剥离并发 `event: finished` → 前端启用结束按钮** + 轮次上限 20 兜底 |
| 统计端总结粒度 | **整卷聚类总结**（所有访谈汇总一次产出，复用功能点 7 能力） |

## 一、现状分析（结合项目当前情况）

| 现状 | 对本功能的影响 |
|---|---|
| `Question.componentList` 为 `required: true`（[question.schema.ts](../../question-server-nestjs/src/question/schemas/question.schema.ts)） | 访谈无组件，需新增 `type` 区分问卷类型，`componentList` 改为可选 |
| `Answer.answerList` 为 `required: true`（[answer.schema.ts](../../question-server-nestjs/src/answer/schemas/answer.schema.ts)） | 访谈答卷是对话，需新增 `conversationList`，`answerList` 改可选 |
| `AiService.chatWithRetry` 是**同步 + JSON 模式**（`response_format: json_object` + zod 校验），`createClient` 超时 55s | 访谈是**流式 + 自然语言**，不可复用，需新增 `chatStream` 流式方法 |
| 全局 `TransformInterceptor` 把所有响应包装成 `{ errno, data }`（[transform.interceptor.ts](../../question-server-nestjs/src/transform/transform.interceptor.ts)） | **SSE 流式接口必须绕过它**，否则会试图把流包装成 JSON；用 `@Res()` 手动写流绕开 |
| 全局 `HttpExceptionFilter` 把异常包装成 JSON（[http-exception.filter.ts](../../question-server-nestjs/src/http-exception/http-exception.filter.ts)） | SSE 接口须在写流式响应头**之前**完成全部校验；流式过程中的错误用 SSE error 事件或 `end()` 处理 |
| `AuthGuard` 全局生效，`@Public()` 可跳过（[auth.guard.ts](../../question-server-nestjs/src/auth/auth.guard.ts)） | 访谈填写者匿名，SSE 接口须 `@Public()`，但内部校验问卷/类型/轮次/创建者 Key |
| `User.aiConfig = { apiKey, baseUrl, model }`（用户自带 Key，[user.schema.ts](../../question-server-nestjs/src/user/schemas/user.schema.ts)） | 访谈走**创建者**的 Key，需按 `question.author` 反查其 `aiConfig` |
| `QuestionController.findOne` 已 `@Public()`（C 端取问卷用），`POST /api/question` 固定生成 questionInfo 组件 | C 端取访谈问卷无需改；创建端需支持按 `type` 创建不同初始结构 |
| C 端 [id].tsx](file:///d:/QD_Learn/askflow-client/src/pages/question/%5Bid%5D.tsx) 是 Pages Router + SSR 表单渲染；`ajax.ts` 用原生 fetch | 需按 `type` 分支渲染聊天 UI；SSE 用 fetch `ReadableStream`（EventSource 不支持 POST body） |
| 统计页三栏（ComponentList/PageStat/ChartStat）依赖 `componentList` 生成表格列 | 访谈无组件，统计页需按 `type` 分支到独立的「聊天记录 + AI 总结」视图 |
| 功能点 7 的开放题预处理管道 `_collectOpenTextAnswers` 已在 AiService 内（[ai.service.ts](../../question-server-nestjs/src/ai/ai.service.ts)） | 访谈总结可复用聚类/情感思路，但输入源是 `conversationList` 文本而非 `answerList` |

## 二、技术选型（关键决策）

| 决策点 | 方案 | 理由 / 备选否决 |
|---|---|---|
| 问卷类型区分 | 显式 `type: 'survey' \| 'interview'`（默认 `survey`），访谈额外 `interviewConfig` | 语义清晰、各端判断统一；否决「用 interviewConfig 是否存在隐式判断」——隐式约定脆弱，存量数据需处处兜底 |
| 访谈字段复用 | 复用 `title`（标题）+ `desc`（访谈描述），`interviewConfig` 只存 `outline: string[]`（提纲） | 避免描述字段冗余；`desc` 本就承载描述语义 |
| 答卷结构 | `Answer` 新增 `conversationList: { role: 'interviewer' \| 'interviewee'; content: string }[]`，`answerList` 改可选 | 最小扩展；按 `question.type` 分流，Answer 文档自身不存 type（避免冗余） |
| 流式协议 | **SSE**（`text/event-stream`），前端 `fetch` + `ReadableStream` 读取 | 与需求文档预判一致；单向流足够（AI 推→前端收）；否决 WebSocket——需额外网关、C 端无鉴权难管理会话 |
| 对话模型 | **无状态单轮流式**：前端维护 `history`，每轮全量发送，后端返回 AI 下一句 | 无状态易扩展、断点易续、失败易重试；否决后端维持长会话（session 状态管理复杂） |
| AI 流式实现 | 新增 `chatStream(client, model, messages, onDelta)`，OpenAI SDK `stream: true` 逐 chunk 回调 | 现有 `chatWithRetry` 是 JSON 模式不可复用；流式输出自然语言，无需 zod |
| 鉴权 | SSE 接口 `@Public()` + 内部校验链（问卷存在/type/isPublished/轮次上限/创建者 Key） | 填写者匿名无法登录；校验兜底防滥用 |
| 绕过全局拦截器 | `@Res()` 手动写流（`res.write` + `res.end`），handler 不返回业务值 | 绕开 `TransformInterceptor` 的 `{errno,data}` 包装与 `HttpExceptionFilter` 的 JSON 化 |
| 访谈结束判定 | **AI 收尾输出 `[[END]]` 标记**，后端 buffer 检测并剥离，另发 `event: finished`；前端收到后启用「结束访谈」按钮；轮次上限 20 兜底 | 自然语言判定结束脆弱，用确定性标记 + 信号事件替代；标记跨 chunk 靠 buffer 保留尾部字符防截断 |
| 成本控制 | 提纲驱动自然收敛 + 单份问卷轮次上限 + 单轮输出 token 上限 | 创建者自带 Key 已分摊成本，轮次上限兜底防恶意刷 |
| 统计端形态 | 访谈答卷走独立视图（逐份聊天记录 + AI 总结），复用功能点 7 聚类/情感思路 | 访谈无 radio/checkbox，不适用现有图表；聊天记录是自由文本，天然契合「总结」能力 |

## 三、技术可行性评估

**结论：可行，中等偏上工作量，核心难点在 SSE 流式链路，其余为增量开发。**

1. **技术栈零新增**：NestJS 原生支持 `@Res()` 流式响应；OpenAI SDK `^7.8.0` 已支持 `stream: true`；前端 fetch `ReadableStream` 原生可用。无需引入 socket.io / EventSource 库。
2. **数据模型向后兼容**：`type` 有默认值、`componentList`/`answerList` 改可选，存量 survey 问卷与答卷不受影响。
3. **鉴权闭环可落地**：`@Public()` + 内部校验链照搬功能点 7/8 的「作者 403 / 问卷 404 / 未配置 400」模式；新增「type 校验 + 轮次上限」两分支。
4. **成本可控**：单轮 input ≈ system（提纲+规则约 500 token）+ history（20 轮问答累积约 1 万 token），单轮输出限 300 token，主流 128k 上下文安全余量充足；轮次上限（建议 20 轮）从源头封顶单份访谈成本。

**已识别风险与应对**

| 风险 | 应对 |
|---|---|
| 全局拦截器/过滤器破坏 SSE 流 | 用 `@Res()` 手动写流；校验全部前置到写流之前 |
| 流式过程创建者 Key 失效/超时 | OpenAI SDK 流式错误在 `chatStream` 内捕获，写入 SSE error 事件并 `end()`，前端提示 |
| C 端匿名刷接口 | 单份问卷轮次上限（20 轮）+ history 长度校验；一期不做 IP 级限流，靠轮次兜底 |
| 访谈跑题 / 追问失控 | 提纲强制 + System prompt 约束「一次只问一题、沿提纲、不重复」 |
| 前端 SSE 解析复杂度 | 统一「每 chunk 一条 `data: {...}\n\n`」，前端按行解析；`[DONE]` 结束 |

## 四、数据模型设计

### Question（[question.schema.ts](../../question-server-nestjs/src/question/schemas/question.schema.ts) 扩展）

```
type: 'survey' | 'interview'   // 默认 'survey'
interviewConfig?: {
  outline: string[]            // 访谈提纲（引导问题列表，AI 沿此逐题追问）
}
componentList?: ...            // 由 required 改为可选（interview 为空）
```

### Answer（[answer.schema.ts](../../question-server-nestjs/src/answer/schemas/answer.schema.ts) 扩展）

```
answerList?: { componentId, value }[]          // 由 required 改为可选（survey 用）
conversationList?: { role: 'interviewer'|'interviewee', content: string }[]  // interview 用
```

## 五、接口契约

### 1. POST /api/question（扩展，需登录）

入参新增可选 `{ type?: 'survey' | 'interview' }`。创建访谈时生成 `type='interview'`、空 `componentList`、`interviewConfig: { outline: [] }`。

### 2. POST /api/ai/generate-interview-outline（需登录）

入参 `{ title: string, desc: string }`（访谈标题 + 描述，用于生成提纲），返回 `{ outline: string[] }`。

- 复用现有 `chatWithRetry`（JSON 模式）+ zod schema，与 `generate-question` 同模式，零新基建
- System prompt：访谈提纲设计专家，根据访谈目标产出 5~8 个引导问题（层层递进、覆盖关键维度）
- 前端拿到 `outline` 回填提纲表单，可继续手动增删

### 3. POST /api/ai/interview/stream（`@Public()`，SSE 流式）

入参（JSON）：

```json
{
  "questionId": "...",
  "history": [
    { "role": "interviewer", "content": "您好，感谢参与访谈..." },
    { "role": "interviewee", "content": "..." }
  ]
}
```

- `history` 为空数组 → AI 输出开场白 + 提纲第一问；否则 AI 基于完整历史输出下一句。
- 返回：`text/event-stream`，逐 chunk 推送 `data: <增量文本>\n\n`；访谈结束（提纲问完收尾）时额外推送 `event: finished\ndata: {}\n\n`；流结束推送 `data: [DONE]\n\n`。

校验链（顺序即优先级，全部在写流式响应头之前完成）：

```
questionId 空 → 400 参数不合法
问卷不存在 → 404
type !== 'interview' → 400 该问卷不是访谈问卷
未发布 → 400 该问卷尚未发布
history 超轮次上限 → 400 访谈已达轮次上限
创建者未配置 AI → 400 创建者未配置 AI 模型，暂无法访谈
```

### 4. POST /api/answer（扩展）

入参允许 `answerList` 或 `conversationList`（至少其一）。访谈提交 `{ questionId, conversationList }`。

### 5. POST /api/ai/summarize-interview（需登录，仅问卷作者）

入参 `{ questionId }`，返回（复用功能点 7 的 `summarizeAnswersSchema` 结构）：

```json
{
  "summary": "总体结论",
  "totalCount": 参与分析的访谈答卷份数,
  "themes": [ { "label": "主题名", "count": 提及次数, "description": "概述+典型原话" } ],
  "sentiment": { "positive": 0, "negative": 0, "neutral": 0 }
}
```

### 6. 统计接口（扩展）

`GET /api/stat/:id` 对访谈问卷返回每份答卷的 `conversationList`（或新增专用访谈列表接口），供统计端渲染聊天记录。

## 六、开发计划（小步拆分）

> 按契约「小步拆分 + 最小可运行优先」：每个开发点只解决一个问题，完成后系统处于可运行状态、可独立验收。

### 开发点总览

| 开发点 | 内容 | 依赖 | 状态 |
|---|---|---|---|
| 6-1 | 后端 Question 数据模型扩展 | 无 | ✅ 已完成 |
| 6-2 | 后端 Answer 数据模型扩展 | 无 | ✅ 已完成 |
| 6-3 | 创建端：新建访谈入口 + 独立配置页（手动提纲） | 6-1 | ✅ 已完成 |
| 6-4 | 创建端：AI 生成提纲 | 6-3 | ✅ 已完成 |
| 6-5 | 后端：SSE 流式访谈接口 | 6-1 | ✅ 已完成 |
| 6-6 | 填写端：聊天 UI + 流式接收 | 6-5 | ✅ 已完成 |
| 6-7 | 填写端：结束访谈 + 提交答卷 | 6-2、6-6 | ✅ 已完成 |
| 6-8 | 后端：访谈 AI 总结 + 访谈答卷列表 | 6-2 | ✅ 已完成 |
| 6-9 | 统计端：访谈统计视图 | 6-8 | ✅ 已完成 |

### 6-1 后端 Question 数据模型扩展

**改动**（question-server-nestjs）

- `question.schema.ts`：`componentList` 改可选；新增 `type`（默认 `survey`）+ `interviewConfig.outline`（`Mixed`，规避嵌套对象类型推断错误）
- `question.service.ts`：`create(username, type?)` 按 type 生成初始结构；`UPDATABLE_FIELDS` 增补 `type`、`interviewConfig`
- `question.controller.ts`：`POST /api/question` body 接 `{ type }`

**验收**

- 带 `type=interview` 能创建；`PATCH` 能保存 `interviewConfig`；`GET` 能读回
- 存量 survey 问卷创建/更新/读取零回归

### 6-2 后端 Answer 数据模型扩展

**改动**

- `answer.schema.ts`：`answerList` 改可选，新增 `conversationList`
- `answer.dto.ts` + `answer.service.ts`：`create` 校验「answerList / conversationList 至少其一」

**验收**

- `POST /api/answer` 传 `conversationList` 能落库并读回
- survey 的 `answerList` 提交零回归

### 6-3 创建端：新建访谈入口 + 独立配置页

**改动**（AskFlow）

- `services/question.ts`：`QuestionData` 加 `type`/`interviewConfig`；`createQuestionService(type?)`
- `ManageLayout.tsx`：新增「新建访谈」入口（创建后跳配置页）
- 新建独立配置页 `/question/interview/:id`：标题 + 访谈描述 + 提纲手动增删 + 保存（走 `updateQuestionService`）

**验收**

- 点「新建访谈」→ 进入配置页 → 填标题/描述/提纲 → 保存成功并可读回
- 普通问卷创建/编辑零回归

### 6-4 创建端：AI 生成提纲

**改动**

- 后端：`generate-question.schema.ts` + `ai.service.ts` + `ai.controller.ts` 新增 `generateInterviewOutline(username, title, desc)` 与 `POST /api/ai/generate-interview-outline`（复用 `chatWithRetry`）
- 前端：`services/ai.ts` 加 `generateInterviewOutlineService`；配置页加「AI 生成提纲」按钮（回填后可继续编辑）

**验收**

- 配置页点「AI 生成提纲」→ 回填提纲 → 可继续编辑
- 未配置 AI 时引导到 AI 设置

### 6-5 后端：SSE 流式访谈接口

**改动**

- `ai.service.ts`：新增 `chatStream`（OpenAI `stream: true`）；新增 `interviewStream`（校验链 → 提示词 → 流式返回）；轮次上限 20
- `ai.controller.ts`：`POST /api/ai/interview/stream`（`@Public()` + `@Res()` 手动写流，绕过全局拦截器）

**验收**

- curl 能收到 `text/event-stream` 逐块输出，`data: [DONE]` 结束
- 校验链各分支（非访谈/未发布/超轮次/未配置）返回明确 JSON 错误

### 6-6 填写端：聊天 UI + 流式接收

**改动**（askflow-client）

- `services/interview.ts`：`postInterviewStream(questionId, history)`（fetch + `ReadableStream` 解析 SSE）
- `pages/question/[id].tsx`：`type === 'interview'` 分支渲染聊天 UI（消息列表 + 输入框 + 发送，client component）

**验收**

- C 端打开访谈问卷 → 聊天 UI → 发消息 → 流式打字机回复

### 6-7 填写端：结束访谈 + 提交答卷

**改动**

- 聊天 UI 加「结束访谈」按钮
- `services/answer.ts` 扩展 `postAnswer` 支持 `conversationList`

**验收**

- 点「结束访谈」→ 提交 `conversationList` → 后端落库可查

### 6-8 后端：访谈 AI 总结 + 访谈答卷列表

**改动**

- `stat.service.ts`：访谈答卷列表接口（返回 `conversationList`）
- `ai.service.ts`：`summarizeInterview(username, questionId)`（整卷聚类/情感）
- `ai.controller.ts`：`POST /api/ai/summarize-interview`

**验收**

- 作者调用返回整卷聚类结果；非作者 403

### 6-9 统计端：访谈统计视图

**改动**（AskFlow）

- `pages/question/stat/index.tsx`：`type === 'interview'` 分支到访谈统计视图（逐份聊天记录 + 「AI 总结」卡片）
- `services/stat.ts` / `services/ai.ts`：访谈列表接口 + `summarizeInterviewService`

**验收**

- 统计页访谈问卷展示逐份聊天记录 + 可生成整卷 AI 总结
- survey 统计（表格/图表/AI 报告）零回归

## 七、验收标准

1. 创建端可新建访谈问卷，配置标题/访谈描述/提纲（手动增删或 AI 生成）并保存；普通问卷功能零回归
2. C 端访谈问卷进入聊天式 UI，AI 沿提纲逐题发问、追问，流式打字机效果；可结束并提交聊天记录
3. 访谈答卷落库为 `conversationList`；统计端可逐份查看聊天记录并生成整卷 AI 总结
4. 鉴权闭环：非访谈问卷 / 未发布 / 超轮次（20 轮）/ 创建者未配置 AI 均返回明确错误
5. 存量 survey 问卷的创建、编辑、填写、统计、AI 功能零回归

## 八、开发后增量优化（2026-09-04）

9 个开发点交付并验收后，联调与使用中发现并修复/优化以下项（计划外）：

| 项 | 内容 | 说明 |
|---|---|---|
| 问卷列表编辑入口 | `QuestionCard` 按 `type` 区分编辑跳转 | 访谈问卷「编辑问卷」/标题/复制跳访谈配置页，普通问卷仍跳编辑页 |
| 结束按钮交互 | AI 收尾输出 `[[END]]` → 后端 `event: finished` → 前端启用按钮 | 「结束访谈」在问答结束前禁用 |
| 统计答卷展示 | 分页（每页 10 份）+ 折叠（Collapse，显示首句摘要） | 避免统计页随答卷数量/内容无限增高 |
| 统计页分享 | header 加链接 + 二维码 | 与 survey 一致，提供填写入口 |
| 填写端高度 | `.chat` 由 `80vh` 调整为 `100vh/100dvh` | 聊天界面占满视口 |
