<template>
  <header>
    <h1>請假表單彙整</h1>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import store from "../store";

const sourceLabel = computed(
  () => store.sourceLabel.value || "data/forms.json",
);
</script>

<style scoped></style>
