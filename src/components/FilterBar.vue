<template>
  <div class="filter-bar">
    <EntitlementRemainingBar />

    <div class="filter-right" :class="{ 'is-hidden': !showFilters }">
      <span id="upload-status" class="upload-status" :hidden="!uploadStatus">{{
        uploadStatus
      }}</span>
      <label class="upload-label" for="json-upload">上傳 JSON</label>
      <input
        id="json-upload"
        class="upload-input"
        type="file"
        accept=".json,application/json"
        @change="onUpload"
      />
      <label for="year-filter">年度篩選</label>
      <div class="select-wrap">
        <select id="year-filter" :value="year" @change="onYearChange">
          <option value="all">全部</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <i class="fa-solid fa-chevron-down select-icon" aria-hidden="true"></i>
      </div>

      <label for="type-filter">假別篩選</label>
      <div class="select-wrap">
        <select id="type-filter" :value="type" @change="onTypeChange">
          <option value="all">全部</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
        <i class="fa-solid fa-chevron-down select-icon" aria-hidden="true"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
import EntitlementRemainingBar from "./EntitlementRemainingBar.vue";

type Props = {
  year: string;
  years: string[];
  type: string;
  types: string[];
  uploadStatus: string;
  showFilters?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showFilters: true,
});
const { year, years, type, types, uploadStatus, showFilters } = toRefs(props);

const emit = defineEmits<{
  (e: "update:year", value: string): void;
  (e: "update:type", value: string): void;
  (e: "upload-json", file: File): void;
}>();

const onYearChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:year", target.value);
};

const onTypeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:type", target.value);
};

const onUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  emit("upload-json", file);
  target.value = "";
};
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.filter-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.filter-right.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.select-wrap select {
  padding-right: 34px;
}

.select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 12px;
  color: var(--muted);
}
</style>
