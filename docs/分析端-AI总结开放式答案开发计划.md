# 分析端：AI 总结开放式答案 — 开发计划

> 依据：[AI功能需求文档.md](./AI功能需求文档.md) 第 3 节功能点 7
> 状态：**已完成（2026-09-02，4-1~4-3 全部交付）**
> 前置依赖：功能点 1/2/3 已完成（AiService 基础设施、用户自带 Key、未配置引导链路均已就绪）

## 〇、已确认的关键决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 数据流 | **后端聚合**：前端只传 questionId + componentId，后端自己拉答卷 | 数据不出后端、前端零改造传参、答案量大时截断策略后端可控 |
| 输出结构 | 一次调用同时产出「聚类 + 情感」 | 拆两次调用成本翻倍且聚类与情感高度相关，无必要 |
| 调用方式 | 同步 + 60s 超时（与功能点 1/2/3 一致） | 总结输出短（几百字），无需流式；SSE 留给功能点 4 对话式问卷 |
| 结果存储 | **不落库**，每次现算 | 答卷实时增加，落库即过期；用户自带 Key，成本由用户承担，平台无需缓存省钱 |
| 聚类条数/占比 | 由模型输出，前端标注「AI 估算」 | 模型自定义聚类维度，后端无法确定性计数；标注估算管理预期（详见取舍点） |

## 一、需求分析与项目现状

### 需求（功能点 7）

针对开放式问题（`questionInput` / `questionTextarea`）的文本答案，目前只能人工逐条看，需要 AI 提供：

1. **批量聚类**：把 N 条自由回答归纳成「主要意见 K 类 + 占比」
2. **情感分析**：正面 / 负面 / 中性分布

### 项目现状（已核实）

| 环节 | 现状 | 结论 |
|---|---|---|
| 统计页布局 | 三栏：左 ComponentList（组件列表，点击选中）/ 中 PageStat（答卷表格，开放式答案原样展示）/ 右 ChartStat | 「选中组件 → 右栏出内容」的交互已存在，AI 总结入口可自然挂进 ChartStat |
| ChartStat 现状 | 仅 radio/checkbox 有 StatComponent；选中 input/textarea 显示「该组件无统计图表」 | 该空态位置正是本功能的落点 |
| 答卷数据 | `answer` 集合：`{ questionId, answerList: [{ componentId, value }] }`，开放式 value 为用户输入原文 | 提取逻辑简单：按 questionId + componentId 过滤 |
| 后端模块依赖 | `AnswerModule` 已 `exports: [AnswerService]`（stat 模块已在用）；`AiModule` 当前仅 imports UserModule | AiModule 补 imports QuestionModule + AnswerModule 即可，无循环依赖 |
| AI 基础设施 | `chatWithRetry`（含 JSON 解析 + zod 校验 + 一次反馈重试）、`requireAiConfig`（未配置 400 引导）、`mapLlmError`（Key 无效/超时等中文映射）、`createClient`（55s 超时）全部现成 | 本功能纯增量业务逻辑，零基建 |
| 前端链路 | `aiConfigured`（Redux）+ Modal.warning 引导 + AISettingsModal 兜底 + axios 拦截器统一错误提示 | 照搬功能点 2/3 的引导与兜底模式 |

## 二、技术选型

| 事项 | 方案 | 备选与否决理由 |
|---|---|---|
| 接口设计 | `POST /api/ai/summarize-answers`，Body `{ questionId, componentId }`，需登录 + 作者校验 | ❌ 前端传答案数组：分页拿不全、传输体大、答案可被篡改 |
| 输出契约 | zod schema（复用 `chatWithRetry` 的 schema 参数） | ❌ 纯文本输出：前端无法结构化渲染占比/分布 |
| 答案预处理 | 过滤空值 → **完全相同答案合并计数**（灌水/复制场景显著省 token）→ 每条截断 200 字 → 最多取最新 200 条（去重后） | 不预处理的极限场景：数千条长文本直接超模型上下文 |
| 前端交互 | ChartStat 内选中开放式问题时显示「AI 总结」卡片：按钮 → loading → 结果（总结语 + 聚类列表带占比条 + 情感三色分布） | ❌ PageStat 表头入口：与「选中组件看图表」心智不符 |

### 输出契约（zod）

