import { getAllEvents, getAllTasks, getLists } from "./storage.js";
import { formatDateKey } from "./calendar.js";
import { renderListOptions } from "./list-ui.js";
import { bindThemeToggle, initTheme } from "./theme.js";

const els = {
  themeToggle: document.getElementById("themeToggle"),
  listSelect: document.getElementById("analyticsListSelect"),
  rangeSelect: document.getElementById("rangeSelect"),
  customRangeFields: document.getElementById("customRangeFields"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  reworkRateValue: document.getElementById("reworkRateValue"),
  avgCompleteValue: document.getElementById("avgCompleteValue"),
  avgReworkValue: document.getElementById("avgReworkValue"),
  completionChart: document.getElementById("completionChart"),
  trendChart: document.getElementById("trendChart"),
  priorityChart: document.getElementById("priorityChart"),
  durationChart: document.getElementById("durationChart"),
};

const state = {
  lists: [],
  tasks: [],
  events: [],
};

// 读取主题配色变量
const readThemeColors = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue("--ink").trim(),
    inkSoft: styles.getPropertyValue("--ink-soft").trim(),
    accent: styles.getPropertyValue("--accent").trim(),
    accentWarm: styles.getPropertyValue("--accent-warm").trim(),
    surface: styles.getPropertyValue("--surface").trim(),
    outline: styles.getPropertyValue("--outline").trim(),
  };
};

// 统一网格配置
const buildGrid = () => ({ left: 32, right: 12, top: 20, bottom: 32 });

// 统一类目轴配置
const buildCategoryAxis = (labels, colors) => ({
  type: "category",
  data: labels,
  axisLabel: { color: colors.inkSoft },
  axisLine: { lineStyle: { color: colors.outline } },
});

// 统一数值轴配置
const buildValueAxis = (colors) => ({
  type: "value",
  axisLabel: { color: colors.inkSoft },
  splitLine: { lineStyle: { color: colors.outline } },
});

// 折线系列模板
const buildLineSeries = (name, data, color) => ({
  name,
  type: "line",
  smooth: true,
  data,
  color,
});

// 柱状系列模板
const buildBarSeries = (data, color) => ({
  type: "bar",
  data,
  itemStyle: { color },
});

// 饼图系列模板
const buildPieSeries = (data, colors) => ({
  type: "pie",
  radius: ["45%", "70%"],
  label: { color: colors.ink },
  data,
});

// 轴类图表提示配置
const buildAxisTooltip = () => ({ trigger: "axis" });

// 饼图提示配置
const buildItemTooltip = () => ({ trigger: "item" });

// 按列表筛选任务
const getScopedTasks = () => {
  const selected = els.listSelect.value;
  if (selected === "all") return state.tasks;
  return state.tasks.filter((task) => task.listId === selected);
};

// 按列表筛选事件
const getScopedEvents = () => {
  const selected = els.listSelect.value;
  if (selected === "all") return state.events;
  return state.events.filter((event) => event.listId === selected);
};

