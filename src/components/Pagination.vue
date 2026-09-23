<template>
  <nav class="pagination" aria-label="分頁">
    <p class="pagination-summary">{{ summary }}</p>

    <div class="pagination-nav">
      <button
        type="button"
        class="page-btn"
        aria-label="上一頁"
        :disabled="page <= 1"
        @click="goTo(page - 1)"
      >
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
        <span v-if="item === 'ellipsis'" class="page-ellipsis" aria-hidden="true">
          …
        </span>
        <button
          v-else
          type="button"
          class="page-btn"
          :class="{ 'is-current': item === page }"
          :aria-label="`第 ${item} 頁`"
          :aria-current="item === page ? 'page' : undefined"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="page-btn"
        aria-label="下一頁"
        :disabled="page >= totalPages"
        @click="goTo(page + 1)"
      >
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";

const page = defineModel<number>("page", { required: true });
const pageSize = defineModel<number>("pageSize", { required: true });

const props = defineProps<{
  total: number;
}>();

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / pageSize.value) || 1)
);

const summary = computed(() => {
  if (props.total === 0) return "共 0 筆";
  const start = (page.value - 1) * pageSize.value + 1;
  const end = Math.min(page.value * pageSize.value, props.total);
  return `第 ${start}–${end} 筆，共 ${props.total} 筆`;
});

type PageItem = number | "ellipsis";

const pageItems = computed<PageItem[]>(() => {
  const total = totalPages.value;
  const current = page.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let index = start; index <= end; index += 1) items.push(index);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
});

const goTo = (next: number) => {
  page.value = Math.min(Math.max(1, next), totalPages.value);
};
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 4px 18px 16px;
}

.pagination-summary {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.pagination-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--pill-shadow);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.page-btn.is-current {
  background: var(--yellow);
  box-shadow: none;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-ellipsis {
  min-width: 16px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 900px) {
  .pagination {
    align-items: flex-start;
  }
}
</style>
