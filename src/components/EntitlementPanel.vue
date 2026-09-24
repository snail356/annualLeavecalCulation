<template>
  <section class="card tab-panel" id="tab-entitlement" role="tabpanel">
    <div class="entitlement">
      <div class="entitlement-row">
        <div class="field date-field" @click="openHireDatePicker">
          <label for="hire-date">到職日</label>
          <div class="month-input-wrap">
            <span class="month-display" :class="{ muted: !hireDate }">
              {{ hireDateLabel }}
            </span>
            <i class="fa-regular fa-calendar month-icon" aria-hidden="true"></i>
            <input
              ref="hireDateInput"
              id="hire-date"
              class="month-native"
              type="month"
              v-model="hireDate"
              @change="updateResult"
            />
          </div>
        </div>
        <div class="field">
          <span class="field-label">年度特休</span>
          <button type="button" class="upload-label" @click="openEditor">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
            填寫天數
          </button>
        </div>
      </div>
      <div id="excel-result" class="result-box">
        <div class="entitlement-summary">
          <table class="entitlement-table" aria-label="前一年特休彙整">
            <thead>
              <tr>
                <th>前一年項目</th>
                <th class="num-col">天數</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>前一年 特休</td>
                <td
                  class="num-col"
                  v-html="renderDays(prevEntitlementHours)"
                ></td>
              </tr>
              <tr>
                <td>前一年 已休</td>
                <td class="num-col" v-html="renderDays(-prevUsedHours)"></td>
              </tr>
              <tr>
                <td>前一年 剩餘</td>
                <td
                  class="num-col"
                  v-html="renderDays(prevRemainingHours)"
                ></td>
              </tr>
            </tbody>
          </table>
          <table class="entitlement-table" aria-label="今年特休彙整">
            <thead>
              <tr>
                <th>今年項目</th>
                <th class="num-col">天數</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>今年 特休</td>
                <td
                  class="num-col"
                  v-html="renderDays(currentEntitlementHours)"
                ></td>
              </tr>
              <tr>
                <td>今年 已休</td>
                <td class="num-col" v-html="renderDays(-currentUsedHours)"></td>
              </tr>
              <tr>
                <td>今年 剩餘</td>
                <td
                  class="num-col"
                  v-html="renderDays(currentRemainingHours)"
                ></td>
              </tr>
            </tbody>
          </table>
        </div>
        <table class="entitlement-total" aria-label="總剩餘特休">
          <tbody>
            <tr>
              <td>總剩餘</td>
              <td class="num-col" v-html="renderDays(totalRemainingHours)"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import store from "../store";

const hireDate = store.hireDate;
const hireDateInput = ref<HTMLInputElement | null>(null);

const hireDateLabel = computed(() => {
  const value = String(hireDate.value || "");
  if (!value) return "請選擇年月";
  const [year, month] = value.split("-");
  if (!year || !month) return "請選擇年月";
  return `${year}年 ${Number(month)}月`;
});

const prevEntitlementHours = store.prevEntitlementHours;
const prevUsedHours = store.prevUsedHours;
const prevRemainingHours = store.prevRemainingHours;
const currentEntitlementHours = store.currentEntitlementHours;
const currentUsedHours = store.currentUsedHours;
const currentRemainingHours = store.currentRemainingHours;
const totalRemainingHours = store.totalRemainingHours;

function splitDaysHours(hours: number | string) {
  const total = Number(hours) || 0;
  const sign = total < 0 ? "-" : "";
  const absTotal = Math.abs(total);
  const days = Math.floor(absTotal / 8);
  let remain = Math.round((absTotal - days * 8) * 100) / 100;
  if (Math.abs(remain - Math.round(remain)) < 1e-8) remain = Math.round(remain);
  return { days: sign + String(days), hours: String(remain) };
}

function renderDays(hours: number) {
  const parts = splitDaysHours(hours);
  const d = Number(parts.days) || 0;
  const h = Number(parts.hours) || 0;
  if (d === 0 && h === 0) return '<span class="muted">-</span>';
  const hoursHtml = h === 0 ? "" : `<span class="small-hours">${h}h</span>`;
  return `<span class="num">${parts.days}</span><span class="unit">天</span>${hoursHtml}`;
}

function updateResult() {
  store.persistProfile();
  store.recomputeEntitlement();
}

function openEditor() {
  store.openEntitlementEditor();
}

function openHireDatePicker() {
  const input = hireDateInput.value;
  if (!input) return;
  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === "function") {
    pickerInput.showPicker();
    return;
  }
  input.focus();
  input.click();
}
</script>

<style scoped>
.field-label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
}

.date-field,
.date-field input,
.date-field label {
  cursor: pointer;
}

.month-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 40px 8px 16px;
  border-radius: 999px;
  border: none;
  background: #fff;
  box-shadow: 0 8px 18px rgba(40, 40, 55, 0.06);
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
  right: 12px;
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
</style>
