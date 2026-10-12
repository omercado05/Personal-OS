import type { FastifyReply, FastifyRequest } from "fastify";

import { unauthorized } from "../lib/errors.js";
import { success } from "../lib/http.js";

export interface MeController {
  get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply>;
}

/**
 * Controller de `GET /api/v1/me`. El hook de autenticación ya dejó el usuario
 * sincronizado en `request.user`; aquí solo se da forma a la respuesta.
 */
export function createMeController(): MeController {
  return {
    async get(request, reply) {
      const user = request.user;
      if (!user) {
        // Defensivo: la ruta siempre se registra detrás del hook de auth.
        throw unauthorized("No autenticado");
      }

      return reply.send(
        success({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        }),
      );
    },
  };
}
