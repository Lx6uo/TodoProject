import { getAllTasks, getLists, getTasksByList, updateTask } from "./storage.js";
import { buildCalendarCells, getMonthLabel } from "./calendar.js";

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

const priorityLabels = { high: "高", medium: "中", low: "低" };

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getRemainingInfo = (dueDate) => {
  const due = parseDate(dueDate);
  if (!due) {
    return { label: "未设置", state: "none" };
  }
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((due - start) / 86400000);
  if (diffDays < 0) {
    return { label: `已过期 ${Math.abs(diffDays)} 天`, state: "overdue" };
  }
  if (diffDays === 0) {
    return { label: "今天到期", state: "today" };
  }
  return { label: `剩余 ${diffDays} 天`, state: "future" };
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

const buildYearOptions = () => {
  const currentYear = state.calendarDate.getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 5;
  els.yearSelect.innerHTML = "";

  for (let year = startYear; year <= endYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `${year} 年`;
    els.yearSelect.appendChild(option);
  }
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

const loadLists = async () => {
  state.lists = await getLists();
  buildListOptions();
  const saved = localStorage.getItem("calendarListId");
  const isValid = saved && state.lists.some((list) => list.id === saved);
  state.selectedListId = isValid ? saved : "all";
  els.listSelect.value = state.selectedListId;
};

const loadTasks = async () => {
  if (state.selectedListId === "all") {
    state.tasks = await getAllTasks();
  } else {
    state.tasks = await getTasksByList(state.selectedListId);
  }
};

const renderCalendar = () => {
  const viewDate = state.calendarDate;
  const cells = buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth());
  els.calendarMonthLabel.textContent = getMonthLabel(viewDate);
  els.yearSelect.value = String(viewDate.getFullYear());
  els.monthSelect.value = String(viewDate.getMonth() + 1);

  const counts = state.tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    acc[task.dueDate] = (acc[task.dueDate] || 0) + 1;
    return acc;
  }, {});

  els.calendarGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  cells.forEach((cell) => {
    const item = document.createElement("div");
    item.className = "calendar-cell";
    if (!cell.isCurrentMonth) item.classList.add("inactive");
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

const createTaskElement = (task, listMap, showListName) => {
  const item = document.createElement("li");
  item.className = "task-item simple";
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;

  const left = document.createElement("div");
  left.className = "task-left";
  left.appendChild(checkbox);

  const textWrap = document.createElement("div");
  textWrap.className = "task-main";

  const titleRow = document.createElement("div");
  titleRow.className = "task-title";
  titleRow.textContent = task.title;

  const noteRow = document.createElement("div");
  noteRow.className = "task-note";
  noteRow.textContent = task.note || "暂无备注";

  const metaRow = document.createElement("div");
  metaRow.className = "task-meta";

  if (showListName) {
    const listPill = document.createElement("span");
    listPill.className = "pill";
    listPill.textContent = listMap.get(task.listId) || "未命名列表";
    metaRow.appendChild(listPill);
  }

  const dueText = task.dueDate ? `截止 ${task.dueDate}` : "无截止日期";
  const duePill = document.createElement("span");
  duePill.className = "pill";
  duePill.textContent = dueText;
  const priorityPill = document.createElement("span");
  priorityPill.className = "pill";
  priorityPill.dataset.priority = task.priority;
  priorityPill.textContent = priorityLabels[task.priority] || task.priority;

  const remainingInfo = getRemainingInfo(task.dueDate);
  const remainingTag = document.createElement("span");
  remainingTag.className = "task-remaining";
  remainingTag.dataset.state = remainingInfo.state;
  remainingTag.textContent = remainingInfo.label;

  const dot = document.createElement("span");
  dot.textContent = " · ";

  metaRow.appendChild(duePill);
  metaRow.appendChild(dot);
  metaRow.appendChild(priorityPill);
  metaRow.appendChild(dot.cloneNode(true));
  metaRow.appendChild(remainingTag);

  textWrap.appendChild(titleRow);
  textWrap.appendChild(noteRow);
  textWrap.appendChild(metaRow);
  left.appendChild(textWrap);
  item.appendChild(left);

  if (task.completed) {
    titleRow.style.textDecoration = "line-through";
    titleRow.style.opacity = 0.6;
  }

  return item;
};

const renderCalendarTasks = () => {
  els.calendarTaskList.innerHTML = "";
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

const refresh = async () => {
  await loadTasks();
  renderCalendar();
  renderCalendarTasks();
};

const handleTaskCheckbox = async (event) => {
  if (!event.target.matches(".task-check")) return;
  const item = event.target.closest(".task-item");
  if (!item) return;
  const task = state.tasks.find((t) => t.id === item.dataset.id);
  if (!task) return;
  const completed = event.target.checked;
  await updateTask({
    ...task,
    completed,
    completedAt: completed ? Date.now() : 0,
  });
  await refresh();
};

const bindEvents = () => {
  els.themeToggle.addEventListener("change", () => {
    const next = els.themeToggle.checked ? "dark" : "light";
    applyTheme(next);
  });

  els.listSelect.addEventListener("change", async () => {
    state.selectedListId = els.listSelect.value;
    localStorage.setItem("calendarListId", state.selectedListId);
    state.selectedDate = null;
    await refresh();
  });

  const updateCalendarFromSelect = () => {
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

const init = async () => {
  initTheme();
  buildYearOptions();
  await loadLists();
  await refresh();
  bindEvents();
};

init();
