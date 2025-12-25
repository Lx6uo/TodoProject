import {
  addList,
  addTask,
  clearCompletedTasks,
  deleteList,
  deleteTask,
  getLists,
  getTasksByList,
  updateList,
  updateTask,
  updateTaskOrders,
} from "./storage.js";

const state = {
  lists: [],
  tasks: [],
  currentListId: null,
  filterStatus: localStorage.getItem("filterStatus") || "all",
  sortBy: localStorage.getItem("sortBy") || "manual",
  searchQuery: "",
  editingTaskId: null,
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
  dragHint: document.getElementById("dragHint"),
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
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

    const actions = document.createElement("div");
    actions.className = "list-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.dataset.action = "rename";
    renameBtn.textContent = "重命名";
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.action = "delete";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "删除";
    actions.appendChild(deleteBtn);

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

const setDragHint = (canDrag) => {
  if (canDrag) {
    els.dragHint.textContent = "在手动排序下可拖拽调整顺序。";
  } else {
    els.dragHint.textContent = "切换到“状态：全部 + 排序：手动”后可拖拽排序。";
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

const canDragTasks = () =>
  state.filterStatus === "all" && state.sortBy === "manual" && !state.searchQuery;

const createTaskElement = (task, dragEnabled) => {
  const item = document.createElement("li");
  item.className = "task-item";
  item.dataset.id = task.id;
  item.draggable = dragEnabled;

  const handle = document.createElement("div");
  handle.className = "drag-handle";
  handle.textContent = "⋮⋮";

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

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "编辑";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "删除";

  const reorderWrap = document.createElement("div");
  reorderWrap.className = "reorder";

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.dataset.action = "up";
  upBtn.textContent = "↑";

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.dataset.action = "down";
  downBtn.textContent = "↓";

  reorderWrap.appendChild(upBtn);
  reorderWrap.appendChild(downBtn);

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  actions.appendChild(reorderWrap);

  item.appendChild(handle);
  item.appendChild(left);
  item.appendChild(actions);

  if (task.completed) {
    item.classList.add("completed");
    titleRow.style.textDecoration = "line-through";
    titleRow.style.opacity = 0.6;
  }

  return item;
};

const renderTasks = () => {
  els.taskList.innerHTML = "";
  const dragEnabled = canDragTasks();
  const visibleTasks = sortTasks(filterTasks(state.tasks));

  setDragHint(dragEnabled);
  els.taskList.dataset.drag = dragEnabled ? "true" : "false";

  if (!visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "当前视图暂无任务。";
    els.taskList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleTasks.forEach((task) => {
    const item = createTaskElement(task, dragEnabled);
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

const refreshTasks = async () => {
  await loadTasks();
  renderAll();
};

const renderAll = () => {
  updateCurrentListName();
  renderLists();
  renderStats();
  renderTasks();
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

  await refreshTasks();
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
      await refreshTasks();
    }
  }

  if (button?.dataset.action === "up") {
    await moveTask(taskId, -1);
  }

  if (button?.dataset.action === "down") {
    await moveTask(taskId, 1);
  }
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
  await refreshTasks();
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
  await refreshTasks();
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
};

const handleDragStart = (event) => {
  if (els.taskList.dataset.drag !== "true") return;
  const item = event.target.closest(".task-item");
  if (!item) return;
  if (!event.target.closest(".drag-handle")) {
    event.preventDefault();
    return;
  }
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", item.dataset.id);
};

const handleDragEnd = async (event) => {
  const item = event.target.closest(".task-item");
  if (item) item.classList.remove("dragging");
  if (els.taskList.dataset.drag !== "true") return;

  const orderedIds = Array.from(els.taskList.querySelectorAll(".task-item"))
    .filter((node) => node.dataset.id)
    .map((node) => node.dataset.id);

  await updateTaskOrders(state.currentListId, orderedIds);
  await refreshTasks();
};

const getDragAfterElement = (container, y) => {
  const draggableElements = [
    ...container.querySelectorAll(".task-item:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
};

const handleDragOver = (event) => {
  if (els.taskList.dataset.drag !== "true") return;
  event.preventDefault();
  const afterElement = getDragAfterElement(els.taskList, event.clientY);
  const dragging = document.querySelector(".dragging");
  if (!dragging) return;

  if (afterElement == null) {
    els.taskList.appendChild(dragging);
  } else {
    els.taskList.insertBefore(dragging, afterElement);
  }
};

const bindEvents = () => {
  els.themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
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
    await refreshTasks();
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
  els.taskList.addEventListener("dragstart", handleDragStart);
  els.taskList.addEventListener("dragend", handleDragEnd);
  els.taskList.addEventListener("dragover", handleDragOver);
};

const init = async () => {
  initTheme();
  await loadLists();
  await loadTasks();
  renderAll();
  clearForm();
  bindEvents();
};

init();
