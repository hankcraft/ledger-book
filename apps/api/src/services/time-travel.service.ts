import type { PrismaClient } from "@prisma/client";
import type { TimeTravelReport } from "@ledger-book/contracts";
import { isObjectiveSummary } from "../lib/validation.ts";

export interface TimeTravelService {
  createReport(
    portfolioId: string,
    securityId: string,
    asOfDate: string,
  ): Promise<TimeTravelReport | null>;
  getReport(reportId: string): Promise<TimeTravelReport | null>;
}

interface ReportRow {
  id: string;
  portfolioId: string;
  securityId: string;
  asOfDate: string;
  sentiment: string;
  uiColor: string;
  summary: string;
  complianceStatus: string;
  security: { symbol: string };
  evidences: Array<{
    evidence: { id: string; observedOn: string; sourceName: string; payload: unknown };
  }>;
}

function toContract(row: ReportRow): TimeTravelReport {
  return {
    id: row.id,
    portfolioId: row.portfolioId as TimeTravelReport["portfolioId"],
    securityId: row.securityId,
    symbol: row.security.symbol,
    asOfDate: row.asOfDate,
    sentiment: row.sentiment as TimeTravelReport["sentiment"],
    uiColor: row.uiColor as TimeTravelReport["uiColor"],
    summary: row.summary,
    citations: row.evidences.map((e) => ({
      id: e.evidence.id,
      observedOn: e.evidence.observedOn,
      source: e.evidence.sourceName,
      label: (e.evidence.payload as { label?: string })?.label ?? "",
    })),
    complianceStatus: row.complianceStatus as TimeTravelReport["complianceStatus"],
  };
}

export function createTimeTravelService(db: PrismaClient): TimeTravelService {
  return {
    async createReport(portfolioId, securityId, asOfDate) {
      // Get security info
      const security = await db.security.findUnique({
        where: { id: securityId },
        select: { id: true, symbol: true, name: true },
      });
      if (!security) return null;

      // Find evidence for this security on or before the date
      const evidenceRows = await db.analysisEvidence.findMany({
        where: { securityId, observedOn: { lte: asOfDate } },
        orderBy: { observedOn: "desc" },
      });
      if (evidenceRows.length === 0) return null;

      // Build summary from evidence labels
      const labels = evidenceRows
        .map((e) => (e.payload as { label?: string })?.label ?? "")
        .filter(Boolean);
      const summary = `${security.name}在所選日期前的資料顯示：${labels.join("；")}。`;

      // Compliance gate
      if (!isObjectiveSummary(summary)) return null;

      // Determine sentiment from evidence (simple heuristic based on evidence types)
      const hasInstitutional = evidenceRows.some((e) => e.evidenceType === "institutional_chip");
      const sentiment = hasInstitutional ? "bullish" : "neutral";
      const uiColor = sentiment === "bullish" ? "red" : "gray";

      // Create report with evidence links
      const report = await db.timeTravelReport.create({
        data: {
          portfolioId,
          securityId,
          asOfDate,
          sentiment,
          uiColor,
          summary,
          complianceStatus: "passed",
          promptVersion: "v1.0.0",
          generatedAt: new Date(),
          evidences: {
            create: evidenceRows.map((e, i) => ({
              evidenceId: e.id,
              citationOrder: i + 1,
            })),
          },
        },
        include: {
          security: { select: { symbol: true } },
          evidences: {
            include: {
              evidence: { select: { id: true, observedOn: true, sourceName: true, payload: true } },
            },
            orderBy: { citationOrder: "asc" },
          },
        },
      });

      return toContract(report);
    },

    async getReport(reportId) {
      const row = await db.timeTravelReport.findUnique({
        where: { id: reportId },
        include: {
          security: { select: { symbol: true } },
          evidences: {
            include: {
              evidence: { select: { id: true, observedOn: true, sourceName: true, payload: true } },
            },
            orderBy: { citationOrder: "asc" },
          },
        },
      });
      if (!row) return null;
      return toContract(row);
    },
  };
}
