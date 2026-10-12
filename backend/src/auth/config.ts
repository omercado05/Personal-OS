import { env, type Env } from "../config/env.js";

type HexclaveEnv = Env["hexclave"];

/** Configuración necesaria para verificar los access tokens de Hexclave. */
export interface AuthConfig {
  /** URL del JWKS accesible desde el backend (en Docker, el hostname interno). */
  jwksUrl: string;
  /** `iss` esperado en el token (URL pública del proyecto). */
  issuer: string;
  /** `aud` esperado en el token (identificador del proyecto). */
  audience: string;
}

/** Ruta base de un proyecto en la API de Hexclave. */
function projectPath(projectId: string | undefined): string | undefined {
  return projectId ? `/api/v1/projects/${projectId}` : undefined;
}

/**
 * Resuelve la configuración de autenticación a partir del entorno.
 *
 * Cada valor se toma de su variable explícita o se **deriva** del project ID:
 *   - `issuer`   = `HEXCLAVE_ISSUER`   o `<HEXCLAVE_API_URL><ruta proyecto>`.
 *   - `audience` = `HEXCLAVE_AUDIENCE` o `<project ID>`.
 *   - `jwksUrl`  = `HEXCLAVE_JWKS_URL` o `<HEXCLAVE_INTERNAL_API_URL ?? HEXCLAVE_API_URL>` +
 *                  `<ruta proyecto>/.well-known/jwks.json`.
 *
 * La derivación permite usar la misma configuración en el host (`pnpm dev`,
 * donde el JWKS es público) y en Docker (donde el backend alcanza el JWKS por
 * el hostname interno). Ver `DEVELOPMENT_PLAN.md` §8.3.
 *
 * - Sin nada configurado → `null` (autenticación deshabilitada).
 * - Configuración parcial → lanza (no arrancar en un estado ambiguo).
 */
export function resolveAuthConfig(hexclave: HexclaveEnv = env.hexclave): AuthConfig | null {
  const { apiUrl, internalApiUrl, projectId, jwksUrl, issuer, audience } = hexclave;

  const path = projectPath(projectId);
  const jwksHost = internalApiUrl ?? apiUrl;

  const resolvedIssuer = issuer ?? (apiUrl && path ? `${apiUrl}${path}` : undefined);
  const resolvedAudience = audience ?? projectId;
  const resolvedJwksUrl =
    jwksUrl ?? (jwksHost && path ? `${jwksHost}${path}/.well-known/jwks.json` : undefined);

  if (!resolvedIssuer || !resolvedAudience || !resolvedJwksUrl) {
    if (!resolvedIssuer && !resolvedAudience && !resolvedJwksUrl) {
      return null;
    }
    throw new Error(
      "Configuración de autenticación incompleta: define HEXCLAVE_PROJECT_ID " +
        "(y las URLs de la API) o bien las tres variables HEXCLAVE_JWKS_URL, " +
        "HEXCLAVE_ISSUER y HEXCLAVE_AUDIENCE.",
    );
  }

  return {
    issuer: resolvedIssuer,
    audience: resolvedAudience,
    jwksUrl: resolvedJwksUrl,
  };
}
