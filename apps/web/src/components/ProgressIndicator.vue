<script setup lang="ts">
defineProps<{ current: number; total: number }>();
</script>
<template>
  <div
    class="progress-indicator"
    role="progressbar"
    :aria-valuenow="current"
    :aria-valuemax="total"
  >
    <div
      v-for="i in total"
      :key="i"
      class="dot"
      :class="{ active: i <= current, current: i === current }"
    />
  </div>
</template>
<style scoped>
.progress-indicator {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
  transition:
    background 0.3s,
    transform 0.3s;
}
.dot.active {
  background: var(--accent);
}
.dot.current {
  transform: scale(1.3);
}
</style>
