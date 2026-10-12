import { z } from "zod";

/**
 * Claims relevantes de un *access token* de Hexclave.
 *
 * El token es emitido por Hexclave y verificamos su firma antes de leer sus
 * claims; aun así, validamos los campos con Zod para no confiar en la forma
 * del payload. Ver `DEVELOPMENT_PLAN.md` §8.3.
 */
export const accessTokenClaimsSchema = z.object({
  /** Identificador del usuario (`stack_user_id`). */
  sub: z.string().min(1),
  // Hexclave puede emitir estos claims como `null`; los normalizamos a `undefined`.
  email: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  name: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;
