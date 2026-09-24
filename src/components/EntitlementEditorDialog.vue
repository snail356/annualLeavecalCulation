<template>
  <dialog
    ref="dialogEl"
    class="entitlement-dialog"
    aria-labelledby="entitlement-dialog-title"
    @click="onBackdropClick"
    @close="onDialogClose"
  >
    <form class="dialog-form" @submit.prevent="onSave">
      <h2 id="entitlement-dialog-title">年度特休</h2>
      <p class="dialog-lead">
        填寫到職年月，以及各年度的特休天數。儲存後會留在這台瀏覽器。
      </p>

      <div class="field date-field" @click="openHireDatePicker">
        <label for="dialog-hire-date">到職年月</label>
        <div class="month-input-wrap">
          <span class="month-display" :class="{ muted: !draftHireDate }">
            {{ hireDateLabel }}
          </span>
          <i class="fa-regular fa-calendar month-icon" aria-hidden="true"></i>
          <input
            ref="hireDateInput"
            id="dialog-hire-date"
            class="month-native"
            type="month"
            v-model="draftHireDate"
          />
        </div>
      </div>

      <p v-if="!draftHireDate" class="dialog-hint">請先選擇到職年月，再填各年天數。</p>
      <div v-else class="year-list" role="group" aria-label="各年度特休天數">
        <label v-for="year in years" :key="year" class="year-row">
          <span class="year-label">{{ year }}</span>
          <input
            v-model="yearInputs[year]"
            class="year-input"
            type="number"
            min="0"
            step="0.5"
            inputmode="decimal"
            placeholder="未填"
            :aria-label="`${year} 年特休天數`"
          />
          <span class="year-unit">天</span>
        </label>
      </div>

      <p v-if="errorText" class="dialog-error" role="alert">{{ errorText }}</p>

      <div class="dialog-actions">
        <button type="button" class="btn-ghost" @click="close">取消</button>
        <button type="submit" class="btn-primary" :disabled="!draftHireDate">
          儲存
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import store from "../store";

const dialogEl = ref<HTMLDialogElement | null>(null);
const hireDateInput = ref<HTMLInputElement | null>(null);
const draftHireDate = ref("");
const yearInputs = reactive<Record<number, string>>({});
const errorText = ref("");

const years = computed(() => {
  const hireYear = Number(String(draftHireDate.value || "").split("-")[0]);
  if (!hireYear) return [] as number[];
  const end = Math.max(hireYear, new Date().getFullYear());
  const list: number[] = [];
  for (let year = hireYear; year <= end; year += 1) list.push(year);
  return list;
});

const hireDateLabel = computed(() => {
  const value = String(draftHireDate.value || "");
  if (!value) return "請選擇年月";
  const [year, month] = value.split("-");
  if (!year || !month) return "請選擇年月";
  return `${year}年 ${Number(month)}月`;
});

watch(years, (list) => {
  const keep = new Set(list);
  Object.keys(yearInputs).forEach((key) => {
    const year = Number(key);
    if (!keep.has(year)) delete yearInputs[year];
  });
  list.forEach((year) => {
    if (yearInputs[year] !== undefined) return;
    const saved = store.entitlementDaysByYear.value[year];
    yearInputs[year] = Number.isFinite(saved) ? String(saved) : "";
  });
});

watch(
  () => store.entitlementEditorOpen.value,
  async (open) => {
    if (!open) {
      if (dialogEl.value?.open) dialogEl.value.close();
      return;
    }
    resetDraft();
    await nextTick();
    dialogEl.value?.showModal();
  },
);

function resetDraft() {
  errorText.value = "";
  draftHireDate.value = store.hireDate.value || "";
  Object.keys(yearInputs).forEach((key) => {
    delete yearInputs[Number(key)];
  });
  const saved = store.entitlementDaysByYear.value;
  years.value.forEach((year) => {
    const days = saved[year];
    yearInputs[year] = Number.isFinite(days) ? String(days) : "";
  });
}

function close() {
  dialogEl.value?.close();
}

function onDialogClose() {
  store.entitlementEditorOpen.value = false;
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialogEl.value) close();
}

function openHireDatePicker() {
  const input = hireDateInput.value;
  if (!input) return;
  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === "function") {
    try {
      pickerInput.showPicker();
      return;
    } catch {
      // showPicker throws if the input is not yet focused in some browsers
    }
  }
  input.focus();
  input.click();
}

function onSave() {
  if (!/^\d{4}-\d{2}$/.test(draftHireDate.value)) {
    errorText.value = "請選擇到職年月";
    return;
  }
  const next: Record<number, number> = {};
  for (const year of years.value) {
    const text = String(yearInputs[year] ?? "").trim();
    if (!text) continue;
    const days = Number(text);
    if (!Number.isFinite(days) || days < 0) {
      errorText.value = `${year} 年的天數不正確`;
      return;
    }
    next[year] = Math.round(days * 100) / 100;
  }
  errorText.value = "";
  store.saveEntitlementProfile(draftHireDate.value, next);
  close();
}
</script>

<style scoped>
.entitlement-dialog {
  width: min(440px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  margin: auto;
  padding: 0;
  border: none;
  border-radius: 28px;
  background: #fff;
  color: var(--ink);
  box-shadow: 0 28px 70px rgba(55, 55, 72, 0.28);
}

.entitlement-dialog::backdrop {
  background: rgba(27, 27, 31, 0.38);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 22px 18px;
}

.dialog-form h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.03em;
}

.dialog-lead,
.dialog-hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label,
.date-field,
.date-field input {
  cursor: pointer;
}

.field label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
}

.month-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 40px 8px 16px;
  border-radius: 999px;
  background: #f6f6f8;
  box-sizing: border-box;
}

.month-display {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.4;
  pointer-events: none;
}

.month-display.muted {
  color: var(--muted);
}

.month-icon {
  position: absolute;
  right: 14px;
  color: var(--muted);
  font-size: 14px;
  pointer-events: none;
}

.month-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}

.year-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(360px, 46vh);
  overflow: auto;
  padding-right: 2px;
}

.year-row {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  gap: 10px;
}

.year-label,
.year-unit {
  font-size: 14px;
  font-weight: 600;
}

.year-unit {
  color: var(--muted);
}

.year-input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: #f6f6f8;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.year-input:focus {
  outline: 2px solid #1c1c1f;
  outline-offset: 1px;
}

.dialog-error {
  margin: 0;
  color: var(--alert);
  font-size: 13px;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-ghost,
.btn-primary {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost {
  background: #f3f3f6;
  color: var(--ink);
}

.btn-primary {
  background: #1c1c1f;
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
