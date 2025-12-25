import { getAllEvents, getAllTasks, getLists } from "./storage.js";
import { formatDateKey } from "./calendar.js";

const els = {
  themeToggle: document.getElementById("themeToggle"),
  listSelect: document.getElementById("analyticsListSelect"),
  rangeSelect: document.getElementById("rangeSelect"),
  customRangeFields: document.getElementById("customRangeFields"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  metricSelect: document.getElementById("metricSelect"),
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

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  if (els.themeToggle) {
    els.themeToggle.checked = theme === "dark";
  }
};

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
};

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

const buildListOptions = () => {
  els.listSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "全部列表";
  els.listSelect.appendChild(allOption);

  state.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    els.listSelect.appendChild(option);
  });
};

const getScopedTasks = () => {
  const selected = els.listSelect.value;
  if (selected === "all") return state.tasks;
  return state.tasks.filter((task) => task.listId === selected);
};

const getScopedEvents = () => {
  const selected = els.listSelect.value;
  if (selected === "all") return state.events;
  return state.events.filter((event) => event.listId === selected);
};

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

const filterEventsByRange = (events, range) => {
  if (!range.start || !range.end) return [];
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();
  return events.filter(
    (event) => event.createdAt >= startTime && event.createdAt <= endTime
  );
};

const getRangeDays = (range) => {
  if (!range.start || !range.end) return 0;
  const diff = range.end.getTime() - range.start.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
};

const formatRate = (value) => `${Math.round(value * 100)}%`;

const formatAverage = (value) => `${value.toFixed(1)} 条/天`;

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

const initCharts = () => ({
  completion: echarts.init(els.completionChart),
  trend: echarts.init(els.trendChart),
  priority: echarts.init(els.priorityChart),
  duration: echarts.init(els.durationChart),
});

const updateCharts = (charts) => {
  const colors = readThemeColors();
  const tasks = getScopedTasks();
  const range = getRange();
  const scopedEvents = getScopedEvents();
  const rangeEvents = filterEventsByRange(scopedEvents, range);
  const completedEvents = rangeEvents.filter((event) => event.type === "task.complete");
  const reopenEvents = rangeEvents.filter((event) => event.type === "task.reopen");
  const rangeDays = getRangeDays(range);
  const reworkRate = completedEvents.length
    ? reopenEvents.length / completedEvents.length
    : 0;
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
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;

  charts.completion.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    color: [colors.accent, colors.accentWarm],
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        label: { color: colors.ink },
        data: [
          { value: completedCount, name: "已完成" },
          { value: activeCount, name: "进行中" },
        ],
      },
    ],
  });

  const priorityStats = tasks.reduce(
    (acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  charts.priority.setOption({
    grid: { left: 32, right: 12, top: 20, bottom: 32 },
    xAxis: {
      type: "category",
      data: ["高", "中", "低"],
      axisLabel: { color: colors.inkSoft },
      axisLine: { lineStyle: { color: colors.outline } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.inkSoft },
      splitLine: { lineStyle: { color: colors.outline } },
    },
    tooltip: { trigger: "axis" },
    series: [
      {
        type: "bar",
        data: [priorityStats.high, priorityStats.medium, priorityStats.low],
        itemStyle: { color: colors.accent },
      },
    ],
  });

  const trend = buildTrendSeries(tasks, range);
  const labelShort = trend.labels.map((label) => label.slice(5));
  const series = [];
  if (els.metricSelect.value === "both" || els.metricSelect.value === "created") {
    series.push({
      name: "新增",
      type: "line",
      smooth: true,
      data: trend.created,
      color: colors.accent,
    });
  }
  if (
    els.metricSelect.value === "both" ||
    els.metricSelect.value === "completed"
  ) {
    series.push({
      name: "完成",
      type: "line",
      smooth: true,
      data: trend.completed,
      color: colors.accentWarm,
    });
  }

  charts.trend.setOption({
    grid: { left: 32, right: 12, top: 20, bottom: 32 },
    xAxis: {
      type: "category",
      data: labelShort,
      axisLabel: { color: colors.inkSoft },
      axisLine: { lineStyle: { color: colors.outline } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.inkSoft },
      splitLine: { lineStyle: { color: colors.outline } },
    },
    tooltip: { trigger: "axis" },
    series,
  });

  const durationBuckets = buildDurationBuckets(completedEvents);
  charts.duration.setOption({
    grid: { left: 32, right: 12, top: 20, bottom: 32 },
    xAxis: {
      type: "category",
      data: durationBuckets.labels,
      axisLabel: { color: colors.inkSoft },
      axisLine: { lineStyle: { color: colors.outline } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.inkSoft },
      splitLine: { lineStyle: { color: colors.outline } },
    },
    tooltip: { trigger: "axis" },
    series: [
      {
        type: "bar",
        data: durationBuckets.data,
        itemStyle: { color: colors.accent },
      },
    ],
  });
};

const bindEvents = (charts) => {
  els.themeToggle.addEventListener("change", () => {
    const next = els.themeToggle.checked ? "dark" : "light";
    applyTheme(next);
    updateCharts(charts);
  });

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
  els.metricSelect.addEventListener("change", () => updateCharts(charts));

  window.addEventListener("resize", () => {
    charts.completion.resize();
    charts.trend.resize();
    charts.priority.resize();
    charts.duration.resize();
  });
};

const init = async () => {
  initTheme();
  state.lists = await getLists();
  state.tasks = await getAllTasks();
  state.events = await getAllEvents();
  buildListOptions();
  const charts = initCharts();
  updateCharts(charts);
  bindEvents(charts);
};

init();
