import {
  getAllTasks,
  getLists,
  getTasksByList,
  toggleTaskCompletion,
} from "./storage.js";
import { buildCalendarCells, formatDateKey, getMonthLabel } from "./calendar.js";
import { renderListOptions } from "./list-ui.js";
import { buildTaskMain } from "./task-ui.js";
import { bindThemeToggle, initTheme } from "./theme.js";

const state = {
  lists: [],
  tasks: [],
  selectedListId: "all",
  selectedDate: null,
  calendarDate: new Date(),
};

const els = {
  themeToggle: document.getElementById("themeToggle"),
  listSelect: document.getElementById("calendarListSelect"),
  yearSelect: document.getElementById("calendarYearSelect"),
  monthSelect: document.getElementById("calendarMonthSelect"),
  calendarMonthLabel: document.getElementById("calendarMonthLabel"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarTaskList: document.getElementById("calendarTaskList"),
  calendarTaskTitle: document.getElementById("calendarTaskTitle"),
};

// 清空节点内容
const clearElement = (element) => {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

// 生成年份下拉
const buildYearOptions = () => {
  const currentYear = state.calendarDate.getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 5;
  clearElement(els.yearSelect);

  for (let year = startYear; year <= endYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `${year} 年`;
    els.yearSelect.appendChild(option);
  }
};

// 加载列表并应用选择
const loadLists = async () => {
  state.lists = await getLists();
  const saved = localStorage.getItem("calendarListId");
  const isValid = saved && state.lists.some((list) => list.id === saved);
  state.selectedListId = isValid ? saved : "all";
  renderListOptions(els.listSelect, state.lists, {
    includeAll: true,
    selectedValue: state.selectedListId,
  });
};

// 加载当前筛选下的任务
const loadTasks = async () => {
  if (state.selectedListId === "all") {
    state.tasks = await getAllTasks();
  } else {
    state.tasks = await getTasksByList(state.selectedListId);
  }
};

// 渲染月历网格
const renderCalendar = () => {
  const viewDate = state.calendarDate;
  const cells = buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth());
  const todayKey = formatDateKey(new Date());
  els.calendarMonthLabel.textContent = getMonthLabel(viewDate);
  els.yearSelect.value = String(viewDate.getFullYear());
  els.monthSelect.value = String(viewDate.getMonth() + 1);

  // 统计每个日期的任务数量
  const counts = state.tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    acc[task.dueDate] = (acc[task.dueDate] || 0) + 1;
    return acc;
  }, {});

  clearElement(els.calendarGrid);
  const fragment = document.createDocumentFragment();
  cells.forEach((cell) => {
    const item = document.createElement("div");
    item.className = "calendar-cell";
    if (!cell.isCurrentMonth) item.classList.add("inactive");
    if (cell.key === todayKey) item.classList.add("today");
    if (cell.key === state.selectedDate) item.classList.add("selected");
    item.dataset.date = cell.key;

    const day = document.createElement("div");
    day.className = "day";
    day.textContent = cell.day;

    const count = document.createElement("div");
    count.className = "count";
    const total = counts[cell.key] || 0;
    count.textContent = total ? `${total} 项` : "";

    item.appendChild(day);
    item.appendChild(count);
    fragment.appendChild(item);
  });
  els.calendarGrid.appendChild(fragment);
};

// 创建任务条目节点
const createTaskElement = (task, listMap, showListName) => {
  const item = document.createElement("li");
  item.className = "task-item simple";
  item.dataset.id = task.id;
  const listName = listMap.get(task.listId) || "";
  const { left } = buildTaskMain(task, {
    showListName,
    listName,
    includeRemaining: true,
  });
  item.appendChild(left);

  return item;
};

// 渲染选中日期的任务
const renderCalendarTasks = () => {
  clearElement(els.calendarTaskList);
  const label = state.selectedDate
    ? `${state.selectedDate} 的任务`
    : "请选择日期查看任务";
  els.calendarTaskTitle.textContent = label;

  if (!state.selectedDate) {
    return;
  }

  const tasks = state.tasks.filter((task) => task.dueDate === state.selectedDate);
  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "task-item simple";
    empty.textContent = "这一天没有截止任务。";
    els.calendarTaskList.appendChild(empty);
    return;
  }

  const listMap = new Map(state.lists.map((list) => [list.id, list.name]));
  const showListName = state.selectedListId === "all";
  const fragment = document.createDocumentFragment();
  tasks
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((task) => {
      const item = createTaskElement(task, listMap, showListName);
      fragment.appendChild(item);
    });
  els.calendarTaskList.appendChild(fragment);
};

// 刷新日历视图
const refresh = async () => {
  await loadTasks();
  renderCalendar();
  renderCalendarTasks();
};

// 处理任务完成勾选
const handleTaskCheckbox = async (event) => {
  if (!event.target.matches(".task-check")) return;
  const item = event.target.closest(".task-item");
  if (!item) return;
  const task = state.tasks.find((t) => t.id === item.dataset.id);
  if (!task) return;
  const completed = event.target.checked;
  await toggleTaskCompletion(task.id, completed);
  await refresh();
};

// 绑定页面事件
const bindEvents = () => {
  bindThemeToggle(els.themeToggle);

  els.listSelect.addEventListener("change", async () => {
    state.selectedListId = els.listSelect.value;
    localStorage.setItem("calendarListId", state.selectedListId);
    state.selectedDate = null;
    await refresh();
  });

  const updateCalendarFromSelect = () => {
    // 根据下拉更新年月
    const year = Number(els.yearSelect.value);
    const monthIndex = Number(els.monthSelect.value) - 1;
    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return;
    state.calendarDate = new Date(year, monthIndex, 1);
    state.selectedDate = null;
    renderCalendar();
    renderCalendarTasks();
  };

  els.yearSelect.addEventListener("change", updateCalendarFromSelect);
  els.monthSelect.addEventListener("change", updateCalendarFromSelect);

  els.calendarGrid.addEventListener("click", (event) => {
    const cell = event.target.closest(".calendar-cell");
    if (!cell) return;
    state.selectedDate = cell.dataset.date;
    renderCalendar();
    renderCalendarTasks();
  });

  els.calendarTaskList.addEventListener("change", handleTaskCheckbox);
};

// 初始化入口
const init = async () => {
  initTheme(els.themeToggle);
  buildYearOptions();
  await loadLists();
  await refresh();
  bindEvents();
};

init();
