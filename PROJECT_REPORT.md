# TodoProject 项目报告（《Web前端开发基础》课程实战练习）


> 本项目为纯前端静态站点，使用 HTML/CSS/原生 ES6（不使用 Vue/React 等框架），数据持久化使用浏览器 IndexedDB，图表使用本地 ECharts。


## 目录
- [1. 选题理由](#1-选题理由)
- [2. 项目特点](#2-项目特点)
- [3. 技术选型](#3-技术选型)
- [4. 数据结构设计](#4-数据结构设计)
- [5. 功能模块及其实现方法（代码）](#5-功能模块及其实现方法代码)
- [6. 实现难点与解决措施](#6-实现难点与解决措施)
- [7. 总结与展望](#7-总结与展望)

## 1. 选题理由

本项目选择实现一个“待办清单（Todo）”应用，主要出于以下原因：

1. **夯实前端三大件基础**  
   Todo 项目体量可控，但覆盖了 DOM 操作、事件绑定、表单处理、数据渲染、样式布局、浏览器存储等核心能力，非常适合作为《Web 前端开发基础》的综合练习。为了更直接地锻炼基础，本项目刻意 **不使用前端框架**，以原生方式完成页面与逻辑。

2. **用实践理解“前端不仅仅是画页面”**  
   真实可用的前端应用必须处理数据一致性、状态管理、可用性、性能、异常处理、可维护性等问题。本项目加入了事件日志、撤销/重做、导入导出、日历视图与数据分析等模块，覆盖了更多“工程问题”，从而理解前端开发的复杂性。

3. **认识框架、工程化与前后端分离的价值**  
   当功能逐步增多，纯原生 JS 容易出现“状态分散、渲染重复、事件绑定增多”的现象；同时缺少组件化、路由、统一状态管理等框架能力，代码会更冗杂。通过本项目的对比体验，更能理解：
   - **前端框架**在组件复用、状态管理、模板/渲染层抽象上的价值；
   - **前端工程化**在模块组织、构建优化、代码规范、自动化测试与发布上的价值；
   - **前后端分离**在数据接口、权限、协作与迭代效率上的价值。

4. **学习“离线/本地”应用的实现方式**  
   本项目不依赖后端，使用 IndexedDB 实现本地持久化，并支持导入导出 JSON 迁移数据，适合练习浏览器端数据存储与数据一致性处理。

## 2. 项目特点

### 2.1 纯前端、无构建流程
- 项目以 `Code/` 为站点根目录，直接通过静态服务器访问：`http://127.0.0.1:5173/index.html`。
- JS 采用原生 ES Module：HTML 中使用 `<script type="module">`，模块位于 `Code/assets/js/`。
- 图表库 ECharts 通过本地 `node_modules` 直接引用：`Code/node_modules/echarts/dist/echarts.min.js`。

### 2.2 任务管理功能完整且可扩展
- 多列表管理（增删改、手动排序）。
- 任务 CRUD（新增/编辑/删除/完成与重新开启）。
- 过滤、搜索、排序；并在特定条件下允许手动调整任务顺序。
- 数据迁移：导出/导入 JSON（支持覆盖或合并）。

### 2.3 “事件日志 + 撤销/重做”的可追溯设计
- 每次任务变更都会写入 `events`（操作流水），同时维护 `meta.eventStacks`（撤销/重做栈）。
- 事件携带 `before/after` 快照，可实现回滚与重放，提升可追溯性。

### 2.4 日历视图与数据分析
项目提供独立页面：
- `calendar.html`：按年月渲染月历，点击日期查看当日截止任务。
- `analytics.html`：使用 ECharts 展示完成概览、任务趋势、优先级分布、完成耗时分布，并提供返工率等指标。

### 2.5 安全与可维护性细节
- 渲染层 **不使用 `innerHTML`**，避免字符串拼接导致的 XSS 风险，统一使用 DOM API（`createElement/appendChild`）。
- 通过 `theme.js / task-ui.js / list-ui.js` 等小模块做复用，减少重复渲染逻辑。
- 通过“分页控制器”统一任务列表与事件日志的分页状态与事件绑定，降低重复代码。

## 3. 技术选型

### 3.1 HTML5
- 语义化结构：`header/nav/main/section/article` 等结构化页面。
- 表单与输入控件：`input[type="date"]`、`input[type="search"]`、`select` 等。

### 3.2 CSS3
- 使用 CSS 变量与 `data-theme` 实现明暗主题切换（配合 `theme.js`）。
- 使用 Flex/Grid 完成布局与卡片式 UI，保证结构清晰。

### 3.3 JavaScript（ES6+，原生实现）
- 使用 ES Module 组织代码：`import/export`，避免单文件堆叠。
- 使用 `DocumentFragment` 批量插入节点，减少多次回流重绘。
- 使用 `localStorage` 存储偏好（主题、筛选/排序、分页页大小等）。
- 使用 IndexedDB 存储业务数据（列表、任务、事件、撤销/重做栈）。

### 3.4 第三方库
- **ECharts**：用于分析页图表渲染，便于快速实现高质量可视化。

### 3.5 为什么不选 Vue/React（本项目阶段）
本项目的目标是“练基础”，因此选择原生实现以训练：
- DOM 结构拆分、事件代理、渲染优化；
- 异步数据读写（IndexedDB）；
- 复杂状态流转（撤销/重做与事件日志）。

同时也在实践中体验到：当功能变复杂时，原生 JS 会更冗杂，从而反向理解框架与工程化的必要性。

## 4. 数据结构设计

### 4.1 存储与版本
数据保存在浏览器 IndexedDB：
- 数据库名：`todo-studio`
- 版本号：`2`（对应 `Code/assets/js/storage.js` 中的 `DB_VERSION`）
- 对象仓库：`lists` / `tasks` / `events` / `meta`

### 4.2 核心对象

#### 4.2.1 列表（List）
对象仓库：`lists`
```json
{
  "id": "uuid",
  "name": "收集箱",
  "order": 1710000000000,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

#### 4.2.2 任务（Task）
对象仓库：`tasks`
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

#### 4.2.3 事件（Event）
对象仓库：`events`

**（1）任务事件**：记录任务变更，并携带 `before/after` 快照（结构同 Task）。  
事件类型：`task.create|task.edit|task.complete|task.reopen|task.delete`
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

**（2）撤销/重做事件**：用于审计“撤销/重做”行为，指向目标任务事件。  
事件类型：`action.undo|action.redo`
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

#### 4.2.4 元信息（Meta）
对象仓库：`meta`，其中关键字段为撤销/重做栈：
```json
{
  "key": "eventStacks",
  "value": { "undo": ["eventId"], "redo": ["eventId"] }
}
```

### 4.3 导入/导出结构
导出 JSON 为一个“全量快照”，结构如下（`storage.js/exportData`）：
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

> 说明：`tasks` 是任务的“当前态”；`events.before/after` 是任务快照（用于撤销/重做与统计）。因此同一任务内容会在两处出现，这是设计上的“可追溯性”换来的存储冗余。

## 5. 功能模块及其实现方法（代码）

### 5.1 页面与模块组织
项目为多页静态站点：
- `Code/index.html`：任务清单（核心操作入口）
- `Code/calendar.html`：日历视图
- `Code/analytics.html`：数据分析

JS 模块主要位于 `Code/assets/js/`，其中：
- `app.js`：首页主逻辑（任务/列表/筛选/分页/日志/导入导出）
- `storage.js`：IndexedDB 数据层 + 事件日志 + 撤销/重做
- `theme.js`：主题切换复用模块
- `task-ui.js`：任务 DOM 构建复用模块
- `list-ui.js`：列表下拉选项渲染复用模块
- `calendar.js / calendar-page.js`：日历工具与页面逻辑
- `charts.js`：分析页图表与指标计算

### 5.2 IndexedDB 数据层（核心）
`storage.js` 负责打开数据库、初始化对象仓库与索引，并提供 CRUD API。

**（1）打开数据库并创建对象仓库**
```js
// Code/assets/js/storage.js
const DB_NAME = "todo-studio";
const DB_VERSION = 2;

export const openDB = () => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("lists")) {
      const listStore = db.createObjectStore("lists", { keyPath: "id" });
      listStore.createIndex("order", "order", { unique: false });
    }
    if (!db.objectStoreNames.contains("tasks")) {
      const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
      taskStore.createIndex("listId", "listId", { unique: false });
      taskStore.createIndex("dueDate", "dueDate", { unique: false });
      taskStore.createIndex("completed", "completed", { unique: false });
      taskStore.createIndex("completedAt", "completedAt", { unique: false });
    }
    if (!db.objectStoreNames.contains("events")) {
      const eventStore = db.createObjectStore("events", { keyPath: "id" });
      eventStore.createIndex("createdAt", "createdAt", { unique: false });
      eventStore.createIndex("type", "type", { unique: false });
      eventStore.createIndex("listId", "listId", { unique: false });
    }
    if (!db.objectStoreNames.contains("meta")) {
      db.createObjectStore("meta", { keyPath: "key" });
    }
  };
  // ...
};
```

**（2）任务完成/重新开启（会写入事件日志）**
```js
// Code/assets/js/storage.js
export const toggleTaskCompletion = async (taskId, completed) => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const before = await requestToPromise(taskStore.get(taskId));
  if (!before) {
    await transactionDone(tx);
    return null;
  }
  const now = timeNow();
  const updated = {
    ...before,
    completed,
    completedAt: completed ? now : 0,
    updatedAt: now,
  };
  taskStore.put(updated);
  const stacks = await readEventStacks(metaStore);
  const event = buildTaskEvent(
    completed ? "task.complete" : "task.reopen",
    before,
    updated,
    now
  );
  pushEventToStacks(eventStore, metaStore, event, stacks);
  await transactionDone(tx);
  return updated;
};
```

### 5.3 事件日志与撤销/重做
本项目采用“事件 + 快照”的方式实现撤销/重做：
- `events` 存储每次任务变更的事件及快照；
- `meta.eventStacks` 维护 `undo/redo` 栈（存事件 id）；
- 撤销/重做通过 `applyEventChange` 回滚/重放快照。

**撤销逻辑示例：**
```js
// Code/assets/js/storage.js
export const undoLastEvent = async () => {
  const stacks = await readEventStacks(metaStore);
  const targetId = stacks.undo.pop();
  const targetEvent = await requestToPromise(eventStore.get(targetId));
  applyEventChange(taskStore, targetEvent, "undo");
  stacks.redo.push(targetId);
  writeEventStacks(metaStore, stacks);
  eventStore.put(buildActionEvent("action.undo", targetEvent));
  return targetEvent;
};
```

页面展示“最近操作记录”时，会将事件类型映射为中文标题（`app.js/buildEventTitle`），并支持分页查看。

### 5.4 分页（任务列表 + 操作记录复用）
为了减少重复状态与事件绑定，项目在 `app.js` 中实现了一个通用分页控制器 `createPager`：
- 统一管理：`page/pageSize/items`
- 页大小存入 `localStorage`（如 `taskPageSize`、`eventPageSize`）
- 通过 `renderItems(items, container, context)` 回调让不同列表复用同一分页逻辑

```js
// Code/assets/js/app.js
const createPager = (options) => {
  const {
    container,
    pageSizeKey,
    pageSizeSelect,
    prevBtn,
    nextBtn,
    infoEl,
    emptyText,
    emptyClass,
    renderItems,
  } = options;
  let page = 1;
  let pageSize = Number(localStorage.getItem(pageSizeKey)) || 10;
  let items = [];
  let context = {};

  const render = () => {
    clearElement(container);
    const paged = paginateItems(items, page, pageSize);
    updatePaginationControls(paged.currentPage, paged.totalPages, prevBtn, nextBtn, infoEl);
    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = emptyClass;
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    renderItems(paged.items, container, context);
  };

  const setItems = (nextItems, nextContext = {}) => {
    items = nextItems;
    context = nextContext;
    render();
  };

  // ...
  return { setItems, resetPage, bind, render };
};
```

### 5.5 表单读写与校验集中
首页弹窗表单的字段读写通过两个函数集中处理，减少新增/编辑的重复代码：
- `getTaskFormPayload()`：从表单读取并做最低限度校验
- `fillTaskForm(task)`：用于新建/编辑两种场景

```js
// Code/assets/js/app.js
const getTaskFormPayload = () => {
  const title = els.taskTitle.value.trim();
  if (!title) return null;
  return {
    title,
    note: els.taskNote.value.trim(),
    priority: els.taskPriority.value,
    dueDate: els.taskDueDate.value || null,
    listId: els.taskListSelect.value || state.currentListId,
  };
};
```

### 5.6 DOM 渲染策略：不使用 innerHTML
为了避免模板字符串拼接与 `innerHTML` 带来的安全隐患与维护成本，项目统一采用 DOM API 渲染：
- `document.createElement`
- `appendChild`
- `DocumentFragment`
- `clearElement`（循环移除子节点）

以任务条目为例，页面渲染由 `task-ui.js/buildTaskMain` 负责构建“主体节点”，再由 `app.js/createTaskElement` 组装按钮区与排序区。

### 5.7 主题切换
主题模块 `theme.js` 做到“逻辑复用 + 页面一致”：
- `initTheme`：读取 `localStorage.theme` 并初始化
- `bindThemeToggle`：绑定开关变更，并回调通知图表刷新等二次渲染

```js
// Code/assets/js/theme.js
export const applyTheme = (theme, toggleEl) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  if (toggleEl) toggleEl.checked = theme === "dark";
};
```

### 5.8 日历视图
日历页将月历拆分为两层：
1. `calendar.js/buildCalendarCells`：根据年月生成 6×7 的日期单元（含前后补齐）
2. `calendar-page.js/renderCalendar`：渲染网格并统计每日任务数量

```js
// Code/assets/js/calendar.js
export const buildCalendarCells = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - startOffset + 1;
    // ...
    cells.push({ key: formatDateKey(cellDate), day: cellDate.getDate(), isCurrentMonth });
  }
  return cells;
};
```

### 5.9 数据分析与指标口径
分析页通过 `charts.js` 完成：
- 读取 `lists/tasks/events` 并按“列表选择 + 时间范围”计算数据
- 用 ECharts 生成 4 个图表（饼图/折线/柱状/柱状）
- 输出 3 个指标：返工率、日均完成、日均返工

**返工率口径（已按需求调整）：**
- 分母：所有列表的全部任务数（`state.tasks.length`）
- 分子：选定时间范围内发生 `task.reopen` 的任务数（按 `taskId` 去重），且不受“列表筛选”影响

```js
// Code/assets/js/charts.js（关键计算）
const rangeEventsAll = filterEventsByRange(state.events, range);
const redoTaskCount = new Set(
  rangeEventsAll
    .filter((event) => event.type === "task.reopen" && event.taskId)
    .map((event) => event.taskId)
).size;
const allTaskCount = state.tasks.length;
const reworkRate = allTaskCount ? redoTaskCount / allTaskCount : 0;
```

## 6. 实现难点与解决措施

### 6.1 IndexedDB 的异步与事务一致性
**难点：** IndexedDB API 偏底层，读写基于事件回调，事务边界与错误处理容易遗漏。  
**措施：**
- 将 `IDBRequest` 封装为 Promise（`requestToPromise`），降低回调嵌套；
- 将事务完成封装为 `transactionDone(tx)`，保证写入完成后再更新 UI；
- 通过数据库版本号 `DB_VERSION` 管理结构升级（对象仓库与索引创建集中在 `onupgradeneeded`）。

### 6.2 撤销/重做的正确性与可追溯性
**难点：** 撤销/重做不仅要恢复数据，还要维护栈、记录操作、避免越界。  
**措施：**
- 将“业务变更”抽象为事件（`events`），并保存 `before/after` 快照；
- `meta.eventStacks` 存事件 id，撤销/重做只需要移动 id 并执行 `applyEventChange`；
- 额外写入 `action.undo/action.redo` 事件用于审计与展示。

### 6.3 纯原生 DOM 渲染的冗杂与性能
**难点：** 原生 DOM 代码容易变长，且频繁操作 DOM 会影响性能。  
**措施：**
- 禁用 `innerHTML`，统一 DOM API 渲染，避免字符串模板导致的安全/维护问题；
- 使用 `DocumentFragment` 批量插入节点，减少多次回流；
- 抽出 `task-ui.js`（任务节点构建复用）、`list-ui.js`（下拉选项复用）、`theme.js`（主题复用）减少重复。

### 6.4 分页与筛选/排序/搜索的联动
**难点：** 筛选条件变化后页码可能越界，且任务与事件日志两套分页逻辑容易重复。  
**措施：**
- 抽出 `createPager` 通用分页控制器；
- 在筛选/排序/搜索变更时统一调用 `resetPage()` 回到第 1 页；
- 页大小通过 `localStorage` 持久化，提升体验。

### 6.5 指标口径（返工率）易产生歧义
**难点：** 返工率的“分母/分子”与是否受列表筛选影响可能产生误解。  
**措施：**
- 明确口径：分母=所有任务；分子=区间内重新开启的任务数（按任务去重）；
- 计算时使用 `state.events` 做全局取数，再按时间范围过滤，避免被列表选择误伤。

## 7. 总结与展望

### 7.1 项目特色
- **纯前端本地持久化**：IndexedDB 存储 lists/tasks/events/meta，具备离线可用特性。
- **可追溯操作链路**：事件日志 + 撤销/重做栈，既能回滚也能展示操作记录。
- **多视图联动**：清单页 + 日历页 + 分析页，形成一个相对完整的小应用闭环。
- **安全渲染**：不使用 `innerHTML`，以 DOM API 构建页面节点，降低注入风险。

### 7.2 不足与反思
- **原生 JS 代码量偏大**：随着功能增加，状态管理、渲染复用与事件绑定更难维护，这是纯原生方案的痛点。
- **缺少工程化支撑**：没有 TypeScript 类型约束、自动化测试、lint/format 等工具链，长期维护成本更高。
- **缺少后端能力**：无法实现账号、多端同步、协作、权限等真实业务能力，数据仅存在当前浏览器环境。
- **可扩展性受限**：当需求继续增长时，需要组件化、路由、统一状态管理等更高层抽象来降低复杂度。

### 7.3 展望（下一步可做）
1. **引入前端框架（Vue/React）重构 UI 层**：用组件化减少 DOM 手写与重复渲染，路由统一管理页面跳转。
2. **引入工程化工具链**：例如 Vite + ESLint + Prettier + TypeScript，提高可维护性与协作效率。
3. **前后端分离**：提供 REST API（或 GraphQL）实现账号与云端数据同步，为多端使用打基础。
4. **更完善的数据一致性**：导入合并时处理 ID 冲突与去重策略，事件日志与元数据版本兼容更完善。
5. **增强可用性与可访问性**：键盘操作、ARIA 完善、移动端适配、可视化筛选等。

> 总结：本项目从“只用原生三大件”出发，亲身体验了前端应用从页面到数据、从交互到工程的全链路复杂性，也更深刻理解了框架、工程化与前后端分离在真实开发中的重要性与实用性。
