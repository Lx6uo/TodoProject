import { getAllTasks, getLists } from "./storage.js";
import { formatDateKey } from "./calendar.js";

const els = {
  themeToggle: document.getElementById("themeToggle"),
  listSelect: document.getElementById("analyticsListSelect"),
  rangeSelect: document.getElementById("rangeSelect"),
  customRangeFields: document.getElementById("customRangeFields"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  metricSelect: document.getElementById("metricSelect"),
  completionChart: document.getElementById("completionChart"),
  trendChart: document.getElementById("trendChart"),
  priorityChart: document.getElementById("priorityChart"),
};

const state = {
  lists: [],
  tasks: [],
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
});

const updateCharts = (charts) => {
  const colors = readThemeColors();
  const tasks = getScopedTasks();
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

  const range = getRange();
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
  });
};

const init = async () => {
  initTheme();
  state.lists = await getLists();
  state.tasks = await getAllTasks();
  buildListOptions();
  const charts = initCharts();
  updateCharts(charts);
  bindEvents(charts);
};

init();
