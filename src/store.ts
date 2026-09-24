import { ref } from "vue";

export type FormItem = any;

export const allItems = ref<FormItem[]>([]);
export const statusText = ref("讀取中…");
export const tabsVisible = ref(false);
export const uploadStatus = ref("");
export const sourceLabel = ref("data/forms.json");

export const hireDate = ref("");
export const entitlementDaysByYear = ref<Record<number, number>>({});
export const entitlementEditorOpen = ref(false);

const PROFILE_STORAGE_KEY = "annual-leave-profile";

const readStoredProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as {
      hireDate?: unknown;
      daysByYear?: unknown;
    };
    if (typeof data.hireDate === "string" && /^\d{4}-\d{2}$/.test(data.hireDate)) {
      hireDate.value = data.hireDate;
    }
    if (!data.daysByYear || typeof data.daysByYear !== "object") return;
    const next: Record<number, number> = {};
    Object.entries(data.daysByYear as Record<string, unknown>).forEach(
      ([yearText, daysValue]) => {
        const year = Number(yearText);
        const days = Number(daysValue);
        if (year < 1900 || year > 2100) return;
        if (!Number.isFinite(days) || days < 0) return;
        next[year] = Math.round(days * 100) / 100;
      },
    );
    entitlementDaysByYear.value = next;
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
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        hireDate: hireDate.value,
        daysByYear,
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
) => {
  hireDate.value = nextHireDate;
  entitlementDaysByYear.value = { ...daysByYear };
  persistProfile();
  recomputeEntitlement();
};

readStoredProfile();

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
    totalRemainingHours.value = 0;
    return;
  }
  const parts = hireDate.value.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return;

  const nowYear = new Date().getFullYear();
  const currentHours = Math.round((getEntitlementDays(nowYear) || 0) * 8 * 100) / 100;
  const prevHours = Math.round((getEntitlementDays(nowYear - 1) || 0) * 8 * 100) / 100;
  const prevRemaining = prevHours - (getAnnualLeaveHoursByYear(nowYear - 1) || 0);
  const currentRemaining = currentHours - (getAnnualLeaveHoursByYear(nowYear) || 0);
  totalRemainingHours.value =
    Math.round(
      ((prevRemaining > 0 ? prevRemaining : 0) + currentRemaining) * 100,
    ) / 100;
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

export const getEntitlementDays = (year: number, _month?: number) => {
  if (!year) return null;
  const parts = String(hireDate.value || "").split("-");
  const hireYear = Number(parts[0]);
  const hireMonth = Number(parts[1]);
  if (!hireYear || hireMonth < 1 || hireMonth > 12) return null;
  if (year < hireYear) return null;
  const days = entitlementDaysByYear.value[year];
  if (!Number.isFinite(days)) return null;
  return days;
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
  getAnnualLeaveHoursByYear,
  setUploadStatus,
};
