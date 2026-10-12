import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

import { AppError, unauthorized } from "../lib/errors.js";
import { accessTokenClaimsSchema, type AccessTokenClaims } from "../schemas/auth.schema.js";
import type { AuthConfig } from "./config.js";

/** Verificador de *access tokens*. Se inyecta para poder testear sin red. */
export interface TokenVerifier {
  /** Verifica el token y devuelve la identidad. Lanza `AppError` si es inválido. */
  verify(token: string): Promise<AccessTokenClaims>;
}

/**
 * Códigos de `jose` que significan "el token no es válido" (401). El resto de
 * errores de `jose` (o de red) se consideran fallos del proveedor → 503.
 */
const INVALID_TOKEN_CODES = new Set<string>([
  "ERR_JWT_EXPIRED",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_INVALID",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
]);

/** Traduce un fallo de verificación al error de aplicación correspondiente. */
function toVerifyError(error: unknown): AppError {
  if (error instanceof errors.JOSEError && INVALID_TOKEN_CODES.has(error.code)) {
    return unauthorized("Token inválido o expirado");
  }
  return new AppError(
    503,
    "AUTH_PROVIDER_UNAVAILABLE",
    "No se pudo verificar el token con el proveedor de identidad",
  );
}

/**
 * Crea un verificador sobre un resolvedor de clave dado (JWKS local o remoto).
 * Se separa de `createRemoteTokenVerifier` para poder testear sin red.
 */
export function createTokenVerifier(
  getKey: JWTVerifyGetKey,
  config: Pick<AuthConfig, "issuer" | "audience">,
): TokenVerifier {
  return {
    async verify(token: string): Promise<AccessTokenClaims> {
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(token, getKey, {
          issuer: config.issuer,
          audience: config.audience,
        }));
      } catch (error) {
        throw toVerifyError(error);
      }

      const claims = accessTokenClaimsSchema.safeParse(payload);
      if (!claims.success) {
        throw unauthorized("El token no contiene una identidad válida");
      }
      return claims.data;
    },
  };
}

/**
 * Crea un verificador que valida la firma del token contra el JWKS remoto de
 * Hexclave y comprueba `issuer`, `audience` y expiración (`DEVELOPMENT_PLAN.md`
 * §8.3).
 */
export function createRemoteTokenVerifier(config: AuthConfig): TokenVerifier {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl), {
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });

  return createTokenVerifier(jwks, config);
}
