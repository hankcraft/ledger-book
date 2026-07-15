import type { PrismaClient } from "@prisma/client";
import type { V1ConversationSummary } from "@ledger-book/contracts";

export interface ConversationService {
  listConversations(userId: string): Promise<V1ConversationSummary[]>;
  createConversation(userId: string, prompt: string): Promise<string>;
  getConversation(conversationId: string): Promise<ConversationState | null>;
  markResponded(conversationId: string): Promise<void>;
  selectOption(conversationId: string, option: string): Promise<boolean>;
  resumeConversation(
    userId: string,
    originalId: string,
  ): Promise<{ conversationId: string; contextSummary: string }>;
}

export interface ConversationState {
  id: string;
  userId: string;
  selectedOption: string | null;
  hasResponded: boolean;
}

function toSummary(row: {
  id: string;
  createdAt: Date;
  prompt: string;
  conclusion: string | null;
  artifactType: string | null;
  artifactText: string | null;
}): V1ConversationSummary {
  const dateStr = `${row.createdAt.getMonth() + 1}/${row.createdAt.getDate()}`;
  return {
    id: row.id,
    date: dateStr,
    trigger: row.prompt,
    conclusion: row.conclusion ?? "",
    artifact:
      row.artifactType && row.artifactText
        ? { type: row.artifactType as "principle" | "memory", text: row.artifactText }
        : null,
  };
}

export function createConversationService(db: PrismaClient): ConversationService {
  return {
    async listConversations(userId) {
      const rows = await db.v1Conversation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return rows.map(toSummary);
    },

    async createConversation(userId, prompt) {
      const conv = await db.v1Conversation.create({
        data: { userId, prompt },
      });
      return conv.id;
    },

    async getConversation(conversationId) {
      const row = await db.v1Conversation.findUnique({ where: { id: conversationId } });
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        selectedOption: row.selectedOption,
        hasResponded: row.hasResponded,
      };
    },

    async markResponded(conversationId) {
      await db.v1Conversation.update({
        where: { id: conversationId },
        data: { hasResponded: true },
      });
    },

    async selectOption(conversationId, option) {
      const conv = await db.v1Conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return false;

      await db.v1Conversation.update({
        where: { id: conversationId },
        data: { selectedOption: option },
      });
      return true;
    },

    async resumeConversation(userId, originalId) {
      const conv = await db.v1Conversation.create({
        data: {
          userId,
          prompt: `延續對話 ${originalId}`,
          hasResponded: true,
        },
      });
      return { conversationId: conv.id, contextSummary: `延續上次對話 ${originalId} 的脈絡…` };
    },
  };
}
