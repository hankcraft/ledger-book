import type { PrismaClient } from "@prisma/client";
import type { V1ConversationSummary } from "@ledger-book/contracts";

export interface ConversationService {
  listConversations(userId: string): Promise<V1ConversationSummary[]>;
  createConversation(userId: string, prompt: string): Promise<string>;
  getConversation(conversationId: string): Promise<ConversationState | null>;
  getMessages(conversationId: string): Promise<StoredMessage[]>;
  saveMessage(conversationId: string, message: SaveMessageInput): Promise<void>;
  markResponded(conversationId: string): Promise<void>;
  selectOption(conversationId: string, option: string): Promise<boolean>;
  resumeConversation(
    userId: string,
    originalId: string,
  ): Promise<{ conversationId: string; messages: StoredMessage[] }>;
}

export interface ConversationState {
  id: string;
  userId: string;
  selectedOption: string | null;
  hasResponded: boolean;
}

export interface StoredMessage {
  id: string;
  role: "user" | "agent";
  text?: string | null;
  cardData?: unknown;
}

export interface SaveMessageInput {
  role: "user" | "agent";
  text?: string | null;
  cardData?: unknown;
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
        include: {
          messages: {
            where: { role: "agent" },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { text: true },
          },
        },
      });
      return rows.map((row) => {
        const firstAgentText = row.messages[0]?.text;
        // Use first agent message as conclusion, truncated
        const conclusion = firstAgentText
          ? firstAgentText.slice(0, 80) + (firstAgentText.length > 80 ? "…" : "")
          : "";
        return {
          ...toSummary(row),
          conclusion,
        };
      });
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

    async getMessages(conversationId) {
      const rows = await db.v1ConversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "agent",
        text: r.text,
        cardData: r.cardData,
      }));
    },

    async saveMessage(conversationId, message) {
      await db.v1ConversationMessage.create({
        data: {
          conversationId,
          role: message.role,
          text: message.text ?? null,
          cardData: message.cardData ?? undefined,
        },
      });
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
      // Verify conversation belongs to user
      const conv = await db.v1Conversation.findUnique({ where: { id: originalId } });
      if (!conv || conv.userId !== userId) {
        return { conversationId: originalId, messages: [] };
      }

      // Return the original conversation ID and its stored messages
      const rows = await db.v1ConversationMessage.findMany({
        where: { conversationId: originalId },
        orderBy: { createdAt: "asc" },
      });

      const messages: StoredMessage[] = rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "agent",
        text: r.text,
        cardData: r.cardData,
      }));

      return { conversationId: originalId, messages };
    },
  };
}
