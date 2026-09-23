<template>
  <div class="data-table">
    <div class="table-wrap">
      <table :aria-label="ariaLabel">
        <thead>
          <slot name="head" />
        </thead>
        <tbody v-if="pageRows.length">
          <slot name="body" :rows="pageRows" />
        </tbody>
      </table>
      <p v-if="!rows.length" class="table-empty">{{ emptyText }}</p>
    </div>
    <Pagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="rows.length"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Pagination from "./Pagination.vue";

const props = withDefaults(
  defineProps<{
    rows: any[];
    ariaLabel?: string;
    emptyText?: string;
  }>(),
  {
    ariaLabel: "資料表",
    emptyText: "沒有資料",
  }
);

const page = ref(1);
const pageSize = defineModel<number>("pageSize", { default: 10 });

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return props.rows.slice(start, start + pageSize.value);
});

watch(
  () => props.rows,
  () => {
    page.value = 1;
  }
);

watch(pageSize, () => {
  page.value = 1;
});
</script>

<style scoped>
.table-empty {
  margin: 0;
  padding: 28px 16px 16px;
  text-align: center;
  color: var(--muted);
}
</style>
