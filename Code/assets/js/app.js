import {
  addList,
  addTask,
  clearCompletedTasks,
  deleteList,
  deleteTask,
  exportData,
  getEventStacks,
  getLists,
  getRecentEvents,
  getTasksByList,
  importData,
  updateList,
  updateTask,
  toggleTaskCompletion,
  undoLastEvent,
  redoLastEvent,
} from "./storage.js";

const state = {
  lists: [],
  tasks: [],
  currentListId: null,
  filterStatus: localStorage.getItem("filterStatus") || "all",
  sortBy: localStorage.getItem("sortBy") || "manual",
  searchQuery: "",
  editingTaskId: null,
  eventLog: [],
  eventStacks: { undo: [], redo: [] },
};

const els = {
  themeToggle: document.getElementById("themeToggle"),
  addListBtn: document.getElementById("addListBtn"),
  listContainer: document.getElementById("listContainer"),
  openTaskModalBtn: document.getElementById("openTaskModalBtn"),
  currentListName: document.getElementById("currentListName"),
  statusFilter: document.getElementById("statusFilter"),
  sortSelect: document.getElementById("sortSelect"),
  searchInput: document.getElementById("searchInput"),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  undoBtn: document.getElementById("undoBtn"),
  redoBtn: document.getElementById("redoBtn"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataBtn: document.getElementById("importDataBtn"),
  importFileInput: document.getElementById("importFileInput"),
  taskModal: document.getElementById("taskModal"),
  taskModalTitle: document.getElementById("taskModalTitle"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskNote: document.getElementById("taskNote"),
  taskPriority: document.getElementById("taskPriority"),
  taskDueDate: document.getElementById("taskDueDate"),
  taskListSelect: document.getElementById("taskListSelect"),
  taskSubmitBtn: document.getElementById("taskSubmitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  taskList: document.getElementById("taskList"),
  statsSummary: document.getElementById("statsSummary"),
  reorderHint: document.getElementById("reorderHint"),
  eventLogList: document.getElementById("eventLogList"),
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

const sortLists = (lists) => [...lists].sort((a, b) => a.order - b.order);

const sortTasksManual = (tasks) =>
  [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const priorityOrder = { high: 0, medium: 1, low: 2 };
const priorityLabels = { high: "高", medium: "中", low: "低" };
const eventLabels = {
  "task.create": "新建任务",
  "task.edit": "编辑任务",
  "task.complete": "完成任务",
  "task.reopen": "重新开启任务",
  "task.delete": "删除任务",
  "action.undo": "撤销",
  "action.redo": "重做",
};

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

const openTaskModal = (title) => {
  els.taskModalTitle.textContent = title;
  els.taskModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

const sortTasks = (tasks) => {
  if (state.sortBy === "priority") {
    return [...tasks].sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    );
  }

  if (state.sortBy === "dueDate") {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  return sortTasksManual(tasks);
};

const matchesSearch = (task) => {
  if (!state.searchQuery) return true;
  const term = state.searchQuery.toLowerCase();
  return (
    task.title.toLowerCase().includes(term) ||
    (task.note || "").toLowerCase().includes(term)
  );
};

const filterTasks = (tasks) => {
  return tasks.filter((task) => {
    if (state.filterStatus === "active" && task.completed) return false;
    if (state.filterStatus === "completed" && !task.completed) return false;
    return matchesSearch(task);
  });
};

const setCurrentList = async (listId) => {
  state.currentListId = listId;
  localStorage.setItem("currentListId", listId);
  await loadTasks();
  renderAll();
};

const loadLists = async () => {
  const lists = sortLists(await getLists());
  if (!lists.length) {
    const defaultList = await addList("我的任务");
    state.lists = [defaultList];
    state.currentListId = defaultList.id;
  } else {
    state.lists = lists;
    const savedListId = localStorage.getItem("currentListId");
    state.currentListId = lists.some((list) => list.id === savedListId)
      ? savedListId
      : lists[0].id;
  }
  localStorage.setItem("currentListId", state.currentListId);
};

const loadTasks = async () => {
  if (!state.currentListId) return;
  state.tasks = await getTasksByList(state.currentListId);
};

const loadEventLog = async () => {
  state.eventLog = await getRecentEvents(20);
};

const loadEventStacks = async () => {
  state.eventStacks = await getEventStacks();
};

const renderLists = () => {
  els.listContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.lists.forEach((list) => {
    const item = document.createElement("li");
    item.className = "list-item";
    if (list.id === state.currentListId) item.classList.add("active");
    item.dataset.id = list.id;

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "list-select";
    selectBtn.textContent = list.name;
    item.appendChild(selectBtn);

    const reorderWrap = document.createElement("div");
    reorderWrap.className = "list-reorder";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.dataset.action = "move-up";
    upBtn.className = "arrow-btn";
    upBtn.textContent = "↑";

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.dataset.action = "move-down";
    downBtn.className = "arrow-btn";
    downBtn.textContent = "↓";

    reorderWrap.appendChild(upBtn);
    reorderWrap.appendChild(downBtn);

    const actions = document.createElement("div");
    actions.className = "list-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.dataset.action = "rename";
    renameBtn.className = "list-action-btn";
    renameBtn.textContent = "重命名";
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.className = "list-action-btn danger";
    deleteBtn.textContent = "删除";
    actions.appendChild(deleteBtn);

    item.appendChild(reorderWrap);
    item.appendChild(actions);
    fragment.appendChild(item);
  });

  els.listContainer.appendChild(fragment);
  renderListSelectOptions();
};

const renderListSelectOptions = () => {
  els.taskListSelect.innerHTML = "";
  state.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    if (list.id === state.currentListId) option.selected = true;
    els.taskListSelect.appendChild(option);
  });
};

const updateCurrentListName = () => {
  const currentList = state.lists.find((list) => list.id === state.currentListId);
  els.currentListName.textContent = currentList ? currentList.name : "-";
};

const setReorderHint = (canReorder) => {
  if (canReorder) {
    els.reorderHint.textContent = "使用上下箭头可调整任务顺序。";
  } else {
    els.reorderHint.textContent = "切换到“状态：全部 + 排序：手动”后可调整顺序。";
  }
};

const getTaskStats = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = total - completed;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, active, rate };
};

const renderStats = () => {
  const stats = getTaskStats(state.tasks);
  const cards = [
    { label: "任务总数", value: stats.total },
    { label: "进行中", value: stats.active },
    { label: "已完成", value: `${stats.completed}（${stats.rate}%）` },
  ];

  els.statsSummary.innerHTML = "";
  cards.forEach((card) => {
    const item = document.createElement("div");
    item.className = "summary-card";
    const label = document.createElement("h3");
    label.textContent = card.label;
    const value = document.createElement("div");
    value.textContent = card.value;
    item.appendChild(label);
    item.appendChild(value);
    els.statsSummary.appendChild(item);
  });
};

const formatEventTime = (timestamp) =>
  new Date(timestamp).toLocaleString("zh-CN", { hour12: false });

const buildEventTitle = (event) => {
  if (!event) return "未知操作";
  if (event.type === "action.undo" || event.type === "action.redo") {
    const targetLabel = eventLabels[event.targetType] || "操作";
    const title = event.targetTitle || "未命名任务";
    return `${eventLabels[event.type]}：${targetLabel} · ${title}`;
  }
  const title = event.after?.title || event.before?.title || "未命名任务";
  return `${eventLabels[event.type] || "操作"} · ${title}`;
};

const renderEventLog = () => {
  if (!els.eventLogList) return;
  els.eventLogList.innerHTML = "";
  if (!state.eventLog.length) {
    const empty = document.createElement("li");
    empty.className = "event-item";
    empty.textContent = "暂无操作记录。";
    els.eventLogList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.eventLog.forEach((event) => {
    const item = document.createElement("li");
    item.className = "event-item";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = buildEventTitle(event);

    const time = document.createElement("div");
    time.className = "event-time";
    time.textContent = formatEventTime(event.createdAt);

    item.appendChild(title);
    item.appendChild(time);
    fragment.appendChild(item);
  });
  els.eventLogList.appendChild(fragment);
};

const updateUndoRedoButtons = () => {
  if (!els.undoBtn || !els.redoBtn) return;
  els.undoBtn.disabled = !state.eventStacks.undo.length;
  els.redoBtn.disabled = !state.eventStacks.redo.length;
};

const canReorderTasks = () =>
  state.filterStatus === "all" && state.sortBy === "manual" && !state.searchQuery;

const createTaskElement = (task, reorderEnabled) => {
  const item = document.createElement("li");
  item.className = "task-item";
  item.dataset.id = task.id;

  const titleRow = document.createElement("div");
  titleRow.className = "task-title";
  titleRow.textContent = task.title;

  const noteRow = document.createElement("div");
  noteRow.className = "task-note";
  noteRow.textContent = task.note || "暂无备注";

  const metaRow = document.createElement("div");
  metaRow.className = "task-meta";
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

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;

  const left = document.createElement("div");
  left.className = "task-left";
  left.appendChild(checkbox);

  const textWrap = document.createElement("div");
  textWrap.className = "task-main";
  textWrap.appendChild(titleRow);
  textWrap.appendChild(noteRow);
  textWrap.appendChild(metaRow);
  left.appendChild(textWrap);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const reorderWrap = document.createElement("div");
  reorderWrap.className = "reorder-stack";

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.dataset.action = "up";
  upBtn.className = "arrow-btn";
  upBtn.textContent = "↑";
  upBtn.disabled = !reorderEnabled;

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.dataset.action = "down";
  downBtn.className = "arrow-btn";
  downBtn.textContent = "↓";
  downBtn.disabled = !reorderEnabled;

  reorderWrap.appendChild(upBtn);
  reorderWrap.appendChild(downBtn);

  const remainingInfo = getRemainingInfo(task.dueDate);
  const remainingTag = document.createElement("div");
  remainingTag.className = "task-remaining";
  remainingTag.dataset.state = remainingInfo.state;
  remainingTag.textContent = remainingInfo.label;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "编辑";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "删除";

  actions.appendChild(remainingTag);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(reorderWrap);
  item.appendChild(left);
  item.appendChild(actions);

  if (task.completed) {
    titleRow.style.textDecoration = "line-through";
    titleRow.style.opacity = 0.6;
  }

  return item;
};

const renderTasks = () => {
  els.taskList.innerHTML = "";
  const reorderEnabled = canReorderTasks();
  const visibleTasks = sortTasks(filterTasks(state.tasks));

  setReorderHint(reorderEnabled);

  if (!visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "当前视图暂无任务。";
    els.taskList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleTasks.forEach((task) => {
    const item = createTaskElement(task, reorderEnabled);
    fragment.appendChild(item);
  });
  els.taskList.appendChild(fragment);
};

const clearForm = () => {
  els.taskForm.reset();
  els.taskPriority.value = "medium";
  els.taskListSelect.value = state.currentListId;
  state.editingTaskId = null;
  els.taskSubmitBtn.textContent = "添加任务";
};

const closeTaskModal = () => {
  els.taskModal.classList.add("hidden");
  document.body.style.overflow = "";
  clearForm();
};

const openNewTaskModal = () => {
  clearForm();
  openTaskModal("新建任务");
  els.taskTitle.focus();
};

const startEditTask = (task) => {
  state.editingTaskId = task.id;
  els.taskTitle.value = task.title;
  els.taskNote.value = task.note || "";
  els.taskPriority.value = task.priority || "medium";
  els.taskDueDate.value = task.dueDate || "";
  els.taskListSelect.value = task.listId;
  els.taskSubmitBtn.textContent = "更新任务";
  els.taskTitle.focus();
  openTaskModal("编辑任务");
};

const refreshAll = async () => {
  await loadTasks();
  await loadEventLog();
  await loadEventStacks();
  renderAll();
};

const renderAll = () => {
  updateCurrentListName();
  renderLists();
  renderStats();
  renderTasks();
  renderEventLog();
  updateUndoRedoButtons();
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const title = els.taskTitle.value.trim();
  if (!title) return;

  const listId = els.taskListSelect.value || state.currentListId;
  const tasksForList = await getTasksByList(listId);
  const nextOrder = tasksForList.length
    ? Math.max(...tasksForList.map((task) => task.order ?? 0)) + 1
    : 0;

  if (state.editingTaskId) {
    const existing = state.tasks.find((task) => task.id === state.editingTaskId);
    if (!existing) return;
    const order = existing.listId === listId ? existing.order : nextOrder;
    const updated = {
      ...existing,
      title,
      note: els.taskNote.value.trim(),
      priority: els.taskPriority.value,
      dueDate: els.taskDueDate.value || null,
      listId,
      order,
    };
    await updateTask(updated);
  } else {
    await addTask({
      title,
      note: els.taskNote.value.trim(),
      priority: els.taskPriority.value,
      dueDate: els.taskDueDate.value || null,
      listId,
      order: nextOrder,
    });
  }

  await refreshAll();
  closeTaskModal();
};

const handleTaskListClick = async (event) => {
  const button = event.target.closest("button");
  const item = event.target.closest(".task-item");
  if (!item) return;
  const taskId = item.dataset.id;
  const task = state.tasks.find((task) => task.id === taskId);
  if (!task) return;

  if (button?.dataset.action === "edit") {
    startEditTask(task);
  }

  if (button?.dataset.action === "delete") {
    if (confirm("确定删除该任务吗？")) {
      await deleteTask(taskId);
      await refreshAll();
    }
  }

  if (button?.dataset.action === "up") {
    await moveTask(taskId, -1);
  }

  if (button?.dataset.action === "down") {
    await moveTask(taskId, 1);
  }
};

const moveList = async (listId, direction) => {
  const ordered = sortLists(state.lists);
  const index = ordered.findIndex((list) => list.id === listId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const current = ordered[index];
  const target = ordered[targetIndex];
  const temp = current.order;
  current.order = target.order;
  target.order = temp;

  await updateList(current);
  await updateList(target);
  await loadLists();
  renderLists();
  updateCurrentListName();
};

const moveTask = async (taskId, direction) => {
  const ordered = sortTasksManual(state.tasks);
  const index = ordered.findIndex((task) => task.id === taskId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const current = ordered[index];
  const target = ordered[targetIndex];
  const temp = current.order;
  current.order = target.order;
  target.order = temp;

  await updateTask(current);
  await updateTask(target);
  await refreshAll();
};

const handleTaskCheckbox = async (event) => {
  if (!event.target.matches(".task-check")) return;
  const item = event.target.closest(".task-item");
  if (!item) return;
  const task = state.tasks.find((t) => t.id === item.dataset.id);
  if (!task) return;
  const completed = event.target.checked;
  await toggleTaskCompletion(task.id, completed);
  await refreshAll();
};

const handleListActions = async (event) => {
  const listItem = event.target.closest(".list-item");
  if (!listItem) return;
  const listId = listItem.dataset.id;
  const list = state.lists.find((item) => item.id === listId);
  if (!list) return;

  if (event.target.classList.contains("list-select")) {
    await setCurrentList(listId);
    return;
  }

  if (event.target.dataset.action === "rename") {
    const name = prompt("列表名称", list.name);
    if (name && name.trim()) {
      await updateList({ ...list, name: name.trim() });
      await loadLists();
      renderLists();
      updateCurrentListName();
    }
  }

  if (event.target.dataset.action === "delete") {
    if (confirm("确定删除该列表及其任务吗？")) {
      await deleteList(listId);
      await loadLists();
      await loadTasks();
      renderAll();
    }
  }

  if (event.target.dataset.action === "move-up") {
    await moveList(listId, -1);
  }

  if (event.target.dataset.action === "move-down") {
    await moveList(listId, 1);
  }
};

const bindEvents = () => {
  els.themeToggle.addEventListener("change", () => {
    const next = els.themeToggle.checked ? "dark" : "light";
    applyTheme(next);
  });

  els.openTaskModalBtn.addEventListener("click", openNewTaskModal);

  els.addListBtn.addEventListener("click", async () => {
    const name = prompt("列表名称");
    if (!name || !name.trim()) return;
    const list = await addList(name.trim());
    await loadLists();
    await setCurrentList(list.id);
  });

  els.listContainer.addEventListener("click", handleListActions);

  els.statusFilter.value = state.filterStatus;
  els.sortSelect.value = state.sortBy;

  els.statusFilter.addEventListener("change", () => {
    state.filterStatus = els.statusFilter.value;
    localStorage.setItem("filterStatus", state.filterStatus);
    renderTasks();
  });

  els.sortSelect.addEventListener("change", () => {
    state.sortBy = els.sortSelect.value;
    localStorage.setItem("sortBy", state.sortBy);
    renderTasks();
  });

  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value.trim();
    renderTasks();
  });

  els.clearCompletedBtn.addEventListener("click", async () => {
    if (!confirm("确定清理当前列表内已完成的任务吗？")) return;
    await clearCompletedTasks(state.currentListId);
    await refreshAll();
  });

  if (els.undoBtn) {
    els.undoBtn.addEventListener("click", async () => {
      const result = await undoLastEvent();
      if (result) {
        await refreshAll();
      }
    });
  }

  if (els.redoBtn) {
    els.redoBtn.addEventListener("click", async () => {
      const result = await redoLastEvent();
      if (result) {
        await refreshAll();
      }
    });
  }

  els.exportDataBtn.addEventListener("click", async () => {
    const data = await exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "")
      .replace("T", "-")
      .slice(0, 15);
    const link = document.createElement("a");
    link.href = url;
    link.download = `待办备份-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  els.importDataBtn.addEventListener("click", () => {
    els.importFileInput.value = "";
    els.importFileInput.click();
  });

  els.importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    let payload;
    try {
      payload = JSON.parse(content);
    } catch (error) {
      alert("导入失败：文件不是有效的 JSON。");
      return;
    }
    const replace = confirm("是否覆盖现有数据？确定=覆盖，取消=合并。");
    try {
      await importData(payload, replace ? "replace" : "merge");
      await loadLists();
      await refreshAll();
      alert("导入完成。");
    } catch (error) {
      alert("导入失败：数据格式不正确。");
    }
  });

  els.taskForm.addEventListener("submit", handleFormSubmit);
  els.cancelEditBtn.addEventListener("click", closeTaskModal);
  els.taskModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-modal") {
      closeTaskModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.taskModal.classList.contains("hidden")) {
      closeTaskModal();
    }
  });

  els.taskList.addEventListener("click", handleTaskListClick);
  els.taskList.addEventListener("change", handleTaskCheckbox);
};

const init = async () => {
  initTheme();
  await loadLists();
  await loadTasks();
  await loadEventLog();
  await loadEventStacks();
  renderAll();
  clearForm();
  bindEvents();
};

init();
