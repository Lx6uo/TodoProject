# TodoProject 待办清单网页应用

纯前端练习项目，使用 HTML5、CSS3、原生 ES6 与 ECharts。

## 快速开始（本地浏览器）
1. 安装依赖（用于提供 ECharts 文件）：
   - `cd Code`
   - `npm install`（或 `pnpm install`）
2. 使用本地静态服务器打开（不要直接 `file://`，否则无法交互）：
   - 方式 1（pnpm）：`pnpm dlx http-server . -p 5173`
   - 方式 2（npm）：`npx http-server . -p 5173`
3. 在浏览器访问：
   - `http://127.0.0.1:5173/index.html`
   - `http://127.0.0.1:5173/calendar.html`
   - `http://127.0.0.1:5173/analytics.html`

提示：直接打开文件会阻止 ES Module 与 IndexedDB。

## 迁移与运行
- 进入 `Code/` 后运行 `npm install` 或 `pnpm install`，再按上面的方式启动本地服务器。
- 如需部署为静态站点，可将 `Code/` 作为站点根目录上传（需确保 `node_modules` 可访问，或改为复制 ECharts 文件到项目内）。
- 数据保存在浏览器 IndexedDB，克隆仓库不会带走；可使用“导出数据/导入数据”迁移（导入后撤销/重做栈会重置）。

## 主要功能
- 任务事件日志：记录新建、编辑、完成、重新开启、删除与撤销/重做。
- 撤销/重做：基于事件栈回滚最近操作。
- 列表与记录分页：任务列表与事件日志支持分页，页大小可选并记忆偏好。
- 数据分析增强：完成耗时分布、返工率（分母=全部任务，分子=区间内重新开启任务数）、日均完成与日均返工。

## 项目文档
- 需求与设计说明：`PROJECT.md`
- 项目报告：`PROJECT_REPORT.md`
- 贡献者指南：`AGENTS.md`

## 数据结构
数据保存在浏览器 IndexedDB：库名 `todo-studio`（v2），对象仓库：`lists` / `tasks` / `events` / `meta`。

**List（lists）**
```json
{
  "id": "uuid",
  "name": "收集箱",
  "order": 1710000000000,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

**Task（tasks）**
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "note": "string",
  "priority": "low|medium|high",
  "dueDate": "YYYY-MM-DD|null",
  "completed": false,
  "completedAt": 0,
  "order": 0,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

**Event（events）**
任务事件（`task.create|task.edit|task.complete|task.reopen|task.delete`）会携带任务快照 `before/after`（结构同 Task，用于撤销/重做与统计）。
```json
{
  "id": "uuid",
  "type": "task.complete",
  "taskId": "uuid",
  "listId": "uuid",
  "before": { "id": "uuid", "completed": false, "completedAt": 0 },
  "after": { "id": "uuid", "completed": true, "completedAt": 1710000000000 },
  "createdAt": 1710000000000
}
```
撤销/重做事件（`action.undo|action.redo`）指向目标任务事件并保存标题等信息。
```json
{
  "id": "uuid",
  "type": "action.undo",
  "targetEventId": "uuid",
  "targetType": "task.edit",
  "targetTitle": "string",
  "taskId": "uuid",
  "listId": "uuid",
  "createdAt": 1710000000000
}
```

**导出 JSON（导出数据）**
```json
{
  "version": 2,
  "exportedAt": 1710000000000,
  "lists": [],
  "tasks": [],
  "events": [],
  "meta": {
    "eventStacks": { "undo": [], "redo": [] }
  }
}
```
说明：`tasks` 是任务“当前态”；`events.before/after` 是任务快照，所以同一任务内容会在两处出现。导入后会重置撤销/重做栈。

## 目录结构
```
Code/                   # 站点根目录（静态服务器指向这里）
  assets/               # 静态资源
    css/style.css       # 全站样式
    js/app.js           # 首页：任务/列表/筛选/分页/日志/导入导出
    js/list-ui.js       # 下拉选项渲染（复用）
    js/task-ui.js       # 任务 DOM 构建工具（复用）
    js/theme.js         # 主题初始化与切换（复用）
    js/storage.js       # IndexedDB 数据层 + 事件日志 + 撤销/重做
    js/calendar.js      # 日期工具与日历通用逻辑
    js/calendar-page.js # 日历页渲染与交互
    js/charts.js        # 分析页图表与指标计算
  node_modules/echarts/dist/echarts.min.js  # 本地 ECharts（直接引用）
  index.html            # 任务清单页
  analytics.html        # 数据分析页
  calendar.html         # 日历页
  package.json          # 依赖清单（主要用于 ECharts）
  pnpm-lock.yaml        # pnpm 锁文件
```
