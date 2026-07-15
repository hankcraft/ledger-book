import { Elysia, t } from "elysia";
import type { ImportService } from "../services/index.ts";
import { apiError } from "../lib/errors.ts";

export function createDemoImportRoutes(importService: ImportService, demoCsv: string) {
  return new Elysia({ name: "routes:demo-imports" })
    .post(
      "/api/demo-imports",
      async ({ body, set }) => {
        const result = await importService.importDemo(body.portfolioId, demoCsv);
        if (!result) {
          set.status = 409;
          return apiError("demo_already_imported", "Fake Demo 已匯入此投資組合。");
        }
        set.status = 201;
        return result;
      },
      { body: t.Object({ portfolioId: t.String({ minLength: 1 }) }) },
    )
    .get("/api/demo-imports/:importId", async ({ params, set }) => {
      const result = await importService.getImport(params.importId);
      if (!result) {
        set.status = 404;
        return apiError("import_not_found", "找不到匯入紀錄。");
      }
      return result;
    });
}
