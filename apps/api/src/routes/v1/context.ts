import { Elysia, t } from "elysia";
import type { ContextService } from "../../services/context.service.ts";
import { v1Error } from "../../lib/errors.ts";

export function createContextRoutes(contextService: ContextService, getUserId: () => string) {
  return new Elysia({ name: "routes:v1:context", prefix: "/api/v1/context" })
    .get("/", async () => {
      const userId = getUserId();
      return contextService.getContext(userId);
    })
    .post("/inferences/:id/confirm", async ({ params, set }) => {
      const userId = getUserId();
      const newPrinciple = await contextService.confirmInference(userId, params.id);
      if (!newPrinciple) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Inference not found");
      }
      return { newPrinciple };
    })
    .post(
      "/inferences/:id/deny",
      async ({ params, body, set }) => {
        const userId = getUserId();
        const result = await contextService.denyInference(userId, params.id, body.reason);
        if (!result) {
          set.status = 404;
          return v1Error("NOT_FOUND", "Inference not found");
        }
      },
      { body: t.Object({ reason: t.String() }) },
    )
    .post("/memories/:id/archive", async ({ params, set }) => {
      const userId = getUserId();
      const result = await contextService.archiveMemory(userId, params.id);
      if (!result) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Memory not found");
      }
    })
    .post("/principles/:id/toggle", async ({ params, set }) => {
      const userId = getUserId();
      const principle = await contextService.togglePrinciple(userId, params.id);
      if (!principle) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Principle not found");
      }
      return { principle };
    })
    .delete("/principles/:id", async ({ params, set }) => {
      const userId = getUserId();
      const result = await contextService.deletePrinciple(userId, params.id);
      if (!result) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Principle not found");
      }
      set.status = 204;
    })
    .post("/behaviors/:id/toggle", async ({ params, set }) => {
      const userId = getUserId();
      const behavior = await contextService.toggleBehavior(userId, params.id);
      if (!behavior) {
        set.status = 404;
        return v1Error("NOT_FOUND", "Behavior not found");
      }
      return { behavior };
    })
    .post(
      "/corrections",
      async ({ body }) => {
        const userId = getUserId();
        const { response, inferences } = await contextService.applyCorrection(userId, body.text);
        return { response, updatedContext: { inferences } };
      },
      { body: t.Object({ text: t.String() }) },
    );
}
