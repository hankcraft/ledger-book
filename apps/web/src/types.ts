export interface Holding {
  id: string;
  name: string;
  weight: number;
  cost: number;
  plPercent: number;
  purchaseDate?: string;
}

export interface Principle {
  id: string;
  statement: string;
  confirmedAt: string;
  source: string;
  paused: boolean;
  badge?: string;
}

export interface Memory {
  id: string;
  quote: string;
  date: string;
  source: string;
  archived: boolean;
}

export interface Inference {
  id: string;
  statement: string;
  confidence: "高" | "中" | "低";
  evidence: string;
  status: "pending" | "confirmed" | "denied";
  denyReason?: string;
}

export interface Behavior {
  id: string;
  label: string;
  value: string;
  detail?: string;
  excluded: boolean;
}

export interface AttentionItem {
  id: string;
  label: string;
  detail: string;
  severity: "warning" | "info" | "danger";
}

export interface Scenario {
  id: string;
  greeting: string;
  insight: string;
  attentionItems: AttentionItem[];
  actions: string[];
}

export type MessageRole = "user" | "agent";

export type CardType =
  | "insight"
  | "memory-recall"
  | "evidence"
  | "scenario-comparison"
  | "confirmation-question";

export interface InsightData {
  type: "insight";
  title: string;
  portfolioChange: string;
  marketChange: string;
  breakdown: Array<{ label: string; value: string; note?: string }>;
}

export interface MemoryRecallData {
  type: "memory-recall";
  date: string;
  context: string;
  quote: string;
}

export interface EvidenceData {
  type: "evidence";
  title: string;
  confidence: number;
  sources: Array<{ name: string; kind: "fact" | "inference" }>;
  summary: string;
}

export interface ScenarioData {
  type: "scenario-comparison";
  scenarios: Array<{
    id: string;
    title: string;
    likelihood: string;
    description: string;
    action: string;
  }>;
}

export interface ConfirmationData {
  type: "confirmation-question";
  question: string;
  options: string[];
}

export type CardData =
  | InsightData
  | MemoryRecallData
  | EvidenceData
  | ScenarioData
  | ConfirmationData;

export interface ConversationStep {
  role: MessageRole;
  text?: string;
  card?: CardData;
  delay: number;
}

export interface DisplayMessage {
  id: string;
  role: MessageRole;
  text?: string;
  card?: CardData;
}
