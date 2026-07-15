<script setup lang="ts">
import { ref } from "vue";
import { useAppStore } from "../composables/useAppStore";
import SectionHeader from "../components/SectionHeader.vue";
import HoldingCard from "../components/HoldingCard.vue";
import InferenceCard from "../components/InferenceCard.vue";
import CorrectionSheet from "../components/CorrectionSheet.vue";

const {
  state,
  activeMemories,
  pendingInferences,
  confirmInference,
  denyInference,
  archiveMemory,
  pausePrinciple,
  deletePrinciple,
  toggleBehaviorExclusion,
  submitCorrection,
} = useAppStore();

const expanded = ref({
  facts: true,
  principles: true,
  memories: true,
  inferences: true,
  behaviors: true,
});
const correctionOpen = ref(false);
const correctionSubmitting = ref(false);
const correctionResponse = ref<string | null>(null);

async function handleCorrection(text: string): Promise<void> {
  correctionSubmitting.value = true;
  correctionResponse.value = await submitCorrection(text);
  correctionSubmitting.value = false;
}

function closeCorrection(): void {
  correctionOpen.value = false;
  correctionResponse.value = null;
}
</script>

<template>
  <main class="portrait">
    <header class="portrait-header">
      <h1>🪞 AI 怎麼看我</h1>
      <button
        class="correction-btn"
        @click="
          correctionResponse = null;
          correctionOpen = true;
        "
      >
        對話修正
      </button>
    </header>

    <!-- Facts -->
    <section class="section">
      <SectionHeader
        icon="📈"
        title="庫存"
        :count="state.holdings.length"
        :expanded="expanded.facts"
        accent-color="#0b8be3"
        @toggle="expanded.facts = !expanded.facts"
      />
      <div v-show="expanded.facts" class="layer">
        <HoldingCard v-for="h in state.holdings" :key="h.id" :holding="h" />
      </div>
    </section>

    <!-- Principles -->
    <section class="section">
      <SectionHeader
        icon="📌"
        title="原則層"
        :count="state.principles.length"
        :expanded="expanded.principles"
        accent-color="#17825b"
        @toggle="expanded.principles = !expanded.principles"
      />
      <div v-show="expanded.principles" class="layer">
        <div
          v-for="p in state.principles"
          :key="p.id"
          class="principle-card"
          :class="{ paused: p.paused }"
        >
          <div class="p-header">
            📌 <span class="p-stmt">{{ p.statement }}</span
            ><span v-if="p.badge" class="p-badge">{{ p.badge }}</span
            ><span v-if="p.paused" class="p-paused">已暫停</span>
          </div>
          <div class="p-meta">確認於 {{ p.confirmedAt }} · 來自「{{ p.source }}」</div>
          <div class="p-actions">
            <button @click="pausePrinciple(p.id)">{{ p.paused ? "恢復" : "暫停" }}</button>
            <button class="del" @click="deletePrinciple(p.id)">刪除</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Memories -->
    <section class="section">
      <SectionHeader
        icon="💬"
        title="記憶層"
        :count="activeMemories.length"
        :expanded="expanded.memories"
        accent-color="#7c3aed"
        @toggle="expanded.memories = !expanded.memories"
      />
      <div v-show="expanded.memories" class="layer">
        <div v-for="m in activeMemories" :key="m.id" class="memory-card">
          <div class="m-content">
            💬
            <blockquote>「{{ m.quote }}」</blockquote>
          </div>
          <div class="m-meta">{{ m.date }} · {{ m.source }}</div>
          <button class="m-archive" @click="archiveMemory(m.id)">這不再代表我</button>
        </div>
      </div>
    </section>

    <!-- Inferences -->
    <section class="section">
      <SectionHeader
        icon="🔍"
        title="推論層"
        :count="pendingInferences.length"
        :expanded="expanded.inferences"
        accent-color="#d97706"
        @toggle="expanded.inferences = !expanded.inferences"
      />
      <div v-show="expanded.inferences" class="layer">
        <InferenceCard
          v-for="i in pendingInferences"
          :key="i.id"
          :inference="i"
          @confirm="confirmInference"
          @deny="denyInference"
        />
        <p v-if="pendingInferences.length === 0" class="empty">目前沒有待確認的推論</p>
      </div>
    </section>

    <!-- Behaviors -->
    <section class="section">
      <SectionHeader
        icon="📊"
        title="行為層"
        :count="state.behaviors.length"
        :expanded="expanded.behaviors"
        accent-color="#6366f1"
        @toggle="expanded.behaviors = !expanded.behaviors"
      />
      <div v-show="expanded.behaviors" class="layer">
        <div
          v-for="b in state.behaviors"
          :key="b.id"
          class="behavior-card"
          :class="{ excluded: b.excluded }"
        >
          <div class="b-content">
            📊
            <div class="b-info">
              <span class="b-label">{{ b.label }}</span
              ><span class="b-value">{{ b.value }}</span
              ><span v-if="b.detail" class="b-detail">{{ b.detail }}</span>
            </div>
          </div>
          <label class="b-toggle"
            ><input
              type="checkbox"
              :checked="b.excluded"
              @change="toggleBehaviorExclusion(b.id)"
            /><span>不用於推論</span></label
          >
        </div>
      </div>
    </section>

    <CorrectionSheet
      :open="correctionOpen"
      :submitting="correctionSubmitting"
      :response="correctionResponse"
      @submit="handleCorrection"
      @close="closeCorrection"
    />
  </main>
