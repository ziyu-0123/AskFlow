# 创建端：AI 生成问卷 — 开发计划

> 依据：[AI功能需求文档.md](./AI功能需求文档.md) 第 1 节功能点 1
> 状态：**方案设计已确认（用户自带 Key + 侧边栏入口 + 昵称菜单配置），可进入开发**

## 〇、已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 模型与开销 | **用户自带 API Key**：应用本身不承担任何 token 开销；未配置则无法使用 AI 功能；用户额度用完即不可用 |
| 配置入口 | **仅一处**：顶部栏用户信息区——点击昵称弹出下拉菜单（AI 设置 / 退出登录）。登录页不加配置项，保持登录页职责单一 |
| 配置持久化 | 配置存于服务端用户文档，跨登录会话保留，下次登录无需重填 |
| 未配置引导 | 点击「AI 生成问卷」时若未配置 → 弹窗提醒，引导用户点击昵称进入 AI 设置 |
| AI 功能入口 | **ManageLayout 侧边栏**，与「新建问卷」按钮并列 |
| 限流 | **取消每日限流**（用户自己的额度自己管理）；仅前端防重复提交 |

## 一、项目现状分析

### 1.1 现有架构对该功能的支撑度：非常高

| 现有设施 | 对 AI 生成的意义 |
|---|---|
| 7 种组件的 `interface.ts` 均有完整 props 类型 + DefaultProps | 可直接编译成"JSON Schema 约束提示词"，喂给 LLM 限定输出结构 |
| `useLoadQuestionData.ts` 已实现「服务端 JSON → Redux store」的转换映射 | AI 生成的 `componentList` 走同一条管道进编辑器，编辑器零改动 |
| `EditHeader` 的自动保存（debounce + PATCH `/api/question/:id`） | 生成结果落入编辑器后自动持久化，保存链路零改动 |
| `ManageLayout` 的「新建问卷」链路（POST → 拿 id → 跳编辑页） | AI 创建流程可直接复用：生成 → 创建空问卷 → 写入内容 → 跳转 |
| 后端已有全局 `AuthGuard` + `@Public()` 装饰器体系 | AI 接口不加 `@Public()` 即自动要求登录，天然防白嫖 |
| `ConfigModule.forRoot({ isGlobal: true })` + `.env` 已就绪 | 基础设施现成 |
| `TransformInterceptor` 统一包装 `{ errno, data }` | AI 接口响应格式与其他接口一致 |
| C端 `askflow-client` 按 `componentList` 渲染 | 只要 AI 输出符合 schema，C端填写、答卷存储、统计全链路零改动 |
| `User` schema 结构简单（username/password/nickname） | 扩展 `aiConfig` 字段无历史包袱 |

结论：该功能是**纯增量开发**——不碰数据模型（仅 user 加字段）、不碰 C端、不碰统计。

### 1.2 调研发现的注意点

1. **`QuestionDto` 只声明了 `title`/`desc`**，且 `main.ts` 未注册全局 `ValidationPipe`，body 全量透传，`componentList` 目前能正常保存。⚠️ 将来若加 `ValidationPipe({ whitelist: true })` 会直接破坏保存功能——本次开发不动它，但记住这个隐患。
2. **`fe_id` 生成职责统一由后端承担**：现有问卷的 `fe_id` 由后端 `create`/`duplicate` 用 nanoid 生成，AI 生成组件同样由后端 AI 模块生成（后端已有 nanoid 依赖）。
3. **LLM 可能生成不合法的 options**（如重复的 `value`、缺失 `value`）——radio/checkbox 的 `value` 是统计聚合的 key，必须后端规范化（重写为 `item1/item2/...`），否则统计页会出错。
4. **`apiKey` 属于敏感凭证**：存储在用户文档中，任何回显接口必须打码（如 `sk-***abc`），不能明文返回前端。
5. **用户可配置任意 `baseUrl`**：服务端发起请求存在轻量 SSRF 面，学习项目仅校验 `https://` 前缀即可，不过度设计。

## 二、技术选型

