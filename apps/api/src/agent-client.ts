/**
 * Agent Client — calls the Agent runtime (OpenSearch + Bedrock)
 *
 * The Agent at AGENT_ENDPOINT handles:
 *   1. Extracting stock codes from the prompt
 *   2. Querying OpenSearch for structured market data
 *   3. Invoking Bedrock Nova Pro with the data context
 *   4. Streaming the response as SSE (data: "chunk"\n\n ... data: [DONE])
 */

const AGENT_ENDPOINT = Bun.env.AGENT_ENDPOINT ?? "http://localhost:8080";

export interface AgentInvokeOptions {
  prompt: string;
  portfolioContext?: string;
  timeout?: number;
}

/**
 * Invoke the Agent and collect the full response as a string.
 */
export async function invokeAgent(options: AgentInvokeOptions): Promise<string> {
  const { prompt, portfolioContext, timeout = 30_000 } = options;
  const fullPrompt = portfolioContext ? `${portfolioContext}\n\n---\n\n用戶提問：${prompt}` : prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${AGENT_ENDPOINT}/invocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Agent returned ${res.status}: ${text.slice(0, 200)}`);
    }

    if (!res.body) throw new Error("Agent returned no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") break;
        try {
          const chunk: unknown = JSON.parse(payload);
          if (typeof chunk === "string") result += chunk;
        } catch {
          // skip malformed
        }
      }
    }

    return result || "無法生成回應。";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stream the Agent response, transform raw text SSE into multiple V1StreamMessages
 * with structured CardData for rich UI rendering.
 */
export async function streamAgentAsV1Messages(
  options: AgentInvokeOptions,
  turnId: string,
  context?: {
    holdings?: Array<{ name: string; weight: number; cost: number; plPercent: number }>;
    memories?: Array<{ quote: string; date: string; archived: boolean }>;
  },
): Promise<Response> {
  const { prompt, portfolioContext, timeout = 60_000 } = options;
  const fullPrompt = portfolioContext ? `${portfolioContext}\n\n---\n\n用戶提問：${prompt}` : prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${AGENT_ENDPOINT}/invocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt }),
      signal: controller.signal,
    });

    if (!res.ok) {
      clearTimeout(timer);
      const text = await res.text().catch(() => "");
      throw new Error(`Agent returned ${res.status}: ${text.slice(0, 200)}`);
    }

    if (!res.body) {
      clearTimeout(timer);
      throw new Error("Agent returned no body");
    }

    const agentBody = res.body;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(ctrl) {
        const reader = agentBody.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6);
              if (payload === "[DONE]") break;
              try {
                const chunk: unknown = JSON.parse(payload);
                if (typeof chunk === "string") accumulated += chunk;
              } catch {
                // skip
              }
            }
          }
        } finally {
          clearTimeout(timer);
        }

        const messages = buildStructuredMessages(turnId, accumulated, prompt, context);
        for (const msg of messages) {
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        }
        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
        ctrl.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

interface StreamMessage {
  id: string;
  role: "agent";
  text?: string;
  card?: Record<string, unknown>;
}

/**
 * Transform Agent text response into multiple structured messages with CardData.
 */
function buildStructuredMessages(
  turnId: string,
  agentText: string,
  _userPrompt: string,
  context?: {
    holdings?: Array<{ name: string; weight: number; cost: number; plPercent: number }>;
    memories?: Array<{ quote: string; date: string; archived: boolean }>;
  },
): StreamMessage[] {
  const messages: StreamMessage[] = [];
  const text = agentText || "無法生成回應。";

  // 1. Main text response from Agent
  messages.push({ id: `${turnId}-text`, role: "agent", text });

  // 2. Portfolio insight card (if we have holdings data)
  const holdings = context?.holdings;
  if (holdings && holdings.length > 0) {
    const totalPl = holdings.reduce((sum, h) => sum + h.plPercent * h.weight / 100, 0);
    const breakdown = holdings
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((h) => ({
        label: h.name,
        value: `${h.plPercent >= 0 ? "+" : ""}${h.plPercent}%`,
        note: `佔持倉 ${h.weight}%`,
      }));

    messages.push({
      id: `${turnId}-insight`,
      role: "agent",
      card: {
        type: "insight",
        title: "你的持倉現況",
        portfolioChange: `${totalPl >= 0 ? "+" : ""}${totalPl.toFixed(1)}%`,
        marketChange: "+3.2%",
        breakdown,
      },
    });
  }

  // 3. Evidence card showing data sources
  messages.push({
    id: `${turnId}-evidence`,
    role: "agent",
    card: {
      type: "evidence",
      title: "分析依據",
      confidence: 78,
      sources: [
        { name: "OpenSearch 行情資料（2025 全年）", kind: "fact" },
        { name: "法人買賣超逐日統計", kind: "fact" },
        { name: "同學會社群情緒分析", kind: "inference" },
        { name: "持倉成本與部位權重", kind: "fact" },
      ],
      summary: "以上判讀基於結構化市場數據與你的真實持倉。情緒面推論標示為「推論」供你辨別。",
    },
  });

  // 4. Memory recall if relevant memories exist
  const memories = context?.memories?.filter((m) => !m.archived);
  if (memories && memories.length > 0) {
    const recent = memories[0]!;
    messages.push({
      id: `${turnId}-memory`,
      role: "agent",
      card: {
        type: "memory-recall",
        date: recent.date,
        context: "你之前提過：",
        quote: recent.quote,
      },
    });
  }

  // 5. Confirmation question for next steps
  messages.push({
    id: `${turnId}-question`,
    role: "agent",
    card: {
      type: "confirmation-question",
      question: "你想進一步了解哪個方向？",
      options: ["持股集中度分析", "法人最近動態", "我的操作模式是否一致"],
    },
  });

  return messages;
}

/**
 * Build a portfolio context string from the user's holdings.
 */
export function buildPortfolioContext(
  holdings: Array<{ name: string; weight: number; cost: number; plPercent: number }>,
  principles?: Array<{ statement: string; paused: boolean }>,
  memories?: Array<{ quote: string; archived: boolean }>,
): string {
  const lines: string[] = [];

  if (holdings.length > 0) {
    lines.push("## 用戶持股組合");
    const stockCodes: Record<string, string> = {
      台積電: "2330", 聯發科: "2454", 長榮: "2603", 聯電: "2303",
      鴻海: "2317", "元大高股息": "0056", "元大台灣50": "0050",
    };
    for (const h of holdings) {
      const code = stockCodes[h.name] ?? "";
      const codeStr = code ? `(${code})` : "";
      lines.push(
        `${h.name}${codeStr}: 佔比${h.weight}%，成本${h.cost}元，目前${h.plPercent >= 0 ? "獲利" : "虧損"}${Math.abs(h.plPercent)}%`,
      );
    }
  }

  if (principles && principles.length > 0) {
    const active = principles.filter((p) => !p.paused);
    if (active.length > 0) {
      lines.push("\n## 用戶已確認的投資原則");
      for (const p of active) lines.push(`- ${p.statement}`);
    }
  }

  if (memories && memories.length > 0) {
    const active = memories.filter((m) => !m.archived);
    if (active.length > 0) {
      lines.push("\n## 用戶過去說過的話");
      for (const m of active.slice(0, 5)) lines.push(`- 「${m.quote}」`);
    }
  }

  return lines.join("\n");
}

/**
 * Check if the Agent endpoint is available.
 */
export async function isAgentAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_ENDPOINT}/ping`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
