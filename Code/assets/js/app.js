import {
  addList,
  addTask,
  deleteList,
  deleteTask,
  exportData,
  getEventStacks,
  getAllEvents,
  getLists,
  getTasksByList,
  importData,
  updateList,
  updateTask,
  toggleTaskCompletion,
  undoLastEvent,
  redoLastEvent,
} from "./storage.js";
import { renderListOptions } from "./list-ui.js";
import { buildTaskMain, createRemainingTag } from "./task-ui.js";
import { bindThemeToggle, initTheme } from "./theme.js";

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

// 分页控制器实例
const pagers = {
  task: null,
  event: null,
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
  taskPageSize: document.getElementById("taskPageSize"),
  taskPrevPage: document.getElementById("taskPrevPage"),
  taskNextPage: document.getElementById("taskNextPage"),
  taskPageInfo: document.getElementById("taskPageInfo"),
  eventLogList: document.getElementById("eventLogList"),
  eventPageSize: document.getElementById("eventPageSize"),
  eventPrevPage: document.getElementById("eventPrevPage"),
  eventNextPage: document.getElementById("eventNextPage"),
  eventPageInfo: document.getElementById("eventPageInfo"),
};

// 按顺序字段排序列表
const sortLists = (lists) => [...lists].sort((a, b) => a.order - b.order);

