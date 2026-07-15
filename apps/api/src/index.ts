import { createApp } from "./app.ts";
import { createV1Routes } from "./v1.ts";

const port = Number(Bun.env.PORT ?? 3000);
const app = createApp().use(createV1Routes()).listen(port);

console.log(`Ledger Book API listening on http://localhost:${app.server?.port}`);

export type App = typeof app;
