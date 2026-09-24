import { ref } from "vue";

export type FormItem = any;

export const allItems = ref<FormItem[]>([]);
export const statusText = ref("讀取中…");
export const tabsVisible = ref(false);
export const uploadStatus = ref("");
export const sourceLabel = ref("data/forms.json");

export const hireDate = ref("");
export const entitlementDaysByYear = ref<Record<number, number>>({});
export const entitlementRemainingHoursByYear = ref<Record<number, number>>({});
export const entitlementHoursManualByYear = ref<Record<number, boolean>>({});
export const entitlementEditorOpen = ref(false);

const PROFILE_STORAGE_KEY = "annual-leave-profile";

const readYearNumbers = (raw: unknown) => {
  const next: Record<number, number> = {};
  if (!raw || typeof raw !== "object") return next;
  Object.entries(raw as Record<string, unknown>).forEach(([yearText, value]) => {
    const year = Number(yearText);
    const amount = Number(value);
    if (year < 1900 || year > 2100) return;
    if (!Number.isFinite(amount) || amount < 0) return;
    next[year] = Math.round(amount * 100) / 100;
  });
  return next;
};

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as {
      hireDate?: unknown;
      daysByYear?: unknown;
      remainingHoursByYear?: unknown;
      remainingHoursManual?: unknown;
    };
    if (typeof data.hireDate === "string" && /^\d{4}-\d{2}$/.test(data.hireDate)) {
      hireDate.value = data.hireDate;
    }
    entitlementDaysByYear.value = readYearNumbers(data.daysByYear);
    entitlementRemainingHoursByYear.value = readYearNumbers(data.remainingHoursByYear);
    const manual: Record<number, boolean> = {};
    if (Array.isArray(data.remainingHoursManual)) {
      data.remainingHoursManual.forEach((yearValue) => {
        const year = Number(yearValue);
        if (year >= 1900 && year <= 2100) manual[year] = true;
      });
    }
    entitlementHoursManualByYear.value = manual;
  } catch {
    // ignore unreadable storage
  }
};

export const persistProfile = () => {
  try {
    const daysByYear: Record<string, number> = {};
    Object.entries(entitlementDaysByYear.value).forEach(([year, days]) => {
      daysByYear[year] = days;
    });
    const remainingHoursByYear: Record<string, number> = {};
    Object.entries(entitlementRemainingHoursByYear.value).forEach(([year, hours]) => {
      remainingHoursByYear[year] = hours;
    });
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        hireDate: hireDate.value,
        daysByYear,
        remainingHoursByYear,
        remainingHoursManual: Object.keys(entitlementHoursManualByYear.value).filter(
          (year) => entitlementHoursManualByYear.value[Number(year)],
        ),
      }),
    );
  } catch {
    // ignore quota or private-mode failures
  }
};

export const openEntitlementEditor = () => {
  entitlementEditorOpen.value = true;
};

export const saveEntitlementProfile = (
  nextHireDate: string,
  daysByYear: Record<number, number>,
  remainingHoursByYear: Record<number, number> = {},
  manualYears: number[] = [],
) => {
  hireDate.value = nextHireDate;
  entitlementDaysByYear.value = { ...daysByYear };
  entitlementRemainingHoursByYear.value = { ...remainingHoursByYear };
  const manual: Record<number, boolean> = {};
  manualYears.forEach((year) => {
    manual[year] = true;
  });
  entitlementHoursManualByYear.value = manual;
  persistProfile();
  recomputeEntitlement();
};

readStoredProfile();

export const totalRemainingHours = ref<number | null>(null);
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
  { key: "起始日期", label: "起始日期", sortable: true },
  { key: "结束日期", label: "結束日期" },
  { key: "请假时数", label: "請假時數" },
  { key: "请假理由", label: "請假理由" },
];

export const setUploadStatus = (msg: string) => {
  uploadStatus.value = msg || "";
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
      typeHours: { 病假: 0, 生理假: 0, 喪假: 0, 疫苗假: 0, 公假: 0, 婚假: 0, 年假: 0 },
    };
    if (type === "年假") entry.totalHours += hours;
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

const assetUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${normalized}`;
};

export const recomputeEntitlement = () => {
  if (!hireDate.value) {
    totalRemainingHours.value = null;
    return;
  }
  const parts = hireDate.value.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) {
    totalRemainingHours.value = null;
    return;
  }

  const nowYear = new Date().getFullYear();
  const entry = annualTotals.value.find((row) => row.year === nowYear);
  const remaining = remainingHoursForYear(nowYear, entry?.typeHours?.["年假"] || 0);
  totalRemainingHours.value =
    remaining === null ? null : Math.round(remaining * 100) / 100;
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

const hireYearOf = (year: number) => {
  if (!year) return null;
  const parts = String(hireDate.value || "").split("-");
  const hireYear = Number(parts[0]);
  const hireMonth = Number(parts[1]);
  if (!hireYear || hireMonth < 1 || hireMonth > 12) return null;
  if (year < hireYear) return null;
  return hireYear;
};

export const getEntitlementDays = (year: number, _month?: number) => {
  if (hireYearOf(year) === null) return null;
  const days = entitlementDaysByYear.value[year];
  if (!Number.isFinite(days)) return null;
  return days;
};

const usedAnnualHours = (year: number) => {
  const entry = annualTotals.value.find((row) => row.year === year);
  return Number(entry?.typeHours?.["年假"]) || 0;
};

export const carryHoursIntoYear = (year: number) => {
  const hireYear = hireYearOf(year);
  if (hireYear === null || year <= hireYear) return 0;
  let carry = 0;
  for (let current = hireYear; current < year; current += 1) {
    const days = entitlementDaysByYear.value[current];
    if (!Number.isFinite(days)) {
      carry = 0;
      continue;
    }
    const base = days * 8;
    const remaining = base + carry - usedAnnualHours(current);
    if (remaining <= 0) carry = 0;
    else carry = Math.round(Math.min(remaining, base) * 100) / 100;
  }
  return carry;
};

export const getEntitlementRemainingHours = (year: number) => {
  if (hireYearOf(year) === null) return null;
  const carried = carryHoursIntoYear(year);
  return carried > 0 ? carried : null;
};

export const remainingHoursForYear = (year: number, usedHours: number) => {
  const days = getEntitlementDays(year);
  if (days === null) return null;
  const extra = carryHoursIntoYear(year);
  return days * 8 + extra - (Number(usedHours) || 0);
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
  sourceLabel,
  hireDate,
  entitlementDaysByYear,
  entitlementRemainingHoursByYear,
  entitlementHoursManualByYear,
  entitlementEditorOpen,
  openEntitlementEditor,
  persistProfile,
  saveEntitlementProfile,
  totalRemainingHours,
  annualLeaveByYear,
  annualLeaveUsageByYear,
  annualTotals,
  applyData,
  computeAnnualTotals,
  computeAnnualLeaveUsage,
  loadForms,
  recomputeEntitlement,
  getEntitlementDays,
  carryHoursIntoYear,
  getEntitlementRemainingHours,
  remainingHoursForYear,
  getAnnualLeaveHoursByYear,
  setUploadStatus,
};
