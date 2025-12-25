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
  calendarMonthLabel: document.getElementById("calendarMonthLabel"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarTaskList: document.getElementById("calendarTaskList"),
  calendarTaskTitle: document.getElementById("calendarTaskTitle"),
  clearDateFilter: document.getElementById("clearDateFilter"),
};

const priorityLabels = { high: "高", medium: "中", low: "低" };

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
};

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
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

  const dot = document.createElement("span");
  dot.textContent = " · ";

  metaRow.appendChild(duePill);
  metaRow.appendChild(dot);
  metaRow.appendChild(priorityPill);

  textWrap.appendChild(titleRow);
  textWrap.appendChild(noteRow);
  textWrap.appendChild(metaRow);
  left.appendChild(textWrap);
  item.appendChild(left);

  if (task.completed) {
    item.classList.add("completed");
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
  els.themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  els.listSelect.addEventListener("change", async () => {
    state.selectedListId = els.listSelect.value;
    localStorage.setItem("calendarListId", state.selectedListId);
    state.selectedDate = null;
    await refresh();
  });

  els.prevMonthBtn.addEventListener("click", () => {
    state.calendarDate = new Date(
      state.calendarDate.getFullYear(),
      state.calendarDate.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  els.nextMonthBtn.addEventListener("click", () => {
    state.calendarDate = new Date(
      state.calendarDate.getFullYear(),
      state.calendarDate.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  els.calendarGrid.addEventListener("click", (event) => {
    const cell = event.target.closest(".calendar-cell");
    if (!cell) return;
    state.selectedDate = cell.dataset.date;
    renderCalendar();
    renderCalendarTasks();
  });

  els.clearDateFilter.addEventListener("click", () => {
    state.selectedDate = null;
    renderCalendar();
    renderCalendarTasks();
  });

  els.calendarTaskList.addEventListener("change", handleTaskCheckbox);
};

const init = async () => {
  initTheme();
  await loadLists();
  await refresh();
  bindEvents();
};

init();
