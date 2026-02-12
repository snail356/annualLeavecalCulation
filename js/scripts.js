const columns = [
  { key: "表單編號", label: "表單編號", fromId: true },
  { key: "表單目前狀態", label: "表單目前狀態" },
  { key: "申請人", label: "申請人" },
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
  annual: document.getElementById("tab-annual"),
  entitlement: document.getElementById("tab-entitlement")
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
const hireDateInput = document.getElementById("hire-date");
const excelUpload = document.getElementById("excel-upload");
const excelStatus = document.getElementById("excel-status");
const excelResult = document.getElementById("excel-result");
const entitlementSummary = document.querySelector(".entitlement-summary");
const entitlementPrevBody = document.getElementById("entitlement-prev-body");
const entitlementCurrentBody = document.getElementById("entitlement-current-body");
const entitlementTotalBody = document.getElementById("entitlement-total-body");
let allItems = [];
let entitlementMap = new Map();
let annualLeaveByYear = new Map();
let annualLeaveUsageByYear = new Map();

const renderHead = () => {
  headRow.textContent = "";
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

const formatDaysHours = (value) => {
  if (!Number.isFinite(Number(value))) return "";
  let total = Number(value) || 0;
  const sign = total < 0 ? "-" : "";
  total = Math.abs(total);
  const days = Math.floor(total / 8);
  let hours = Math.round((total - days * 8) * 100) / 100;
  if (Math.abs(hours - Math.round(hours)) < 1e-8) hours = Math.round(hours);
  return `${sign}${days}天${hours}小時`;
};

const renderDaysHoursHTML = (value) => {
  if (!Number.isFinite(Number(value))) return "";
  const parts = splitDaysHours(value);
  const days = parts.days;
  const hours = parts.hours;
  const dnum = Number(days) || 0;
  const hnum = Number(hours) || 0;
  if (dnum === 0 && hnum === 0) {
    return `<span class="muted">-</span>`;
  }
  // 顯示格式：`21天`（正常大小） 接著用較小綠色字顯示 `+5h`
  // 顯示格式：`21天`（正常大小） 接著用小字顯示 `· 5h`（若為負則顯示 `· - 5h`）
  const hoursText = hnum > 0 ? `${Math.abs(hnum)}h` : (hnum < 0 ? `- ${Math.abs(hnum)}h` : "");
  const hoursHtml = hoursText ? `<span class="dot">·</span><span class="small-hours">${hoursText}</span>` : "";
  return `<span class="num">${days}</span><span class="unit">天</span>${hoursHtml}`;
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
        公假: 0,
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
  annualLeaveByYear = new Map(
    years.map((year) => [
      Number(year),
      totals.get(year)?.typeHours?.年假 || 0
    ])
  );
  const fragment = document.createDocumentFragment();
  years.forEach((year) => {
    const entry = totals.get(year);
    const tr = document.createElement("tr");
    const yearCell = document.createElement("td");
    const hoursCell = document.createElement("td");
    const annualHoursCell = document.createElement("td");
    const sickCell = document.createElement("td");
    const bereavementCell = document.createElement("td");
    const vaccineCell = document.createElement("td");
    const publicCell = document.createElement("td");
    const marriageCell = document.createElement("td");
    const annualHours = entry?.typeHours?.年假 || 0;
    yearCell.textContent = year;
    const hoursValue = entry?.totalHours || 0;
    // render cell html
    hoursCell.innerHTML = renderDaysHoursHTML(hoursValue);
    annualHoursCell.innerHTML = renderDaysHoursHTML(annualHours);
    // 讓這些數字欄靠右
    hoursCell.classList.add('num-col');
    annualHoursCell.classList.add('num-col');
    const sickVal = entry?.typeHours?.病假 || 0;
    const bereaveVal = entry?.typeHours?.喪假 || 0;
    const vacVal = entry?.typeHours?.疫苗假 || 0;
    const pubVal = entry?.typeHours?.公假 || 0;
    const marVal = entry?.typeHours?.婚假 || 0;
    sickCell.innerHTML = renderDaysHoursHTML(sickVal);
    bereavementCell.innerHTML = renderDaysHoursHTML(bereaveVal);
    vaccineCell.innerHTML = renderDaysHoursHTML(vacVal);
    publicCell.innerHTML = renderDaysHoursHTML(pubVal);
    marriageCell.innerHTML = renderDaysHoursHTML(marVal);
    sickCell.classList.add('num-col');
    bereavementCell.classList.add('num-col');
    vaccineCell.classList.add('num-col');
    publicCell.classList.add('num-col');
    marriageCell.classList.add('num-col');
    // append in order: 年度, 總請假時數, 年假時數, 病假...
    tr.appendChild(yearCell);
    tr.appendChild(hoursCell);
    tr.appendChild(annualHoursCell);
    tr.appendChild(sickCell);
    tr.appendChild(bereavementCell);
    tr.appendChild(vaccineCell);
    tr.appendChild(publicCell);
    tr.appendChild(marriageCell);
    // styling: if a numeric value exists (>0 or <0), show as black; otherwise muted
    const setMuting = (td, value) => {
      const num = Number(value) || 0;
      if (Math.abs(num) > 0) {
        td.classList.remove('muted');
      } else {
        td.classList.add('muted');
      }
    };
    // 年假欄若有數字則加粗且為黑色，否則灰色
    if (Math.abs(Number(annualHours)) > 0) {
      annualHoursCell.classList.add('annual-bold');
      annualHoursCell.classList.remove('muted');
    } else {
      annualHoursCell.classList.remove('annual-bold');
      annualHoursCell.classList.add('muted');
    }
    setMuting(hoursCell, hoursValue);
    setMuting(sickCell, sickVal);
    setMuting(bereavementCell, bereaveVal);
    setMuting(vaccineCell, vacVal);
    setMuting(publicCell, pubVal);
    setMuting(marriageCell, marVal);
    fragment.appendChild(tr);
  });
  annualBody.appendChild(fragment);
};

const isAnnualLeaveType = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  return text.includes("年假") || text.includes("特休");
};

const computeAnnualLeaveUsage = (items) => {
  const usage = new Map();
  items.forEach((item) => {
    const kv = item?.detail?.kv || {};
    const type = kv["假别"] || "";
    if (!isAnnualLeaveType(type)) return;
    // 只計入已核准/完成的表單
    if (kv["表單目前狀態"] !== "同意結束(待歸檔)") return;
    const year = extractYear(kv["起始日期"] || kv["申請時間"]);
    if (!year) return;
    const hours = Number.parseFloat(kv["请假时数"]);
    if (!Number.isFinite(hours)) return;
    const key = Number(year);
    usage.set(key, (usage.get(key) || 0) + hours);
  });
  annualLeaveUsageByYear = usage;
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

const setExcelStatus = (message) => {
  if (!excelStatus) return;
  if (!message) {
    excelStatus.hidden = true;
    excelStatus.textContent = "";
    return;
  }
  excelStatus.hidden = false;
  excelStatus.textContent = message;
};

const clearEntitlementTables = () => {
  if (entitlementPrevBody) entitlementPrevBody.textContent = "";
  if (entitlementCurrentBody) entitlementCurrentBody.textContent = "";
  if (entitlementTotalBody) entitlementTotalBody.textContent = "";
};

const splitDaysHours = (hours) => {
  if (!Number.isFinite(hours)) return { days: "0", hours: "0" };
  const total = Number(hours) || 0;
  const sign = total < 0 ? "-" : "";
  const absTotal = Math.abs(total);
  const days = Math.floor(absTotal / 8);
  let remain = Math.round((absTotal - days * 8) * 100) / 100;
  if (Math.abs(remain - Math.round(remain)) < 1e-8) remain = Math.round(remain);
  return { days: sign + String(days), hours: String(remain) };
};

const appendRow = (tbody, label, hoursValue, prefixIcon = "") => {
  if (!tbody) return;
  const tr = document.createElement("tr");
  const tdLabel = document.createElement("td");
  const tdDays = document.createElement("td");
  const tdHours = document.createElement("td");
  const parts = splitDaysHours(hoursValue);
  tdLabel.textContent = `${prefixIcon}${label}`.trim();
  const dnum = Number(parts.days) || 0;
  const hnum = Number(parts.hours) || 0;
  if (dnum === 0 && hnum === 0) {
    tdDays.innerHTML = `<span class="muted">-</span>`;
    tdHours.innerHTML = ``;
    tdDays.classList.add('muted');
    tdHours.classList.add('muted');
  } else {
    tdDays.innerHTML = `<span class="num">${parts.days}</span><span class="unit">天</span>`;
    // 小時顯示為短單位 `h` 並用 dot 分隔
    const hoursNum = Number(parts.hours) || 0;
    tdHours.innerHTML = hoursNum === 0 ? `` : `<span class="dot">·</span><span class="small-hours">${parts.hours}h</span>`;
    tdDays.classList.remove('muted');
    tdHours.classList.remove('muted');
  }
  // 讓數字欄右對齊
  tdDays.classList.add('num-col');
  tdHours.classList.add('num-col');
  tr.appendChild(tdLabel);
  tr.appendChild(tdDays);
  tr.appendChild(tdHours);
  tbody.appendChild(tr);
};

const setExcelResult = (payload, isError = false) => {
  if (!excelResult) return;
  excelResult.hidden = false;
  excelResult.classList.toggle("is-error", Boolean(isError));
  clearEntitlementTables();
  // 清除舊的明細顯示（移除所有，以免重複疊加）
  const oldDebugs = excelResult.querySelectorAll('.used-forms-debug');
  oldDebugs.forEach((el) => el.remove());
  if (!payload || typeof payload !== "object") {
    if (entitlementTotalBody) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = String(payload || "");
      tr.appendChild(td);
      entitlementTotalBody.appendChild(tr);
    }
    return;
  }

  const {
    prevEntitlementHours,
    prevUsedHours,
    prevRemainingHours,
    currentEntitlementHours,
    currentUsedHours,
    currentRemainingHours,
    totalRemainingHours
  } = payload;

  const prevLabelBase = "前一年 ";
  const prevTable = entitlementPrevBody?.closest && entitlementPrevBody.closest('table');
  if (payload.includePrev === false) {
    if (prevTable) prevTable.hidden = true;
  } else {
    if (prevTable) prevTable.hidden = false;
    // 更新表頭為前一年年份
    if (payload.prevYear && prevTable) {
      const th = prevTable.querySelector('thead th');
      if (th) th.textContent = String(payload.prevYear);
    }
    appendRow(entitlementPrevBody, `${prevLabelBase}特休（去年給的）`, prevEntitlementHours);
    appendRow(entitlementPrevBody, `${prevLabelBase}已休`, -Math.abs(prevUsedHours));
    appendRow(entitlementPrevBody, `${prevLabelBase}剩餘`, prevRemainingHours, "✓ ");
  }

  const currLabelBase = "今年 ";
  const currTable = entitlementCurrentBody?.closest && entitlementCurrentBody.closest('table');
  if (currTable) {
    currTable.hidden = false;
    if (payload.currentYear) {
      const th = currTable.querySelector('thead th');
      if (th) th.textContent = String(payload.currentYear);
    }
  }
  appendRow(entitlementCurrentBody, `${currLabelBase}特休（去年給的）`, currentEntitlementHours);
  appendRow(entitlementCurrentBody, `${currLabelBase}已休`, -Math.abs(currentUsedHours));
  appendRow(entitlementCurrentBody, `${currLabelBase}剩餘`, currentRemainingHours, "✓ ");

  if (entitlementTotalBody) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    const tdDays = document.createElement("td");
    const tdHours = document.createElement("td");
    const parts = splitDaysHours(totalRemainingHours);
    tdLabel.textContent = "總剩餘";
    const totalDaysNum = Number(parts.days) || 0;
    const totalHoursNum = Number(parts.hours) || 0;
    if (totalDaysNum === 0 && totalHoursNum === 0) {
      tdDays.innerHTML = `<span class="muted">-</span>`;
      tdHours.innerHTML = ``;
      tdDays.classList.add('muted');
      tdHours.classList.add('muted');
    } else {
      tdDays.innerHTML = `<span class="num">${parts.days}</span><span class="unit">天</span>`;
      const hoursNum = Number(parts.hours) || 0;
      tdHours.innerHTML = hoursNum === 0 ? `` : `<span class="dot">·</span><span class="small-hours">${parts.hours}h</span>`;
      tdDays.classList.remove('muted');
      tdHours.classList.remove('muted');
    }
    tdDays.classList.add('num-col');
    tdHours.classList.add('num-col');
    tr.appendChild(tdLabel);
    tr.appendChild(tdDays);
    tr.appendChild(tdHours);
    entitlementTotalBody.appendChild(tr);
  }
  
};

