import { Elysia, t } from "elysia";
import type { ContextService } from "../../services/context.service.ts";
import { invokeAgent, extractFollowUpOptions } from "../../agent-client.ts";

export function createOnboardingRoutes(contextService: ContextService, getUserId: () => string) {
  return new Elysia({ name: "routes:v1:onboarding", prefix: "/api/v1/onboarding" })
    .post(
      "/insight",
      async ({ body }) => {
        try {
          const prompt = `分析 ${body.stockName} 對一位目前持有中的投資者，目前的市場位置和可能的焦慮來源。請用繁體中文，簡潔回答，150字以內。不要給投資建議。`;
          const raw = await invokeAgent({ prompt });
          const { text } = extractFollowUpOptions(raw);
          return { insight: text || raw };
        } catch (err) {
          console.log(
            "[v1] Agent unavailable for insight, using fallback:",
            err instanceof Error ? err.message : err,
          );
          return { insight: generateMidInsight(body.stockName) };
        }
      },
      { body: t.Object({ stockName: t.String(), holdingStatus: t.String() }) },
    )
    .post(
      "/final-insight",
      async ({ body }) => {
        try {
          const pnlLabel =
            body.pnlStatus === "PROFIT"
              ? "獲利中"
              : body.pnlStatus === "LOSS"
                ? "虧損中"
                : "接近成本";
          const prompt = `投資者持有 ${body.stockName}，成本約 ${body.cost ?? 500} 元，佔部位 ${body.weightPercent ?? 30}%，目前${pnlLabel}。分析這位投資者的焦慮來源是「價格焦慮」還是「配置焦慮」，並給出觀察。請用繁體中文，200字以內。不要給投資建議。`;
          const raw = await invokeAgent({ prompt });
          const { text } = extractFollowUpOptions(raw);
          return { insight: text || raw };
        } catch (err) {
          console.log(
            "[v1] Agent unavailable for final-insight, using fallback:",
            err instanceof Error ? err.message : err,
          );
          return {
            insight: generateFinalInsight(
              body.stockName,
              body.pnlStatus,
              body.cost ?? 500,
              body.weightPercent ?? 30,
            ),
          };
        }
      },
      {
        body: t.Object({
          stockName: t.String(),
          holdingStatus: t.String(),
          pnlStatus: t.String(),
          cost: t.Optional(t.Number()),
          weightPercent: t.Optional(t.Number()),
        }),
      },
    )
    .post(
      "/complete",
      async ({ body, set }) => {
        const userId = getUserId();
        const context = await contextService.completeOnboarding(userId, {
          stockName: body.stockName,
          holdingStatus: body.holdingStatus,
          pnlStatus: body.pnlStatus,
          cost: body.cost,
          weightPercent: body.weightPercent,
        });
        set.status = 201;
        return { context };
      },
      {
        body: t.Object({
          stockName: t.String(),
          holdingStatus: t.String(),
          pnlStatus: t.String(),
          cost: t.Optional(t.Number()),
          weightPercent: t.Optional(t.Number()),
        }),
      },
    )
    .post(
      "/apply-template",
      async ({ body, set }) => {
        const userId = getUserId();
        try {
          const context = await contextService.applyTemplate(userId, body.templateId);
          set.status = 201;
          return { context };
        } catch (err) {
          set.status = 400;
          return {
            error: {
              code: "INVALID_TEMPLATE",
              message: err instanceof Error ? err.message : "Invalid template",
            },
          };
        }
      },
      {
        body: t.Object({
          templateId: t.String(),
        }),
      },
    );
}

function generateMidInsight(stockName: string): string {
  const insights: Record<string, string> = {
    台積電: "台積電目前位於年度相對高檔，近三個月外資持續加碼。以你的持有狀態來看，這個位置容易產生「要不要獲利了結」的焦慮——這很正常。",
    聯發科: "聯發科近期受惠 AI 手機題材，股價從底部反彈約 25%。法人看法分歧，短線波動較大。現階段的核心問題是：你買的是「題材」還是「基本面」？",
    長榮: "長榮目前處於航運景氣循環的相對高點，殖利率仍具吸引力但股價已反映大部分利多。關鍵問題是：你是存股領息，還是賺價差？",
  };
  return (
    insights[stockName] ??
    "以你的持有狀態來看，重要的不是漲跌預測，而是釐清你的焦慮來源——是怕虧損？怕錯過？還是不確定該不該動？"
  );
}

function generateFinalInsight(
  stockName: string,
  pnlStatus: string,
  cost: number,
  weight: number,
): string {
  const costStr = String(cost);
  const weightStr = String(weight);
  if (pnlStatus === "PROFIT")
    return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%。目前帳面獲利中，但佔比${weight > 30 ? "偏高" : "適中"}。你的焦慮更像是「配置焦慮」。`;
  if (pnlStatus === "LOSS")
    return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%，目前處於虧損。這是典型的「價格焦慮」。問題是：你能等多久？`;
  return `你在${stockName}的成本約 ${costStr} 元，佔部位 ${weightStr}%，目前接近成本價。建議設定明確的停利停損點。`;
}
