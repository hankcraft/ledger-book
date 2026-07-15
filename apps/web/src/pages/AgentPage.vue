<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AgentInsightCard from "../components/AgentInsightCard.vue";
import ChatMessage from "../components/ChatMessage.vue";
import ConfirmationQuestion from "../components/ConfirmationQuestion.vue";
import EvidenceCard from "../components/EvidenceCard.vue";
import MemoryRecall from "../components/MemoryRecall.vue";
import PastConversations from "../components/PastConversations.vue";
import ScenarioComparison from "../components/ScenarioComparison.vue";
import { useConversation } from "../composables/useConversation";

const route = useRoute();
const router = useRouter();
const {
  messages,
  isPlaying,
  error,
  pastConversations,
  beginNewConversation,
  startDefaultConversation,
  startNewConversation,
  resumeConversation,
  loadPastConversations,
  selectOption,
} = useConversation();

const userInput = ref("");
const historyExpanded = ref(false);
const selectedOption = ref<string | null>(null);
const suggestedPills = ["今天庫存有變化嗎？", "回顧上次的決定", "我最近操作一致嗎？"];

async function handleSend(): Promise<void> {
  const text = userInput.value.trim();
  if (!text || isPlaying.value) return;
  userInput.value = "";
  selectedOption.value = null;
  await startNewConversation(text);
}

async function handlePillClick(pill: string): Promise<void> {
  if (isPlaying.value) return;
  selectedOption.value = null;
  await startNewConversation(pill);
}

function handleNewConversation(): void {
  selectedOption.value = null;
  beginNewConversation();
}

async function handleResumeHistory(id: string): Promise<void> {
  historyExpanded.value = false;
  selectedOption.value = null;
  await resumeConversation(id);
}

async function handleSelectOption(option: string): Promise<void> {
  if (await selectOption(option)) {
    selectedOption.value = option;
  }
}

async function startInitialConversation(): Promise<void> {
  const prompt = typeof route.query.prompt === "string" ? route.query.prompt : null;

  if (prompt) {
    await router.replace({ query: {} });
    await startNewConversation(prompt);
    return;
  }

  await startDefaultConversation();
}

onMounted(() => {
  void startInitialConversation();
  void loadPastConversations();
});
</script>

<template>
  <div class="agent-page">
    <header class="header">
      <div class="header-left">
        <h1 class="title">持倉鏡</h1>
        <p class="subtitle">對話式反思</p>
      </div>
      <button class="new-conv-btn" :disabled="isPlaying" @click="handleNewConversation">
        + 新對話
      </button>
    </header>

    <main class="message-list" aria-live="polite">
      <ChatMessage v-for="message in messages" :key="message.id" :role="message.role">
        <p v-if="message.text" class="msg-text">{{ message.text }}</p>
        <AgentInsightCard v-if="message.card?.type === 'insight'" :data="message.card" />
        <MemoryRecall v-if="message.card?.type === 'memory-recall'" :data="message.card" />
        <EvidenceCard v-if="message.card?.type === 'evidence'" :data="message.card" />
        <ScenarioComparison
          v-if="message.card?.type === 'scenario-comparison'"
          :data="message.card"
        />
        <ConfirmationQuestion
          v-if="message.card?.type === 'confirmation-question'"
          :data="message.card"
          :disabled="isPlaying"
          :selected-option="selectedOption"
          @select="handleSelectOption"
        />
      </ChatMessage>

      <div v-if="messages.length === 0" class="empty">
        <p>輸入你的想法，或選一個情境開始…</p>
      </div>

      <p v-if="error" class="error-message" role="alert">{{ error }}</p>

      <div v-if="isPlaying" class="typing-indicator" aria-label="AI 正在思考">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </main>

    <footer class="bottom-panel">
      <div class="input-area">
        <input
          v-model="userInput"
          type="text"
          class="chat-input"
          placeholder="想聊什麼？"
          :disabled="isPlaying"
          @keydown.enter="handleSend"
        />
        <button class="send-btn" :disabled="!userInput.trim() || isPlaying" @click="handleSend">
          送出
        </button>
      </div>

      <div class="pills">
        <button
          v-for="pill in suggestedPills"
          :key="pill"
          class="pill"
          :disabled="isPlaying"
          @click="handlePillClick(pill)"
        >
          {{ pill }}
        </button>
      </div>

      <div class="history-section">
        <button class="history-toggle" @click="historyExpanded = !historyExpanded">
          <span>過去的反思 ({{ pastConversations.length }})</span>
          <span class="history-chevron" :class="{ open: historyExpanded }">▴</span>
        </button>
        <Transition name="expand">
          <PastConversations
            v-if="historyExpanded"
            :conversations="pastConversations"
            @resume="handleResumeHistory"
          />
        </Transition>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.agent-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 60px);
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0;
  font-size: var(--text-large);
  font-weight: 700;
}

.subtitle {
  margin: 0;
  font-size: var(--text-small);
  color: var(--muted);
}

.new-conv-btn {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-small);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-control);
  transition: background 0.15s;
}

.new-conv-btn:hover:not(:disabled) {
  background: var(--primary-subtle);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--muted);
  font-size: var(--text-caption);
}

.msg-text {
  margin: 0;
  line-height: 1.7;
}

.error-message {
  margin: var(--space-3) 0;
  padding: var(--space-3);
  background: var(--danger-subtle);
  color: var(--danger);
  border-radius: var(--radius-card);
  font-size: var(--text-caption);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  padding-left: calc(32px + var(--space-3));
}

.typing-indicator .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  animation: bounce 1.2s infinite;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.bottom-panel {
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.input-area {
  display: flex;
  gap: var(--space-2);
}

.chat-input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--neutral-subtle);
  font-size: var(--text-caption);
  color: var(--ink);
  transition:
    border-color 0.15s,
    background 0.15s;
}

.chat-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--surface);
}

.chat-input::placeholder {
  color: var(--muted);
}

.send-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--action-primary);
  color: var(--on-ink);
  font-size: var(--text-caption);
  font-weight: 500;
  transition: background 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: var(--action-hover);
}

.pills {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.pill {
  white-space: nowrap;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  color: var(--muted);
  transition: all 0.15s;
  flex-shrink: 0;
}

.pill:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--primary-subtle);
}

.history-section {
  border-top: 1px solid var(--line);
  padding-top: var(--space-3);
}

.history-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: var(--space-2) 0;
  font-size: var(--text-caption);
  color: var(--muted);
  font-weight: 500;
}

.history-toggle:hover {
  color: var(--ink);
}

.history-chevron {
  transition: transform 0.2s;
}

.history-chevron.open {
  transform: rotate(180deg);
}

.expand-enter-active,
.expand-leave-active {
  transition:
    opacity 0.25s,
    max-height 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