const getEntitlementDays = (year, month) => {
  if (!year || !month) return null;
  const entry = entitlementMap.get(year * 100 + month);
  return entry ? entry.days : null;
};



const getAnnualLeaveHoursByYear = (year) => {
  const hours = annualLeaveUsageByYear.get(year);
  if (!Number.isFinite(hours)) return 0;
  return Math.round(hours * 100) / 100;
};

const parseYearFromHeader = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const year = Math.trunc(value);
    return year >= 1900 && year <= 2100 ? year : null;
  }
  const text = String(value).trim();
  const match = text.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1900 && year <= 2100 ? year : null;
};

const parseMonthFromCell = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const month = Math.trunc(value);
    return month >= 1 && month <= 12 ? month : null;
  }
  const text = String(value).trim();
  const match = text.match(/(\d{1,2})/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
};

const parseLeaveDays = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseEntitlementRows = (rows) => {
  const result = new Map();
  if (!Array.isArray(rows) || rows.length < 3) {
    return { map: result, error: "Excel 內容不足，至少需要年份列與月份資料。" };
  }

  const headerRow = Array.isArray(rows[1]) ? rows[1] : [];
  const yearColumns = [];
  headerRow.forEach((cell, idx) => {
    const year = parseYearFromHeader(cell);
    if (year) {
      yearColumns.push({ year, idx });
    }
  });

  if (yearColumns.length === 0) {
    return { map: result, error: "找不到第 2 列的年份欄位。" };
  }

  for (let i = 2; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const month = parseMonthFromCell(row[0]);
    if (!month) continue;
    yearColumns.forEach(({ year, idx }) => {
      const days = parseLeaveDays(row[idx]);
      if (days === null) return;
      const key = year * 100 + month;
      result.set(key, {
        days,
        label: `${year}-${String(month).padStart(2, "0")}`
      });
    });
  }

  if (result.size === 0) {
    return { map: result, error: "未解析到可用的特休資料。" };
  }

  return { map: result, error: "" };
};

