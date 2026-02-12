import { ref, computed } from "vue";

export type FormItem = any;

export const allItems = ref<FormItem[]>([]);
export const statusText = ref("讀取中…");
export const tabsVisible = ref(false);
export const uploadStatus = ref("");
export const excelStatus = ref("");
export const sourceLabel = ref("data/forms.json");

export const entitlementMap = ref(
  new Map<number, { days: number; label: string }>(),
);

export const hireDate = ref("");

// entitlement numbers in hours (shared across UI)
export const prevEntitlementHours = ref(0);
export const prevUsedHours = ref(0);
export const prevRemainingHours = ref(0);
export const currentEntitlementHours = ref(0);
export const currentUsedHours = ref(0);
export const currentRemainingHours = ref(0);
export const totalRemainingHours = ref(0);
export const annualLeaveByYear = ref(new Map<number, number>());
export const annualLeaveUsageByYear = ref(new Map<number, number>());

export const annualTotals = ref<
  Array<{ year: number; totalHours: number; typeHours: Record<string, number> }>
>([]);

export const columns = [
  { key: "表單編號", label: "表單編號", fromId: true },
  { key: "表單目前狀態", label: "表單目前狀態" },
  { key: "申請人", label: "申請人" },
  { key: "假别", label: "假别" },
  { key: "起始日期", label: "起始日期" },
  { key: "结束日期", label: "結束日期" },
  { key: "请假时数", label: "請假時數" },
  { key: "请假理由", label: "請假理由" },
];

export const setUploadStatus = (msg: string) => {
  uploadStatus.value = msg || "";
};
export const setExcelStatus = (msg: string) => {
  excelStatus.value = msg || "";
};

const extractYear = (value: any) => {
  if (!value) return "";
  const match = String(value).match(/(\d{4})/);
  return match ? match[1] : "";
};

export const computeAnnualTotals = (items: FormItem[]) => {
  const totals = new Map<string, any>();
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
      typeHours: { 病假: 0, 喪假: 0, 疫苗假: 0, 公假: 0, 婚假: 0, 年假: 0 },
    };
    entry.totalHours += hours;
    if (entry.typeHours[type] !== undefined) entry.typeHours[type] += hours;
    totals.set(year, entry);
  });
  const years = Array.from(totals.keys()).sort((a, b) => Number(a) - Number(b));
  annualTotals.value = years.map((y) => ({
    year: Number(y),
    totalHours: totals.get(y).totalHours,
    typeHours: totals.get(y).typeHours,
  }));
  annualLeaveByYear.value = new Map(
    years.map((y) => [Number(y), totals.get(y)?.typeHours?.年假 || 0]),
  );
};

export const computeAnnualLeaveUsage = (items: FormItem[]) => {
  const usage = new Map<number, number>();
  items.forEach((item) => {
    const kv = item?.detail?.kv || {};
    const type = kv["假别"] || "";
    if (!(type.includes("年假") || type.includes("特休"))) return;
    if (kv["表單目前狀態"] !== "同意結束(待歸檔)") return;
    const year = extractYear(kv["起始日期"] || kv["申請時間"]);
    if (!year) return;
    const hours = Number.parseFloat(kv["请假时数"]);
    if (!Number.isFinite(hours)) return;
    const key = Number(year);
    usage.set(key, (usage.get(key) || 0) + hours);
  });
  annualLeaveUsageByYear.value = usage;
};

export const applyData = (data: FormItem[], sourceText?: string) => {
  allItems.value = data || [];
  computeAnnualTotals(allItems.value);
  computeAnnualLeaveUsage(allItems.value);
  recomputeEntitlement();
  if (sourceText) {
    sourceLabel.value = sourceText;
  }
  setUploadStatus("");
};

export const parseEntitlementRows = (rows: any[][]) => {
  const result = new Map<number, { days: number; label: string }>();
  if (!Array.isArray(rows) || rows.length < 3) {
    return { map: result, error: "Excel 內容不足，至少需要年份列與月份資料。" };
  }
  const headerRow = Array.isArray(rows[1]) ? rows[1] : [];
  const yearColumns: Array<{ year: number; idx: number }> = [];
  headerRow.forEach((cell, idx) => {
    const val = parseInt(String(cell).match(/(\d{4})/)?.[1] || "0", 10);
    if (val >= 1900 && val <= 2100) yearColumns.push({ year: val, idx });
  });
  if (yearColumns.length === 0)
    return { map: result, error: "找不到第 2 列的年份欄位。" };
  for (let i = 2; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const month = Number(String(row[0] || "").match(/(\d{1,2})/)?.[1] || 0);
    if (!month) continue;
    yearColumns.forEach(({ year, idx }) => {
      const days = Number(String(row[idx] || "").replace(/[^0-9.\-]/g, ""));
      if (!Number.isFinite(days)) return;
      const key = year * 100 + month;
      result.set(key, {
        days,
        label: `${year}-${String(month).padStart(2, "0")}`,
      });
    });
  }
  if (result.size === 0)
    return { map: result, error: "未解析到可用的特休資料。" };
  return { map: result, error: "" };
};

const assetUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${normalized}`;
};

export const recomputeEntitlement = () => {
  if (!hireDate.value) {
    prevEntitlementHours.value = 0;
    currentEntitlementHours.value = 0;
    prevUsedHours.value = 0;
    currentUsedHours.value = 0;
    prevRemainingHours.value = 0;
    currentRemainingHours.value = 0;
    totalRemainingHours.value = 0;
    return;
  }
  const parts = hireDate.value.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return;

  // current as year y, prev as y+1 (preserved behavior)
  const currentDays = entitlementMap.value.get(y * 100 + m)?.days || 0;
  const prevDays = entitlementMap.value.get((y + 1) * 100 + m)?.days || 0;

  currentEntitlementHours.value = Math.round(currentDays * 8 * 100) / 100;
  prevEntitlementHours.value = Math.round(prevDays * 8 * 100) / 100;

  const nowYear = new Date().getFullYear();
  // 前一年已休：取 (今年-前年的那一年) = 去年 的年假時數
  prevUsedHours.value = getAnnualLeaveHoursByYear(nowYear - 1) || 0;
  // 今年已休：取今年的年假時數
  currentUsedHours.value = getAnnualLeaveHoursByYear(nowYear) || 0;

  prevRemainingHours.value =
    Math.round((prevEntitlementHours.value - prevUsedHours.value) * 100) / 100;
  currentRemainingHours.value =
    Math.round((currentEntitlementHours.value - currentUsedHours.value) * 100) /
    100;
  totalRemainingHours.value =
    Math.round(
      ((prevRemainingHours.value > 0 ? prevRemainingHours.value : 0) +
        currentRemainingHours.value) *
        100,
    ) / 100;
};

export const loadDefaultExcel = async () => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) return;
  try {
    const res = await fetch(assetUrl("data/annual_leave.xlsx"));
    if (!res.ok) return;
    const buffer = await res.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
    });
    const parsed = parseEntitlementRows(rows);
    entitlementMap.value = parsed.map;
    if (parsed.error) setExcelStatus(parsed.error);
    recomputeEntitlement();
  } catch (err) {
    setExcelStatus("解析預設 Excel 失敗。");
  }
};

export const loadForms = async () => {
  try {
    const res = await fetch(assetUrl("data/forms.json"));
    if (!res.ok) throw new Error("fetch forms.json failed");
    const data = await res.json();
    applyData(data, "data/forms.json");
    statusText.value = "就緒";
  } catch (err) {
    // keep status
    statusText.value = "讀取表單資料失敗";
  }
};

export const getEntitlementDays = (year: number, month: number) => {
  if (!year || !month) return null;
  const entry = entitlementMap.value.get(year * 100 + month);
  return entry ? entry.days : null;
};

export const getAnnualLeaveHoursByYear = (year: number) => {
  const hours = annualLeaveUsageByYear.value.get(year);
  if (!Number.isFinite(hours)) return 0;
  return Math.round(hours * 100) / 100;
};

export default {
  allItems,
  columns,
  statusText,
  tabsVisible,
  uploadStatus,
  excelStatus,
  sourceLabel,
  entitlementMap,
  hireDate,
  prevEntitlementHours,
  prevUsedHours,
  prevRemainingHours,
  currentEntitlementHours,
  currentUsedHours,
  currentRemainingHours,
  totalRemainingHours,
  annualLeaveByYear,
  annualLeaveUsageByYear,
  annualTotals,
  applyData,
  computeAnnualTotals,
  computeAnnualLeaveUsage,
  parseEntitlementRows,
  loadDefaultExcel,
  loadForms,
  recomputeEntitlement,
  getEntitlementDays,
  getAnnualLeaveHoursByYear,
  setUploadStatus,
  setExcelStatus,
};
