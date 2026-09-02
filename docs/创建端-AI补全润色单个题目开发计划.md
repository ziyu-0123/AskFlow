# 创建端：AI 补全 / 润色单个题目 — 开发计划

> 依据：[AI功能需求文档.md](./AI功能需求文档.md) 第 1 节功能点 2
> 状态：**方案设计已确认（详细设计完成），可进入开发**
> 前置依赖：功能点 1「AI 生成问卷」已完成（用户 AI 配置链路 + 后端 ai 模块 + 前端入口均已就绪）

## 〇、已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 应用方式 | **预览确认弹窗**：展示原内容 vs AI 建议，确认后才应用（应用后可撤销） |
| 支持组件范围 | **全部 7 种**：题目类 4 种补选项/润色题干，文本类 3 种润色文案 |
| 自定义优化指令 | **一期一键优化**（无指令输入）；接口预留 `instruction?` 可选参数，指令输入框作二期增强 |
| 优化上下文 | **一期只传当前组件**（不传整卷）；"结合整卷做一致性/去重优化"作二期按需加 |
| 入参校验 | 入参 component 同样过 zod schema（零成本防脏数据进提示词） |
| 图层标题同步 | 应用时若题干/文本有变化，同时 dispatch `changeComponentTitle`（保持画布与图层一致） |
| "请先配置"兜底 | 编辑页同样挂 AISettingsModal，生成失败时直接打开（与功能点 1 体验一致） |
| 预览弹窗"重新优化" | **一期不加**，弹窗职责单一（只做对比与决策）；取消后再点按钮重试 |
| 测试分工 | 错误分支（401/400/假 Key）AI 接口级测试；真实生成效果归用户功能测试（沿用功能点 1 模式） |

## 一、开发前分析（结合项目当前情况）

### 1.1 现有架构对该功能的支撑度：非常高

| 现有设施 | 复用方式 |
|---|---|
| 后端 `src/ai/` 模块（AiService） | 动态创建 client（按用户 aiConfig）、`mapLlmError` 错误映射、`parseJson` 容错解析全部复用；"调用→校验→失败反馈重试 1 次"循环抽为泛型方法后两功能共用 |
| `generate-question.schema.ts` 的 zod 组件 schema | 7 种组件 props 的 schema 已存在，抽为独立导出后：入参校验 + 输出校验 + 生成问卷三处共用 |
| 生成问卷的选项规范化逻辑（options/list 重写 `value=itemN`） | 抽成工具方法共用，保证统计聚合 key 合法（与功能点 1 同一条铁律） |
| 用户 aiConfig + `aiConfigured`（Redux） | 未配置引导复用：点按钮时判断，弹 Modal.warning 引导去「AI 设置」 |
| 前端 AISettingsModal | 编辑页同样挂载，Key 无效/未配置场景直接打开 |
| `changeComponentProps` / `changeComponentTitle` reducer + 自动保存 | AI 结果应用后走现有 redux 流程，**持久化与撤销/重做零改动**（redux-undo 自动覆盖） |
| TransformInterceptor / 全局 AuthGuard | 新接口不加 `@Public()` 即自动要求登录，响应格式统一 |
| 全局错误提示链路（ajax.ts 错误拦截器） | AI 错误（Key 无效/超时/校验失败）的中文提示已打通，前端无需额外处理 |

结论：与功能点 1 相同，**纯增量开发**——后端一个 service 方法 + 一个接口 + schema 重构抽取，前端一个按钮 + 一个预览弹窗。

### 1.2 与功能点 1 的差异点（本次设计的核心问题）

| 维度 | AI 生成问卷 | AI 补全/润色单题 |
|---|---|---|
| 输入 | 用户需求一句话 | **当前组件的 type + props**（结构化数据） |
| 输出 | 整份问卷（title/desc/componentList） | **单个组件的 props**（与输入同构） |
| 校验粒度 | 整个 componentList | 仅该类型的 props 分支（入参与输出双向校验） |
| 交互 | 独立弹窗、状态机 | **嵌入编辑器属性面板**，轻量按钮 + 预览确认 |
| 落库 | create + update 两步 | 不落库，`changeComponentProps` + `changeComponentTitle` 后自动保存接管 |

