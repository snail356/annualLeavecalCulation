const columns = [
  { key: "表單編號", label: "表單編號", fromId: true },
  { key: "表單目前狀態", label: "表單目前狀態" },
//   { key: "申請部門", label: "申請部門" },
  { key: "申請人", label: "申請人" },
//   { key: "申請時間", label: "申請時間" },
//   { key: "代理人", label: "代理人" },
  { key: "假别", label: "假别" },
  { key: "起始日期", label: "起始日期" },
  { key: "结束日期", label: "结束日期" },
  { key: "请假时数", label: "请假时数" },
  { key: "请假理由", label: "请假理由" }
];

const statusEl = document.getElementById("status");
const tabsEl = document.querySelector(".tabs");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const panels = {
  forms: document.getElementById("tab-forms"),
  annual: document.getElementById("tab-annual")
};
const tableWrap = panels.forms.querySelector(".table-wrap");
const annualWrap = panels.annual.querySelector(".table-wrap");
const headRow = document.getElementById("table-head");
const body = document.getElementById("table-body");
const annualBody = document.getElementById("annual-body");
const yearFilter = document.getElementById("year-filter");
const filterBar = document.querySelector(".filter-bar");
const uploadInput = document.getElementById("json-upload");
const uploadStatus = document.getElementById("upload-status");
const sourceLabel = document.getElementById("source-label");
let allItems = [];

const renderHead = () => {
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    headRow.appendChild(th);
  });
};

const pickValue = (kv, column) => {
  if (!kv) return "";
  if (kv[column.key]) return kv[column.key];
  if (column.altKeys) {
    for (const alt of column.altKeys) {
      if (kv[alt]) return kv[alt];
    }
  }
  return "";
};

const renderStatusText = (value, target) => {
  const openIndex = value.indexOf("(");
  if (openIndex > 0 && value.includes(")")) {
    target.appendChild(document.createTextNode(value.slice(0, openIndex).trimEnd()));
    target.appendChild(document.createElement("br"));
    target.appendChild(document.createTextNode(value.slice(openIndex)));
    return;
  }
  target.textContent = value;
};

const renderRows = (items) => {
  body.textContent = "";
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const kv = item?.detail?.kv || {};
    const statusValue = kv["表單目前狀態"] || "";
    const tr = document.createElement("tr");
    if (statusValue && statusValue !== "同意結束(待歸檔)") {
      tr.classList.add("row-muted");
    }
    columns.forEach((col, index) => {
      const td = document.createElement("td");
      const value = col.fromId ? item?.id : pickValue(kv, col);
      if (index === 1 && value) {
        const span = document.createElement("span");
        span.className = "status";
        renderStatusText(value, span);
        if (value !== "同意結束(待歸檔)") {
          span.classList.add("is-alert");
        }
        td.appendChild(span);
      } else {
        td.textContent = value || "—";
        if (!value) td.classList.add("muted");
      }
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });
  body.appendChild(fragment);
};

const showError = (message) => {
  statusEl.className = "error";
  statusEl.textContent = message;
};

const extractYear = (value) => {
  if (!value) return "";
  const match = String(value).match(/(\d{4})/);
  return match ? match[1] : "";
};

const getItemYear = (item) => {
  const kv = item?.detail?.kv || {};
  return extractYear(kv["起始日期"] || kv["申請時間"]);
};

const populateYearFilter = (items) => {
  if (!yearFilter) return;
  const years = Array.from(
    new Set(items.map((item) => getItemYear(item)).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));
  yearFilter.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "全部";
  yearFilter.appendChild(allOption);
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
};

const getFilteredItems = () => {
  if (!yearFilter) return allItems;
  const selected = yearFilter.value;
  if (!selected || selected === "all") return allItems;
  return allItems.filter((item) => getItemYear(item) === selected);
};

const formatHours = (value) => {
  if (!Number.isFinite(value)) return "";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
};

