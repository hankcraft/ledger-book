<script setup lang="ts">
import { ref, computed } from "vue";

const emit = defineEmits<{ submit: [name: string] }>();
const suggestions = ["台積電", "聯發科", "長榮"];
const inputValue = ref("");
const isFocused = ref(false);

const filteredSuggestions = computed(() =>
  !inputValue.value ? suggestions : suggestions.filter((s) => s.includes(inputValue.value)),
);
const showSuggestions = computed(() => isFocused.value && filteredSuggestions.value.length > 0);

function selectSuggestion(name: string) {
  inputValue.value = name;
  submit();
}
function submit() {
  const v = inputValue.value.trim();
  if (v) emit("submit", v);
}
function handleBlur() {
  setTimeout(() => {
    isFocused.value = false;
  }, 150);
}
</script>

<template>
  <div class="stock-input-wrapper">
    <div class="input-container">
      <input
        v-model="inputValue"
        type="text"
        class="stock-input"
        placeholder="輸入股票名稱..."
        autocomplete="off"
        @focus="isFocused = true"
        @blur="handleBlur"
        @keydown.enter="submit"
      />
      <button class="submit-btn" :disabled="!inputValue.trim()" @click="submit">確認</button>
    </div>
    <Transition name="dropdown">
      <ul v-if="showSuggestions" class="suggestions" role="listbox">
        <li
          v-for="s in filteredSuggestions"
          :key="s"
          class="suggestion-item"
          role="option"
          @click="selectSuggestion(s)"
        >
          {{ s }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.stock-input-wrapper {
  position: relative;
  width: 100%;
}
.input-container {
  display: flex;
  gap: var(--space-2);
}
.stock-input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  font-size: var(--text-body);
  color: var(--ink);
  transition: border-color 0.2s;
}
.stock-input:focus {
  border-color: var(--accent);
  outline: none;
}
.stock-input::placeholder {
  color: var(--muted);
}
.submit-btn {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--action-primary);
  color: var(--on-ink);
  font-weight: 500;
  transition: background 0.2s;
}
.submit-btn:hover:not(:disabled) {
  background: var(--action-hover);
}
.suggestions {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  margin: 0;
  padding: var(--space-1) 0;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  z-index: 10;
}
.suggestion-item {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background 0.15s;
}
.suggestion-item:hover {
  background: var(--primary-subtle);
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
