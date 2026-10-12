import type { FastifyReply, FastifyRequest } from "fastify";

import { failure, success } from "../lib/http.js";
import { validateOrThrow } from "../middleware/validate.js";
import { readinessQuerySchema } from "../schemas/health.schema.js";
import type { HealthService } from "../services/health.service.js";

export interface HealthController {
  liveness(_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
  readiness(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

/**
 * Controller de salud. Solo se ocupa del HTTP: valida la entrada, delega en el
 * servicio y da forma a la respuesta (envelope).
 */
export function createHealthController(service: HealthService): HealthController {
  return {
    async liveness(_request, reply) {
      return reply.send(success(service.liveness()));
    },

    async readiness(request, reply) {
      const { timeoutMs } = validateOrThrow(readinessQuerySchema, request.query);
      const result = await service.readiness(timeoutMs);

      if (result.database === "down") {
        return reply
          .status(503)
          .send(failure("SERVICE_UNAVAILABLE", "La base de datos no responde", result));
      }

      return reply.send(success(result));
    },
  };
}
