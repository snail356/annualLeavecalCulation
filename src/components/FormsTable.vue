<template>
  <section class="card tab-panel" id="tab-forms" role="tabpanel">
    <DataTable
      v-model:page-size="pageSize"
      :rows="sortedItems"
      aria-label="請假表單列表"
      empty-text="沒有符合的表單"
    >
      <template #head>
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
              <i
                class="fa-solid th-sort-icon"
                :class="sortIconClass"
                aria-hidden="true"
              ></i>
            </span>
            <template v-else>{{ col.label }}</template>
          </th>
        </tr>
      </template>
      <template #body="{ rows }">
        <tr
          v-for="(item, idx) in rows"
          :key="String(item?.id ?? idx)"
          :class="rowClass(item)"
        >
          <td v-for="col in columns" :key="col.key">
            <template v-if="col.key === '表單目前狀態'">
              <span class="status" :class="statusTone(item)">
                {{ getCell(item, col) }}
              </span>
            </template>
            <template v-else-if="col.key === '申請人'">
              <span class="person">
                <span
                  class="avatar"
                  :style="{ background: avatarColor(getCell(item, col)) }"
                  aria-hidden="true"
                >
                  {{ initial(getCell(item, col)) }}
                </span>
                <span class="person-name">{{ getCell(item, col) }}</span>
              </span>
            </template>
            <template v-else-if="col.fromId && getFormUrl(item)">
              <a
                class="form-link"
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
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import store from "../store";
import DataTable from "./DataTable.vue";

const pageSize = defineModel<number>("pageSize", { default: 10 });

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
const startDateSort = ref<SortDir>("desc");

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

const sortIconClass = computed(() => {
  if (startDateSort.value === "asc") return "fa-chevron-up";
  if (startDateSort.value === "desc") return "fa-chevron-down";
  return "fa-sort";
});

const statusTone = (item: any) => {
  const status = String(item?.detail?.kv?.["表單目前狀態"] ?? "");
  if (status.startsWith("同意")) return "is-ok";
  if (status.includes("駁回") || status.includes("拒絕")) return "is-alert";
  return "is-quiet";
};

const initial = (name: string) => {
  const text = String(name || "").trim();
  return text ? text.slice(0, 1) : "?";
};

const avatarColor = (name: string) => {
  const palette = ["#f0d2c4", "#d7ead8", "#d5e2f6", "#f6e4ae", "#e6d4f2", "#f7d0d0"];
  const text = String(name || "");
  let hash = 0;
  for (const ch of text) hash = (hash + ch.charCodeAt(0)) % palette.length;
  return palette[hash] || palette[0];
};

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
