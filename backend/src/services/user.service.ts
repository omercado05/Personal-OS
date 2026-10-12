import type { AccessTokenClaims } from "../schemas/auth.schema.js";
import {
  createUserRepository,
  type UserRecord,
  type UserRepository,
} from "../repositories/user.repository.js";

/** Usuario autenticado, ya sincronizado con la tabla `users`. */
export interface AuthenticatedUser {
  id: bigint;
  stackUserId: string;
  email: string | null;
  displayName: string | null;
}

/** Lógica de identidad: sincroniza y da forma al usuario autenticado. */
export interface UserService {
  syncFromClaims(claims: AccessTokenClaims): Promise<AuthenticatedUser>;
}

function toAuthenticatedUser(record: UserRecord): AuthenticatedUser {
  return {
    id: record.id,
    stackUserId: record.stackUserId,
    email: record.email,
    displayName: record.displayName,
  };
}

/** Construye el servicio de usuarios (repositorio inyectable para tests). */
export function createUserService(
  repository: UserRepository = createUserRepository(),
): UserService {
  return {
    async syncFromClaims(claims: AccessTokenClaims): Promise<AuthenticatedUser> {
      const record = await repository.syncFromClaims(claims);
      return toAuthenticatedUser(record);
    },
  };
}
