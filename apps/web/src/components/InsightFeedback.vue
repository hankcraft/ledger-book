<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";

const props = defineProps<{ text: string; showContinue?: boolean }>();
const emit = defineEmits<{ continue: [] }>();

const displayedText = ref("");
const isTyping = ref(true);
let timer: ReturnType<typeof setTimeout> | null = null;
let charIndex = 0;

function startTyping() {
  displayedText.value = "";
  charIndex = 0;
  isTyping.value = true;
  typeNext();
}

function typeNext() {
  if (charIndex < props.text.length) {
    displayedText.value += props.text[charIndex];
    charIndex++;
    timer = setTimeout(typeNext, Math.random() * 30 + 20);
  } else {
    isTyping.value = false;
  }
}

watch(
  () => props.text,
  () => {
    if (timer) clearTimeout(timer);
    startTyping();
  },
  { immediate: true },
);
onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="insight-feedback">
    <div class="insight-icon">💡</div>
    <p class="insight-text">{{ displayedText }}<span v-if="isTyping" class="cursor">|</span></p>
    <Transition name="fade">
      <button v-if="!isTyping && showContinue" class="continue-btn" @click="emit('continue')">
        繼續
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.insight-feedback {
  width: 100%;
  padding: var(--space-6);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.insight-icon {
  font-size: 1.5rem;
  margin-bottom: var(--space-3);
}
.insight-text {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.8;
  color: var(--ink);
}
.cursor {
  animation: blink 0.8s infinite;
  color: var(--accent);
}
@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
.continue-btn {
  margin-top: var(--space-6);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--action-primary);
  color: var(--on-ink);
  font-weight: 500;
  transition: background 0.2s;
}
.continue-btn:hover {
  background: var(--action-hover);
}
.fade-enter-active {
  transition: opacity 0.3s 0.2s;
}
.fade-enter-from {
  opacity: 0;
}
</style>
