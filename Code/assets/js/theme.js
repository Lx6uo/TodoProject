// 应用主题并同步开关
export const applyTheme = (theme, toggleEl) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  if (toggleEl) {
    toggleEl.checked = theme === "dark";
  }
};

// 初始化主题状态
export const initTheme = (toggleEl) => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme, toggleEl);
};

// 绑定主题切换
export const bindThemeToggle = (toggleEl, onChange) => {
  // onChange 可用于触发图表等额外刷新
  if (!toggleEl) return;
  toggleEl.addEventListener("change", () => {
    const next = toggleEl.checked ? "dark" : "light";
    applyTheme(next, toggleEl);
    if (onChange) {
      onChange(next);
    }
  });
};
