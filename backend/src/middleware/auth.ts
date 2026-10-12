import type { FastifyRequest, preHandlerHookHandler } from "fastify";

import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { AppError, unauthorized } from "../lib/errors.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

// Añade `request.user` al tipo de Fastify. Lo rellena el hook de autenticación.
declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export interface AuthHookDependencies {
  /** Verificador de tokens. `null` si la autenticación no está configurada. */
  verifier: TokenVerifier | null;
  users: UserService;
}

/** Extrae el token de una cabecera `Authorization: Bearer <token>`. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }
  return token;
}

/**
 * Crea el hook `preHandler` que protege las rutas: exige un token válido,
 * verifica su firma y sincroniza el usuario, dejándolo en `request.user`.
 *
 * Si la autenticación no está configurada en el servidor, responde 503 en lugar
 * de aceptar peticiones sin identidad.
 */
export function createAuthHook(deps: AuthHookDependencies): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (!deps.verifier) {
      throw new AppError(
        503,
        "AUTH_NOT_CONFIGURED",
        "La autenticación no está configurada en el servidor",
      );
    }

    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw unauthorized("Falta el token de acceso (Authorization: Bearer)");
    }

    const claims = await deps.verifier.verify(token);
    request.user = await deps.users.syncFromClaims(claims);
  };
}
