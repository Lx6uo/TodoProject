const DB_NAME = "todo-studio";
const DB_VERSION = 1;
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
  const tx = db.transaction("tasks", "readwrite");
  tx.objectStore("tasks").put(payload);
  await transactionDone(tx);
  return payload;
};

export const updateTask = async (task) => {
  const db = await openDB();
  const updated = { ...task, updatedAt: timeNow() };
  const tx = db.transaction("tasks", "readwrite");
  tx.objectStore("tasks").put(updated);
  await transactionDone(tx);
  return updated;
};

export const deleteTask = async (taskId) => {
  const db = await openDB();
  const tx = db.transaction("tasks", "readwrite");
  tx.objectStore("tasks").delete(taskId);
  await transactionDone(tx);
};

export const clearCompletedTasks = async (listId) => {
  const db = await openDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  const tasks = await requestToPromise(store.index("listId").getAll(listId));
  tasks.filter((task) => task.completed).forEach((task) => store.delete(task.id));
  await transactionDone(tx);
};

export const updateTaskOrders = async (listId, orderedIds) => {
  const db = await openDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  for (let index = 0; index < orderedIds.length; index += 1) {
    const taskId = orderedIds[index];
    const task = await requestToPromise(store.get(taskId));
    if (!task || task.listId !== listId) {
      continue;
    }
    task.order = index;
    task.updatedAt = timeNow();
    store.put(task);
  }

  await transactionDone(tx);
};
