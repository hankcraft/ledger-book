import { Elysia, t } from "elysia";
import type { ConversationService } from "../../services/conversation.service.ts";
import type { ContextService } from "../../services/context.service.ts";
import { v1Error } from "../../lib/errors.ts";
import { streamAgentAsV1Messages, buildPortfolioContext } from "../../agent-client.ts";

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

        // Try real Agent first
        try {
          const portfolioContext = buildPortfolioContext(
            ctx.holdings,
            ctx.principles,
            ctx.memories,
          );
          const turnId = `turn-${Date.now()}`;
          await conversationService.markResponded(params.id);
          return await streamAgentAsV1Messages({ prompt: body.text, portfolioContext }, turnId, {
            holdings: ctx.holdings,
            memories: ctx.memories,
          });
        } catch (err) {
          console.log(
            "[v1] Agent unavailable for conversation, using fallback:",
            err instanceof Error ? err.message : err,
          );
        }

        // Fallback: simple text response
        await conversationService.markResponded(params.id);
        const turnId = `turn-${Date.now()}`;
        const fallbackText = conv.selectedOption
          ? `你選擇先釐清「${conv.selectedOption}」。我會把這個問題和你的持倉、過去記憶一起整理。`
          : "我收到你的問題了。讓我根據你的持倉和過去的對話脈絡來分析。";

        const messages = [{ id: turnId, role: "agent" as const, text: fallbackText }];

        set.headers["content-type"] = "text/event-stream";
        set.headers["cache-control"] = "no-cache";
        set.headers["connection"] = "keep-alive";

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            for (const msg of messages) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
              await new Promise((r) => setTimeout(r, 80));
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
        const result = await conversationService.selectOption(params.id, body.option);
        if (!result) {
          set.status = 404;
          return v1Error("NOT_FOUND", "Conversation not found");
        }
        set.status = 204;
      },
      { body: t.Object({ option: t.String() }) },
    );
}
