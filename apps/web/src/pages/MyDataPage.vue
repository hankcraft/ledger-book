<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Briefcase, BookmarkCheck, BookOpen } from "lucide-vue-next";
import { useAppStore } from "../composables/useAppStore";
import HoldingCard from "../components/HoldingCard.vue";
import PageHeader from "../components/PageHeader.vue";

const router = useRouter();
const { state, activeMemories, pausePrinciple, deletePrinciple, archiveMemory, logout, showToast } =
  useAppStore();

const expanded = ref({
  holdings: true,
  principles: true,
  memories: true,
});

function openQuickEntry(): void {
  window.dispatchEvent(new CustomEvent("open-quick-entry"));
}

function handleLogout(): void {
  logout();
  router.push("/onboarding");
}
</script>

<template>
  <main class="my-data">
    <PageHeader title="我的資料" />

    <!-- Holdings -->
    <section class="section">
      <button class="section-toggle" @click="expanded.holdings = !expanded.holdings">
        <div class="section-title-row">
          <Briefcase :size="18" class="section-icon" />
          <span class="section-title">我的庫存</span>
          <span class="section-count">{{ state.holdings.length }}</span>
        </div>
        <span class="chevron" :class="{ open: expanded.holdings }">▾</span>
      </button>
      <div v-show="expanded.holdings" class="layer">
        <HoldingCard v-for="h in state.holdings" :key="h.id" :holding="h" />
        <button class="add-entry-btn" @click="openQuickEntry">+ 新增交易</button>
      </div>
    </section>

    <!-- Principles -->
    <section class="section">
      <button class="section-toggle" @click="expanded.principles = !expanded.principles">
        <div class="section-title-row">
          <BookmarkCheck :size="18" class="section-icon" />
          <span class="section-title">我確認的原則</span>
          <span class="section-count">{{ state.principles.length }}</span>
        </div>
        <span class="chevron" :class="{ open: expanded.principles }">▾</span>
      </button>
      <div v-show="expanded.principles" class="layer">
        <div
          v-for="p in state.principles"
          :key="p.id"
          class="principle-card"
          :class="{ paused: p.paused }"
        >
          <div class="p-header">
            <span class="p-stmt">{{ p.statement }}</span>
            <span v-if="p.badge" class="p-badge">{{ p.badge }}</span>
            <span v-if="p.paused" class="p-paused">已暫停</span>
          </div>
          <div class="p-meta">確認於 {{ p.confirmedAt }} · 來自「{{ p.source }}」</div>
          <div class="p-actions">
            <button @click="pausePrinciple(p.id)">{{ p.paused ? "恢復" : "暫停" }}</button>
            <button class="del" @click="deletePrinciple(p.id)">刪除</button>
          </div>
        </div>
        <p v-if="state.principles.length === 0" class="empty">
          還沒有確認過原則。和搭檔對話時，可以建立屬於你的投資原則。
        </p>
      </div>
    </section>

    <!-- Memories -->
    <section class="section">
      <button class="section-toggle" @click="expanded.memories = !expanded.memories">
        <div class="section-title-row">
          <BookOpen :size="18" class="section-icon" />
          <span class="section-title">重要紀錄</span>
          <span class="section-count">{{ activeMemories.length }}</span>
        </div>
        <span class="chevron" :class="{ open: expanded.memories }">▾</span>
      </button>
      <div v-show="expanded.memories" class="layer">
        <div v-for="m in activeMemories" :key="m.id" class="memory-card">
          <blockquote class="m-quote">「{{ m.quote }}」</blockquote>
          <div class="m-meta">{{ m.date }} · {{ m.source }}</div>
          <button class="m-archive" @click="archiveMemory(m.id)">這不再代表我</button>
        </div>
        <p v-if="activeMemories.length === 0" class="empty">
          還沒有重要紀錄。對話中的重要想法會被保存在這裡。
        </p>
      </div>
    </section>

    <!-- Logout -->
    <section class="logout-section">
      <button class="logout-btn" @click="handleLogout">登出，重新設定</button>
    </section>
  </main>
</template>

<style scoped>
.my-data {
  padding: var(--space-6) var(--space-4);
  padding-bottom: calc(var(--space-8) + 60px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: var(--space-3) 0;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.section-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.section-title {
  font-weight: 600;
  font-size: var(--text-body);
}

.section-count {
  font-size: var(--text-small);
  color: var(--muted);
  background: var(--neutral-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
}

.chevron {
  color: var(--muted);
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(180deg);
}

.layer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.add-entry-btn {
  width: 100%;
  padding: var(--space-3);
  border: 1px dashed var(--line);
  border-radius: var(--radius-card);
  color: var(--accent);
  font-weight: 500;
  font-size: var(--text-caption);
  transition:
    background 0.15s,
    border-color 0.15s;
}

.add-entry-btn:hover {
  background: var(--primary-subtle);
  border-color: var(--accent);
}

/* Principle cards */
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
  color: var(--warning);
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

/* Memory cards */
.memory-card {
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.m-quote {
  margin: 0 0 var(--space-2);
  font-style: italic;
  line-height: 1.5;
}

.m-meta {
  font-size: var(--text-small);
  color: var(--muted);
  margin-bottom: var(--space-3);
}

.m-archive {
  font-size: var(--text-small);
  color: var(--muted);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
}

.m-archive:hover {
  color: var(--danger);
  background: var(--neutral-subtle);
}

.empty {
  text-align: center;
  color: var(--muted);
  font-size: var(--text-caption);
  padding: var(--space-4);
  line-height: 1.5;
}

/* Logout */
.logout-section {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--line);
}

.logout-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  color: var(--negative);
  font-size: var(--text-body);
  font-weight: 500;
  transition:
    background var(--duration-fast),
    border-color var(--duration-fast);
}

.logout-btn:hover {
  background: var(--negative-subtle);
  border-color: var(--negative);
}
</style>
