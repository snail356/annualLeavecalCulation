<template>
  <div>
    <HeaderBar />
    <main>
      <div id="status" v-show="showStatus" :class="{ loading: isLoading }">
        {{ statusText }}
      </div>

      <TabsBar v-model="currentTab" :visible="showTabs">
        <template #between>
          <FilterBar
            :show-filters="currentTab === 'forms'"
            v-model:year="selectedYear"
            v-model:type="selectedType"
            :years="availableYears"
            :types="availableTypes"
            :upload-status="uploadStatus"
            @upload-json="onUploadJson"
          />
        </template>
        <template #forms>
          <FormsTable :items="filteredItems" />
        </template>
        <template #annual>
          <AnnualTable />
        </template>
        <template #entitlement>
          <EntitlementPanel />
        </template>
      </TabsBar>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import HeaderBar from "./components/HeaderBar.vue";
import TabsBar from "./components/TabsBar.vue";
import FilterBar from "./components/FilterBar.vue";
import FormsTable from "./components/FormsTable.vue";
import AnnualTable from "./components/AnnualTable.vue";
import EntitlementPanel from "./components/EntitlementPanel.vue";
import store, { loadDefaultExcel, loadForms } from "./store";

type TabName = "forms" | "annual" | "entitlement";

const currentTab = ref<TabName>("forms");
const selectedYear = ref<string>("all");
const selectedType = ref<string>("all");

const statusText = computed(() => store.statusText.value || "讀取中…");
const isLoading = computed(() => statusText.value.includes("讀取"));
const showTabs = computed(() => !isLoading.value);
const showStatus = computed(() => statusText.value !== "就緒");

const uploadStatus = computed(() => store.uploadStatus.value || "");

const availableTypes = computed(() => {
  const types = new Set<string>();
  (store.allItems.value || []).forEach((item: any) => {
    const kv = item?.detail?.kv || {};
    const type = String(kv["假别"] ?? "").trim();
    if (type) types.add(type);
  });
  return Array.from(types).sort((a, b) => a.localeCompare(b, "zh-Hant"));
});

const extractYear = (value: unknown) => {
  if (!value) return "";
  const m = String(value).match(/(\d{4})/);
  return m ? m[1] : "";
};

const availableYears = computed(() => {
  const years = new Set<string>();
  (store.allItems.value || []).forEach((item: any) => {
    const kv = item?.detail?.kv || {};
    const year = extractYear(kv["起始日期"] || kv["申請時間"]);
    if (year) years.add(year);
  });
  return Array.from(years).sort((a, b) => Number(a) - Number(b));
});

const filteredItems = computed(() => {
  const items = store.allItems.value || [];
  return items.filter((item: any) => {
    const kv = item?.detail?.kv || {};
    const year = extractYear(kv["起始日期"] || kv["申請時間"]);
    const type = String(kv["假别"] ?? "").trim();
    const passYear =
      selectedYear.value === "all" ? true : year === selectedYear.value;
    const passType =
      selectedType.value === "all" ? true : type === selectedType.value;
    return passYear && passType;
  });
});

const onUploadJson = async (file: File) => {
  try {
    store.setUploadStatus("讀取檔案中…");
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("JSON 格式錯誤");
    store.applyData(data, file.name);
    store.setUploadStatus(`已載入：${file.name}`);
    selectedYear.value = "all";
    selectedType.value = "all";
  } catch {
    store.setUploadStatus("JSON 載入失敗");
  }
};

onMounted(async () => {
  await loadForms();
  await loadDefaultExcel();
});
</script>

<style>
/* global styles handled by imported stylesheet */
</style>