| 决策点 | 选型 | 理由 |
|---|---|---|
| 模型 | **用户自带**：`apiKey` + `baseUrl` + `model` 存于用户配置 | 应用零成本；用户自选 DeepSeek/智谱/通义等，自由换模型 |
| SDK | `openai` 官方 Node SDK | 通过 `baseURL` 参数兼容所有 OpenAI 兼容端点；**按用户配置动态创建 client 实例**（非全局单例） |
| 结构化输出 | Prompt 内嵌 schema + `response_format: json_object` + zod 校验 | JSON mode 比 function calling 更稳；7 种组件 TS 类型 + 示例写进 system prompt，zod 严格校验，不合法自动重试 1 次 |
| 校验库 | `zod`（后端新增依赖） | 手写校验 7 种组件嵌套结构太繁琐；NestJS 生态标准选择 |
| 流式输出 | 第一期不用，一次性返回 JSON + 前端 loading | 流式对 JSON 输出无意义（JSON 必须完整才能解析） |
| 接口设计 | AI 接口无状态纯生成（不碰数据库），返回 `{ title, desc, componentList }`；前端拿结果后调现有 create/update 接口落库 | AI 模块与业务解耦，复用全部现有接口和错误处理 |
| 限流 | **无每日限流**（用户自己的额度自己管）；前端生成中禁用按钮防重复提交 | 用户自带 Key 模式下服务端限流意义减弱 |
| 前端入口 | **ManageLayout 侧边栏**「AI 生成问卷」按钮（与「新建问卷」并列）→ Modal 输入需求 → 生成预览 →「创建并编辑」；未配置 AI 时点击引导去配置 | 所有 manage 页面可见；未配置用户有明确引导路径 |

### 交互流程设计

```
ManageLayout 侧边栏 [AI 生成问卷] 按钮
  → 已配置 AI？──否──→ 弹窗提醒"请先配置 AI 模型"，引导点击顶部昵称 → 昵称下拉菜单 →「AI 设置」
  → Modal：Textarea 输入需求（placeholder 给示例："食堂满意度调查，10 题以内"）
  → [生成] 按钮 loading（预计 10~30s）
  → 展示预览：标题、描述、题目数、每题 type + title 摘要
      ├─ [重新生成]：再次调用
      └─ [创建并编辑]：createQuestionService → updateQuestionService(title/desc/componentList)
                       → nav(`/question/edit/${id}`) → 编辑器内自动保存接管
```

## 三、技术可行性评估

| 风险点 | 等级 | 应对 |
|---|---|---|
| LLM 输出 JSON 不符合 schema（幻觉字段/类型错） | 中低 | zod 严格校验 + 自动重试 1 次 + 明确报错；7 种组件结构简单，JSON mode 下主流模型成功率 >95% |
| options value 非法（重复/缺失） | 中 | 后端规范化：强制重写 `value`，仅保留 `text` |
| 生成耗时长（10~30s）触发前端超时 | 中 | 为 AI 请求单独放宽超时至 60s；UI 用 Spin + 文案"正在生成，约需 10~30 秒" |
| 用户填错 Key / 额度用完 / baseUrl 不对 | 中 | 区分 LLM 返回的错误类型（401 无效Key / 402 余额不足 / 超时），透传为明确中文提示，引导去「AI 设置」修改 |
| apiKey 明文泄露 | 低 | 存库后所有回显接口打码；仅用户本人登录态可读写自己的配置 |
| 破坏现有功能 | 极低 | 纯新增模块 + 按钮与表单，无侵入式修改 |

总体结论：可行性高，无技术阻塞项。核心工作量在提示词工程、zod 校验层、用户配置链路。

## 四、开发计划（概览）

- 阶段 1：用户 AI 配置链路（后端 + 前端）——详见第五节
- 阶段 2：后端 AI 生成模块（question-server-nestjs）——详见第六节
- 阶段 3：前端 AI 生成入口（AskFlow）——详见第七节
- 阶段 4：联调验收——详见第八节

## 五、阶段 1：用户 AI 配置链路（详细设计）

### 开发进度记录

> 完成细节见对话说明（按开发契约第 5 条，不再回写文档），此处仅维护状态。

| 开发点 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| 1-1 User schema 加 aiConfig + PATCH /api/user/ai-config | ✅ 已完成 | 2026-08-31 | 附带修复 JWT 载荷泄露隐患；嵌套字段抽为 AiConfig 类 |
| 1-2 profile 接口扩展（返回打码 aiConfig + aiConfigured） | ⬜ 待开发 | — | 下一个开发点 |
| 1-3 前端：UserInfo 昵称下拉菜单 + AISettingsModal | ⬜ 待开发 | — | |

### 5.1 数据模型扩展

`User` schema 新增可选字段：

```ts
@Prop()
aiConfig: {
  apiKey: string   // 用户的 API Key
  baseUrl: string  // 如 https://api.deepseek.com/v1
  model: string    // 如 deepseek-chat
}
```

### 5.2 后端接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/user/ai-config` | `PATCH` | 保存/更新当前登录用户的 AI 配置（校验三项非空、baseUrl 为 https） |
| `/api/auth/profile`（已有） | `GET` | 扩展返回：`aiConfig: { apiKey: 'sk-***abc'（打码）, baseUrl, model }` 及 `aiConfigured: boolean`（是否已配置） |

> 登录/注册接口不涉及 AI 配置，保持不动。配置存于服务端用户文档，天然跨登录会话持久。

### 5.3 前端配置入口（仅一处）

