<script setup lang="ts">
import SkeletonBlock from "./SkeletonBlock.vue";
</script>

<template>
  <div class="home-skeleton" aria-hidden="true">
    <!-- Performance banner skeleton -->
    <div class="banner-skeleton">
      <div class="banner-row">
        <SkeletonBlock width="40%" height="1.25rem" />
        <SkeletonBlock width="3.5rem" height="1.5rem" radius="var(--radius-md)" />
      </div>
      <SkeletonBlock width="65%" height="0.8rem" />
    </div>

    <!-- Greeting skeleton -->
    <div class="greeting-skeleton">
      <SkeletonBlock width="90%" height="0.9rem" />
      <SkeletonBlock width="70%" height="0.9rem" />
    </div>

    <!-- Contextual insight card skeleton -->
    <div class="insight-skeleton">
      <SkeletonBlock width="30%" height="0.75rem" />
      <SkeletonBlock width="100%" height="0.85rem" />
      <SkeletonBlock width="85%" height="0.85rem" />
      <SkeletonBlock width="60%" height="0.85rem" />
    </div>

    <!-- Attention section skeleton -->
    <div class="attention-skeleton">
      <SkeletonBlock width="4.5rem" height="0.7rem" />
      <div class="attention-item-skeleton">
        <SkeletonBlock width="2rem" height="2rem" radius="var(--radius-md)" />
        <div class="attention-text">
          <SkeletonBlock width="60%" height="0.85rem" />
          <SkeletonBlock width="40%" height="0.7rem" />
        </div>
      </div>
      <div class="attention-item-skeleton">
        <SkeletonBlock width="2rem" height="2rem" radius="var(--radius-md)" />
        <div class="attention-text">
          <SkeletonBlock width="75%" height="0.85rem" />
          <SkeletonBlock width="50%" height="0.7rem" />
        </div>
      </div>
    </div>

    <!-- Action options skeleton -->
    <div class="actions-skeleton">
      <SkeletonBlock width="100%" height="2.75rem" radius="var(--radius-md)" />
      <SkeletonBlock width="100%" height="2.75rem" radius="var(--radius-md)" />
    </div>
  </div>
</template>

<style scoped>
.home-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  opacity: 0;
  animation: fade-in var(--duration-normal) var(--ease-out) forwards;
  animation-delay: 100ms;
}

.banner-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.banner-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.greeting-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.insight-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.attention-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.attention-item-skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.attention-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.actions-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@keyframes fade-in {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-skeleton {
    animation: none;
    opacity: 1;
  }
}
</style>
