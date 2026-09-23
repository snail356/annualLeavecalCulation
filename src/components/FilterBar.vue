<template>
  <div class="filter-bar">
    <EntitlementRemainingBar />

    <div class="filter-right">
      <slot name="actions" />
      <PillSelect
        v-if="showFilters"
        label="年度"
        :model-value="year"
        :options="yearOptions"
        @update:model-value="onYearChange"
      />
      <PillSelect
        v-if="showFilters"
        label="假別"
        :model-value="type"
        :options="typeOptions"
        @update:model-value="onTypeChange"
      />
      <slot name="end" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import EntitlementRemainingBar from "./EntitlementRemainingBar.vue";
import PillSelect from "./PillSelect.vue";

type Props = {
  year: string;
  years: string[];
  type: string;
  types: string[];
  showFilters?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showFilters: true,
});
const { year, years, type, types, showFilters } = toRefs(props);
const yearOptions = computed(() => [
  { value: "all", label: "全部" },
  ...years.value.map((value) => ({ value, label: value })),
]);
const typeOptions = computed(() => [
  { value: "all", label: "全部" },
  ...types.value.map((value) => ({ value, label: value })),
]);

const emit = defineEmits<{
  (e: "update:year", value: string): void;
  (e: "update:type", value: string): void;
}>();

const onYearChange = (value: string) => {
  emit("update:year", value);
};

const onTypeChange = (value: string) => {
  emit("update:type", value);
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

@media (max-width: 900px) {
  .filter-right {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}

</style>
