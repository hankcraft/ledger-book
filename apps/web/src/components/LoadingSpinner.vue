<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number;
  }>(),
  {
    size: 16,
  },
);
</script>

<template>
  <svg
    class="loading-spinner"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    fill="none"
    aria-hidden="true"
  >
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="size / 2 - 2"
      stroke="currentColor"
      stroke-opacity="0.25"
      stroke-width="2"
    />
    <path
      :d="`M${size / 2} 2 A${size / 2 - 2} ${size / 2 - 2} 0 0 1 ${size - 2} ${size / 2}`"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.loading-spinner {
  animation: spin 800ms cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation-duration: 4s;
    animation-timing-function: linear;
  }
}
</style>