**顶部栏用户信息区（[UserInfo.tsx](../src/components/UserInfo.tsx)）**：

- 将现有「昵称文本 + 独立退出按钮」改为**点击昵称弹出 Dropdown 下拉菜单**，菜单项：`AI 设置`、`退出登录`
- 「AI 设置」打开 `AISettingsModal`，表单含：
  - 供应商预设下拉：DeepSeek / 智谱 GLM / 通义千问 / Kimi / 自定义 —— 选择预设自动填充 baseUrl 和 model 默认值，选「自定义」则手填
  - API Key（Input.Password，默认显示打码值 `sk-***abc`，留空表示不修改）
  - baseUrl、model（预设自动带出，可改）
- 保存调 `PATCH /api/user/ai-config`，成功后更新 Redux `aiConfigured` 并提示"AI 配置已保存"

### 5.4 前端状态

- `aiConfigured` 存入 Redux userReducer（随 getUserInfoService 一起获取），侧边栏 AI 按钮与各入口据此判断是否引导配置

## 六、阶段 2：后端 AI 生成模块（详细设计）

### 6.1 依赖

- 安装：`openai`、`zod`
- 应用侧 `.env` **无需**新增 AI 相关配置（全部来自用户配置）

### 6.2 模块结构

```
src/ai/
├── ai.module.ts            # 注册到 app.module.ts
├── ai.controller.ts        # POST /api/ai/generate-question
├── ai.service.ts           # 读取用户配置、动态创建 client、提示词组装、调用、校验、规范化
└── schemas/
    └── generate-question.schema.ts  # zod schema
```

### 6.3 接口设计

```
POST /api/ai/generate-question
Headers: Authorization: Bearer <token>   （不加 @Public，走全局 AuthGuard）
Body:    { "prompt": "食堂满意度调查" }
前置检查: 用户 aiConfig 不存在 → 抛 400 "请先配置 AI 模型"
成功:    { errno: 0, data: { title, desc, componentList: [...] } }
失败:    { errno: 非0, message: "..."（含 Key 无效/余额不足等明确中文提示） }
```

### 6.4 zod schema 设计要点

校验 `componentList` 每项：

- `type` 必须是 7 种枚举之一
- 按类型区分 props 结构（discriminated union）：
  - `questionInfo`: `{ title, desc }`
  - `questionTitle`: `{ text, level(1-5), isCenter }`
  - `questionParagraph`: `{ text, isCenter }`
  - `questionInput` / `questionTextarea`: `{ title, placeholder }`
  - `questionRadio`: `{ title, isVertical, options: [{text}] }`
  - `questionCheckbox`: `{ title, isVertical, list: [{text}] }`
- 注意：schema 中 options 只要求 `text`，`value` 由后端规范化生成

### 6.5 提示词设计（核心）

system prompt 包含四部分：

1. **角色**：你是问卷设计专家，根据用户需求生成结构完整的问卷
2. **输出契约**：只输出 JSON，结构为 `{ title, desc, componentList }`，禁止任何解释性文字
3. **组件类型说明**：7 种组件各自的 type、用途、props 字段及类型、每种一个完整 JSON 示例
4. **设计规则**：
   - 第一个组件必须是 `questionInfo`（问卷标题+描述）
   - 可在开头/段落间插入 `questionTitle` / `questionParagraph` 作分组说明
   - 题目总数 5~10 题，以 radio/checkbox 为主，input/textarea 各 1~2 题收尾
   - 单选选项 2~6 个，多选选项 3~8 个
   - 不要生成 value 字段（系统自动生成）
   - 文案使用中文，贴合用户需求场景

### 6.6 AiService 处理流程

```
输入 prompt + 当前用户
  → 读取用户 aiConfig（无则抛 400 引导配置）
  → 动态创建 OpenAI client：new OpenAI({ apiKey, baseURL, timeout: 55s })
  → 组装 messages 调用（response_format: json_object, temperature 0.7）
  → LLM 调用异常 → 按错误类型映射中文提示（401 Key无效 / 402 余额不足 / 超时）
  → zod 校验
      ├─ 失败 → 带错误信息重试 1 次 → 仍失败 → 抛 HttpException(明确错误)
      └─ 成功 → 规范化：
            · 每个组件生成 fe_id = nanoid()
            · radio options / checkbox list 重写 value = item1..itemN
            · 剔除 isHidden/isLocked（默认 false）
  → 返回 { title, desc, componentList }
```

## 七、阶段 3：前端 AI 生成入口（详细设计）

