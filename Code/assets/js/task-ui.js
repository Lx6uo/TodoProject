const priorityLabels = { high: "高", medium: "中", low: "低" };

// 解析日期字符串
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

// 以当天 0 点为基准计算剩余天数
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

// 创建标签元素
const createPill = (text) => {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = text;
  return pill;
};

// 创建剩余时间标签
export const createRemainingTag = (dueDate) => {
  const remainingInfo = getRemainingInfo(dueDate);
  const remainingTag = document.createElement("span");
  remainingTag.className = "task-remaining";
  remainingTag.dataset.state = remainingInfo.state;
  remainingTag.textContent = remainingInfo.label;
  return remainingTag;
};

// 构建任务元信息区域
export const buildTaskMeta = (task, options = {}) => {
  const { showListName = false, listName = "", includeRemaining = false } = options;
  // 组合标签：列表名 / 截止 / 优先级 / 剩余
  const metaRow = document.createElement("div");
  metaRow.className = "task-meta";

  if (showListName) {
    metaRow.appendChild(createPill(listName || "未命名列表"));
  }

  const dueText = task.dueDate ? `截止 ${task.dueDate}` : "无截止日期";
  metaRow.appendChild(createPill(dueText));

  const dot = document.createElement("span");
  dot.textContent = " · ";

  metaRow.appendChild(dot);
  const priorityPill = createPill(priorityLabels[task.priority] || task.priority);
  priorityPill.dataset.priority = task.priority;
  metaRow.appendChild(priorityPill);

  if (includeRemaining) {
    metaRow.appendChild(dot.cloneNode(true));
    metaRow.appendChild(createRemainingTag(task.dueDate));
  }

  return metaRow;
};

// 构建任务主体区域
export const buildTaskMain = (task, options = {}) => {
  const { showListName = false, listName = "", includeRemaining = false } = options;
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

  const metaRow = buildTaskMeta(task, { showListName, listName, includeRemaining });

  textWrap.appendChild(titleRow);
  textWrap.appendChild(noteRow);
  textWrap.appendChild(metaRow);

  left.appendChild(textWrap);

  if (task.completed) {
    titleRow.style.textDecoration = "line-through";
    titleRow.style.opacity = 0.6;
  }

  return { left, checkbox, titleRow, metaRow };
};
