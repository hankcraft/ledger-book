<script setup lang="ts">
defineProps<{ question: string }>();
</script>
<template>
  <h2 class="step-question">{{ question }}</h2>
</template>
<style scoped>
.step-question {
  margin: 0 0 var(--space-8);
  font-size: var(--text-large);
  font-weight: 500;
  line-height: 1.4;
  color: var(--ink);
  text-align: center;
}
</style>