const updateEntitlementResult = () => {
  if (!excelResult) return;
  if (!hireDateInput || !hireDateInput.value) {
    setExcelResult("請先輸入到職日。", true);
    return;
  }
  if (!entitlementMap || entitlementMap.size === 0) {
    setExcelResult("請先上傳 Excel 檔案。", true);
    return;
  }
  if (annualLeaveUsageByYear.size === 0 && allItems.length > 0) {
    computeAnnualLeaveUsage(allItems);
  }
  const dateParts = hireDateInput.value.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  if (!year || !month) {
    setExcelResult("到職日格式無法解析。", true);
    return;
  }
  const label = `${year}-${String(month).padStart(2, "0")}`;
  const currentDays = getEntitlementDays(year, month);
  if (currentDays === null) {
    setExcelResult(`找不到 ${label} 的特休天數。`, true);
    return;
  }
  const prevYear = year - 1;
  // 依使用者需求："前一年 特休（去年給的）" 取 Excel 中的「到職年 + 1」月份
  const lookupPrevEntitlementYear = year + 1;
  const prevLabel = `${lookupPrevEntitlementYear}-${String(month).padStart(2, "0")}`;
  let prevDays = null;
  const nowYear = new Date().getFullYear();
  if (year === nowYear) {
    // 到職日為今年：不計算前一年項目，直接視為 0
    prevDays = 0;
  } else {
    prevDays = getEntitlementDays(lookupPrevEntitlementYear, month);
    if (prevDays === null) {
      setExcelResult(`找不到前一年 ${prevLabel} 的特休天數。`, true);
      return;
    }
  }
  // 已休的年份以「現在」為基準：
  // 前一年已休 = 現在年份 - 1；今年已休 = 現在年份
  const usedYearPrev = new Date().getFullYear() - 1;
  const usedYearCurr = new Date().getFullYear();
  // 今年已休仍以目前日曆年累計已休（年假/特休）為準
  const usedHoursThisYear = getAnnualLeaveHoursByYear(usedYearCurr);
  // 前一年已休直接使用年度請假時數中的「年假」欄位（若有），否則回退到按表單年累計
  let usedHoursPrevYear = 0;
  if (year === nowYear) {
    usedHoursPrevYear = 0;
  } else {
    usedHoursPrevYear = annualLeaveByYear.get(prevYear) || getAnnualLeaveHoursByYear(usedYearPrev);
  }
  const currentHours = Math.round(currentDays * 8 * 100) / 100;
  const prevHours = Math.round(prevDays * 8 * 100) / 100;
  const prevRemainingHours = Math.round((prevHours - usedHoursPrevYear) * 100) / 100;
  const currentRemainingHours = Math.round(
    (currentHours - usedHoursThisYear) * 100
  ) / 100;
  // 若前一年剩餘為負數，則不計入總剩餘
  const totalRemainingHours = Math.round(
    ((prevRemainingHours > 0 ? prevRemainingHours : 0) + currentRemainingHours) * 100
  ) / 100;

  setExcelResult({
    prevEntitlementHours: prevHours,
    prevUsedHours: usedHoursPrevYear,
    prevRemainingHours,
    currentEntitlementHours: currentHours,
    currentUsedHours: usedHoursThisYear,
    currentRemainingHours,
    totalRemainingHours,
    prevYear,
    currentYear: year,
    prevUsedYear: usedYearPrev,
    currentUsedYear: usedYearCurr,
    includePrev: year !== nowYear
  });
};

