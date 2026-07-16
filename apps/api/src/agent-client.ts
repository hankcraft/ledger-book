/**
 * Agent Client — calls the AgentCore Runtime (OpenSearch + Bedrock)
 *
 * Uses the AWS SDK @aws-sdk/client-bedrock-agentcore to invoke the agent.
 * The SDK handles SigV4 signing and endpoint URL construction automatically.
 *
 * Environment variables:
 *   AGENT_RUNTIME_ARN       — AgentCore runtime ARN (production)
 *   AGENT_ENDPOINT_QUALIFIER — Endpoint name / qualifier (production)
 *   AGENT_ENDPOINT          — Direct HTTP URL for local dev (e.g. http://localhost:8080)
 *   AWS_REGION              — AWS region (default: us-east-1)
 */

import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

// ─── Configuration ──────────────────────────────────────────────────────────

const AGENT_RUNTIME_ARN = Bun.env.AGENT_RUNTIME_ARN ?? "";
const AGENT_ENDPOINT_QUALIFIER = Bun.env.AGENT_ENDPOINT_QUALIFIER ?? "";
const AGENT_ENDPOINT = Bun.env.AGENT_ENDPOINT ?? "";
const REGION = Bun.env.AWS_REGION ?? "us-east-1";

/** True when running against real AgentCore (has ARN configured) */
const useAgentCoreSDK = AGENT_RUNTIME_ARN.length > 0;

// Lazy-init SDK client (only when needed)
let _client: BedrockAgentCoreClient | null = null;
function getClient(): BedrockAgentCoreClient {
  if (!_client) {
    _client = new BedrockAgentCoreClient({ region: REGION });
  }
  return _client;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentInvokeOptions {
  prompt: string;
  portfolioContext?: string;
  timeout?: number;
}

// ─── Private: invoke via SDK ────────────────────────────────────────────────

async function invokeViaSDK(fullPrompt: string, timeout: number): Promise<string> {
  const client = getClient();
  const payload = new TextEncoder().encode(JSON.stringify({ prompt: fullPrompt }));

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: AGENT_RUNTIME_ARN,
    payload,
    contentType: "application/json",
    accept: "text/event-stream",
    ...(AGENT_ENDPOINT_QUALIFIER ? { qualifier: AGENT_ENDPOINT_QUALIFIER } : {}),
  });

  const response = await Promise.race([
    client.send(command),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Agent SDK timeout")), timeout),
    ),
  ]);

  // The response body is a SdkStream — use transformToWebStream() to get a ReadableStream
  const body = response.response;
  if (!body) throw new Error("Agent returned no response body");

  // SdkStreamMixin provides transformToWebStream()
  const webStream = (
    body as { transformToWebStream(): ReadableStream<Uint8Array> }
  ).transformToWebStream();
  return collectSSEResponse(webStream);
}

// ─── Private: invoke via direct HTTP (local dev) ────────────────────────────

