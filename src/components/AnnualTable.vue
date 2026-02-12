<template>
  <section class="card tab-panel" id="tab-annual" role="tabpanel">
    <div class="table-wrap">
      <table aria-label="年度請假時數統計">
        <thead>
          <tr>
            <th>年度</th>
            <th class="num-col">總請假時數</th>
            <th class="num-col">年假時數</th>
            <th class="num-col">病假</th>
            <th class="num-col">喪假</th>
            <th class="num-col">疫苗假</th>
            <th class="num-col">公假</th>
            <th class="num-col">婚假</th>
          </tr>
        </thead>
        <tbody id="annual-body">
          <tr v-for="entry in rows" :key="entry.year">
            <td>{{ entry.year }}</td>
            <td class="num-col" v-html="renderDaysHtml(entry.totalHours)"></td>
            <td
              class="num-col"
              :class="{ 'annual-bold': entry.typeHours['年假'] !== 0 }"
              v-html="renderDaysHtml(entry.typeHours['年假'])"
            ></td>
            <td
              class="num-col"
              v-html="renderDaysHtml(entry.typeHours['病假'])"
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
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import store, { loadForms, loadDefaultExcel } from "../store";

const ready = ref(false);

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
  const hoursHtml =
    h === 0
      ? ""
      : `<span class="dot">·</span><span class="small-hours">${h}h</span>`;
  return `<span class="num">${parts.days}</span><span class="unit">天</span>${hoursHtml}`;
}

onMounted(async () => {
  if (!store.allItems.value || store.allItems.value.length === 0) {
    await loadForms();
  }
  if (!store.entitlementMap.value || store.entitlementMap.value.size === 0) {
    await loadDefaultExcel();
  }
  ready.value = true;
});
</script>

<style scoped></style>