本质是同一个"LLM 结构化输出 → zod 校验 → 规范化 → redux"管道的**更小粒度复用**。

### 1.3 需求场景拆解（按 7 种组件）

| 组件 | 优化内容 | 示例 |
|---|---|---|
| questionRadio | 润色 title；补全/优化 options（2~6 个） | "你多久运动一次？" → 补"从不/偶尔/每周1-2次/每周3次+" |
| questionCheckbox | 润色 title；补全/优化 list（3~8 个） | 同上，多选版 |
| questionInput | 润色 title、placeholder | "你多久运动一次" → "您平均多久运动一次？" |
| questionTextarea | 润色 title、placeholder | 同上 |
| questionTitle | 润色 text | "关于吃的问题" → "第一部分：饮食习惯" |
| questionParagraph | 润色 text | 口语 → 书面说明 |
| questionInfo | 润色 title、desc | 问卷描述更专业 |

注意：radio/checkbox 的选项优化只让 AI 给 `text`，`value` 由后端规范化生成（AI 生成的 value 不可信）。

## 二、技术选型

| 决策点 | 选型 | 理由 |
|---|---|---|
| 接口设计 | `POST /api/ai/optimize-component`，纯生成不落库，body `{ component: { type, props }, instruction?: string }`，返回 `{ props }` | 与功能点 1 的"AI 模块不碰库"原则一致；`instruction` 为二期预留，一期前端不传 |
| SDK / client | 复用 openai SDK + 按用户配置动态创建（timeout 55s） | 已验证的模式 |
| 结构化输出 | system prompt 内嵌该类型的 props 契约 + `response_format: json_object` + zod 校验失败重试 1 次 | 与功能点 1 同一套稳定性策略；单组件输出比整卷更短，成功率更高 |
| 前端挂载点 | **[ComponentProp.tsx](../src/pages/question/Edit/ComponentProp.tsx) 面板顶部统一加"AI 优化"按钮**，不逐个改 7 个 PropComponent | 一处实现全部生效；需求文档说"PropComponent 里的小按钮"，但逐个侵入 7 个组件是重复代码，统一挂载是更优解（偏离需求文档表述，属实现层优化） |
| 应用方式 | 预览确认弹窗（OptimizePreviewModal）：原 props vs AI 建议 props 逐字段对比，有变化的行高亮 | 用户一眼看出 AI 改了什么再决策 |
| 流式输出 | 不用，一次性 JSON + 按钮 loading | 同功能点 1 结论：JSON 必须完整才能解析 |

### 交互流程设计

```
ComponentProp 面板顶部 [🤖 AI 优化] 按钮（isLocked || isHidden 时 disabled，与表单一致）
  → aiConfigured === false → Modal.warning 引导去「AI 设置」（文案同功能点 1）
  → aiConfigured === true → 按钮 loading（防重复点击）→ POST /api/ai/optimize-component
      ├─ 成功 → OptimizePreviewModal（props 快照 vs AI 建议逐字段对比）
      │     ├─ [应用] → changeComponentProps(fe_id, 新 props)
      │     │            + 题干/文本变化时 changeComponentTitle(fe_id, 新标题)
      │     │            → message.success('已应用，可撤销') → 自动保存接管
      │     └─ [取消] → 关闭，什么都不发生
      └─ 失败 → message.error 中文提示（拦截器统一弹出）
                  └─ 含"请先配置"（Redux 过期兜底）→ 同步 aiConfigured=false + 打开 AISettingsModal
```

## 三、技术可行性评估

