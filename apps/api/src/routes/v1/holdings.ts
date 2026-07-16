import { Elysia } from "elysia";
import type { PrismaClient } from "@prisma/client";

export function createHoldingsRoutes(db: PrismaClient, getUserId: () => string) {
  return new Elysia({ name: "routes:v1:holdings", prefix: "/api/v1/holdings" }).get(
    "/:id/trades",
    async ({ params, set }) => {
      const userId = getUserId();

      // Find the holding and verify ownership
      const holding = await db.v1Holding.findFirst({
        where: { id: params.id, userId },
        select: { id: true, name: true, securityId: true },
      });

      if (!holding) {
        set.status = 404;
        return { error: { code: "NOT_FOUND", message: "Holding not found" } };
      }

      if (!holding.securityId) {
        // No security linked — return empty trades
        return { holdingId: holding.id, holdingName: holding.name, trades: [] };
      }

      // Query all buy/sell ledger entries for this security
      // Get the user's portfolio
      const portfolio = await db.portfolio.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!portfolio) {
        return { holdingId: holding.id, holdingName: holding.name, trades: [] };
      }

      const entries = await db.ledgerEntry.findMany({
        where: {
          portfolioId: portfolio.id,
          securityId: holding.securityId,
          entryType: { in: ["buy", "sell"] },
        },
        include: { security: { select: { name: true, symbol: true } } },
        orderBy: { occurredOn: "desc" },
      });

      const trades = entries.map((e) => ({
        id: e.id,
        date: e.occurredOn,
        type: e.entryType as "buy" | "sell",
        quantity: Number(e.quantity ?? 0),
        unitPrice: Number(e.unitPrice ?? 0),
        amount: Math.abs(Number(e.grossCashAmount)),
      }));

      return { holdingId: holding.id, holdingName: holding.name, trades };
    },
  );
}
