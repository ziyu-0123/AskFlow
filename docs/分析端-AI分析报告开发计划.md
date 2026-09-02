# 分析端：AI 分析报告 — 开发计划

> 依据：[AI功能需求文档.md](./AI功能需求文档.md) 第 3 节功能点 8
> 状态：**方案设计已确认（取舍点已按推荐方案确认），可进入开发**
> 前置依赖：功能点 1/2/3/7 已完成（AiService 基础设施、用户自带 Key、未配置引导链路、开放题答案预处理管道均已就绪）

## 一、需求解读

统计页加「AI 解读报告」按钮：把整卷统计数据喂给模型，生成**总体结论 + 每题洞察 + 改进建议**（需求原文"一段结论文案 + 改进建议，甚至自动配图表描述"）。

与功能点 7 的边界：功能点 7 是**组件级**（右栏，单题开放式答案的聚类/情感），本功能是**整卷级**（全问卷综合解读），入口在统计页头部。

## 二、现状分析（结合项目当前情况）

| 现状 | 对本功能的影响 |
|---|---|
| `StatService.getComponentStat` 已有**确定性**选项计数（radio/checkbox → `{name, count}[]`） | 报告的骨干数据免费可得，但该逻辑在 StatService 内部、按题查询；报告需一次取全卷，须在 AiService 内重新聚合（遍历全部答案一次即可，逻辑简单） |
| 功能点 7 的开放题预处理管道（trim → 合并计数 → 截断 → 限量）已存在于 `AiService.summarizeAnswers` 内部（内联） | 本功能对**每道**开放题都要做同样预处理，应抽为私有方法复用，避免复制粘贴 |
| `AiModule` 已导入 `QuestionModule`、`AnswerModule`（4-1 已加） | 无需再动 module |
| StatHeader 右侧现有「编辑问卷」按钮；统计页三栏已满 | 报告是整卷级功能，入口放 StatHeader（不占三栏空间），展示用 Modal |
| 统计页未做三栏滚动改造（用户已撤回） | 不影响本功能；报告在 Modal 中展示，无高度问题 |

## 三、技术选型（关键决策）

| 决策点 | 方案 | 理由 |
|---|---|---|
| 数据聚合位置 | **后端聚合**（前端只传 questionId） | 与功能点 7 一致：数据不出后端、防篡改、token 截断策略可控 |
| 报告数据输入 | **选择题确定性计数 + 开放题预处理后答案，一次调用** | 备选"先调 summarizeAnswers 再喂报告"需两次 LLM 调用、成本翻倍；只喂选择题则丢失开放题洞察。一次调用让模型同时看到定量分布与定性原声，报告质量最高 |
| 输出形态 | 结构化 JSON（zod 校验），非纯文本 | 前端可分区渲染（结论/洞察/建议），且与既有 4 个 AI 接口模式完全一致 |
| 展示形式 | StatHeader 按钮 + Modal（宽 720） | 整卷级入口放头部（同"编辑问卷"并列）；报告内容较长，Modal 内滚动即可 |
| 结果落库 | **不落库** | 与功能点 7 一致：答卷实时增加，落库即过期；自带 Key 自担成本 |
| 调用方式 | 同步 + 60s 超时（前端 axios） | 与生成问卷/翻译一致；SSE 流式留给功能点 9（交叉分析问答）再评估 |

## 四、技术可行性评估

**结论：高。** 纯增量开发，零基建改动：

- `chatWithRetry` / zod schema / `requireAiConfig` / `mapLlmError` / 错误提示拦截器全部现成
- 校验链（作者 403 等）照搬 `summarizeAnswers`，只是组件级校验换成整卷级（无"组件不存在/非开放式"分支）
- 前端引导兜底（未配置 Modal.warning / "请先配置"直开设置）照搬 AiSummaryCard 模式

**Token 估算**：选择题计数极省（每题约 100 token）；开放题是大头——每题去重后限量 100 条 × 200 字 ≈ 每题 2~3 万 token，3 道开放题约 8 万 input token，主流模型 128k 上下文内安全。超出风险主要来自"很多道开放题 + 答案很长"的组合，靠每题限量兜底。

## 五、接口契约

