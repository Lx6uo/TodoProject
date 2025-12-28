const DB_NAME = "todo-studio";
const DB_VERSION = 2;
let dbPromise;

// 获取当前时间戳
const timeNow = () => Date.now();

// 生成唯一 ID
const createId = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${timeNow()}-${Math.random().toString(16).slice(2)}`;
};

// 将 IndexedDB 请求封装成 Promise
const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// 等待事务完成
const transactionDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const DEFAULT_EVENT_STACKS = { undo: [], redo: [] };

// 构建任务事件对象
const buildTaskEvent = (type, before, after, createdAt = timeNow()) => ({
  id: createId(),
  type,
  taskId: after?.id || before?.id || "",
  listId: after?.listId || before?.listId || null,
  before: before || null,
  after: after || null,
  createdAt,
});

// 构建撤销/重做事件对象
const buildActionEvent = (type, targetEvent) => {
  const title = targetEvent?.after?.title || targetEvent?.before?.title || "未命名任务";
  return {
    id: createId(),
    type,
    targetEventId: targetEvent?.id || "",
    targetType: targetEvent?.type || "",
    targetTitle: title,
    taskId: targetEvent?.taskId || "",
    listId:
      targetEvent?.listId ||
      targetEvent?.after?.listId ||
      targetEvent?.before?.listId ||
      null,
    createdAt: timeNow(),
  };
};

// 读取撤销/重做栈
const readEventStacks = async (metaStore) => {
  const entry = await requestToPromise(metaStore.get("eventStacks"));
  const value = entry?.value || DEFAULT_EVENT_STACKS;
  return {
    undo: Array.isArray(value.undo) ? [...value.undo] : [],
    redo: Array.isArray(value.redo) ? [...value.redo] : [],
  };
};

// 写入撤销/重做栈
const writeEventStacks = (metaStore, stacks) =>
  metaStore.put({ key: "eventStacks", value: stacks });

// 追加事件并更新栈
const pushEventToStacks = (eventStore, metaStore, event, stacks) => {
  eventStore.put(event);
  stacks.undo.push(event.id);
  stacks.redo = [];
  writeEventStacks(metaStore, stacks);
};

// 打开数据库并初始化结构
export const openDB = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      // 首次或升级时创建对象仓库与索引
      const db = request.result;
      if (!db.objectStoreNames.contains("lists")) {
        const listStore = db.createObjectStore("lists", { keyPath: "id" });
        listStore.createIndex("order", "order", { unique: false });
      }
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("listId", "listId", { unique: false });
        taskStore.createIndex("dueDate", "dueDate", { unique: false });
        taskStore.createIndex("completed", "completed", { unique: false });
        taskStore.createIndex("completedAt", "completedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("events")) {
        const eventStore = db.createObjectStore("events", { keyPath: "id" });
        eventStore.createIndex("createdAt", "createdAt", { unique: false });
        eventStore.createIndex("type", "type", { unique: false });
        eventStore.createIndex("listId", "listId", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

// 获取所有列表
export const getLists = async () => {
  const db = await openDB();
  const store = db.transaction("lists").objectStore("lists");
  return requestToPromise(store.getAll());
};

// 新增列表
export const addList = async (name) => {
  const db = await openDB();
  const now = timeNow();
  const list = {
    id: createId(),
    name: name.trim(),
    order: now,
    createdAt: now,
    updatedAt: now,
  };
  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(list);
  await transactionDone(tx);
  return list;
};

// 更新列表
export const updateList = async (list) => {
  const db = await openDB();
  const updated = { ...list, updatedAt: timeNow() };
  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(updated);
  await transactionDone(tx);
  return updated;
};

// 删除列表及其任务
export const deleteList = async (listId) => {
  const db = await openDB();
  const tx = db.transaction(["lists", "tasks"], "readwrite");
  tx.objectStore("lists").delete(listId);
  const taskStore = tx.objectStore("tasks");
  const index = taskStore.index("listId");
  const tasks = await requestToPromise(index.getAll(listId));
  tasks.forEach((task) => taskStore.delete(task.id));
  await transactionDone(tx);
};

// 获取某列表任务
export const getTasksByList = async (listId) => {
  const db = await openDB();
  const store = db.transaction("tasks").objectStore("tasks");
  if (!listId) {
    return requestToPromise(store.getAll());
  }
  return requestToPromise(store.index("listId").getAll(listId));
};

// 获取全部任务
export const getAllTasks = async () => {
  const db = await openDB();
  return requestToPromise(db.transaction("tasks").objectStore("tasks").getAll());
};

// 获取全部事件
export const getAllEvents = async () => {
  const db = await openDB();
  return requestToPromise(db.transaction("events").objectStore("events").getAll());
};

// 读取撤销/重做栈
export const getEventStacks = async () => {
  const db = await openDB();
  const store = db.transaction("meta").objectStore("meta");
  const entry = await requestToPromise(store.get("eventStacks"));
  if (!entry?.value) {
    return { ...DEFAULT_EVENT_STACKS };
  }
  return {
    undo: Array.isArray(entry.value.undo) ? entry.value.undo : [],
    redo: Array.isArray(entry.value.redo) ? entry.value.redo : [],
  };
};

// 获取所有 meta 数据
const getAllMeta = async () => {
  const db = await openDB();
  const store = db.transaction("meta").objectStore("meta");
  const entries = await requestToPromise(store.getAll());
  return entries.reduce((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {});
};

// 导出全量数据
export const exportData = async () => {
  const [lists, tasks, events, meta] = await Promise.all([
    getLists(),
    getAllTasks(),
    getAllEvents(),
    getAllMeta(),
  ]);
  return {
    version: 2,
    exportedAt: timeNow(),
    lists,
    tasks,
    events,
    meta,
  };
};

// 导入数据（合并或覆盖）
export const importData = async (payload, mode = "merge") => {
  if (!payload || !Array.isArray(payload.lists) || !Array.isArray(payload.tasks)) {
    throw new Error("导入数据格式不正确");
  }
  const events = Array.isArray(payload.events) ? payload.events : [];
  const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
  const db = await openDB();
  const tx = db.transaction(["lists", "tasks", "events", "meta"], "readwrite");
  const listStore = tx.objectStore("lists");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");

  // 覆盖模式清空旧数据
  if (mode === "replace") {
    listStore.clear();
    taskStore.clear();
    eventStore.clear();
    metaStore.clear();
  }

  payload.lists.forEach((list) => listStore.put(list));
  payload.tasks.forEach((task) => taskStore.put(task));
  events.forEach((event) => eventStore.put(event));
  Object.entries(meta).forEach(([key, value]) => {
    if (key !== "eventStacks") {
      metaStore.put({ key, value });
    }
  });
  // 导入后重置撤销重做栈
  metaStore.put({ key: "eventStacks", value: { undo: [], redo: [] } });

  await transactionDone(tx);
};

// 新增任务并记录事件
export const addTask = async (task) => {
  const db = await openDB();
  const now = timeNow();
  const payload = {
    id: createId(),
    completed: false,
    completedAt: 0,
    createdAt: now,
    updatedAt: now,
    ...task,
  };
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  taskStore.put(payload);
  const stacks = await readEventStacks(metaStore);
  const event = buildTaskEvent("task.create", null, payload, now);
  pushEventToStacks(eventStore, metaStore, event, stacks);
  await transactionDone(tx);
  return payload;
};

// 更新任务并记录事件
export const updateTask = async (task, eventType = "task.edit") => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const before = await requestToPromise(taskStore.get(task.id));
  if (!before) {
    await transactionDone(tx);
    return null;
  }
  const updated = { ...before, ...task, updatedAt: timeNow() };
  taskStore.put(updated);
  const stacks = await readEventStacks(metaStore);
  const event = buildTaskEvent(eventType, before, updated);
  pushEventToStacks(eventStore, metaStore, event, stacks);
  await transactionDone(tx);
  return updated;
};

// 切换任务完成状态并记录事件
export const toggleTaskCompletion = async (taskId, completed) => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const before = await requestToPromise(taskStore.get(taskId));
  if (!before) {
    await transactionDone(tx);
    return null;
  }
  const now = timeNow();
  const updated = {
    ...before,
    completed,
    completedAt: completed ? now : 0,
    updatedAt: now,
  };
  taskStore.put(updated);
  const stacks = await readEventStacks(metaStore);
  const event = buildTaskEvent(
    completed ? "task.complete" : "task.reopen",
    before,
    updated,
    now
  );
  pushEventToStacks(eventStore, metaStore, event, stacks);
  await transactionDone(tx);
  return updated;
};

// 删除任务并记录事件
export const deleteTask = async (taskId) => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const before = await requestToPromise(taskStore.get(taskId));
  if (!before) {
    await transactionDone(tx);
    return;
  }
  taskStore.delete(taskId);
  const stacks = await readEventStacks(metaStore);
  const event = buildTaskEvent("task.delete", before, null);
  pushEventToStacks(eventStore, metaStore, event, stacks);
  await transactionDone(tx);
};

// 根据事件应用撤销/重做
const applyEventChange = (taskStore, event, direction) => {
  const isUndo = direction === "undo";
  const before = event.before;
  const after = event.after;
  switch (event.type) {
    case "task.create":
      if (isUndo) {
        taskStore.delete(event.taskId);
      } else if (after) {
        taskStore.put(after);
      }
      break;
    case "task.delete":
      if (isUndo && before) {
        taskStore.put(before);
      } else {
        taskStore.delete(event.taskId);
      }
      break;
    case "task.edit":
    case "task.complete":
    case "task.reopen":
      if (isUndo && before) {
        taskStore.put(before);
      } else if (after) {
        taskStore.put(after);
      }
      break;
    default:
      break;
  }
};

// 撤销最近事件
export const undoLastEvent = async () => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const stacks = await readEventStacks(metaStore);
  const targetId = stacks.undo.pop();
  if (!targetId) {
    await transactionDone(tx);
    return null;
  }
  const targetEvent = await requestToPromise(eventStore.get(targetId));
  if (!targetEvent) {
    await transactionDone(tx);
    return null;
  }
  // 按事件回滚数据
  applyEventChange(taskStore, targetEvent, "undo");
  stacks.redo.push(targetId);
  writeEventStacks(metaStore, stacks);
  eventStore.put(buildActionEvent("action.undo", targetEvent));
  await transactionDone(tx);
  return targetEvent;
};

// 重做最近事件
export const redoLastEvent = async () => {
  const db = await openDB();
  const tx = db.transaction(["tasks", "events", "meta"], "readwrite");
  const taskStore = tx.objectStore("tasks");
  const eventStore = tx.objectStore("events");
  const metaStore = tx.objectStore("meta");
  const stacks = await readEventStacks(metaStore);
  const targetId = stacks.redo.pop();
  if (!targetId) {
    await transactionDone(tx);
    return null;
  }
  const targetEvent = await requestToPromise(eventStore.get(targetId));
  if (!targetEvent) {
    await transactionDone(tx);
    return null;
  }
  // 按事件前进数据
  applyEventChange(taskStore, targetEvent, "redo");
  stacks.undo.push(targetId);
  writeEventStacks(metaStore, stacks);
  eventStore.put(buildActionEvent("action.redo", targetEvent));
  await transactionDone(tx);
  return targetEvent;
};
