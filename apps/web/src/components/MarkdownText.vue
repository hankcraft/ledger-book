<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { marked } from "marked";

const props = withDefaults(
  defineProps<{
    content: string;
    /** Enable character-by-character streaming animation */
    animate?: boolean;
    /** Characters revealed per frame (higher = faster) */
    speed?: number;
  }>(),
  {
    animate: true,
    speed: 3,
  },
);

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

const displayedLength = ref(props.animate ? 0 : props.content.length);
const isRevealing = ref(false);
let rafId: number | null = null;

const rendered = computed(() => {
  if (!props.animate || displayedLength.value >= props.content.length) {
    return marked.parse(props.content) as string;
  }
  // Render only the revealed portion
  const partial = props.content.slice(0, displayedLength.value);
  return marked.parse(partial) as string;
});

function startReveal(): void {
  if (!props.animate || displayedLength.value >= props.content.length) return;
  isRevealing.value = true;

  function tick(): void {
    displayedLength.value = Math.min(displayedLength.value + props.speed, props.content.length);

    if (displayedLength.value >= props.content.length) {
      isRevealing.value = false;
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}

// When content changes (e.g. new message appended to same element), animate the new part
watch(
  () => props.content,
  (newContent, oldContent) => {
    if (props.animate && newContent.length > (oldContent?.length ?? 0)) {
      // Keep revealed portion, animate the rest
      displayedLength.value = Math.min(displayedLength.value, newContent.length);
      startReveal();
    } else if (!props.animate) {
      displayedLength.value = newContent.length;
    }
  },
);

onMounted(() => {
  if (props.animate && displayedLength.value < props.content.length) {
    startReveal();
  } else {
    displayedLength.value = props.content.length;
  }
});

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-text" :class="{ revealing: isRevealing }" v-html="rendered" />
</template>

<style scoped>
.markdown-text {
  font-size: var(--text-caption);
  line-height: var(--leading-relaxed, 1.7);
  color: var(--ink);
}

.markdown-text.revealing::after {
  content: "▍";
  animation: blink 0.6s step-end infinite;
  color: var(--muted);
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.markdown-text :deep(p) {
  margin: 0 0 var(--space-2);
}

.markdown-text :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-text :deep(strong) {
  font-weight: var(--weight-semibold, 600);
}

.markdown-text :deep(ul),
.markdown-text :deep(ol) {
  margin: var(--space-2) 0;
  padding-left: var(--space-5, 1.25rem);
}

.markdown-text :deep(li) {
  margin-bottom: var(--space-1);
}

.markdown-text :deep(code) {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.875em;
  background: var(--neutral-subtle);
  padding: 1px var(--space-1);
  border-radius: 3px;
}

.markdown-text :deep(pre) {
  background: var(--neutral-subtle);
  padding: var(--space-3);
  border-radius: var(--radius-md, 8px);
  overflow-x: auto;
  margin: var(--space-2) 0;
}

.markdown-text :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-text :deep(blockquote) {
  margin: var(--space-2) 0;
  padding-left: var(--space-3);
  border-left: 3px solid var(--line);
  color: var(--muted);
}

.markdown-text :deep(a) {
  color: var(--action-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-text :deep(hr) {
  border: none;
  border-top: 1px solid var(--line);
  margin: var(--space-3) 0;
}
</style>
