<template>
  <div class="filter-bar">
    <EntitlementRemainingBar />

    <div class="filter-right" :class="{ 'is-hidden': !showFilters }">
      <span
        id="upload-status"
        class="upload-status"
        :class="{ 'is-error': isUploadError }"
        :hidden="!uploadStatus"
        >{{ uploadStatus }}</span
      >
      <label class="upload-label" for="json-upload">
        <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
        上傳
      </label>
      <input
        id="json-upload"
        class="upload-input"
        type="file"
        accept=".json,application/json"
        @change="onUpload"
      />
      <div class="select-wrap">
        <label for="year-filter">年度</label>
        <select id="year-filter" :value="year" @change="onYearChange">
          <option value="all">全部</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <i class="fa-solid fa-chevron-down select-icon" aria-hidden="true"></i>
      </div>

      <div class="select-wrap">
        <label for="type-filter">假別</label>
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
import { computed, toRefs } from "vue";
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
const isUploadError = computed(() => /失敗|錯誤/.test(uploadStatus.value));

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
  display: none;
}

@media (max-width: 900px) {
  .filter-right {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}

.select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 32px 0 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(40, 40, 55, 0.06);
}

.select-wrap label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}

.select-wrap select {
  padding-right: 4px;
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