// 获取时间范围
const getRange = () => {
  const now = new Date();
  if (els.rangeSelect.value !== "custom") {
    const days = Number(els.rangeSelect.value);
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = els.startDate.value ? new Date(els.startDate.value) : null;
  const end = els.endDate.value ? new Date(els.endDate.value) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  return { start, end };
};

// 按时间范围过滤事件
const filterEventsByRange = (events, range) => {
  if (!range.start || !range.end) return [];
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();
  return events.filter(
    (event) => event.createdAt >= startTime && event.createdAt <= endTime
  );
};

// 计算范围天数
const getRangeDays = (range) => {
  if (!range.start || !range.end) return 0;
  const diff = range.end.getTime() - range.start.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
};

// 格式化百分比
const formatRate = (value) => `${Math.round(value * 100)}%`;

// 格式化日均值
const formatAverage = (value) => `${value.toFixed(1)} 条/天`;

// 构建完成耗时区间统计
const buildDurationBuckets = (events) => {
  const buckets = [
    { label: "当天完成", min: 0, max: 0 },
    { label: "1-3 天", min: 1, max: 3 },
    { label: "4-7 天", min: 4, max: 7 },
    { label: "8-14 天", min: 8, max: 14 },
    { label: "15 天以上", min: 15, max: Number.POSITIVE_INFINITY },
  ];

  const counts = new Array(buckets.length).fill(0);
  events.forEach((event) => {
    const createdAt = event.after?.createdAt;
    const completedAt = event.after?.completedAt;
    if (!createdAt || !completedAt) return;
    const days = Math.max(0, Math.floor((completedAt - createdAt) / 86400000));
    const index = buckets.findIndex((bucket) => days >= bucket.min && days <= bucket.max);
    if (index >= 0) {
      counts[index] += 1;
    }
  });

  return { labels: buckets.map((bucket) => bucket.label), data: counts };
};

// 构建新增/完成趋势
const buildTrendSeries = (tasks, range) => {
  if (!range.start || !range.end) {
    return { labels: [], created: [], completed: [] };
  }
  const labels = [];
  const createdMap = {};
  const completedMap = {};

  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    const key = formatDateKey(cursor);
    labels.push(key);
    createdMap[key] = 0;
    completedMap[key] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  tasks.forEach((task) => {
    const createdKey = formatDateKey(new Date(task.createdAt));
    if (createdMap[createdKey] !== undefined) {
      createdMap[createdKey] += 1;
    }
    if (task.completedAt) {
      const completedKey = formatDateKey(new Date(task.completedAt));
      if (completedMap[completedKey] !== undefined) {
        completedMap[completedKey] += 1;
      }
    }
  });

  return {
    labels,
    created: labels.map((key) => createdMap[key]),
    completed: labels.map((key) => completedMap[key]),
  };
};

// 初始化图表实例
const initCharts = () => ({
  completion: echarts.init(els.completionChart),
  trend: echarts.init(els.trendChart),
  priority: echarts.init(els.priorityChart),
  duration: echarts.init(els.durationChart),
});

// 更新所有图表与指标
const updateCharts = (charts) => {
  const colors = readThemeColors();
  const tasks = getScopedTasks();
  const range = getRange();
  const scopedEvents = getScopedEvents();
  const rangeEvents = filterEventsByRange(scopedEvents, range);
  const rangeEventsAll = filterEventsByRange(state.events, range);
  const completedEvents = rangeEvents.filter((event) => event.type === "task.complete");
  const reopenEvents = rangeEvents.filter((event) => event.type === "task.reopen");
  const rangeDays = getRangeDays(range);
  // 返工率按全部任务为分母
  const redoTaskCount = new Set(
    rangeEventsAll
      .filter((event) => event.type === "task.reopen" && event.taskId)
      .map((event) => event.taskId)
  ).size;
  const allTaskCount = state.tasks.length;
  const reworkRate = allTaskCount ? redoTaskCount / allTaskCount : 0;
  const avgComplete = rangeDays ? completedEvents.length / rangeDays : 0;
  const avgRework = rangeDays ? reopenEvents.length / rangeDays : 0;

  if (els.reworkRateValue) {
    els.reworkRateValue.textContent = rangeDays ? formatRate(reworkRate) : "-";
  }
  if (els.avgCompleteValue) {
    els.avgCompleteValue.textContent = rangeDays ? formatAverage(avgComplete) : "-";
  }
  if (els.avgReworkValue) {
    els.avgReworkValue.textContent = rangeDays ? formatAverage(avgRework) : "-";
  }
  // 完成/进行中占比
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;

  charts.completion.setOption({
    backgroundColor: "transparent",
    tooltip: buildItemTooltip(),
    color: [colors.accent, colors.accentWarm],
    series: [
      buildPieSeries(
        [
          { value: completedCount, name: "已完成" },
          { value: activeCount, name: "进行中" },
        ],
        colors
      ),
    ],
  });

  // 优先级分布
  const priorityStats = tasks.reduce(
    (acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  charts.priority.setOption({
    grid: buildGrid(),
    xAxis: buildCategoryAxis(["高", "中", "低"], colors),
    yAxis: buildValueAxis(colors),
    tooltip: buildAxisTooltip(),
    series: [
      buildBarSeries(
        [priorityStats.high, priorityStats.medium, priorityStats.low],
        colors.accent
      ),
    ],
  });

  // 趋势折线
  const trend = buildTrendSeries(tasks, range);
  const labelShort = trend.labels.map((label) => label.slice(5));
  const series = [
    buildLineSeries("新增", trend.created, colors.accent),
    buildLineSeries("完成", trend.completed, colors.accentWarm),
  ];

  charts.trend.setOption({
    grid: buildGrid(),
    xAxis: buildCategoryAxis(labelShort, colors),
    yAxis: buildValueAxis(colors),
    tooltip: buildAxisTooltip(),
    series,
  });

  // 完成耗时分布
  const durationBuckets = buildDurationBuckets(completedEvents);
  charts.duration.setOption({
    grid: buildGrid(),
    xAxis: buildCategoryAxis(durationBuckets.labels, colors),
    yAxis: buildValueAxis(colors),
    tooltip: buildAxisTooltip(),
    series: [buildBarSeries(durationBuckets.data, colors.accent)],
  });
};

// 绑定交互事件
const bindEvents = (charts) => {
  bindThemeToggle(els.themeToggle, () => updateCharts(charts));

  els.listSelect.addEventListener("change", () => updateCharts(charts));
  els.rangeSelect.addEventListener("change", () => {
    els.customRangeFields.classList.toggle(
      "hidden",
      els.rangeSelect.value !== "custom"
    );
    updateCharts(charts);
  });
  els.startDate.addEventListener("change", () => updateCharts(charts));
  els.endDate.addEventListener("change", () => updateCharts(charts));

  window.addEventListener("resize", () => {
    charts.completion.resize();
    charts.trend.resize();
    charts.priority.resize();
    charts.duration.resize();
  });
};

// 初始化入口
const init = async () => {
  initTheme(els.themeToggle);
  state.lists = await getLists();
  state.tasks = await getAllTasks();
  state.events = await getAllEvents();
  renderListOptions(els.listSelect, state.lists, {
    includeAll: true,
    selectedValue: "all",
  });
  const charts = initCharts();
  updateCharts(charts);
  bindEvents(charts);
};

init();