const renderAnnual = (items) => {
  annualBody.textContent = "";
  const totals = new Map();
  items.forEach((item) => {
    const kv = item?.detail?.kv || {};
    if (kv["表單目前狀態"] !== "同意結束(待歸檔)") return;
    const year = extractYear(kv["起始日期"] || kv["申請時間"]);
    if (!year) return;
    const hours = Number.parseFloat(kv["请假时数"]);
    if (!Number.isFinite(hours)) return;
    const type = kv["假别"] || "";
    const entry = totals.get(year) || {
      totalHours: 0,
      typeHours: {
        病假: 0,
        喪假: 0,
        疫苗假: 0,
        婚假: 0,
        年假: 0
      }
    };
    entry.totalHours += hours;
    if (entry.typeHours[type] !== undefined) {
      entry.typeHours[type] += hours;
    }
    totals.set(year, entry);
  });

  const years = Array.from(totals.keys()).sort((a, b) => Number(a) - Number(b));
  const fragment = document.createDocumentFragment();
  years.forEach((year) => {
    const entry = totals.get(year);
    const tr = document.createElement("tr");
    const yearCell = document.createElement("td");
    const hoursCell = document.createElement("td");
    const daysCell = document.createElement("td");
    const hoursValue = entry?.totalHours || 0;
    const sickCell = document.createElement("td");
    const bereavementCell = document.createElement("td");
    const vaccineCell = document.createElement("td");
    const marriageCell = document.createElement("td");
    const annualHoursCell = document.createElement("td");
    const annualDaysCell = document.createElement("td");
    const annualHours = entry?.typeHours?.年假 || 0;
    yearCell.textContent = year;
    hoursCell.textContent = formatHours(hoursValue);
    daysCell.textContent = formatHours(hoursValue / 8);
    sickCell.textContent = formatHours(entry?.typeHours?.病假 || 0);
    bereavementCell.textContent = formatHours(entry?.typeHours?.喪假 || 0);
    vaccineCell.textContent = formatHours(entry?.typeHours?.疫苗假 || 0);
    marriageCell.textContent = formatHours(entry?.typeHours?.婚假 || 0);
    annualHoursCell.textContent = formatHours(annualHours);
    annualDaysCell.textContent = formatHours(annualHours / 8);
    tr.appendChild(yearCell);
    tr.appendChild(hoursCell);
    tr.appendChild(daysCell);
    tr.appendChild(sickCell);
    tr.appendChild(bereavementCell);
    tr.appendChild(vaccineCell);
    tr.appendChild(marriageCell);
    tr.appendChild(annualHoursCell);
    tr.appendChild(annualDaysCell);
    fragment.appendChild(tr);
  });
  annualBody.appendChild(fragment);
};

const setUploadStatus = (message) => {
  if (!uploadStatus) return;
  if (!message) {
    uploadStatus.hidden = true;
    uploadStatus.textContent = "";
    return;
  }
  uploadStatus.hidden = false;
  uploadStatus.textContent = message;
};

const applyData = (data, sourceText) => {
  allItems = data;
  populateYearFilter(allItems);
  if (yearFilter) {
    yearFilter.value = "all";
  }
  renderRows(getFilteredItems());
  renderAnnual(allItems);
  if (sourceLabel && sourceText) {
    sourceLabel.textContent = sourceText;
  }
  setUploadStatus("");
};

const setActiveTab = (key) => {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === key;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  Object.entries(panels).forEach(([panelKey, panel]) => {
    panel.hidden = panelKey !== key;
  });
  if (filterBar) {
    filterBar.classList.toggle("is-hidden", key !== "forms");
  }
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

renderHead();

if (yearFilter) {
  yearFilter.addEventListener("change", () => {
    renderRows(getFilteredItems());
  });
}

if (uploadInput) {
  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) {
          throw new Error("JSON 內容不是陣列");
        }
        applyData(data, file.name);
      } catch (error) {
        setUploadStatus("JSON 格式錯誤，請確認內容。");
      }
    };
    reader.onerror = () => {
      setUploadStatus("讀取檔案失敗，請重試。");
    };
    reader.readAsText(file);
  });
}

fetch("./data/forms.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("無法讀取 data/forms.json");
    }
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("資料格式不是陣列");
    }
    statusEl.remove();
    tabsEl.hidden = false;
    tableWrap.hidden = false;
    annualWrap.hidden = false;
    panels.forms.hidden = false;
    applyData(data, "data/forms.json");
  })
  .catch((error) => {
    showError(`${error.message}，請確認檔案與位置。`);
  });
