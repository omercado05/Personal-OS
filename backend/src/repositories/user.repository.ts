import type { User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { AccessTokenClaims } from "../schemas/auth.schema.js";

/** Fila de `users` tal como la devuelve Prisma. */
export type UserRecord = User;

/** Acceso a la tabla `users` (sincronización perezosa desde el JWT). */
export interface UserRepository {
  /** Devuelve el usuario del claim `sub`, creándolo si es la primera vez. */
  syncFromClaims(claims: AccessTokenClaims): Promise<UserRecord>;
}

/**
 * Implementación sobre Prisma. La tabla `users` se sincroniza **de forma
 * perezosa**: la primera petición autenticada de un usuario crea su fila; las
 * siguientes la reutilizan (los datos de identidad no se pisan).
 */
export function createUserRepository(): UserRepository {
  return {
    async syncFromClaims(claims: AccessTokenClaims): Promise<UserRecord> {
      const existing = await prisma.user.findUnique({ where: { stackUserId: claims.sub } });
      if (existing) {
        return existing;
      }

      try {
        return await prisma.user.create({
          data: {
            stackUserId: claims.sub,
            email: claims.email ?? null,
            displayName: claims.name ?? null,
          },
        });
      } catch (error) {
        // Condición de carrera: otra petición concurrente creó la fila primero.
        // Volvemos a leerla; si tampoco existe, propagamos el error original.
        const createdByRace = await prisma.user.findUnique({
          where: { stackUserId: claims.sub },
        });
        if (createdByRace) {
          return createdByRace;
        }
        throw error;
      }
    },
  };
}