</template>

<style scoped>
.portrait {
  padding: var(--space-4);
  padding-bottom: calc(var(--space-8) + 60px);
}
.portrait-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}
.portrait-header h1 {
  margin: 0;
  font-size: var(--text-heading);
}
.correction-btn {
  background: var(--primary-subtle);
  color: var(--accent);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-control);
  font-size: var(--text-caption);
  font-weight: 500;
}
.correction-btn:hover {
  background: #d1eafa;
}
.section {
  margin-bottom: var(--space-6);
}
.layer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.principle-card {
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: opacity 0.3s;
}
.principle-card.paused {
  opacity: 0.5;
}
.p-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.p-stmt {
  flex: 1;
  font-weight: 500;
}
.p-badge {
  font-size: var(--text-small);
  background: var(--success-subtle);
  color: var(--positive);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}
.p-paused {
  font-size: var(--text-small);
  background: var(--warning-subtle);
  color: #b45309;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}
.p-meta {
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-3);
}
.p-actions {
  display: flex;
  gap: var(--space-3);
}
.p-actions button {
  font-size: var(--text-small);
  color: var(--muted);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}
.p-actions button:hover {
  background: var(--neutral-subtle);
  color: var(--ink);
}
.p-actions .del:hover {
  color: var(--danger);
}

.memory-card {
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.m-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.m-content blockquote {
  margin: 0;
  font-style: italic;
  line-height: 1.5;
}
.m-meta {
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-3);
  padding-left: 1.75rem;
}
.m-archive {
  font-size: var(--text-small);
  color: var(--muted);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
  margin-left: 1.75rem;
}
.m-archive:hover {
  color: var(--danger);
  background: var(--neutral-subtle);
}

.behavior-card {
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: opacity 0.3s;
}
.behavior-card.excluded {
  opacity: 0.5;
}
.b-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.b-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.b-label {
  font-size: var(--text-caption);
  color: var(--muted);
}
.b-value {
  font-size: 1.25rem;
  font-weight: 700;
}
.b-detail {
  font-size: var(--text-small);
  color: var(--muted);
}
.b-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding-left: 2rem;
  font-size: var(--text-small);
  color: var(--muted);
}
.b-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent);
}

.empty {
  text-align: center;
  color: var(--muted);
  font-size: var(--text-caption);
  padding: var(--space-4);
}
</style>
