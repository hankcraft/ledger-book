<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    radius?: string;
    circle?: boolean;
  }>(),
  {
    width: "100%",
    height: "1em",
    radius: "var(--radius-sm)",
    circle: false,
  },
);
</script>

<template>
  <span
    class="skeleton-block"
    :class="{ 'skeleton-circle': circle }"
    :style="{
      width: circle ? height : width,
      height,
      borderRadius: circle ? '50%' : radius,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton-block {
  display: inline-block;
  background: var(--neutral-subtle);
  background-image: linear-gradient(
    90deg,
    var(--neutral-subtle) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    var(--neutral-subtle) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-circle {
  flex-shrink: 0;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
    background-image: none;
  }
}
</style>
