# TODO待办清单轻量项目需求与方案

## 项目目标
- 纯前端、学习型、实用型 TODO 任务清单网页
- 轻量、主流、易理解，避免过度复杂实现
- 数据分析页面使用本地 ECharts

## 技术约束
- 仅使用 HTML5、CSS3、原生 JS（ES6）
- 不使用前端框架
- 无后端、无账号、无多端同步
- ECharts 通过 `node_modules` 本地引用（不复制到项目内）
- 页面文案、提示、注释与项目文档统一使用中文

## 功能范围（已确认）
- 任务管理：新增、编辑、删除、完成状态切换
- 任务字段：标题、备注、优先级、截止日期
- 多列表：创建/重命名/删除列表，任务归属列表
- 列表排序：支持上下箭头调整列表顺序
- 过滤与搜索：全部/进行中/已完成 + 关键字搜索
- 排序：按优先级、按日期
- 日历视图：支持年份与月份选择，点击日期查看当日截止任务
- 日历视图为独立页面展示
- 统计概览：总数、完成数、完成率（当前列表）
- ECharts 分析页：
  - 完成/未完成占比饼图
  - 近 7 天新增/完成折线图
  - 优先级分布柱状图
- 主题切换：浅色/深色，记忆偏好
- 排序交互：使用上下箭头调整顺序（仅在“状态：全部 + 排序：手动”可用）
- 数据迁移：支持导出/导入 JSON（可选择覆盖或合并）

## 边界（不做）
- 账号系统、云同步、多人协作
- 推送提醒、复杂重复规则、复杂日历功能
- 复杂拖拽看板或附件上传

## 页面结构
- `index.html`：任务清单页（列表与筛选）
- `analytics.html`：数据分析页（ECharts）
- `calendar.html`：日历视图页（按日期查看任务）

## 数据结构（Todo）
```json
{
  "id": "uuid",
  "listId": "uuid",
  "title": "string",
  "note": "string",
  "priority": "low|medium|high",
  "dueDate": "YYYY-MM-DD | null",
  "completed": false,
  "completedAt": 0,
  "order": 0,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

## 数据存储策略
- IndexedDB：`lists` 与 `tasks` 两个对象仓库
- 索引建议：`listId`、`dueDate`、`completed`
- localStorage：主题、当前列表、上次筛选状态

## 交互规则
- 仅在“状态：全部 + 排序：手动”下允许调整顺序，避免筛选导致顺序混乱
- 完成趋势统计：完成时写入 `completedAt`
- 新增/编辑任务使用弹窗，背景压暗以突出操作

## ECharts 交互增强
- 列表范围切换：全部 / 指定列表
- 时间范围切换：近 7 天 / 近 30 天 / 自定义
- 趋势指标切换：新增 / 完成 / 同时显示

## 目录结构建议
```
/Code
  /assets
    /css/style.css
    /js/app.js
    /js/storage.js
    /js/calendar.js
    /js/charts.js
    /js/calendar-page.js
  /node_modules/echarts/dist/echarts.min.js
  index.html
  analytics.html
  calendar.html
```

## 开发步骤建议
1. 页面结构与主题变量（CSS）
2. IndexedDB 封装（增删改查、索引）
3. 列表与任务 CRUD
4. 筛选/搜索/排序 + 上下箭头排序
5. 日历视图与数据联动
6. 统计概览 + ECharts 分析页
