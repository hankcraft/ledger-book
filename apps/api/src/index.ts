import { prisma } from "./db.ts";
import { createApp } from "./app.ts";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_PORTFOLIO_ID = "demo-portfolio";

/** Ensure the default user and portfolio exist (MVP: no auth) */
async function bootstrap() {
  await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, displayName: "Demo User" },
  });

  await prisma.portfolio.upsert({
    where: { id: DEFAULT_PORTFOLIO_ID },
    update: {},
    create: {
      id: DEFAULT_PORTFOLIO_ID,
      userId: DEFAULT_USER_ID,
      name: "台股核心－衛星帳本",
      baseCurrency: "TWD",
      benchmarkSymbol: "0050",
    },
  });
}

await bootstrap();

const port = Number(Bun.env.PORT ?? 3000);
const app = createApp({ db: prisma }).listen(port);

console.log(`Ledger Book API listening on http://localhost:${app.server?.port}`);

export type App = typeof app;