```
{
  summary: string                    // 一段话总体结论
  totalCount: number                 // 实际参与分析的有效答案条数（后端可复核提示模型）
  themes: Array<{                    // 3~6 类
    label: string                    // 意见类别名
    count: number                    // 该类条数（模型估算）
    description: string              // 该类意见概述 + 典型原话摘录
  }>
  sentiment: { positive: number, negative: number, neutral: number }  // 各情感条数
}
```

## 三、技术可行性评估

**结论：可行性高，纯增量开发，无基建改动。**

1. **技术栈零新增**：OpenAI SDK + zod + chatWithRetry + antd 全部现成，风险集中在提示词与输出稳定性，而 `chatWithRetry` 的「校验失败反馈重试」机制已在前三个功能点验证有效
2. **token 上限核算**：200 条 × 200 字 ≈ 4 万汉字 ≈ 6 万 input token，主流模型（DeepSeek/GLM/GPT，128k 上下文）安全余量充足；输出仅几百 token
3. **鉴权完整**：stat 页面本身仅作者可达，接口层再做 `question.author === 当前用户` 校验（复用 PUT translations 的 403 模式），防接口越权
4. **成本**：单次几万 input token，用户自带 Key 自担，与现有三个 AI 功能一致

### 已识别取舍点（用户已确认，2026-09-02）

| 取舍点 | 已确认方案 |
|---|---|
| 聚类 count/情感条数由模型估算（可能与人工逐条统计有出入） | **接受**，前端标注「AI 估算」 |
| 答案上限 200 条（超出取最新） | **接受**，结果页展示「基于 N 条分析」 |

## 四、开发计划

### 开发点拆分

| 开发点 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| 4-1 后端：summarizeAnswersSchema + AiService.summarizeAnswers + POST /api/ai/summarize-answers | ✅ 已完成 | 2026-09-02 | 含 author 校验、答案提取与预处理（去重/截断/限量）；接口级测试 9/9 通过（校验链各分支 + 假 Key 链路验证），真实 Key 归 4-3 |
| 4-2 前端：services/ai.ts + ChartStat 开放式问题 AI 总结卡片 | ✅ 已完成 | 2026-09-02 | 含未配置引导、loading、结果渲染（占比条 + 情感分布）；卡片抽为独立组件 Stat/AiSummaryCard.tsx，ChartStat 仅加分支 |
| 4-3 联调验收 | ✅ 已完成 | 2026-09-02 | 接口级测试已随 4-1 完成（9/9）；用户真实 Key 功能测试 5/5 通过（卡片渲染/生成/重新总结/切组件重置/回归/未配置引导） |

### 开发点 4-1：后端 AI 接口（question-server-nestjs）

#### 4-1-1 答案提取与预处理管道（顺序固定）

```
answerService.findAll(questionId, { page: 1, pageSize: total })
  → 只取 answerList 中 componentId 匹配的项
  → ① trim 后过滤空串
  → ② 相同文本合并计数 → [{ text, repeat }]（repeat ≥ 1）
  → ③ 按最后出现时间倒序，取前 200 条（去重后）
  → ④ 每条 text 截断至 200 字
```

- **两个计数**：`totalCount` = 有效答案总条数（**含重复**，= 各 repeat 之和，与 PageStat 表格行数一致）；去重条数只是上下文压缩手段，不暴露给契约
- repeat 显式写进提示词（如 `"文本xxx"（出现 3 次）`），让模型聚类计数时把重复权重算进去
- `findAll` 的 `pageSize: total` 模式与 stat.service 现有用法完全一致

#### 4-1-2 校验链（顺序即优先级）

```
未登录 → 401（全局守卫）
questionId/componentId 空 → 400
问卷不存在 → 404
非作者 → 403（复用 translations 的「无权操作该问卷」）
组件不存在 → 400「组件不存在」
type 非 input/textarea → 400「该题目不是开放式问题」
有效答案 0 条 → 400「该题目暂无有效答案」（省一次 LLM 调用）
未配置 AI → 400「请先配置…」（requireAiConfig 现成）
```

#### 4-1-3 提示词设计（本开发点核心）

**System prompt** 要点：

- 角色：问卷数据分析助手
- 任务：对给定开放式答案做意见聚类 + 情感分析
- 输出严格 JSON 契约（schema 描述原样内嵌）
- 规则：themes 3~6 类、各 count 之和 ≈ totalCount、sentiment 三项之和 ≈ totalCount、description 中摘录 1~2 条典型原话、全部用中文
- 无意义答案（灌水/纯符号）→ 允许输出一个「无有效观点」类正常展示（用户已确认）

