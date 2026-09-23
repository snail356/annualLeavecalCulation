<template>
  <section class="card tab-panel" id="tab-forms" role="tabpanel">
    <div class="table-wrap">
      <table aria-label="請假表單列表">
        <thead>
          <tr id="table-head">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="{ 'th-sortable': col.sortable }"
              :aria-sort="col.sortable ? ariaSort : undefined"
              @click="col.sortable ? toggleStartDateSort() : undefined"
            >
              <span v-if="col.sortable" class="th-sort-label">
                {{ col.label }}
                <span class="th-sort-icon" aria-hidden="true">{{ sortIcon }}</span>
              </span>
              <template v-else>{{ col.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr
            v-for="(item, idx) in sortedItems"
            :key="String(item?.id ?? idx)"
            :class="rowClass(item)"
          >
            <td v-for="col in columns" :key="col.key">
              <template v-if="col.fromId && getFormUrl(item)">
                <a
                  :href="getFormUrl(item)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ getCell(item, col) }}
                </a>
              </template>
              <template v-else>
                {{ getCell(item, col) }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import store from "../store";

type Column = {
  key: string;
  label: string;
  fromId?: boolean;
  sortable?: boolean;
};

type SortDir = "asc" | "desc" | null;

const props = defineProps<{ items: any[] }>();
const { items } = toRefs(props);

const columns = store.columns as unknown as Column[];
const startDateSort = ref<SortDir>(null);

const parseStartDate = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const time = Date.parse(text.replace(/\//g, "-"));
  return Number.isFinite(time) ? time : 0;
};

const sortedItems = computed(() => {
  const list = [...items.value];
  if (!startDateSort.value) return list;
  const dir = startDateSort.value === "asc" ? 1 : -1;
  return list.sort((a, b) => {
    const ka = a?.detail?.kv || {};
    const kb = b?.detail?.kv || {};
    const diff = parseStartDate(ka["起始日期"]) - parseStartDate(kb["起始日期"]);
    if (diff !== 0) return diff * dir;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
});

const sortIcon = computed(() => {
  if (startDateSort.value === "asc") return "▲";
  if (startDateSort.value === "desc") return "▼";
  return "⇅";
});

const ariaSort = computed(() => {
  if (startDateSort.value === "asc") return "ascending";
  if (startDateSort.value === "desc") return "descending";
  return "none";
});

const toggleStartDateSort = () => {
  if (!startDateSort.value) startDateSort.value = "desc";
  else if (startDateSort.value === "desc") startDateSort.value = "asc";
  else startDateSort.value = null;
};

const getCell = (item: any, col: Column) => {
  if (col.fromId) return String(item?.id ?? "");
  const kv = item?.detail?.kv || {};
  return String(kv[col.key] ?? "");
};

const getFormUrl = (item: any) => {
  const url = String(item?.detail?.url ?? "").trim();
  return url || "";
};

const rowClass = (item: any) => {
  const kv = item?.detail?.kv || {};
  const status = String(kv["表單目前狀態"] ?? "");
  return { "row-muted": status !== "同意結束(待歸檔)" };
};
</script>

<style scoped></style>
