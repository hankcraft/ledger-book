import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ name: "routes:health" }).get("/api/health", () => ({
  ok: true,
}));