### 7.1 文件清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/services/ai.ts` | 新建 | `generateQuestionService(prompt)`，60s 超时 |
| `src/services/user.ts` | 修改 | 新增 `updateAiConfigService(config)`；类型补充 aiConfig 字段 |
| `src/components/AISettingsModal.tsx` | 新建 | AI 设置弹窗（供应商预设 + apiKey 打码回显 + baseUrl/model） |
| `src/components/UserInfo.tsx` | 修改 | 昵称改为 Dropdown 菜单（AI 设置 / 退出登录） |
| `src/layouts/ManageLayout.tsx` | 修改 | 侧边栏加「AI 生成问卷」按钮；未配置时弹窗引导 |
| `src/pages/manage/AIGenerateModal.tsx` | 新建 | 输入 → 生成 → 预览 → 创建 全流程弹窗 |

### 7.2 未配置引导与 AIGenerateModal 状态机

**未配置引导**（ManageLayout 侧边栏按钮点击时判断 `aiConfigured`）：

```
点击 [AI 生成问卷]
  → aiConfigured === false → Modal.warning(
      "使用 AI 生成问卷需先配置 AI 模型（API Key），请点击右上角昵称 → AI 设置 完成配置")
  → aiConfigured === true → 打开 AIGenerateModal
```

**AIGenerateModal 状态机**：

```
idle（输入需求）
  → generating（loading，显示提示文案与耗时预估）
  → preview（展示预览：标题/描述/题目数/每题摘要）
      ├─ 重新生成 → generating
      └─ 创建并编辑 → creating（调 create + update）→ 成功关闭并跳转编辑页
任意阶段失败 → error（显示错误信息 + 重试/去设置按钮）
```

### 7.3 创建落库时序

```
createQuestionService()          // POST /api/question，拿 id
  → updateQuestionService(id, { title, desc, componentList })  // PATCH 写入 AI 内容
  → nav(`/question/edit/${id}`)
```

> 说明：分两步是复用现有接口、AI 模块不碰库的取舍。存在极小概率"创建了空问卷但 AI 内容写入失败"，此时跳到编辑器仍是可用状态（编辑器自动保存会兜底），可接受。

### 7.4 错误分支处理

- 401 未登录：跳转登录页
- 400 "请先配置 AI"：弹 AISettingsModal
- Key 无效 / 余额不足：提示具体原因 + [去设置] 按钮打开 AISettingsModal
- 生成失败（校验两次失败/网络超时）：显示错误 + [重试] 按钮
- 创建落库失败：message.error 提示，Modal 不关闭，保留预览数据可重试

## 八、阶段 4：联调验收（详细）

### 8.1 验收清单

**配置链路**
- [ ] 未配置时点击「AI 生成问卷」→ 弹窗提醒并引导至昵称下拉菜单
- [ ] 点击昵称弹出下拉菜单（AI 设置 / 退出登录），「AI 设置」可配置并保存
- [ ] apiKey 打码回显（sk-***abc），留空保存表示不修改，改完立即生效
- [ ] 退出后重新登录，上次配置保留，无需重填
- [ ] apiKey 在任何接口响应中不出现明文

**生成链路**
- [ ] 输入一句话需求，30s 内生成 5~10 题的合法问卷
- [ ] 生成的问卷在编辑器中可正常选中/修改/保存
- [ ] 发布后 C端（askflow-client）可正常填写提交
- [ ] 统计页对 AI 生成的选择题统计正确（重点：options value 规范化后的聚合）
- [ ] 填错 Key → 提示"Key 无效"并可跳转设置；额度用完 → 提示"余额不足"

**安全与回归**
- [ ] 未登录调用 AI 接口返回 401
- [ ] 「我的问卷」列表其他功能（搜索/分页/标星/删除）回归无异常
- [ ] 不配置 AI 的用户，其他所有功能不受影响

### 8.2 联调步骤

1. 注册 DeepSeek 或智谱账号，获取 API Key
2. 启动 NestJS + AskFlow（vite 代理指向 3005）
3. 未配置状态点击「AI 生成问卷」验证引导弹窗 → 昵称菜单完成配置
4. 侧边栏走完整流程：输入需求 → 预览 → 创建 → 编辑器检查每题可编辑
5. 发布 → askflow-client 填写 → 统计页核对图表
6. 改错 Key 验证错误提示；退出登录验证 401；重新登录验证配置保留

## 九、已决与待确认事项

- [x] 模型选择：用户自带 Key，应用零成本 —— **已确认**
- [x] 配置入口：仅顶部栏昵称下拉菜单（AI 设置），登录页不加配置项 —— **已确认**
- [x] 配置持久化：服务端存储，跨登录会话保留 —— **已确认**
- [x] 限流：取消每日限流 —— **已确认**
- [x] 入口位置：ManageLayout 侧边栏，未配置时弹窗引导 —— **已确认**
- [ ] 供应商预设列表（当前：DeepSeek / 智谱 GLM / 通义千问 / Kimi / 自定义）是否需要增删
