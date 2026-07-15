/**
 * V1 AI-Native Domain Contracts
 *
 * Shared between apps/web and apps/api.
 * These types define the wire format for /api/v1 endpoints.
 */

// ─── Enums (machine values, not display strings) ─────────────

export type HoldingStatus = "HELD" | "FORMER" | "WATCHING";
export type PnlStatus = "PROFIT" | "BREAKEVEN" | "LOSS";
export type InferenceConfidence = "HIGH" | "MEDIUM" | "LOW";
export type InferenceStatus = "PENDING" | "CONFIRMED" | "DENIED";
export type AttentionSeverity = "WARNING" | "INFO" | "DANGER";
export type MessageRole = "user" | "agent";
export type ArtifactKind = "principle" | "memory";

// ─── Context Domain ──────────────────────────────────────────

export interface V1Holding {
  id: string;
  name: string;
  weight: number;
  cost: number;
  plPercent: number;
  purchaseDate?: string;
}

export interface V1Principle {
  id: string;
  statement: string;
  confirmedAt: string;
  source: string;
  paused: boolean;
  badge?: string;
}

export interface V1Memory {
  id: string;
  quote: string;
  date: string;
  source: string;
  archived: boolean;
}

export interface V1Inference {
  id: string;
  statement: string;
  confidence: InferenceConfidence;
  evidence: string;
  status: InferenceStatus;
  denyReason?: string;
}

export interface V1Behavior {
  id: string;
  label: string;
  value: string;
  detail?: string;
  excluded: boolean;
}

export interface V1UserContext {
  holdings: V1Holding[];
  principles: V1Principle[];
  memories: V1Memory[];
  inferences: V1Inference[];
  behaviors: V1Behavior[];
}

// ─── Onboarding ──────────────────────────────────────────────

export interface V1OnboardingInsightRequest {
  stockName: string;
  holdingStatus: HoldingStatus;
}

export interface V1OnboardingInsightResponse {
  insight: string;
}

export interface V1OnboardingCompleteRequest {
  stockName: string;
  holdingStatus: HoldingStatus;
  pnlStatus: PnlStatus;
  cost?: number;
  weightPercent?: number;
}

export interface V1OnboardingCompleteResponse {
  context: V1UserContext;
}

export interface V1FinalInsightRequest {
  stockName: string;
  holdingStatus: HoldingStatus;
  pnlStatus: PnlStatus;
  cost?: number;
  weightPercent?: number;
}

// ─── Context mutations ───────────────────────────────────────

export interface V1ConfirmInferenceResponse {
  newPrinciple: V1Principle;
}

export interface V1DenyInferenceRequest {
  reason: string;
}

export interface V1TogglePrincipleResponse {
  principle: V1Principle;
}

export interface V1ToggleBehaviorResponse {
  behavior: V1Behavior;
}

export interface V1CorrectionRequest {
  text: string;
}

export interface V1CorrectionResponse {
  response: string;
  updatedContext: Partial<V1UserContext>;
}

// ─── Home / Scenario ─────────────────────────────────────────

export interface V1AttentionItem {
  id: string;
  label: string;
  detail: string;
  severity: AttentionSeverity;
}

export interface V1Scenario {
  id: string;
  greeting: string;
  insight: string;
  attentionItems: V1AttentionItem[];
  actions: string[];
}

export interface V1SelectActionRequest {
  action: string;
}

export interface V1SelectActionResponse {
  initialPrompt: string;
}

// ─── Conversations ───────────────────────────────────────────

export interface V1StartConversationRequest {
  prompt: string;
}

export interface V1StartConversationResponse {
  conversationId: string;
}

export interface V1SendMessageRequest {
  text: string;
}

export interface V1ResumeConversationResponse {
  conversationId: string;
  contextSummary: string;
}

export interface V1SelectOptionRequest {
  option: string;
}

export interface V1ConversationSummary {
  id: string;
  date: string;
  trigger: string;
  conclusion: string;
  artifact: { type: ArtifactKind; text: string } | null;
}

// ─── SSE Stream Events ───────────────────────────────────────

export interface V1CardInsight {
  type: "insight";
  title: string;
  portfolioChange: string;
  marketChange: string;
  breakdown: Array<{ label: string; value: string; note?: string }>;
}

export interface V1CardMemoryRecall {
  type: "memory-recall";
  date: string;
  context: string;
  quote: string;
}

export interface V1CardEvidence {
  type: "evidence";
  title: string;
  confidence: number;
  sources: Array<{ name: string; kind: "fact" | "inference" }>;
  summary: string;
}

export interface V1CardScenarioComparison {
  type: "scenario-comparison";
  scenarios: Array<{
    id: string;
    title: string;
    likelihood: string;
    description: string;
    action: string;
  }>;
}

export interface V1CardConfirmation {
  type: "confirmation-question";
  question: string;
  options: string[];
}

export type V1CardData =
  | V1CardInsight
  | V1CardMemoryRecall
  | V1CardEvidence
  | V1CardScenarioComparison
  | V1CardConfirmation;

export interface V1StreamMessage {
  id: string;
  role: MessageRole;
  text?: string;
  card?: V1CardData;
}

// ─── Standard Error Envelope ─────────────────────────────────

export interface V1ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
