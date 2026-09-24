<template>
  <section class="card tab-panel" id="tab-annual" role="tabpanel">
    <DataTable
      v-model:page-size="pageSize"
      :rows="rows"
      aria-label="年度請假時數統計"
      empty-text="沒有年度資料"
    >
      <template #head>
        <tr>
          <th>年度</th>
          <th class="num-col">特休天數</th>
          <th class="num-col">年假時數</th>
          <th class="num-col">剩餘天數</th>
          <th class="num-col leave-split">病假</th>
          <th class="num-col">生理假</th>
          <th class="num-col">喪假</th>
          <th class="num-col">疫苗假</th>
          <th class="num-col">公假</th>
          <th class="num-col">婚假</th>
        </tr>
      </template>
      <template #body="{ rows: pageRows }">
        <tr v-for="entry in pageRows" :key="entry.year">
            <td>{{ entry.year }}</td>
            <td
              class="num-col"
              v-html="renderEntitlementDaysHtml(entry.year)"
            ></td>
            <td
              class="num-col"
              :class="{ 'annual-bold': entry.typeHours['年假'] !== 0 }"
              v-html="renderDaysHtml(entry.typeHours['年假'])"
            ></td>
            <td
              class="num-col"
              :class="{ 'annual-bold': remainingHours(entry) !== 0 }"
              v-html="renderRemainingHtml(entry)"
            ></td>
            <td
              class="num-col leave-split"
              v-html="renderDaysHtml(entry.typeHours['病假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['生理假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['喪假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['疫苗假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['公假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['婚假'])"
            ></td>
          </tr>
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import store, { loadForms } from "../store";
import DataTable from "./DataTable.vue";

const pageSize = defineModel<number>("pageSize", { default: 10 });

const rows = computed(() => store.annualTotals.value || []);

function splitDaysHours(hours: number | string) {
  const total = Number(hours) || 0;
  const sign = total < 0 ? "-" : "";
  const absTotal = Math.abs(total);
  const days = Math.floor(absTotal / 8);
  let remain = Math.round((absTotal - days * 8) * 100) / 100;
  if (Math.abs(remain - Math.round(remain)) < 1e-8) remain = Math.round(remain);
  return { days: sign + String(days), hours: String(remain) };
}

function renderDaysHtml(value: number) {
  const parts = splitDaysHours(value);
  const d = Number(parts.days) || 0;
  const h = Number(parts.hours) || 0;
  if (d === 0 && h === 0) return '<span class="muted">-</span>';
  const hoursHtml = h === 0 ? "" : `<span class="small-hours">${h}h</span>`;
  return `<span class="num">${parts.days}</span><span class="unit">天</span>${hoursHtml}`;
}

function hasEntitlement(year: number) {
  return (
    store.getEntitlementDays(year) !== null ||
    store.getEntitlementRemainingHours(year) !== null
  );
}

function renderEntitlementDaysHtml(year: number) {
  const days = store.getEntitlementDays(year);
  const extra = store.getEntitlementRemainingHours(year);
  if (!hasEntitlement(year)) return '<span class="muted">-</span>';
  const dayHtml =
    days === null
      ? ""
      : `<span class="num">${Math.round(days * 100) / 100}</span><span class="unit">天</span>`;
  const hoursHtml =
    !extra
      ? ""
      : `<span class="small-hours">${Math.round(extra * 100) / 100}h</span>`;
  return dayHtml || hoursHtml
    ? `${dayHtml}${hoursHtml}`
    : '<span class="num">0</span><span class="unit">天</span>';
}

function remainingHours(entry: { year: number; typeHours: Record<string, number> }) {
  return store.remainingHoursForYear(entry.year, entry.typeHours["年假"] || 0) ?? 0;
}

function renderRemainingHtml(entry: { year: number; typeHours: Record<string, number> }) {
  if (!hasEntitlement(entry.year)) return '<span class="muted">-</span>';
  const hours = remainingHours(entry);
  if (hours === 0) return '<span class="num">0</span><span class="unit">天</span>';
  return renderDaysHtml(hours);
}

onMounted(async () => {
  if (!store.allItems.value || store.allItems.value.length === 0) {
    await loadForms();
  }
});
</script>

<style scoped>
.leave-split {
  border-left: 1px dashed #dddde4;
}
</style>