**User prompt**：题目 title + totalCount + 答案列表（带 repeat 计数）

#### 4-1-4 schema 与接口

1. `generate-question.schema.ts` 导出 `summarizeAnswersSchema`：themes 数组 `min(1).max(8)`（模型偶尔输出 2 类也放行，比硬卡 3~6 稳）；sentiment 三项 `nonnegative int`——**不做总和校验**（估算值卡死反而触发重试浪费）
2. `ai.module.ts`：imports 补 `QuestionModule`、`AnswerModule`
3. `AiService.summarizeAnswers(username, questionId, componentId)`：按校验链 + 预处理管道 + 提示词组织，`chatWithRetry(client, model, messages, summarizeAnswersSchema)` 返回
4. `ai.controller.ts` 加 `POST summarize-answers`（需登录，`@Req` 取用户，author 校验在 service 层），附接口文档注释

### 开发点 4-2：前端统计页（AskFlow）

#### 4-2-1 ChartStat 改造（唯一侵入文件）

```
selectedComponentType ∈ {questionInput, questionTextarea}
  → 渲染「AI 总结」卡片：
     [标题「AI 总结开放式答案」+ 说明文案 + 生成按钮]
     → loading（Spin + 预计耗时提示，与 AITranslateModal 文案风格一致）
     → 结果态
  否则 → 现有逻辑不变（radio/checkbox 图表 / 无统计图表）
```

#### 4-2-2 结果态布局（antd 现有组件，零新依赖）

1. **总结语**：`Typography.Paragraph` 展示 summary
2. **意见聚类**：每类一行 = label + count 条数 + 占比百分比 + description；占比条用 div 宽度百分比（复用现有简单样式风格，不引图表库）
3. **情感分布**：三色堆叠横条（绿正/红负/灰中性）+ 三项数值（用户已确认）
4. 尾部标注：「基于 N 条答案 · AI 估算，可能与逐条统计有出入」
5. **「重新总结」按钮**：数据随时在涨，结果态保留刷新入口（用户已确认）

#### 4-2-3 状态管理与引导兜底

- **状态管理**：`useRequest` + 组件内 state；切换选中组件时清空结果回初始态，**不缓存**上次结果（用户已确认，实现最简且结果最新鲜）
- **未配置引导**：`aiConfigured === false` 点击时 `Modal.warning` 引导到 AI 设置（照搬 EditHeader 模式）；接口报「请先配置」时同步 Redux + 直开 AISettingsModal（照搬 AITranslateModal 模式）
- **错误提示**：axios 拦截器统一弹出

| 文件 | 动作 | 说明 |
|---|---|---|
| `src/services/ai.ts` | 修改 | 新增 `summarizeAnswersService(questionId, componentId)`（60s 超时）及返回类型 |
| `src/pages/question/Stat/ChartStat.tsx` | 修改 | 按上述设计实现 AI 总结卡片 |

**不改**：PageStat、ComponentList、Stat/index、StatComponent 体系（不侵入现有组件配置注册表）。

### 开发点 4-3：联调验收

**AI 接口级测试清单**（AI 负责）：

1. 未登录 401；未配置 400；questionId 不存在 404；非作者 403
2. componentId 不存在 / 非开放式组件 400；有效答案 0 条 400
3. 正常路径：造含 input/textarea 答案的数据 → 返回结构通过 zod（themes 1~8 条、sentiment 三项和合理）

**用户功能测试清单**（真实 Key）：

1. 统计页选中单行输入/多行输入题 → 右栏出现「AI 总结」卡片 → 点击 → 数秒后展示总结/聚类/情感
2. 未配置时点击 → 弹引导；空答案题点击 → 明确报错提示
3. 切换选中其他组件 → 卡片内容正确切换/清空
4. 回归：radio/checkbox 图表统计、答卷表格、编辑页、发布不受影响

## 五、验收标准

1. 统计页选中开放式问题可一键生成 AI 总结：总体结论 + 意见聚类（3~6 类，含估算条数与占比）+ 情感三分布
2. 大答案量（含重复灌水）不超时不出错：去重/截断/限量策略生效，结果标注「基于 N 条分析，AI 估算」
3. 鉴权完备：仅作者可调用；未登录/未配置/非法入参返回明确错误
4. 现有统计功能零回归
