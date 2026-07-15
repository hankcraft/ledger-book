<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AgentInsightCard from "../components/AgentInsightCard.vue";
import ChatMessage from "../components/ChatMessage.vue";
import ConfirmationQuestion from "../components/ConfirmationQuestion.vue";
import EvidenceCard from "../components/EvidenceCard.vue";
import MarkdownText from "../components/MarkdownText.vue";
import MemoryRecall from "../components/MemoryRecall.vue";
import PageHeader from "../components/PageHeader.vue";
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
  startNewConversation,
  sendMessage,
  resumeConversation,
  loadPastConversations,
  selectOption,
} = useConversation();

const userInput = ref("");
const historyExpanded = ref(false);
const selectedOption = ref<string | null>(null);
const suggestedPills = ["今天有什麼值得注意的？", "上次我們聊到哪？", "最近的操作有什麼趨勢？"];

const isEmpty = computed(() => messages.value.length === 0 && !isPlaying.value);

async function handleSend(): Promise<void> {
  const text = userInput.value.trim();
  if (!text || isPlaying.value) return;
  userInput.value = "";
  selectedOption.value = null;
  await sendMessage(text);
}

async function handlePillClick(pill: string): Promise<void> {
  if (isPlaying.value) return;
  selectedOption.value = null;
  await sendMessage(pill);
}

function handleNewConversation(): void {
  selectedOption.value = null;
  historyExpanded.value = false;
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

onMounted(async () => {
  void loadPastConversations();

  // Only auto-start if navigated with a prompt query (e.g. from HomePage action)
  const prompt = typeof route.query.prompt === "string" ? route.query.prompt : null;
  if (prompt) {
    await router.replace({ query: {} });
    await startNewConversation(prompt);
  }
});
</script>

<template>
  <div class="agent-page">
    <div class="agent-header">
      <PageHeader title="聊聊">
        <template #action>
          <div class="header-actions">
            <button
              v-if="pastConversations.length > 0"
              class="header-icon-btn"
              :class="{ active: historyExpanded }"
              aria-label="對話紀錄"
              @click="historyExpanded = !historyExpanded"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            <button
              class="header-action-btn"
              :disabled="isPlaying || isEmpty"
              @click="handleNewConversation"
            >
              + 新對話
            </button>
          </div>
        </template>
      </PageHeader>

      <Transition name="expand">
        <PastConversations
          v-if="historyExpanded"
          class="history-dropdown"
          :conversations="pastConversations"
          @resume="handleResumeHistory"
        />
      </Transition>
    </div>

    <main class="message-area" aria-live="polite">
      <!-- Empty state: centered pills -->
      <div v-if="isEmpty" class="empty-state">
        <p class="empty-greeting">想聊什麼都可以</p>
        <div class="empty-pills">
          <button
            v-for="pill in suggestedPills"
            :key="pill"
            class="pill"
            @click="handlePillClick(pill)"
          >
            {{ pill }}
          </button>
        </div>
      </div>

      <!-- Conversation messages -->
      <template v-else>
        <ChatMessage v-for="message in messages" :key="message.id" :role="message.role">
          <p v-if="message.text && message.role === 'user'" class="msg-text">{{ message.text }}</p>
          <MarkdownText
            v-else-if="message.text"
            :content="message.text"
            :animate="!message.id.startsWith('history-')"
          />
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

        <p v-if="error" class="error-message" role="alert">{{ error }}</p>

        <div v-if="isPlaying" class="typing-indicator" aria-label="搭檔正在整理…">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </template>
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
    </footer>
  </div>
</template>

<style scoped>
.agent-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

/* ─── Header ─── */
.agent-header {
  padding: var(--space-6) var(--space-4) var(--space-3);
  background: var(--surface);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  color: var(--muted);
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.header-icon-btn:hover,
.header-icon-btn.active {
  background: var(--neutral-subtle);
  color: var(--action-primary);
}

.header-action-btn {
  font-size: var(--text-caption);
  color: var(--muted);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  transition:
    border-color var(--duration-fast),
    color var(--duration-fast);
}

.header-action-btn:hover:not(:disabled) {
  border-color: var(--action-primary);
  color: var(--action-primary);
}

.history-dropdown {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

/* ─── Empty State ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-6);
  padding: var(--space-8);
}

.empty-greeting {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  color: var(--muted);
}

.empty-pills {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  max-width: 320px;
}

/* ─── Message Area ─── */
.message-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.msg-text {
  margin: 0;
  line-height: var(--leading-relaxed);
}

.error-message {
  margin: var(--space-3) 0;
  padding: var(--space-3);
  background: var(--negative-subtle);
  color: var(--negative);
  border-radius: var(--radius-md);
  font-size: var(--text-caption);
}

.typing-indicator {
  display: flex;
  gap: var(--space-1);
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

/* ─── Footer ─── */
.bottom-panel {
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: var(--space-3) var(--space-4);
  padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
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
    border-color var(--duration-fast),
    background var(--duration-fast);
}

.chat-input:focus {
  outline: none;
  border-color: var(--focus);
  background: var(--surface);
}

.chat-input::placeholder {
  color: var(--subtle);
}

.send-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--gradient-primary);
  color: var(--on-ink);
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-button);
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

/* ─── Pills (shared between empty state and inline) ─── */
.pill {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  font-size: var(--text-caption);
  color: var(--muted);
  text-align: left;
  transition:
    border-color var(--duration-fast),
    color var(--duration-fast),
    background var(--duration-fast);
}

.pill:hover:not(:disabled) {
  border-color: var(--action-primary);
  color: var(--action-primary);
  background: var(--brand-light);
}

/* ─── Transitions ─── */
.expand-enter-active,
.expand-leave-active {
  transition:
    opacity var(--duration-normal),
    max-height var(--duration-normal) var(--ease-out);
  max-height: 400px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