const applyData = (data, sourceText) => {
  allItems = data;
  populateYearFilter(allItems);
  if (yearFilter) {
    yearFilter.value = "all";
  }
  renderRows(getFilteredItems());
  renderAnnual(allItems);
  computeAnnualLeaveUsage(allItems);
  if (entitlementMap.size > 0 && hireDateInput?.value) {
    updateEntitlementResult();
  }
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

if (hireDateInput) {
  hireDateInput.addEventListener("change", () => {
    updateEntitlementResult();
  });
}

if (excelUpload) {
  excelUpload.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (typeof XLSX === "undefined") {
      setExcelStatus("Excel 解析工具載入失敗。");
      setExcelResult("請稍後重整頁面再試。", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error("找不到工作表");
        }
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
          defval: ""
        });
        const parsed = parseEntitlementRows(rows);
        entitlementMap = parsed.map;
        if (parsed.error) {
          setExcelStatus(parsed.error);
          setExcelResult(parsed.error, true);
          return;
        }
        setExcelStatus(`已載入：${file.name}`);
        updateEntitlementResult();
      } catch (error) {
        entitlementMap = new Map();
        setExcelStatus("Excel 解析失敗，請確認檔案格式。");
        setExcelResult("Excel 解析失敗，請確認檔案格式。", true);
      }
    };
    reader.onerror = () => {
      entitlementMap = new Map();
      setExcelStatus("讀取 Excel 檔案失敗。");
      setExcelResult("讀取 Excel 檔案失敗。", true);
    };
    reader.readAsArrayBuffer(file);
  });
}