// 按手动顺序排序任务
const sortTasksManual = (tasks) =>
  [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const priorityOrder = { high: 0, medium: 1, low: 2 };
const eventLabels = {
  "task.create": "新建任务",
  "task.edit": "编辑任务",
  "task.complete": "完成任务",
  "task.reopen": "重新开启任务",
  "task.delete": "删除任务",
  "action.undo": "撤销",
  "action.redo": "重做",
};

// 打开任务弹窗
const openTaskModal = (title) => {
  els.taskModalTitle.textContent = title;
  els.taskModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

// 按当前设置排序任务
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

// 判断任务是否匹配搜索词
const matchesSearch = (task) => {
  if (!state.searchQuery) return true;
  const term = state.searchQuery.toLowerCase();
  return (
    task.title.toLowerCase().includes(term) ||
    (task.note || "").toLowerCase().includes(term)
  );
};

// 按状态与搜索过滤任务
const filterTasks = (tasks) => {
  return tasks.filter((task) => {
    if (state.filterStatus === "active" && task.completed) return false;
    if (state.filterStatus === "completed" && !task.completed) return false;
    return matchesSearch(task);
  });
};

// 切换当前列表并刷新
const setCurrentList = async (listId) => {
  state.currentListId = listId;
  localStorage.setItem("currentListId", listId);
  if (pagers.task) {
    pagers.task.resetPage();
  }
  await loadTasks();
  renderAll();
};

// 加载列表并设置当前列表
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

// 加载当前列表的任务
const loadTasks = async () => {
  if (!state.currentListId) return;
  state.tasks = await getTasksByList(state.currentListId);
};

// 加载事件日志并按时间倒序
const loadEventLog = async () => {
  // 事件日志需要完整列表以支持分页
  const events = await getAllEvents();
  state.eventLog = events.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

// 加载撤销重做栈
const loadEventStacks = async () => {
  state.eventStacks = await getEventStacks();
};

// 渲染左侧列表
const renderLists = () => {
  clearElement(els.listContainer);
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
  renderListOptions(els.taskListSelect, state.lists, {
    selectedValue: state.currentListId,
  });
};

// 更新当前列表名称显示
const updateCurrentListName = () => {
  const currentList = state.lists.find((list) => list.id === state.currentListId);
  els.currentListName.textContent = currentList ? currentList.name : "-";
};

// 更新排序提示文案
const setReorderHint = (canReorder) => {
  if (canReorder) {
    els.reorderHint.textContent = "使用上下箭头可调整任务顺序。";
  } else {
    els.reorderHint.textContent = "切换到“状态：全部 + 排序：手动”后可调整顺序。";
  }
};

// 清空节点内容
const clearElement = (element) => {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

// 通用分页切片
const paginateItems = (items, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
  };
};

// 同步分页按钮与文案
const updatePaginationControls = (page, totalPages, prevBtn, nextBtn, infoEl) => {
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;
  if (infoEl) infoEl.textContent = `第 ${page} / ${totalPages} 页`;
};

// 创建分页控制器
const createPager = (options) => {
  const {
    container,
    pageSizeKey,
    pageSizeSelect,
    prevBtn,
    nextBtn,
    infoEl,
    emptyText,
    emptyClass,
    renderItems,
  } = options;
  let page = 1;
  let pageSize = Number(localStorage.getItem(pageSizeKey)) || 10;
  let items = [];
  let context = {};

  const render = () => {
    if (!container) return;
    clearElement(container);
    const paged = paginateItems(items, page, pageSize);
    page = paged.currentPage;
    updatePaginationControls(
      paged.currentPage,
      paged.totalPages,
      prevBtn,
      nextBtn,
      infoEl
    );
    if (!items.length) {
      if (emptyText) {
        const empty = document.createElement("li");
        empty.className = emptyClass;
        empty.textContent = emptyText;
        container.appendChild(empty);
      }
      return;
    }
    renderItems(paged.items, container, context);
  };

  const setItems = (nextItems, nextContext = {}) => {
    items = nextItems;
    context = nextContext;
    render();
  };

  const resetPage = () => {
    page = 1;
  };

  const bind = () => {
    if (pageSizeSelect) {
      pageSizeSelect.value = String(pageSize);
      pageSizeSelect.addEventListener("change", () => {
        pageSize = Number(pageSizeSelect.value);
        localStorage.setItem(pageSizeKey, pageSize);
        page = 1;
        render();
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        page = Math.max(1, page - 1);
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        page += 1;
        render();
      });
    }
  };

  return { setItems, resetPage, bind, render };
};

// 渲染任务分页条目
const renderTaskItems = (items, container, context) => {
  const fragment = document.createDocumentFragment();
  items.forEach((task) => {
    const item = createTaskElement(task, context.reorderEnabled);
    fragment.appendChild(item);
  });
  container.appendChild(fragment);
};

// 渲染事件分页条目
const renderEventItems = (items, container) => {
  const fragment = document.createDocumentFragment();
  items.forEach((event) => {
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
  container.appendChild(fragment);
};

// 初始化分页控制器
const initPagers = () => {
  pagers.task = createPager({
    container: els.taskList,
    pageSizeKey: "taskPageSize",
    pageSizeSelect: els.taskPageSize,
    prevBtn: els.taskPrevPage,
    nextBtn: els.taskNextPage,
    infoEl: els.taskPageInfo,
    emptyText: "当前视图暂无任务。",
    emptyClass: "task-item",
    renderItems: renderTaskItems,
  });
  pagers.event = createPager({
    container: els.eventLogList,
    pageSizeKey: "eventPageSize",
    pageSizeSelect: els.eventPageSize,
    prevBtn: els.eventPrevPage,
    nextBtn: els.eventNextPage,
    infoEl: els.eventPageInfo,
    emptyText: "暂无操作记录。",
    emptyClass: "event-item",
    renderItems: renderEventItems,
  });
  pagers.task.bind();
  pagers.event.bind();
};
// 统计任务数量与完成率
const getTaskStats = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = total - completed;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, active, rate };
};

// 渲染统计卡片
const renderStats = () => {
  const stats = getTaskStats(state.tasks);
  const cards = [
    { label: "任务总数", value: stats.total },
    { label: "进行中", value: stats.active },
    { label: "已完成", value: `${stats.completed}（${stats.rate}%）` },
  ];

  clearElement(els.statsSummary);
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

// 格式化事件时间
const formatEventTime = (timestamp) =>
  new Date(timestamp).toLocaleString("zh-CN", { hour12: false });

// 生成事件标题
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

// 渲染事件日志列表
const renderEventLog = () => {
  if (!pagers.event) return;
  pagers.event.setItems(state.eventLog);
};

// 更新撤销/重做按钮状态
const updateUndoRedoButtons = () => {
  if (!els.undoBtn || !els.redoBtn) return;
  els.undoBtn.disabled = !state.eventStacks.undo.length;
  els.redoBtn.disabled = !state.eventStacks.redo.length;
};

// 判断是否允许手动排序
const canReorderTasks = () =>
  state.filterStatus === "all" && state.sortBy === "manual" && !state.searchQuery;

// 生成任务条目 DOM
const createTaskElement = (task, reorderEnabled) => {
  const item = document.createElement("li");
  item.className = "task-item";
  item.dataset.id = task.id;

  const { left } = buildTaskMain(task);
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

  const remainingTag = createRemainingTag(task.dueDate);

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

  return item;
};

// 渲染任务列表
const renderTasks = () => {
  const reorderEnabled = canReorderTasks();
  const visibleTasks = sortTasks(filterTasks(state.tasks));

  setReorderHint(reorderEnabled);
  if (pagers.task) {
    pagers.task.setItems(visibleTasks, { reorderEnabled });
  }
};

// 从表单读取任务数据
const getTaskFormPayload = () => {
  const title = els.taskTitle.value.trim();
  if (!title) return null;
  return {
    title,
    note: els.taskNote.value.trim(),
    priority: els.taskPriority.value,
    dueDate: els.taskDueDate.value || null,
    listId: els.taskListSelect.value || state.currentListId,
  };
};

// 填充任务表单（null 为新建）
const fillTaskForm = (task) => {
  if (!task) {
    els.taskForm.reset();
    els.taskPriority.value = "medium";
    els.taskListSelect.value = state.currentListId;
    state.editingTaskId = null;
    els.taskSubmitBtn.textContent = "添加任务";
    return;
  }
  state.editingTaskId = task.id;
  els.taskTitle.value = task.title;
  els.taskNote.value = task.note || "";
  els.taskPriority.value = task.priority || "medium";
  els.taskDueDate.value = task.dueDate || "";
  els.taskListSelect.value = task.listId || state.currentListId;
  els.taskSubmitBtn.textContent = "更新任务";
};

// 重置表单状态
const clearForm = () => {
  fillTaskForm(null);
};

// 关闭弹窗并清理状态
const closeTaskModal = () => {
  els.taskModal.classList.add("hidden");
  document.body.style.overflow = "";
  clearForm();
};

// 打开新建任务弹窗
const openNewTaskModal = () => {
  clearForm();
  openTaskModal("新建任务");
  els.taskTitle.focus();
};

// 进入编辑任务
const startEditTask = (task) => {
  fillTaskForm(task);
  els.taskTitle.focus();
  openTaskModal("编辑任务");
};

// 重新加载数据并渲染
const refreshAll = async () => {
  await loadTasks();
  await loadEventLog();
  await loadEventStacks();
  renderAll();
};

// 全量渲染页面
const renderAll = () => {
  updateCurrentListName();
  renderLists();
  renderStats();
  renderTasks();
  renderEventLog();
  updateUndoRedoButtons();
};

// 处理表单提交（新增/更新）
const handleFormSubmit = async (event) => {
  event.preventDefault();
  const payload = getTaskFormPayload();
  if (!payload) return;

  // 计算目标列表的新顺序
  const tasksForList = await getTasksByList(payload.listId);
  const nextOrder = tasksForList.length
    ? Math.max(...tasksForList.map((task) => task.order ?? 0)) + 1
    : 0;

  if (state.editingTaskId) {
    const existing = state.tasks.find((task) => task.id === state.editingTaskId);
    if (!existing) return;
    // 同列表保留原顺序，跨列表则使用末尾顺序
    const order = existing.listId === payload.listId ? existing.order : nextOrder;
    const updated = {
      ...existing,
      ...payload,
      order,
    };
    await updateTask(updated);
  } else {
    await addTask({
      ...payload,
      order: nextOrder,
    });
  }

  await refreshAll();
  closeTaskModal();
};

// 处理任务列表按钮点击
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

// 调整列表顺序
const moveList = async (listId, direction) => {
  const ordered = sortLists(state.lists);
  const index = ordered.findIndex((list) => list.id === listId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const current = ordered[index];
  const target = ordered[targetIndex];
  // 交换顺序值
  const temp = current.order;
  current.order = target.order;
  target.order = temp;

  await updateList(current);
  await updateList(target);
  await loadLists();
  renderLists();
  updateCurrentListName();
};

// 调整任务顺序
const moveTask = async (taskId, direction) => {
  const ordered = sortTasksManual(state.tasks);
  const index = ordered.findIndex((task) => task.id === taskId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const current = ordered[index];
  const target = ordered[targetIndex];
  // 交换顺序值
  const temp = current.order;
  current.order = target.order;
  target.order = temp;

  await updateTask(current);
  await updateTask(target);
  await refreshAll();
};

// 切换任务完成状态
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

// 处理列表区按钮事件
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

// 绑定页面事件
const bindEvents = () => {
  bindThemeToggle(els.themeToggle);

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
    if (pagers.task) {
      pagers.task.resetPage();
    }
    renderTasks();
  });

  els.sortSelect.addEventListener("change", () => {
    state.sortBy = els.sortSelect.value;
    localStorage.setItem("sortBy", state.sortBy);
    if (pagers.task) {
      pagers.task.resetPage();
    }
    renderTasks();
  });

  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value.trim();
    if (pagers.task) {
      pagers.task.resetPage();
    }
    renderTasks();
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
    link.download = `备份-${stamp}.json`;
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

// 初始化入口
const init = async () => {
  initTheme(els.themeToggle);
  initPagers();
  await loadLists();
  await loadTasks();
  await loadEventLog();
  await loadEventStacks();
  renderAll();
  clearForm();
  bindEvents();
};

init();
