export const applyTheme = (theme, toggleEl) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  if (toggleEl) {
    toggleEl.checked = theme === "dark";
  }
};

export const initTheme = (toggleEl) => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme, toggleEl);
};

export const bindThemeToggle = (toggleEl, onChange) => {
  if (!toggleEl) return;
  toggleEl.addEventListener("change", () => {
    const next = toggleEl.checked ? "dark" : "light";
    applyTheme(next, toggleEl);
    if (onChange) {
      onChange(next);
    }
  });
};
