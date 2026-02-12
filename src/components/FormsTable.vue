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
          <tr v-for="(item, idx) in items" :key="String(item?.id ?? idx)">
            <td v-for="col in columns" :key="col.key">
              {{ getCell(item, col) }}
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
</script>

<style scoped></style>
