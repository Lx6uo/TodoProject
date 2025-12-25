# TodoProject 待办清单

纯前端练习项目，使用 HTML5、CSS3、原生 ES6 与本地 ECharts（直接引用 `node_modules`）。

## 快速开始（本地浏览器）
1. 安装依赖（用于提供 ECharts 文件）：
   - `cd D:\Desk\MyDeskFiles\Courses\WebDev25-26\TodoProject\Code`
   - `npm install`（或 `pnpm install`）
2. 使用本地静态服务器打开（不要直接 `file://`）：
   - 方式 1（pnpm 推荐）：
     - `pnpm dlx http-server . -p 5173`
   - 方式 2（Python）：
     - `python -m http.server 5173`
3. 在浏览器访问：
   - `http://localhost:5173/index.html`
   - `http://localhost:5173/calendar.html`
   - `http://localhost:5173/analytics.html`

提示：`file://` 会阻止 ES Module 与 IndexedDB，请务必使用本地静态服务器。

## 迁移与运行
- 迁移到新电脑时，复制整个 `TodoProject/Code` 目录。
- 进入 `Code/` 后运行 `npm install` 或 `pnpm install`，再按上面的方式启动本地服务器。
- 如需部署为静态站点，可将 `Code/` 作为站点根目录上传（需确保 `node_modules` 可访问，或改为复制 ECharts 文件到项目内）。

## 项目文档
- 需求与设计说明：`PROJECT_SPEC.md`
- 贡献者指南：`AGENTS.md`

## 目录结构
```
Code/
  assets/
    css/style.css
    js/app.js
    js/storage.js
    js/calendar.js
    js/charts.js
    js/calendar-page.js
    node_modules/echarts/dist/echarts.min.js
  index.html
  analytics.html
  calendar.html
```
