<template>
  <div v-show="visible">
    <div class="tabs" role="tablist">
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'forms' }"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'forms'"
        aria-controls="tab-forms"
        data-tab="forms"
        @click="setTab('forms')"
      >
        表單明細
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'annual' }"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'annual'"
        aria-controls="tab-annual"
        data-tab="annual"
        @click="setTab('annual')"
      >
        年度請假時數計算
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'entitlement' }"
        type="button"
        role="tab"
        :aria-selected="activeTab === 'entitlement'"
        aria-controls="tab-entitlement"
        data-tab="entitlement"
        @click="setTab('entitlement')"
      >
        特休應得查詢
      </button>
    </div>

    <slot name="between" />

    <div v-show="activeTab === 'forms'">
      <slot name="forms" />
    </div>
    <div v-show="activeTab === 'annual'">
      <slot name="annual" />
    </div>
    <div v-show="activeTab === 'entitlement'">
      <slot name="entitlement" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type TabName = "forms" | "annual" | "entitlement";

const props = withDefaults(
  defineProps<{
    modelValue?: TabName;
    visible?: boolean;
  }>(),
  {
    modelValue: "forms",
    visible: true,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: TabName): void;
}>();

const activeTab = computed<TabName>({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const visible = computed(() => props.visible);

const setTab = (tab: TabName) => {
  activeTab.value = tab;
};
</script>

<style scoped></style>
