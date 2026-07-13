import { createApp } from "./app.ts";

const port = Number(Bun.env.PORT ?? 3000);
const app = createApp().listen(port);

console.log(`Ledger Book API listening on http://localhost:${app.server?.port}`);

export type App = typeof app;