### POST /api/ai/analyze-report（需登录，仅问卷作者）

入参：

```json
{ "questionId": "..." }
```

出参（errno: 0, data）：

```json
{
  "overview": "总体结论（150 字以内：答卷规模、总体倾向、最突出的问题）",
  "insights": [
    {
      "question": "题干（选择题或开放题）",
      "finding": "该题的核心发现（数据 + 解读）",
      "chartDesc": "一句话图表描述（如何呈现该题数据，如'建议用饼图展示三项占比'）"
    }
  ],
  "suggestions": ["改进建议 1（具体可操作）", "改进建议 2"]
}
```

错误分支：400 未配置 AI / 参数不合法 / 暂无答卷；403 非作者；404 问卷不存在。

### zod schema（reportSchema）

- `insights`：`min(1).max(20)`（题目数上限自然约束）
- `suggestions`：`min(0).max(10)`（允许无建议——答卷太少时）

## 六、后端数据聚合管道

```
问卷存在 + 作者校验 + 答卷数 > 0
  → answerService.findAll(questionId, { page: 1, pageSize: total }) 一次拉全量
  → 遍历全部 answerList 一次，按 fe_id 分桶：
      radio/checkbox → 每题选项计数（确定性，value→text 映射后给模型文案）
      input/textarea → 复用功能点 7 预处理（trim → 合并计数 → 每题限量 100 条 → 截 200 字）
  → 提示词 = 问卷标题 + 答卷总数 + 每题数据（选择题给计数，开放题给带重复标注的答案列表）
  → chatWithRetry(client, model, messages, reportSchema)
```

注：功能点 7 内联的预处理逻辑抽为 `AiService` 私有方法 `_collectOpenTextAnswers(answers, componentId)` 供两处共用（最小重构，行为不变）。

## 七、开发点拆分

| 开发点 | 状态 | 完成时间 | 备注 |
|---|---|---|---|
| 5-1 后端：reportSchema + AiService.analyzeReport + POST /api/ai/analyze-report | ⬜ 待开发 | — | 含全卷数据聚合、开放题预处理管道抽取复用 |
| 5-2 前端：services/ai.ts + StatHeader 按钮 + AIReportModal | ⬜ 待开发 | — | 含未配置引导、loading、报告分区渲染 |
| 5-3 联调验收 | ⬜ 待开发 | — | 用户真实 Key 验收 |

### 开发点 5-1：后端（question-server-nestjs）

#### 5-1-1 预处理管道抽取（唯一重构点）

`summarizeAnswers` 内联的合并计数逻辑抽为私有方法，签名固定：

```
_collectOpenTextAnswers(answers, componentId, limit = 200)
  → { items: { text, repeat }[], totalCount: number }
```

- 行为与现在**完全一致**：trim 过滤空串 → Map 合并计数（order 记最新）→ 按 order 倒序取 limit 条 → 每条截 200 字；`totalCount` 含重复
- `summarizeAnswers` 改为调用它（limit=200），`analyzeReport` 用它处理每道开放题（limit=100）
- `analyzeReport` 里**每题调用一次**，从同一次 `findAll` 拉取的全量答卷里过滤（拉库一次、内存过滤 N 次，省 N-1 次查询）

#### 5-1-2 校验链（顺序即优先级，比功能点 7 少"组件"两分支）

```
未登录 → 401（全局守卫）
questionId 空 → 400 参数不合法
问卷不存在 → 404
非作者 → 403
答卷总数 0 → 400「暂无答卷」（整卷口径，不分题）
未配置 AI → 400 请先配置（requireAiConfig 现成）
```

#### 5-1-3 全卷数据组织（提示词输入结构）

按 componentList 顺序遍历**可见且非隐藏**组件（isHidden 不进报告，口径与统计页一致），每题生成一段：

```
【第 1 题】（单选）您对食堂饭菜的总体满意度是？——共 50 份答卷
  非常满意: 20（40%）| 满意: 15（30%）| 不满意: 15（30%）
【第 2 题】（多行输入）其他意见或建议——有效答案 12 条
  1. "希望增加麻辣烫"（出现 3 次）
  2. "太咸了"（出现 2 次）
  ...
```

