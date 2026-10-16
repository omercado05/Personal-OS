import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import { createTaskController } from "../controllers/task.controller.js";
import type { TaskService } from "../services/task.service.js";

export function taskRoutes(deps: { auth: preHandlerHookHandler; service: TaskService }) {
  const controller = createTaskController(deps.service);

  return async function register(app: FastifyInstance): Promise<void> {
    app.get("/tasks", { preHandler: deps.auth }, controller.list);
    app.post("/tasks", { preHandler: deps.auth }, controller.create);
    app.get("/tasks/:id", { preHandler: deps.auth }, controller.get);
    app.put("/tasks/:id", { preHandler: deps.auth }, controller.update);
    app.patch("/tasks/:id/toggle", { preHandler: deps.auth }, controller.toggle);
    app.delete("/tasks/:id", { preHandler: deps.auth }, controller.remove);
  };
}
