export const renderListOptions = (selectEl, lists, options = {}) => {
  if (!selectEl) return;
  const {
    includeAll = false,
    allValue = "all",
    allLabel = "全部列表",
    selectedValue = null,
  } = options;

  selectEl.innerHTML = "";

  if (includeAll) {
    const allOption = document.createElement("option");
    allOption.value = allValue;
    allOption.textContent = allLabel;
    selectEl.appendChild(allOption);
  }

  lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    selectEl.appendChild(option);
  });

  if (selectedValue !== null) {
    selectEl.value = selectedValue;
  }
};
