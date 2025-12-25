const DB_NAME = "todo-studio";
const DB_VERSION = 2;
let dbPromise;

const timeNow = () => Date.now();

const createId = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${timeNow()}-${Math.random().toString(16).slice(2)}`;
};

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const DEFAULT_EVENT_STACKS = { undo: [], redo: [] };

const buildTaskEvent = (type, before, after, createdAt = timeNow()) => ({
  id: createId(),
  type,
  taskId: after?.id || before?.id || "",
  listId: after?.listId || before?.listId || null,
  before: before || null,
  after: after || null,
  createdAt,
});

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

const readEventStacks = async (metaStore) => {
  const entry = await requestToPromise(metaStore.get("eventStacks"));
  const value = entry?.value || DEFAULT_EVENT_STACKS;
  return {
    undo: Array.isArray(value.undo) ? [...value.undo] : [],
    redo: Array.isArray(value.redo) ? [...value.redo] : [],
  };
};

const writeEventStacks = (metaStore, stacks) =>
  metaStore.put({ key: "eventStacks", value: stacks });

const pushEventToStacks = (eventStore, metaStore, event, stacks) => {
  eventStore.put(event);
  stacks.undo.push(event.id);
  stacks.redo = [];
  writeEventStacks(metaStore, stacks);
};

export const openDB = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
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

export const getLists = async () => {
  const db = await openDB();
  const store = db.transaction("lists").objectStore("lists");
  return requestToPromise(store.getAll());
};

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

export const updateList = async (list) => {
  const db = await openDB();
  const updated = { ...list, updatedAt: timeNow() };
  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(updated);
  await transactionDone(tx);
  return updated;
};

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

export const getTasksByList = async (listId) => {
  const db = await openDB();
  const store = db.transaction("tasks").objectStore("tasks");
  if (!listId) {
    return requestToPromise(store.getAll());
  }
  return requestToPromise(store.index("listId").getAll(listId));
};

export const getAllTasks = async () => {
  const db = await openDB();
  return requestToPromise(db.transaction("tasks").objectStore("tasks").getAll());
};

export const getAllEvents = async () => {
  const db = await openDB();
  return requestToPromise(db.transaction("events").objectStore("events").getAll());
};

export const getRecentEvents = async (limit = 20) => {
  const db = await openDB();
  const store = db.transaction("events").objectStore("events").index("createdAt");
  return new Promise((resolve, reject) => {
    const events = [];
    const request = store.openCursor(null, "prev");
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && events.length < limit) {
        events.push(cursor.value);
        cursor.continue();
      } else {
        resolve(events);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

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

const getAllMeta = async () => {
  const db = await openDB();
  const store = db.transaction("meta").objectStore("meta");
  const entries = await requestToPromise(store.getAll());
  return entries.reduce((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {});
};

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
  metaStore.put({ key: "eventStacks", value: { undo: [], redo: [] } });

  await transactionDone(tx);
};

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

export const clearCompletedTasks = async (listId) => {
  const tasks = await getTasksByList(listId);
  const completedTasks = tasks.filter((task) => task.completed);
  for (const task of completedTasks) {
    await deleteTask(task.id);
  }
  return completedTasks.length;
};

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
  applyEventChange(taskStore, targetEvent, "undo");
  stacks.redo.push(targetId);
  writeEventStacks(metaStore, stacks);
  eventStore.put(buildActionEvent("action.undo", targetEvent));
  await transactionDone(tx);
  return targetEvent;
};

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
  applyEventChange(taskStore, targetEvent, "redo");
  stacks.undo.push(targetId);
  writeEventStacks(metaStore, stacks);
  eventStore.put(buildActionEvent("action.redo", targetEvent));
  await transactionDone(tx);
  return targetEvent;
};
