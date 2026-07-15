import { nextTick, ref } from "vue";

import { useApi } from "../services";
import type { ConversationSummary } from "../services/types";
import type { DisplayMessage } from "../types";

const defaultReflectionPrompt = "最近有什麼讓我煩心的嗎？";

function scrollToBottom(): void {
  if (typeof document === "undefined") return;

  void nextTick(() => {
    const element = document.querySelector<HTMLElement>(".message-area");
    if (element) element.scrollTop = element.scrollHeight;
  });
}

export function useConversation() {
  const api = useApi();
  const messages = ref<DisplayMessage[]>([]);
  const isPlaying = ref(false);
  const isComplete = ref(false);
  const error = ref<string | null>(null);
  const pastConversations = ref<ConversationSummary[]>([]);
  const currentConversationId = ref<string | null>(null);
  let streamGeneration = 0;
  let messageSequence = 0;

  function nextMessageId(prefix: string): string {
    messageSequence++;
    return `${prefix}-${messageSequence}`;
  }

  function resetConversation(): number {
    streamGeneration++;
    messages.value = [];
    currentConversationId.value = null;
    isPlaying.value = false;
    isComplete.value = false;
    error.value = null;
    return streamGeneration;
  }

  function appendMessage(message: Omit<DisplayMessage, "id">, prefix: string): void {
    messages.value.push({ id: nextMessageId(prefix), ...message });
    scrollToBottom();
  }

  async function streamAgentReply(
    conversationId: string,
    text: string,
    generation: number,
  ): Promise<boolean> {
    isPlaying.value = true;

    try {
      for await (const message of api.agent.sendMessage(conversationId, text)) {
        if (generation !== streamGeneration) return false;
        appendMessage(
          {
            role: message.role,
            text: message.text,
            card: message.card,
          },
          "agent",
        );
      }
      return generation === streamGeneration;
    } catch {
      if (generation === streamGeneration) {
        error.value = "搭檔暫時忙不過來，等一下再試？";
      }
      return false;
    } finally {
      if (generation === streamGeneration) {
        isPlaying.value = false;
        isComplete.value = true;
      }
    }
  }

  /**
   * Start a brand new conversation with a prompt.
   * Used only for the very first message (no existing conversation).
   */
  async function startNewConversation(prompt: string): Promise<void> {
    const generation = resetConversation();
    isPlaying.value = true;

    try {
      const { conversationId } = await api.agent.startConversation(prompt);
      if (generation !== streamGeneration) return;

      currentConversationId.value = conversationId;
      appendMessage({ role: "user", text: prompt }, "user");
      await streamAgentReply(conversationId, prompt, generation);
    } catch {
      if (generation === streamGeneration) {
        isPlaying.value = false;
        isComplete.value = true;
        error.value = "沒辦法開始新對話，等一下再試？";
      }
    }
  }

  /**
   * Send a follow-up message in the current conversation.
   * If no conversation exists yet, starts a new one.
   */
  async function sendMessage(text: string): Promise<void> {
    if (!text.trim() || isPlaying.value) return;

    // If no current conversation, start fresh
    if (!currentConversationId.value) {
      await startNewConversation(text);
      return;
    }

    // Continue in current conversation
    const generation = streamGeneration;
    error.value = null;
    appendMessage({ role: "user", text }, "user");
    await streamAgentReply(currentConversationId.value, text, generation);
  }

  async function startDefaultConversation(): Promise<void> {
    await startNewConversation(defaultReflectionPrompt);
  }

  function beginNewConversation(): void {
    resetConversation();
    isComplete.value = true;
  }

  /**
   * Resume a past conversation — loads and displays all previous messages,
   * then sets the conversation as active for follow-up messages.
   */
  async function resumeConversation(id: string): Promise<void> {
    const generation = resetConversation();
    isPlaying.value = true;

    try {
      const result = await api.agent.resumeConversation(id);
      if (generation !== streamGeneration) return;

      currentConversationId.value = result.conversationId;

      // Display past messages
      if (result.messages && result.messages.length > 0) {
        for (const msg of result.messages) {
          appendMessage({ role: msg.role, text: msg.text, card: msg.card }, "history");
        }
      } else if (result.contextSummary) {
        // Fallback: show context summary if no stored messages
        appendMessage({ role: "agent", text: result.contextSummary }, "resume");
      }

      isPlaying.value = false;
      isComplete.value = true;
    } catch {
      if (generation === streamGeneration) {
        isPlaying.value = false;
        isComplete.value = true;
        error.value = "沒辦法載入這段對話，等一下再試？";
      }
    }
  }

  async function loadPastConversations(): Promise<void> {
    try {
      pastConversations.value = await api.agent.getPastConversations();
    } catch {
      error.value = "沒辦法載入對話紀錄。";
    }
  }

  async function selectOption(option: string): Promise<boolean> {
    const conversationId = currentConversationId.value;
    if (!conversationId || isPlaying.value) return false;

    const generation = streamGeneration;
    error.value = null;
    isPlaying.value = true;

    try {
      await api.agent.selectOption(conversationId, option);
      if (generation !== streamGeneration) return false;

      appendMessage({ role: "user", text: option }, "user-option");
      await streamAgentReply(conversationId, option, generation);
      return generation === streamGeneration;
    } catch {
      if (generation === streamGeneration) {
        isPlaying.value = false;
        isComplete.value = true;
        error.value = "沒成功，等一下再試？";
      }
      return false;
    }
  }

  return {
    messages,
    isPlaying,
    isComplete,
    error,
    pastConversations,
    currentConversationId,
    beginNewConversation,
    startDefaultConversation,
    startNewConversation,
    sendMessage,
    resumeConversation,
    loadPastConversations,
    selectOption,
  };
}
