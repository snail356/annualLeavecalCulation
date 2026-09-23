<template>
  <div class="select-wrap" :class="{ 'is-open': open }" ref="root">
    <button
      type="button"
      class="select-trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span v-if="label" class="select-label">{{ label }}</span>
      <span class="select-value">{{ currentLabel }}</span>
      <i
        class="fa-solid fa-chevron-down select-icon"
        :class="{ 'is-open': open }"
        aria-hidden="true"
      ></i>
    </button>
    <ul
      v-show="open"
      class="select-menu"
      :class="{ 'is-up': menuPlacement === 'up' }"
      role="listbox"
    >
      <li v-for="option in options" :key="option.value">
        <button
          type="button"
          class="select-option"
          role="option"
          :class="{ 'is-selected': option.value === modelValue }"
          :aria-selected="option.value === modelValue"
          @click="choose(option.value)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type Option = {
  value: string;
  label: string;
};

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    options: Option[];
    menuPlacement?: "down" | "up";
  }>(),
  {
    menuPlacement: "down",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const instanceId = Symbol("pill-select");

const currentLabel = computed(() => {
  return (
    props.options.find((option) => option.value === props.modelValue)?.label ||
    "全部"
  );
});

const choose = (value: string) => {
  emit("update:modelValue", value);
  open.value = false;
};

const toggle = () => {
  const next = !open.value;
  if (next) {
    document.dispatchEvent(
      new CustomEvent("pill-select-open", { detail: instanceId }),
    );
  }
  open.value = next;
};

const onOtherOpen = (event: Event) => {
  if ((event as CustomEvent<symbol>).detail !== instanceId) open.value = false;
};

const onPointerDown = (event: PointerEvent) => {
  if (!open.value) return;
  const target = event.target as Node | null;
  if (target && root.value?.contains(target)) return;
  open.value = false;
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") open.value = false;
};

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pill-select-open", onOtherOpen);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("pill-select-open", onOtherOpen);
});
</script>

<style scoped>
.select-wrap {
  position: relative;
}

.select-wrap.is-open {
  z-index: 30;
}

.select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px 0 16px;
  border: none;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(40, 40, 55, 0.06);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}

.select-trigger:focus-visible {
  outline: 2px solid #1c1c1f;
  outline-offset: 2px;
}

.select-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.select-value {
  font-size: 14px;
  font-weight: 500;
  color: #5f5f68;
  white-space: nowrap;
}

.select-icon {
  font-size: 11px;
  color: var(--muted);
  transition: transform 0.15s ease;
}

.select-icon.is-open {
  transform: rotate(180deg);
}

.select-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  min-width: 100%;
  max-height: 280px;
  margin: 0;
  padding: 6px;
  overflow: auto;
  list-style: none;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(40, 40, 55, 0.14);
}

.select-menu.is-up {
  top: auto;
  bottom: calc(100% + 8px);
}

@media (max-width: 900px) {
  .select-menu {
    right: auto;
    left: 0;
  }
}

.select-option {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.select-option:hover,
.select-option:focus-visible {
  background: #fff4c8;
  outline: none;
}

.select-option.is-selected {
  background: var(--yellow);
  font-weight: 600;
}
</style>
