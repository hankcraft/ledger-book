import { Elysia, t } from "elysia";
import type { ConversationService } from "../../services/conversation.service.ts";
import type { ContextService } from "../../services/context.service.ts";
import { v1Error } from "../../lib/errors.ts";
import {
  invokeAgent,
  buildPortfolioContext,
  extractFollowUpOptions,
  extractConclusion,
} from "../../agent-client.ts";

export function createConversationRoutes(
  conversationService: ConversationService,
  contextService: ContextService,
  getUserId: () => string,
) {
  return new Elysia({ name: "routes:v1:conversations", prefix: "/api/v1/conversations" })
    .get("/", async () => {
      const userId = getUserId();
      return conversationService.listConversations(userId);
    })
    .post(
      "/",
      async ({ body, set }) => {
        const userId = getUserId();
        const conversationId = await conversationService.createConversation(userId, body.prompt);
        set.status = 201;
        return { conversationId };
      },
      { body: t.Object({ prompt: t.String() }) },
    )
    .get("/:id/messages", async ({ params, set }) => {
      const conv = await conversationService.getConversation(params.id);
      if (!conv) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Conversation not found");
      }
      return conversationService.getMessages(params.id);
    })
    .post(
      "/:id/messages",
      async ({ params, body, set }) => {
        const conv = await conversationService.getConversation(params.id);
        if (!conv) {
          set.status = 404;
          return v1Error("NOT_FOUND", "Conversation not found");
        }

        const userId = conv.userId;
        const ctx = await contextService.getContext(userId);

        // Persist the user message
        await conversationService.saveMessage(params.id, {
          role: "user",
          text: body.text,
        });

        const turnId = `turn-${Date.now()}`;
        let agentText: string;

        // Try real Agent first
        try {
          const portfolioContext = buildPortfolioContext(
            ctx.holdings,
            ctx.principles,
            ctx.memories,
          );
          agentText = await invokeAgent({ prompt: body.text, portfolioContext });
        } catch (err) {
          console.log(
            "[v1] Agent unavailable, using fallback:",
            err instanceof Error ? err.message : err,
          );
          // Fallback text
          agentText = conv.selectedOption
            ? `你選擇先釐清「${conv.selectedOption}」。我會把這個問題和你的持倉、過去記憶一起整理。`
            : "我收到你的問題了。讓我根據你的持倉和過去的對話脈絡來分析。";
        }

        await conversationService.markResponded(params.id);

        // Extract follow-up options and clean the text before persisting
        const { text: cleanText, options: followUpOptions } = extractFollowUpOptions(agentText);
        const displayText = cleanText || agentText;
        const finalOptions =
          followUpOptions.length > 0
            ? followUpOptions
            : ["持股集中度分析", "法人最近動態", "我的操作模式是否一致"];

        // Persist the agent text response (without follow-up markers)
        await conversationService.saveMessage(params.id, {
          role: "agent",
          text: displayText,
        });

        // Build SSE messages to stream to client
        const messages: Array<{ id: string; role: "agent"; text?: string; card?: unknown }> = [];

        // Emit context-summary card only on the first response of a conversation
        if (!conv.hasResponded) {
          const holdings = ctx.holdings;
          const topHolding = holdings.reduce(
            (max, h) => (h.weight > max.weight ? h : max),
            holdings[0]!,
          );
          messages.push({
            id: `${turnId}-context`,
            role: "agent",
            card: {
              type: "context-summary",
              portfolio: {
                totalStocks: holdings.length,
                topHolding: topHolding.name,
                topWeight: topHolding.weight,
              },
              marketSnapshot: "資料截至最近交易日",
            },
          });
        }

        messages.push({ id: `${turnId}-text`, role: "agent", text: displayText });

        // Offer to save conclusion as context if the response is substantial
        if (displayText.length > 50) {
          const conclusion = extractConclusion(displayText, body.text);
          if (conclusion) {
            messages.push({
              id: `${turnId}-artifact`,
              role: "agent",
              card: {
                type: "artifact-save",
                artifactType: "principle",
                text: conclusion,
                label: "可以記住這個觀察",
              },
            });
          }
        }

        messages.push({
          id: `${turnId}-question`,
          role: "agent",
          card: {
            type: "confirmation-question",
            question: "你想進一步了解哪個方向？",
            options: finalOptions,
          },
        });

        // Stream as SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            for (const msg of messages) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
              await new Promise((r) => setTimeout(r, 50));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
      { body: t.Object({ text: t.String() }) },
    )
    .post("/:id/resume", async ({ params }) => {
      const conv = await conversationService.getConversation(params.id);
      const userId = conv?.userId ?? getUserId();
      return conversationService.resumeConversation(userId, params.id);
    })
    .post(
      "/:id/select",
      async ({ params, body, set }) => {
        const conv = await conversationService.getConversation(params.id);
        if (!conv) {
          set.status = 404;
          return v1Error("NOT_FOUND", "Conversation not found");
        }

        await conversationService.selectOption(params.id, body.option);

        // If the request includes an artifact to save as context
        if (body.artifact) {
          const userId = conv.userId;
          const artifactType = body.artifact.type;
          const artifactText = body.artifact.text;

          // Save the conclusion on the conversation record
          await conversationService.saveConclusion(params.id, body.option, {
            type: artifactType,
            text: artifactText,
          });

          // Persist to user context
          if (artifactType === "principle") {
            await contextService.addPrinciple(userId, artifactText, "對話結論");
          } else if (artifactType === "memory") {
            await contextService.addMemory(userId, artifactText, "對話結論");
          }
        }

        set.status = 204;
      },
      {
        body: t.Object({
          option: t.String(),
          artifact: t.Optional(
            t.Object({
              type: t.Union([t.Literal("principle"), t.Literal("memory")]),
              text: t.String(),
            }),
          ),
        }),
      },
    )
    .get("/suggested-prompts", async () => {
      const userId = getUserId();
      const ctx = await contextService.getContext(userId);

      // Build a pool of candidate prompts from various context dimensions
      const candidates: string[] = [];

      // ── Holdings-based ──
      const sorted = ctx.holdings.toSorted((a, b) => b.weight - a.weight);
      const topHolding = sorted[0];
      if (topHolding && topHolding.weight > 25) {
        candidates.push(`${topHolding.name}佔比 ${topHolding.weight}%，這樣的配置合理嗎？`);
      }
      const losingHolding = ctx.holdings.find((h) => h.plPercent < -3);
      if (losingHolding) {
        candidates.push(`${losingHolding.name}目前虧損，當初買進的理由還在嗎？`);
      }
      const winningHolding = ctx.holdings.find((h) => h.plPercent > 10);
      if (winningHolding) {
        candidates.push(`${winningHolding.name}漲了不少，我該怎麼思考接下來的動作？`);
      }
      if (ctx.holdings.length >= 3) {
        candidates.push("我的持股之間有沒有題材重疊的風險？");
      }
      if (ctx.holdings.length >= 2) {
        candidates.push("幫我看看整體產業配置是否太集中");
      }

      // ── Behavior / style ──
      if (ctx.behaviors.length > 0) {
        candidates.push("我的操作模式跟自述策略一致嗎？");
        candidates.push("最近有沒有什麼行為模式需要注意？");
      }

      // ── Principles ──
      if (ctx.principles.length > 0) {
        const activePrinciple = ctx.principles.find((p) => !p.paused);
        if (activePrinciple) {
          candidates.push(`「${activePrinciple.statement}」這個原則最近有被遵守嗎？`);
        }
      }

      // ── Memories ──
      if (ctx.memories.length > 0) {
        const recentMemory = ctx.memories.find((m) => !m.archived);
        if (recentMemory) {
          candidates.push("上次聊的那件事，後來怎麼了？");
        }
      }

      // ── Market / general ──
      candidates.push("今天有什麼值得注意的市場動態？");
      candidates.push("如果大盤再跌 5%，我的損失會是多少？");
      candidates.push("法人最近在我的持股上有什麼動作？");
      candidates.push("社群對我的持股目前看法如何？");

      // Shuffle and pick 3 unique prompts
      const shuffled = candidates.toSorted(() => Math.random() - 0.5);
      return { prompts: shuffled.slice(0, 3) };
    });
}
