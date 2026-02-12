<template>
  <section class="card tab-panel" id="tab-forms" role="tabpanel">
    <div class="table-wrap">
      <table aria-label="請假表單列表">
        <thead>
          <tr id="table-head">
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr
            v-for="(item, idx) in items"
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
import { toRefs } from "vue";
import store from "../store";

type Column = { key: string; label: string; fromId?: boolean };

const props = defineProps<{ items: any[] }>();
const { items } = toRefs(props);

const columns = store.columns as unknown as Column[];

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