| 风险点 | 等级 | 应对 |
|---|---|---|
| AI 改写后用户不满意 | 低 | 预览确认弹窗 + 应用后可撤销（redux-undo）双保险 |
| AI 输出的选项数量越界（如单选给 8 个） | 低 | zod 校验（radio 2~6 / checkbox 3~8）+ 失败重试 1 次；仍失败则明确报错，不静默截断 |
| AI 丢失用户已有内容（如优化 title 时丢掉 options） | 中 | 提示词明确"未被要求修改的字段原样返回"；zod schema 要求全量字段；前端 diff 预览时用户可直接发现 |
| AI 优化出与整卷其他题目重复的选项（无上下文） | 低 | 一期接受（单题润色场景影响小）；二期传整卷摘要时解决 |
| value 污染统计 key | 低 | 后端规范化重写 `value=itemN`（复用功能点 1 逻辑，抽工具方法） |
| 图层标题与画布不一致 | 低 | 应用时同步 `changeComponentTitle`（见决策表） |
| 生成耗时长（单组件预计 3~10s） | 低 | 比整卷生成短得多；按钮 loading 即可 |
| Key 无效/余额不足 | 低 | 错误映射链路已打通（"API Key 无效，请到「AI 设置」检查后重新保存"） |
| 破坏现有功能 | 极低 | 后端纯新增方法 + schema 抽取（不改行为）；前端 ComponentProp 只在外层加按钮区，不动内部表单 |

总体结论：可行性高于功能点 1（输出更小、管道全复用），无技术阻塞项。核心工作量在**提示词按 7 种类型分模板**与**预览弹窗的 diff 展示**。

## 四、开发计划（详细设计）

> 按开发契约小步拆分，每个开发点完成后系统可运行

### 开发进度记录

> 完成细节见对话说明（按开发契约第 5 条，不再回写文档），此处仅维护状态。

| 开发点 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| 2-1 后端：schema 抽取 + optimizeComponent + POST /api/ai/optimize-component | ✅ 已完成 | 2026-09-02 | 抽取 COMPONENT_CONTRACT / chatWithRetry / normalizeOptions；未建独立 schema 与 DTO 文件（内联更简） |
| 2-2 前端：AI 优化按钮 + OptimizePreviewModal + 未配置引导 | ✅ 已完成 | 2026-09-02 | 修复快照闭包漂移（快照在请求函数内确定）与撤销两步问题（props+title 合并单 action） |
| 2-3 联调验收 | ✅ 已完成 | 2026-09-02 | 用户真实 Key 验收通过（含快照/撤销/错误分支/回归） |

### 开发点 2-1：后端（question-server-nestjs）

**① schema 抽取重构**（`src/ai/schemas/generate-question.schema.ts`）

- 把 7 种组件的 props schema 从 `generateQuestionSchema` 内联结构中抽出为独立导出（如 `radioPropsSchema` 等 7 个）
- 新建 `componentSchema = z.discriminatedUnion('type', [...])`（`{ type, props }` 结构，7 分支）
- 三处共用：入参 component 校验 / 输出校验 / 生成问卷（原 componentList item 改为引用同一份 props schema）
- 新建 `optimize-component.schema.ts`：输出契约 `{ props }`（复用 `componentSchema` 抽出后的各类型 props schema，按入参 type 选取对应分支）

**② AiService 重构（三处抽取）**

| 抽取 | 内容 | 说明 |
|---|---|---|
| `COMPONENT_CONTRACT` | SYSTEM_PROMPT 中"【可用的 7 种组件类型】"整段抽为模块级常量 | 两个 prompt 共用同一份组件契约文案，单一事实来源——以后加组件类型只改一处 |
| `chatWithRetry<T>(client, model, messages, schema)`（泛型私有方法） | "调用 → parseJson → zod 校验 → 失败把错误反馈给模型重试 1 次"循环 | generateQuestion 与 optimizeComponent 同构流程，不抽则复制约 40 行 |
| `normalizeOptions`（private） | radio `options` / checkbox `list` 重写 `value=itemN`（checkbox 补 `checked: false`） | 生成问卷 normalize 与单题优化共用 |

**③ 新增 `optimizeComponent(username, component, instruction?)`**

```
流程：
  入参 component 过 componentSchema 校验（失败 400"组件数据不合法"）
  → aiConfig 前置检查（无则 400"请先配置 AI 模型…"，复用现有文案）
  → 动态创建 client（复用）
  → system prompt = 角色段（问卷题目优化专家）+ COMPONENT_CONTRACT + 单组件优化规则段
     规则要点：只输出 { "props": {...} }；未被要求修改的字段原样返回；
              选项只写 text 不写 value；保持原意只做润色/补全，不推翻重写；简体中文
  → user message = 当前组件 JSON（一期不传整卷上下文）+ instruction（二期）
  → chatWithRetry（校验 schema 为入参 type 对应的 props 分支）
  → normalizeOptions → 返回 { props }
```

