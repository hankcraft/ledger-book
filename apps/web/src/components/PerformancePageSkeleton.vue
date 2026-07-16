<script setup lang="ts">
import SkeletonBlock from "./SkeletonBlock.vue";
</script>

<template>
  <div class="perf-skeleton" aria-hidden="true">
    <!-- Metrics strip skeleton (3 cards) -->
    <div class="metrics-skeleton">
      <div v-for="i in 3" :key="i" class="metric-card-skeleton">
        <SkeletonBlock width="3.5rem" height="1.25rem" />
        <SkeletonBlock width="4.5rem" height="0.7rem" />
      </div>
    </div>

    <!-- Chart area skeleton -->
    <div class="chart-skeleton">
      <SkeletonBlock width="100%" height="180px" radius="var(--radius-md)" />
      <div class="legend-skeleton">
        <SkeletonBlock width="4rem" height="0.7rem" />
        <SkeletonBlock width="5rem" height="0.7rem" />
        <SkeletonBlock width="3rem" height="0.7rem" />
      </div>
    </div>

    <!-- Event list skeleton -->
    <div class="events-skeleton">
      <SkeletonBlock width="5rem" height="0.9rem" />
      <div v-for="i in 3" :key="i" class="event-item-skeleton">
        <SkeletonBlock width="2.5rem" height="0.8rem" />
        <SkeletonBlock width="2rem" height="1.25rem" radius="var(--radius-sm)" />
        <SkeletonBlock width="60%" height="0.8rem" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.perf-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  opacity: 0;
  animation: fade-in var(--duration-normal) var(--ease-out) forwards;
  animation-delay: 100ms;
}

.metrics-skeleton {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.metric-card-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.chart-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.legend-skeleton {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}

.events-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.event-item-skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

@keyframes fade-in {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .perf-skeleton {
    animation: none;
    opacity: 1;
  }
}
</style>
