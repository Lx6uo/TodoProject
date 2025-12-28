// 数字补零
const pad = (value) => `${value}`.padStart(2, "0");

// 格式化日期为 YYYY-MM-DD
export const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// 格式化月份标题
export const getMonthLabel = (date) =>
  date.toLocaleDateString("zh-CN", { month: "long", year: "numeric" });

// 构建月历 6x7 单元
export const buildCalendarCells = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - startOffset + 1;
    let cellDate;
    let isCurrentMonth = true;

    if (dayNumber <= 0) {
      cellDate = new Date(year, month - 1, daysInPrevMonth + dayNumber);
      isCurrentMonth = false;
    } else if (dayNumber > daysInMonth) {
      cellDate = new Date(year, month + 1, dayNumber - daysInMonth);
      isCurrentMonth = false;
    } else {
      cellDate = new Date(year, month, dayNumber);
    }

    cells.push({
      date: cellDate,
      key: formatDateKey(cellDate),
      day: cellDate.getDate(),
      isCurrentMonth,
    });
  }

  return cells;
};