- 选择题计数：`value → text` 映射后按 text 计数（AiService 内 3 行实现，不跨模块调用）；**跳过计数为 0 的选项**（未被人选过的选项给模型只是噪音）
- 开放题：调 `_collectOpenTextAnswers(answers, fe_id, 100)`；totalCount>0 但 items 为空（全是空串）时标注"有效答案 0 条"
- questionTitle / questionParagraph / questionInfo 等结构组件**跳过**（无统计数据）
- 问卷标题 + desc 进提示词（约 50 token，让模型措辞贴合问卷主题）

#### 5-1-4 提示词与 schema

**System prompt** 要点：角色"问卷数据分析专家"；任务"综合全卷统计数据生成解读报告"；输出 JSON 契约内嵌；规则——

- overview 150 字内点出规模 + 总体倾向 + 最突出问题
- insights **每道有数据的题一条**，finding 必须引用具体数字（如"60% 表示不满意"）
- chartDesc 一句话图表建议；suggestions 2~4 条具体可操作（针对最突出的问题）
- 纯中文、不发明数据

**reportSchema**：如第五节契约（insights 1~20、suggestions 0~10）。

#### 5-1-5 落地文件清单

1. `generate-question.schema.ts` 导出 `reportSchema` + `ReportResult` 类型
2. `AiService`：抽 `_collectOpenTextAnswers`（重构 `summarizeAnswers` 共用，行为不变）；新增 `analyzeReport(username, questionId)`
3. `ai.controller.ts` 加 `POST analyze-report`，附接口文档注释

### 开发点 5-2：前端（AskFlow）

#### 5-2-1 AIReportModal（新建，模式照搬 AITranslateModal）

状态机 `idle → loading → report`：

- **idle**：说明文案（"基于全部答卷生成整卷解读报告，含每题洞察与改进建议，约需 10~30 秒"）+ [生成报告] 按钮
- **loading**：Spin + 预计耗时提示
- **report**：分区渲染——
  - 总体结论：Paragraph + 左侧蓝色竖线强调样式
  - 每题洞察：每条一张小卡片（题干加粗 + finding + chartDesc 灰字小号前缀"图表建议："）
  - 改进建议：有序列表（原生 ol）
  - 尾部 [重新生成] 按钮（数据会涨，同 AiSummaryCard 决策）
- 关闭 Modal 重置回 idle（不缓存，下次打开重新生成）

#### 5-2-2 StatHeader 改造（唯一侵入文件）

右侧 `<Space>` 内「编辑问卷」旁加 [AI 解读报告] 按钮（FileTextOutlined 图标）；点击时 `aiConfigured === false` → Modal.warning 引导（照搬 EditHeader），否则开 Modal。

#### 5-2-3 services/ai.ts 与错误兜底

- `analyzeReportService(questionId)`（60s 超时）+ `ReportResult` 类型
- 引导兜底照搬 AiSummaryCard：接口报"请先配置" → dispatch 同步 Redux + 直开 AISettingsModal；其余错误拦截器统一弹提示，回 idle 便于重试

### 开发点 5-3：联调验收

接口级测试（错误分支 + 链路验证，AI 负责）+ 用户真实 Key 功能测试（报告生成、分区渲染、重新生成、引导、回归）。

## 八、已确认取舍点（用户已确认，2026-09-02）

| 取舍点 | 已确认方案 |
|---|---|
| 开放题原始答案进报告输入 | **进**（每题限量 100 条去重后）——报告能引用答卷人原声，质量显著提升 |
| insights 含 chartDesc（图表描述）字段 | **含**——需求原文"自动配图表描述"，成本低 |
| 展示形式 | **Modal（720 宽）** |
| 结果落库 | **不落**（每次重新生成，与功能点 7 一致） |
| 隐藏组件（isHidden）数据是否进报告 | **不进**——口径与统计页（表格/左侧预览过滤 isHidden）一致 |
| 答卷为 0 时的交互 | **点击后 400 报"暂无答卷"**——不动统计页状态结构，报错路径 1 行且信息明确 |
| 问卷标题/描述是否进提示词 | **进**（约 50 token）——模型措辞贴合问卷主题 |

> 状态：**方案设计已确认（取舍点与详细设计均已确认），可进入开发 5-1**
