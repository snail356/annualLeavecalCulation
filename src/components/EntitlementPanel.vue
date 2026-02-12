<template>
  <section class="card tab-panel" id="tab-entitlement" role="tabpanel">
    <div class="entitlement">
      <div class="entitlement-row">
        <div class="field">
          <label for="hire-date">到職日</label>
          <input
            id="hire-date"
            type="date"
            v-model="hireDate"
            @change="updateResult"
          />
        </div>
        <div class="field">
          <span id="excel-status" class="upload-status" v-if="excelStatus">{{
            excelStatus
          }}</span>
          <label class="upload-label" for="excel-upload">上傳 Excel</label>
          <input
            id="excel-upload"
            class="upload-input"
            type="file"
            accept=".xls,.xlsx"
            @change="onUpload"
          />
        </div>
      </div>
      <div id="excel-result" class="result-box">
        <div class="entitlement-summary">
          <table class="entitlement-table" aria-label="前一年特休彙整">
            <thead>
              <tr>
                <th>前一年項目</th>
                <th class="num-col">天數</th>
                <th class="num-col">小時</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>前一年 特休（去年給的）</td>
                <td
                  class="num-col"
                  v-html="renderDays(prevEntitlementHours)"
                ></td>
                <td class="num-col">&nbsp;</td>
              </tr>
              <tr>
                <td>前一年 已休</td>
                <td class="num-col" v-html="renderDays(-prevUsedHours)"></td>
                <td class="num-col">&nbsp;</td>
              </tr>
              <tr>
                <td>前一年 剩餘</td>
                <td
                  class="num-col"
                  v-html="renderDays(prevRemainingHours)"
                ></td>
                <td class="num-col">&nbsp;</td>
              </tr>
            </tbody>
          </table>
          <table class="entitlement-table" aria-label="今年特休彙整">
            <thead>
              <tr>
                <th>今年項目</th>
                <th class="num-col">天數</th>
                <th class="num-col">小時</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>今年 特休（去年給的）</td>
                <td
                  class="num-col"
                  v-html="renderDays(currentEntitlementHours)"
                ></td>
                <td class="num-col">&nbsp;</td>
              </tr>
              <tr>
                <td>今年 已休</td>
                <td class="num-col" v-html="renderDays(-currentUsedHours)"></td>
                <td class="num-col">&nbsp;</td>
              </tr>
              <tr>
                <td>今年 剩餘</td>
                <td
                  class="num-col"
                  v-html="renderDays(currentRemainingHours)"
                ></td>
                <td class="num-col">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>
        <table class="entitlement-total" aria-label="總剩餘特休">
          <tbody>
            <tr>
              <td>總剩餘</td>
              <td class="num-col" v-html="renderDays(totalRemainingHours)"></td>
              <td class="num-col">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import store from "../store";

const hireDate = store.hireDate;
const excelStatus = computed(() => store.excelStatus.value || "");

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
  const hoursHtml =
    h === 0
      ? ""
      : `<span class="dot">·</span><span class="small-hours">${h}h</span>`;
  return `<span class="num">${parts.days}</span><span class="unit">天</span>${hoursHtml}`;
}

function onUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      const XLSX = (window as any).XLSX;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: "",
      });
      const parsed = store.parseEntitlementRows(rows);
      if (parsed.error) {
        store.setExcelStatus(parsed.error);
        return;
      }
      store.entitlementMap.value = parsed.map;
      store.setExcelStatus(`已載入：${file.name}`);
      store.recomputeEntitlement();
    } catch (err) {
      store.setExcelStatus("解析 Excel 失敗");
    }
  };
  reader.onerror = () => store.setExcelStatus("讀取 Excel 失敗");
  reader.readAsArrayBuffer(file);
}

function updateResult() {
  store.recomputeEntitlement();
}
</script>

<style scoped></style>
