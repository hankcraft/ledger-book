/**
 * API Service Interfaces
 *
 * These define the contract between frontend and backend.
 * Currently backed by mock implementations in ./mock.ts
 * Swap to real implementations in ./client.ts when API is ready.
 */

import type {
  Holding,
  Principle,
  Memory,
  Inference,
  Behavior,
  Scenario,
  DisplayMessage,
} from "../types";

// ─── Onboarding ───────────────────────────────────────────────

export interface OnboardingInput {
  stockName: string;
  holdingStatus: "有" | "曾經有" | "正在觀察";
  pnlStatus: "賺錢" | "接近成本" | "虧損";
  cost?: number;
  weightPercent?: number;
}

export interface OnboardingInsight {
  midInsight: string;
  finalInsight: string;
}

export interface IOnboardingService {
  /** Get AI insight after basic info is provided */
  getMidInsight(stockName: string, holdingStatus: string): Promise<string>;
  /** Get personalized final insight with cost/weight */
  getFinalInsight(input: OnboardingInput): Promise<string>;
  /** Complete onboarding — server creates initial context */
  completeOnboarding(input: OnboardingInput): Promise<UserContext>;
}

// ─── Context (Portrait) ───────────────────────────────────────

export interface UserContext {
  holdings: Holding[];
  principles: Principle[];
  memories: Memory[];
  inferences: Inference[];
  behaviors: Behavior[];
}

export interface IContextService {
  /** Fetch the full user context */
  getContext(): Promise<UserContext>;
  /** Confirm an AI inference → promotes to principle */
  confirmInference(id: string): Promise<{ newPrinciple: Principle }>;
  /** Deny an AI inference with reason */
  denyInference(id: string, reason: string): Promise<void>;
  /** Archive a memory */
  archiveMemory(id: string): Promise<void>;
  /** Pause/resume a principle */
  togglePrinciple(id: string): Promise<Principle>;
  /** Delete a principle */
  deletePrinciple(id: string): Promise<void>;
  /** Toggle behavior exclusion from inference */
  toggleBehaviorExclusion(id: string): Promise<Behavior>;
  /** Natural language correction */
  submitCorrection(
    text: string,
  ): Promise<{ response: string; updatedContext: Partial<UserContext> }>;
}

// ─── Home (Scenarios) ─────────────────────────────────────────

export interface IHomeService {
  /** Get the current contextual scenario for this user */
  getCurrentScenario(): Promise<Scenario>;
  /** User selected a home action; the agent service owns conversation creation. */
  selectAction(action: string): Promise<{ initialPrompt: string }>;
}

// ─── Agent (Conversations) ────────────────────────────────────

export interface ConversationSummary {
  id: string;
  date: string;
  trigger: string;
  conclusion: string;
  artifact: { type: "principle" | "memory"; text: string } | null;
}

export interface IAgentService {
  /** Start a new conversation */
  startConversation(prompt: string): Promise<{ conversationId: string }>;
  /** Send a message and get streaming response (returns messages one by one) */
  sendMessage(conversationId: string, text: string): AsyncIterable<DisplayMessage>;
  /** Resume a past conversation (loads context, starts new thread) */
  resumeConversation(
    conversationId: string,
  ): Promise<{ conversationId: string; contextSummary: string }>;
  /** Get past conversation summaries */
  getPastConversations(): Promise<ConversationSummary[]>;
  /** User selected a confirmation option */
  selectOption(conversationId: string, option: string): Promise<void>;
}

// ─── Aggregated Service ───────────────────────────────────────

export interface IApiService {
  onboarding: IOnboardingService;
  context: IContextService;
  home: IHomeService;
  agent: IAgentService;
}