const loadDefaultExcel = () => {
  if (typeof XLSX === "undefined") {
    // 如果 SheetJS 還沒載入，稍等再試一次
    setTimeout(loadDefaultExcel, 500);
    return;
  }
  fetch("./data/annual_leave.xlsx")
    .then((res) => {
      if (!res.ok) {
        // 沒有預設檔案，不顯示錯誤，使用者可手動上傳
        setExcelStatus("");
        return null;
      }
      return res.arrayBuffer();
    })
    .then((buffer) => {
      if (!buffer) return;
      try {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("找不到工作表");
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
          defval: ""
        });
        const parsed = parseEntitlementRows(rows);
        entitlementMap = parsed.map;
        if (parsed.error) {
          setExcelStatus(parsed.error);
          setExcelResult(parsed.error, true);
          return;
        }
        setExcelStatus("已載入：data/annual_leave.xlsx");
        updateEntitlementResult();
      } catch (err) {
        entitlementMap = new Map();
        setExcelStatus("解析預設 Excel 失敗。");
      }
    })
    .catch(() => {
      // 忽略 fetch 錯誤，保留現有上傳流程
    });
};

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
    // 嘗試自動載入 workspace 下的預設 Excel 檔案，方便測試
    loadDefaultExcel();
  })
  .catch((error) => {
    showError(`${error.message}，請確認檔案與位置。`);
  });
