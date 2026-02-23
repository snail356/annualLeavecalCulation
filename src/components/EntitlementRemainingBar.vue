<template>
  <div class="remaining-bar" aria-label="固定顯示特休剩餘">
    <span class="remaining-label">特休剩餘</span>
    <span
      class="remaining-value"
      v-html="renderDays(totalRemainingHours)"
    ></span>
    <span v-if="!hireMonth" class="muted">請先設定到職日</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import store from "../store";

const totalRemainingHours = computed(
  () => store.totalRemainingHours.value || 0,
);

const hireMonth = computed(() => {
  const parts = String(store.hireDate.value || "").split("-");
  const month = Number(parts[1]);
  return month >= 1 && month <= 12 ? month : null;
});

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
  const hoursHtml =
    h === 0
      ? ""
      : `<span class="dot">·</span><span class="small-hours">${h}h</span>`;
  return `<span class="num">${parts.days}</span><span class="unit">天</span>${hoursHtml}`;
}
</script>

<style scoped></style>