**入参**：`{ component: { type, props }, instruction?: string }`
**返回**：`{ errno: 0, data: { props: {...} } }`；未配置 400；组件数据不合法 400；Key 无效 400；校验两次失败 503

**④ Controller + DTO**

- `optimize-component.dto.ts`：`{ component: { type: string, props: Record<string, unknown> }, instruction?: string }`（service 内 zod 精校验，与项目"无全局 ValidationPipe、service 校验"现状一致）
- `ai.controller.ts` 加 `POST optimize-component`（需登录，不加 `@Public()`）

### 开发点 2-2：前端（AskFlow）

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/services/ai.ts` | 修改 | `optimizeComponentService(component: { type, props })`，60s 超时；类型复用 `ComponentData` 的 type/props，无需新类型 |
| `src/pages/question/Edit/OptimizePreviewModal.tsx` | 新建 | 对比预览（见下） |
| `src/pages/question/Edit/ComponentProp.tsx` | 修改 | PropComponent 上方加"AI 优化"按钮（RobotOutlined）+ 未配置引导 + loading + 打开预览弹窗；**同时挂载 AISettingsModal**（未配置兜底直接打开）；应用时 dispatch props + title |
| `src/store/componentsReducer` | 不动 | 复用 `changeComponentProps` / `changeComponentTitle`（含撤销栈） |

**OptimizePreviewModal 详细设计**：

- 入参：`type`、`fe_id`、点击时刻的 props 快照（original）、AI 建议（suggested）
- 对比展示按 props 字段逐行：`字段名 | 原内容 | → | AI 建议`
  - **有变化的行高亮**（颜色/Tag 区分），无变化字段灰显——一眼看出 AI 改了什么
  - 文本字段：纯文本对比；radio/checkbox 选项：旧选项 Tags 列 vs 新选项 Tags 列（数量变化直观）；布尔字段（isVertical/isCenter）：显示"是/否"
- Footer：`[取消] [应用]`
- 快照语义：Modal 打开期间用户在编辑器改其他组件不受影响（绑定打开时的 fe_id 与 props 快照）；若改了同一组件再点应用，AI 版本覆盖（预览确认的语义，不额外处理）
- 应用后：`message.success('已应用，可撤销')` 并关闭；题干/文本变化时同步 `changeComponentTitle`（题目类取 `props.title`，文本类取 `props.text`）

### 开发点 2-3：联调验收

**AI 接口级测试清单**：

1. 未登录 401；未配置 400；component 非法（缺 type / options 为空数组）400"组件数据不合法"
2. 假 Key → 400"API Key 无效"（错误映射链路）
3. 真实生成效果（各类型契约校验 + 内容质量）归入用户功能测试（沿用功能点 1 分工模式）

**用户功能测试清单**（真实 Key）：

1. 7 种组件逐个体验优化：按钮出现位置/禁用态、生成 loading、预览对比高亮是否清晰
2. radio/checkbox：选项补全效果、数量变化直观可见；应用后选项 value 为 itemN 格式
3. 应用后：画布立即生效、图层面板标题同步更新、自动保存触发、Ctrl+Z 可撤销
4. 错误分支：假 Key → 中文提示；未配置账号（或删 aiConfig 后）点击 → 引导/自动打开 AI 设置
5. 回归：属性面板手工编辑、隐藏/锁定时按钮禁用、C 端填写与统计页图表正常

## 五、验收标准

1. 7 种组件的属性面板均有"AI 优化"入口，隐藏/锁定组件禁用
2. 未配置用户点击有明确引导（含 Redux 过期兜底直接打开 AI 设置）；Key 无效有明确中文提示
3. 预览弹窗能清晰看出"原 vs AI 建议"的差异（变化行高亮）；应用后编辑器立即生效、图层标题同步、自动保存、可撤销
4. radio/checkbox 优化后 options 的 value 均为 `itemN` 格式，统计页图表正常
5. 对现有功能零回归（重点：属性面板手工编辑、自动保存、撤销/重做）
