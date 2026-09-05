# 10 · 自定义 Hooks

目录：[src/hooks/](../../src/hooks/)。分为三组：store 读取、鉴权、数据加载，外加一个快捷键绑定。

## 1. store 读取组

### useGetUserInfo（[useGetUserInfo.ts](../../src/hooks/useGetUserInfo.ts)）

```ts
const { username, nickname, aiConfigured } = useGetUserInfo()
```

读 `state.user` 的快捷方式。`aiConfigured` 是所有 AI 入口的开关。

### useGetComponentInfo（[useGetComponentInfo.ts](../../src/hooks/useGetComponentInfo.ts)）

```ts
const { componentList, selectedId, selectedComponent, copiedComponent } = useGetComponentInfo()
```

读 **`state.components.present`**（redux-undo 包装后的当前态），并派生 `selectedComponent`（列表 find）。编辑器与统计页的核心读取 Hook。

### useGetPageInfo（[useGetPageInfo.ts](../../src/hooks/useGetPageInfo.ts)）

```ts
const pageInfo = useGetPageInfo()   // { title, desc, js, css, isPublished, type }
```

## 2. 鉴权组（成对使用，挂在两个顶层 Layout 中）

### useLoadUserData（[useLoadUserData.ts](../../src/hooks/useLoadUserData.ts)）

* 返回 `{ waitingUserData: boolean }`；

* 逻辑：Redux 已有 username → 不再请求；否则 `GET /api/user/info` 探活，成功 dispatch `loginReducer`；无论成败 `onFinally` 置 `waitingUserData = false`；

* 未登录时该请求会失败，但拦截器对"未登录/Token 无效"静默，不会弹错误 toast。

### useNavPage（[useNavPage.ts](../../src/hooks/useNavPage.ts)）

* 入参 `waitingUserData`；等待结束后按 [04-路由与页面](./04-路由与页面.md) 中的重定向表执行 `nav()`；

* 依赖 `[waitingUserData, username, pathname]`，路径或登录态变化时重新决策。

## 3. 数据加载组

### useLoadQuestionData（[useLoadQuestionData.ts](../../src/hooks/useLoadQuestionData.ts)）★ 最核心

编辑页 / 统计页共用。职责：**URL id → 请求 → Redux**。

```
useParams().id 变化 → run(id) → getQuestionService(id)
  → data 到达后：
      componentList 逐项映射为 ComponentInfoType（保留 isHidden/isLocked！）
      selectedId 默认取第一个组件
      dispatch(resetComponents({ componentList, selectedId, copiedComponent: null }))
      dispatch(resetPageInfo({ title, desc, js:'', css:'', isPublished, type }))
```

细节：

* 保留 `isHidden/isLocked` 的注释值得注意：丢失会导致 ① 隐藏状态在统计页失效；② 编辑页自动保存时把 `undefined` 写回 DB，覆盖已保存的隐藏/锁定状态；

* 返回 `{ loading }` 供页面渲染 Spin；

* `useRequest` 为 `manual: true`，由 `useEffect([id])` 手动触发；

* 仓库中存在 `useLoadQuestionData.ts.bak`（旧版备份，未参与构建）。

### useLoadQuestionListData（[useLoadQuestionListData.ts](../../src/hooks/useLoadQuestionListData.ts)）

列表/星标/回收站三页共用。

```ts
const { loading, error, list, total, refresh } = useLoadQuestionListData({ isStar?, isDeleted? })
```

* URL search 解析：`keyword`（`LIST_SEARCH_PARAM_KEY`）、`page`、`pageSize`（缺省 `LIST_PAGE_SIZE = 10`）；

* `refreshDeps: [location.search]` —— 搜索词 / 翻页引起的 URL 变化自动重新请求；

* 文件头部保留了一版注释掉的历史实现（旧版基于 searchParams 的写法），现行版以 `location.search` 解析为准。

## 4. 快捷键组

### useBindCanvasKeyPress（[useBindCanvasKeyPress.ts](../../src/hooks/useBindCanvasKeyPress.ts)）

绑定画布全部快捷键（删除/复制/粘贴/上下选中/撤销/重做），详见 [07-问卷编辑器](./07-问卷编辑器.md#7-画布快捷键usebindcanvaskeypress)。

内部工具 `isActiveElementValid()`：焦点在 `document.body` 或 dnd-kit 的 `div[role="button"]` 时才允许快捷键生效，防止在 Input 中输入时误触删除。

## 5. 第三方 Hook 使用约定（ahooks）

项目中网络请求**全部**通过 ahooks 的 `useRequest` 承载，常见模式：

| 模式                        | 示例                                      |
| ------------------------- | --------------------------------------- |
| `manual: true` + 手动 `run` | 登录、保存、发布、AI 类请求                         |
| `refreshDeps: [...]` 自动重跑 | 列表（location.search）、统计表格（page/pageSize） |
| `ready: !!id` 延迟执行        | InterviewEdit / InterviewStat（等路由参数就绪）  |
| `onError` 中只做状态回退         | 错误 toast 由 axios 拦截器统一弹出                |
| `useDebounceFn` + `flush` | 编辑器自动保存（防抖 1s，卸载冲刷）                     |
| `useTitle`                | 各页面浏览器标签标题                              |
| `useKeyPress`             | ctrl+s 保存、画布快捷键                         |

## 6. Hook 依赖关系

```
useGetUserInfo ◄─── UserInfo / ManageLayout / EditHeader / ComponentProp / StatHeader / InterviewEdit / AiSummaryCard / InterviewStat / useNavPage
useGetComponentInfo ◄── EditCanvas / Layers / EditToolBar / ComponentProp / ComponentList / PageStat / EditHeader(Save/Publish)
useGetPageInfo ◄── Edit(index) / EditHeader / PageSetting / Stat(index) / StatHeader / InterviewStat
useLoadUserData ◄── MainLayout / QuestionLayout
useNavPage ◄────── MainLayout / QuestionLayout（与 useLoadUserData 成对）
useLoadQuestionData ◄── Edit / Stat
useLoadQuestionListData ◄── Star / Trash（List 自行实现无限滚动）
useBindCanvasKeyPress ◄── EditCanvas
```