async function invokeViaHTTP(fullPrompt: string, timeout: number): Promise<string> {
  const endpoint = AGENT_ENDPOINT || "http://localhost:8080";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${endpoint}/invocations`, {
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
    return collectSSEResponse(res.body);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Private: parse SSE stream ──────────────────────────────────────────────

async function collectSSEResponse(
  body: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  const iterable =
    Symbol.asyncIterator in body
      ? (body as AsyncIterable<Uint8Array>)
      : readableStreamToAsyncIterable(body as ReadableStream<Uint8Array>);

  for await (const chunk of iterable) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") break;
      try {
        const parsed: unknown = JSON.parse(payload);
        if (typeof parsed === "string") result += parsed;
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return result || "無法生成回應。";
}

async function* readableStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Follow-up Option Generation ────────────────────────────────────────────

/**
 * Appended to every agent prompt so the LLM produces parseable follow-up options.
 */
const FOLLOW_UP_SUFFIX = `

---
如果這段對話還有自然延伸的方向，在回覆最後附上 1-3 個後續追問選項（用使用者的口吻寫，像他會自己想問的問題）。如果對話已經回答完畢、沒有需要延伸的，就不用附。

格式：
[FOLLOW_UP]
- 選項
[/FOLLOW_UP]`;

const FOLLOW_UP_REGEX = /\[FOLLOW_UP\]\s*([\s\S]*?)\s*\[\/FOLLOW_UP\]/;

/**
 * Parse follow-up options from agent text and return cleaned text + options.
 */
export function extractFollowUpOptions(agentText: string): {
  text: string;
  options: string[];
} {
  const match = FOLLOW_UP_REGEX.exec(agentText);
  if (!match) {
    return { text: agentText, options: [] };
  }

  const optionsBlock = match[1]!;
  const options = optionsBlock
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);

  const text = agentText.slice(0, match.index).trimEnd();
  return { text, options };
}

const DEFAULT_OPTIONS = ["持股集中度分析", "法人最近動態", "我的操作模式是否一致"];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Invoke the Agent and collect the full response as a string.
 */
export async function invokeAgent(options: AgentInvokeOptions): Promise<string> {
  const { prompt, portfolioContext, timeout = 30_000 } = options;
  const basePrompt = portfolioContext
    ? `${portfolioContext}\n\n---\n\n用戶提問：${prompt}`
    : prompt;
  const fullPrompt = `${basePrompt}\n\n${FOLLOW_UP_SUFFIX}`;

  if (useAgentCoreSDK) {
    return invokeViaSDK(fullPrompt, timeout);
  }
  return invokeViaHTTP(fullPrompt, timeout);
}

/**
 * Stream the Agent response, transform raw text SSE into multiple V1StreamMessages
 * with structured CardData for rich UI rendering.
 */
export async function streamAgentAsV1Messages(
  options: AgentInvokeOptions,
  turnId: string,
  _context?: {
    holdings?: Array<{ name: string; weight: number; cost: number; plPercent: number }>;
    memories?: Array<{ quote: string; date: string; archived: boolean }>;
  },
): Promise<Response> {
  const { prompt, portfolioContext, timeout = 60_000 } = options;
  const fullPrompt = portfolioContext
    ? `${portfolioContext}\n\n---\n\n用戶提問：${prompt}`
    : prompt;

  // Collect the full agent response first
  const agentText = useAgentCoreSDK
    ? await invokeViaSDK(fullPrompt, timeout)
    : await invokeViaHTTP(fullPrompt, timeout);

  const messages = buildStructuredMessages(turnId, agentText, prompt);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
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
}

// ─── Private: structured messages ───────────────────────────────────────────

interface StreamMessage {
  id: string;
  role: "agent";
  text?: string;
  card?: Record<string, unknown>;
}

function buildStructuredMessages(
  turnId: string,
  agentText: string,
  userPrompt: string,
): StreamMessage[] {
  const messages: StreamMessage[] = [];
  const { text, options } = extractFollowUpOptions(agentText || "無法生成回應。");

  messages.push({ id: `${turnId}-text`, role: "agent", text });

  // Offer to save the conclusion as context if the response is substantial
  if (text.length > 50) {
    // Extract a short conclusion from the first meaningful sentence
    const conclusion = extractConclusion(text, userPrompt);
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

  // Only show follow-up options if the agent produced them (conversation not concluded)
  const followUpOptions = options.length > 0 ? options : DEFAULT_OPTIONS;
  messages.push({
    id: `${turnId}-question`,
    role: "agent",
    card: {
      type: "confirmation-question",
      question: "你想進一步了解哪個方向？",
      options: followUpOptions,
    },
  });

  return messages;
}

/**
 * Extract a short conclusion from agent text suitable for saving as a principle.
 * Returns null if the text doesn't contain a clear conclusion.
 */
export function extractConclusion(text: string, _userPrompt: string): string | null {
  // Look for the first sentence that contains an observation or statement
  const sentences = text.split(/[。！\n]/).filter((s) => s.trim().length > 10);
  if (sentences.length === 0) return null;

  // Prefer sentences with keywords indicating an observation
  const observationKeywords = [
    "集中",
    "風險",
    "佔比",
    "超過",
    "偏高",
    "偏低",
    "趨勢",
    "策略",
    "原則",
    "建議",
    "注意",
  ];
  const observation = sentences.find((s) => observationKeywords.some((kw) => s.includes(kw)));

  const candidate = observation ?? sentences[0]!;
  // Trim to reasonable length for a principle/memory
  const trimmed = candidate.trim().slice(0, 60);
  return trimmed.length >= 10 ? trimmed : null;
}

// ─── Public: portfolio context builder ──────────────────────────────────────

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
      台積電: "2330",
      聯發科: "2454",
      長榮: "2603",
      聯電: "2303",
      鴻海: "2317",
      元大高股息: "0056",
      元大台灣50: "0050",
      中華電: "2412",
      台泥: "1101",
      兆豐金: "2886",
      統一: "1216",
      中鋼: "2002",
      廣達: "2382",
      緯創: "3231",
      陽明: "2609",
      華航: "2610",
      國巨: "2327",
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
  if (useAgentCoreSDK) {
    // For SDK mode, assume available (health check would require a lightweight invoke)
    return true;
  }

  try {
    const endpoint = AGENT_ENDPOINT || "http://localhost:8080";
    const res = await fetch(`${endpoint}/ping`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
