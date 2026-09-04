# AskFlow — AI 驱动的问卷与访谈平台

AskFlow 是一个全栈的问卷/访谈平台，覆盖问卷的**创建、发布、填写、统计**全流程，并深度集成 LLM，提供问卷生成、题目润色、多语言翻译、答案总结、分析报告、AI 对话式访谈等能力。

## ✨ 功能特性

### 问卷管理端（本项目）

- 拖拽式问卷编辑器（标题 / 段落 / 单选 / 多选 / 填空等 7 种组件）
- 问卷发布、分享（链接 + 二维码）、标星、回收站
- 数据统计（单选/多选图表 + 答卷表格 + 分页）

### AI 能力

- 自然语言生成问卷（结构化输出，直接进编辑器）
- 题目补全 / 润色
- 多语言翻译
- 开放题意见聚类 + 情感分析
- 整卷分析报告（总体结论 + 逐题洞察 + 改进建议）
- AI 对话式访谈（SSE 流式，逐字打字机效果）

## 🛠 技术栈

| 模块 | 技术 |
|---|---|
| 管理端（本项目） | React 19 + TypeScript + Vite + Redux Toolkit + antd + dnd-kit + recharts |
| C 端 | Next.js 16 + React 19（SSE 流式聊天） |
| 后端 | NestJS 12 + MongoDB + Mongoose + JWT + zod |
| AI | OpenAI SDK（DeepSeek / 通义 / GLM 兼容）+ SSE + JSON 结构化输出 |

## 📁 项目结构

AskFlow 由 4 个服务组成：

- `AskFlow`（本项目）：管理端 + 分析端
- `askflow-client`：C 端填写端
- `question-server-nestjs`：后端服务
- `askflow-mock`：早期 mock 服务（已废弃）

## 🚀 快速启动

### 管理端（本项目）

```bash
npm install
npm run dev   # http://localhost:5173
```

### 后端

```bash
cd question-server-nestjs
npm install
cp .env.example .env   # 配置 MongoDB / JWT_SECRET / CORS_ORIGINS
npm run start:dev      # http://localhost:3005
# 或使用 Docker 一键启动后端 + MongoDB：
docker compose up
```

### C 端

```bash
cd askflow-client
npm install
npm run dev   # http://localhost:3000
```

## 📊 架构亮点

- **无状态单轮流式访谈**：SSE + 每轮全量发送 history，易扩展、断点易续、失败易重试
- **流式中断治理**：前端 `AbortController` + 后端 `res.on('close')`，客户端断开即中止上游 LLM
- **token 计量**：流式 `include_usage` + 前端累积 + 提交答卷持久化，统计端可见成本
- **结构化输出管道**：JSON mode + zod 校验 + 失败自动重试，保证模型输出符合前端 schema
- **BYOK 成本控制**：用户自带 API Key + 轮次上限，分摊成本、防滥用
- **prompt 注入防护**：system 声明忽略受访者诱导输出 `[[END]]`

## 🔗 在线 Demo

> 待部署后补充（Vercel / Render / Railway + MongoDB Atlas）。

## 📚 文档

- [简历竞争力优化建议](./docs/简历竞争力优化建议.md)
- 各阶段执行计划见 `docs/` 目录
